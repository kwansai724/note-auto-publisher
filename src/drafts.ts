import { Page } from "playwright";
import { humanDelay, log } from "./utils.js";

export interface Draft {
  title: string;
}

/**
 * 下書き一覧からタイトル一覧を取得
 */
export async function getDraftTitles(page: Page): Promise<string[]> {
  log("下書き一覧を取得中...");
  await page.goto("https://note.com/notes?status=draft", {
    waitUntil: "networkidle",
  });
  await humanDelay();

  // 記事カードの編集ボタン（aria-labelにタイトルが入っている）
  const editButtons = await page
    .locator("button.o-articleList__link")
    .all();

  const titles: string[] = [];

  for (const button of editButtons) {
    const ariaLabel = await button.getAttribute("aria-label");
    if (!ariaLabel) continue;

    // aria-label は "タイトルを編集" の形式
    const title = ariaLabel.replace(/を編集$/, "");
    titles.push(title);
  }

  log(`下書き: ${titles.length}件`);
  return titles;
}

/**
 * キューと下書き一覧を照合し、最初にマッチするタイトルを返す
 */
export function findNextDraft(
  queue: string[],
  draftTitles: string[]
): Draft | null {
  for (const queueTitle of queue) {
    if (draftTitles.includes(queueTitle)) {
      return { title: queueTitle };
    }
    log(`  キュー「${queueTitle}」→ 下書きに見つかりません（スキップ）`);
  }
  return null;
}
