@echo off
setlocal
cd /d "%~dp0"

if not exist "%~dp0scripts\run-preflight.bat" (
  echo [ERROR] Missing file: scripts\run-preflight.bat
  pause
  exit /b 1
)

call "%~dp0scripts\run-preflight.bat" %*
exit /b %ERRORLEVEL%
