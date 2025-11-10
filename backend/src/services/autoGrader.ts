import { dbGet, dbAll } from '../database';

export interface AnswerKey {
  id: string;
  examDocumentId: string;
  questionNumber: number;
  referenceAnswer: string;
  keywords: string; // JSON array of keywords
  maxScore: number;
  userId?: string;
  createdAt: string;
}

export interface Rubric {
  id: string;
  name: string;
  description?: string;
  examDocumentId?: string;
  userId?: string;
  createdAt: string;
  criteria: RubricCriterion[];
}

export interface RubricCriterion {
  id: string;
  rubricId: string;
  name: string;
  description?: string;
  weight: number; // 0-1 scale
  createdAt: string;
}

export interface GradingResult {
  questionNumber: number;
  score: number;
  maxScore: number;
  percentage: number;
  feedback: string;
  keywordMatches: string[];
  missingKeywords: string[];
}

export interface AutoGradeReport {
  totalScore: number;
  maxTotalScore: number;
  percentage: number;
  questionGrades: GradingResult[];
  overallFeedback: string;
}

export class AutoGrader {
  /**
   * Grade exam answers using answer keys
   */
  public async gradeExam(
    examDocumentId: string,
    answers: Array<{ questionNumber: number; answer: string }>
  ): Promise<AutoGradeReport> {
    // Fetch answer keys for this exam
    const answerKeys = await dbAll<AnswerKey>(
      'SELECT * FROM answer_keys WHERE examDocumentId = ? ORDER BY questionNumber',
      [examDocumentId]
    );

    if (answerKeys.length === 0) {
      throw new Error('No answer keys found for this exam');
    }

    const questionGrades: GradingResult[] = [];
    let totalScore = 0;
    let maxTotalScore = 0;

    // Grade each question
    for (const answerKey of answerKeys) {
      const studentAnswer = answers.find((a) => a.questionNumber === answerKey.questionNumber);

      if (!studentAnswer) {
        // Question not answered
        questionGrades.push({
          questionNumber: answerKey.questionNumber,
          score: 0,
          maxScore: answerKey.maxScore,
          percentage: 0,
          feedback: 'No answer provided',
          keywordMatches: [],
          missingKeywords: this.parseKeywords(answerKey.keywords),
        });
        maxTotalScore += answerKey.maxScore;
        continue;
      }

      // Grade the answer
      const result = this.gradeAnswer(
        studentAnswer.answer,
        answerKey.referenceAnswer,
        this.parseKeywords(answerKey.keywords),
        answerKey.maxScore
      );

      questionGrades.push(result);
      totalScore += result.score;
      maxTotalScore += result.maxScore;
    }

    const percentage = maxTotalScore > 0 ? (totalScore / maxTotalScore) * 100 : 0;

    return {
      totalScore,
      maxTotalScore,
      percentage,
      questionGrades,
      overallFeedback: this.generateOverallFeedback(percentage, questionGrades),
    };
  }

  /**
   * Grade a single answer against reference answer and keywords
   */
  private gradeAnswer(
    studentAnswer: string,
    referenceAnswer: string,
    keywords: string[],
    maxScore: number
  ): GradingResult {
    const normalizedStudent = this.normalizeText(studentAnswer);
    const normalizedReference = this.normalizeText(referenceAnswer);

    // Calculate semantic similarity (simple word overlap)
    const similarityScore = this.calculateSimilarity(normalizedStudent, normalizedReference);

    // Calculate keyword coverage
    const { matched, missing } = this.checkKeywordCoverage(normalizedStudent, keywords);
    const keywordScore = keywords.length > 0 ? matched.length / keywords.length : 0;

    // Weight: 40% similarity, 60% keywords
    const finalScore = similarityScore * 0.4 + keywordScore * 0.6;
    const score = Math.round(finalScore * maxScore * 10) / 10; // Round to 1 decimal

    // Generate feedback
    const feedback = this.generateFeedback(similarityScore, keywordScore, matched, missing);

    return {
      questionNumber: 0, // Will be set by caller
      score,
      maxScore,
      percentage: (score / maxScore) * 100,
      feedback,
      keywordMatches: matched,
      missingKeywords: missing,
    };
  }

  /**
   * Grade using custom rubric
   */
  public async gradeWithRubric(
    answer: string,
    rubricId: string
  ): Promise<{ score: number; maxScore: number; criteriaScores: Map<string, number> }> {
    // Fetch rubric and criteria
    const rubric = await dbGet<Rubric>('SELECT * FROM rubrics WHERE id = ?', [rubricId]);

    if (!rubric) {
      throw new Error('Rubric not found');
    }

    const criteria = await dbAll<RubricCriterion>(
      'SELECT * FROM rubric_criteria WHERE rubricId = ? ORDER BY weight DESC',
      [rubricId]
    );

    if (criteria.length === 0) {
      throw new Error('No criteria found for this rubric');
    }

    const criteriaScores = new Map<string, number>();
    let totalScore = 0;
    const maxScore = 100;

    // Evaluate each criterion
    for (const criterion of criteria) {
      const criterionScore = this.evaluateCriterion(answer, criterion);
      criteriaScores.set(criterion.name, criterionScore);
      totalScore += criterionScore * criterion.weight;
    }

    return {
      score: Math.round(totalScore * 10) / 10,
      maxScore,
      criteriaScores,
    };
  }

