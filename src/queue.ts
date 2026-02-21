import { readFileSync, writeFileSync } from "fs";
import { log } from "./utils.js";

const QUEUE_PATH = "queue.yml";

/**
 * queue.yml からタイトル一覧を読み込む
 */
export function loadQueue(): string[] {
  const content = readFileSync(QUEUE_PATH, "utf-8");
  const titles: string[] = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    // "- タイトル" 形式の行を取得（コメント・空行はスキップ）
    if (trimmed.startsWith("- ")) {
      titles.push(trimmed.slice(2).trim());
    }
  }

  return titles;
}

/**
 * 公開済みのタイトルを queue.yml から削除する
 */
export function removeFromQueue(publishedTitle: string): void {
  const content = readFileSync(QUEUE_PATH, "utf-8");
  const lines = content.split("\n");
  const newLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      return trimmed.slice(2).trim() !== publishedTitle;
    }
    return true;
  });

  writeFileSync(QUEUE_PATH, newLines.join("\n"));
  log(`queue.yml から削除: "${publishedTitle}"`);
}
