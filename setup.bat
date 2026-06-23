@echo off
chcp 65001 >nul 2>&1

echo ========================================
echo   WeRead Auto Reader - Setup (Windows)
echo   Auto-detecting environment...
echo ========================================
echo.

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

:: Use bundled Node.js if available, else system Node.js
if exist "%ROOT%\nodejs\node.exe" (
    set "NODE=%ROOT%\nodejs\node.exe"
) else (
    set "NODE=node"
)

echo Running cross-platform setup...
echo.
"%NODE%" "%ROOT%\setup.js"

echo.
echo Setup finished. Press any key to close...
pause >nul
