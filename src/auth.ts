import { Browser, Page, chromium } from "playwright";
import { Config } from "./config.js";
import { humanDelay, log, maskSecret, safeScreenshot } from "./utils.js";

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
    const emailInput = page.locator('#email');
    await emailInput.waitFor({ state: "visible" });
    await emailInput.fill(config.noteEmail);
    await humanDelay(500, 1000);

    // パスワード入力
    const passwordInput = page.locator('#password');
    await passwordInput.fill(config.notePassword);
    await humanDelay(500, 1000);

    // ログインボタンクリック
    const loginButton = page.getByRole('button', { name: 'ログイン' });
    await loginButton.click();

    // ログイン成功を待機（ダッシュボードまたはホームへのリダイレクト）
    log("ログイン中...");
    await page.waitForURL(/note\.com\/(dashboard|$)/, { timeout: 15000 });

    // 2段階認証チェック
    const twoFactorInput = page.locator('input[name="one_time_password"]');
    if (await twoFactorInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await browser.close();
      throw new Error(
        "2段階認証が有効になっています。noteの設定で2段階認証を無効にするか、アプリパスワードを使用してください"
      );
    }

    log("ログイン成功");
    return { browser, page };
  } catch (error) {
    // ログイン画面のスクリーンショットは撮影しない（セキュリティ）
    // ログイン後のエラーのみスクリーンショットを撮る
    const currentUrl = page.url();
    if (!currentUrl.includes("/login")) {
      await safeScreenshot(page, "login-error");
    }
    await browser.close();
    throw error;
  }
}
