#!/bin/bash
# scripts/publish-status.sh — 生成脱敏 status.json 并推送到 GitHub（供 Pages 展示）
set -e
cd /home/ubuntu/weread-portable-v6.0
NODE_BIN="$(command -v node || echo /home/ubuntu/weread-portable-v6.0/nodejs-linux/bin/node)"
"$NODE_BIN" scripts/build-status.js
if ! git diff --quiet -- docs/data/status.json; then
  git add docs/data/status.json
  git commit -m "chore: update status.json [$(date '+%Y-%m-%d %H:%M')]" >/dev/null
  git push origin main >/dev/null 2>&1 && echo "[publish] pushed $(date)" || echo "[publish] push failed $(date)"
else
  echo "[publish] no change $(date)"
fi
