import { Browser, Page, chromium } from "playwright";
import { Config } from "./config.js";
import { humanDelay, log, maskSecret } from "./utils.js";

export interface AuthResult {
  browser: Browser;
  page: Page;
}

export async function login(config: Config): Promise<AuthResult> {
  maskSecret(config.noteEmail);
  maskSecret(config.notePassword);

  log("ブラウザを起動中...");
  const browser = await chromium.launch({
    headless: config.headless,
  });

  const context = await browser.newContext({
    locale: "ja-JP",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    log("ログインページにアクセス中...");
    await page.goto("https://note.com/login", { waitUntil: "networkidle" });
    await humanDelay();

    // メールアドレス入力
    await page.locator("#email").fill(config.noteEmail);
    await humanDelay(500, 1000);

    // パスワード入力
    await page.locator("#password").fill(config.notePassword);
    await humanDelay(500, 1000);

    // ログインボタンクリック
    await page.getByRole("button", { name: "ログイン" }).click();

    // ログイン成功を待機（ホームへのリダイレクト）
    log("ログイン中...");
    await page.waitForURL("https://note.com/", { timeout: 15000 });

    log("ログイン成功");
    return { browser, page };
  } catch (error) {
    await browser.close();
    throw error;
  }
}
