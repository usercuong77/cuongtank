@echo off
setlocal
cd /d "%~dp0"

if not exist "%~dp0scripts\push-one-click.bat" (
  echo [ERROR] Missing file: scripts\push-one-click.bat
  echo Press any key to close...
  pause >nul
  exit /b 1
)

call "%~dp0scripts\push-one-click.bat" %*
exit /b %ERRORLEVEL%
