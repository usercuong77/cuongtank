@echo off
setlocal

cd /d "%~dp0"

if not exist "%~dp0run-tests.ps1" (
  echo [ERROR] Missing file: run-tests.ps1
  echo Press any key to close...
  pause >nul
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-tests.ps1" -Visual -UpdateSnapshots %*
set "EXIT_CODE=%ERRORLEVEL%"
exit /b %EXIT_CODE%

