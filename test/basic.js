const assert = require("assert");

function testConfig() {
  const { parseBooleanValue, parseIntegerValue, RUN_OPTION_SPECS } = require("../node_modules/weread-selenium-cli/src/lib/config");
  assert.strictEqual(parseBooleanValue("true"), true);
  assert.strictEqual(parseBooleanValue("false"), false);
  assert.strictEqual(parseBooleanValue("1"), true);
  assert.strictEqual(parseBooleanValue("0"), false);
  assert.strictEqual(parseBooleanValue(true), true);
  assert.strictEqual(parseBooleanValue(false), false);
  assert.strictEqual(parseBooleanValue(undefined, false), false);
  assert.strictEqual(parseIntegerValue("123", "test"), 123);
  assert.strictEqual(parseIntegerValue(456, "test"), 456);
  assert.throws(() => parseIntegerValue("abc", "test"));
  assert.ok(RUN_OPTION_SPECS.length > 0);
  assert.ok(RUN_OPTION_SPECS.some((s) => s.envKey === "WEREAD_DURATION"));
  assert.ok(RUN_OPTION_SPECS.some((s) => s.envKey === "WEBHOOK_URL"));
  console.log("✅ config tests passed");
}

function testFiles() {
  const { escapeHtml, formatLocalTimestamp } = require("../node_modules/weread-selenium-cli/src/lib/files");
  assert.strictEqual(escapeHtml("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.strictEqual(escapeHtml("hello"), "hello");
  const ts = formatLocalTimestamp(new Date());
  assert.ok(ts.includes("-"));
  assert.ok(ts.includes(":"));
  console.log("✅ files tests passed");
}

function testShell() {
  const { quoteShellArg } = require("../node_modules/weread-selenium-cli/src/lib/shell");
  const h1 = quoteShellArg("hello");
  assert.ok(h1 === '"hello"' || h1 === "'hello'");
  const h2 = quoteShellArg("hello world");
  assert.ok(h2.includes("hello") && h2.includes("world"));
  const h3 = quoteShellArg("it's");
  assert.ok(h3.includes("it"));
  console.log("✅ shell tests passed");
}

function testConfigFile() {
  const { mergeConfigs } = require("../node_modules/weread-selenium-cli/src/lib/config-file");
  const defaults = { A: 1, B: 2 };
  const fileConfig = { B: 3 };
  const envVars = { C: 4 };
  const cliFlags = { D: 5 };
  const merged = mergeConfigs(defaults, fileConfig, envVars, cliFlags);
  assert.strictEqual(merged.A, 1);
  assert.strictEqual(merged.B, 3);
  assert.strictEqual(merged.C, 4);
  assert.strictEqual(merged.D, 5);
  console.log("✅ config-file tests passed");
}

function testReader() {
  const { END_PATTERNS, autoScroll, findElementWithRetry } = require("../node_modules/weread-selenium-cli/src/lib/reader");
  assert.ok(Array.isArray(END_PATTERNS));
  assert.ok(END_PATTERNS.length > 0);
  assert.ok(typeof autoScroll === "function");
  assert.ok(typeof findElementWithRetry === "function");
  console.log("✅ reader tests passed");
}

function testNetwork() {
  const { fetchJson, fetchWithRetry, checkSeleniumHealth } = require("../node_modules/weread-selenium-cli/src/lib/network");
  assert.ok(typeof fetchJson === "function");
  assert.ok(typeof fetchWithRetry === "function");
  assert.ok(typeof checkSeleniumHealth === "function");
  console.log("✅ network tests passed");
}

function runTests() {
  console.log("Running basic tests...\n");
  testConfig();
  testFiles();
  testShell();
  testConfigFile();
  testReader();
  testNetwork();
  console.log("\n✅ All tests passed!");
}

runTests();
