import axios, { AxiosInstance } from 'axios';

export interface AIClientConfig {
  apiKey: string;
  baseUrl: string;
  provider: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionResponse {
  content: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class AIClient {
  private client: AxiosInstance;
  private provider: string;

  constructor(config: AIClientConfig) {
    this.provider = config.provider;
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000, // 2 minutes timeout
    });
  }

  async validateConnection(): Promise<{ valid: boolean; message: string }> {
    try {
      // Use provider-specific default models for validation
      let defaultModel = 'gpt-3.5-turbo'; // Generic default
      if (this.provider === 'minimax') {
        defaultModel = 'abab5.5-chat';
      } else if (this.provider === 'zhipu') {
        defaultModel = 'glm-4';
      }

      const response = await this.chatCompletion({
        messages: [{ role: 'user', content: 'Hello' }],
        model: defaultModel,
        maxTokens: 10,
      });

      return {
        valid: true,
        message: 'Connection validated successfully',
      };
    } catch (error: any) {
      return {
        valid: false,
        message: error.response?.data?.message || error.message || 'Connection failed',
      };
    }
  }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    try {
      // Format request based on provider
      const requestBody = this.formatRequest(request);

      const response = await this.client.post('/chat/completions', requestBody);

      return this.parseResponse(response.data);
    } catch (error: any) {
      console.error('AI API Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message || 'AI API request failed');
    }
  }

  private formatRequest(request: ChatCompletionRequest): any {
    // Basic OpenAI-compatible format (works for most providers)
    const body: any = {
      messages: request.messages,
      temperature: request.temperature || 0.7,
    };

    if (request.maxTokens) {
      body.max_tokens = request.maxTokens;
    }

    if (request.model) {
      body.model = request.model;
    }

    // Provider-specific adjustments
    if (this.provider === 'minimax') {
      // Minimax might have specific parameters
      body.model = request.model || 'abab5.5-chat';
    } else if (this.provider === 'zhipu') {
      // Zhipu (ChatGLM) specific parameters
      body.model = request.model || 'glm-4';
    }

    return body;
  }

  private parseResponse(data: any): ChatCompletionResponse {
    // Parse OpenAI-compatible response format
    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error('Invalid response format from AI provider');
    }

    return {
      content: choice.message?.content || choice.text || '',
      model: data.model,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      } : undefined,
    };
  }
}

export const createAIClient = (config: AIClientConfig): AIClient => {
  return new AIClient(config);
};
