# Legal AI Benchmark Application

A comprehensive web application for benchmarking and comparing AI models (Minimax, Zhipu, and others) on legal reasoning tasks.

## Features

### 1. AI Model Management
- Add multiple AI models with API keys
- Validate API connections before saving
- Support for Minimax, Zhipu (ChatGLM), and other OpenAI-compatible APIs
- Manage and delete models through the UI

### 2. Document Management
- Upload PDF documents (statutory and legislative materials)
- Automatic text extraction from PDFs
- Document library for use in benchmarks

### 3. Benchmark Testing

#### Legal Reasoning
- Ask legal questions with optional document context
- Upload statutory materials for contextual analysis
- Record response time and quality

#### Document Analysis
- Upload legal documents for AI analysis
- Get comprehensive summaries and key points
- Compare analysis quality across models

#### Document Drafting
- Request specific document types (contracts, NDAs, etc.)
- Provide custom requirements
- Compare drafting quality and completeness

### 4. Results & Analytics
- Dashboard with performance metrics
- Compare models by:
  - Average grades (0-10 scale)
  - Response times
  - Test counts by category
- Visual comparison charts
- Detailed test history

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite
- **PDF Processing**: pdf-parse
- **File Upload**: Multer

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **Icons**: Lucide React
- **HTTP Client**: Axios

## Installation

### Prerequisites
- Node.js 18+ and npm

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd LLM-v2
```

2. Install dependencies:
```bash
npm run install:all
```

3. Configure backend environment:
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` if needed:
```env
PORT=3001
NODE_ENV=development
DATABASE_PATH=./data/benchmark.db
UPLOAD_DIR=./uploads
```

## Running the Application

### Development Mode

Run both frontend and backend concurrently:
```bash
npm run dev
```

Or run them separately:

