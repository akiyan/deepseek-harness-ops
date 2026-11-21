# deepseek-harness-ops

akiyan/deepseek-harness の個人運用リポジトリ。実装とテストは [本体](https://github.com/akiyan/deepseek-harness/tree/akiyan)、導入・更新・復旧の手順はここで管理する。

対象は Linux 上のローカル Web 版。自動テストで外部 OpenAI 通信を置き換えた結果と、実通信の結果を分けて記録する。過去版の接続確認は現行の標準認証への移行を保証しない。今回の実アカウント認証・推論は未実施。

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

起動した Web 画面の Settings → Models から接続する。ChatGPT プランは **openai-codex / OpenAI (ChatGPT plan)**、API キーは **openai** の API キー方式を使う。旧独自 `chatgpt` からは再認証とプロバイダーの選び直しが必要。

- [akiyan fork の変更情報](dsh_akiyan_fork.md)
- [公開前の確認記録](docs/public-readiness.md)
- [ChatGPT の接続](docs/sign-in-with-chatgpt.md)
- [Exa 検索の設定](docs/exa-search.md)
- [上流追従](docs/upstream-sync.md)
- [復旧](docs/recovery.md)
- [初回実装の検証記録](releases/2026-11-12.md)
- [プロンプト履歴の操作と検証記録](releases/2026-11-13.md)
- [時雨堂追随とExa設定グループの検証記録](releases/2026-11-15.md)
- [前回の時雨堂追随](releases/2026-11-16.md)
- [最新の時雨堂追随と標準認証への移行](releases/2026-11-21.md)
- [さくらのAI Engine の追加と検証記録](releases/2026-11-19.md)

資格情報、実データを含む DSH_HOME、OAuth の URL、認証コード、トークンはこのリポジトリへ保存しない。

## 検証

現行版の重点コマンドと結果は[最新の追随記録](releases/2026-11-21.md)を参照する。本体の keyless ブラウザーテストは検証専用の DSH_HOME と外部通信の置き換えを使用する。

運用リポジトリの `scripts/ui-smoke.mjs` と `scripts/pending-provider-smoke.mjs` は旧独自 `chatgpt` 画面用の履歴資料であり、現行版の検証には使わない。`npm run test:ui` も旧版専用。実アカウントへのログインやモデル呼び出しは利用者が行い、資格情報・認証 URL は記録しない。

## 公開する情報とローカルデータ

このリポジトリは運用手順、変更情報、仮データを使う検証スクリプトを公開する。`package.json` の `private: true` は npm への誤公開防止であり、GitHub の可視性とは独立している。

`.local/` 内のブラウザープロファイル・画像、`node_modules/`、`.env`、ログは Git 管理外に置く。実際の DSH_HOME と資格情報のバックアップはリポジトリの外に置く。公開用アーカイブは `git archive HEAD` など追跡済みファイルから作り、作業ディレクトリ全体を圧縮しない。
