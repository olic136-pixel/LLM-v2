import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../database';
import {
  ExamResult,
  ExamAnswer,
  TakeExamRequest,
  TakeExamResponse,
  GradeExamRequest,
  Document,
  AIModel
} from '../types';
import { createAIClient } from '../services/aiClient';
import { decryptApiKey } from '../services/encryption';
import { authMiddleware } from '../middleware/auth';
import citationExtractor from '../services/citationExtractor';
import citationVerifier from '../services/citationVerifier';
import autoGrader from '../services/autoGrader';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Helper to decrypt model API keys
const decryptModelApiKey = (model: AIModel): AIModel => {
  try {
    return {
      ...model,
      apiKey: decryptApiKey(model.apiKey),
    };
  } catch (error) {
    return model;
  }
};

// Get all exam results
router.get('/results', async (req: Request, res: Response) => {
  try {
    const results = await dbAll<ExamResult>(
      'SELECT * FROM exam_results ORDER BY createdAt DESC'
    );

    // Parse answers JSON for each result
    const parsedResults = results.map(result => ({
      ...result,
      answers: JSON.parse(result.answers),
    }));

    res.json(parsedResults);
  } catch (error: any) {
    console.error('Error fetching exam results:', error);
    res.status(500).json({ error: 'Failed to fetch exam results' });
  }
});

// Get a single exam result
router.get('/results/:id', async (req: Request, res: Response) => {
  try {
    const result = await dbGet<ExamResult>(
      'SELECT * FROM exam_results WHERE id = ?',
      [req.params.id]
    );

    if (!result) {
      return res.status(404).json({ error: 'Exam result not found' });
    }

    // Parse answers JSON
    const parsedResult = {
      ...result,
      answers: JSON.parse(result.answers),
    };

    res.json(parsedResult);
  } catch (error: any) {
    console.error('Error fetching exam result:', error);
    res.status(500).json({ error: 'Failed to fetch exam result' });
  }
});

