import axios from 'axios';
import { ParsedCitation } from './citationExtractor';

export interface VerificationResult {
  citationId: string;
  verified: boolean;
  verificationStatus: 'verified' | 'not_found' | 'partial_match' | 'error' | 'pending';
  verificationDetails?: string;
  isHallucination: boolean;
  confidence: number; // 0-1 scale
  sourceDatabase?: string;
}

export class CitationVerifier {
  private courtListenerApiKey?: string;

  constructor(courtListenerApiKey?: string) {
    this.courtListenerApiKey = courtListenerApiKey || process.env.COURTLISTENER_API_KEY;
  }

  /**
   * Verify a single citation
   */
  public async verifyCitation(citation: ParsedCitation): Promise<VerificationResult> {
    try {
      if (citation.type === 'case') {
        return await this.verifyCaseCitation(citation);
      } else if (citation.type === 'statute') {
        return await this.verifyStatuteCitation(citation);
      } else if (citation.type === 'regulation') {
        return await this.verifyRegulationCitation(citation);
      }

      return {
        citationId: citation.id,
        verified: false,
        verificationStatus: 'error',
        verificationDetails: 'Unknown citation type',
        isHallucination: false,
        confidence: 0,
      };
    } catch (error: any) {
      console.error('Citation verification error:', error);
      return {
        citationId: citation.id,
        verified: false,
        verificationStatus: 'error',
        verificationDetails: error.message,
        isHallucination: false,
        confidence: 0,
      };
    }
  }

  /**
   * Verify case law citation using CourtListener API
   */
  private async verifyCaseCitation(citation: ParsedCitation): Promise<VerificationResult> {
    // If no API key, use heuristic verification
    if (!this.courtListenerApiKey) {
      return this.heuristicCaseVerification(citation);
    }

    try {
      // Search CourtListener for the case
      const response = await axios.get('https://www.courtlistener.com/api/rest/v3/search/', {
        params: {
          q: citation.caseName,
          type: 'o', // opinions
          format: 'json',
        },
        headers: {
          Authorization: `Token ${this.courtListenerApiKey}`,
        },
        timeout: 10000,
      });

      const results = response.data.results || [];

      // Check if any result matches the citation details
      for (const result of results) {
        const nameMatch = this.fuzzyMatchCaseName(citation.caseName || '', result.caseName || '');
        const reporterMatch = citation.caseReporter ? result.citation?.includes(citation.volume || '') : false;

        if (nameMatch && (reporterMatch || !citation.caseReporter)) {
          return {
            citationId: citation.id,
            verified: true,
            verificationStatus: 'verified',
            verificationDetails: `Verified via CourtListener: ${result.caseName}`,
            isHallucination: false,
            confidence: 0.9,
            sourceDatabase: 'CourtListener',
          };
        }
      }

      // Partial match if case name found but reporter doesn't match
      if (results.length > 0) {
        return {
          citationId: citation.id,
          verified: false,
          verificationStatus: 'partial_match',
          verificationDetails: 'Case name found but citation details do not match exactly',
          isHallucination: true,
          confidence: 0.5,
          sourceDatabase: 'CourtListener',
        };
      }

      // Not found in database
      return {
        citationId: citation.id,
        verified: false,
        verificationStatus: 'not_found',
        verificationDetails: 'Citation not found in CourtListener database',
        isHallucination: true,
        confidence: 0.8, // High confidence it's a hallucination
        sourceDatabase: 'CourtListener',
      };
    } catch (error: any) {
      console.error('CourtListener API error:', error);
      // Fallback to heuristic verification
      return this.heuristicCaseVerification(citation);
    }
  }

