# Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- npm (comes with Node.js)

Check your versions:
```bash
node -v   # Should be v18.x.x or higher
npm -v    # Should be 9.x.x or higher
```

## Installation

### Option 1: Automated Setup (Recommended)

```bash
./setup.sh
```

### Option 2: Manual Setup

```bash
# 1. Install root dependencies
npm install

# 2. Install backend dependencies
cd backend
npm install

# 3. Create backend .env file
cp .env.example .env

# 4. Install frontend dependencies
cd ../frontend
npm install
cd ..
```

## Running the Application

Start both frontend and backend:
```bash
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## First Steps

1. **Open** http://localhost:3000 in your browser

2. **Add a Model**:
   - Click "Models" in the navigation
   - Click "Add Model"
   - Enter your API details:
     - Name: e.g., "Minimax Chat"
     - Provider: Select from dropdown
     - API Key: Your API key
     - Base URL: e.g., `https://api.minimax.chat/v1`
   - Click "Validate Connection"
   - If successful, click "Add Model"

3. **Upload a Document** (Optional):
   - Click "Documents" in the navigation
   - Click "Upload PDF"
   - Select a legal document PDF

4. **Run a Benchmark**:
   - Click "Benchmarks" in the navigation
   - Select your model
   - Choose a benchmark type
   - Fill in the required fields
   - Click "Run Benchmark"

5. **View Results**:
   - Grade the response (0-10)
   - View comparisons on the Dashboard

## Troubleshooting

### TypeScript Errors in IDE

If you see TypeScript errors, make sure dependencies are installed:
```bash
npm run install:all
```

### Port Already in Use

If port 3000 or 3001 is already in use:

**Backend** - Edit `backend/.env`:
```
PORT=3002  # Change to available port
```

**Frontend** - Edit `frontend/vite.config.ts`:
```typescript
server: {
  port: 3001,  // Change to available port
}
```

### Cannot Find Module Errors

Run from the project root:
```bash
npm run install:all
```

### PDF Upload Fails

Check that the `backend/uploads/` directory is writable:
```bash
mkdir -p backend/uploads
chmod 755 backend/uploads
```

## API Provider Examples

### Minimax
```
Base URL: https://api.minimax.chat/v1
```

### Zhipu (ChatGLM)
```
Base URL: https://open.bigmodel.cn/api/paas/v4
```

### OpenAI (for testing)
```
Base URL: https://api.openai.com/v1
```

## Need More Help?

See the full [README.md](README.md) for detailed documentation.
