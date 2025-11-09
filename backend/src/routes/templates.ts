import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../database';
import { TestTemplate } from '../types';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get all templates (optionally filtered by user)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const templates = await dbAll<TestTemplate>(
      'SELECT * FROM test_templates WHERE userId IS NULL OR userId = ? ORDER BY createdAt DESC',
      [userId || '']
    );
    res.json(templates);
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get a single template
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const template = await dbGet<TestTemplate>('SELECT * FROM test_templates WHERE id = ?', [req.params.id]);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error: any) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create a new template
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, description, type, question, documentType, requirements } = req.body;
    const userId = req.user?.userId;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    const template: TestTemplate = {
      id: uuidv4(),
      name,
      description: description || '',
      type,
      question,
      documentType,
      requirements,
      userId,
      createdAt: new Date().toISOString(),
    };

    await dbRun(
      `INSERT INTO test_templates (id, name, description, type, question, documentType, requirements, userId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [template.id, template.name, template.description, template.type, template.question, template.documentType, template.requirements, template.userId, template.createdAt]
    );

    res.status(201).json(template);
  } catch (error: any) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update a template
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, description, type, question, documentType, requirements } = req.body;
    const { id } = req.params;

    const existing = await dbGet<TestTemplate>('SELECT * FROM test_templates WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await dbRun(
      `UPDATE test_templates SET name = ?, description = ?, type = ?, question = ?, documentType = ?, requirements = ?
       WHERE id = ?`,
      [name, description, type, question, documentType, requirements, id]
    );

    const updated = await dbGet<TestTemplate>('SELECT * FROM test_templates WHERE id = ?', [id]);
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete a template
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await dbGet<TestTemplate>('SELECT * FROM test_templates WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await dbRun('DELETE FROM test_templates WHERE id = ?', [id]);
    res.json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;
