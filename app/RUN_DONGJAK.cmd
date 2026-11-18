@echo off
cd /d "%~dp0"
if not exist "node_modules\vite\bin\vite.js" (
  echo [ERROR] npm ci must be run first.
  pause
  exit /b 1
)
npm run dev
pause
