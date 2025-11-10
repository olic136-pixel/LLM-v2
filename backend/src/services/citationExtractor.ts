import { v4 as uuidv4 } from 'uuid';

export interface ParsedCitation {
  id: string;
  citationText: string;
  caseName?: string;
  caseReporter?: string;
  volume?: string;
  page?: string;
  year?: string;
  court?: string;
  type: 'case' | 'statute' | 'regulation' | 'unknown';
}

export class CitationExtractor {
  // Regex patterns for different citation formats
  private static readonly CASE_CITATION_PATTERNS = [
    // U.S. Supreme Court: Brown v. Board of Education, 347 U.S. 483 (1954)
    /([A-Z][a-zA-Z\s&.,']+v\.\s+[A-Z][a-zA-Z\s&.,']+),\s*(\d+)\s+(U\.S\.)\s+(\d+)\s*(?:\((\d{4})\))?/g,

    // Federal reporters: Smith v. Jones, 123 F.3d 456 (9th Cir. 2000)
    /([A-Z][a-zA-Z\s&.,']+v\.\s+[A-Z][a-zA-Z\s&.,']+),\s*(\d+)\s+(F\.\d*d?|F\.Supp\.\d*d?|F\.App'x)\s+(\d+)\s*(?:\(([^)]+)\s+(\d{4})\))?/g,

    // State reporters: People v. Smith, 123 Cal.App.4th 456
    /([A-Z][a-zA-Z\s&.,']+v\.\s+[A-Z][a-zA-Z\s&.,']+),\s*(\d+)\s+([A-Z][a-z.]+\d*[a-z]*)\s+(\d+)/g,

    // Alternative format with year: Brown v. Board, 347 U.S. 483, 74 S.Ct. 686 (1954)
    /([A-Z][a-zA-Z\s&.,']+v\.\s+[A-Z][a-zA-Z\s&.,']+),\s*(\d+)\s+([A-Z][a-z.]+)\s+(\d+)(?:,\s*\d+\s+[A-Z][a-z.]+\s+\d+)?\s*(?:\((\d{4})\))?/g,

    // UK Neutral Citations: R v Smith [2023] UKSC 15
    /([A-Z][a-zA-Z\s&.,']+v\.\s+[A-Z][a-zA-Z\s&.,']+)\s*\[(\d{4})\]\s+(UKSC|UKPC|EWCA\s+Civ|EWCA\s+Crim|EWHC|EWFC|UKUT|UKFTT)\s+(\d+)/gi,

    // UK Law Reports: Smith v Jones [2023] 1 WLR 123 or [2020] AC 456
    /([A-Z][a-zA-Z\s&.,']+v\.\s+[A-Z][a-zA-Z\s&.,']+)\s*\[(\d{4})\]\s+(?:(\d+)\s+)?(WLR|AC|QB|Ch|Fam|All\s+ER|BCLC|BCC|Cr\s+App\s+R|Lloyd's\s+Rep)\s+(\d+)/gi,

    // UK Case with court in brackets: Smith v Jones [2020] EWCA Civ 123, [2020] 1 WLR 456
    /([A-Z][a-zA-Z\s&.,']+v\.\s+[A-Z][a-zA-Z\s&.,']+)\s*\[(\d{4})\]\s+([A-Z]+(?:\s+[A-Z][a-z]+)?)\s+(\d+)/g,

    // DIFC Court Citations: CFI 001/2023, ARB 005/2022, CA 003/2023
    /\b(CFI|ARB|CA|SCT)\s+(\d{3})\/(\d{4})\b/g,

    // DIFC Neutral Citations: [2023] DIFC CA 5 or Company v Person [2023] DIFC CFI 012
    /(?:([A-Z][a-zA-Z\s&.,']+v\.\s+[A-Z][a-zA-Z\s&.,']+)\s*)?\[(\d{4})\]\s+DIFC\s+(CA|CFI|SCT|ARB)\s+(\d+)/gi,
  ];

  private static readonly STATUTE_PATTERNS = [
    // U.S.C.: 42 U.S.C. § 1983
    /(\d+)\s+(U\.S\.C\.)\s+§\s*(\d+[a-z]*(?:-\d+)*)/g,

    // State statutes: Cal. Civ. Code § 1234
    /([A-Z][a-z.]+)\s+([A-Z][a-z.]+)\s+([A-Z][a-z.]+)\s+§\s*(\d+[a-z]*(?:-\d+)*)/g,

    // UK Statutes: Companies Act 2006, Human Rights Act 1998, section 1
    /([A-Z][a-zA-Z\s]+Act)\s+(\d{4})(?:,?\s+[Ss](?:ection|ect?\.?)\s+(\d+[A-Z]*(?:\(\d+\))?))?/g,

    // UK Statutory Instruments: SI 2023/456 or The Companies (Model Articles) Regulations 2008 (SI 2008/3229)
    /(?:The\s+)?([A-Z][a-zA-Z\s()]+)\s+(?:Regulations?|Order|Rules)\s+(\d{4})\s*(?:\(SI\s+(\d{4})\/(\d+)\))?|SI\s+(\d{4})\/(\d+)/gi,

    // DIFC Laws: DIFC Law No. 5 of 2021, Law No. 3/2023
    /DIFC\s+Law\s+No\.?\s+(\d+)\s+of\s+(\d{4})|Law\s+No\.?\s+(\d+)\/(\d{4})/gi,
  ];

  private static readonly REGULATION_PATTERNS = [
    // C.F.R.: 29 C.F.R. § 825.100
    /(\d+)\s+(C\.F\.R\.)\s+§\s*(\d+\.\d+)/g,
  ];

  /**
   * Extract all citations from text
   */
  public extractCitations(text: string, questionNumber?: number): ParsedCitation[] {
    const citations: ParsedCitation[] = [];

    // Extract case citations
    citations.push(...this.extractCaseCitations(text));

    // Extract statute citations
    citations.push(...this.extractStatuteCitations(text));

    // Extract regulation citations
    citations.push(...this.extractRegulationCitations(text));

    return citations;
  }

  /**
   * Extract case law citations
   */
  private extractCaseCitations(text: string): ParsedCitation[] {
    const citations: ParsedCitation[] = [];
    const seen = new Set<string>(); // Avoid duplicates

    for (const pattern of CitationExtractor.CASE_CITATION_PATTERNS) {
      // Reset lastIndex for global regex
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(text)) !== null) {
        const citationText = match[0];

        // Skip if we've already captured this citation
        if (seen.has(citationText)) {
          continue;
        }
        seen.add(citationText);

        // Determine citation type based on format
        const citation = this.parseCaseCitation(citationText, match);
        if (citation) {
          citations.push(citation);
        }
      }
    }

    return citations;
  }

