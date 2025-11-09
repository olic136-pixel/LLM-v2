import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { dbRun, dbGet, dbAll } from '../database';
import { pdfProcessor } from '../services/pdfProcessor';
import { Document } from '../types';

const router = Router();

// Configure multer for file uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Get all documents
router.get('/', async (req: Request, res: Response) => {
  try {
    const documents = await dbAll('SELECT * FROM documents ORDER BY uploadedAt DESC');
    res.json(documents);
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get a single document
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const document = await dbGet('SELECT * FROM documents WHERE id = ?', [req.params.id]);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error: any) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Upload a new document
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Extract text from PDF
    const pdfResult = await pdfProcessor.extractText(req.file.path);

    const document: Document = {
      id: uuidv4(),
      name: req.file.originalname,
      type: 'application/pdf',
      content: pdfResult.text,
      filePath: req.file.path,
      uploadedAt: new Date().toISOString(),
    };

    await dbRun(
      `INSERT INTO documents (id, name, type, content, filePath, uploadedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [document.id, document.name, document.type, document.content, document.filePath, document.uploadedAt]
    );

    res.status(201).json(document);
  } catch (error: any) {
    console.error('Error uploading document:', error);

    // Clean up file if database insert fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Delete a document
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const document = await dbGet('SELECT * FROM documents WHERE id = ?', [id]);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file from filesystem
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    await dbRun('DELETE FROM documents WHERE id = ?', [id]);
    res.json({ message: 'Document deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
