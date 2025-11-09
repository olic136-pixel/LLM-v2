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
  await dbRun(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      apiKey TEXT NOT NULL,
      baseUrl TEXT NOT NULL,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT NOT NULL
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      filePath TEXT NOT NULL,
      uploadedAt TEXT NOT NULL
    )
  `);

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
      createdAt TEXT NOT NULL,
      FOREIGN KEY (modelId) REFERENCES models(id)
    )
  `);

  console.log('Database initialized successfully');
};

export default db;
