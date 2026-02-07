@echo off
setlocal EnableExtensions DisableDelayedExpansion

REM Run in project directory (where this file lives)
cd /d "%~dp0"

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
    pause
    exit /b 1
  )
)

REM Validate git repo
"%GIT_EXE%" rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERROR] This folder is not a Git repository.
  echo Path: %cd%
  pause
  exit /b 1
)

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
  pause
  exit /b 1
)

REM Detect if there is anything to commit
"%GIT_EXE%" diff --cached --quiet
if %errorlevel%==0 (
  echo [INFO] No changes to commit. Nothing to push.
  exit /b 0
)
if %errorlevel% GEQ 2 (
  echo [ERROR] Failed while checking staged diff.
  pause
  exit /b 1
)

echo [INFO] Commit: %COMMIT_MSG%
"%GIT_EXE%" commit -m "%COMMIT_MSG%"
if errorlevel 1 (
  echo [ERROR] Commit failed.
  pause
  exit /b 1
)

REM Push strategy:
REM 1) If upstream exists, push HEAD to that exact remote branch.
REM 2) If not, push current branch to origin and set upstream.
set "UPSTREAM="
for /f %%i in ('"%GIT_EXE%" rev-parse --abbrev-ref --symbolic-full-name @{u} 2^>nul') do set "UPSTREAM=%%i"

if defined UPSTREAM (
  set "REMOTE="
  set "REMOTE_BRANCH="
  for /f "tokens=1* delims=/" %%a in ("%UPSTREAM%") do (
    set "REMOTE=%%a"
    set "REMOTE_BRANCH=%%b"
  )
  echo [INFO] Pushing to %UPSTREAM% ...
  "%GIT_EXE%" push %REMOTE% HEAD:%REMOTE_BRANCH%
  if errorlevel 1 (
    echo [ERROR] Push failed.
    pause
    exit /b 1
  )
) else (
  set "BRANCH="
  for /f %%i in ('"%GIT_EXE%" rev-parse --abbrev-ref HEAD') do set "BRANCH=%%i"
  if not defined BRANCH (
    echo [ERROR] Cannot detect current branch.
    pause
    exit /b 1
  )
  echo [INFO] No upstream found. Pushing %BRANCH% to origin and setting upstream...
  "%GIT_EXE%" push -u origin "%BRANCH%"
  if errorlevel 1 (
    echo [ERROR] Push failed.
    pause
    exit /b 1
  )
)

echo [OK] Commit and push completed.
"%GIT_EXE%" log -1 --oneline
exit /b 0
