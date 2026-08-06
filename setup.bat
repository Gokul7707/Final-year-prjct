@echo off
REM DroneForge Setup Script for Windows

echo ==========================================
echo DroneForge - Interactive Drone Customizer
echo ==========================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18 or higher.
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js version: %NODE_VERSION%
echo.

REM Install frontend
echo 📦 Installing frontend dependencies...
cd frontend
call npm install --silent
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Frontend installation failed
    exit /b 1
)
cd ..
echo ✅ Frontend dependencies installed
echo.

REM Install backend
echo 📦 Installing backend dependencies...
cd backend
call npm install --silent
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Backend installation failed
    exit /b 1
)
cd ..
echo ✅ Backend dependencies installed
echo.

REM Create .env file if it doesn't exist
if not exist "backend\.env" (
    echo 📝 Creating backend\.env file...
    copy backend\.env.example backend\.env
    echo ⚠️  Please edit backend\.env and add your CLAUDE_API_KEY
) else (
    echo ✅ backend\.env already exists
)

echo.
echo ==========================================
echo ✨ Setup Complete!
echo ==========================================
echo.
echo 🚀 To start the application:
echo.
echo    Terminal 1 (Frontend):
echo    cd frontend ^&^& npm run dev
echo.
echo    Terminal 2 (Backend):
echo    cd backend ^&^& npm run dev
echo.
echo    Then open: http://localhost:5173
echo.
echo 📚 Documentation:
echo    - QUICKSTART.md - Quick start guide
echo    - README.md - Full documentation
echo    - ARCHITECTURE.md - Architecture ^& customization
echo.
pause
