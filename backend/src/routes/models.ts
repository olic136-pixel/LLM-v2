import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../database';
import { AIModel, ApiKeyValidationRequest } from '../types';
import { createAIClient } from '../services/aiClient';
import { encryptApiKey, decryptApiKey } from '../services/encryption';

const router = Router();

// Helper to decrypt model API keys
const decryptModelApiKey = (model: AIModel): AIModel => {
  try {
    return {
      ...model,
      apiKey: decryptApiKey(model.apiKey),
    };
  } catch (error) {
    // If decryption fails, assume it's already decrypted (backward compatibility)
    return model;
  }
};

// Get all models
router.get('/', async (req: Request, res: Response) => {
  try {
    const models = await dbAll<AIModel>('SELECT * FROM models ORDER BY createdAt DESC');
    // Decrypt API keys before sending
    const decryptedModels = models.map(decryptModelApiKey);
    res.json(decryptedModels);
  } catch (error: any) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// Get a single model
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const model = await dbGet<AIModel>('SELECT * FROM models WHERE id = ?', [req.params.id]);

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Decrypt API key before sending
    const decryptedModel = decryptModelApiKey(model);
    res.json(decryptedModel);
  } catch (error: any) {
    console.error('Error fetching model:', error);
    res.status(500).json({ error: 'Failed to fetch model' });
  }
});

// Validate API key
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { provider, apiKey, baseUrl, modelName }: ApiKeyValidationRequest = req.body;

    if (!provider || !apiKey || !baseUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const client = createAIClient({ provider, apiKey, baseUrl });
    const validation = await client.validateConnection();

    res.json({
      valid: validation.valid,
      message: validation.message,
      modelInfo: validation.valid ? { name: modelName || provider, provider } : undefined,
    });
  } catch (error: any) {
    console.error('Error validating API key:', error);
    res.json({
      valid: false,
      message: error.message || 'Validation failed',
    });
  }
});

// Add a new model
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, provider, apiKey, baseUrl } = req.body;

    if (!name || !provider || !apiKey || !baseUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate the connection first
    const client = createAIClient({ provider, apiKey, baseUrl });
    const validation = await client.validateConnection();

    if (!validation.valid) {
      return res.status(400).json({ error: `Invalid API credentials: ${validation.message}` });
    }

    // Encrypt API key before storing
    const encryptedApiKey = encryptApiKey(apiKey);

    const model: AIModel = {
      id: uuidv4(),
      name,
      provider,
      apiKey: encryptedApiKey,
      baseUrl,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    await dbRun(
      `INSERT INTO models (id, name, provider, apiKey, baseUrl, isActive, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [model.id, model.name, model.provider, model.apiKey, model.baseUrl, 1, model.createdAt]
    );

    // Return with decrypted key for immediate use
    res.status(201).json({ ...model, apiKey });
  } catch (error: any) {
    console.error('Error adding model:', error);
    res.status(500).json({ error: 'Failed to add model' });
  }
});

// Update a model
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, provider, apiKey, baseUrl, isActive } = req.body;
    const { id } = req.params;

    const existing = await dbGet<AIModel>('SELECT * FROM models WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Decrypt existing API key for comparison
    const decryptedExisting = decryptModelApiKey(existing);

    // If API key or baseUrl changed, validate the new credentials
    if (apiKey !== decryptedExisting.apiKey || baseUrl !== existing.baseUrl) {
      const client = createAIClient({ provider, apiKey, baseUrl });
      const validation = await client.validateConnection();

      if (!validation.valid) {
        return res.status(400).json({ error: `Invalid API credentials: ${validation.message}` });
      }
    }

    // Encrypt API key before saving
    const encryptedApiKey = apiKey !== decryptedExisting.apiKey ? encryptApiKey(apiKey) : existing.apiKey;

    await dbRun(
      `UPDATE models SET name = ?, provider = ?, apiKey = ?, baseUrl = ?, isActive = ?
       WHERE id = ?`,
      [name, provider, encryptedApiKey, baseUrl, isActive ? 1 : 0, id]
    );

    const updated = await dbGet<AIModel>('SELECT * FROM models WHERE id = ?', [id]);
    if (updated) {
      const decryptedUpdated = decryptModelApiKey(updated);
      res.json(decryptedUpdated);
    } else {
      res.status(404).json({ error: 'Model not found after update' });
    }
  } catch (error: any) {
    console.error('Error updating model:', error);
    res.status(500).json({ error: 'Failed to update model' });
  }
});

// Delete a model
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await dbGet<AIModel>('SELECT * FROM models WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({ error: 'Model not found' });
    }

    await dbRun('DELETE FROM models WHERE id = ?', [id]);
    res.json({ message: 'Model deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting model:', error);
    res.status(500).json({ error: 'Failed to delete model' });
  }
});

export default router;