  /**
   * Heuristic-based case verification (when API is unavailable)
   */
  private heuristicCaseVerification(citation: ParsedCitation): VerificationResult {
    let confidence = 0.5; // Default neutral confidence
    let isLikelyValid = false;

    // Check for UK neutral citation format: [2023] UKSC 15
    if (citation.caseReporter && /\[\d{4}\]\s+(UKSC|UKPC|EWCA|EWHC|EWFC|UKUT|UKFTT)/.test(citation.caseReporter)) {
      const hasProperCaseName = citation.caseName ? /^[A-Z].*v\.\s+[A-Z]/.test(citation.caseName) || /^R\s+v\s+/.test(citation.caseName) : false;
      const hasYear = citation.year ? /^\d{4}$/.test(citation.year) : false;

      confidence = 0.7; // UK neutral citations are well-structured
      isLikelyValid = true;

      if (hasProperCaseName) {
        confidence += 0.1;
      }

      if (hasYear && citation.year) {
        const year = parseInt(citation.year);
        // UK Supreme Court established in 2009
        if (year >= 1950 && year <= new Date().getFullYear()) {
          confidence += 0.1;
        }
      }

      return {
        citationId: citation.id,
        verified: false,
        verificationStatus: 'pending',
        verificationDetails: 'UK neutral citation format appears valid. External verification recommended.',
        isHallucination: !isLikelyValid,
        confidence: Math.min(confidence, 1.0),
        sourceDatabase: 'Heuristic',
      };
    }

    // Check for UK law report format: [2023] 1 WLR 123
    if (citation.caseReporter && /\[\d{4}\]\s+(?:\d+\s+)?(WLR|AC|QB|Ch|Fam|All\s+ER|BCLC)/.test(citation.caseReporter)) {
      confidence = 0.75; // UK law reports are authoritative
      isLikelyValid = true;

      return {
        citationId: citation.id,
        verified: false,
        verificationStatus: 'pending',
        verificationDetails: 'UK law report citation format appears valid.',
        isHallucination: false,
        confidence: Math.min(confidence, 1.0),
        sourceDatabase: 'Heuristic',
      };
    }

    // Check for DIFC citation format
    if (citation.court && citation.court.includes('DIFC')) {
      const hasYear = citation.year ? /^\d{4}$/.test(citation.year) : false;
      const validDIFCCourts = ['CFI', 'CA', 'SCT', 'ARB'];
      const hasValidCourt = validDIFCCourts.some((court) => citation.court?.includes(court));

      confidence = 0.7;
      isLikelyValid = true;

      if (hasValidCourt) {
        confidence += 0.1;
      }

      if (hasYear && citation.year) {
        const year = parseInt(citation.year);
        // DIFC Courts established in 2004
        if (year >= 2004 && year <= new Date().getFullYear()) {
          confidence += 0.1;
        }
      }

      return {
        citationId: citation.id,
        verified: false,
        verificationStatus: 'pending',
        verificationDetails: 'DIFC citation format appears valid.',
        isHallucination: !isLikelyValid,
        confidence: Math.min(confidence, 1.0),
        sourceDatabase: 'Heuristic',
      };
    }

    // US citation format validation (original logic)
    const hasProperCaseName = citation.caseName ? /^[A-Z].*v\.\s+[A-Z]/.test(citation.caseName) : false;
    const hasValidReporter = citation.caseReporter ? /\d+\s+[A-Z][a-z.]+\s+\d+/.test(citation.caseReporter) : false;
    const hasYear = citation.year ? /^\d{4}$/.test(citation.year) : false;

    // Well-known US reporters increase confidence
    const knownReporters = ['U.S.', 'F.2d', 'F.3d', 'F.Supp', 'S.Ct.'];
    const hasKnownReporter = citation.caseReporter
      ? knownReporters.some((r) => citation.caseReporter?.includes(r))
      : false;

    if (hasProperCaseName && hasValidReporter) {
      confidence = 0.6;
      isLikelyValid = true;
    }

    if (hasKnownReporter) {
      confidence += 0.2;
    }

    if (hasYear && citation.year) {
      const year = parseInt(citation.year);
      if (year >= 1789 && year <= new Date().getFullYear()) {
        confidence += 0.1;
      }
    }

    return {
      citationId: citation.id,
      verified: false,
      verificationStatus: 'pending',
      verificationDetails: `Heuristic analysis: ${isLikelyValid ? 'Format appears valid' : 'Format may be invalid'}. API verification recommended.`,
      isHallucination: !isLikelyValid,
      confidence: Math.min(confidence, 1.0),
      sourceDatabase: 'Heuristic',
    };
  }

