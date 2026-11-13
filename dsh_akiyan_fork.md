# DeepSeek Harness akiyan fork 変更情報

[shiguredo/shiguredo](https://github.com/shiguredo/deepseek-harness/tree/shiguredo)（`5ab222a95832897c01c3c51a0b9d63e6410eaa74`）を基礎にしています。[時雨堂 fork の変更情報](https://gist.github.com/voluntas/34ac1f8ced7052d69dc37f54fc57155c)に記載された変更を引き継ぎ、その上に以下の独自差分を1コミットで載せています。

本体は [akiyan/deepseek-harness の akiyan ブランチ](https://github.com/akiyan/deepseek-harness/tree/akiyan)。コミットメッセージはこのページの URL のみとし、変更の説明と運用文書はこのリポジトリで管理します。

## 独自変更

### 1. Sign in with ChatGPT プロバイダー

`packages/llm/llm-pi-ai/src/chatgpt`、`packages/llm/llm-pi-ai/src/config.ts`、`packages/bundle/base/cordis.patch.yml`

- 既存 OpenAI の API キー経路とは別に `chatgpt` を登録する。API キーへは自動で切り替えない
- 公式 OSS 向け OAuth の動的クライアント登録、PKCE、loopback callback、本人情報の署名検証を使う。Codex や ChatGPT の既存認証ファイルは読み込まない
- 登録名の候補を `DeepSeek Harness (<hostname>)` とし、dsh Host の名前を使う
- 登録情報・トークンは既存 credential store の専用レコードへ保存し、更新トークン交換をプロセス間ロックで直列化する
- モデル一覧は接続中アカウントから取得し、同梱 pi-ai カタログで能力を解決できるモデルを表示する。能力解決のために同じモデル一覧通信を繰り返さない
- 推論は既存ループと Responses 実装を使い、ツールを `dsh` 名前空間にまとめる
- ログアウトはセッション失効を試みてローカルトークンを削除する。失効を確認できない場合は利用者へ案内する

### 2. モデル設定と接続状態の表示

`packages/client/ui-settings-models`

- 「モデルプロバイダーを追加」の選択肢に Sign in with ChatGPT を追加する
- 未接続時の開始操作は Continue with ChatGPT に統一する。接続後は他のプロバイダーと同じ一覧に折りたたみ表示し、「編集」で詳細を開く
- 接続中アカウントに再接続・ログアウト・使用量管理を提供する。アカウント切り替え欄は設けず、別アカウントを使う場合はログアウトして追加し直す
- ログアウト済み登録は一覧から外し、別の保存済みアカウントへ自動で切り替えない
- 接続済みなら、モデル一覧の取得が一時的に失敗しても初回の DeepSeek ログイン・API キー案内を自動表示しない
- アカウント状態の取得成功で取得エラーを解除する。ログアウトなどの操作自体のエラーは次の操作まで保持する
- 別ブラウザーで ChatGPT 認証が待機中でも、プロバイダー選択とカスタム API の設定を操作できる。選択変更で他のブラウザーの認証をキャンセルしない

### 3. 別端末からの認証完了

`packages/client/ui-settings-models/src/client/ChatGPTCard.tsx`、`packages/llm/llm-pi-ai/src/chatgpt/index.ts`、`packages/llm/llm-pi-ai/src/chatgpt/account.ts`

- ローカル画面では loopback callback を使う。Tailscale など非ローカルの画面では、最後の戻り先 URL をコピーして dsh へ貼る手順を確認モーダルで案内する
- 確認後、戻り先 URL 入力欄へフォーカスしてから認証タブを開く。元のタブに戻るとそのまま貼り付けられる。認証タブの opener は切り離す
- 戻り先は URL 全体でも、`?` 以降のクエリでもよい。`http://` が欠けた入力も受け付ける。入力内容は通常のテキストとして表示し、送信後に消す
- Host は待機中の `state` を照合し、自身の loopback listener へ渡す。入力された URL を任意の通信先として使わず、コード交換時の `redirect_uri` は元の値を保持する
- キャンセル操作を提供し、開始失敗や画面破棄では未完了の空タブを閉じる。ポップアップが阻止された場合は開き直しリンクを残す

### 4. 入力欄のプロンプト履歴

`packages/client/ui-conversation/src/client/input`

- 入力欄の最初の可視行で ↑ を押すと、同じチャットの過去の人工プロンプトを新しい順に呼び出す。自動入力や文字のないメッセージは対象外
- 最後の可視行で ↓ を押すと新しい履歴へ進み、最新の次で呼び出し前の入力に戻る
- 通常の下書きでは複数行・折り返しの途中はカーソル移動を優先する。履歴表示中はカーソル位置にかかわらず上下で履歴を移動し、履歴が1件だけでも下キーで元の空欄・下書きへ戻れる。補完候補、範囲選択、IME、修飾キー付き上下の動作を維持する
- 履歴の表示・編集中も元の意味付き下書きを保存する。リロードと履歴の再送成功後は元の下書きを復元し、送信失敗時は再送内容を編集できる
- 古い履歴ページは必要時に取得する。待機中の編集・下書きへの復帰・入力欄の破棄を、遅れて到着した履歴で上書きしない
- 呼び出すのはテキストだけで、過去の添付ファイルを再追加しない。現在の添付欄は表示と通常の送信動作を維持する

### 5. Exa ウェブ検索

`packages/web/web-search-exa`、`packages/client/ui-settings-web-search-exa`、`packages/bundle/base`、`packages/bundle/web-app`

- 検索プロバイダー `exa` を同梱し、Ollama 検索と同じ設定フォーム部品で Exa の設定カードを提供する。プラグイン一覧では検索処理を「Exa検索」、設定UIを「Exa検索の設定」と表示する
- `EXA_API_KEY` があれば REST API の `POST /search`、なければ匿名 MCP の `web_search_advanced_exa` を使う。MCP の接続・JSON/SSE 処理は既存のクライアント SDK に任せる
- キーは資格情報ストアまたは起動環境から解決する。UI のキー保存・削除は資格情報 RPC を使い、設定ファイルへは書かず、保存後に入力を消す
- スイッチは検索だけを Exa に切り替え、ページ取得の選択は維持する。結果数は1〜100、既定5件。設定の保存・キーの存在確認では実検索しない
- 検索ごとに設定とキーを読み、引用できる URL・タイトル・ハイライト抜粋・公開日を既存の検索結果に渡す。新しいモデル向けツールは増やさない
- リダイレクトを拒否し、取消・時間制限・レスポンス上限を扱う。認証失敗時の匿名への切り替えや自動再試行は行わない
- [TonyDua の実装](https://github.com/TonyDua/dsh-web-search-exa)と[Exa 公式 MCP](https://github.com/exa-labs/exa-mcp-server)をプロトコルの参考にした

## 検証と運用

- [Exa の設定](docs/exa-search.md)
- [接続手順](docs/sign-in-with-chatgpt.md)、[上流追従とコミット形式](docs/upstream-sync.md)、[復旧](docs/recovery.md)
- [認証・設定 UI の検証記録](releases/2026-11-12.md)、[プロンプト履歴の検証記録](releases/2026-11-13.md)
- Host / Client の回帰テスト、keyless のファイル編集再生、Chromium / WebKit の実画面検証を含む。外部 OpenAI 通信を置き換えたテストと実通信は区別する
- 対象は Linux のローカル Web 版。Desktop 配布物、他 OS、実モデルによる一連の推論動作は検証記録の対象外
