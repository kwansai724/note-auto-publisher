import { Page } from "playwright";
import { Draft, cleanTitle } from "./drafts.js";
import { humanDelay, log, safeScreenshot } from "./utils.js";

/**
 * 下書き記事を公開する
 */
export async function publishDraft(
  page: Page,
  draft: Draft,
  dryRun: boolean
): Promise<void> {
  const title = cleanTitle(draft.title);
  log(`対象記事: "${title}" (元タイトル: "${draft.title}")`);

  if (dryRun) {
    log("[DRY RUN] 公開操作をスキップします");
    return;
  }

  // 記事一覧から編集ボタンをクリックして編集ページに遷移
  log("下書き編集ページに遷移中...");
  const editButton = page.locator(`button.o-articleList__link[aria-label="${draft.title}を編集"]`);
  await editButton.click();
  await page.waitForURL(/note\.com\/notes\//, { timeout: 15000 });
  await humanDelay();

  // タイトルからプレフィックスを除去
  const titleInput = page.locator(
    'textarea[placeholder*="タイトル"], textarea[data-placeholder*="タイトル"], [contenteditable="true"]'
  ).first();

  if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    log("タイトルからプレフィックスを除去中...");
    await titleInput.click();
    // 全選択して置き換え
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type(title, { delay: 50 });
    await humanDelay();
  } else {
    log("タイトル入力欄が見つかりません（セレクタ要確認）");
  }

  // 「公開に進む」ボタンをクリック
  log("「公開に進む」ボタンを探索中...");
  const publishButton = page.getByRole("button", { name: /公開/ });

  if (await publishButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await publishButton.click();
    log("「公開に進む」をクリック");
  } else {
    // フォールバック: テキストで探索
    const fallbackButton = page.locator("button", { hasText: "公開" }).first();
    if (
      await fallbackButton.isVisible({ timeout: 5000 }).catch(() => false)
    ) {
      await fallbackButton.click();
      log("「公開」ボタンをクリック（フォールバック）");
    } else {
      await safeScreenshot(page, "publish-button-not-found");
      throw new Error(
        "「公開」ボタンが見つかりません。noteのUI変更の可能性があります"
      );
    }
  }

  // 公開設定ページの描画を待機
  log("公開設定ページの読み込みを待機中...");
  const submitButton = page.getByRole("button", { name: "投稿する" });
  await submitButton.waitFor({ state: "visible", timeout: 30000 });
  await humanDelay(1000, 2000);

  // 公開設定ページで「投稿する」ボタンをクリック
  log("「投稿する」ボタンを探索中...");

  if (await submitButton.isVisible()) {
    await submitButton.click();
    log("「投稿する」をクリック");
  } else {
    const fallbackSubmit = page
      .locator("button", { hasText: "投稿" })
      .first();
    if (
      await fallbackSubmit.isVisible({ timeout: 5000 }).catch(() => false)
    ) {
      await fallbackSubmit.click();
      log("「投稿」ボタンをクリック（フォールバック）");
    } else {
      await safeScreenshot(page, "submit-button-not-found");
      throw new Error(
        "「投稿する」ボタンが見つかりません。noteのUI変更の可能性があります"
      );
    }
  }

  // 公開完了を検証（記事ページへのリダイレクト）
  log("公開完了を待機中...");
  try {
    await page.waitForURL(/note\.com\/[^/]+\/n\//, { timeout: 30000 });
    const publishedUrl = page.url();
    log(`公開完了: ${publishedUrl}`);
  } catch {
    await safeScreenshot(page, "publish-verify-failed");
    throw new Error("公開完了の確認に失敗しました。記事ページへの遷移を検知できませんでした");
  }
}