  /**
   * Verify statute citation
   */
  private async verifyStatuteCitation(citation: ParsedCitation): Promise<VerificationResult> {
    // Basic validation for U.S.C. and state statutes
    const isUSC = citation.citationText.includes('U.S.C.');
    const hasSectionSymbol = citation.citationText.includes('§');

    if (isUSC && hasSectionSymbol) {
      // Extract section number
      const match = citation.citationText.match(/(\d+)\s+U\.S\.C\.\s+§\s*(\d+)/);
      if (match) {
        const title = parseInt(match[1]);
        const section = parseInt(match[2]);

        // Basic validation - U.S.C. titles range from 1-54
        if (title >= 1 && title <= 54 && section > 0) {
          return {
            citationId: citation.id,
            verified: true,
            verificationStatus: 'verified',
            verificationDetails: 'Valid U.S.C. format',
            isHallucination: false,
            confidence: 0.7, // Medium confidence without full database check
            sourceDatabase: 'Format validation',
          };
        }
      }
    }

    // State statute validation
    const stateStatutePattern = /[A-Z][a-z.]+\s+[A-Z][a-z.]+\s+[A-Z][a-z.]+\s+§/;
    if (stateStatutePattern.test(citation.citationText)) {
      return {
        citationId: citation.id,
        verified: false,
        verificationStatus: 'pending',
        verificationDetails: 'State statute format appears valid but needs verification',
        isHallucination: false,
        confidence: 0.6,
        sourceDatabase: 'Format validation',
      };
    }

    return {
      citationId: citation.id,
      verified: false,
      verificationStatus: 'not_found',
      verificationDetails: 'Invalid statute citation format',
      isHallucination: true,
      confidence: 0.7,
      sourceDatabase: 'Format validation',
    };
  }

  /**
   * Verify regulation citation (C.F.R.)
   */
  private async verifyRegulationCitation(citation: ParsedCitation): Promise<VerificationResult> {
    // Basic C.F.R. validation
    const match = citation.citationText.match(/(\d+)\s+C\.F\.R\.\s+§\s*(\d+\.\d+)/);

    if (match) {
      const title = parseInt(match[1]);
      const section = match[2];

      // C.F.R. titles range from 1-50
      if (title >= 1 && title <= 50 && section) {
        return {
          citationId: citation.id,
          verified: true,
          verificationStatus: 'verified',
          verificationDetails: 'Valid C.F.R. format',
          isHallucination: false,
          confidence: 0.7,
          sourceDatabase: 'Format validation',
        };
      }
    }

    return {
      citationId: citation.id,
      verified: false,
      verificationStatus: 'not_found',
      verificationDetails: 'Invalid C.F.R. citation format',
      isHallucination: true,
      confidence: 0.7,
      sourceDatabase: 'Format validation',
    };
  }

  /**
   * Verify multiple citations in batch
   */
  public async verifyBatch(citations: ParsedCitation[]): Promise<VerificationResult[]> {
    const results: VerificationResult[] = [];

    for (const citation of citations) {
      const result = await this.verifyCitation(citation);
      results.push(result);

      // Add small delay to avoid rate limiting
      await this.delay(100);
    }

    return results;
  }

  /**
   * Calculate citation accuracy metrics
   */
  public calculateAccuracyMetrics(verificationResults: VerificationResult[]): {
    totalCitations: number;
    verifiedCitations: number;
    hallucinatedCitations: number;
    citationAccuracy: number;
  } {
    const totalCitations = verificationResults.length;
    const verifiedCitations = verificationResults.filter((r) => r.verified).length;
    const hallucinatedCitations = verificationResults.filter((r) => r.isHallucination).length;
    const citationAccuracy = totalCitations > 0 ? (verifiedCitations / totalCitations) * 100 : 0;

    return {
      totalCitations,
      verifiedCitations,
      hallucinatedCitations,
      citationAccuracy,
    };
  }

  /**
   * Fuzzy match case names (handles variations in formatting)
   */
  private fuzzyMatchCaseName(name1: string, name2: string): boolean {
    const normalize = (name: string) =>
      name
        .toLowerCase()
        .replace(/[.,]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const normalized1 = normalize(name1);
    const normalized2 = normalize(name2);

    // Exact match
    if (normalized1 === normalized2) {
      return true;
    }

    // Check if one contains the other (handles shortened names)
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      return true;
    }

    // Calculate similarity using Levenshtein-like approach
    const similarity = this.calculateSimilarity(normalized1, normalized2);
    return similarity > 0.8; // 80% similarity threshold
  }

  /**
   * Calculate string similarity (0-1 scale)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new CitationVerifier();
