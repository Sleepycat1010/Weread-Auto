// /home/ubuntu/weread-portable-v6.0/patches/shelf-probe.js
// 探针：用现成 cookies.json（保留双 wr_gid，原样 addCookie）启动 headless chrome，
// 在活会话内 fetch /web/shelf/sync，dump books 全字段 + 关键书 + bookProgress，
// 用于确认 deepLink 真实格式（https 网页链接 vs weread:// scheme）。
const { Builder, Browser } = require("selenium-webdriver");
const chromeServiceBuilder = require("selenium-webdriver/chrome");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const COOKIE = path.join(ROOT, "weread-challenge", ".weread", "cookies.json");
const CD = path.join(ROOT, "weread-challenge", "chromedriver");

(async () => {
  const cookies = JSON.parse(fs.readFileSync(COOKIE, "utf8"));
  const options = new chromeServiceBuilder.Options();
  options.addArguments("--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu",
    "--disable-dev-shm-usage", "--headless=new", "--window-size=1400,900");
  options.setChromeBinaryPath("/opt/google/chrome/chrome");
  const chromeService = new chromeServiceBuilder.ServiceBuilder(CD);
  const driver = await new Builder()
    .forBrowser(Browser.CHROME)
    .setChromeService(chromeService)
    .setChromeOptions(options)
    .build();
  try {
    await driver.get("https://weread.qq.com/web/shelf");
    await new Promise(r => setTimeout(r, 2500));
    for (const c of cookies) {
      try { await driver.manage().addCookie(c); } catch (e) { /* 忽略单条失败 */ }
    }
    await driver.get("https://weread.qq.com/web/shelf");
    await new Promise(r => setTimeout(r, 3500));
    const raw = await driver.executeScript(`
      return fetch('/web/shelf/sync', { credentials: 'include' })
        .then(r => r.text()).catch(e => 'FETCH_ERR:' + e);
    `);
    let j; try { j = JSON.parse(raw); } catch { j = null; }
    if (!j) { console.log("RAW:", String(raw).slice(0, 1000)); await driver.quit(); return; }
    const books = j.books || [];
    const prog = j.bookProgress || [];
    console.log("OK books=" + books.length + " progress=" + prog.length + " synckey=" + j.synckey + " errCode=" + j.errCode);
    if (books[0]) console.log("BOOK0: " + JSON.stringify(books[0]));
    for (const kw of ["犹太人", "全球高武", "剑来", "明朝"]) {
      const hit = books.find(b => (b.title || "").includes(kw));
      if (hit) {
        const p = prog.find(x => String(x.bookId) === String(hit.bookId));
        console.log("HIT[" + kw + "]: book=" + JSON.stringify(hit) + " | progress=" + JSON.stringify(p));
      }
    }
    // 按最近阅读排序的前 12（候选队列）
    const cand = books
      .filter(b => !b.finishReading)
      .sort((a, b) => (b.readUpdateTime || 0) - (a.readUpdateTime || 0));
    console.log("RECENT12: " + cand.slice(0, 12).map(b => `${b.title}(prog=${(prog.find(x=>String(x.bookId)===String(b.bookId))||{}).progress}, id=${b.bookId}, dl=${b.deepLink||'-'})`).join(" || "));
  } finally {
    await driver.quit();
  }
})().catch(e => { console.error("PROBE_ERR", e.stack || e.message); process.exit(1); });
