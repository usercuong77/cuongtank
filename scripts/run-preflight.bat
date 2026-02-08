@echo off
setlocal

cd /d "%~dp0.."

if not exist "package.json" (
  echo [ERROR] package.json not found.
  pause
  exit /b 1
)

npm.cmd run check:full %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo [FAIL] Preflight check failed.
  pause
  exit /b %EXIT_CODE%
)

echo.
echo [PASS] Preflight check completed.
exit /b 0
