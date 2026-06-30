#!/bin/bash
# ============================================================
#  WeRead Auto Reader - Linux/Ubuntu Launcher  v2 (守护版)
#  支持：启动前清理旧进程、进程崩溃/被kill后自动重启
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR"
PID_FILE="$ROOT/weread-challenge/.weread/reader.pid"
DAEMON_LOG="$ROOT/weread-challenge/.weread/daemon.log"
HEARTBEAT_INTERVAL=300  # 每5分钟检查一次
MAX_RESTARTS=5          # 最多连续重启5次

# ---------- 工具函数 ----------
log_daemon() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [daemon] $1" | tee -a "$DAEMON_LOG"
}

kill_existing() {
    log_daemon "清理残留进程..."
    if [ -f "$PID_FILE" ]; then
        local old_pid
        old_pid=$(cat "$PID_FILE" 2>/dev/null || true)
        if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
            log_daemon "结束旧阅读器 PID=$old_pid"
            kill "$old_pid" 2>/dev/null || true
            sleep 2
            if kill -0 "$old_pid" 2>/dev/null; then
                kill -9 "$old_pid" 2>/dev/null || true
                sleep 1
            fi
        fi
        rm -f "$PID_FILE"
    fi
    # 兜底：杀所有残留
    pkill -f "weread-challenge.js run" 2>/dev/null || true
    pkill -f "chromedriver" 2>/dev/null || true
    sleep 2
    log_daemon "清理完成"
}

start_reader() {
    cd "$ROOT/weread-challenge"
    nohup node "$ROOT/node_modules/weread-selenium-cli/src/weread-challenge.js" run >> "$DAEMON_LOG" 2>&1 &
    local pid=$!
    echo "$pid" > "$PID_FILE"
    log_daemon "阅读器已启动，PID=$pid"
}

is_alive() {
    local pid
    pid=$(cat "$PID_FILE" 2>/dev/null || echo "")
    [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

# ---------- 环境变量 ----------
export WEREAD_BROWSER="chrome"
export WEREAD_SELECTION="-1"
export WEREAD_SCREENSHOT="false"
export WEREAD_SPEED="Normal"
export WEREAD_DURATION="570"
export WEREAD_DATA_DIR="$ROOT/weread-challenge/.weread"
export DEFAULT_BOOK_URL="https://weread.qq.com/web/reader/910323a0726c87629106646"
export EMAIL_PORT="465"
export ENABLE_EMAIL="false"

mkdir -p "$WEREAD_DATA_DIR"

# --- Node.js PATH ---
NODE_BIN="$ROOT/nodejs-linux/bin/node"
if [ -f "$NODE_BIN" ]; then
    chmod +x "$NODE_BIN" 2>/dev/null || true
    export PATH="$ROOT/nodejs-linux/bin:$PATH"
fi

# --- 打印信息 ---
echo
echo "========================================"
echo "  WeRead Auto Reader (Linux) 守护版"
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
    exit 1
fi
echo "[OK] Node.js: $(node --version)"

# --- Check Browser ---
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
    exit 1
fi

# --- Make chromedriver executable ---
CD_PATH="$ROOT/weread-challenge/chromedriver"
if [ -f "$CD_PATH" ]; then
    chmod +x "$CD_PATH"
    echo "[OK] ChromeDriver: $CD_PATH"
else
    echo "[WARNING] ChromeDriver not found at $CD_PATH"
fi

# ---------- 主流程 ----------
kill_existing
log_daemon "===== 守护启动 ====="
start_reader

# ---------- 守护循环 ----------
restart_count=0
while true; do
    sleep "$HEARTBEAT_INTERVAL"
    if ! is_alive; then
        restart_count=$((restart_count + 1))
        if [ "$restart_count" -gt "$MAX_RESTARTS" ]; then
            log_daemon "连续重启 $MAX_RESTARTS 次仍失败，放弃守护。"
            rm -f "$PID_FILE"
            exit 1
        fi
        log_daemon "检测到阅读器进程退出（第 $restart_count 次），自动重启..."
        start_reader
    else
        # 额外：检查阅读进度是否卡住（连续两次检查 reading_minute 没变）
        local current_min
        current_min=$(grep "Reading minute:" "$DAEMON_LOG" | tail -1 | sed 's/.*Reading minute:\s*//' | tr -d ' ')
        if [ -n "$current_min" ] && [ "$current_min" = "$last_min" ]; then
            log_daemon "警告：阅读进度卡住（minute=$current_min），尝试重启..."
            kill_existing
            start_reader
            restart_count=$((restart_count + 1))
        else
            last_min="$current_min"
            restart_count=0
            log_daemon "阅读器进程正常 (PID=$(cat "$PID_FILE"), minute=${current_min:-N/A})"
        fi
    fi
done
