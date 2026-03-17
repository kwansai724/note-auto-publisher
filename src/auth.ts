import { Browser, Page, chromium } from "playwright";
import { existsSync } from "fs";
import { Config } from "./config.js";
import { log, maskSecret } from "./utils.js";

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
      log("セッションの有効性を確認中...");
      await page.goto("https://note.com/notes?status=draft", {
        waitUntil: "networkidle",
      });

      if (!page.url().includes("/login")) {
        log("ログイン成功（セッション再利用）");
        return { browser, page };
      }
      log("セッションが期限切れです");
    }

    await browser.close();
    throw new Error(
      "セッションが無効です。session.json を更新してください"
    );
  } catch (error) {
    await browser.close();
    throw error;
  }
}
