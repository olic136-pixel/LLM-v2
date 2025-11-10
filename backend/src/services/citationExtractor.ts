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
  ];

  private static readonly STATUTE_PATTERNS = [
    // U.S.C.: 42 U.S.C. § 1983
    /(\d+)\s+(U\.S\.C\.)\s+§\s*(\d+[a-z]*(?:-\d+)*)/g,

    // State statutes: Cal. Civ. Code § 1234
    /([A-Z][a-z.]+)\s+([A-Z][a-z.]+)\s+([A-Z][a-z.]+)\s+§\s*(\d+[a-z]*(?:-\d+)*)/g,
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

        const caseName = match[1]?.trim();
        const volume = match[2];
        const reporter = match[3];
        const page = match[4];
        const year = match[5] || match[6]; // Different capture groups depending on pattern

        citations.push({
          id: uuidv4(),
          citationText,
          caseName,
          caseReporter: `${volume} ${reporter} ${page}`,
          volume,
          page,
          year,
          type: 'case',
        });
      }
    }

    return citations;
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
