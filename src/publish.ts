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
 *   → シェアモーダル表示（公開完了）
 */
export async function publishDraft(
  page: Page,
  draft: Draft,
  config: Config,
  hashtags: string[]
): Promise<void> {
  log(`対象記事: "${draft.title}"`);

  if (config.dryRun) {
    log(`[DRY RUN] ハッシュタグ: ${hashtags.join(", ")}`);
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

  // Step 4: 「投稿する」クリック + APIレスポンスで公開完了を検知
  log("「投稿する」をクリック中...");
  const submitButton = page.getByRole("button", { name: "投稿する" });
  await submitButton.waitFor({ state: "visible", timeout: 30000 });
  await humanDelay(1000, 2000);

  // クリックと同時にAPIレスポンスを待機
  const [publishResponse] = await Promise.all([
    page
      .waitForResponse(
        (res) =>
          res.url().includes("note.com") &&
          (res.request().method() === "PUT" ||
            res.request().method() === "POST") &&
          res.status() >= 200 &&
          res.status() < 300,
        { timeout: 30000 }
      )
      .catch(() => null),
    submitButton.click(),
  ]);

  // Step 5: 公開完了を確認
  if (publishResponse) {
    log(
      `公開完了を確認（API: ${publishResponse.request().method()} ${publishResponse.status()}）`
    );
  } else {
    // APIレスポンス検知に失敗した場合、モーダル表示をフォールバックで確認
    log("APIレスポンスを検知できませんでした。モーダル表示を確認中...");
    const modalDetected = await detectPublishModal(page);
    if (modalDetected) {
      log("公開完了を確認（モーダル検知）");
    } else {
      log(
        "⚠ 公開完了シグナルを検出できませんでしたが、投稿ボタンはクリック済みです"
      );
      log("⚠ 投稿は成功した前提で続行します");
    }
  }
}

/**
 * 公開完了モーダルをテキスト非依存で検知する
 * モーダル内のシェアボタン（SNSリンク）の出現を待つ
 */
async function detectPublishModal(page: Page): Promise<boolean> {
  try {
    // シェアボタン（twitter/X, facebook等）のリンクはモーダルのテキストに関係なく表示される
    await page
      .locator('a[href*="twitter.com/intent"], a[href*="x.com/intent"], a[href*="facebook.com/shar"]')
      .first()
      .waitFor({ state: "visible", timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}
