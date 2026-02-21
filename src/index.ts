import "dotenv/config";
import { loadConfig } from "./config.js";
import { login } from "./auth.js";
import { getDrafts, getNextDraft } from "./drafts.js";
import { publishDraft } from "./publish.js";
import { log } from "./utils.js";

async function main(): Promise<void> {
  log("=== note自動投稿ツール 開始 ===");

  const config = loadConfig();

  if (config.dryRun) {
    log("[DRY RUN モード] 公開操作は実行されません");
  }

  // ログイン
  const { browser, page } = await login(config);

  try {
    // 下書き一覧取得
    const drafts = await getDrafts(page);

    if (drafts.length === 0) {
      log("公開対象の下書きが見つかりません（プレフィックス [01] 等が付いた下書きが必要です）");
      log("=== 正常終了（公開対象なし） ===");
      return;
    }

    // 次に公開すべき下書き
    const nextDraft = getNextDraft(drafts);
    if (!nextDraft) {
      log("公開対象の下書きがありません");
      return;
    }

    // 公開実行
    await publishDraft(page, nextDraft, config);

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
