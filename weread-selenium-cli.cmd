@ECHO off
SETLOCAL

:: 找到本脚本所在目录
SET "dp0=%~dp0"

:: 向上两级：bin -> weread-portable-root
FOR %%A IN ("%dp0%.") DO SET "parent=%%~fA"
FOR %%A IN ("%parent%.") DO SET "ROOT=%%~fA"

IF EXIST "%ROOT%\node.exe" (
    SET "_prog=%ROOT%\node.exe"
) ELSE (
    SET "_prog=node"
)

"%_prog%" "%ROOT%\node_modules\weread-selenium-cli\src\weread-challenge.js" %*
