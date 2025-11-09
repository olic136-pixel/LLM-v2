import { useEffect, useState } from 'react';
import { Play, Loader, Star } from 'lucide-react';
import { benchmarksApi, modelsApi, documentsApi } from '../services/api';
import { BenchmarkTest, AIModel, Document } from '../types';

type BenchmarkType = 'legal_reasoning' | 'document_analysis' | 'document_drafting';

export default function BenchmarksPage() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [tests, setTests] = useState<BenchmarkTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedTest, setSelectedTest] = useState<BenchmarkTest | null>(null);

  const [formData, setFormData] = useState({
    modelId: '',
    type: 'legal_reasoning' as BenchmarkType,
    question: '',
    documentId: '',
    documentType: '',
    requirements: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [modelsData, documentsData, testsData] = await Promise.all([
        modelsApi.getAll(),
        documentsApi.getAll(),
        benchmarksApi.getAll(),
      ]);

      setModels(modelsData);
      setDocuments(documentsData);
      setTests(testsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunBenchmark = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.modelId) {
      alert('Please select a model');
      return;
    }

    setRunning(true);

    try {
      const result = await benchmarksApi.run(formData);
      await loadData();

      // Select the newly created test
      const newTest = tests.find(t => t.id === result.testId);
      if (newTest) {
        setSelectedTest(newTest);
      }

      alert('Benchmark completed successfully!');
    } catch (error: any) {
      console.error('Failed to run benchmark:', error);
      alert(error.response?.data?.error || 'Failed to run benchmark');
    } finally {
      setRunning(false);
    }
  };

  const handleGrade = async (testId: string, grade: number, feedback?: string) => {
    try {
      await benchmarksApi.grade(testId, grade, feedback);
      await loadData();

      // Update selected test
      const updated = tests.find(t => t.id === testId);
      if (updated) {
        setSelectedTest(updated);
      }
    } catch (error) {
      console.error('Failed to grade test:', error);
      alert('Failed to save grade');
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
          <h1 className="text-2xl font-semibold text-gray-900">Benchmark Tests</h1>
          <p className="mt-2 text-sm text-gray-700">
            Run and manage legal AI benchmark tests.
          </p>
        </div>
      </div>

      {/* Run Benchmark Form */}
      <div className="mt-6 bg-white shadow sm:rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Run New Benchmark</h2>
        <form onSubmit={handleRunBenchmark} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Model</label>
              <select
                value={formData.modelId}
                onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                required
              >
                <option value="">Choose a model...</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Benchmark Type</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as BenchmarkType })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              >
                <option value="legal_reasoning">Legal Reasoning</option>
                <option value="document_analysis">Document Analysis</option>
                <option value="document_drafting">Document Drafting</option>
              </select>
            </div>
          </div>

          {formData.type === 'legal_reasoning' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Legal Document (Optional)
                </label>
                <select
                  value={formData.documentId}
                  onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                >
                  <option value="">None</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Question</label>
                <textarea
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="Enter your legal reasoning question..."
                  required
                />
              </div>
            </>
          )}

          {formData.type === 'document_analysis' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Select Document to Analyze
              </label>
              <select
                value={formData.documentId}
                onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                required
              >
                <option value="">Choose a document...</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.type === 'document_drafting' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Document Type</label>
                <input
                  type="text"
                  value={formData.documentType}
                  onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="e.g., Non-Disclosure Agreement, Contract, etc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Requirements</label>
                <textarea
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="Describe what should be included in the document..."
                  required
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={running || models.length === 0}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {running ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Benchmark
              </>
            )}
          </button>
        </form>
      </div>

      {/* Test Results */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Test Results</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test List */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {tests.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No tests run yet. Run a benchmark to see results.
                  </p>
                ) : (
                  tests.map((test) => (
                    <div
                      key={test.id}
                      onClick={() => setSelectedTest(test)}
                      className={`cursor-pointer rounded-lg border p-4 hover:bg-gray-50 ${
                        selectedTest?.id === test.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {models.find((m) => m.id === test.modelId)?.name || 'Unknown Model'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {test.type.replace('_', ' ')} • {test.responseTime}ms
                          </p>
                        </div>
                        {test.userGrade !== null && test.userGrade !== undefined && (
                          <div className="flex items-center ml-2">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-sm font-medium ml-1">{test.userGrade}/10</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2">{test.question}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Test Detail */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {selectedTest ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Question</h3>
                    <p className="mt-1 text-sm text-gray-900">{selectedTest.question}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Response</h3>
                    <div className="mt-1 text-sm text-gray-900 max-h-64 overflow-y-auto bg-gray-50 rounded p-3">
                      {selectedTest.response}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Model</h3>
                      <p className="mt-1 text-sm text-gray-900">
                        {models.find((m) => m.id === selectedTest.modelId)?.name || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Response Time</h3>
                      <p className="mt-1 text-sm text-gray-900">{selectedTest.responseTime}ms</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Grade this Response</h3>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        defaultValue={selectedTest.userGrade || 0}
                        className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                        id={`grade-${selectedTest.id}`}
                      />
                      <span className="text-sm text-gray-500">/ 10</span>
                      <button
                        onClick={() => {
                          const gradeInput = document.getElementById(
                            `grade-${selectedTest.id}`
                          ) as HTMLInputElement;
                          const grade = parseInt(gradeInput.value);
                          if (grade >= 0 && grade <= 10) {
                            handleGrade(selectedTest.id, grade);
                          }
                        }}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Save Grade
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  Select a test to view details
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
