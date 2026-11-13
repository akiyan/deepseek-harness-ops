# shiguredo への追従

本体は shiguredo の先頭に akiyan 独自差分を 1 コミットだけ載せる。コミットメッセージは変更情報ページの URL のみとし、shiguredo の形式を踏襲する。shiguredo 自身の独自コミットはそのまま祖先に保持する。運用文書は本リポジトリで管理する。公開開始時点の履歴は、固有情報を除いた初期コミット1つにまとめている。

初回の基準は shiguredo/shiguredo の 5ab222a95832897c01c3c51a0b9d63e6410eaa74。

## 更新手順

1. 未コミット変更を確認する。更新と混ぜない。
2. origin と shiguredo を fetch し、現在の origin/akiyan の SHA を控える。
3. 稼働中の akiyan コミットをタグなどで保持する。
4. 作業ブランチを新しい shiguredo/shiguredo から作り、現在の追加 1 コミットを cherry-pick する。
5. 競合を解消し、認証・モデル一覧・ツール往復の回帰テストと build:artifacts、build:check を実行する。
6. [変更情報](../dsh_akiyan_fork.md) の基準 SHA、対象パス、挙動を更新し、ops に先に push する。本体コミットを amend し、メッセージを次の URL のみにする。独自差分が 1 コミットであることを確認する。

   ```text
   https://github.com/akiyan/deepseek-harness-ops/blob/main/dsh_akiyan_fork.md
   ```

7. akiyan ブランチを更新し、控えたリモート SHA を指定する force-with-lease で公開する。リモートが動いていたら中止して確認する。
8. 基準 SHA、追加 SHA、実行した検証、既知の制限を releases/ に記録する。

CI の設定、リリースへの公開、デプロイ先を更新する場合は、その変更も検証する。上流の公開パッケージを akiyan の実装としてインストールしない。
