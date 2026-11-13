# deepseek-harness-ops

akiyan/deepseek-harness の個人運用リポジトリ。実装とテストは [本体](https://github.com/akiyan/deepseek-harness/tree/akiyan)、導入・更新・復旧の手順はここで管理する。

対象は Linux 上のローカル Web 版。自動テストで外部 OpenAI 通信を置き換えた結果と、実通信の結果を分けて記録する。接続済み資格情報の再起動後の保持は確認済みだが、実モデルへの推論の検証記録はまだない。

## 導入

Node.js 24.9 以上と、本体 package.json の packageManager に記載された pnpm を使用する。

```bash
git clone --branch akiyan https://github.com/akiyan/deepseek-harness.git
cd deepseek-harness
pnpm install --frozen-lockfile
pnpm run build:artifacts
pnpm run build:check
pnpm dsh web --no-open
```

起動した Web 画面の Settings → Models にある **Sign in with ChatGPT** から接続する。既存の OpenAI は API キー認証用。

- [akiyan fork の変更情報](dsh_akiyan_fork.md)
- [公開前の確認記録](docs/public-readiness.md)
- [ChatGPT の接続](docs/sign-in-with-chatgpt.md)
- [Exa 検索の設定](docs/exa-search.md)
- [上流追従](docs/upstream-sync.md)
- [復旧](docs/recovery.md)
- [初回実装の検証記録](releases/2026-11-12.md)
- [プロンプト履歴の操作と検証記録](releases/2026-11-13.md)

資格情報、実データを含む DSH_HOME、OAuth の URL、認証コード、トークンはこのリポジトリへ保存しない。

## ブラウザー検証

本体を検証専用の DSH_HOME で起動する。下記のダミー API キーは初回案内を抑止するためだけに使い、推論は行わない。ディレクトリ選択にはリポジトリのブラウザー検証用パッチを使う。

```bash
DSH_HOME="$PWD/.local/ui-home" DEEPSEEK_API_KEY=dsh-ui-test-placeholder pnpm dsh web \
  --patch apps/web/tests/pin-browse-picker.overlay.yml --no-open \
  > "$HOME/dsh-ui-private.log" 2>&1
```

別のターミナルで、この運用リポジトリから実行する。

```bash
npm ci
npx playwright install chromium
DSH_TEST_LOG="$HOME/dsh-ui-private.log" npm run test:ui
```

実画面でログイン開始、公式認証先へのリダイレクト、キャンセル、ライト・ダーク表示、幅 390px を検査し、画像を .local/ui/ に保存する。接続済み表示とログアウト応答には表示検証用の仮データを使い、一覧への追加・開閉・削除を確認する。実アカウントへのログインやモデル呼び出しは行わない。起動ログには接続用の秘密情報があるため、公開しない。

## 公開する情報とローカルデータ

このリポジトリは運用手順、変更情報、仮データを使う検証スクリプトを公開する。`package.json` の `private: true` は npm への誤公開防止であり、GitHub の可視性とは独立している。

`.local/` 内のブラウザープロファイル・画像、`node_modules/`、`.env`、ログは Git 管理外に置く。実際の DSH_HOME と資格情報のバックアップはリポジトリの外に置く。公開用アーカイブは `git archive HEAD` など追跡済みファイルから作り、作業ディレクトリ全体を圧縮しない。
