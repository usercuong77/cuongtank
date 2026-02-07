@echo off
setlocal
cd /d "%~dp0"

if not exist "%~dp0scripts\run-visual-update.bat" (
  echo [ERROR] Missing file: scripts\run-visual-update.bat
  echo Press any key to close...
  pause >nul
  exit /b 1
)

call "%~dp0scripts\run-visual-update.bat" %*
exit /b %ERRORLEVEL%
