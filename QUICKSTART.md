# Quick Start Guide - DroneForge

## Prerequisites
- Node.js 18+ 
- npm or yarn
- Claude API key (get one free at https://console.anthropic.com)

## ⚡ Super Quick Setup (5 minutes)

### 1. Clone & Install Dependencies

```bash
# Terminal 1: Install frontend
cd frontend
npm install
npm run dev
```

```bash
# Terminal 2: Setup and start backend
cd backend
npm install
cp .env.example .env
# Edit .env and add your CLAUDE_API_KEY
npm run dev
```

### 2. Open in Browser
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## 🚀 First Time Setup

### Get Claude API Key
1. Go to https://console.anthropic.com
2. Sign up (free trial available)
3. Create an API key
4. Copy it to `backend/.env` → `CLAUDE_API_KEY=sk-ant-...`

### Frontend Setup
```bash
cd frontend
npm install                    # Install dependencies
npm run dev                   # Start dev server
```

Open http://localhost:5173 in your browser

### Backend Setup
```bash
cd backend
npm install                   # Install dependencies
cp .env.example .env         # Create .env file
# Edit .env and add your Claude API key
npm run dev                  # Start development server
```

The backend will be available at http://localhost:5000

## 📚 What to Try First

### Build a Drone Manually
1. Go to the app in your browser
2. Click "Manual Selection" tab
3. Select a frame type (try "Photography Quad 450")
4. Choose motors, battery, propellers
5. Watch the 3D drone update in real-time
6. See specs change instantly

### Use AI to Build
1. Click "AI-Assisted" tab
2. Type a description like:
   - "I want a racing drone for FPV"
   - "Build me a heavy-lift cargo drone"
   - "Make the fastest drone possible"
3. Watch the AI suggest components
4. See the permission banner asking before changes
5. Click "Allow" to apply suggestions

### Export Your Build
1. Click "Export BOM" to download your Bill of Materials
2. Share it with friends or use it to buy parts

## 🔧 Development Commands

### Frontend
```bash
cd frontend
npm run dev          # Start dev server on http://localhost:5173
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Backend
```bash
cd backend
npm run dev          # Start dev server on http://localhost:5000
npm run build        # Compile TypeScript
npm run lint         # Run ESLint
```

## 📝 API Endpoints Overview

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Check if API is running |
| `/api/parts` | GET | Get all available parts |
| `/api/calculate-specs` | POST | Calculate drone specifications |
| `/api/generate-bom` | POST | Generate Bill of Materials |
| `/api/chat` | POST | Chat with AI assistant |
| `/api/ai-build-drone` | POST | AI builds complete drone |
| `/api/compare-drone` | POST | Compare with market drones |

## 🐛 Troubleshooting

### Port already in use
If port 5173 (frontend) or 5000 (backend) is already in use:

**Frontend:**
```bash
cd frontend
npm run dev -- --port 3000
```

**Backend:** Edit `backend/src/server.ts` and change `PORT` variable

### Claude API Key not working
1. Check you copied it correctly (should start with `sk-ant-`)
2. Ensure it's in `backend/.env` not `.env.example`
3. Restart the backend server for changes to take effect

### Modules not found errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Port 5000 conflict resolution:
```bash
# Check what's using port 5000
lsof -i :5000          # Mac/Linux
netstat -ano | findstr :5000  # Windows

# Kill the process (get PID from above)
kill -9 <PID>          # Mac/Linux
taskkill /PID <PID> /F # Windows
```

## 📦 Technology Stack

- **Frontend**: React 18 + Vite + Three.js + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **AI**: Claude API (Anthropic)
- **State**: Zustand
- **Animations**: Framer Motion
- **3D**: Three.js with WebGL

## 🎯 Next Steps

1. **Customize drone parts**: Edit `frontend/src/shared/database.ts` and `backend/src/shared/database.ts` to add more components
2. **Modify calculations**: Update `frontend/src/shared/calculator.ts` and `backend/src/shared/calculator.ts` for different physics
3. **Add new features**: Create components in `frontend/src/components/`
4. **Extend API**: Add routes in `backend/src/server.ts`
5. **Improve 3D model**: Enhance `DroneVisualizer.tsx` with better geometries

## 📞 Support

Having issues? Check:
1. Logs in the terminal for clues
2. Browser console (F12) for frontend errors
3. Backend logs for API errors
4. GitHub issues if it's a known problem

## ✨ Key Features to Explore

- **Real-time visualization**: 3D drone updates as you select parts
- **Live specs**: Weight, thrust, flight time calculated instantly
- **AI suggestions**: Describe your drone, AI does the building
- **Permission system**: You approve changes before AI applies them
- **BOM export**: Download a complete shopping list
- **Market comparison**: See how your drone compares to existing products

Happy building! 🚁

---

**Questions or feedback?** Feel free to open an issue or contribute!
