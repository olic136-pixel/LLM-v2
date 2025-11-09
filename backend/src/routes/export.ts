import { Router, Request, Response } from 'express';
import { dbAll } from '../database';
import { BenchmarkTest, BenchmarkStats, AIModel } from '../types';
import { exportService } from '../services/export';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Export tests to CSV
router.get('/tests/csv', authMiddleware, async (req: Request, res: Response) => {
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

    const tests = await dbAll<BenchmarkTest>(query, params);
    const csv = exportService.exportTestsToCSV(tests);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=benchmark-tests-${Date.now()}.csv`);
    res.send(csv);
  } catch (error: any) {
    console.error('Error exporting tests to CSV:', error);
    res.status(500).json({ error: 'Failed to export tests' });
  }
});

// Export stats to CSV
router.get('/stats/csv', authMiddleware, async (req: Request, res: Response) => {
  try {
    const models = await dbAll<AIModel>('SELECT * FROM models');
    const stats: BenchmarkStats[] = [];

    for (const model of models) {
      const tests = await dbAll<BenchmarkTest>(
        'SELECT * FROM benchmark_tests WHERE modelId = ?',
        [model.id]
      );

      const gradedTests = tests.filter((t) => t.userGrade !== null);

      const testsByType = {
        legal_reasoning: tests.filter((t) => t.type === 'legal_reasoning').length,
        document_analysis: tests.filter((t) => t.type === 'document_analysis').length,
        document_drafting: tests.filter((t) => t.type === 'document_drafting').length,
      };

      const averageResponseTime = tests.length > 0
        ? tests.reduce((sum, t) => sum + t.responseTime, 0) / tests.length
        : 0;

      const averageGrade = gradedTests.length > 0
        ? gradedTests.reduce((sum, t) => sum + (t.userGrade || 0), 0) / gradedTests.length
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

    const csv = exportService.exportStatsToCSV(stats);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=benchmark-stats-${Date.now()}.csv`);
    res.send(csv);
  } catch (error: any) {
    console.error('Error exporting stats to CSV:', error);
    res.status(500).json({ error: 'Failed to export stats' });
  }
});

// Export report to PDF
router.get('/report/pdf', authMiddleware, async (req: Request, res: Response) => {
  try {
    const models = await dbAll<AIModel>('SELECT * FROM models');
    const tests = await dbAll<BenchmarkTest>('SELECT * FROM benchmark_tests ORDER BY createdAt DESC');
    const stats: BenchmarkStats[] = [];

    for (const model of models) {
      const modelTests = tests.filter((t) => t.modelId === model.id);
      const gradedTests = modelTests.filter((t) => t.userGrade !== null);

      const testsByType = {
        legal_reasoning: modelTests.filter((t) => t.type === 'legal_reasoning').length,
        document_analysis: modelTests.filter((t) => t.type === 'document_analysis').length,
        document_drafting: modelTests.filter((t) => t.type === 'document_drafting').length,
      };

      const averageResponseTime = modelTests.length > 0
        ? modelTests.reduce((sum, t) => sum + t.responseTime, 0) / modelTests.length
        : 0;

      const averageGrade = gradedTests.length > 0
        ? gradedTests.reduce((sum, t) => sum + (t.userGrade || 0), 0) / gradedTests.length
        : 0;

      stats.push({
        modelId: model.id,
        modelName: model.name,
        testCount: modelTests.length,
        averageResponseTime,
        averageGrade,
        testsByType,
      });
    }

    const pdfBuffer = await exportService.exportReportToPDF(stats, models, tests);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=benchmark-report-${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error exporting report to PDF:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

export default router;
