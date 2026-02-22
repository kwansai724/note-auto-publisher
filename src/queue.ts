import { appendFileSync, readFileSync, writeFileSync } from "fs";
import { log } from "./utils.js";

const QUEUE_PATH = "queue.yml";
const HISTORY_PATH = "history.yml";

export interface QueueItem {
  title: string;
  hashtags: string[];
}

/**
 * queue.yml からキューアイテム一覧を読み込む
 *
 * フォーマット:
 *   - title: 記事タイトル
 *     hashtags:
 *       - タグ1
 *       - タグ2
 */
export function loadQueue(): QueueItem[] {
  const content = readFileSync(QUEUE_PATH, "utf-8");
  const items: QueueItem[] = [];
  const lines = content.split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const titleMatch = line.match(/^- title:\s*(.+)$/);
    if (titleMatch) {
      const title = titleMatch[1].trim();
      const hashtags: string[] = [];

      // 次の行が "  hashtags:" か確認
      if (i + 1 < lines.length && lines[i + 1].match(/^\s+hashtags:\s*$/)) {
        i += 2; // hashtags: の次の行へ
        // インデントされた "- タグ" を収集
        while (i < lines.length) {
          const tagMatch = lines[i].match(/^\s+-\s+(.+)$/);
          if (tagMatch) {
            hashtags.push(tagMatch[1].trim());
            i++;
          } else {
            break;
          }
        }
      } else {
        i++;
      }

      items.push({ title, hashtags });
    } else {
      i++;
    }
  }

  return items;
}

/**
 * 公開済みのタイトルを queue.yml から削除する
 */
export function removeFromQueue(publishedTitle: string): void {
  const content = readFileSync(QUEUE_PATH, "utf-8");
  const lines = content.split("\n");
  const newLines: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const titleMatch = line.match(/^- title:\s*(.+)$/);
    if (titleMatch && titleMatch[1].trim() === publishedTitle) {
      // このエントリ全体をスキップ
      i++;
      // hashtags: 行をスキップ
      if (i < lines.length && lines[i].match(/^\s+hashtags:\s*$/)) {
        i++;
        // タグ行をスキップ
        while (i < lines.length && lines[i].match(/^\s+-\s+/)) {
          i++;
        }
      }
    } else {
      newLines.push(line);
      i++;
    }
  }

  writeFileSync(QUEUE_PATH, newLines.join("\n"));

  // 履歴に追記
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp = `${jst.getUTCFullYear()}/${pad(jst.getUTCMonth() + 1)}/${pad(jst.getUTCDate())} ${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}`;
  appendFileSync(HISTORY_PATH, `- title: ${publishedTitle}\n  published_at: "${timestamp}"\n`);

  log(`queue.yml から削除: "${publishedTitle}"`);
  log(`history.yml に記録: "${publishedTitle}" (${timestamp})`);
}
