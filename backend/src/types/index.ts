// User types
export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
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
  createdAt: string;
}

export interface LegalReasoningTest extends BenchmarkTest {
  type: 'legal_reasoning';
  documentId?: string;
  documentName?: string;
}

export interface DocumentAnalysisTest extends BenchmarkTest {
  type: 'document_analysis';
  documentId: string;
  documentName: string;
}

export interface DocumentDraftingTest extends BenchmarkTest {
  type: 'document_drafting';
  documentType: string;
  requirements: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  content: string;
  filePath: string;
  uploadedAt: string;
}

export interface ApiKeyValidationRequest {
  provider: string;
  apiKey: string;
  baseUrl: string;
  modelName?: string;
}

export interface ApiKeyValidationResponse {
  valid: boolean;
  message: string;
  modelInfo?: {
    name: string;
    provider: string;
  };
}

export interface BenchmarkRequest {
  modelId: string;
  type: 'legal_reasoning' | 'document_analysis' | 'document_drafting';
  question?: string;
  documentId?: string;
  documentType?: string;
  requirements?: string;
}

export interface BenchmarkResponse {
  testId: string;
  modelId: string;
  response: string;
  responseTime: number;
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

// Test Template types
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

// Batch Test types
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

// Scheduled Test types
export interface ScheduledTest {
  id: string;
  name: string;
  cronExpression: string;
  modelIds: string[];
  templateIds: string[];
  isActive: boolean;
  userId?: string;
  createdAt: string;
  lastRun?: string;
  nextRun?: string;
}

// Performance History types
export interface PerformanceSnapshot {
  id: string;
  modelId: string;
  averageResponseTime: number;
  averageGrade: number;
  testCount: number;
  timestamp: string;
}
