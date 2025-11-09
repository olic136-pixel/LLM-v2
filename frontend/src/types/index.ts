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
