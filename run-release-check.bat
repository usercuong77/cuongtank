@echo off
setlocal
cd /d "%~dp0"

if not exist "%~dp0scripts\run-release-check.bat" (
  echo [ERROR] Missing file: scripts\run-release-check.bat
  pause
  exit /b 1
)

call "%~dp0scripts\run-release-check.bat" %*
exit /b %ERRORLEVEL%
