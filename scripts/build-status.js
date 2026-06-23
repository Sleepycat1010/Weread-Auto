#!/usr/bin/env node
/* scripts/build-status.js
 * 读取微信读书自动阅读脚本的本地状态文件，抽取【白名单脱敏字段】生成 docs/data/status.json
 * ⚠️ 安全：状态文件与 cookies.json 同目录(.weread/)，本脚本只按字段白名单抽取，绝不拷贝 cookie/敏感文件
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WEREAD_DIR = path.join(ROOT, 'weread-challenge', '.weread');
const STATE_FILE = path.join(WEREAD_DIR, 'book-rotation-state.json');
const CONFIG_FILE = path.join(WEREAD_DIR, 'config.json');
const CRON_LOG = path.join(WEREAD_DIR, 'cron.log');
const OUT_DIR = path.join(ROOT, 'docs', 'data');
const OUT_FILE = path.join(OUT_DIR, 'status.json');

function safeRead(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}
function safeJSON(file) {
  const raw = safeRead(file);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// 从 cron.log 解析每天阅读时长（取每日最大 Reading minute）
function parseReadingByDate(logText) {
  const byDate = {};
  if (!logText) return byDate;
  const re = /\[(\d{4}-\d{2}-\d{2})[^\]]*\]:\s*Reading minute:\s*(\d+)/g;
  let m;
  while ((m = re.exec(logText)) !== null) {
    const d = m[1], min = parseInt(m[2], 10);
    if (!byDate[d] || min > byDate[d]) byDate[d] = min;
  }
  return byDate;
}

function main() {
  const state = safeJSON(STATE_FILE) || {};
  const config = safeJSON(CONFIG_FILE) || {};
  const logText = safeRead(CRON_LOG);

  // 当前在读
  const cur = state.currentBook || {};
  const currentBook = cur.title ? {
    title: cur.title,
    bookId: cur.bookId || null,
    selectedAt: cur.selectedAt || null,
    source: cur.source || null,
  } : null;

  // 已读完书籍（白名单：只留标题/作者/读完时间）
  const usedBooks = Array.isArray(state.usedBooks) ? state.usedBooks : [];
  const finishedBooks = usedBooks
    .filter(b => b && b.finishedAt)
    .map(b => ({ title: cleanTitle(b.title), author: b.author || null, finishedAt: b.finishedAt }));
  const finishedCount = finishedBooks.length;

  // 下一本：当前榜单里第一本未读且未排除的；无法精确时给出榜单名提示
  const nextHint = state.currentLeaderboard || null;

  // 排除书单
  const excludedBooks = Array.isArray(state.excludedBooks)
    ? state.excludedBooks.map(b => cleanTitle(b && b.title)).filter(Boolean) : [];

  // 时长统计
  const byDate = parseReadingByDate(logText);
  const dates = Object.keys(byDate).sort();
  const totalMinutes = dates.reduce((s, d) => s + byDate[d], 0);
  const runDays = dates.length;
  const dailyTarget = config.WEREAD_DURATION || null; // 每日目标分钟

  const status = {
    updatedAt: new Date().toISOString(),
    currentBook,
    nextLeaderboard: nextHint,
    stats: {
      runDays,
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      finishedCount,
      currentRunCount: state.currentRunCount || 0,
      dailyTargetMinutes: dailyTarget,
      lastRunAt: state.lastRunAt || null,
    },
    dailyMinutes: dates.map(d => ({ date: d, minutes: byDate[d] })),
    finishedBooks,
    excludedBooks,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(status, null, 2), 'utf8');
  console.log(`[build-status] wrote ${OUT_FILE}`);
  console.log(`  runDays=${runDays} totalMinutes=${totalMinutes} finished=${finishedCount} current=${currentBook && currentBook.title}`);
}

// 清理标题里可能带的 " - 章节 - 作者 - 微信读书" 尾缀
function cleanTitle(t) {
  if (!t) return null;
  return String(t).split(' - ')[0].trim();
}

main();
