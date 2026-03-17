import { Browser, Page, chromium } from "playwright";
import { existsSync } from "fs";
import { Config } from "./config.js";
import { humanDelay, log, maskSecret } from "./utils.js";

const SESSION_PATH = "session.json";

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

  // 保存済みセッションがあればそれを使う
  const hasSession = existsSync(SESSION_PATH);
  if (hasSession) {
    log("保存済みセッションを使用...");
  }

  const context = await browser.newContext({
    locale: "ja-JP",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ...(hasSession ? { storageState: SESSION_PATH } : {}),
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    if (hasSession) {
      // セッションの有効性を確認
      log("セッションの有効性を確認中...");
      await page.goto("https://note.com/notes?status=draft", {
        waitUntil: "networkidle",
      });

      // ログインページにリダイレクトされなければセッション有効
      if (!page.url().includes("/login")) {
        log("ログイン成功（セッション再利用）");
        return { browser, page };
      }
      log("セッションが期限切れです。通常ログインを試みます...");
    }

    // 通常のメール/パスワードログイン
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

    // ログイン成功を待機（ログインページ以外へのリダイレクト）
    log("ログイン中...");
    await page.waitForURL((url) => {
      return url.origin === "https://note.com" && url.pathname !== "/login";
    }, { timeout: 15000 });

    // ログイン成功したらセッションを保存
    await context.storageState({ path: SESSION_PATH });
    log("ログイン成功（セッション保存済み）");
    return { browser, page };
  } catch (error) {
    await browser.close();
    throw error;
  }
}
