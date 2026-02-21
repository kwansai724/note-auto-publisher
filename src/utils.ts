import { Page } from "playwright";
import { mkdirSync } from "fs";
import { dirname } from "path";

/**
 * 人間的なランダム待機（1〜3秒）
 */
export async function humanDelay(
  min: number = 1000,
  max: number = 3000
): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * スクリーンショットを安全に保存（エラー時は握りつぶす）
 */
export async function safeScreenshot(
  page: Page,
  name: string
): Promise<string | null> {
  try {
    const path = `screenshots/${name}-${Date.now()}.png`;
    mkdirSync(dirname(path), { recursive: true });
    await page.screenshot({ path, fullPage: true });
    log(`スクリーンショット保存: ${path}`);
    return path;
  } catch (e) {
    log(`スクリーンショット保存失敗: ${e}`);
    return null;
  }
}

/**
 * ログ出力（GitHub Actions対応）
 */
export function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

/**
 * GitHub Actionsで認証情報をマスクする
 */
export function maskSecret(secret: string): void {
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::add-mask::${secret}`);
  }
}
