Chapter2 Balance Tools Guide

更新日: 2026-04-25

このフォルダには、第2章の戦闘バランス確認用スクリプトが入っています。

前提
- 対象データ:
  - public/data/chapter2_flow.json
  - public/data/stages.json
- 戦闘ロジック:
  - src/Player.ts
  - src/Battle.ts
- 第2章の探索条件:
  - 初期スキルは 一 / 刺 / 果 / 待 / 搦 / 玉 / 強 / 速
  - reward.skill の固定報酬のみ加算
  - reward.choices は未取得として扱う
- 5枚編成の順序を探索する
- 同じスキルを複数枚編成してよい
- 狼 / ▽ / 爆 / 魔 は4種のうち合計1枚まで
- 複数の bossSkillAbbrs を持つ戦闘は、共通探索せず各パターンを個別探索する

--------------------------------
1. クリア構成探索
--------------------------------

ファイル
- tools/chapter2-balance-search.cjs

目的
- 各ステージで勝てる5枚編成を探す
- 未クリアステージだけを再探索する
- 進捗をログに残す
- 既知の勝ち編成 sample があれば、その sample と近傍から優先探索する

主な出力先
- tools/balance-search-results.json
  - ステージごとの探索結果
- tools/balance-search-progress.log
  - 探索途中の進捗ログ
- tools/balance-search-log.md
  - 手動メモ
- tools/balance-search-deep-summary.md
  - 深掘り探索結果の要約

基本コマンド
- 全体を回す
  - node tools/chapter2-balance-search.cjs
- 未クリアだけ回す
  - node tools/chapter2-balance-search.cjs --uncleared-only
- 特定ステージだけ回す
  - node tools/chapter2-balance-search.cjs --targets 6-2,7-2
- 保存する勝ち編成数を減らす
  - node tools/chapter2-balance-search.cjs --targets 8-2 --sample-limit 3
- 可能な限り多くの勝ち編成を集める
  - node tools/chapter2-balance-search.cjs --sample-limit 0 --max-checks 1000000 --results-path tools/balance-search-deep-results.json --progress-log-path tools/balance-search-deep-progress.log
- 特定スキルを必ず含める
  - node tools/chapter2-balance-search.cjs --targets 9-2 --require-skills 霊,礁
- 複数ボス定義のうち特定パターンだけ回す
  - node tools/chapter2-balance-search.cjs --targets 12-2 --boss-indexes 1 --require-skills 狼
- 深掘り結果から要約を作る
  - node tools/generate-balance-search-summary.cjs --input tools/balance-search-deep-results.json --output tools/balance-search-deep-summary.md
- 深掘り結果から難易度ランキングを作る
  - node tools/generate-balance-difficulty-ranking.cjs --input tools/balance-search-deeper-results.json --out-json tools/balance-difficulty-ranking.json --out-md tools/balance-difficulty-ranking.md

引数
- --targets <keys>
  - 例: 6-2,7-2,12-2
  - 指定したステージだけ探索する
- --sample-limit <n>
  - 勝ち編成の保存数
  - 0 を指定すると、sample 数で打ち切らずに探索を続ける
- --uncleared-only
  - 既に clearable=true のステージは再探索しない
- --require-skills <skills>
  - 例: 霊,礁
  - 指定したスキルを必ず含む編成だけ探索する
- --boss-indexes <indexes>
  - 例: 1 / 1,3
  - bossSkillAbbrs が配列の時、1始まりで対象パターンだけ探索する
  - 未指定でも複数パターン戦は `12-2#1` のように個別探索される
- --max-checks <n>
  - ステージごとの探索候補数の上限
  - 大きい値を入れるほど深掘りできる
- --results-path <path>
  - 結果 JSON の出力先を変える
- --progress-log-path <path>
  - 進捗ログの出力先を変える
- --win-log-limit <n>
  - 勝ち編成ログを細かく出す上限件数
- --win-log-interval <n>
  - 上限を超えた後、何件ごとに勝ち編成ログを出すか

results.json の見方
- key
  - ステージ番号-戦闘番号
  - 例: 6-2
  - 複数パターン戦はデフォルトで 12-2#1 のように後ろへ番号が付く
- bossName
  - ボス名
- clearable
  - 勝ち編成が見つかったか
- searchMode
  - previous-ordered-no-dup:
    以前に見つけた勝ち編成を再利用
  - ordered-with-dup:
    順序あり、重複ありで探索
- checked
  - 探索した候補数
- samples
  - 勝ち編成のサンプル
- pool
  - その時点で使用可能な所持プール
- stopReason
  - exhausted:
    候補を最後まで調べ切った
  - sample-limit:
    sampleLimit に達した
  - max-checks:
    maxChecks に達した
  - missing-required-skills:
    必須スキルがプール内に無かった

--------------------------------
2. ボス調整候補探索
--------------------------------

ファイル
- tools/chapter2-boss-tuning-search.cjs

