#!/bin/bash

echo "=========================================="
echo "DroneForge - Interactive Drone Customizer"
echo "=========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Install frontend
echo "📦 Installing frontend dependencies..."
cd frontend
npm install --silent
if [ $? -ne 0 ]; then
    echo "❌ Frontend installation failed"
    exit 1
fi
cd ..
echo "✅ Frontend dependencies installed"
echo ""

# Install backend
echo "📦 Installing backend dependencies..."
cd backend
npm install --silent
if [ $? -ne 0 ]; then
    echo "❌ Backend installation failed"
    exit 1
fi
cd ..
echo "✅ Backend dependencies installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend/.env file..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please edit backend/.env and add your CLAUDE_API_KEY"
else
    echo "✅ backend/.env already exists"
fi

echo ""
echo "=========================================="
echo "✨ Setup Complete!"
echo "=========================================="
echo ""
echo "🚀 To start the application:"
echo ""
echo "   Terminal 1 (Frontend):"
echo "   cd frontend && npm run dev"
echo ""
echo "   Terminal 2 (Backend):"
echo "   cd backend && npm run dev"
echo ""
echo "Then open: http://localhost:5173"
echo ""
echo "📚 Documentation:"
echo "   - QUICKSTART.md - Quick start guide"
echo "   - README.md - Full documentation"
echo "   - ARCHITECTURE.md - Architecture & customization"
echo ""