// Take an exam
router.post('/take', async (req: Request, res: Response) => {
  try {
    const { examDocumentId, modelId }: TakeExamRequest = req.body;
    const userId = (req as any).user?.userId;

    if (!examDocumentId || !modelId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get exam document
    const examDoc = await dbGet<Document>(
      'SELECT * FROM documents WHERE id = ?',
      [examDocumentId]
    );

    if (!examDoc) {
      return res.status(404).json({ error: 'Exam document not found' });
    }

    if (!['exam', 'bar_exam', 'law_exam'].includes(examDoc.category)) {
      return res.status(400).json({ error: 'Document is not an exam' });
    }

    // Get model
    const model = await dbGet<AIModel>(
      'SELECT * FROM models WHERE id = ?',
      [modelId]
    );

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Decrypt API key
    const decryptedModel = decryptModelApiKey(model);

    // Create AI client
    const client = createAIClient({
      provider: decryptedModel.provider,
      apiKey: decryptedModel.apiKey,
      baseUrl: decryptedModel.baseUrl,
    });

    // Extract questions from exam content
    // Simple parsing: assumes questions are numbered or separated
    const questions = extractQuestionsFromExam(examDoc.content);

    if (questions.length === 0) {
      return res.status(400).json({
        error: 'No questions found in exam document. Please ensure questions are properly formatted.'
      });
    }

    const answers: ExamAnswer[] = [];
    const startTime = Date.now();

    // Process each question
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const questionStartTime = Date.now();

      try {
        const response = await client.chatCompletion({
          messages: [
            {
              role: 'system',
              content: `You are taking a ${examDoc.category.replace('_', ' ')}. Provide clear, concise, and accurate answers. Answer only the question asked without additional commentary.`,
            },
            {
              role: 'user',
              content: question,
            },
          ],
          model: decryptedModel.modelId,
          temperature: 0.3, // Lower temperature for exam consistency
          maxTokens: 2000,
        });

        const questionEndTime = Date.now();

        answers.push({
          questionNumber: i + 1,
          question,
          answer: response.content,
          timeSpent: questionEndTime - questionStartTime,
        });
      } catch (error: any) {
        console.error(`Error answering question ${i + 1}:`, error);
        answers.push({
          questionNumber: i + 1,
          question,
          answer: `[Error: Failed to generate answer - ${error.message}]`,
          timeSpent: Date.now() - questionStartTime,
        });
      }
    }

    const totalTime = Date.now() - startTime;

    // Extract citations from all answers
    console.log('Extracting citations from exam answers...');
    const citationsByQuestion = citationExtractor.extractFromExamAnswers(
      answers.map(a => ({ questionNumber: a.questionNumber, answer: a.answer }))
    );

    // Flatten citations for verification
    const allCitations = Array.from(citationsByQuestion.values()).flat();
    let totalCitations = allCitations.length;
    let hallucinationCount = 0;
    let citationAccuracy = 0;

    // Verify citations if any were found
    if (totalCitations > 0) {
      console.log(`Verifying ${totalCitations} citations...`);
      const verificationResults = await citationVerifier.verifyBatch(allCitations);

      // Calculate metrics
      const metrics = citationVerifier.calculateAccuracyMetrics(verificationResults);
      totalCitations = metrics.totalCitations;
      hallucinationCount = metrics.hallucinatedCitations;
      citationAccuracy = metrics.citationAccuracy;

      console.log(`Citation accuracy: ${citationAccuracy.toFixed(2)}%, Hallucinations: ${hallucinationCount}`);
    }

    // Try auto-grading if answer keys exist
    let autoGradeScore: number | undefined;
    let autoGradeFeedback: string | undefined;

    try {
      const hasAnswerKeys = await dbGet(
        'SELECT COUNT(*) as count FROM answer_keys WHERE examDocumentId = ?',
        [examDocumentId]
      );

      if (hasAnswerKeys && (hasAnswerKeys as any).count > 0) {
        console.log('Auto-grading exam with answer keys...');
        const gradeReport = await autoGrader.gradeExam(
          examDocumentId,
          answers.map(a => ({ questionNumber: a.questionNumber, answer: a.answer }))
        );

        autoGradeScore = gradeReport.percentage;
        autoGradeFeedback = gradeReport.overallFeedback;

        console.log(`Auto-grade score: ${autoGradeScore.toFixed(2)}%`);
      }
    } catch (error: any) {
      console.log('Auto-grading skipped:', error.message);
    }

    // Save exam result with all metrics
    const resultId = uuidv4();
    const examResult: ExamResult = {
      id: resultId,
      examDocumentId,
      examName: examDoc.name,
      modelId,
      modelName: model.name,
      answers: JSON.stringify(answers),
      responseTime: totalTime,
      totalQuestions: questions.length,
      status: autoGradeScore !== undefined ? 'graded' : 'pending',
      userId,
      createdAt: new Date().toISOString(),
    };

    await dbRun(
      `INSERT INTO exam_results (
        id, examDocumentId, examName, modelId, modelName,
        answers, responseTime, totalQuestions, status, userId, createdAt,
        autoGradeScore, citationAccuracy, hallucinationCount, totalCitations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        examResult.id,
        examResult.examDocumentId,
        examResult.examName,
        examResult.modelId,
        examResult.modelName,
        examResult.answers,
        examResult.responseTime,
        examResult.totalQuestions,
        examResult.status,
        examResult.userId,
        examResult.createdAt,
        autoGradeScore || null,
        citationAccuracy || null,
        hallucinationCount,
        totalCitations,
      ]
    );

    // Save individual citations to database
    if (allCitations.length > 0) {
      console.log('Saving citations to database...');
      const verificationResults = await citationVerifier.verifyBatch(allCitations);

      for (let i = 0; i < allCitations.length; i++) {
        const citation = allCitations[i];
        const verification = verificationResults[i];

        // Find which question this citation came from
        let questionNumber = 1;
        for (const [qNum, citations] of citationsByQuestion.entries()) {
          if (citations.find(c => c.id === citation.id)) {
            questionNumber = qNum;
            break;
          }
        }

        await dbRun(
          `INSERT INTO citations (
            id, examResultId, questionNumber, citationText, caseName, caseReporter,
            verified, verificationStatus, verificationDetails, isHallucination, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            citation.id,
            resultId,
            questionNumber,
            citation.citationText,
            citation.caseName || null,
            citation.caseReporter || null,
            verification.verified ? 1 : 0,
            verification.verificationStatus,
            verification.verificationDetails || null,
            verification.isHallucination ? 1 : 0,
            new Date().toISOString(),
          ]
        );
      }
    }

    const response: TakeExamResponse = {
      resultId,
      examName: examDoc.name,
      modelName: model.name,
      answers,
      totalTime,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error taking exam:', error);
    res.status(500).json({ error: error.message || 'Failed to take exam' });
  }
});

// Grade an exam result (for assessor)
router.post('/grade', async (req: Request, res: Response) => {
  try {
    const {
      resultId,
      assessorGrade,
      assessorFeedback,
      assessorName,
      correctAnswers
    }: GradeExamRequest = req.body;

    if (!resultId || assessorGrade === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await dbGet<ExamResult>(
      'SELECT * FROM exam_results WHERE id = ?',
      [resultId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Exam result not found' });
    }

    // Calculate score if correctAnswers provided
    let score: number | undefined;
    if (correctAnswers !== undefined && existing.totalQuestions) {
      score = (correctAnswers / existing.totalQuestions) * 100;
    }

    await dbRun(
      `UPDATE exam_results
       SET assessorGrade = ?, assessorFeedback = ?, assessorName = ?,
           correctAnswers = ?, score = ?, status = 'graded', gradedAt = ?
       WHERE id = ?`,
      [
        assessorGrade,
        assessorFeedback || null,
        assessorName || null,
        correctAnswers || null,
        score || null,
        new Date().toISOString(),
        resultId,
      ]
    );

    const updated = await dbGet<ExamResult>(
      'SELECT * FROM exam_results WHERE id = ?',
      [resultId]
    );

    res.json({
      ...updated,
      answers: JSON.parse(updated!.answers),
    });
  } catch (error: any) {
    console.error('Error grading exam:', error);
    res.status(500).json({ error: 'Failed to grade exam' });
  }
});

// Get citations for an exam result
router.get('/results/:id/citations', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if exam result exists
    const result = await dbGet<ExamResult>(
      'SELECT * FROM exam_results WHERE id = ?',
      [id]
    );

    if (!result) {
      return res.status(404).json({ error: 'Exam result not found' });
    }

    // Get all citations for this result
    const citations = await dbAll(
      'SELECT * FROM citations WHERE examResultId = ? ORDER BY questionNumber, createdAt',
      [id]
    );

    res.json(citations);
  } catch (error: any) {
    console.error('Error fetching citations:', error);
    res.status(500).json({ error: 'Failed to fetch citations' });
  }
});