目的
- 未クリアのボスについて、構成を少し変えたら攻略可能になるかを探す
- 何文字差し替えるかを指定できる
- 差し替え候補から 空 / Ｈ / 弱 は除外する
- 差し替え候補から 神業スキル 狼 / ▽ / 爆 / 魔 も除外する
- 既知の勝ち編成 sample があれば、その sample と近傍から優先探索する
- ボス差し替え候補の探索順はランダム

主な出力先
- tools/boss-tuning-results.json
  - 調整候補一覧
- tools/boss-tuning-progress.log
  - 調整探索の進捗

基本コマンド
- 全未クリアステージを対象に1文字差し替えで探す
  - node tools/chapter2-boss-tuning-search.cjs
- 特定ステージだけ探す
  - node tools/chapter2-boss-tuning-search.cjs --targets 6-2
- 2文字差し替えまで許可する
  - node tools/chapter2-boss-tuning-search.cjs --targets 11-2 --max-replacements 2
- 候補数を増やす
  - node tools/chapter2-boss-tuning-search.cjs --targets 12-2 --fix-limit 20 --sample-limit 3
- 特定スキルを必ず含める
  - node tools/chapter2-boss-tuning-search.cjs --targets 11-2 --require-skills 霊

引数
- --targets <keys>
  - 例: 6-2,7-2,12-2
- --fix-limit <n>
  - ステージごとに保存する調整候補数
- --sample-limit <n>
  - 各調整候補ごとに保存する勝ち編成数
  - 既定値は 5
- --max-replacements <n>
  - ボス構成の差し替え文字数
  - 1 なら1文字差し替え
  - 2 なら1文字または2文字差し替え
- --require-skills <skills>
  - 例: 霊,礁
  - 指定したスキルを必ず含む編成だけ探索する

boss-tuning-results.json の見方
- key
  - ステージ番号-戦闘番号
- baseClearable
  - 現状構成のままで勝てるか
- baseChecked
  - 現状構成で調べた候補数
- baseSamples
  - 現状構成で見つかった勝ち編成
  - 現状で攻略可能な場合も、ここに複数のクリア構成が入る
- fixes
  - 調整候補の一覧

fixes の中身
- replacementCount
  - 差し替えた文字数
- changes
  - 変更箇所の一覧
  - bossPattern:
    stage36 など複数パターンあるボスの何番目か
  - index:
    何文字目か
  - from:
    元の文字
  - to:
    差し替え先の文字
- tunedBosses
  - 調整後のボス構成
- checked
  - その調整候補で探索した編成数
- samples
  - 調整後に勝てた編成

--------------------------------
3. 運用メモ
--------------------------------

おすすめの進め方
1. 先に chapter2-balance-search.cjs で未クリアステージを確定する
2. 次に chapter2-boss-tuning-search.cjs で 1文字差し替えを探す
3. 1文字差し替えで足りなければ 2文字差し替えへ広げる
4. 実際に stages.json を直す時は、元の構成をコメント等で残す

注意
- 探索は組み合わせ数が多いので時間がかかる
- 途中経過は progress.log に出る
- 長時間探索する時は --targets で対象を絞ると楽

よく使う例
- 今の未クリアだけ再探索
  - node tools/chapter2-balance-search.cjs --uncleared-only
- 6章後半だけボス調整候補を探す
  - node tools/chapter2-boss-tuning-search.cjs --targets 6-2
- 11章後半を2文字差し替えまでで探す
  - node tools/chapter2-boss-tuning-search.cjs --targets 11-2 --max-replacements 2

--------------------------------
4. 12-2#1 難化分析
--------------------------------

ファイル
- tools/analyze-12-2-1-hardening.cjs

目的
- 12-2 の1つ目スペックを、狼前提のまま少し難しくする候補を探す
- 1文字差し替え候補を総当たりし、勝ち筋密度が下がる案を順位付けする
- 途中経過をログへ出す

主な出力先
- tools/12-2-1-hardening-results.json
- tools/12-2-1-hardening-progress.log

基本コマンド
- 既定条件で回す
  - node tools/analyze-12-2-1-hardening.cjs
- 探索上限を変える
  - node tools/analyze-12-2-1-hardening.cjs --max-checks 651605 --top 30
- ランダムに1～3文字差し替えて探す
  - node tools/analyze-12-2-1-hardening.cjs --mode random --iterations 1000 --min-replacements 1 --max-replacements 3 --progress-every 20

引数
- --max-checks <n>
  - 1候補ごとの探索上限
- --out-path <path>
  - 結果 JSON の出力先
- --log-path <path>
  - 進捗ログの出力先
- --progress-every <n>
  - 何候補ごとに途中経過を出すか
- --top <n>
  - 保存する上位候補数
- --mode <type>
  - exhaustive / random
- --iterations <n>
  - random モードの試行回数
- --min-replacements <n>
  - random モードの最小差し替え数
- --max-replacements <n>
  - random モードの最大差し替え数
- --seed <n>
  - random モードの乱数シード
