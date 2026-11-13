import { chromium } from "playwright";
import { readFile, mkdir } from "node:fs/promises";
const log = process.env.DSH_TEST_LOG
  ? await readFile(process.env.DSH_TEST_LOG, "utf8")
  : "";
const url =
  process.env.DSH_TEST_URL ?? log.match(/dsh web: (https?:\/\/[^\s]+)/)?.[1];
if (!url)
  throw new Error(
    "Set DSH_TEST_URL or DSH_TEST_LOG to a private local dsh web launch URL/log",
  );
const output = process.env.DSH_TEST_OUTPUT ?? ".local/ui";
await mkdir(output, { recursive: true });
const context = await chromium.launchPersistentContext(
  ".local/browser-profile",
  {
    headless: true,
    locale: "ja-JP",
    viewport: { width: 1280, height: 1000 },
  },
);
const page = context.pages()[0] ?? (await context.newPage());
await page.addInitScript(() => {
  const nativeOpen = window.open;
  window.open = function (...args) {
    const focused = document.activeElement;
    Reflect.set(
      window,
      "__chatgptReturnFocusedAtOpen",
      focused instanceof HTMLInputElement &&
        focused.type === "text" &&
        focused.closest('section[aria-label="Sign in with ChatGPT"]') !== null,
    );
    return nativeOpen.apply(window, args);
  };
});
const card = page.getByRole("region", {
  name: "Sign in with ChatGPT",
  exact: true,
});
let fixtureView = process.env.DSH_TEST_CONNECTED_ONBOARDING
  ? {
      active: "00000000-0000-4000-8000-000000000001",
      accounts: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          label: "account@example.test",
          connected: true,
          sharing: true,
        },
      ],
      pending: false,
    }
  : undefined;
