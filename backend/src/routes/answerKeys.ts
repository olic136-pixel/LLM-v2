import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../database';
import { authMiddleware } from '../middleware/auth';
import { AnswerKey, Rubric, RubricCriterion } from '../services/autoGrader';

const router = Router();

// Apply auth middleware
router.use(authMiddleware);

// ============= Answer Keys Routes =============

/**
 * Get all answer keys for an exam
 */
router.get('/exam/:examDocumentId', async (req: Request, res: Response) => {
  try {
    const { examDocumentId } = req.params;

    const answerKeys = await dbAll<AnswerKey>(
      'SELECT * FROM answer_keys WHERE examDocumentId = ? ORDER BY questionNumber',
      [examDocumentId]
    );

    res.json(answerKeys);
  } catch (error: any) {
    console.error('Error fetching answer keys:', error);
    res.status(500).json({ error: 'Failed to fetch answer keys' });
  }
});

/**
 * Get a single answer key
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const answerKey = await dbGet<AnswerKey>('SELECT * FROM answer_keys WHERE id = ?', [id]);

    if (!answerKey) {
      return res.status(404).json({ error: 'Answer key not found' });
    }

    res.json(answerKey);
  } catch (error: any) {
    console.error('Error fetching answer key:', error);
    res.status(500).json({ error: 'Failed to fetch answer key' });
  }
});

/**
 * Create a new answer key
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { examDocumentId, questionNumber, referenceAnswer, keywords, maxScore } = req.body;
    const userId = (req as any).user?.userId;

    if (!examDocumentId || questionNumber === undefined || !referenceAnswer) {
      return res.status(400).json({
        error: 'Missing required fields: examDocumentId, questionNumber, referenceAnswer',
      });
    }

    // Check if answer key already exists for this question
    const existing = await dbGet<AnswerKey>(
      'SELECT * FROM answer_keys WHERE examDocumentId = ? AND questionNumber = ?',
      [examDocumentId, questionNumber]
    );

    if (existing) {
      return res.status(400).json({
        error: `Answer key already exists for question ${questionNumber}`,
      });
    }

    const answerKey: AnswerKey = {
      id: uuidv4(),
      examDocumentId,
      questionNumber,
      referenceAnswer,
      keywords: JSON.stringify(keywords || []),
      maxScore: maxScore || 10,
      userId,
      createdAt: new Date().toISOString(),
    };

    await dbRun(
      `INSERT INTO answer_keys (id, examDocumentId, questionNumber, referenceAnswer, keywords, maxScore, userId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        answerKey.id,
        answerKey.examDocumentId,
        answerKey.questionNumber,
        answerKey.referenceAnswer,
        answerKey.keywords,
        answerKey.maxScore,
        answerKey.userId,
        answerKey.createdAt,
      ]
    );

    res.status(201).json(answerKey);
  } catch (error: any) {
    console.error('Error creating answer key:', error);
    res.status(500).json({ error: 'Failed to create answer key' });
  }
});

/**
 * Update an answer key
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { referenceAnswer, keywords, maxScore } = req.body;

    const existing = await dbGet<AnswerKey>('SELECT * FROM answer_keys WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({ error: 'Answer key not found' });
    }

    await dbRun(
      `UPDATE answer_keys
       SET referenceAnswer = ?, keywords = ?, maxScore = ?
       WHERE id = ?`,
      [
        referenceAnswer || existing.referenceAnswer,
        keywords ? JSON.stringify(keywords) : existing.keywords,
        maxScore !== undefined ? maxScore : existing.maxScore,
        id,
      ]
    );

    const updated = await dbGet<AnswerKey>('SELECT * FROM answer_keys WHERE id = ?', [id]);
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating answer key:', error);
    res.status(500).json({ error: 'Failed to update answer key' });
  }
});

/**
 * Delete an answer key
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await dbGet<AnswerKey>('SELECT * FROM answer_keys WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({ error: 'Answer key not found' });
    }

    await dbRun('DELETE FROM answer_keys WHERE id = ?', [id]);

    res.json({ message: 'Answer key deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting answer key:', error);
    res.status(500).json({ error: 'Failed to delete answer key' });
  }
});

/**
 * Bulk create answer keys for an exam
 */
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { examDocumentId, answerKeys } = req.body;
    const userId = (req as any).user?.userId;

    if (!examDocumentId || !Array.isArray(answerKeys)) {
      return res.status(400).json({
        error: 'Missing required fields: examDocumentId and answerKeys array',
      });
    }

    const created: AnswerKey[] = [];

    for (const key of answerKeys) {
      const { questionNumber, referenceAnswer, keywords, maxScore } = key;

      if (questionNumber === undefined || !referenceAnswer) {
        continue; // Skip invalid entries
      }

      // Check if already exists
      const existing = await dbGet<AnswerKey>(
        'SELECT * FROM answer_keys WHERE examDocumentId = ? AND questionNumber = ?',
        [examDocumentId, questionNumber]
      );

      if (existing) {
        continue; // Skip if already exists
      }

      const answerKey: AnswerKey = {
        id: uuidv4(),
        examDocumentId,
        questionNumber,
        referenceAnswer,
        keywords: JSON.stringify(keywords || []),
        maxScore: maxScore || 10,
        userId,
        createdAt: new Date().toISOString(),
      };

      await dbRun(
        `INSERT INTO answer_keys (id, examDocumentId, questionNumber, referenceAnswer, keywords, maxScore, userId, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          answerKey.id,
          answerKey.examDocumentId,
          answerKey.questionNumber,
          answerKey.referenceAnswer,
          answerKey.keywords,
          answerKey.maxScore,
          answerKey.userId,
          answerKey.createdAt,
        ]
      );

      created.push(answerKey);
    }

    res.status(201).json({ created: created.length, answerKeys: created });
  } catch (error: any) {
    console.error('Error bulk creating answer keys:', error);
    res.status(500).json({ error: 'Failed to bulk create answer keys' });
  }
});

export default router;
