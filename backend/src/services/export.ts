import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import { BenchmarkTest, BenchmarkStats, AIModel } from '../types';

export class ExportService {
  // Export benchmark tests to CSV
  exportTestsToCSV(tests: BenchmarkTest[]): string {
    try {
      const fields = [
        { label: 'ID', value: 'id' },
        { label: 'Type', value: 'type' },
        { label: 'Model ID', value: 'modelId' },
        { label: 'Question', value: 'question' },
        { label: 'Response Time (ms)', value: 'responseTime' },
        { label: 'User Grade', value: 'userGrade' },
        { label: 'Feedback', value: 'userFeedback' },
        { label: 'Created At', value: 'createdAt' },
      ];

      const parser = new Parser({ fields });
      return parser.parse(tests);
    } catch (error: any) {
      console.error('CSV export error:', error);
      throw new Error('Failed to export to CSV');
    }
  }

  // Export statistics to CSV
  exportStatsToCSV(stats: BenchmarkStats[]): string {
    try {
      const fields = [
        { label: 'Model ID', value: 'modelId' },
        { label: 'Model Name', value: 'modelName' },
        { label: 'Test Count', value: 'testCount' },
        { label: 'Avg Response Time (ms)', value: 'averageResponseTime' },
        { label: 'Avg Grade', value: 'averageGrade' },
        { label: 'Legal Reasoning Tests', value: 'testsByType.legal_reasoning' },
        { label: 'Document Analysis Tests', value: 'testsByType.document_analysis' },
        { label: 'Document Drafting Tests', value: 'testsByType.document_drafting' },
      ];

      const parser = new Parser({ fields });
      return parser.parse(stats);
    } catch (error: any) {
      console.error('CSV export error:', error);
      throw new Error('Failed to export to CSV');
    }
  }

  // Export report to PDF
  async exportReportToPDF(
    stats: BenchmarkStats[],
    models: AIModel[],
    tests: BenchmarkTest[]
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Title
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .text('Legal AI Benchmark Report', { align: 'center' });

        doc.moveDown();
        doc
          .fontSize(12)
          .font('Helvetica')
          .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });

        doc.moveDown(2);

        // Summary Statistics
        doc.fontSize(18).font('Helvetica-Bold').text('Summary Statistics');
        doc.moveDown();

        doc.fontSize(12).font('Helvetica');
        doc.text(`Total Models: ${models.length}`);
        doc.text(`Total Tests Conducted: ${tests.length}`);
        doc.moveDown();

        // Model Performance
        doc.fontSize(18).font('Helvetica-Bold').text('Model Performance');
        doc.moveDown();

        stats.forEach((stat) => {
          doc.fontSize(14).font('Helvetica-Bold').text(stat.modelName);
          doc.fontSize(11).font('Helvetica');
          doc.text(`  Tests: ${stat.testCount}`);
          doc.text(`  Average Response Time: ${stat.averageResponseTime.toFixed(0)}ms`);
          doc.text(`  Average Grade: ${stat.averageGrade.toFixed(2)}/10`);
          doc.text(`  Legal Reasoning: ${stat.testsByType.legal_reasoning}`);
          doc.text(`  Document Analysis: ${stat.testsByType.document_analysis}`);
          doc.text(`  Document Drafting: ${stat.testsByType.document_drafting}`);
          doc.moveDown();
        });

        // Recent Tests
        doc.addPage();
        doc.fontSize(18).font('Helvetica-Bold').text('Recent Test Results');
        doc.moveDown();

        const recentTests = tests.slice(0, 10); // Last 10 tests

        recentTests.forEach((test, index) => {
          const model = models.find((m) => m.id === test.modelId);

          doc.fontSize(12).font('Helvetica-Bold').text(`Test ${index + 1}`);
          doc.fontSize(10).font('Helvetica');
          doc.text(`  Model: ${model?.name || 'Unknown'}`);
          doc.text(`  Type: ${test.type.replace('_', ' ')}`);
          doc.text(`  Response Time: ${test.responseTime}ms`);
          if (test.userGrade !== null && test.userGrade !== undefined) {
            doc.text(`  Grade: ${test.userGrade}/10`);
          }
          doc.text(`  Date: ${new Date(test.createdAt).toLocaleDateString()}`);
          doc.moveDown(0.5);
        });

        doc.end();
      } catch (error: any) {
        reject(error);
      }
    });
  }
}

export const exportService = new ExportService();
