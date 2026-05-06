# Supporter Code 手動確認チェックリスト

対象コード
- StoryBook: `SBK-7Q4N-2X9M-L8RD`
- Supporter: `SPR-9V6K-4T2X-M7QD`

確認アカウント
- 通常1: `k.krym12@gmail.com` (Google認証)
- 通常2: `shirocafe2@yahoo.co.jp` (メール認証)
- 管理者: `shirocafe@yahoo.co.jp` (Google認証)

事前準備
- Firebase の `publicConfig/couponCodeHashes` に最新のハッシュが保存されていること
- 開発サーバ再起動後の画面で確認すること
- 通常ユーザ用と管理者用でブラウザセッションを分けること

ハッシュ更新手順
- `node tools/set-coupon-code-hashes.mjs --storybook SBK-7Q4N-2X9M-L8RD --supporter SPR-9V6K-4T2X-M7QD`

テスト1: 未適用ユーザ
- `shirocafe2@yahoo.co.jp` でログインする
- `特典コード入力` を開く
- 空入力でエラーになること
- 誤コードでエラーになること
- ラウンジの名前が金色でないこと
- マイページに `SPECIAL THANKS 表示名` が出ていないこと

テスト2: Supporter Code 適用直後
- `SPR-9V6K-4T2X-M7QD` を入力する
- 成功メッセージが出ること
- 虹色メッセージパネルが出ること
- StoryBook が開けること
- ラウンジの自分の名前が金色になること
- マイページに `SPECIAL THANKS 表示名` 入力欄が出ること
- 初期値がユーザ名であること

テスト3: 掲載名変更
- `SPECIAL THANKS 表示名` を別名に変更する
- マイページを離れて戻っても保持されること
- `著作権表記` の Special Thanks に反映されること
- エンドロールに反映されること
- StoryBook のクレジットにも反映されること

テスト4: 再ログイン
- ログアウトして再ログインする
- StoryBook 閲覧権が維持されること
- 虹色メッセージが維持されること
- 金色表示が維持されること
- 掲載名が維持されること

テスト5: Google認証ユーザ
- `k.krym12@gmail.com` でも Supporter Code を適用する
- テスト2から4の主要項目を再確認する

テスト6: 管理者確認
- `shirocafe@yahoo.co.jp` でログインする
- `著作権表記` を開く
- Supporter 対象ユーザ名が Special Thanks に並ぶこと
- エンドロールでも同じ表示になること

境界ケース
- 適用済みアカウントで同じコードを再入力しても壊れないこと
- 掲載名を空に近い値にした時も表示が破綻しないこと
- 長めの掲載名でもレイアウトが崩れないこと
- Supporter 複数人が同時に表示されること