**Backend** (http://localhost:3001):
```bash
npm run dev:backend
```

**Frontend** (http://localhost:3000):
```bash
npm run dev:frontend
```

### Production Build

```bash
npm run build
```

## Usage Guide

### 1. Add AI Models

1. Navigate to the **Models** page
2. Click **Add Model**
3. Fill in the form:
   - **Model Name**: A friendly name (e.g., "Minimax Chat")
   - **Provider**: Select from dropdown (minimax, zhipu, etc.)
   - **API Key**: Your API key from the provider
   - **Base URL**: The API endpoint (e.g., `https://api.minimax.chat/v1`)
4. Click **Validate Connection** to test the API
5. If validation succeeds, click **Add Model**

#### Example Configurations

**Minimax:**
- Base URL: `https://api.minimax.chat/v1`
- Model: `abab5.5-chat` (set in code)

**Zhipu (ChatGLM):**
- Base URL: `https://open.bigmodel.cn/api/paas/v4`
- Model: `glm-4` (set in code)

**OpenAI (for testing):**
- Base URL: `https://api.openai.com/v1`
- Model: `gpt-3.5-turbo` or `gpt-4`

### 2. Upload Documents

1. Navigate to the **Documents** page
2. Click **Upload PDF**
3. Select a PDF file (statutory materials, contracts, etc.)
4. The document will be processed and text extracted automatically

### 3. Run Benchmarks

1. Navigate to the **Benchmarks** page
2. Select a model from the dropdown
3. Choose a benchmark type:

#### Legal Reasoning Test
- Optionally select a document for context
- Enter your legal question
- Click **Run Benchmark**

Example questions:
- "What are the key requirements for a valid contract?"
- "Explain the concept of fiduciary duty."
- "What are the penalties for breach of this statute?" (with document)

#### Document Analysis Test
- Select a document to analyze
- Click **Run Benchmark**
- The AI will provide a comprehensive analysis

#### Document Drafting Test
- Enter the document type (e.g., "Non-Disclosure Agreement")
- Provide requirements/specifications
- Click **Run Benchmark**

Example:
- Type: "Employment Contract"
- Requirements: "For a software engineer position, 6-month probation, competitive salary, standard benefits"

### 4. Grade Results

1. After running a test, select it from the results list
2. View the AI's response
3. Enter a grade (0-10) based on:
   - Accuracy
   - Completeness
   - Clarity
   - Legal soundness
4. Click **Save Grade**

### 5. View Dashboard

1. Navigate to the **Dashboard** page
2. View overall statistics:
   - Total tests run
   - Number of models tested
   - Average grades and response times
3. Compare model performance:
   - Side-by-side comparison table
   - Visual charts for grades and response times
   - Breakdown by test type

## API Endpoints

### Models
- `GET /api/models` - Get all models
- `GET /api/models/:id` - Get model by ID
- `POST /api/models` - Create new model
- `POST /api/models/validate` - Validate API credentials
- `PUT /api/models/:id` - Update model
- `DELETE /api/models/:id` - Delete model

### Documents
- `GET /api/documents` - Get all documents
- `GET /api/documents/:id` - Get document by ID
- `POST /api/documents/upload` - Upload PDF
- `DELETE /api/documents/:id` - Delete document

### Benchmarks
- `GET /api/benchmarks` - Get all tests (with optional filters)
- `GET /api/benchmarks/:id` - Get test by ID
- `POST /api/benchmarks/run` - Run a benchmark test
- `POST /api/benchmarks/:id/grade` - Grade a test result
- `GET /api/benchmarks/stats/summary` - Get statistics
- `DELETE /api/benchmarks/:id` - Delete test

## Database Schema

### Models Table
- `id` - Unique identifier
- `name` - Model name
- `provider` - Provider name (minimax, zhipu, etc.)
- `apiKey` - API key (encrypted in production)
- `baseUrl` - API base URL
- `isActive` - Active status
- `createdAt` - Creation timestamp

### Documents Table
- `id` - Unique identifier
- `name` - File name
- `type` - MIME type
- `content` - Extracted text
- `filePath` - File system path
- `uploadedAt` - Upload timestamp

### Benchmark Tests Table
- `id` - Unique identifier
- `type` - Test type (legal_reasoning, document_analysis, document_drafting)
- `modelId` - Foreign key to models
- `question` - Question/prompt
- `context` - Optional context (document content)
- `response` - AI response
- `responseTime` - Response time in milliseconds
- `userGrade` - User grade (0-10)
- `userFeedback` - Optional feedback
- `documentId` - Optional document reference
- `documentName` - Document name
- `documentType` - For drafting tests
- `requirements` - For drafting tests
- `createdAt` - Creation timestamp

## Security Considerations

⚠️ **Important**: This is a development application. For production use:

1. **API Keys**: Encrypt API keys in the database
2. **Authentication**: Add user authentication and authorization
3. **File Upload**: Implement virus scanning for uploaded files
4. **Rate Limiting**: Add rate limiting to prevent API abuse
5. **HTTPS**: Use HTTPS in production
6. **Input Validation**: Enhance input validation and sanitization
7. **CORS**: Configure CORS properly for your domain

## Troubleshooting

### Backend won't start
- Check if port 3001 is available
- Verify Node.js version (18+)
- Check database permissions in `backend/data/`

### Frontend won't start
- Check if port 3000 is available
- Clear `node_modules` and reinstall
- Check for TypeScript errors

### PDF upload fails
- Verify file is a valid PDF
- Check file size (max 50MB)
- Check `backend/uploads/` directory permissions

### API validation fails
- Verify API key is correct
- Check base URL format
- Test API endpoint directly with curl/Postman
- Check network connectivity

### Models not appearing
- Check browser console for errors
- Verify backend is running
- Check database file exists in `backend/data/`

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section

## Roadmap

Future enhancements:
- [ ] Multi-user support with authentication
- [ ] Export results to CSV/PDF
- [ ] Advanced analytics and charts
- [ ] Side-by-side model comparison
- [ ] Batch testing
- [ ] Custom test templates
- [ ] API key encryption
- [ ] Model performance history
- [ ] Automated testing schedules
- [ ] Support for more AI providers
