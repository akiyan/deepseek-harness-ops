# DeepSeek Harness akiyan fork 変更情報

[shiguredo/shiguredo](https://github.com/shiguredo/deepseek-harness/tree/shiguredo)（`307e03b521debdbcd8e6a8c5dfe31d24dde9f8a9`）を基礎にしています。[時雨堂 fork の変更情報](https://gist.github.com/voluntas/34ac1f8ced7052d69dc37f54fc57155c)に記載された変更を引き継ぎ、その上に以下の独自差分を1コミットで載せています。

本体は [akiyan/deepseek-harness の akiyan ブランチ](https://github.com/akiyan/deepseek-harness/tree/akiyan)。コミットメッセージはこのページの URL のみとし、変更の説明と運用文書はこのリポジトリで管理します。

## 標準認証への移行

ChatGPT 対応は時雨堂・pi-ai 標準の実装へ置き換えた。旧独自の `chatgpt` プロバイダー、専用アカウント RPC、独自認証カードは差分に含めない。

- ChatGPT プランは `openai-codex`（`OpenAI (ChatGPT plan)`）でログインする
- API キーは既存の `openai` で使う。API キー方式または `apiKeyEnv: OPENAI_API_KEY` を選び、追加の API キー専用プロバイダーは作らない
- 上流にある `openai` の任意の ChatGPT 認証も改変しない。上記は本 fork の使い分け方針
- 旧資格情報の自動変換・削除や会話ログの書き換えはしない。旧 `chatgpt` 利用者は再ログインし、セッションなどのプロバイダーを選び直す

[接続・移行手順](docs/sign-in-with-chatgpt.md)を参照する。

## 独自変更

### 1. 入力欄のプロンプト履歴

`packages/client/ui-conversation/src/client/input`

- 入力欄の最初の可視行で ↑ を押すと、同じチャットの過去の人工プロンプトを新しい順に呼び出す。自動入力や文字のないメッセージは対象外
- 最後の可視行で ↓ を押すと新しい履歴へ進み、最新の次で呼び出し前の入力に戻る
- 通常の下書きでは複数行・折り返しの途中はカーソル移動を優先する。履歴表示中はカーソル位置にかかわらず上下で履歴を移動し、履歴が1件だけでも下キーで元の空欄・下書きへ戻れる。補完候補、範囲選択、IME、修飾キー付き上下の動作を維持する
- 履歴の表示・編集中も元の意味付き下書きを保存する。リロードと履歴の再送成功後は元の下書きを復元し、送信失敗時は再送内容を編集できる
- 古い履歴ページは必要時に取得する。待機中の編集・下書きへの復帰・入力欄の破棄を、遅れて到着した履歴で上書きしない
- 呼び出すのはテキストだけで、過去の添付ファイルを再追加しない。現在の添付欄は表示と通常の送信動作を維持する

### 2. Exa ウェブ検索

`packages/web/web-search-exa`、`packages/client/ui-settings-web-search-exa`、`packages/bundle/base`、`packages/bundle/web-app`

- 検索プロバイダー `exa` を同梱し、Ollama 検索と同じ設定フォーム部品で Exa の設定カードを提供する。プラグイン一覧では検索処理を「Exa検索」、設定UIを「Exa検索の設定」と表示する
- Exa の設定カードは専用スロット `plugins.akiyan` に登録し、「akiyan組み込みプラグイン設定」に表示する。時雨堂の設定と同じ一覧・詳細ページの仕組みを使い、標準および時雨堂の設定グループと分ける。
- `EXA_API_KEY` があれば REST API の `POST /search`、なければ匿名 MCP の `web_search_advanced_exa` を使う。MCP の接続・JSON/SSE 処理は既存のクライアント SDK に任せる
- キーは資格情報ストアまたは起動環境から解決する。UI のキー保存・削除は資格情報 RPC を使い、設定ファイルへは書かず、保存後に入力を消す
- APIキー欄はログインパスワード型を使わず、伏字表示と自動入力無効化、パスワード管理拡張向けの除外指定を使う
- スイッチは検索だけを Exa に切り替え、ページ取得の選択は維持する。結果数は1〜100、既定5件。設定の保存・キーの存在確認では実検索しない
- 検索ごとに設定とキーを読み、引用できる URL・タイトル・ハイライト抜粋・公開日を既存の検索結果に渡す。新しいモデル向けツールは増やさない
- リダイレクトを拒否し、取消・時間制限・レスポンス上限を扱う。認証失敗時の匿名への切り替えや自動再試行は行わない
- [TonyDua の実装](https://github.com/TonyDua/dsh-web-search-exa)と[Exa 公式 MCP](https://github.com/exa-labs/exa-mcp-server)をプロトコルの参考にした

### 3. さくらのAI Engine プロバイダー

`packages/llm/llm-pi-ai/src/bundled-catalog.ts`

- [さくらのAI Engine](https://manual.sakura.ad.jp/cloud/ai-engine/02-howto.html) を同梱ルート `sakura-ai-engine` として追加する。Settings → Models のプロバイダー選択に表示され、アカウントトークン（`<UUID>:<シークレット>`）だけで使える
- 接続先は `https://api.ai.sakura.ad.jp/v1` の Chat Completions。エンドポイントが `max_completion_tokens` を無視するため、出力上限は `max_tokens` で送る
- tool call 対応の6モデル（gpt-oss-120b、DeepSeek-V4.1-Flash、GLM-5.3-Flash、Kimi-K2.7-Code、Qwen3.6-35B-A3B、gemma-4-31B-it）だけを載せる。非対応モデルに `tools` を送ると 400 になるため
- コンテキスト長・出力上限 32,000・画像入力可否は[公開仕様](https://manual.sakura.ad.jp/cloud/ai-engine/chat-models.html)に従う
- 推論レベルは[2026-11-19 の実 API 計測](releases/2026-11-19.md)を維持し、モデルごとに受け付ける値だけを出す。gpt-oss は low/medium/high、DeepSeek は off/low/high/xhigh/max、Kimi・GLM は `none` で思考が止まらないため off を出さない。今回の追随では実 API を再実行していない
- 同梱モデルの推論レベルは、ルート共通の off 可否ではなくモデルごとの「レベル→送信値」表で持つ。Ollama Cloud の挙動は変えない

## 検証と運用

- [今回の追随と検証記録](releases/2026-11-21.md)
- [Exa の設定](docs/exa-search.md)
- [接続手順](docs/sign-in-with-chatgpt.md)、[上流追従とコミット形式](docs/upstream-sync.md)、[復旧](docs/recovery.md)
- [認証・設定 UI の検証記録](releases/2026-11-12.md)、[プロンプト履歴の検証記録](releases/2026-11-13.md)、[さくらのAI Engine の検証記録](releases/2026-11-19.md)
- 各リリースの検証範囲はその記録に従う。過去の独自 ChatGPT 実装のテスト結果を標準認証へ流用しない。外部 OpenAI 通信を置き換えたテストと実通信は区別する
- 対象は Linux のローカル Web 版。Desktop 配布物、他 OS、実モデルによる一連の推論動作は検証記録の対象外
