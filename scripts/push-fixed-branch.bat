@echo off
setlocal EnableExtensions DisableDelayedExpansion

REM Run in project root (this script lives in scripts\)
cd /d "%~dp0.."

set "TARGET_BRANCH=%~1"
if not defined TARGET_BRANCH (
  echo [ERROR] Missing target branch.
  exit /b 1
)
shift

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

REM Build commit message from args or auto timestamp
if "%~1"=="" (
  for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set "NOW_TS=%%i"
  set "COMMIT_MSG=chore: quick update %NOW_TS%"
) else (
  set "COMMIT_MSG=%*"
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

REM Push current HEAD to target branch without switching local branch
echo [INFO] Pushing HEAD to origin/%TARGET_BRANCH% ...
"%GIT_EXE%" push origin "HEAD:%TARGET_BRANCH%"
if errorlevel 1 (
  echo [ERROR] Push failed.
  echo [HINT] If rejected (non-fast-forward), pull/rebase target branch or push to a new branch first.
  exit /b 1
)

echo [OK] Push completed.
"%GIT_EXE%" log -1 --oneline
exit /b 0
