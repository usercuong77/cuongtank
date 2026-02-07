@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"

if not exist "%~dp0scripts\push-fixed-branch.bat" (
  echo [ERROR] Missing file: scripts\push-fixed-branch.bat
  echo Press any key to close...
  pause >nul
  exit /b 1
)

echo [INFO] Running RELEASE push to branch: main
call "%~dp0scripts\push-fixed-branch.bat" "main" %*
set "EC=%ERRORLEVEL%"

echo.
if "%EC%"=="0" (
  echo [DONE] release-main completed successfully.
) else (
  echo [FAILED] release-main finished with error code %EC%.
)

echo Press any key to close...
pause >nul
exit /b %EC%
