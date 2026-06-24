#!/usr/bin/env node
/* scripts/build-status.js
 * 读取微信读书自动阅读脚本的本地状态文件 + 实时书架接口，生成 docs/data/status.json
 * ⚠️ 安全：状态文件与 cookies.json 同目录(.weread/)，本脚本只按字段白名单抽取，
 *         cookie 仅用于本地 HTTPS 请求微信读书书架接口，绝不写入输出文件。
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const WEREAD_DIR = path.join(ROOT, 'weread-challenge', '.weread');
const STATE_FILE = path.join(WEREAD_DIR, 'book-rotation-state.json');
const CONFIG_FILE = path.join(WEREAD_DIR, 'config.json');
const CRON_LOG = path.join(WEREAD_DIR, 'cron.log');
const COOKIE_FILE = path.join(WEREAD_DIR, 'cookies.json');
const OUT_DIR = path.join(ROOT, 'docs', 'data');
const OUT_FILE = path.join(OUT_DIR, 'status.json');

function safeRead(file) { try { return fs.readFileSync(file, 'utf8'); } catch { return null; } }
function safeJSON(file) { const raw = safeRead(file); if (!raw) return null; try { return JSON.parse(raw); } catch { return null; } }

function cleanTitle(t) { if (!t) return null; return String(t).split(' - ')[0].trim(); }

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

// 用本地 cookie 请求书架接口（cookie 不出本机，仅用于 HTTPS 头）
function fetchShelf(cookieArr) {
  return new Promise((resolve) => {
    if (!Array.isArray(cookieArr) || !cookieArr.length) return resolve(null);
    const cookie = cookieArr.map(c => `${c.name}=${c.value}`).join('; ');
    const req = https.request({
      hostname: 'weread.qq.com', path: '/web/shelf/sync', method: 'GET',
      headers: { 'Cookie': cookie, 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://weread.qq.com/' },
      timeout: 9000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

// 按选书逻辑推算下一本预计阅读书籍：
// 书架按最近阅读时间(updateTime)降序，跳过当前在读 / 排除关键词 / 已读完(finishReading 或 progress>=100)
function computeNextBook(shelf, state) {
  if (!shelf || !Array.isArray(shelf.books)) return null;
  const books = {};
  for (const b of shelf.books) books[b.bookId] = b;
  const prog = (shelf.bookProgress || []).slice().sort((a, b) => (b.updateTime || 0) - (a.updateTime || 0));
  const curId = state.currentBook && (String(state.currentBook.bookId));
  const curTitle = state.currentBook && state.currentBook.title;
  const exclKw = (state.excludedTitleKeywords || []).map(k => String(k || '').trim()).filter(Boolean);
  const exclTitles = (state.excludedBooks || []).map(b => cleanTitle(b && b.title)).filter(Boolean);

  const list = [];
  for (const p of prog) {
    const b = books[p.bookId];
    if (!b) continue;
    const t = b.title || '';
    if (curTitle && t === curTitle) continue;
    if (exclKw.some(k => t.includes(k))) continue;
    if (exclTitles.includes(cleanTitle(t))) continue;
    if (b.finishReading || (p.progress || 0) >= 100) continue;
    list.push({ title: t, author: b.author || null, progress: p.progress || 0 });
    if (list.length >= 4) break;
  }
  return list.length ? { next: list[0], upcoming: list } : null;
}

async function main() {
  const state = safeJSON(STATE_FILE) || {};
  const config = safeJSON(CONFIG_FILE) || {};
  const logText = safeRead(CRON_LOG);
  const cookieArr = safeJSON(COOKIE_FILE);

  // 当前在读
  const cur = state.currentBook || {};
  const currentBook = cur.title ? {
    title: cleanTitle(cur.title), bookId: cur.bookId || null,
    selectedAt: cur.selectedAt || null, source: cur.source || null,
  } : null;

  // 已读完书籍
  const usedBooks = Array.isArray(state.usedBooks) ? state.usedBooks : [];
  const finishedBooks = usedBooks.filter(b => b && b.finishedAt)
    .map(b => ({ title: cleanTitle(b.title), author: b.author || null, finishedAt: b.finishedAt }));

  // 去重已读完书名（统计唯一书籍数）
  const uniqFinishedTitles = [...new Set(finishedBooks.map(b => b.title).filter(Boolean))];

  // 排除书单
  const excludedBooks = Array.isArray(state.excludedBooks)
    ? state.excludedBooks.map(b => cleanTitle(b && b.title)).filter(Boolean) : [];

  // 时长统计
  const byDate = parseReadingByDate(logText);
  const dates = Object.keys(byDate).sort();
  const totalMinutes = dates.reduce((s, d) => s + byDate[d], 0);

  // 实时书架推算下一本；接口失效(登录超时)时回退沿用上次成功数据，避免页面变空
  let nextBook = null, upcomingBooks = [], nextFromCache = false;
  const shelf = await fetchShelf(cookieArr);
  const computed = computeNextBook(shelf, state);
  if (computed) {
    nextBook = computed.next; upcomingBooks = computed.upcoming;
  } else {
    // 接口不可用时回退旧缓存，但仍按最新排除规则过滤，避免显示已排除/已读书目
    const prev = safeJSON(OUT_FILE);
    const exclKw = (state.excludedTitleKeywords || []).map(k => String(k || '').trim()).filter(Boolean);
    const exclTitles = (state.excludedBooks || []).map(b => cleanTitle(b && b.title)).filter(Boolean);
    const curTitle = state.currentBook && cleanTitle(state.currentBook.title);
    const isExcluded = (t) => {
      const title = cleanTitle(t) || '';
      if (curTitle && title === curTitle) return true;
      if (exclKw.some(k => title.includes(k))) return true;
      if (exclTitles.includes(title)) return true;
      return false;
    };
    const prevList = (prev && Array.isArray(prev.upcomingBooks)) ? prev.upcomingBooks : [];
    const filtered = prevList.filter(b => b && !isExcluded(b.title));
    if (filtered.length) {
      nextBook = filtered[0]; upcomingBooks = filtered; nextFromCache = true;
    } else if (prev && prev.nextBook && !isExcluded(prev.nextBook.title)) {
      nextBook = prev.nextBook; upcomingBooks = prev.upcomingBooks || []; nextFromCache = true;
    }
  }

  const status = {
    updatedAt: new Date().toISOString(),
    currentBook,
    nextBook,                 // 下一本预计阅读的书籍（实时书架推算）
    upcomingBooks,            // 后续候选队列
    nextLeaderboard: state.currentLeaderboard || null,
    nextSourceHint: nextBook
      ? (nextFromCache ? '我的书架（上次同步推算，待下次登录态刷新）' : '我的书架（按最近阅读 + 排除已读/书单推算）')
      : (shelf ? '书架暂无可读新书' : '书架接口暂不可用'),
    stats: {
      runDays: dates.length,
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      finishedCount: finishedBooks.length,
      finishedUniqueCount: uniqFinishedTitles.length,
      currentRunCount: state.currentRunCount || 0,
      dailyTargetMinutes: config.WEREAD_DURATION || null,
      avgMinutes: dates.length ? Math.round(totalMinutes / dates.length) : 0,
      lastRunAt: state.lastRunAt || null,
    },
    dailyMinutes: dates.map(d => ({ date: d, minutes: byDate[d] })),
    finishedBooks,
    excludedBooks,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(status, null, 2), 'utf8');
  console.log(`[build-status] wrote ${OUT_FILE}`);
  console.log(`  runDays=${dates.length} totalMin=${totalMinutes} finished=${finishedBooks.length} cur=${currentBook && currentBook.title} next=${nextBook && nextBook.title}`);
}

main();
