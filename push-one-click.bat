@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"

set "NO_PAUSE=0"
if /I "%~1"=="-NoPause" (
  set "NO_PAUSE=1"
  shift
)

if not exist "%~dp0scripts\push-one-click.bat" (
  echo [ERROR] Missing file: scripts\push-one-click.bat
  echo Press any key to close...
  pause >nul
  exit /b 1
)

echo [INFO] Running one-click commit/push...
call "%~dp0scripts\push-one-click.bat" %*
set "EC=%ERRORLEVEL%"

echo.
if "%EC%"=="0" (
  echo [DONE] push-one-click completed successfully.
) else (
  echo [FAILED] push-one-click finished with error code %EC%.
)

if "%NO_PAUSE%"=="0" (
  echo Press any key to close...
  pause >nul
)
exit /b %EC%
