import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../database';
import { authMiddleware } from '../middleware/auth';
import { Rubric, RubricCriterion } from '../services/autoGrader';

const router = Router();

// Apply auth middleware
router.use(authMiddleware);

// ============= Rubrics Routes =============

/**
 * Get all rubrics
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { examDocumentId } = req.query;

    let rubrics: Rubric[];

    if (examDocumentId) {
      rubrics = await dbAll<Rubric>(
        'SELECT * FROM rubrics WHERE examDocumentId = ? ORDER BY createdAt DESC',
        [examDocumentId]
      );
    } else {
      rubrics = await dbAll<Rubric>('SELECT * FROM rubrics ORDER BY createdAt DESC');
    }

    // Fetch criteria for each rubric
    for (const rubric of rubrics) {
      const criteria = await dbAll<RubricCriterion>(
        'SELECT * FROM rubric_criteria WHERE rubricId = ? ORDER BY weight DESC',
        [rubric.id]
      );
      (rubric as any).criteria = criteria;
    }

    res.json(rubrics);
  } catch (error: any) {
    console.error('Error fetching rubrics:', error);
    res.status(500).json({ error: 'Failed to fetch rubrics' });
  }
});

/**
 * Get a single rubric with its criteria
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rubric = await dbGet<Rubric>('SELECT * FROM rubrics WHERE id = ?', [id]);

    if (!rubric) {
      return res.status(404).json({ error: 'Rubric not found' });
    }

    // Fetch criteria
    const criteria = await dbAll<RubricCriterion>(
      'SELECT * FROM rubric_criteria WHERE rubricId = ? ORDER BY weight DESC',
      [id]
    );

    (rubric as any).criteria = criteria;

    res.json(rubric);
  } catch (error: any) {
    console.error('Error fetching rubric:', error);
    res.status(500).json({ error: 'Failed to fetch rubric' });
  }
});

/**
 * Create a new rubric
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, examDocumentId, criteria } = req.body;
    const userId = (req as any).user?.userId;

    if (!name) {
      return res.status(400).json({ error: 'Rubric name is required' });
    }

    // Validate criteria weights sum to 1.0
    if (criteria && Array.isArray(criteria)) {
      const totalWeight = criteria.reduce((sum: number, c: any) => sum + (c.weight || 0), 0);
      if (Math.abs(totalWeight - 1.0) > 0.01) {
        return res.status(400).json({
          error: 'Criteria weights must sum to 1.0',
          totalWeight,
        });
      }
    }

    const rubric: Rubric = {
      id: uuidv4(),
      name,
      description,
      examDocumentId: examDocumentId || null,
      userId,
      createdAt: new Date().toISOString(),
      criteria: [],
    };

    await dbRun(
      `INSERT INTO rubrics (id, name, description, examDocumentId, userId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [rubric.id, rubric.name, rubric.description, rubric.examDocumentId, rubric.userId, rubric.createdAt]
    );

    // Create criteria if provided
    if (criteria && Array.isArray(criteria)) {
      for (const criterion of criteria) {
        const rubricCriterion: RubricCriterion = {
          id: uuidv4(),
          rubricId: rubric.id,
          name: criterion.name,
          description: criterion.description,
          weight: criterion.weight,
          createdAt: new Date().toISOString(),
        };

        await dbRun(
          `INSERT INTO rubric_criteria (id, rubricId, name, description, weight, createdAt)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            rubricCriterion.id,
            rubricCriterion.rubricId,
            rubricCriterion.name,
            rubricCriterion.description,
            rubricCriterion.weight,
            rubricCriterion.createdAt,
          ]
        );

        rubric.criteria.push(rubricCriterion);
      }
    }

    res.status(201).json(rubric);
  } catch (error: any) {
    console.error('Error creating rubric:', error);
    res.status(500).json({ error: 'Failed to create rubric' });
  }
});

/**
 * Update a rubric
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const existing = await dbGet<Rubric>('SELECT * FROM rubrics WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({ error: 'Rubric not found' });
    }

    await dbRun(
      `UPDATE rubrics
       SET name = ?, description = ?
       WHERE id = ?`,
      [name || existing.name, description !== undefined ? description : existing.description, id]
    );

    const updated = await dbGet<Rubric>('SELECT * FROM rubrics WHERE id = ?', [id]);

    // Fetch criteria
    const criteria = await dbAll<RubricCriterion>(
      'SELECT * FROM rubric_criteria WHERE rubricId = ? ORDER BY weight DESC',
      [id]
    );

    (updated as any).criteria = criteria;

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating rubric:', error);
    res.status(500).json({ error: 'Failed to update rubric' });
  }
});

/**
 * Delete a rubric (and its criteria)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await dbGet<Rubric>('SELECT * FROM rubrics WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({ error: 'Rubric not found' });
    }

    // Delete criteria first
    await dbRun('DELETE FROM rubric_criteria WHERE rubricId = ?', [id]);

    // Delete rubric
    await dbRun('DELETE FROM rubrics WHERE id = ?', [id]);

    res.json({ message: 'Rubric deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting rubric:', error);
    res.status(500).json({ error: 'Failed to delete rubric' });
  }
});

// ============= Rubric Criteria Routes =============

/**
 * Add a criterion to a rubric
 */
