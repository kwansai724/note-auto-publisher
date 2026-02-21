import { Page } from "playwright";
import { Config } from "./config.js";
import { Draft } from "./drafts.js";
import { humanDelay, log } from "./utils.js";

/**
 * 下書き記事を公開する
 *
 * 導線:
 *   下書き一覧（note.com/notes?status=draft）
 *   → 編集ボタンクリック → エディタ（editor.note.com/.../edit/）
 *   → 「公開に進む」クリック → 公開設定（editor.note.com/.../publish/）
 *   → ハッシュタグ入力 → 「投稿する」クリック
 *   → シェアモーダル表示（公開完了）→ ✕で閉じる
 */
export async function publishDraft(
  page: Page,
  draft: Draft,
  config: Config
): Promise<void> {
  log(`対象記事: "${draft.title}"`);

  if (config.dryRun) {
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

  // Step 2: 「公開に進む」クリック → 公開設定ページ
  log("「公開に進む」をクリック中...");
  await page.getByRole("button", { name: "公開に進む" }).click();
  await page.waitForURL(/editor\.note\.com\/notes\/.*\/publish/, {
    timeout: 15000,
  });
  await humanDelay();

  // Step 3: ハッシュタグを入力
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

  // Step 4: 「投稿する」クリック
  log("「投稿する」をクリック中...");
  const submitButton = page.getByRole("button", { name: "投稿する" });
  await submitButton.waitFor({ state: "visible", timeout: 30000 });
  await humanDelay(1000, 2000);
  await submitButton.click();

  // Step 5: シェアモーダルで公開完了を検知 → 閉じる
  log("公開完了を待機中...");
  const shareModal = page.locator("text=記事をシェアしてみましょう");
  await shareModal.waitFor({ state: "visible", timeout: 30000 });
  log("公開完了（シェアモーダル表示）");

  // モーダルの✕ボタンをクリックして閉じる
  const closeButton = page.locator('button:near(:text("記事をシェアしてみましょう"))').first();
  await closeButton.click();
  await humanDelay();
  log("シェアモーダルを閉じました");
}
