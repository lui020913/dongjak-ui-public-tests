@echo off
setlocal
cd /d "%~dp0"
if not exist "package.json" (
  echo [ERROR] Run this file from the extracted DongjakApp project root.
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0SETUP_SUPABASE.ps1"
set "DJ_RESULT=%ERRORLEVEL%"
if not "%DJ_RESULT%"=="0" echo [ERROR] Setup was not completed.
pause
exit /b %DJ_RESULT%
