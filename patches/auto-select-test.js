// /home/ubuntu/weread-portable-v6.0/patches/auto-select-test.js
// 验证 B 方案 selectNextBookFromShelf：登录活会话 → 调自动选书 → 打印选中结果 + 写回的 rotation state。
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
process.chdir(path.join(ROOT, "weread-challenge"));
process.env.WEREAD_DATA_DIR = path.join(ROOT, "weread-challenge", ".weread");
process.env.WEREAD_BROWSER = "chrome";
process.env.DEFAULT_BOOK_URL = "https://weread.qq.com/web/reader/910323a0726c87629106646";

const { Builder, Browser } = require("selenium-webdriver");
const chromeServiceBuilder = require("selenium-webdriver/chrome");
const fs = require("fs");
const mod = require(path.join(ROOT, "node_modules/weread-selenium-cli/src/weread-challenge.js"));

(async () => {
  const cookies = JSON.parse(fs.readFileSync(process.env.WEREAD_DATA_DIR + "/cookies.json", "utf8"));
  const options = new chromeServiceBuilder.Options();
  options.addArguments("--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu",
    "--disable-dev-shm-usage", "--headless=new", "--window-size=1400,900");
  options.setChromeBinaryPath("/opt/google/chrome/chrome");
  const chromeService = new chromeServiceBuilder.ServiceBuilder(path.join(ROOT, "weread-challenge", "chromedriver"));
  const driver = await new Builder().forBrowser(Browser.CHROME)
    .setChromeService(chromeService).setChromeOptions(options).build();
  try {
    await driver.get("https://weread.qq.com/web/shelf");
    await new Promise(r => setTimeout(r, 2500));
    for (const c of cookies) { try { await driver.manage().addCookie(c); } catch (e) {} }
    await driver.get("https://weread.qq.com/web/shelf");
    await new Promise(r => setTimeout(r, 3500));

    const pick = await mod.selectNextBookFromShelf(driver);
    console.log("SELECT_RESULT:", JSON.stringify(pick, null, 2));

    const st = JSON.parse(fs.readFileSync(process.env.WEREAD_DATA_DIR + "/book-rotation-state.json", "utf8"));
    console.log("CURRENT_BOOK_STATE:", JSON.stringify(st.currentBook, null, 2));
  } finally {
    await driver.quit();
  }
})().catch(e => { console.error("TEST_ERR", e.stack || e.message); process.exit(1); });
