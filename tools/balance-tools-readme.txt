Chapter2 Balance Tools Guide

更新日: 2026-04-24

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

基本コマンド
- 全体を回す
  - node tools/chapter2-balance-search.cjs
- 未クリアだけ回す
  - node tools/chapter2-balance-search.cjs --uncleared-only
- 特定ステージだけ回す
  - node tools/chapter2-balance-search.cjs --targets 6-2,7-2
- 保存する勝ち編成数を減らす
  - node tools/chapter2-balance-search.cjs --targets 8-2 --sample-limit 3
- 特定スキルを必ず含める
  - node tools/chapter2-balance-search.cjs --targets 9-2 --require-skills 霊,礁
- 複数ボス定義のうち特定パターンだけ回す
  - node tools/chapter2-balance-search.cjs --targets 12-2 --boss-indexes 1 --require-skills 狼

引数
- --targets <keys>
  - 例: 6-2,7-2,12-2
  - 指定したステージだけ探索する
- --sample-limit <n>
  - 勝ち編成の保存数
- --uncleared-only
  - 既に clearable=true のステージは再探索しない
- --require-skills <skills>
  - 例: 霊,礁
  - 指定したスキルを必ず含む編成だけ探索する
- --boss-indexes <indexes>
  - 例: 1 / 1,3
  - bossSkillAbbrs が配列の時、1始まりで対象パターンだけ探索する

results.json の見方
- key
  - ステージ番号-戦闘番号
  - 例: 6-2
  - ボスパターンを絞った場合は 12-2#1 のように後ろへ番号が付く
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
