@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"

set "MODE=%~1"
if not defined MODE set "MODE=dev"
if /I "%MODE%"=="dev" shift
if /I "%MODE%"=="main" shift

if /I not "%MODE%"=="dev" if /I not "%MODE%"=="main" (
  echo [ERROR] Invalid mode: %MODE%
  echo Usage: release-one-click.bat [dev^|main] [commit message...]
  echo Example: release-one-click.bat dev chore: security hardening
  echo Example: release-one-click.bat main release: v1.2.0
  echo Press any key to close...
  pause >nul
  exit /b 1
)

set "NPM_CMD="
if exist "C:\Program Files\nodejs\npm.cmd" set "NPM_CMD=C:\Program Files\nodejs\npm.cmd"
if not defined NPM_CMD (
  for /f "delims=" %%i in ('where npm.cmd 2^>nul') do (
    if not defined NPM_CMD set "NPM_CMD=%%i"
  )
)
if not defined NPM_CMD (
  echo [ERROR] npm.cmd not found.
  echo Press any key to close...
  pause >nul
  exit /b 1
)

echo [INFO] Step 1/2: release prep ^(build + release bundle checks^)
call "%NPM_CMD%" run release:prep
if errorlevel 1 (
  echo [ERROR] release:prep failed. Stop.
  echo Press any key to close...
  pause >nul
  exit /b 1
)

echo [INFO] Step 2/2: push flow
if /I "%MODE%"=="main" (
  echo [INFO] target branch = main ^(production^)
  call "%~dp0release-main.bat" %*
) else (
  echo [INFO] target branch = codex/ci-setup ^(dev/CI^)
  call "%~dp0push-dev.bat" %*
)
set "EC=%ERRORLEVEL%"

echo.
if "%EC%"=="0" (
  echo [DONE] release-one-click completed successfully.
) else (
  echo [FAILED] release-one-click finished with code %EC%.
)
echo Press any key to close...
pause >nul
exit /b %EC%

