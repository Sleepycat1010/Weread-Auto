#!/bin/bash
# ============================================================
#  WeRead Auto Reader - Linux/Ubuntu Launcher
#  Works on any Linux machine. No external install needed.
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR"

# --- Environment Variables ---
# On Linux, use Chrome (Edge not typically available)
export WEREAD_BROWSER="chrome"
export WEREAD_SELECTION="-1"
export WEREAD_SCREENSHOT="false"
export WEREAD_SPEED="Normal"
export WEREAD_DURATION="570"
export WEREAD_DATA_DIR="$ROOT/weread-challenge/.weread"
DEFAULT_BOOK_URL_FALLBACK="https://weread.qq.com/web/reader/21d32ac0574b1021d6327f6"
mkdir -p "$WEREAD_DATA_DIR"
export DEFAULT_BOOK_URL="$DEFAULT_BOOK_URL_FALLBACK"
export EMAIL_PORT="465"
export ENABLE_EMAIL="false"

# --- Node.js PATH ---
NODE_BIN="$ROOT/nodejs-linux/bin/node"
if [ -f "$NODE_BIN" ]; then
    chmod +x "$NODE_BIN" 2>/dev/null || true
    export PATH="$ROOT/nodejs-linux/bin:$PATH"
fi

# --- Print Info ---
echo
echo "========================================"
echo "  WeRead Auto Reader (Linux)"
echo "========================================"
echo "  ROOT:       $ROOT"
echo "  Browser:    $WEREAD_BROWSER"
echo "  Duration:   $WEREAD_DURATION min"
echo "  Book URL:   $DEFAULT_BOOK_URL"
echo "  DataDir:    $WEREAD_DATA_DIR"
echo

# --- Check Node.js ---
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found!"
    echo "        Make sure nodejs-linux/bin/node exists."
    exit 1
fi
echo "[OK] Node.js: $(node --version)"

# --- Check Browser ---
# Force priority: /usr/bin -> avoid snap version which has sandbox permission issues
export PATH="/usr/bin:$PATH"
HAS_BROWSER=false
if command -v chromium-browser &> /dev/null; then
    echo "[OK] Chromium: $(chromium-browser --version)"
    HAS_BROWSER=true
elif command -v google-chrome &> /dev/null; then
    echo "[OK] Chrome: $(google-chrome --version)"
    HAS_BROWSER=true
elif command -v chromium &> /dev/null; then
    echo "[OK] Chromium: $(chromium --version)"
    HAS_BROWSER=true
fi

if [ "$HAS_BROWSER" = false ]; then
    echo "[WARNING] No Chrome/Chromium found!"
    echo "          Run setup-linux.sh first, or install manually:"
    echo "          sudo apt install chromium-browser"
    exit 1
fi

# --- Make chromedriver executable ---
CD_PATH="$ROOT/weread-challenge/chromedriver"
if [ -f "$CD_PATH" ]; then
    chmod +x "$CD_PATH"
    echo "[OK] ChromeDriver: $CD_PATH"
else
    echo "[WARNING] ChromeDriver not found at $CD_PATH"
    echo "          Selenium will try to auto-detect"
fi

# --- Change to weread-challenge directory ---
cd "$ROOT/weread-challenge"

# --- Run ---
echo
echo "Starting..."
node "$ROOT/node_modules/weread-selenium-cli/src/weread-challenge.js" run

echo
echo "Done."