try {
  // External authorization is a stand-in; no real account sign-in is attempted.
  await context.route("https://auth.openai.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>OAuth test destination</title>",
    }),
  );
  await page.route("**/chatgpt/account", async (route) => {
    if (!fixtureView) return route.continue();
    const request = route.request();
    if (request.method() === "GET") return route.fulfill({ json: fixtureView });
    if (request.postDataJSON()?.action === "logout") {
      fixtureView = {
        ...fixtureView,
        accounts: fixtureView.accounts.map((account) => ({
          ...account,
          connected: false,
          sharing: false,
        })),
      };
      return route.fulfill({ json: fixtureView });
    }
    return route.continue();
  });
  async function models() {
    await page
      .getByRole("button", { name: /^(アカウントメニュー|Account menu)$/ })
      .click();
    await page.getByRole("menuitem", { name: /^(設定|Settings)$/ }).click();
    await page.getByRole("button", { name: /^(モデル|Models)$/ }).click();
  }
  async function addChatGPT() {
    await page
      .getByRole("button", {
        name: /^(モデルプロバイダーを追加|Add model provider)$/,
      })
      .click();
    await page
      .getByRole("combobox", { name: /^(プロバイダー|Provider)$/ })
      .selectOption("chatgpt");
    await card.waitFor();
  }
  async function startAuthorization() {
    const remote = !["127.0.0.1", "localhost", "[::1]"].includes(
      new URL(url).hostname,
    );
    const popupReady = context.waitForEvent("page");
    await card
      .getByRole("button", { name: "Continue with ChatGPT", exact: true })
      .click();
    if (remote) {
      const instructions = page.getByRole("dialog", {
        name: /^(認証タブを開く前に|Before opening the sign-in tab)$/,
      });
      await instructions.waitFor();
      await page.screenshot({
        animations: "disabled",
        path: `${output}/chatgpt-instructions.png`,
      });
      await instructions
        .getByRole("button", { name: /^(確認して進む|Confirm and continue)$/ })
        .click();
    }
    const popup = await popupReady;
    if (
      remote &&
      !(await page.evaluate(() =>
        Reflect.get(window, "__chatgptReturnFocusedAtOpen"),
      ))
    )
      throw new Error("Return input was not focused before opening the tab");
    try {
      await popup.waitForURL("https://auth.openai.com/**");
      const appName = new URL(popup.url()).searchParams.get("agent_name_hint");
      if (
        process.env.DSH_TEST_AGENT_NAME &&
        appName !== process.env.DSH_TEST_AGENT_NAME
      )
        throw new Error("Unexpected authorization app name");
      if (!(await popup.evaluate(() => window.opener === null)))
        throw new Error("Authorization tab retains an opener");
    } finally {
      await popup.close();
    }
    await page.bringToFront();
    await card.getByRole("button", { name: /^(キャンセル|Cancel)$/ }).waitFor();
    if (
      remote &&
      !(await card
        .getByLabel(/^(ブラウザーの戻り先URL|Browser return URL)$/)
        .evaluate((input) => input === document.activeElement))
    )
      throw new Error(
        "Return input lost focus after returning from authorization",
      );
  }
  await page.goto(url);
  await models();
  if (process.env.DSH_TEST_CONNECTED_ONBOARDING) {
    await page.getByRole("button", { name: /Sign in with ChatGPT/ }).waitFor();
    if (
      await page
        .getByRole("dialog", { name: /^(はじめに|Get started)$/ })
        .count()
    )
      throw new Error("ChatGPT login did not suppress onboarding");
    await page.screenshot({
      animations: "disabled",
      path: `${output}/chatgpt-connected-no-api-key.png`,
    });
    await page.getByRole("button", { name: /Sign in with ChatGPT/ }).click();
    await card.getByRole("button", { name: /^(再接続|Reconnect)$/ }).click();
    const instructions = page.getByRole("dialog", {
      name: /^(認証タブを開く前に|Before opening the sign-in tab)$/,
    });
    await instructions.waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      animations: "disabled",
      path: `${output}/chatgpt-instructions-narrow.png`,
    });
    const dialogBounds = await instructions.boundingBox();
    if (
      !dialogBounds ||
      dialogBounds.x < 0 ||
      dialogBounds.x + dialogBounds.width > 390
    )
      throw new Error("Instructions overflow the viewport");
    await page.keyboard.press("Escape");
    await instructions.waitFor({ state: "detached" });
    await card.waitFor();
    console.log(
      "PASS: connected ChatGPT display fixture permits settings without API-key onboarding; server has no API keys; narrow instructions and Escape dismissal",
    );
  } else {
    await page.getByRole("button", { name: /^(一般|General)$/ }).click();
    await page.getByRole("button", { name: /^(ライト|Light)$/ }).click();
    await page.reload();
    await models();
    if (await card.count())
      throw new Error(
        "A disconnected ChatGPT card is outside the provider list",
      );
    await addChatGPT();
    await page.screenshot({
      animations: "disabled",
      path: `${output}/chatgpt-before-browser.png`,
    });
    await startAuthorization();
    const remote = !["127.0.0.1", "localhost", "[::1]"].includes(
      new URL(url).hostname,
    );
    const returnInput = card.getByLabel(
      /^(ブラウザーの戻り先URL|Browser return URL)$/,
    );
    if (remote) {
      await returnInput.waitFor();
      await card.getByRole("status").waitFor();
      if (
        await card
          .getByRole("link", { name: /^(使用量を管理|Manage usage)$/ })
          .count()
      )
        throw new Error("Usage shown before connection");
      if (
        (await card
          .getByRole("button", { name: /^(キャンセル|Cancel)$/ })
          .count()) !== 1
      )
        throw new Error("Duplicate cancellation controls");
      await page.keyboard.insertText("code=fixture&state=wrong");
      if (
        (await returnInput.getAttribute("type")) !== "text" ||
        (await returnInput.inputValue()) !== "code=fixture&state=wrong"
      )
        throw new Error("Return query is not visible as entered");
      await page.screenshot({
        animations: "disabled",
        path: `${output}/chatgpt-pending-light.png`,
      });
      await card
        .getByRole("button", { name: /^(認証を完了|Complete sign-in)$/ })
        .click();
      await card.getByRole("alert").waitFor();
      if (await returnInput.inputValue())
        throw new Error("Return query remains after submission");
    } else if (await returnInput.count())
      throw new Error("Loopback login exposes remote completion");
    await card.getByRole("button", { name: /^(キャンセル|Cancel)$/ }).click();
    await card
      .getByRole("button", {
        name: /^Continue with ChatGPT$/,
        exact: true,
      })
      .waitFor();
    await page.getByRole("button", { name: /^(一般|General)$/ }).click();
    await page.getByRole("button", { name: /^(ダーク|Dark)$/ }).click();
    await page.reload();
    await models();
    await addChatGPT();
    await startAuthorization();
    await page.screenshot({
      animations: "disabled",
      path: `${output}/chatgpt-pending-dark.png`,
    });
    const devtools = await context.newCDPSession(page);
    await devtools.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 1,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    if (remote) await returnInput.scrollIntoViewIfNeeded();
    await page.screenshot({
      animations: "disabled",
      path: `${output}/chatgpt-pending-narrow.png`,
    });
    // Display fixture covers successful connection and sign-out without issuing tokens.
    fixtureView = {
      active: "00000000-0000-4000-8000-000000000001",
      accounts: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          label: "long-account-label-for-responsive-testing@example.test (1)",
          connected: true,
          sharing: true,
        },
      ],
      pending: false,
    };
    await context.request.post(new URL("/chatgpt/account", url).href, {
      data: { action: "cancel" },
      headers: { origin: new URL(url).origin },
    });
    const edit = page.getByRole("button", { name: /Sign in with ChatGPT/ });
    await edit.waitFor();
    if (
      (await edit.getAttribute("aria-expanded")) !== "false" ||
      (await card.count())
    )
      throw new Error(
        "Completed addition did not collapse into the provider list",
      );
    await page
      .getByRole("button", {
        name: /^(モデルプロバイダーを追加|Add model provider)$/,
      })
      .waitFor();
    const peer = await page
      .getByRole("button", { name: /DeepSeek.*を編集|Edit DeepSeek/ })
      .boundingBox();
    const own = await edit.boundingBox();
    if (!peer || !own || Math.abs(peer.x + peer.width - own.x - own.width) > 1)
      throw new Error("Provider edit buttons are misaligned");
    await page.screenshot({
      animations: "disabled",
      path: `${output}/chatgpt-connected-collapsed-narrow.png`,
    });
    await edit.click();
    await card.waitFor();
    const bounds = await card.boundingBox();
    if (!bounds || bounds.x < 0 || bounds.x + bounds.width > 390)
      throw new Error("ChatGPT details overflow the viewport");
    await page.screenshot({
      animations: "disabled",
      path: `${output}/chatgpt-connected-details-narrow.png`,
    });
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.getByRole("button", { name: /^(一般|General)$/ }).click();
    await page.getByRole("button", { name: /^(ライト|Light)$/ }).click();
    await page.reload();
    await models();
    await edit.waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      animations: "disabled",
      path: `${output}/chatgpt-connected-collapsed-light-narrow.png`,
    });
    await edit.click();
    await card.waitFor();
    await page.screenshot({
      animations: "disabled",
      path: `${output}/chatgpt-connected-details-light-narrow.png`,
    });
    await card.getByRole("button", { name: /^(ログアウト|Sign out)$/ }).click();
    await edit.waitFor({ state: "detached" });
    if (await card.count())
      throw new Error("Signed-out account details remain visible");
    await page.screenshot({
      animations: "disabled",
      path: `${output}/chatgpt-signed-out-narrow.png`,
    });
    console.log(
      "PASS: actual provider selection and confirmed isolated authorization tab; input focused before opening and keyboard paste after return; visible query, rejection, cancel, light/dark/narrow; connected-list and sign-out display fixture",
    );
  }
} catch (error) {
  await page.screenshot({
    animations: "disabled",
    path: `${output}/failure.png`,
  });
  throw error;
} finally {
  try {
    await context.request.post(new URL("/chatgpt/account", url).href, {
      data: { action: "cancel" },
      headers: { origin: new URL(url).origin },
    });
  } finally {
    await context.close();
  }
}
