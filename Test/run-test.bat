@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"

set "MODE=%~1"
if not defined MODE set "MODE=preflight"
shift

set "NPM_CMD="
if exist "C:\Program Files\nodejs\npm.cmd" (
  set "NPM_CMD=C:\Program Files\nodejs\npm.cmd"
)
if not defined NPM_CMD (
  for /f "delims=" %%i in ('where npm.cmd 2^>nul') do (
    if not defined NPM_CMD set "NPM_CMD=%%i"
  )
)
if not defined NPM_CMD (
  echo [ERROR] npm.cmd not found. Please install Node.js first.
  pause
  exit /b 1
)

if /I "%MODE%"=="help" goto usage
if /I "%MODE%"=="preflight" goto run_preflight
if /I "%MODE%"=="release" goto run_release
if /I "%MODE%"=="quick" goto run_quick
if /I "%MODE%"=="e2e" goto run_e2e
if /I "%MODE%"=="headed" goto run_headed
if /I "%MODE%"=="ui" goto run_ui
if /I "%MODE%"=="visual" goto run_visual
if /I "%MODE%"=="visual-update" goto run_visual_update

echo [ERROR] Unknown mode: %MODE%
echo.
goto usage

:run_preflight
set "SCRIPT_NAME=check:full"
goto ensure_and_run

:run_release
set "SCRIPT_NAME=check:release"
goto ensure_and_run

:run_quick
set "SCRIPT_NAME=check:quick"
goto ensure_and_run

:run_e2e
set "SCRIPT_NAME=test:e2e"
goto ensure_and_run

:run_headed
set "SCRIPT_NAME=test:e2e:headed"
goto ensure_and_run

:run_ui
set "SCRIPT_NAME=test:e2e:ui"
goto ensure_and_run

:run_visual
set "SCRIPT_NAME=test:visual"
goto ensure_and_run

:run_visual_update
set "SCRIPT_NAME=test:visual:update"
goto ensure_and_run

:ensure_and_run
if not exist "node_modules\\@playwright\\test" (
  echo [INFO] Dependencies not found. Running npm ci...
  call "%NPM_CMD%" ci
  if errorlevel 1 (
    echo [ERROR] npm ci failed.
    pause
    exit /b 1
  )
)

:run_script
echo [INFO] Running: %NPM_CMD% run %SCRIPT_NAME%
call "%NPM_CMD%" run %SCRIPT_NAME%
set "EC=%ERRORLEVEL%"
echo.
if "%EC%"=="0" (
  echo [PASS] Mode "%MODE%" completed successfully.
) else (
  echo [FAIL] Mode "%MODE%" failed with code %EC%.
)
echo.
echo Press any key to close...
pause >nul
exit /b %EC%

:usage
echo Usage: run-test.bat [mode]
echo.
echo Modes:
echo   preflight      Full local gate (lint + unit + syntax + assets + e2e + git sanity) [default]
echo   release        Strict release gate (requires main + clean git tree)
echo   quick          Fast gate (lint + unit + syntax + assets, skip e2e)
echo   e2e            Run all e2e tests
echo   headed         Run e2e tests in headed mode
echo   ui             Run Playwright UI mode
echo   visual         Run visual regression checks
echo   visual-update  Update visual snapshots
echo   help           Show this help
echo.
echo Examples:
echo   run-test.bat
echo   run-test.bat e2e
echo   run-test.bat visual
echo   run-test.bat release
echo.
echo Press any key to close...
pause >nul
exit /b 1
