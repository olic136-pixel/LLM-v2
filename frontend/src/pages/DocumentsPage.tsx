import { useEffect, useState } from 'react';
import { Upload, Trash2, FileText, Loader } from 'lucide-react';
import { documentsApi } from '../services/api';
import { Document } from '../types';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'general' | 'exam' | 'bar_exam' | 'law_exam'>('general');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const data = await documentsApi.getAll();
      setDocuments(data);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Only PDF files are supported');
      return;
    }

    setSelectedFile(file);
    setShowUploadDialog(true);
    e.target.value = ''; // Reset file input
  };

  const handleUploadConfirm = async () => {
    if (!selectedFile) return;

    setUploading(true);

    try {
      await documentsApi.upload(selectedFile, selectedCategory);
      await loadDocuments();
      setShowUploadDialog(false);
      setSelectedFile(null);
      setSelectedCategory('general');
    } catch (error) {
      console.error('Failed to upload document:', error);
      alert('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadCancel = () => {
    setShowUploadDialog(false);
    setSelectedFile(null);
    setSelectedCategory('general');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await documentsApi.delete(id);
      await loadDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document');
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
          <h1 className="text-2xl font-semibold text-gray-900">Legal Documents</h1>
          <p className="mt-2 text-sm text-gray-700">
            Upload statutory and legislative materials for benchmarking.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <label className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload PDF'}
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Upload Document
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              File: <span className="font-medium">{selectedFile?.name}</span>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              >
                <option value="general">General Legal Document</option>
                <option value="exam">Law Exam</option>
                <option value="bar_exam">Bar Exam</option>
                <option value="law_exam">Law School Exam</option>
              </select>
              <p className="mt-2 text-xs text-gray-500">
                {selectedCategory === 'general' && 'Standard legal documents for analysis'}
                {selectedCategory === 'exam' && 'General law examination papers'}
                {selectedCategory === 'bar_exam' && 'Bar examination papers for professional licensing'}
                {selectedCategory === 'law_exam' && 'Law school examination papers'}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleUploadConfirm}
                disabled={uploading}
                className="flex-1 inline-flex justify-center items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload'
                )}
              </button>
              <button
                onClick={handleUploadCancel}
                disabled={uploading}
                className="flex-1 inline-flex justify-center items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Document
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Category
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Uploaded
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Size
                    </th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-sm text-gray-500 text-center">
                        No documents uploaded. Upload a PDF to get started.
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr key={doc.id}>
                        <td className="px-3 py-4 text-sm">
                          <div className="flex items-center">
                            <FileText className="w-5 h-5 text-gray-400 mr-3" />
                            <div>
                              <div className="font-medium text-gray-900">{doc.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            doc.category === 'bar_exam' ? 'bg-purple-100 text-purple-800' :
                            doc.category === 'law_exam' ? 'bg-blue-100 text-blue-800' :
                            doc.category === 'exam' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {doc.category === 'bar_exam' ? 'Bar Exam' :
                             doc.category === 'law_exam' ? 'Law Exam' :
                             doc.category === 'exam' ? 'Exam' :
                             'General'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {(doc.content.length / 1024).toFixed(2)} KB
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
