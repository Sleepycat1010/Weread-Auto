#!/bin/bash
# ============================================================
#  WeRead Auto Reader - Linux/Ubuntu Launcher  v2.2 (断点续读版)
#  支持：自动清理旧进程、进程崩溃/被kill后自动重启、
#        阅读卡住检测、断点续读（多轮累计）
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR"
PID_FILE="$ROOT/weread-challenge/.weread/reader.pid"
DAEMON_LOG="$ROOT/weread-challenge/.weread/cron.log"
PROGRESS_FILE="$ROOT/weread-challenge/.weread/progress.json"
HEARTBEAT_INTERVAL=300  # 每5分钟检查一次
MAX_RESTARTS=5          # 最多连续重启5次
TARGET_DURATION=570     # 每日目标时长（分钟）

# ---------- 清场函数 ----------
cleanup_all() {
    log_daemon "清场：杀掉所有残留 Chrome/Chromedriver 进程..."
    # 注意：不杀 weread-challenge.js，那由 kill_existing() 负责
    pkill -9 chromedriver 2>/dev/null || true
    # 杀掉所有 headless Chrome 实例（包括残留的 zygote/renderer/gpu 子进程）
    pkill -9 -f 'chrome.*headless' 2>/dev/null || true
    sleep 1
    # 清理残留的临时 user-data-dir
    rm -rf /tmp/org.chromium.Chromium.scoped_dir.* 2>/dev/null || true
    log_daemon "清场完成"
}

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
    pkill -f "weread-challenge.js run" 2>/dev/null || true
    pkill -f "chromedriver" 2>/dev/null || true
    # 杀掉前一天残留的 headless Chrome 主进程及子进程
    pkill -9 -f 'chrome.*headless' 2>/dev/null || true
    sleep 1
    # 清理残留的临时 user-data-dir
    rm -rf /tmp/org.chromium.Chromium.scoped_dir.* 2>/dev/null || true
    sleep 1
    log_daemon "清理完成"
}

# 初始化进度文件（按天重置）
init_progress() {
    local today
    today=$(date +%Y-%m-%d)
    if [ -f "$PROGRESS_FILE" ]; then
        local file_date
        file_date=$(python3 -c "import json; print(json.load(open('$PROGRESS_FILE')).get('date',''))" 2>/dev/null || echo "")
        if [ "$file_date" = "$today" ]; then
            return
        fi
    fi
    echo "{\"date\":\"$today\",\"rounds\":[],\"target\":$TARGET_DURATION}" > "$PROGRESS_FILE"
    log_daemon "初始化今日进度文件"
}

# 从所有日志提取今日最大的 Reading minute
get_latest_minute() {
    local max_min=0
    for logf in "$DAEMON_LOG" "$ROOT/weread-challenge/.weread/output.log"; do
        local min
        min=$(grep "Reading minute:" "$logf" 2>/dev/null | grep "$(date '+%Y-%m-%d')" | tail -1 | sed 's/.*Reading minute:\s*//' | tr -d ' ')
        if [ -n "$min" ] && [ "$min" -gt "$max_min" ] 2>/dev/null; then
            max_min="$min"
        fi
    done
    if [ "$max_min" -gt 0 ]; then
        echo "$max_min"
    fi
}

# 进程退出时：将本轮 final_min 加入 rounds
finalize_round() {
    local final_min
    final_min=$(get_latest_minute)
    if [ -n "$final_min" ] && [ "$final_min" -ge 0 ] 2>/dev/null; then
        python3 -c "
import json
with open('$PROGRESS_FILE') as f: d = json.load(f)
if d.get('date') == '$(date +%Y-%m-%d)':
    rounds = d.get('rounds', [])
    # 避免重复添加（防止同一轮 finalize 两次）
    if not rounds or rounds[-1] != int($final_min):
        rounds.append(int($final_min))
        d['rounds'] = rounds
        with open('$PROGRESS_FILE', 'w') as f: json.dump(d, f)
        print(f'[progress] rounds={rounds}')
" 2>/dev/null | tee -a "$DAEMON_LOG"
    fi
}

