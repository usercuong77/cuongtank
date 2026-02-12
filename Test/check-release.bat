@echo off
setlocal
cd /d "%~dp0"
echo [INFO] Running release build checks...
call npm.cmd run check:release:build
set "EC=%ERRORLEVEL%"
if not "%EC%"=="0" (
  echo [FAIL] check:release:build failed with code %EC%.
  echo Press any key to close...
  pause >nul
  exit /b %EC%
)
echo [PASS] check:release:build completed.
echo Press any key to close...
pause >nul
exit /b 0

