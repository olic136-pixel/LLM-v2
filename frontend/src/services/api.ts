import axios from 'axios';
import { AIModel, BenchmarkTest, Document, BenchmarkStats, User, TestTemplate, ExamResult, AnswerKey, Rubric, Citation, AutoGradeReport } from '../types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authentication API
export const authApi = {
  register: async (data: { email: string; password: string; name: string }): Promise<{ user: User; token: string }> => {
    const response = await api.post('/auth/register', data);
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    return response.data;
  },

  login: async (data: { email: string; password: string }): Promise<{ user: User; token: string }> => {
    const response = await api.post('/auth/login', data);
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('authToken');
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Models API
export const modelsApi = {
  getAll: async (): Promise<AIModel[]> => {
    const response = await api.get('/models');
    return response.data;
  },

  getById: async (id: string): Promise<AIModel> => {
    const response = await api.get(`/models/${id}`);
    return response.data;
  },

  create: async (model: Omit<AIModel, 'id' | 'createdAt' | 'isActive'>): Promise<AIModel> => {
    const response = await api.post('/models', model);
    return response.data;
  },

  update: async (id: string, model: Partial<AIModel>): Promise<AIModel> => {
    const response = await api.put(`/models/${id}`, model);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/models/${id}`);
  },

  validate: async (data: {
    provider: string;
    apiKey: string;
    baseUrl: string;
    modelName?: string;
  }): Promise<{ valid: boolean; message: string }> => {
    const response = await api.post('/models/validate', data);
    return response.data;
  },
};

// Documents API
export const documentsApi = {
  getAll: async (): Promise<Document[]> => {
    const response = await api.get('/documents');
    return response.data;
  },

  getById: async (id: string): Promise<Document> => {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },

  upload: async (file: File, category: 'general' | 'exam' | 'bar_exam' | 'law_exam' = 'general'): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },
};

// Benchmarks API
export const benchmarksApi = {
  getAll: async (filters?: { modelId?: string; type?: string }): Promise<BenchmarkTest[]> => {
    const response = await api.get('/benchmarks', { params: filters });
    return response.data;
  },

  getById: async (id: string): Promise<BenchmarkTest> => {
    const response = await api.get(`/benchmarks/${id}`);
    return response.data;
  },

  run: async (data: {
    modelId: string;
    type: 'legal_reasoning' | 'document_analysis' | 'document_drafting';
    question?: string;
    documentId?: string;
    documentType?: string;
    requirements?: string;
  }): Promise<{ testId: string; modelId: string; response: string; responseTime: number }> => {
    const response = await api.post('/benchmarks/run', data);
    return response.data;
  },

  grade: async (id: string, grade: number, feedback?: string): Promise<BenchmarkTest> => {
    const response = await api.post(`/benchmarks/${id}/grade`, { grade, feedback });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/benchmarks/${id}`);
  },

  getStats: async (): Promise<BenchmarkStats[]> => {
    const response = await api.get('/benchmarks/stats/summary');
    return response.data;
  },
};

// Templates API
export const templatesApi = {
  getAll: async (): Promise<TestTemplate[]> => {
    const response = await api.get('/templates');
    return response.data;
  },

  getById: async (id: string): Promise<TestTemplate> => {
    const response = await api.get(`/templates/${id}`);
    return response.data;
  },

  create: async (template: Omit<TestTemplate, 'id' | 'createdAt' | 'userId'>): Promise<TestTemplate> => {
    const response = await api.post('/templates', template);
    return response.data;
  },

  update: async (id: string, template: Partial<TestTemplate>): Promise<TestTemplate> => {
    const response = await api.put(`/templates/${id}`, template);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/templates/${id}`);
  },
};

// Export API
export const exportApi = {
  exportTestsCSV: async (filters?: { modelId?: string; type?: string }): Promise<Blob> => {
    const response = await api.get('/export/tests/csv', {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  },

  exportStatsCSV: async (): Promise<Blob> => {
    const response = await api.get('/export/stats/csv', {
      responseType: 'blob',
    });
    return response.data;
  },

  exportReportPDF: async (): Promise<Blob> => {
    const response = await api.get('/export/report/pdf', {
      responseType: 'blob',
    });
    return response.data;
  },
};

// Exams API
export const examsApi = {
  getResults: async (): Promise<ExamResult[]> => {
    const response = await api.get('/exams/results');
    return response.data;
  },

  getResultById: async (id: string): Promise<ExamResult> => {
    const response = await api.get(`/exams/results/${id}`);
    return response.data;
  },

  takeExam: async (data: { examDocumentId: string; modelId: string }): Promise<{
    resultId: string;
    examName: string;
    modelName: string;
    answers: any[];
    totalTime: number;
  }> => {
    const response = await api.post('/exams/take', data);
    return response.data;
  },

  gradeExam: async (data: {
    resultId: string;
    assessorGrade: number;
    assessorFeedback?: string;
    assessorName?: string;
    correctAnswers?: number;
  }): Promise<ExamResult> => {
    const response = await api.post('/exams/grade', data);
    return response.data;
  },

  exportResult: async (id: string): Promise<Blob> => {
    const response = await api.get(`/exams/export/${id}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  deleteResult: async (id: string): Promise<void> => {
    await api.delete(`/exams/results/${id}`);
  },

  getCitations: async (resultId: string): Promise<Citation[]> => {
    const response = await api.get(`/exams/results/${resultId}/citations`);
    return response.data;
  },

  autoGradeResult: async (resultId: string): Promise<{ autoGradeScore: number; gradeReport: AutoGradeReport }> => {
    const response = await api.post(`/exams/results/${resultId}/auto-grade`);
    return response.data;
  },
};

// Answer Keys API
export const answerKeysApi = {
  getByExam: async (examDocumentId: string): Promise<AnswerKey[]> => {
    const response = await api.get(`/answer-keys/exam/${examDocumentId}`);
    return response.data;
  },

  getById: async (id: string): Promise<AnswerKey> => {
    const response = await api.get(`/answer-keys/${id}`);
    return response.data;
  },

  create: async (data: Omit<AnswerKey, 'id' | 'createdAt' | 'userId'>): Promise<AnswerKey> => {
    const response = await api.post('/answer-keys', data);
    return response.data;
  },

  update: async (id: string, data: Partial<AnswerKey>): Promise<AnswerKey> => {
    const response = await api.put(`/answer-keys/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/answer-keys/${id}`);
  },

  bulkCreate: async (data: { examDocumentId: string; answerKeys: Array<Omit<AnswerKey, 'id' | 'createdAt' | 'userId'>> }): Promise<{ created: number; answerKeys: AnswerKey[] }> => {
    const response = await api.post('/answer-keys/bulk', data);
    return response.data;
  },
};

// Rubrics API
export const rubricsApi = {
  getAll: async (examDocumentId?: string): Promise<Rubric[]> => {
    const response = await api.get('/rubrics', {
      params: examDocumentId ? { examDocumentId } : undefined,
    });
    return response.data;
  },

  getById: async (id: string): Promise<Rubric> => {
    const response = await api.get(`/rubrics/${id}`);
    return response.data;
  },

  create: async (data: Omit<Rubric, 'id' | 'createdAt' | 'userId'>): Promise<Rubric> => {
    const response = await api.post('/rubrics', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Rubric>): Promise<Rubric> => {
    const response = await api.put(`/rubrics/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/rubrics/${id}`);
  },

  addCriterion: async (rubricId: string, data: Omit<any, 'id' | 'rubricId' | 'createdAt'>): Promise<any> => {
    const response = await api.post(`/rubrics/${rubricId}/criteria`, data);
    return response.data;
  },

  updateCriterion: async (id: string, data: Partial<any>): Promise<any> => {
    const response = await api.put(`/rubrics/criteria/${id}`, data);
    return response.data;
  },

  deleteCriterion: async (id: string): Promise<void> => {
    await api.delete(`/rubrics/criteria/${id}`);
  },
};

export default api;
