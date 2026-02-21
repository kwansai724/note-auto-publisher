import { Page } from "playwright";
import { humanDelay, log } from "./utils.js";

export interface Draft {
  title: string;
  order: number;
  url: string;
}

/**
 * プレフィックス番号を解析（例: "[01] タイトル" → 1）
 */
function parsePrefix(title: string): number | null {
  const match = title.match(/^\[(\d+)\]\s*/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * プレフィックスを除去してクリーンなタイトルを返す
 */
export function cleanTitle(title: string): string {
  return title.replace(/^\[\d+\]\s*/, "");
}

/**
 * 下書き一覧を取得し、プレフィックス番号順にソート
 */
export async function getDrafts(page: Page): Promise<Draft[]> {
  log("下書き一覧を取得中...");
  await page.goto("https://note.com/dashboard/drafts", {
    waitUntil: "networkidle",
  });
  await humanDelay();

  // 下書き記事のリンクを取得
  const draftElements = page.locator(
    'a[href*="/n/"][href*="dashboard"] >> visible=true'
  );

  // より広い範囲でリンクを探索（noteのUI構造に合わせてフォールバック）
  let links = await draftElements.all();

  if (links.length === 0) {
    // フォールバック: ダッシュボードのすべてのリンクから下書き記事を特定
    const allLinks = page.locator('a[href*="/n/"]');
    links = await allLinks.all();
  }

  const drafts: Draft[] = [];

  for (const link of links) {
    const href = await link.getAttribute("href");
    const text = await link.textContent();

    if (!href || !text) continue;

    const title = text.trim();
    const order = parsePrefix(title);

    // プレフィックスなしの下書きは無視
    if (order === null) continue;

    const url = href.startsWith("http") ? href : `https://note.com${href}`;

    drafts.push({ title, order, url });
  }

  // 番号順にソート
  drafts.sort((a, b) => a.order - b.order);

  log(`プレフィックス付き下書き: ${drafts.length}件`);
  for (const draft of drafts) {
    log(`  [${String(draft.order).padStart(2, "0")}] ${cleanTitle(draft.title)}`);
  }

  return drafts;
}

/**
 * 次に公開すべき下書きを取得（番号が最も小さいもの）
 */
export function getNextDraft(drafts: Draft[]): Draft | null {
  return drafts.length > 0 ? drafts[0] : null;
}
