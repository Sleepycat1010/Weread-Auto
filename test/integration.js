/**
 * Integration tests - test module interactions
 */
const assert = require("assert");

function testConfigMerge() {
  const { setRuntimeConfigFromEnv, applyRunCliOverrides, RUN_OPTION_SPECS } = require("../node_modules/weread-selenium-cli/src/lib/config");
  const { mergeConfigs } = require("../node_modules/weread-selenium-cli/src/lib/config-file");
  
  // Test that config file merge respects env overrides
  const defaults = { WEREAD_DURATION: 10, WEREAD_SPEED: "slow" };
  const fileConfig = { WEREAD_DURATION: 570 };
  const envVars = { WEREAD_DURATION: "120" };
  const cliFlags = { duration: "240" };
  
  // Simulate the chain: defaults -> file -> env -> cli
  const merged1 = mergeConfigs(defaults, fileConfig, {}, {});
  assert.strictEqual(merged1.WEREAD_DURATION, 570);
  
  const merged2 = mergeConfigs(defaults, {}, envVars, {});
  assert.strictEqual(merged2.WEREAD_DURATION, "120");
  
  // Test setRuntimeConfigFromEnv
  const env = { WEREAD_DURATION: "60", WEREAD_SPEED: "fast", WEBHOOK_URL: "http://test.com" };
  const config = setRuntimeConfigFromEnv(env);
  assert.strictEqual(config.WEREAD_DURATION, 60);
  assert.strictEqual(config.WEREAD_SPEED, "fast");
  assert.strictEqual(config.WEBHOOK_URL, "http://test.com");
  
  console.log("✅ config merge tests passed");
}

function testNotifications() {
  const { sendMail, sendBark, buildBarkUrl, sendWebhook, buildWebhookUrl } = require("../node_modules/weread-selenium-cli/src/lib/notifications");
  assert.ok(typeof sendMail === "function");
  assert.ok(typeof sendBark === "function");
  assert.ok(typeof buildBarkUrl === "function");
  assert.ok(typeof sendWebhook === "function");
  assert.ok(typeof buildWebhookUrl === "function");
  
  // Test Bark URL construction
  const barkUrl = buildBarkUrl("Test", "Body", { config: { BARK_KEY: "test-key" } });
  assert.ok(barkUrl.includes("test-key"));
  assert.ok(barkUrl.includes("Test"));
  
  // Test Webhook URL construction
  const whUrl = buildWebhookUrl(null, { config: { WEBHOOK_URL: "http://test.com/hook" } });
  assert.ok(whUrl);
  
  console.log("✅ notifications tests passed");
}

function testLoginModule() {
  const { saveCookies, loadCookies, findQRCodeElement, extractAndDisplayQRCode, waitForLogin } = require("../node_modules/weread-selenium-cli/src/lib/login");
  assert.ok(typeof saveCookies === "function");
  assert.ok(typeof loadCookies === "function");
  assert.ok(typeof findQRCodeElement === "function");
  assert.ok(typeof extractAndDisplayQRCode === "function");
  assert.ok(typeof waitForLogin === "function");
  console.log("✅ login module tests passed");
}

function testScheduleModule() {
  const { buildSchedulePlan, printSchedulePlan, parseOptionalScheduleDuration } = require("../node_modules/weread-selenium-cli/src/lib/schedule");
  assert.ok(typeof buildSchedulePlan === "function");
  assert.ok(typeof printSchedulePlan === "function");
  assert.ok(typeof parseOptionalScheduleDuration === "function");
  console.log("✅ schedule module tests passed");
}

function testUserModule() {
  const { getUserInfo } = require("../node_modules/weread-selenium-cli/src/lib/user");
  assert.ok(typeof getUserInfo === "function");
  console.log("✅ user module tests passed");
}

function testNeteaseModule() {
  const { neteaseCheckin } = require("../node_modules/weread-selenium-cli/src/lib/netease");
  assert.ok(typeof neteaseCheckin === "function");
  console.log("✅ netease module tests passed");
}

function runTests() {
  console.log("Running integration tests...\n");
  testConfigMerge();
  testNotifications();
  testLoginModule();
  testScheduleModule();
  testUserModule();
  testNeteaseModule();
  console.log("\n✅ All integration tests passed!");
}

runTests();
