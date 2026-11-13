import { chromium } from "playwright";
import { readFile, mkdir } from "node:fs/promises";

// Use only a disposable test server: this script starts and cancels its OAuth attempt.
const log = await readFile(process.env.DSH_TEST_LOG, "utf8");
const url = [...log.matchAll(/dsh web: (https?:\/\/[^\s]+)/g)].at(-1)?.[1];
if (!url) throw new Error("No test-server launch URL");
const output = process.env.DSH_TEST_OUTPUT;
if (output) await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const initiator = await browser.newContext();
const other = await browser.newContext({
  locale: "ja-JP",
  viewport: { width: 1280, height: 1000 },
});
const endpoint = new URL("/chatgpt/account", url).href;
const headers = { origin: new URL(url).origin };
try {
  await initiator.request.get(url);
  const start = await initiator.request.post(endpoint, {
    headers,
    data: { action: "start" },
  });
  if (!start.ok() || !(await start.json()).pending)
    throw new Error("Test authorization did not become pending");
  const page = await other.newPage();
  await page.goto(url);
  await page
    .getByRole("button", { name: "アカウントメニュー", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "設定", exact: true }).click();
  await page.getByRole("button", { name: "モデル", exact: true }).click();
  await page
    .getByRole("button", { name: "モデルプロバイダーを追加", exact: true })
    .click();
  const providers = page.getByRole("combobox", {
    name: "プロバイダー",
    exact: true,
  });
  await providers.selectOption("chatgpt");
  if (!(await providers.isEnabled()))
    throw new Error("Provider selection is locked");
  await page
    .getByRole("region", { name: "Sign in with ChatGPT", exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  if (output)
    await page.screenshot({
      animations: "disabled",
      path: `${output}/pending-provider-enabled.png`,
    });
  await providers.selectOption("anthropic");
  await page.getByLabel("APIキー", { exact: true }).waitFor();
  await page
    .getByRole("tab", { name: "カスタムモデルAPI", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "プロバイダーID", exact: true })
    .waitFor();
  if (output)
    await page.screenshot({
      animations: "disabled",
      path: `${output}/pending-custom-api.png`,
    });
  const status = await initiator.request.get(endpoint);
  if (!(await status.json()).pending)
    throw new Error("Changing provider cancelled the other browser's attempt");
  console.log(
    "PASS: another browser can select a provider and custom API while authorization remains pending",
  );
} finally {
  await initiator.request.post(endpoint, {
    headers,
    data: { action: "cancel" },
  });
  await browser.close();
}
