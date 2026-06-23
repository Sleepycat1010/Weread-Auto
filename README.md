# WeRead Auto Reader - Portable Package v6.0

> **Cross-platform portable package.** Works on Windows and Ubuntu/Linux.
> **No installation required.** Built-in Node.js, ChromeDriver, EdgeDriver.
> **Just extract and run.**

---

## Quick Start

### Windows

1. Extract zip to any folder (e.g. `D:\weread-portable`)
2. Double-click **`start.bat`**
3. Scan QR code with WeChat → Auto reading starts

### Ubuntu / Linux

1. Extract zip to any folder (e.g. `/home/user/weread-portable`)
2. Run setup (first time only):
   ```bash
   cd /home/user/weread-portable
   chmod +x setup-linux.sh start-linux.sh
   ./setup-linux.sh
   ```
3. Start reading:
   ```bash
   ./start-linux.sh
   ```
4. Scan QR code with WeChat → Auto reading starts

---

## Package Structure

```
weread-portable/
├── start.bat              ← Windows launcher (double-click)
├── start-linux.sh         ← Linux launcher (run in terminal)
├── setup.bat              ← Windows environment check + shortcut
├── setup-linux.sh         ← Linux dependency installer (Chrome)
├── README.md              ← This file
├── nodejs/                ← Node.js v22.x (Windows, ~82MB)
├── nodejs-linux/          ← Node.js v22.x (Linux, ~137MB)
├── node_modules/
│   └── weread-selenium-cli/
│       ├── src/
│       │   ├── weread-challenge.js   ← Main entry (modularized)
│       │   └── lib/                  ← Modularized logic
│       │       ├── config.js         ← Configuration & env parsing
│       │       ├── files.js          ← File paths & logging
│       │       ├── login.js          ← QR login & cookie management
│       │       ├── network.js        ← HTTP helpers & diagnostics
│       │       ├── user.js           ← User info extraction
│       │       ├── notifications.js  ← Email & Bark push
│       │       ├── reader.js         ← Reading loop & screenshot
│       │       ├── schedule.js       ← Scheduled task generation
│       │       └── shell.js          ← Shell escaping utilities
│       └── package.json
├── weread-challenge/
│   ├── .weread/           ← Cookies, logs, screenshots
│   │   ├── cookies.json
│   │   ├── login.png
│   │   └── output.log     ← UTF-8 encoded
│   ├── edgedriver.exe     ← Edge browser driver (Windows)
│   ├── chromedriver       ← Chrome driver (Linux)
│   ├── run-weread.ps1     ← Scheduled task script (Windows)
│   ├── setup-scheduled-task.bat
│   └── weread-task.xml
└── package.json
```

---

## Configuration

Edit the launcher script (`start.bat` or `start-linux.sh`) to customize:

| Variable | Default | Description |
|----------|---------|-------------|
| `WEREAD_BROWSER` | `MicrosoftEdge` (Win) / `chrome` (Linux) | Browser to use |
| `WEREAD_DURATION` | `570` | Reading duration in minutes (~9.5h) |
| `WEREAD_SPEED` | `Normal` | Speed: `Slow` / `Normal` / `Fast` |
| `WEREAD_SELECTION` | `-1` | Book: `-1`=random, `0`=first, etc. |
| `WEREAD_SCREENSHOT` | `false` | Capture screenshots: `true` / `false` |
| `DEFAULT_BOOK_URL` | (see file) | Specific book URL |

### CLI Options (advanced)

```bash
node weread-challenge.js run --duration 120 --speed fast --bark-key YOUR_KEY
node weread-challenge.js schedule          # Generate scheduled task config
node weread-challenge.js health            # Check Selenium health
node weread-challenge.js --help            # Full option list
```

### Example: Change to 24-hour reading

**Windows** (`start.bat`):
```bat
set "WEREAD_DURATION=1440"
```

**Linux** (`start-linux.sh`):
```bash
export WEREAD_DURATION="1440"
```

---

## Scheduled Tasks

### Windows (Daily at 8:00 AM)

Run `weread-challenge\setup-scheduled-task.bat`, or manually:

```powershell
$scriptPath = "D:\weread-portable\weread-challenge\run-weread.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -Daily -At "08:00"
Register-ScheduledTask -TaskName "WeRead" -Action $action -Trigger $trigger -Principal (New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive) -Settings (New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries)
```

### Linux (Daily at 8:00 AM via cron)

