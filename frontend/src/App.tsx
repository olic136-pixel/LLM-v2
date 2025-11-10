import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Home, Settings, FileText, TrendingUp, BarChart3, Layout, LogOut, User, Award } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ModelsPage from './pages/ModelsPage';
import BenchmarksPage from './pages/BenchmarksPage';
import DocumentsPage from './pages/DocumentsPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TemplatesPage from './pages/TemplatesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ExamsPage from './pages/ExamsPage';

function AppContent() {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Legal AI Benchmark</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
                <Link
                  to="/analytics"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Link>
                <Link
                  to="/models"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Models
                </Link>
                <Link
                  to="/documents"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Documents
                </Link>
                <Link
                  to="/benchmarks"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Benchmarks
                </Link>
                <Link
                  to="/exams"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <Award className="w-4 h-4 mr-2" />
                  Exams
                </Link>
                <Link
                  to="/templates"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <Layout className="w-4 h-4 mr-2" />
                  Templates
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-700">
                <User className="w-4 h-4 mr-2" />
                {user.name}
              </div>
              <button
                onClick={logout}
                className="inline-flex items-center text-sm text-gray-700 hover:text-red-600"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/benchmarks" element={<BenchmarksPage />} />
          <Route path="/exams" element={<ExamsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
