@echo off
chcp 65001 >nul 2>&1

:: ============================================================
::  WeRead Auto Reader - Universal Portable Launcher
::  Works on any Windows PC. No installation needed.
:: ============================================================

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

:: Set EdgeDriver path (passed to JS script via env var)
set "WEREAD_EDGE_DRIVER=%ROOT%\weread-challenge\edgedriver.exe"

:: Set data directory for cookies, logs, screenshots
set "WEREAD_DATA_DIR=%ROOT%\weread-challenge\.weread"

:: Reading parameters
set "WEREAD_BROWSER=MicrosoftEdge"
set "WEREAD_SELECTION=-1"
set "WEREAD_SCREENSHOT=false"
set "WEREAD_SPEED=Normal"
set "WEREAD_DURATION=570"
set "DEFAULT_BOOK_URL=https://weread.qq.com/web/reader/21d32ac0574b1021d6327f6"

:: Use bundled Node.js (preferred), fall back to system Node.js
if exist "%ROOT%\nodejs\node.exe" (
    set "PATH=%ROOT%\nodejs;%ROOT%\nodejs\node_modules\npm\bin;%PATH%"
) else (
    echo [INFO] Bundled Node.js not found, using system Node.js
)

:: Print startup info
echo.
echo ========================================
echo   WeRead Auto Reader
echo ========================================
echo   ROOT:       %ROOT%
echo   Browser:    %WEREAD_BROWSER%
echo   Duration:   %WEREAD_DURATION% min
echo   EdgeDriver: %WEREAD_EDGE_DRIVER%
echo   DataDir:    %WEREAD_DATA_DIR%
echo.

:: Check Node.js availability
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not available!
    echo          Please ensure node.exe exists in the nodejs folder.
    pause
    exit /b 1
)

:: Run the main script
node "%ROOT%\node_modules\weread-selenium-cli\src\weread-challenge.js" run

echo.
echo Done. Press any key to close...
pause >nul
