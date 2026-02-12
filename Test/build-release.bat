@echo off
setlocal
cd /d "%~dp0"
call ".\run-test.bat" quick
if errorlevel 1 exit /b %ERRORLEVEL%
echo [INFO] Building release bundle...
call npm.cmd run build:release
set "EC=%ERRORLEVEL%"
if not "%EC%"=="0" (
  echo [FAIL] build:release failed with code %EC%.
  echo Press any key to close...
  pause >nul
  exit /b %EC%
)
echo [PASS] build:release completed.
echo Press any key to close...
pause >nul
exit /b 0

