// /home/ubuntu/weread-portable-v6.0/patches/auto-select.test.js
// 单元测试：chooseNextShelfBook 纯选书算法（不依赖浏览器，可确定性验证）。
// 数据取自 2026-09-09 书架探针（weread.qq.com/web/shelf/sync）真实回包。
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const mod = require(path.join(ROOT, "node_modules/weread-selenium-cli/src/weread-challenge.js"));
const choose = mod.chooseNextShelfBook;

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; console.log("  ✔ " + msg); }
  else { fail++; console.log("  ✘ " + msg); }
}
const DL = (id) => `https://weread.qq.com/book-detail?type=1&v=${id}`;

console.log("== case 1: 默认 rotation（卡死书被跳过，续读读了一半的书）==");
// 现状：currentBook=犹太人四千年(99% 卡死)，排除 青山/牧神记；全球高武 47% 在读
const state1 = {
  currentBook: { title: "犹太人四千年（全两册）", bookId: "40666978", selectedAt: "2026-07-10T08:00:00Z" },
  usedBookIds: [], usedShelfBookIds: [],
  excludedBooks: [{ title: "青山" }, { title: "牧神记（同名国漫原著）" }],
  excludedTitleKeywords: [],
};
const books1 = [
  { bookId: "40666978", title: "犹太人四千年（全两册）", deepLink: DL("910323a0726c87629106646"), finishReading: 0, readUpdateTime: 1781330939 },
  { bookId: "22237441", title: "全球高武", deepLink: DL("9a932ec0715351019a95869"), finishReading: 0, readUpdateTime: 1781000000 },
  { bookId: "43014772", title: "青山", deepLink: DL("0fa32e3072905a740fa747c"), finishReading: 0, readUpdateTime: 1782000000 },
  { bookId: "822995", title: "明朝那些事儿（全集）", deepLink: DL("a57325c05c8ed3a57224187"), finishReading: 0, readUpdateTime: 1780000000 },
];
const prog1 = [
  { bookId: "40666978", progress: 99 },
  { bookId: "22237441", progress: 47 },
  { bookId: "43014772", progress: 100 },
  { bookId: "822995", progress: 95 },
];
const r1 = choose(books1, prog1, state1);
assert(r1 && r1.title === "全球高武" && r1.progress === 47 && r1.readerId === "9a932ec0715351019a95869",
  "选中国球高武(47% 续读)，跳过 99% 卡死的犹太人和已排除的青山\n     -> " + JSON.stringify(r1));

console.log("== case 2: 99% 且 finishReading=0 也视为卡死跳过 ==");
const state2 = { currentBook: null, usedBookIds: [], usedShelfBookIds: [], excludedBooks: [], excludedTitleKeywords: [] };
const books2 = [
  { bookId: "1", title: "卡死书", deepLink: DL("aaaa"), finishReading: 0, readUpdateTime: 5 },
  { bookId: "2", title: "新书A", deepLink: DL("bbbb"), finishReading: 0, readUpdateTime: 1 },
];
const prog2 = [{ bookId: "1", progress: 99 }, { bookId: "2", progress: 0 }];
const r2 = choose(books2, prog2, state2);
assert(r2 && r2.title === "新书A" && r2.reason === "start_new_book",
  "跳过 99% 卡死书，开一本新的(新书A, start_new_book)\n     -> " + JSON.stringify(r2));

console.log("== case 3: 已读完(finishReading=1)被跳过 ==");
const books3 = [
  { bookId: "1", title: "读完书", deepLink: DL("c1"), finishReading: 1, readUpdateTime: 9 },
  { bookId: "2", title: "在读书", deepLink: DL("c2"), finishReading: 0, readUpdateTime: 2 },
];
const prog3 = [{ bookId: "2", progress: 30 }];
const r3 = choose(books3, prog3, { currentBook: null, usedBookIds: [], usedShelfBookIds: [], excludedBooks: [], excludedTitleKeywords: [] });
assert(r3 && r3.title === "在读书" && r3.progress === 30,
  "跳过 finishReading=1，续读在读书(30%)\n     -> " + JSON.stringify(r3));

console.log("== case 4: 排除关键词生效 ==");
const state4 = { currentBook: null, usedBookIds: [], usedShelfBookIds: [], excludedBooks: [], excludedTitleKeywords: ["全球高武"] };
const books4 = [
  { bookId: "22237441", title: "全球高武", deepLink: DL("9a932ec0715351019a95869"), finishReading: 0, readUpdateTime: 8 },
  { bookId: "22261199", title: "剑来", deepLink: DL("8e5326b07153adcf8e53d42"), finishReading: 0, readUpdateTime: 7 },
];
const prog4 = [{ bookId: "22237441", progress: 47 }, { bookId: "22261199", progress: 29 }];
const r4 = choose(books4, prog4, state4);
assert(r4 && r4.title === "剑来" && r4.progress === 29,
  "排除 全球高武 后选中剑来(29%)\n     -> " + JSON.stringify(r4));

console.log("== case 5: 已用(usedShelfBookIds)被跳过 ==");
const state5 = { currentBook: null, usedBookIds: [], usedShelfBookIds: ["22261199"], excludedBooks: [], excludedTitleKeywords: [] };
const r5 = choose(books4, prog4, state5);
assert(r5 && r5.title === "全球高武",
  "剑来 在已用列表则选全球高武\n     -> " + JSON.stringify(r5));

console.log("== case 6: 全部读完/卡死/排除 → 返回 null（调用方回退兜底 URL）==");
const state6 = { currentBook: null, usedBookIds: [], usedShelfBookIds: [], excludedBooks: [], excludedTitleKeywords: [] };
const books6 = [{ bookId: "1", title: "读完", deepLink: DL("x1"), finishReading: 1, readUpdateTime: 1 }];
const r6 = choose(books6, [{ bookId: "1", progress: 100 }], state6);
assert(r6 === null, "无可读书返回 null（回退 DEFAULT_BOOK_URL / DOM 切书）\n     -> " + JSON.stringify(r6));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
