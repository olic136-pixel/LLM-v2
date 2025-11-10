export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  modelId: string; // The specific model identifier (e.g., 'abab5.5-chat', 'glm-4')
  apiKey: string;
  baseUrl: string;
  isActive: boolean;
  userId?: string;
  createdAt: string;
}

export interface BenchmarkTest {
  id: string;
  type: 'legal_reasoning' | 'document_analysis' | 'document_drafting';
  modelId: string;
  question: string;
  context?: string;
  response: string;
  responseTime: number;
  userGrade?: number;
  userFeedback?: string;
  documentId?: string;
  documentName?: string;
  documentType?: string;
  requirements?: string;
  createdAt: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  category: 'general' | 'exam' | 'bar_exam' | 'law_exam';
  content: string;
  filePath: string;
  userId?: string;
  uploadedAt: string;
}

export interface BenchmarkStats {
  modelId: string;
  modelName: string;
  testCount: number;
  averageResponseTime: number;
  averageGrade: number;
  testsByType: {
    legal_reasoning: number;
    document_analysis: number;
    document_drafting: number;
  };
}

export interface TestTemplate {
  id: string;
  name: string;
  description: string;
  type: 'legal_reasoning' | 'document_analysis' | 'document_drafting';
  question?: string;
  documentType?: string;
  requirements?: string;
  userId?: string;
  createdAt: string;
}

export interface BatchTest {
  id: string;
  name: string;
  modelIds: string[];
  templateIds: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  userId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PerformanceSnapshot {
  id: string;
  modelId: string;
  averageResponseTime: number;
  averageGrade: number;
  testCount: number;
  timestamp: string;
}

export interface ExamResult {
  id: string;
  examDocumentId: string;
  examName: string;
  modelId: string;
  modelName: string;
  answers: ExamAnswer[];
  responseTime: number;
  score?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  assessorGrade?: number;
  assessorFeedback?: string;
  assessorName?: string;
  autoGradeScore?: number;
  citationAccuracy?: number;
  hallucinationCount?: number;
  totalCitations?: number;
  status: 'pending' | 'graded' | 'reviewed';
  userId?: string;
  createdAt: string;
  gradedAt?: string;
}

export interface ExamAnswer {
  questionNumber: number;
  question: string;
  answer: string;
  timeSpent: number;
}

export interface AnswerKey {
  id: string;
  examDocumentId: string;
  questionNumber: number;
  referenceAnswer: string;
  keywords: string[]; // Array of keywords
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

export interface Citation {
  id: string;
  examResultId: string;
  questionNumber: number;
  citationText: string;
  caseName?: string;
  caseReporter?: string;
  verified: boolean;
  verificationStatus: 'verified' | 'not_found' | 'partial_match' | 'error' | 'pending';
  verificationDetails?: string;
  isHallucination: boolean;
  createdAt: string;
  verifiedAt?: string;
}

export interface AutoGradeReport {
  totalScore: number;
  maxTotalScore: number;
  percentage: number;
  questionGrades: QuestionGrade[];
  overallFeedback: string;
}

export interface QuestionGrade {
  questionNumber: number;
  score: number;
  maxScore: number;
  percentage: number;
  feedback: string;
  keywordMatches: string[];
  missingKeywords: string[];
}
