# セットアップガイド

## 前提条件

- GitHubアカウント
- noteアカウント（2段階認証は無効にしてください）
- Node.js 20以上（ローカルテスト時のみ）

## Step 1: リポジトリの準備

### フォークする場合

1. このリポジトリの「Fork」ボタンをクリック
2. 自分のアカウントにフォークされたリポジトリをクローン

### テンプレートとして使う場合

1. 「Use this template」→「Create a new repository」
2. リポジトリ名を入力して作成
3. クローン

```bash
git clone https://github.com/your-username/note-auto-publisher.git
cd note-auto-publisher
```

## Step 2: GitHub Secretsの設定

1. リポジトリページで **Settings** タブを開く
2. 左メニューの **Secrets and variables** → **Actions** をクリック
3. **New repository secret** で以下の変数を追加します：

### 必須設定

| Name | Value |
| --- | --- |
| `NOTE_EMAIL` | noteに登録したメールアドレス |
| `NOTE_PASSWORD` | noteのパスワード |

### オプション設定（URLの最適化とメール通知）

必要に応じて以下の変数を追加してください。

| Name | Value | 説明 |
| --- | --- | --- |
| `NOTE_USER_ID` | 例: `takah_note` | noteのユーザーIDです。設定すると、通知メールのURLがフルURL（`/takah_note/n/...`）になります。未設定の場合はショートURL（`/n/...`）になりますが、クリックすればフルURLへ自動リダイレクトされます。 |
| `GAS_WEBHOOK_URL` | 例: `https://script.google.com/...` | 投稿完了を通知するGAS（Google Apps Script）のWebhook URLです。 |
| `NOTIFICATION_EMAIL` | 例: `your_email@example.com` | 投稿完了通知を受け取りたいメールアドレスです。 |

> Secretsに保存された値はログにも表示されません。安全に管理されます。

## Step 3: 公開キューを設定

リポジトリ内の `queue.yml` に、公開したい記事のタイトルとハッシュタグを順番に記載します。

### 書き方の例

```
# 上から順に1日1記事ずつ公開されます
- title: 最初に公開したい記事のタイトル
  hashtags:
    - タグ1
    - タグ2
- title: 2番目に公開したい記事のタイトル
  hashtags:
    - タグ3
```

### ルール

- `title` はnoteの下書きのタイトルと **完全一致** する必要があります。
- 1日1記事、上から順番に公開されます。
- 公開後、そのエントリは `queue.yml` から自動で削除され、`history.yml` に履歴が残ります。
- 指定されたタイトルが下書きに存在しない場合はスキップされます。

## Step 4: 動作確認

### ローカルでテスト（任意）

```bash
npm install
cp .env.example .env
# .env を編集してメールアドレスとパスワードを設定

# DRY RUNで確認（公開ボタンは押さない）
npm run dry-run
```

### GitHub Actionsで手動テスト

1. リポジトリの **Actions** タブを開く
2. 左メニューから「note下書き自動公開」を選択
3. **Run workflow** をクリック
4. `dry_run` を `true` に設定して実行
5. 実行ログで正常に動作していることを確認

### 本番テスト

1. noteに「テスト記事」という下書きを作成（本文は適当でOK）
2. リポジトリの `queue.yml` の一番上に `- title: テスト記事` を追加してコミット
3. GitHub Actionsで `dry_run: false` で手動実行
4. noteを確認して記事が公開されていればOK
5. テスト記事を削除

## Step 5: スケジュール実行の確認

設定が完了すると、毎日20:00（JST）に自動実行されます。

- 翌日のActionsログを確認して、正常に実行されたことを確認してください
- 公開対象の下書きがない場合は、正常終了します（エラーにはなりません）

## カスタマイズ

### 実行時刻を変更する

`.github/workflows/publish.yml` の `cron` を編集します：

```yaml
schedule:
  - cron: '0 11 * * *'  # JST 20:00 = UTC 11:00
```

UTC時刻で指定します。JST = UTC + 9時間です。

| JST | UTC | cron |
|---|---|---|
| 07:00 | 22:00（前日） | `0 22 * * *` |
| 12:00 | 03:00 | `0 3 * * *` |
| 18:00 | 09:00 | `0 9 * * *` |
| 20:00 | 11:00 | `0 11 * * *` |
| 21:00 | 12:00 | `0 12 * * *` |

### 特定の曜日だけ実行する

```yaml
# 平日のみ（月〜金）
schedule:
  - cron: '0 11 * * 1-5'

# 週3回（月・水・金）
schedule:
  - cron: '0 11 * * 1,3,5'
```
