@echo off
setlocal

REM Run from project directory (where this BAT is located)
cd /d "%~dp0"

if not exist "%~dp0run-tests.ps1" (
  echo [ERROR] Missing file: run-tests.ps1
  echo Press any key to close...
  pause >nul
  exit /b 1
)

REM Forward all arguments to the PowerShell runner
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-tests.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"

exit /b %EXIT_CODE%

