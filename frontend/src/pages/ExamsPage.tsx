import { useEffect, useState } from 'react';
import { FileText, Loader, Download, Award, Clock, CheckCircle } from 'lucide-react';
import { examsApi, documentsApi, modelsApi } from '../services/api';
import { ExamResult, Document, AIModel } from '../types';

export default function ExamsPage() {
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [examDocuments, setExamDocuments] = useState<Document[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [takingExam, setTakingExam] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);
  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [gradeFormData, setGradeFormData] = useState({
    assessorGrade: 0,
    assessorFeedback: '',
    assessorName: '',
    correctAnswers: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [results, docs, mdls] = await Promise.all([
        examsApi.getResults(),
        documentsApi.getAll(),
        modelsApi.getAll(),
      ]);

      setExamResults(results);
      // Filter only exam documents
      setExamDocuments(docs.filter(d => ['exam', 'bar_exam', 'law_exam'].includes(d.category)));
      setModels(mdls);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeExam = async () => {
    if (!selectedExamId || !selectedModelId) {
      alert('Please select both an exam and a model');
      return;
    }

    setTakingExam(true);

    try {
      await examsApi.takeExam({
        examDocumentId: selectedExamId,
        modelId: selectedModelId,
      });

      alert('Exam completed successfully!');
      await loadData();
      setSelectedExamId('');
      setSelectedModelId('');
    } catch (error: any) {
      console.error('Failed to take exam:', error);
      alert(`Failed to take exam: ${error.response?.data?.error || error.message}`);
    } finally {
      setTakingExam(false);
    }
  };

  const handleViewResult = (result: ExamResult) => {
    setSelectedResult(result);
  };

  const handleGradeClick = (result: ExamResult) => {
    setSelectedResult(result);
    setGradeFormData({
      assessorGrade: result.assessorGrade || 0,
      assessorFeedback: result.assessorFeedback || '',
      assessorName: result.assessorName || '',
      correctAnswers: result.correctAnswers || 0,
    });
    setShowGradeDialog(true);
  };

  const handleGradeSubmit = async () => {
    if (!selectedResult) return;

    try {
      await examsApi.gradeExam({
        resultId: selectedResult.id,
        ...gradeFormData,
      });

      alert('Exam graded successfully!');
      await loadData();
      setShowGradeDialog(false);
      setSelectedResult(null);
    } catch (error) {
      console.error('Failed to grade exam:', error);
      alert('Failed to grade exam');
    }
  };

  const handleExportResult = async (resultId: string) => {
    try {
      const blob = await examsApi.exportResult(resultId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam-result-${resultId}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export result:', error);
      alert('Failed to export result');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Law Exams</h1>
          <p className="mt-2 text-sm text-gray-700">
            Have AI models take bar exams and law exams, then review and grade the results.
          </p>
        </div>
      </div>

      {/* Take Exam Section */}
      <div className="mt-6 bg-white shadow sm:rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Take an Exam</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Exam
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              disabled={takingExam}
            >
              <option value="">Choose exam...</option>
              {examDocuments.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} ({doc.category.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Model
            </label>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              disabled={takingExam}
            >
              <option value="">Choose model...</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.provider})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleTakeExam}
              disabled={takingExam || !selectedExamId || !selectedModelId}
              className="w-full inline-flex justify-center items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {takingExam ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Taking Exam...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Take Exam
                </>
              )}
            </button>
          </div>
        </div>
        {examDocuments.length === 0 && (
          <p className="mt-4 text-sm text-gray-500">
            No exam documents available. Please upload exam documents in the Documents page.
          </p>
        )}
      </div>

      {/* Exam Results Section */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Exam Results</h2>
        <div className="grid grid-cols-1 gap-4">
          {examResults.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No exam results</h3>
              <p className="mt-1 text-sm text-gray-500">
                Take an exam to see results here.
              </p>
            </div>
          ) : (
            examResults.map((result) => (
              <div key={result.id} className="bg-white shadow rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">
                        {result.examName}
                      </h3>
                    </div>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Model:</span>
                        <p className="font-medium text-gray-900">{result.modelName}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Questions:</span>
                        <p className="font-medium text-gray-900">{result.totalQuestions || 'N/A'}</p>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-gray-500">Time:</span>
                        <p className="ml-1 font-medium text-gray-900">
                          {(result.responseTime / 1000).toFixed(1)}s
                        </p>
                      </div>
                      <div className="flex items-center">
                        <Award className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-gray-500">Status:</span>
                        <span className={`ml-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          result.status === 'graded' ? 'bg-green-100 text-green-800' :
                          result.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {result.status}
                        </span>
                      </div>
                    </div>
                    {result.assessorGrade !== undefined && (
                      <div className="mt-3 p-3 bg-green-50 rounded-md">
                        <div className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-800">
                              Assessor Grade: {result.assessorGrade}/100
                            </p>
                            {result.correctAnswers !== undefined && result.totalQuestions && (
                              <p className="text-xs text-green-700">
                                Correct Answers: {result.correctAnswers}/{result.totalQuestions}
                              </p>
                            )}
                            {result.assessorFeedback && (
                              <p className="text-xs text-green-700 mt-1">
                                {result.assessorFeedback}
                              </p>
                            )}
                            {result.assessorName && (
                              <p className="text-xs text-green-600 mt-1">
                                — {result.assessorName}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex flex-col space-y-2">
                    <button
                      onClick={() => handleViewResult(result)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      View Answers
                    </button>
                    <button
                      onClick={() => handleGradeClick(result)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <Award className="h-4 w-4 mr-1" />
                      Grade
                    </button>
                    <button
                      onClick={() => handleExportResult(result.id)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* View Result Dialog */}
      {selectedResult && !showGradeDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Exam Answers: {selectedResult.examName}
              </h3>
              <p className="text-sm text-gray-500">Model: {selectedResult.modelName}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {selectedResult.answers.map((answer, index) => (
                <div key={index} className="mb-6 pb-6 border-b border-gray-200 last:border-0">
                  <div className="flex items-start">
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mr-3">
                      {answer.questionNumber}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        {answer.question}
                      </p>
                      <div className="bg-gray-50 rounded-md p-3">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {answer.answer}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Time spent: {(answer.timeSpent / 1000).toFixed(1)}s
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setSelectedResult(null)}
                className="w-full inline-flex justify-center items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade Dialog */}
      {showGradeDialog && selectedResult && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Grade Exam</h3>
              <p className="text-sm text-gray-500">{selectedResult.examName}</p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overall Grade (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={gradeFormData.assessorGrade}
                  onChange={(e) => setGradeFormData({ ...gradeFormData, assessorGrade: parseFloat(e.target.value) })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
              </div>
              {selectedResult.totalQuestions && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correct Answers (out of {selectedResult.totalQuestions})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={selectedResult.totalQuestions}
                    value={gradeFormData.correctAnswers}
                    onChange={(e) => setGradeFormData({ ...gradeFormData, correctAnswers: parseInt(e.target.value) })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessor Name
                </label>
                <input
                  type="text"
                  value={gradeFormData.assessorName}
                  onChange={(e) => setGradeFormData({ ...gradeFormData, assessorName: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback
                </label>
                <textarea
                  value={gradeFormData.assessorFeedback}
                  onChange={(e) => setGradeFormData({ ...gradeFormData, assessorFeedback: e.target.value })}
                  rows={4}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="Provide detailed feedback..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex space-x-3">
              <button
                onClick={handleGradeSubmit}
                className="flex-1 inline-flex justify-center items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Submit Grade
              </button>
              <button
                onClick={() => {
                  setShowGradeDialog(false);
                  setSelectedResult(null);
                }}
                className="flex-1 inline-flex justify-center items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
