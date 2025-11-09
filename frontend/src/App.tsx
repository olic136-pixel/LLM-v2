import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Home, Settings, FileText, TrendingUp } from 'lucide-react';
import ModelsPage from './pages/ModelsPage';
import BenchmarksPage from './pages/BenchmarksPage';
import DocumentsPage from './pages/DocumentsPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <Router>
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
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/models" element={<ModelsPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/benchmarks" element={<BenchmarksPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
