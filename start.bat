@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js or serve the dist folder with your local web server.
  pause
  exit /b 1
)
node tools\serve.js
pause
