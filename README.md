# note自動投稿ツール

noteの下書き記事を毎日自動で公開するツールです。GitHub Actions + Playwrightで動作します。

## 仕組み

1. 毎日20:00（JST）にGitHub Actionsが起動
2. `queue.yml` から公開する記事のタイトルとハッシュタグを読み込む
3. noteにログインし、下書き一覧とタイトルを照合
4. 最初にマッチした記事にハッシュタグを設定して公開（1日1記事）
5. 公開後、`queue.yml` から自動で削除し、`history.yml` に公開履歴（タイトルと時間）を保存してコミット

## クイックスタート

### 1. リポジトリをフォーク/クローン

```bash
git clone https://github.com/your-username/note-auto-publisher.git
cd note-auto-publisher
npm install
```

### 2. 公開キューを設定

`queue.yml` に公開したい記事のタイトルとハッシュタグを順番に記載します：

```yaml
# 上から順に1日1記事ずつ公開されます
- title: 最初に公開したい記事のタイトル
  hashtags:
    - タグ1
    - タグ2
- title: 2番目に公開したい記事のタイトル
  hashtags:
    - タグ3
```

- タイトルはnoteの下書きと **完全一致** する必要があります
- 公開後、そのエントリは `queue.yml` から自動で削除され、`history.yml` に公開履歴（タイトルと時間）が記録されます
- 下書きに存在しないタイトルはスキップされます

### 3. ローカルで動作確認

```bash
cp .env.example .env
# .env にnoteのメールアドレスとパスワードを設定

# DRY RUNモードでテスト（公開ボタンは押さない）
npm run dry-run

# 本番実行（実際に公開される）
npm start
```

### 4. GitHub Actionsを設定

リポジトリの Settings → Secrets and variables → Actions で以下を設定：

| Secret名 | 値 |
|---|---|
| `NOTE_EMAIL` | noteのメールアドレス |
| `NOTE_PASSWORD` | noteのパスワード |

### 5. 手動テスト

Actions タブ → 「note下書き自動公開」 → 「Run workflow」で手動実行できます。
初回は `dry_run: true` で確認してください。

## 自動投稿を停止する

Actions タブ → 左メニュー「note下書き自動公開」→ 右上の「**...**」→「**Disable workflow**」で停止できます。
再開するときは同じ場所で「Enable workflow」をクリックしてください。

## 注意事項

- **1日1記事** のみ公開します
- noteの2段階認証には対応していません。無効にしてください
- noteのUI変更により動作しなくなる可能性があります
- 利用は **自己責任** でお願いします

## 詳細ドキュメント

- [セットアップガイド](docs/setup-guide.md)
- [トラブルシューティング](docs/troubleshooting.md)
