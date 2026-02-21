import { Browser, BrowserContext, Page, chromium } from "playwright";
import { existsSync, writeFileSync } from "fs";
import { Config } from "./config.js";
import { humanDelay, log, maskSecret } from "./utils.js";

const X_AUTH_PATH = "x-auth.json";

export interface AuthResult {
  browser: Browser;
  page: Page;
}

/**
 * X認証情報をファイルに復元（GitHub Secretsのbase64から）
 */
function restoreXAuth(): void {
  const xAuthBase64 = process.env.X_AUTH_STATE;
  if (xAuthBase64) {
    writeFileSync(X_AUTH_PATH, Buffer.from(xAuthBase64, "base64").toString());
    log("X認証情報を復元");
  }
}

/**
 * ブラウザコンテキストを作成（X認証情報があれば読み込む）
 */
async function createContext(browser: Browser): Promise<BrowserContext> {
  const options = {
    locale: "ja-JP",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ...(existsSync(X_AUTH_PATH) ? { storageState: X_AUTH_PATH } : {}),
  };

  if (existsSync(X_AUTH_PATH)) {
    log("X認証情報を読み込み済み");
  }

  return browser.newContext(options);
}

export async function login(config: Config): Promise<AuthResult> {
  maskSecret(config.noteEmail);
  maskSecret(config.notePassword);

  restoreXAuth();

  log("ブラウザを起動中...");
  const browser = await chromium.launch({
    headless: config.headless,
  });

  const context = await createContext(browser);
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