```bash
# Add to crontab
crontab -e
# Add this line:
0 8 * * * /home/user/weread-portable/start-linux.sh >> /home/user/weread-portable/weread-challenge/.weread/cron.log 2>&1
```

---

## Troubleshooting

### Windows

| Issue | Solution |
|-------|----------|
| "Node.js not available" | Ensure `nodejs/node.exe` exists (re-extract) |
| "Session timed out" | Delete `weread-challenge/.weread/cookies.json`, re-login |
| EdgeDriver version mismatch | Download matching version from https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/ → replace `edgedriver.exe` |

### Linux

| Issue | Solution |
|-------|----------|
| "No Chrome/Chromium found" | Run `./setup-linux.sh` or `sudo apt install chromium-browser` |
| "chromedriver version mismatch" | Download matching version → replace `weread-challenge/chromedriver` |
| "Permission denied" | Run `chmod +x start-linux.sh setup-linux.sh weread-challenge/chromedriver` |
| QR code not showing | Ensure browser is installed and display is available (X11/Wayland) |
| Running on server (no GUI) | Install Xvfb: `sudo apt install xvfb` → `xvfb-run ./start-linux.sh` |

### Both Platforms

| Issue | Solution |
|-------|----------|
| Cookie expired | Delete `cookies.json` → re-run → scan QR |
| Log shows garbled text | Already fixed in v6.0 (UTF-8 encoding) |
| Flash/crash | Check `.weread/output.log` for error details |

---

## Moving to a New Computer

1. Copy the entire `weread-portable` folder to the new computer
2. **Windows**: Double-click `start.bat`
3. **Linux**: `chmod +x *.sh` then `./setup-linux.sh` → `./start-linux.sh`
4. If browser driver version mismatches, replace the driver file

---

## Uninstall

Just delete the entire `weread-portable` folder. Nothing is installed system-wide.

---

## What's Included (No External Dependencies Needed)

| Component | Version | Windows | Linux |
|-----------|---------|---------|-------|
| Node.js | 22.x | ✅ node.exe (~82MB) | ✅ node binary (~137MB) |
| weread-selenium-cli | 0.18.0 | ✅ | ✅ |
| selenium-webdriver | ^4.32.0 | ✅ | ✅ |
| EdgeDriver | bundled | ✅ edgedriver.exe | N/A |
| ChromeDriver | 148.0.7778 | ✅ chromedriver.exe | ✅ chromedriver |
| tesseract.js | ^7.0.0 | ✅ | ✅ |

---

*Package date: 2026-06-15*
*weread-selenium-cli: 0.18.0 (patched for portable use)*
*Modular architecture: weread-challenge.js split into lib/* modules*
*All paths use environment variables for portability*
*Log encoding: UTF-8 (fixed from v5.0)*

---

## New Features in v6.0

### Modular Architecture
- `weread-challenge.js` split into 9 modules in `lib/`
- Main entry reduced from 2206 to ~422 lines
- All modules exported for testing and reuse

### New Commands
```bash
node weread-challenge.js netease   # NetEase Music check-in
node weread-challenge.js health    # Selenium health check
```

### New Features
- **Webhook notifications**: Set `WEBHOOK_URL` env var to receive JSON callbacks
- **Config file**: Place `weread-challenge/.weread/config.json` for persistent settings
- **Unit tests**: `npm test` runs basic module tests

### Config File Example
```json
{
  "WEREAD_DURATION": 570,
  "WEREAD_SPEED": "Normal",
  "BARK_KEY": "YOUR_BARK_KEY",
  "WEBHOOK_URL": "https://your-webhook.com/notify"
}
```

---

*Package date: 2026-06-15*
*weread-selenium-cli: 0.18.0 (patched for portable use)*
*Modular architecture: 9 lib/* modules + config-file support*
*Tests: npm test passes all*

## Recent Updates (v6.0+)

### New Features Added
- **Enhanced Reading Loop**: Auto-scroll with retry logic and error recovery
- **Network Health Checks**: Periodic Selenium health monitoring during reading
- **Improved Error Handling**: Automatic recovery from scroll failures
- **Better Logging**: More detailed error messages and recovery attempts

### Technical Improvements
- `reader.js`: Added `autoScroll()` and `findElementWithRetry()` functions
- `network.js`: Added `fetchWithRetry()` for resilient HTTP requests
- Main entry: Integrated health checks and recovery logic in reading loop
- All modules now have proper error handling and retry mechanisms

### Testing
- Unit tests cover config, files, shell, config-file, reader, and network modules
- Run tests with: `npm test`
- All tests pass ✅

