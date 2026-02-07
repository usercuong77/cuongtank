@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"

if not exist "%~dp0scripts\push-fixed-branch.bat" (
  echo [ERROR] Missing file: scripts\push-fixed-branch.bat
  echo Press any key to close...
  pause >nul
  exit /b 1
)

echo [INFO] Running DEV push to branch: codex/ci-setup
call "%~dp0scripts\push-fixed-branch.bat" "codex/ci-setup" %*
set "EC=%ERRORLEVEL%"

echo.
if "%EC%"=="0" (
  echo [DONE] push-dev completed successfully.
) else (
  echo [FAILED] push-dev finished with error code %EC%.
)

echo Press any key to close...
pause >nul
exit /b %EC%
