@echo off
chcp 65001 >nul 2>&1

echo ========================================
echo   WeRead - Setup Scheduled Task
echo ========================================
echo.

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

echo This script will register a daily scheduled task to run WeRead.
echo.
echo Current ROOT path: %ROOT%
echo.
set /p SCHEDULE_TIME="Enter time to run daily (HH:MM, default 08:00): "
if "%SCHEDULE_TIME%"=="" set "SCHEDULE_TIME=08:00"

echo.
echo Registering task at %SCHEDULE_TIME% daily...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$scriptPath = '%ROOT%\weread-challenge\run-weread.ps1'; " ^
    "$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-ExecutionPolicy Bypass -WindowStyle Hidden -File \"%scriptPath%\"'; " ^
    "$trigger = New-ScheduledTaskTrigger -Daily -At '%SCHEDULE_TIME%'; " ^
    "$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited; " ^
    "$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable; " ^
    "Unregister-ScheduledTask -TaskName 'WeRead' -Confirm:\$false -ErrorAction SilentlyContinue; " ^
    "Register-ScheduledTask -TaskName 'WeRead' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'WeRead Auto Reader'; " ^
    "Write-Host 'Done!'"

echo.
echo Scheduled task registered! Use 'schtasks /run /tn WeRead' to run it manually.
pause
