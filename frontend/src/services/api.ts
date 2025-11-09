import axios from 'axios';
import { AIModel, BenchmarkTest, Document, BenchmarkStats } from '../types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

  upload: async (file: File): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);

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

export default api;
