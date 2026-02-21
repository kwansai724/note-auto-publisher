import { chromium } from "playwright";
import { log } from "./utils.js";
import { homedir } from "os";
import { join } from "path";

/**
 * 普段使っているChromeのプロファイルを利用してX認証情報を保存する
 *
 * 使い方:
 *   1. Chromeを完全に終了する（Cmd+Q）
 *   2. npx tsx src/save-x-auth.ts
 *   3. Xのホーム画面が表示されたら自動保存される
 *   4. base64エンコードしてGitHub Secretsに登録:
 *      base64 -i x-auth.json | pbcopy
 *      → Secrets の X_AUTH_STATE に貼り付け
 */
async function main() {
  const chromeUserDataDir = join(
    homedir(),
    "Library/Application Support/Google/Chrome"
  );

  log("Chromeのプロファイルを使ってブラウザを起動中...");
  log("※ Chromeが起動中だとエラーになります。先にCmd+Qで完全終了してください");

  const context = await chromium.launchPersistentContext(chromeUserDataDir, {
    headless: false,
    channel: "chrome",
    locale: "ja-JP",
  });

  const page = await context.newPage();
  await page.goto("https://x.com/home");

  log("Xのホーム画面を確認中...");
  await page.waitForURL(/x\.com\/home/, { timeout: 30000 });
  log("Xにログイン済み");

  // 認証情報を保存
  await context.storageState({ path: "x-auth.json" });
  log("x-auth.json に認証情報を保存しました");
  log("");
  log("次のステップ:");
  log("  1. base64 -i x-auth.json | pbcopy");
  log("  2. GitHub Secrets に X_AUTH_STATE として貼り付け");

  await context.close();
}

main();