router.post('/:rubricId/criteria', async (req: Request, res: Response) => {
  try {
    const { rubricId } = req.params;
    const { name, description, weight } = req.body;

    if (!name || weight === undefined) {
      return res.status(400).json({ error: 'Criterion name and weight are required' });
    }

    const rubric = await dbGet<Rubric>('SELECT * FROM rubrics WHERE id = ?', [rubricId]);

    if (!rubric) {
      return res.status(404).json({ error: 'Rubric not found' });
    }

    // Check total weight after adding
    const existingCriteria = await dbAll<RubricCriterion>(
      'SELECT * FROM rubric_criteria WHERE rubricId = ?',
      [rubricId]
    );

    const currentTotalWeight = existingCriteria.reduce((sum, c) => sum + c.weight, 0);
    const newTotalWeight = currentTotalWeight + weight;

    if (newTotalWeight > 1.01) {
      // Allow small rounding errors
      return res.status(400).json({
        error: 'Adding this criterion would exceed total weight of 1.0',
        currentWeight: currentTotalWeight,
        attemptedWeight: weight,
      });
    }

    const criterion: RubricCriterion = {
      id: uuidv4(),
      rubricId,
      name,
      description,
      weight,
      createdAt: new Date().toISOString(),
    };

    await dbRun(
      `INSERT INTO rubric_criteria (id, rubricId, name, description, weight, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [criterion.id, criterion.rubricId, criterion.name, criterion.description, criterion.weight, criterion.createdAt]
    );

    res.status(201).json(criterion);
  } catch (error: any) {
    console.error('Error adding criterion:', error);
    res.status(500).json({ error: 'Failed to add criterion' });
  }
});

/**
 * Update a criterion
 */
router.put('/criteria/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, weight } = req.body;

    const existing = await dbGet<RubricCriterion>('SELECT * FROM rubric_criteria WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({ error: 'Criterion not found' });
    }

    // If weight is being changed, check total
    if (weight !== undefined && weight !== existing.weight) {
      const allCriteria = await dbAll<RubricCriterion>(
        'SELECT * FROM rubric_criteria WHERE rubricId = ? AND id != ?',
        [existing.rubricId, id]
      );

      const otherWeights = allCriteria.reduce((sum, c) => sum + c.weight, 0);
      const newTotalWeight = otherWeights + weight;

      if (newTotalWeight > 1.01) {
        return res.status(400).json({
          error: 'Updated weight would exceed total weight of 1.0',
          newTotalWeight,
        });
      }
    }

    await dbRun(
      `UPDATE rubric_criteria
       SET name = ?, description = ?, weight = ?
       WHERE id = ?`,
      [
        name || existing.name,
        description !== undefined ? description : existing.description,
        weight !== undefined ? weight : existing.weight,
        id,
      ]
    );

    const updated = await dbGet<RubricCriterion>('SELECT * FROM rubric_criteria WHERE id = ?', [id]);

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating criterion:', error);
    res.status(500).json({ error: 'Failed to update criterion' });
  }
});

/**
 * Delete a criterion
 */
router.delete('/criteria/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await dbGet<RubricCriterion>('SELECT * FROM rubric_criteria WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({ error: 'Criterion not found' });
    }

    await dbRun('DELETE FROM rubric_criteria WHERE id = ?', [id]);

    res.json({ message: 'Criterion deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting criterion:', error);
    res.status(500).json({ error: 'Failed to delete criterion' });
  }
});

export default router;
