import { Page } from "playwright";
import { Config } from "./config.js";
import { Draft, cleanTitle } from "./drafts.js";
import { humanDelay, log, safeScreenshot } from "./utils.js";

/**
 * 下書き記事を公開する
 *
 * 導線:
 *   下書き一覧（note.com/notes?status=draft）
 *   → 編集ボタンクリック → エディタ（editor.note.com/.../edit/）
 *   → 「公開に進む」クリック → 公開設定（editor.note.com/.../publish/）
 *   → 「投稿する」クリック → 記事ページ（note.com/ユーザー名/n/...）
 */
export async function publishDraft(
  page: Page,
  draft: Draft,
  config: Config
): Promise<void> {
  const { dryRun } = config;
  const title = cleanTitle(draft.title);
  log(`対象記事: "${title}" (元タイトル: "${draft.title}")`);

  if (dryRun) {
    log("[DRY RUN] 公開操作をスキップします");
    return;
  }

  // Step 1: 記事一覧から編集ボタンをクリック → エディタページ
  log("下書き編集ページに遷移中...");
  const editButton = page.locator(
    `button.o-articleList__link[aria-label="${draft.title}を編集"]`
  );
  await editButton.click();
  await page.waitForURL(/editor\.note\.com\/notes\/.*\/edit/, {
    timeout: 15000,
  });
  await humanDelay();

  // Step 2: タイトルからプレフィックスを除去
  const titleInput = page.locator('[contenteditable="true"]').first();
  if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    log("タイトルからプレフィックスを除去中...");
    await titleInput.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type(title, { delay: 50 });
    await humanDelay();
  } else {
    log("タイトル入力欄が見つかりません（セレクタ要確認）");
  }

  // Step 3: 「公開に進む」クリック → 公開設定ページ
  log("「公開に進む」をクリック中...");
  await page.getByRole("button", { name: "公開に進む" }).click();
  await page.waitForURL(/editor\.note\.com\/notes\/.*\/publish/, {
    timeout: 15000,
  });
  await humanDelay();

  // Step 4: ハッシュタグを入力
  if (config.hashtags.length > 0) {
    log("ハッシュタグを設定中...");
    const hashtagInput = page.locator(
      'input[placeholder="ハッシュタグを追加する"]'
    );
    for (const tag of config.hashtags) {
      await hashtagInput.fill(tag);
      await hashtagInput.press("Enter");
      await humanDelay(300, 600);
    }
    log(`ハッシュタグ ${config.hashtags.length}件を設定`);
    await humanDelay();
  }

  // Step 5: 「投稿する」クリック → 記事公開
  log("「投稿する」をクリック中...");
  const submitButton = page.getByRole("button", { name: "投稿する" });
  await submitButton.waitFor({ state: "visible", timeout: 30000 });
  await humanDelay(1000, 2000);
  await submitButton.click();

  // Step 6: 公開完了を検証（記事ページへのリダイレクト）
  log("公開完了を待機中...");
  try {
    await page.waitForURL(/note\.com\/[^/]+\/n\//, { timeout: 30000 });
    const publishedUrl = page.url();
    log(`公開完了: ${publishedUrl}`);
  } catch {
    await safeScreenshot(page, "publish-verify-failed");
    throw new Error(
      "公開完了の確認に失敗しました。記事ページへの遷移を検知できませんでした"
    );
  }
}
