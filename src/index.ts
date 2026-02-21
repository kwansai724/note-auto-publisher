import "dotenv/config";
import { loadConfig } from "./config.js";
import { login } from "./auth.js";
import { getDraftTitles, findNextDraft } from "./drafts.js";
import { loadQueue, removeFromQueue } from "./queue.js";
import { publishDraft } from "./publish.js";
import { log } from "./utils.js";

async function main(): Promise<void> {
  log("=== note自動投稿ツール 開始 ===");

  const config = loadConfig();

  if (config.dryRun) {
    log("[DRY RUN モード] 公開操作は実行されません");
  }

  // キュー読み込み
  const queue = loadQueue();
  if (queue.length === 0) {
    log("queue.yml が空です。公開する記事がありません");
    log("=== 正常終了 ===");
    return;
  }
  log(`キュー: ${queue.length}件`);

  // ログイン
  const { browser, page } = await login(config);

  try {
    // 下書き一覧取得
    const draftTitles = await getDraftTitles(page);

    // キューと下書きを照合
    const nextDraft = findNextDraft(queue, draftTitles);
    if (!nextDraft) {
      log("キューの記事が下書き一覧に見つかりません");
      log("=== 正常終了（公開対象なし） ===");
      return;
    }

    // 公開実行
    await publishDraft(page, nextDraft, config);

    // 公開後、queue.yml から削除
    if (!config.dryRun) {
      removeFromQueue(nextDraft.title);
    }

    log("=== 完了 ===");
  } finally {
    await browser.close();
    log("ブラウザを終了");
  }
}

// リトライ付き実行
async function run(): Promise<void> {
  try {
    await main();
  } catch (error) {
    log(`エラー発生: ${error}`);

    // 1回リトライ
    log("リトライ中...");
    try {
      await main();
    } catch (retryError) {
      log(`リトライ失敗: ${retryError}`);
      process.exit(1);
    }
  }
}

run();
