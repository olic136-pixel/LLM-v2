export interface AIModel {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  baseUrl: string;
  isActive: boolean;
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
  content: string;
  filePath: string;
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