  /**
   * Parse a case citation based on its format
   */
  private parseCaseCitation(citationText: string, match: RegExpExecArray): ParsedCitation | null {
    // Check for UK neutral citation format: [2023] UKSC 15
    if (citationText.includes('[') && citationText.includes(']') &&
        (citationText.includes('UKSC') || citationText.includes('EWCA') ||
         citationText.includes('EWHC') || citationText.includes('UKPC') ||
         citationText.includes('EWFC') || citationText.includes('UKUT'))) {
      const caseName = match[1]?.trim();
      const year = match[2];
      const court = match[3];
      const caseNumber = match[4];

      return {
        id: uuidv4(),
        citationText,
        caseName,
        caseReporter: `[${year}] ${court} ${caseNumber}`,
        year,
        court,
        type: 'case',
      };
    }

    // Check for UK law report format: [2023] 1 WLR 123
    if (citationText.includes('[') && citationText.includes(']') &&
        (citationText.includes('WLR') || citationText.includes('AC') ||
         citationText.includes('QB') || citationText.includes('All ER'))) {
      const caseName = match[1]?.trim();
      const year = match[2];
      const volume = match[3];
      const reporter = match[4];
      const page = match[5];

      return {
        id: uuidv4(),
        citationText,
        caseName,
        caseReporter: volume ? `[${year}] ${volume} ${reporter} ${page}` : `[${year}] ${reporter} ${page}`,
        volume,
        page,
        year,
        type: 'case',
      };
    }

    // Check for DIFC citation format: CFI 001/2023 or [2023] DIFC CA 5
    if (citationText.includes('DIFC') ||
        (/\b(CFI|ARB|CA|SCT)\s+\d{3}\/\d{4}\b/i.test(citationText))) {

      // DIFC neutral citation format: [2023] DIFC CA 5
      if (citationText.includes('[') && citationText.includes('DIFC')) {
        const caseName = match[1]?.trim();
        const year = match[2];
        const court = match[3];
        const caseNumber = match[4];

        return {
          id: uuidv4(),
          citationText,
          caseName,
          caseReporter: `[${year}] DIFC ${court} ${caseNumber}`,
          year,
          court: `DIFC ${court}`,
          type: 'case',
        };
      }

      // DIFC short format: CFI 001/2023
      const court = match[1];
      const caseNumber = match[2];
      const year = match[3];

      return {
        id: uuidv4(),
        citationText,
        caseReporter: `DIFC ${court} ${caseNumber}/${year}`,
        year,
        court: `DIFC ${court}`,
        type: 'case',
      };
    }

    // US citation format (default)
    const caseName = match[1]?.trim();
    const volume = match[2];
    const reporter = match[3];
    const page = match[4];
    const year = match[5] || match[6]; // Different capture groups depending on pattern

    return {
      id: uuidv4(),
      citationText,
      caseName,
      caseReporter: `${volume} ${reporter} ${page}`,
      volume,
      page,
      year,
      type: 'case',
    };
  }