# 计算剩余时长
get_remaining() {
    python3 -c "
import json
with open('$PROGRESS_FILE') as f: d = json.load(f)
rounds = d.get('rounds', [])
total = sum(rounds)
target = d.get('target', $TARGET_DURATION)
remaining = target - total
print(max(0, remaining))
" 2>/dev/null || echo "$TARGET_DURATION"
}

start_reader() {
    local remaining
    remaining=$(get_remaining)
    if [ "$remaining" -eq 0 ]; then
        log_daemon "今日目标已达成（$TARGET_DURATION 分钟），守护结束"
        return 1
    fi
    cd "$ROOT/weread-challenge"
    export WEREAD_DURATION="$remaining"
    nohup node "$ROOT/node_modules/weread-selenium-cli/src/weread-challenge.js" run >> "$DAEMON_LOG" 2>&1 &
    local pid=$!
    echo "$pid" > "$PID_FILE"
    log_daemon "阅读器已启动，PID=$pid，剩余时长=${remaining}分钟"
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
export WEREAD_SPEED="slow"
export WEREAD_DATA_DIR="$ROOT/weread-challenge/.weread"
export DEFAULT_BOOK_URL="https://weread.qq.com/web/reader/910323a0726c87629106646"
export EMAIL_PORT="465"
export ENABLE_EMAIL="false"
# 硬编码Chrome二进制路径，避免selenium/puppeteer找到旧版本缓存
export CHROME_PATH="/opt/google/chrome/chrome"
export PUPPETEER_EXECUTABLE_PATH="/opt/google/chrome/chrome"
export GOOGLE_CHROME_BIN="/opt/google/chrome/chrome"

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
echo "  WeRead Auto Reader (Linux) 断点续读版"
echo "========================================"
echo "  ROOT:       $ROOT"
echo "  Browser:    $WEREAD_BROWSER"
echo "  Target:     $TARGET_DURATION min"
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
init_progress
log_daemon "===== 守护启动 ====="

# 先尝试启动
start_reader || { log_daemon "无需启动，退出"; cleanup_all; exit 0; }

# ---------- 守护循环 ----------
restart_count=0
last_min=""
while true; do
    sleep "$HEARTBEAT_INTERVAL"

    if ! is_alive; then
        # 进程退出了：先 finalize 本轮，再重启
        finalize_round
        # 检查最近日志是否是登录态失效导致退出，若是则停止守护避免无限重启
        if tail -50 "$DAEMON_LOG" 2>/dev/null | grep -q "LOGIN_INVALID"; then
            log_daemon "❌ 检测到登录态失效（LOGIN_INVALID），停止守护。请重新扫码登录后再启动。"
            cleanup_all
            rm -f "$PID_FILE"
            exit 2
        fi
        restart_count=$((restart_count + 1))
        if [ "$restart_count" -gt "$MAX_RESTARTS" ]; then
            log_daemon "连续重启 $MAX_RESTARTS 次仍失败，放弃守护。"
            cleanup_all
            rm -f "$PID_FILE"
            exit 1
        fi
        log_daemon "检测到阅读器进程退出（第 $restart_count 次），自动重启..."
        start_reader || { log_daemon "剩余时长为0，守护结束"; cleanup_all; exit 0; }
        last_min=""
    else
        # 进程还在跑：检查是否卡住
        current_min=$(get_latest_minute)
        if [ -n "$current_min" ] && [ "$current_min" = "$last_min" ]; then
            log_daemon "警告：阅读进度卡住（minute=$current_min），尝试重启..."
            kill_existing
            finalize_round
            cleanup_all
            sleep 2
            start_reader || { log_daemon "剩余时长为0，守护结束"; cleanup_all; exit 0; }
            restart_count=$((restart_count + 1))
            last_min=""
        else
            last_min="$current_min"
            restart_count=0
            remaining=$(get_remaining)
            log_daemon "阅读器正常 (PID=$(cat "$PID_FILE"), minute=${current_min:-N/A}, 剩余${remaining}分钟)"
        fi
    fi
done
