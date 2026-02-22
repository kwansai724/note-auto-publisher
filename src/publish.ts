import { Page } from "playwright";
import { Config } from "./config.js";
import { Draft } from "./drafts.js";
import { humanDelay, log } from "./utils.js";

/**
 * 下書き記事を公開する
 */
export async function publishDraft(
  page: Page,
  draft: Draft,
  config: Config,
  hashtags: string[]
): Promise<string | null> {
  log(`対象記事: "${draft.title}"`);

  if (config.dryRun) {
    log(`[DRY RUN] ハッシュタグ: ${hashtags.join(", ")}`);
    log("[DRY RUN] 公開操作をスキップします");
    return null;
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
  if (hashtags.length > 0) {
    log("ハッシュタグを設定中...");
    const hashtagInput = page.locator(
      'input[placeholder="ハッシュタグを追加する"]'
    );
    for (const tag of hashtags) {
      await hashtagInput.fill(tag);
      await hashtagInput.press("Enter");
      await humanDelay(300, 600);
    }
    log(`ハッシュタグ ${hashtags.length}件を設定`);
    await humanDelay();
  }

  // Step 4: 現在のエディタのURLからノートキーを抽出してURLを生成
  // URL例: https://editor.note.com/notes/n5c8d865722ae/publish
  const currentUrl = page.url();
  const noteKeyMatch = currentUrl.match(/notes\/([a-zA-Z0-9_-]+)\/publish/);
  let publishedUrl: string | null = null;
  
  if (noteKeyMatch) {
    const noteKey = noteKeyMatch[1];
    // note公式のショートリンク形式を生成（クリックすると自動でフルURLにリダイレクトされます）
    publishedUrl = `https://note.com/n/${noteKey}`;
    log(`記事のショートURLを生成しました: ${publishedUrl}`);
  }

  // Step 5: 「投稿する」クリック
  log("「投稿する」をクリック中...");
  const submitButton = page.getByRole("button", { name: "投稿する" });
  await submitButton.waitFor({ state: "visible", timeout: 30000 });
  await submitButton.click();

  // Step 6: 公開完了モーダルを検知して完了を確認
  log("公開完了を待機中（モーダル検知）...");
  try {
    // いただいたHTMLの構造に基づき、「リンクをコピー」ボタンまたは「X(Twitter)」ボタンの出現を待つ
    const modalButton = page.locator('button[aria-label="リンクをコピー"], button[data-type="twitter"]').first();
    await modalButton.waitFor({ state: "visible", timeout: 15000 });
    log("公開完了を確認（モーダル検知）");
  } catch (e) {
    log(`⚠ 公開完了モーダルの検知に失敗しましたが、投稿処理は続行します: ${e}`);
  }

  // 万が一取得できなかった場合のフォールバック
  return publishedUrl || "https://note.com/notes?status=published";
}
