import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../database';
import { BenchmarkRequest, BenchmarkResponse, BenchmarkTest, BenchmarkStats } from '../types';
import { createAIClient } from '../services/aiClient';

const router = Router();

// Get all benchmark tests
router.get('/', async (req: Request, res: Response) => {
  try {
    const { modelId, type } = req.query;

    let query = 'SELECT * FROM benchmark_tests';
    const params: any[] = [];

    if (modelId || type) {
      query += ' WHERE';
      const conditions = [];

      if (modelId) {
        conditions.push(' modelId = ?');
        params.push(modelId);
      }

      if (type) {
        conditions.push(' type = ?');
        params.push(type);
      }

      query += conditions.join(' AND');
    }

    query += ' ORDER BY createdAt DESC';

    const tests = await dbAll(query, params);
    res.json(tests);
  } catch (error: any) {
    console.error('Error fetching benchmark tests:', error);
    res.status(500).json({ error: 'Failed to fetch benchmark tests' });
  }
});

// Get a single benchmark test
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const test = await dbGet('SELECT * FROM benchmark_tests WHERE id = ?', [req.params.id]);

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.json(test);
  } catch (error: any) {
    console.error('Error fetching test:', error);
    res.status(500).json({ error: 'Failed to fetch test' });
  }
});

// Run a benchmark test
router.post('/run', async (req: Request, res: Response) => {
  try {
    const request: BenchmarkRequest = req.body;

    if (!request.modelId || !request.type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get model details
    const model = await dbGet('SELECT * FROM models WHERE id = ?', [request.modelId]);

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Create AI client
    const client = createAIClient({
      provider: model.provider,
      apiKey: model.apiKey,
      baseUrl: model.baseUrl,
    });

    let question = '';
    let context = '';
    let documentId: string | undefined;
    let documentName: string | undefined;
    let documentType: string | undefined;
    let requirements: string | undefined;

    // Prepare the prompt based on test type
    if (request.type === 'legal_reasoning') {
      if (!request.question) {
        return res.status(400).json({ error: 'Question is required for legal reasoning tests' });
      }

      question = request.question;

      // If document provided, get its content for context
      if (request.documentId) {
        const doc = await dbGet('SELECT * FROM documents WHERE id = ?', [request.documentId]);

        if (doc) {
          context = doc.content;
          documentId = doc.id;
          documentName = doc.name;
        }
      }
    } else if (request.type === 'document_analysis') {
      if (!request.documentId) {
        return res.status(400).json({ error: 'Document is required for document analysis tests' });
      }

      const doc = await dbGet('SELECT * FROM documents WHERE id = ?', [request.documentId]);

      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      context = doc.content;
      documentId = doc.id;
      documentName = doc.name;
      question = 'Please analyze this legal document and provide a comprehensive summary including key points, obligations, rights, and any potential legal issues or concerns.';
    } else if (request.type === 'document_drafting') {
      if (!request.documentType || !request.requirements) {
        return res.status(400).json({ error: 'Document type and requirements are required for drafting tests' });
      }

      documentType = request.documentType;
      requirements = request.requirements;
      question = `Please draft a ${documentType} with the following requirements: ${requirements}`;
    }

    // Prepare messages
    const messages: any[] = [];

    if (context) {
      messages.push({
        role: 'system',
        content: `You are a legal AI assistant. Here is the relevant legal document for context:\n\n${context}`,
      });
    }

    messages.push({
      role: 'user',
      content: question,
    });

    // Measure response time
    const startTime = Date.now();

    const response = await client.chatCompletion({
      messages,
      temperature: 0.7,
      maxTokens: 4000,
    });

    const responseTime = Date.now() - startTime;

    // Save test to database
    const test: BenchmarkTest = {
      id: uuidv4(),
      type: request.type,
      modelId: request.modelId,
      question,
      context: context || undefined,
      response: response.content,
      responseTime,
      createdAt: new Date().toISOString(),
    };

    await dbRun(
      `INSERT INTO benchmark_tests (id, type, modelId, question, context, response, responseTime, documentId, documentName, documentType, requirements, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        test.id,
        test.type,
        test.modelId,
        test.question,
        test.context,
        test.response,
        test.responseTime,
        documentId,
        documentName,
        documentType,
        requirements,
        test.createdAt,
      ]
    );

    const benchmarkResponse: BenchmarkResponse = {
      testId: test.id,
      modelId: test.modelId,
      response: test.response,
      responseTime: test.responseTime,
    };

    res.json(benchmarkResponse);
  } catch (error: any) {
    console.error('Error running benchmark:', error);
    res.status(500).json({ error: error.message || 'Failed to run benchmark' });
  }
});

// Grade a benchmark test
router.post('/:id/grade', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { grade, feedback } = req.body;

    if (typeof grade !== 'number' || grade < 0 || grade > 10) {
      return res.status(400).json({ error: 'Grade must be a number between 0 and 10' });
    }

    const test = await dbGet('SELECT * FROM benchmark_tests WHERE id = ?', [id]);

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    await dbRun(
      'UPDATE benchmark_tests SET userGrade = ?, userFeedback = ? WHERE id = ?',
      [grade, feedback || null, id]
    );

    const updated = await dbGet('SELECT * FROM benchmark_tests WHERE id = ?', [id]);
    res.json(updated);
  } catch (error: any) {
    console.error('Error grading test:', error);
    res.status(500).json({ error: 'Failed to grade test' });
  }
});

// Get benchmark statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const models = await dbAll('SELECT * FROM models');
    const stats: BenchmarkStats[] = [];

    for (const model of models) {
      const tests = await dbAll(
        'SELECT * FROM benchmark_tests WHERE modelId = ?',
        [model.id]
      );

      const gradedTests = tests.filter((t: any) => t.userGrade !== null);

      const testsByType = {
        legal_reasoning: tests.filter((t: any) => t.type === 'legal_reasoning').length,
        document_analysis: tests.filter((t: any) => t.type === 'document_analysis').length,
        document_drafting: tests.filter((t: any) => t.type === 'document_drafting').length,
      };

      const averageResponseTime = tests.length > 0
        ? tests.reduce((sum: number, t: any) => sum + t.responseTime, 0) / tests.length
        : 0;

      const averageGrade = gradedTests.length > 0
        ? gradedTests.reduce((sum: number, t: any) => sum + t.userGrade, 0) / gradedTests.length
        : 0;

      stats.push({
        modelId: model.id,
        modelName: model.name,
        testCount: tests.length,
        averageResponseTime,
        averageGrade,
        testsByType,
      });
    }

    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Delete a benchmark test
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const test = await dbGet('SELECT * FROM benchmark_tests WHERE id = ?', [id]);

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    await dbRun('DELETE FROM benchmark_tests WHERE id = ?', [id]);
    res.json({ message: 'Test deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting test:', error);
    res.status(500).json({ error: 'Failed to delete test' });
  }
});

export default router;
