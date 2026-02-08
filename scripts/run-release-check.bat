@echo off
setlocal

cd /d "%~dp0.."

if not exist "package.json" (
  echo [ERROR] package.json not found.
  pause
  exit /b 1
)

npm.cmd run check:release %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo [FAIL] Release check failed.
  pause
  exit /b %EXIT_CODE%
)

echo.
echo [PASS] Release check completed.
exit /b 0
