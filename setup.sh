#!/bin/bash

echo "🚀 Setting up Legal AI Benchmark Application..."
echo ""

# Check Node.js version
echo "✓ Checking Node.js version..."
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo "❌ Error: Node.js 18 or higher is required. Current version: $(node -v)"
    exit 1
fi
echo "  Node.js version: $(node -v) ✓"
echo ""

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
echo ""

# Setup backend .env file
if [ ! -f .env ]; then
    echo "⚙️  Creating backend .env file..."
    cp .env.example .env
    echo "  Created backend/.env from .env.example"
else
    echo "  backend/.env already exists"
fi
cd ..
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..
echo ""

echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "  npm run dev              - Start both frontend and backend"
echo "  npm run dev:backend      - Start backend only (port 3001)"
echo "  npm run dev:frontend     - Start frontend only (port 3000)"
echo ""
echo "Then open http://localhost:3000 in your browser"
