#!/usr/bin/env node
/**
 * WeRead Auto Reader - Cross-Platform Setup Script
 * Auto-detects OS and runs the appropriate setup steps.
 * Usage: node setup.js
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const ROOT = path.resolve(__dirname);
const PLATFORM = os.platform(); // "win32" | "linux" | "darwin"

function log(icon, msg) {
  console.log(`${icon} ${msg}`);
}

function logSection(title) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`  ${title}`);
  console.log("=".repeat(50));
}

function runQuiet(cmd, args) {
  try {
    const isWin = PLATFORM === "win32";
    // On Windows, run via cmd.exe /c so built-ins like `where` work
    const fullCmd = isWin
      ? `cmd.exe /c "${cmd} ${args.map(a => `"${a}"`).join(" ")}"`
      : `${cmd} ${args.join(" ")}`;
    const result = execSync(fullCmd, {
      cwd: ROOT,
      stdio: "pipe",
      shell: true,
      encoding: "utf8",
    });
    return { ok: true, output: result.toString().trim() };
  } catch (e) {
    const out = e.stdout ? e.stdout.toString().trim() : "";
    const err = e.stderr ? e.stderr.toString().trim() : "";
    return { ok: false, output: out || err || e.message };
  }
}

function findEdgeOnWindows() {
  // Method 1: Check EdgeCore folder (most reliable)
  const edgeCore = "C:\\Program Files (x86)\\Microsoft\\EdgeCore";
  if (fs.existsSync(edgeCore)) {
    const entries = fs.readdirSync(edgeCore, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const exePath = path.join(edgeCore, entry.name, "msedge.exe");
        if (fs.existsSync(exePath)) return exePath;
      }
    }
  }

  // Method 2: Check registry via PowerShell
  try {
    const psResult = execSync(
      'powershell.exe -NoProfile -Command "(Get-ItemProperty \'HKLM:\\SOFTWARE\\Microsoft\\EdgeCore\' -ErrorAction SilentlyContinue | ForEach-Object { $_.PSChildName }) 2>$null"',
      { encoding: "utf8", stdio: "pipe", shell: true }
    );
    const version = psResult.toString().trim();
    if (version) {
      const exePath = path.join(edgeCore, version, "msedge.exe");
      if (fs.existsSync(exePath)) return exePath;
    }
  } catch (_) {}

  // Method 3: Check uninstall registry for InstallLocation
  try {
    const psResult = execSync(
      'powershell.exe -NoProfile -Command "(Get-ItemProperty \'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Microsoft Edge\' -ErrorAction SilentlyContinue).InstallLocation 2>$null"',
      { encoding: "utf8", stdio: "pipe", shell: true }
    );
    const loc = psResult.toString().trim();
    if (loc) {
      const exePath = path.join(loc, "msedge.exe");
      if (fs.existsSync(exePath)) return exePath;
    }
  } catch (_) {}

  return null;
}

function findChromeOnWindows() {
  const paths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  // Try `where chrome.exe`
  try {
    const r = execSync("cmd.exe /c where chrome.exe 2>nul", {
      encoding: "utf8", stdio: "pipe", shell: true,
    });
    const found = r.toString().trim().split("\n")[0];
    if (found && fs.existsSync(found.trim())) return found.trim();
  } catch (_) {}
  return null;
}

// ============================================================
// MAIN
// ============================================================

logSection(`WeRead Auto Reader - Setup (${PLATFORM})`);
console.log(`  ROOT:  ${ROOT}`);
console.log(`  Platform: ${PLATFORM}`);

// ---- Step 1: Check bundled / system Node.js ----
logSection("Step 1/5 - Checking Node.js");

let nodeExe;
if (PLATFORM === "win32") {
  const winNode = path.join(ROOT, "nodejs", "node.exe");
  if (fs.existsSync(winNode)) {
    const r = runQuiet(`"${winNode}"`, ["--version"]);
    if (r.ok) log("✅", `Bundled Node.js (Windows): ${r.output}`);
    else { log("❌", "Bundled node.exe exists but failed to run"); process.exit(1); }
    nodeExe = `"${winNode}"`;
  }
} else {
  const linuxNode = path.join(ROOT, "nodejs-linux", "bin", "node");
  if (fs.existsSync(linuxNode)) {
    try { fs.chmodSync(linuxNode, "755"); } catch (_) {}
    const r = runQuiet(`"${linuxNode}"`, ["--version"]);
    if (r.ok) log("✅", `Bundled Node.js (Linux): ${r.output}`);
    else { log("❌", "Bundled node (Linux) exists but failed to run"); process.exit(1); }
    nodeExe = `"${linuxNode}"`;
  }
}

if (!nodeExe) {
  // Fallback to system Node.js
  const r = runQuiet("node", ["--version"]);
  if (r.ok) {
    log("✅", `System Node.js: ${r.output}`);
    nodeExe = "node";
  } else {
    log("❌", "Node.js not found! Install from https://nodejs.org/");
    log("ℹ️ ", "Or re-extract the full weread-portable package.");
    process.exit(1);
  }
}

// ---- Step 2: Check browser ----
logSection("Step 2/5 - Checking browser");

if (PLATFORM === "win32") {
  const edgePath = findEdgeOnWindows();
  if (edgePath) {
    log("✅", `Microsoft Edge found: ${edgePath}`);
  } else {
    log("⚠️ ", "Microsoft Edge not found.");
  }

  const chromePath = findChromeOnWindows();
  if (chromePath) {
    log("✅", `Google Chrome found: ${chromePath}`);
  } else {
    log("⚠️ ", "Google Chrome not found.");
  }

  if (!edgePath && !chromePath) {
    log("⚠️ ", "No supported browser found. Please install Edge or Chrome.");
  }

} else if (PLATFORM === "linux") {
  const browsers = ["google-chrome", "chromium-browser", "chromium", "brave-browser"];
  let found = false;
  for (const b of browsers) {
    const r = runQuiet("which", [b]);
    if (r.ok) { log("✅", `${b} found: ${r.output}`); found = true; break; }
  }
  if (!found) {
    log("⚠️ ", "No Chrome/Chromium found.");
    log("ℹ️ ", "Install with: sudo apt install chromium-browser");
    log("ℹ️ ", "Or:        sudo snap install chromium");
  }
} else if (PLATFORM === "darwin") {
  const r = runQuiet("which", ["google-chrome"]);
  if (r.ok) log("✅", `Google Chrome found: ${r.output}`);
  else log("⚠️ ", "Chrome not found. Install from https://google.com/chrome/");
}

// ---- Step 3: Check WebDriver ----
logSection("Step 3/5 - Checking WebDriver");

if (PLATFORM === "win32") {
  const edgeDriver = path.join(ROOT, "weread-challenge", "edgedriver.exe");
  if (fs.existsSync(edgeDriver)) {
    log("✅", `EdgeDriver found: ${edgeDriver}`);
  } else {
    log("⚠️ ", "edgedriver.exe not found in weread-challenge/");
    log("ℹ️ ", "Download from: https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/");
  }
} else if (PLATFORM === "linux") {
  const chromeDriver = path.join(ROOT, "weread-challenge", "chromedriver");
  if (fs.existsSync(chromeDriver)) {
    try { fs.chmodSync(chromeDriver, "755"); } catch (_) {}
    log("✅", `ChromeDriver found: ${chromeDriver}`);
  } else {
    log("⚠️ ", "chromedriver not found in weread-challenge/");
    log("ℹ️ ", "It will be auto-downloaded on first run if needed.");
  }
}

// ---- Step 4: Create data directory ----
logSection("Step 4/5 - Setting up data directory");

const dataDir = path.join(ROOT, "weread-challenge", ".weread");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  log("✅", `Created data directory: ${dataDir}`);
} else {
  log("✅", `Data directory exists: ${dataDir}`);
}

// ---- Step 5: Platform-specific setup ----
logSection("Step 5/5 - Platform-specific setup");

if (PLATFORM === "win32") {
  // Create desktop shortcut via PowerShell
  const desktop = process.env.USERPROFILE
    ? path.join(process.env.USERPROFILE, "Desktop")
    : null;
  if (desktop) {
    const shortcutPath = path.join(desktop, "WeRead.lnk");
    const startBat = path.join(ROOT, "start.bat");
    // Build PowerShell command (escape single quotes)
    const psCmd = [
      `$WshShell = New-Object -ComObject WScript.Shell`,
      `$Shortcut = $WshShell.CreateShortcut('${(shortcutPath)}')`,
      `$Shortcut.TargetPath = '${(startBat.replace(/'/g, "'"))}'`,
      `$Shortcut.WorkingDirectory = '${(ROOT.replace(/'/g, "'"))}'`,
      `$Shortcut.Description = 'WeRead Auto Reader'`,
      `$Shortcut.Save()`,
    ].join("; ");
    const r = runQuiet("powershell.exe", ["-NoProfile", "-Command", psCmd]);
    if (r.ok) log("✅", `Desktop shortcut created: ${shortcutPath}`);
    else log("⚠️ ", "Could not create desktop shortcut (permission denied?)");
  }

  // Make .bat files readable
  log("✅", "Windows setup complete. Double-click start.bat to run.");

} else if (PLATFORM === "linux" || PLATFORM === "darwin") {
  // Make shell scripts executable
  const scripts = ["start-linux.sh", "setup-linux.sh"];
  for (const s of scripts) {
    const p = path.join(ROOT, s);
    if (fs.existsSync(p)) {
      try {
        fs.chmodSync(p, "755");
        log("✅", `Made executable: ${s}`);
      } catch (e) {
        log("⚠️ ", `Could not chmod ${s}: ${e.message}`);
      }
    }
  }

  if (PLATFORM === "linux") {
    console.log("");
    console.log("  To install Chromium (if not present):");
    console.log("    sudo apt update && sudo apt install -y chromium-browser");
    console.log("  Or run:  ./setup-linux.sh");
  }
}

// ---- Done ----
logSection("Setup Complete!");
if (PLATFORM === "win32") {
  console.log("  ➡️  Double-click start.bat to start reading");
  console.log("  ➡️  Desktop shortcut: WeRead.lnk");
} else {
  console.log("  ➡️  Run:  ./start-linux.sh");
  console.log("  ➡️  First run will open browser for QR code login");
}
console.log("");
