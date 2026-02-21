# note自動投稿ツール

noteの下書き記事を毎日自動で公開するツールです。GitHub Actions + Playwrightで動作します。

## 仕組み

1. 毎日20:00（JST）にGitHub Actionsが起動
2. noteにログインし、下書き一覧を取得
3. タイトルに `[01]`、`[02]` 等のプレフィックスが付いた下書きを番号順に特定
4. 最も番号の小さい下書きを1日1記事公開
5. 公開時にプレフィックスを自動除去

## クイックスタート

### 1. リポジトリをフォーク/クローン

```bash
git clone https://github.com/your-username/note-auto-publisher.git
cd note-auto-publisher
npm install
```

### 2. noteで下書きを準備

下書きのタイトルにプレフィックス番号を付けます：

```
[01] 最初に公開したい記事
[02] 2番目に公開したい記事
[03] 3番目に公開したい記事
```

- プレフィックスなしの下書きは無視されます（手動管理用）
- 公開時にプレフィックスは自動で除去されます

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

## 下書きの命名ルール

| タイトル | 動作 |
|---|---|
| `[01] AI活用術まとめ` | 公開対象（番号1） |
| `[02] プログラミング入門` | 公開対象（番号2） |
| `思いつきメモ` | 無視（プレフィックスなし） |

## 注意事項

- **1日1記事** のみ公開します
- noteの2段階認証には対応していません。無効にしてください
- noteのUI変更により動作しなくなる可能性があります
- 利用は **自己責任** でお願いします

## 詳細ドキュメント

- [セットアップガイド](docs/setup-guide.md)
- [トラブルシューティング](docs/troubleshooting.md)
