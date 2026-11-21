# shiguredo への追従

本体は shiguredo の先頭に akiyan 独自差分を 1 コミットだけ載せる。コミットメッセージは変更情報ページの URL のみとし、shiguredo の形式を踏襲する。shiguredo 自身の独自コミットはそのまま祖先に保持する。運用文書は本リポジトリで管理する。公開開始時点の履歴は、固有情報を除いた初期コミット1つにまとめている。

初回の基準は shiguredo/shiguredo の 5ab222a95832897c01c3c51a0b9d63e6410eaa74。

## 更新手順

1. 未コミット変更を確認する。更新と混ぜない。
2. origin と shiguredo を fetch し、現在の origin/akiyan の SHA を控える。
3. 稼働中の akiyan コミットをタグなどで保持する。
4. 作業ブランチを新しい shiguredo/shiguredo から作り、必要な独自差分だけを移植する。上流に取り込まれた機能は旧差分を退役させ、古い認証・画面を一括 cherry-pick で復活させない。現在の維持対象は入力履歴・Exa・さくらのAI Engine・次のメッセージの候補。[標準認証への移行](sign-in-with-chatgpt.md)も確認する。
5. 競合を解消し、重点的な認証・モデル一覧・入力・検索の回帰テスト、組み立て済み Web 画面の検証、doc-sync、build:artifacts を実行する。build:check は最後の build:artifacts より後に実行する。実アカウント認証・有料 API 推論は無断で行わず、未実施なら記録する。
6. 本体の独自差分を1コミットへ確定し（必要なら amend）、メッセージを次の URL のみにする。[変更情報](../dsh_akiyan_fork.md) の基準 SHA、対象パス、挙動と、releases/ の本体 SHA・実行した検証・既知の制限を更新し、ops に先に push する。本体コミットのローカル作成は先でもよいが、本体の push は ops の後にする。

   ```text
   https://github.com/akiyan/deepseek-harness-ops/blob/main/dsh_akiyan_fork.md
   ```

7. akiyan ブランチを更新し、控えたリモート SHA を指定する force-with-lease で公開する。リモートが動いていたら中止して確認する。
8. 両リポジトリの公開先 SHA と作業ツリーの状態を確認する。公開と稼働チェックアウトの更新・再起動は別作業として扱う。

CI の設定、リリースへの公開、デプロイ先を更新する場合は、その変更も検証する。上流の公開パッケージを akiyan の実装としてインストールしない。
