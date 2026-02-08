@echo off
setlocal
cd /d "%~dp0"
call ".\run-test.bat" visual-update %*
exit /b %ERRORLEVEL%
