# WeRead Auto Reader - Portable Scheduled Task Script
# Auto-detects its own location. No hardcoded paths needed.

$ErrorActionPreference = "Stop"

# Get script directory, then go up 2 levels: weread-challenge -> weread-portable-root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$portableRoot = (Get-Item "$scriptDir\..").FullName

$nodeExe    = Join-Path $portableRoot "nodejs\node.exe"
$mainJs     = Join-Path $portableRoot "node_modules\weread-selenium-cli\src\weread-challenge.js"
$edgeDriver = Join-Path $portableRoot "weread-challenge\edgedriver.exe"
$dataDir    = Join-Path $portableRoot "weread-challenge\.weread"
$logFile    = Join-Path $dataDir "output.log"

# Environment variables
$env:WEREAD_BROWSER       = "MicrosoftEdge"
$env:WEREAD_SELECTION     = "-1"
$env:WEREAD_SCREENSHOT    = "false"
$env:WEREAD_SPEED         = "Normal"
$env:WEREAD_DURATION      = "570"
$env:DEFAULT_BOOK_URL     = "https://weread.qq.com/web/reader/21d32ac0574b1021d6327f6"
$env:WEREAD_EDGE_DRIVER   = $edgeDriver
$env:WEREAD_DATA_DIR      = $dataDir

# Add bundled Node.js to PATH
$env:Path = "$portableRoot\nodejs;$portableRoot\nodejs\node_modules\npm\bin;$env:Path"

# Record start time
$startTime = Get-Date
Write-Host "[$($startTime.ToString('yyyy-MM-dd HH:mm:ss'))] Starting WeRead..."
Write-Host "[ROOT]       $portableRoot"
Write-Host "[Node]       $nodeExe"
Write-Host "[EdgeDriver] $edgeDriver"

# Change to weread-challenge directory
Set-Location (Join-Path $portableRoot "weread-challenge")

# Run the main script
& "$nodeExe" "$mainJs" run 2>&1 | Tee-Object -FilePath $logFile -Append

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalMinutes
Write-Host "[$($endTime.ToString('yyyy-MM-dd HH:mm:ss'))] Done. Duration: $([math]::Round($duration, 1)) min"

# Wait 10 seconds then close browsers
Start-Sleep -Seconds 10
Get-Process -Name "msedge", "chrome", "firefox" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "[$($endTime.ToString('yyyy-MM-dd HH:mm:ss'))] Task finished"
