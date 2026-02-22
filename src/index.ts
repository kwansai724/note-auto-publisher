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
    const match = findNextDraft(queue, draftTitles);
    if (!match) {
      log("キューの記事が下書き一覧に見つかりません");
      log("=== 正常終了（公開対象なし） ===");
      return;
    }

    // 公開実行（記事ごとのハッシュタグを渡す）
    const publishedUrl = await publishDraft(page, match.draft, config, match.hashtags);

    // 公開後、queue.yml から削除およびメール送信
    if (!config.dryRun) {
      removeFromQueue(match.draft.title);

      // GAS経由でメール送信
      if (config.gasWebhookUrl && config.notificationEmail) {
        log("GAS経由で通知メールを送信中...");
        try {
          const payload = {
            title: match.draft.title,
            url: publishedUrl || "https://note.com/notes?status=published",
            to: config.notificationEmail,
          };

          const response = await fetch(config.gasWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            log("通知メールの送信リクエストに成功しました");
          } else {
            log(`通知メールの送信リクエストに失敗しました: ${response.status}`);
          }
        } catch (e) {
          log(`通知メール送信中のエラー: ${e}`);
        }
      } else {
        log("GAS_WEBHOOK_URL または NOTIFICATION_EMAIL が未設定のため、メール通知はスキップします");
      }
    }

    log("=== 完了 ===");
  } finally {
    await browser.close();
    log("ブラウザを終了");
  }
}

main().catch((error) => {
  log(`エラー: ${error}`);
  process.exit(1);
});
