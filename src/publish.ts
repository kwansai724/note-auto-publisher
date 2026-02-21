import { Page } from "playwright";
import { Config } from "./config.js";
import { Draft } from "./drafts.js";
import { humanDelay, log, safeScreenshot } from "./utils.js";

/**
 * 下書き記事を公開する
 *
 * 導線:
 *   下書き一覧（note.com/notes?status=draft）
 *   → 編集ボタンクリック → エディタ（editor.note.com/.../edit/）
 *   → 「公開に進む」クリック → 公開設定（editor.note.com/.../publish/）
 *   → ハッシュタグ入力 → 「投稿する」クリック
 *   → シェアモーダル表示（公開完了）→ Xボタンクリック → Xに投稿
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

  // Step 5: シェアモーダルで公開完了を検知
  log("公開完了を待機中...");
  const shareModal = page.locator("text=記事をシェアしてみましょう");
  await shareModal.waitFor({ state: "visible", timeout: 30000 });
  log("公開完了（シェアモーダル表示）");

  // Step 6: Xにシェア（失敗しても記事公開は成功扱い）
  try {
    log("Xにシェア中...");
    const [xPage] = await Promise.all([
      page.context().waitForEvent("page"), // 新しいタブを待機
      page.locator('button[aria-label="X"]').click(),
    ]);

    await xPage.waitForLoadState("networkidle");
    await humanDelay(2000, 3000);
    const postButton = xPage.getByRole("button", { name: "ポストする" });
    await postButton.waitFor({ state: "visible", timeout: 15000 });
    await postButton.click();
    log("Xに投稿完了");
    await humanDelay(2000, 3000);

    await xPage.close();
  } catch (error) {
    log(`Xへの投稿に失敗（記事公開は成功）: ${error}`);
  }
}
