@echo off
setlocal EnableExtensions DisableDelayedExpansion

REM Run in repository root (this script lives in Test\scripts\)
cd /d "%~dp0..\.."

set "TARGET_BRANCH=%~1"
if not defined TARGET_BRANCH (
  echo [ERROR] Missing target branch.
  exit /b 1
)
shift

REM Locate npm (PATH first, then common install locations)
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
  exit /b 1
)

REM Locate git (PATH first, then common install locations)
set "GIT_EXE=git"
where git >nul 2>nul
if errorlevel 1 (
  if exist "C:\Program Files\Git\cmd\git.exe" (
    set "GIT_EXE=C:\Program Files\Git\cmd\git.exe"
  ) else if exist "C:\Program Files\Git\bin\git.exe" (
    set "GIT_EXE=C:\Program Files\Git\bin\git.exe"
  ) else (
    echo [ERROR] Git not found. Please install Git first.
    exit /b 1
  )
)

REM Validate git repo
"%GIT_EXE%" rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERROR] This folder is not a Git repository.
  echo Path: %cd%
  exit /b 1
)

REM Current branch info (for user visibility only)
set "CUR_BRANCH="
for /f %%i in ('"%GIT_EXE%" rev-parse --abbrev-ref HEAD') do set "CUR_BRANCH=%%i"
if not defined CUR_BRANCH (
  echo [ERROR] Cannot detect current branch.
  exit /b 1
)
echo [INFO] Current branch: %CUR_BRANCH%
echo [INFO] Target remote branch: origin/%TARGET_BRANCH%

set "CHECK_SCRIPT=check:full"
if /I "%TARGET_BRANCH%"=="main" set "CHECK_SCRIPT=check:release"
if /I "%TARGET_BRANCH%"=="main" if /I not "%CUR_BRANCH%"=="main" (
  echo [ERROR] release-main requires current branch to be main.
  exit /b 1
)

REM Build commit message from args or auto timestamp
set "COMMIT_MSG="
:collect_msg
if "%~1"=="" goto msg_done
if defined COMMIT_MSG (
  set "COMMIT_MSG=%COMMIT_MSG% %~1"
) else (
  set "COMMIT_MSG=%~1"
)
shift
goto collect_msg
:msg_done
if not defined COMMIT_MSG (
  for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set "NOW_TS=%%i"
  set "COMMIT_MSG=chore: quick update %NOW_TS%"
)

echo [INFO] Staging changes...
"%GIT_EXE%" add -A
if errorlevel 1 (
  echo [ERROR] Failed to stage files.
  exit /b 1
)

REM Commit only when there are staged changes
"%GIT_EXE%" diff --cached --quiet
if %errorlevel%==0 (
  echo [INFO] No file changes to commit.
) else if %errorlevel% GEQ 2 (
  echo [ERROR] Failed while checking staged diff.
  exit /b 1
) else (
  echo [INFO] Commit: %COMMIT_MSG%
  "%GIT_EXE%" commit -m "%COMMIT_MSG%"
  if errorlevel 1 (
    echo [ERROR] Commit failed.
    exit /b 1
  )
)

if not exist "Test\package.json" (
  echo [ERROR] Missing Test\package.json. Cannot run quality gate.
  exit /b 1
)

if not exist "Test\node_modules\@playwright\test" (
  echo [INFO] Dependencies not found. Running npm ci in Test...
  pushd "Test"
  call "%NPM_CMD%" ci
  set "EC=%ERRORLEVEL%"
  popd
  if not "%EC%"=="0" (
    echo [ERROR] npm ci failed.
    exit /b %EC%
  )
)

echo [INFO] Running quality gate: %CHECK_SCRIPT%
pushd "Test"
call "%NPM_CMD%" run %CHECK_SCRIPT%
set "EC=%ERRORLEVEL%"
popd
if not "%EC%"=="0" (
  echo [ERROR] Quality gate failed. Push canceled.
  exit /b %EC%
)

"%GIT_EXE%" status --porcelain | findstr /r "." >nul
if not errorlevel 1 (
  echo [ERROR] Working tree is not clean after quality gate.
  echo [HINT] Commit or clean generated files, then retry push.
  "%GIT_EXE%" status --short
  exit /b 1
)

REM Push current HEAD to target branch without switching local branch
echo [INFO] Pushing HEAD to origin/%TARGET_BRANCH% ...
"%GIT_EXE%" push origin "HEAD:%TARGET_BRANCH%"
if errorlevel 1 (
  echo [ERROR] Push failed.
  echo [HINT] If rejected, run pull/rebase on target branch or push to a new branch first.
  exit /b 1
)

echo [OK] Push completed.
"%GIT_EXE%" log -1 --oneline
exit /b 0