  /**
   * Evaluate answer against a single rubric criterion
   */
  private evaluateCriterion(answer: string, criterion: RubricCriterion): number {
    const normalized = this.normalizeText(answer);

    // Simple heuristic evaluation
    let score = 50; // Start at midpoint

    // Check for criterion-related keywords in description
    if (criterion.description) {
      const descriptionKeywords = this.extractImportantWords(criterion.description);
      const { matched } = this.checkKeywordCoverage(normalized, descriptionKeywords);
      const coverage = descriptionKeywords.length > 0 ? matched.length / descriptionKeywords.length : 0.5;
      score = coverage * 100;
    }

    // Consider answer length (longer answers tend to be more complete)
    const wordCount = normalized.split(/\s+/).length;
    if (wordCount < 50) {
      score *= 0.7; // Penalty for short answers
    } else if (wordCount > 200) {
      score *= 0.9; // Slight penalty for overly long answers
    }

    return Math.min(Math.max(score, 0), 100); // Clamp between 0-100
  }

  /**
   * Calculate semantic similarity between two texts
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Check keyword coverage in text
   */
  private checkKeywordCoverage(
    text: string,
    keywords: string[]
  ): { matched: string[]; missing: string[] } {
    const matched: string[] = [];
    const missing: string[] = [];

    for (const keyword of keywords) {
      const normalizedKeyword = this.normalizeText(keyword);
      if (text.includes(normalizedKeyword)) {
        matched.push(keyword);
      } else {
        missing.push(keyword);
      }
    }

    return { matched, missing };
  }

  /**
   * Extract important words from text (removes stop words)
   */
  private extractImportantWords(text: string): string[] {
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'should',
      'could',
      'may',
      'might',
      'must',
      'can',
      'this',
      'that',
      'these',
      'those',
    ]);

    const normalized = this.normalizeText(text);
    const words = normalized.split(/\s+/);

    return words.filter((word) => word.length > 3 && !stopWords.has(word));
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Parse keywords from JSON string
   */
  private parseKeywords(keywordsJson: string): string[] {
    try {
      const parsed = JSON.parse(keywordsJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Generate feedback for a graded answer
   */
  private generateFeedback(
    similarityScore: number,
    keywordScore: number,
    matched: string[],
    missing: string[]
  ): string {
    const feedback: string[] = [];

    if (similarityScore >= 0.7) {
      feedback.push('Strong alignment with reference answer.');
    } else if (similarityScore >= 0.4) {
      feedback.push('Partial alignment with reference answer.');
    } else {
      feedback.push('Limited alignment with reference answer.');
    }

    if (keywordScore >= 0.8) {
      feedback.push('Excellent coverage of key concepts.');
    } else if (keywordScore >= 0.5) {
      feedback.push('Good coverage of key concepts.');
    } else {
      feedback.push('Key concepts are missing or underdeveloped.');
    }

    if (matched.length > 0) {
      feedback.push(`Key terms addressed: ${matched.slice(0, 3).join(', ')}${matched.length > 3 ? '...' : ''}.`);
    }

    if (missing.length > 0) {
      feedback.push(
        `Consider addressing: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}.`
      );
    }

    return feedback.join(' ');
  }

  /**
   * Generate overall feedback for exam
   */
  private generateOverallFeedback(percentage: number, questionGrades: GradingResult[]): string {
    const feedback: string[] = [];

    if (percentage >= 90) {
      feedback.push('Excellent performance! Strong understanding of the material.');
    } else if (percentage >= 80) {
      feedback.push('Very good performance with solid understanding.');
    } else if (percentage >= 70) {
      feedback.push('Satisfactory performance. Some areas need improvement.');
    } else if (percentage >= 60) {
      feedback.push('Adequate performance but significant gaps in understanding.');
    } else {
      feedback.push('Needs improvement. Consider reviewing the material thoroughly.');
    }

    // Identify weakest areas
    const weakQuestions = questionGrades
      .filter((q) => q.percentage < 60)
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 3);

    if (weakQuestions.length > 0) {
      const questionNumbers = weakQuestions.map((q) => q.questionNumber).join(', ');
      feedback.push(`Focus on strengthening responses to questions: ${questionNumbers}.`);
    }

    return feedback.join(' ');
  }
}

export default new AutoGrader();
