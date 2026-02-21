export interface Config {
  noteEmail: string;
  notePassword: string;
  dryRun: boolean;
  headless: boolean;
}

export function loadConfig(): Config {
  const noteEmail = process.env.NOTE_EMAIL;
  const notePassword = process.env.NOTE_PASSWORD;

  if (!noteEmail || !notePassword) {
    throw new Error(
      "NOTE_EMAIL と NOTE_PASSWORD を環境変数または .env ファイルに設定してください"
    );
  }

  return {
    noteEmail,
    notePassword,
    dryRun: process.env.DRY_RUN === "true",
    headless: process.env.HEADLESS !== "false", // デフォルトheadless
  };
}