// Auto-grade an exam with answer keys (can be done after exam is taken)
router.post('/results/:id/auto-grade', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await dbGet<ExamResult>(
      'SELECT * FROM exam_results WHERE id = ?',
      [id]
    );

    if (!result) {
      return res.status(404).json({ error: 'Exam result not found' });
    }

    const answers = JSON.parse(result.answers);

    // Perform auto-grading
    const gradeReport = await autoGrader.gradeExam(
      result.examDocumentId,
      answers.map((a: ExamAnswer) => ({ questionNumber: a.questionNumber, answer: a.answer }))
    );

    // Update exam result
    await dbRun(
      `UPDATE exam_results
       SET autoGradeScore = ?, status = 'graded'
       WHERE id = ?`,
      [gradeReport.percentage, id]
    );

    res.json({
      autoGradeScore: gradeReport.percentage,
      gradeReport,
    });
  } catch (error: any) {
    console.error('Error auto-grading exam:', error);
    res.status(500).json({ error: error.message || 'Failed to auto-grade exam' });
  }
});

// Export exam result for assessor (JSON format)
router.get('/export/:id', async (req: Request, res: Response) => {
  try {
    const result = await dbGet<ExamResult>(
      'SELECT * FROM exam_results WHERE id = ?',
      [req.params.id]
    );

    if (!result) {
      return res.status(404).json({ error: 'Exam result not found' });
    }

    // Get exam document for context
    const examDoc = await dbGet<Document>(
      'SELECT * FROM documents WHERE id = ?',
      [result.examDocumentId]
    );

    const exportData = {
      examResult: {
        ...result,
        answers: JSON.parse(result.answers),
      },
      examDocument: examDoc ? {
        name: examDoc.name,
        category: examDoc.category,
        uploadedAt: examDoc.uploadedAt,
      } : null,
      exportedAt: new Date().toISOString(),
      instructions: 'This exam was taken by an AI model. Please grade each answer and provide feedback.',
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="exam-result-${result.id}.json"`
    );

    res.json(exportData);
  } catch (error: any) {
    console.error('Error exporting exam result:', error);
    res.status(500).json({ error: 'Failed to export exam result' });
  }
});

// Delete an exam result
router.delete('/results/:id', async (req: Request, res: Response) => {
  try {
    const existing = await dbGet<ExamResult>(
      'SELECT * FROM exam_results WHERE id = ?',
      [req.params.id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Exam result not found' });
    }

    await dbRun('DELETE FROM exam_results WHERE id = ?', [req.params.id]);
    res.json({ message: 'Exam result deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting exam result:', error);
    res.status(500).json({ error: 'Failed to delete exam result' });
  }
});

// Helper function to extract questions from exam content
function extractQuestionsFromExam(content: string): string[] {
  const questions: string[] = [];

  // Try multiple parsing strategies

  // Strategy 1: Questions numbered with "Question X:" or "X."
  const numberedPattern = /(?:Question\s+\d+[:.)]|^\d+\.)\s*(.+?)(?=(?:Question\s+\d+[:.)]|^\d+\.)|$)/gims;
  const numberedMatches = content.matchAll(numberedPattern);

  for (const match of numberedMatches) {
    const question = match[1]?.trim();
    if (question && question.length > 10) {
      questions.push(question);
    }
  }

  // Strategy 2: If no numbered questions found, try splitting by double newlines
  if (questions.length === 0) {
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    // Look for paragraphs that end with question marks or contain question keywords
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (
        trimmed.includes('?') ||
        /^(what|how|why|when|where|who|which|explain|describe|discuss|analyze)/i.test(trimmed)
      ) {
        if (trimmed.length > 10) {
          questions.push(trimmed);
        }
      }
    }
  }

  // Strategy 3: If still no questions, split by single newlines as last resort
  if (questions.length === 0) {
    const lines = content.split('\n').filter(l => l.trim().length > 20);

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 10) {
        questions.push(trimmed);
      }
    }
  }

  return questions.slice(0, 100); // Limit to 100 questions max
}

export default router;