  /**
   * Extract statute citations
   */
  private extractStatuteCitations(text: string): ParsedCitation[] {
    const citations: ParsedCitation[] = [];
    const seen = new Set<string>();

    for (const pattern of CitationExtractor.STATUTE_PATTERNS) {
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(text)) !== null) {
        const citationText = match[0];

        if (seen.has(citationText)) {
          continue;
        }
        seen.add(citationText);

        citations.push({
          id: uuidv4(),
          citationText,
          type: 'statute',
        });
      }
    }

    return citations;
  }

  /**
   * Extract regulation citations
   */
  private extractRegulationCitations(text: string): ParsedCitation[] {
    const citations: ParsedCitation[] = [];
    const seen = new Set<string>();

    for (const pattern of CitationExtractor.REGULATION_PATTERNS) {
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(text)) !== null) {
        const citationText = match[0];

        if (seen.has(citationText)) {
          continue;
        }
        seen.add(citationText);

        citations.push({
          id: uuidv4(),
          citationText,
          type: 'regulation',
        });
      }
    }

    return citations;
  }

  /**
   * Extract citations from all exam answers
   */
  public extractFromExamAnswers(answers: Array<{ questionNumber: number; answer: string }>): Map<number, ParsedCitation[]> {
    const citationsByQuestion = new Map<number, ParsedCitation[]>();

    for (const { questionNumber, answer } of answers) {
      const citations = this.extractCitations(answer, questionNumber);
      if (citations.length > 0) {
        citationsByQuestion.set(questionNumber, citations);
      }
    }

    return citationsByQuestion;
  }

  /**
   * Count total citations in text
   */
  public countCitations(text: string): number {
    return this.extractCitations(text).length;
  }

  /**
   * Check if text contains legal citations
   */
  public hasCitations(text: string): boolean {
    return this.countCitations(text) > 0;
  }
}

export default new CitationExtractor();
