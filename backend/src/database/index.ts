import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || './data/benchmark.db';

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

// Promisify database methods with proper typing
export const dbRun = (sql: string, params?: any[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params || [], function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
};

export const dbGet = <T = any>(sql: string, params?: any[]): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params || [], (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
};

export const dbAll = <T = any>(sql: string, params?: any[]): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params || [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
};

// Initialize database schema
export const initDatabase = async () => {
  // Users table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      createdAt TEXT NOT NULL
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      modelId TEXT NOT NULL,
      apiKey TEXT NOT NULL,
      baseUrl TEXT NOT NULL,
      isActive INTEGER DEFAULT 1,
      userId TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Migration: Add modelId column to existing tables
  try {
    await dbRun(`ALTER TABLE models ADD COLUMN modelId TEXT`);
  } catch (error: any) {
    // Column already exists or other error - ignore
    if (!error.message.includes('duplicate column name')) {
      console.log('Migration note:', error.message);
    }
  }

  await dbRun(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      content TEXT NOT NULL,
      filePath TEXT NOT NULL,
      userId TEXT,
      uploadedAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Migration: Add category and userId columns to existing documents
  try {
    await dbRun(`ALTER TABLE documents ADD COLUMN category TEXT DEFAULT 'general'`);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.log('Migration note:', error.message);
    }
  }

  try {
    await dbRun(`ALTER TABLE documents ADD COLUMN userId TEXT`);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.log('Migration note:', error.message);
    }
  }

  await dbRun(`
    CREATE TABLE IF NOT EXISTS benchmark_tests (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      modelId TEXT NOT NULL,
      question TEXT NOT NULL,
      context TEXT,
      response TEXT NOT NULL,
      responseTime REAL NOT NULL,
      userGrade INTEGER,
      userFeedback TEXT,
      documentId TEXT,
      documentName TEXT,
      documentType TEXT,
      requirements TEXT,
      userId TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (modelId) REFERENCES models(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Test templates table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS test_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      question TEXT,
      documentType TEXT,
      requirements TEXT,
      userId TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Batch tests table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS batch_tests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      modelIds TEXT NOT NULL,
      templateIds TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      progress REAL DEFAULT 0,
      userId TEXT,
      createdAt TEXT NOT NULL,
      completedAt TEXT,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Scheduled tests table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS scheduled_tests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cronExpression TEXT NOT NULL,
      modelIds TEXT NOT NULL,
      templateIds TEXT NOT NULL,
      isActive INTEGER DEFAULT 1,
      userId TEXT,
      createdAt TEXT NOT NULL,
      lastRun TEXT,
      nextRun TEXT,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Performance snapshots table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS performance_snapshots (
      id TEXT PRIMARY KEY,
      modelId TEXT NOT NULL,
      averageResponseTime REAL NOT NULL,
      averageGrade REAL NOT NULL,
      testCount INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (modelId) REFERENCES models(id)
    )
  `);

  // Exam results table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS exam_results (
      id TEXT PRIMARY KEY,
      examDocumentId TEXT NOT NULL,
      examName TEXT NOT NULL,
      modelId TEXT NOT NULL,
      modelName TEXT NOT NULL,
      answers TEXT NOT NULL,
      responseTime REAL NOT NULL,
      score REAL,
      totalQuestions INTEGER,
      correctAnswers INTEGER,
      assessorGrade REAL,
      assessorFeedback TEXT,
      assessorName TEXT,
      status TEXT DEFAULT 'pending',
      autoGradeScore REAL,
      citationAccuracy REAL,
      hallucinationCount INTEGER DEFAULT 0,
      totalCitations INTEGER DEFAULT 0,
      userId TEXT,
      createdAt TEXT NOT NULL,
      gradedAt TEXT,
      FOREIGN KEY (examDocumentId) REFERENCES documents(id),
      FOREIGN KEY (modelId) REFERENCES models(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Answer keys table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS answer_keys (
      id TEXT PRIMARY KEY,
      examDocumentId TEXT NOT NULL,
      questionNumber INTEGER NOT NULL,
      referenceAnswer TEXT NOT NULL,
      keywords TEXT,
      maxScore REAL DEFAULT 10,
      userId TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (examDocumentId) REFERENCES documents(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Rubrics table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS rubrics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      examDocumentId TEXT,
      userId TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (examDocumentId) REFERENCES documents(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Rubric criteria table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS rubric_criteria (
      id TEXT PRIMARY KEY,
      rubricId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      weight REAL NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (rubricId) REFERENCES rubrics(id)
    )
  `);

  // Citations table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS citations (
      id TEXT PRIMARY KEY,
      examResultId TEXT NOT NULL,
      questionNumber INTEGER NOT NULL,
      citationText TEXT NOT NULL,
      caseName TEXT,
      caseReporter TEXT,
      verified BOOLEAN DEFAULT 0,
      verificationStatus TEXT DEFAULT 'pending',
      verificationDetails TEXT,
      isHallucination BOOLEAN DEFAULT 0,
      createdAt TEXT NOT NULL,
      verifiedAt TEXT,
      FOREIGN KEY (examResultId) REFERENCES exam_results(id)
    )
  `);

  // Migration: Add new columns to existing exam_results
  try {
    await dbRun(`ALTER TABLE exam_results ADD COLUMN autoGradeScore REAL`);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.log('Migration note:', error.message);
    }
  }

  try {
    await dbRun(`ALTER TABLE exam_results ADD COLUMN citationAccuracy REAL`);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.log('Migration note:', error.message);
    }
  }

  try {
    await dbRun(`ALTER TABLE exam_results ADD COLUMN hallucinationCount INTEGER DEFAULT 0`);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.log('Migration note:', error.message);
    }
  }

  try {
    await dbRun(`ALTER TABLE exam_results ADD COLUMN totalCitations INTEGER DEFAULT 0`);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.log('Migration note:', error.message);
    }
  }

  console.log('Database initialized successfully');
};

export default db;
