const admin = require("firebase-admin");
const axios = require("axios");

// GitHub Secretsからサービスアカウント情報を読み込み
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://shiden-games-default-rtdb.firebaseio.com" // あなたのDBのURL
});

async function main() {
  const db = admin.database();
  const peakRef = db.ref("/stats/peak_count");
  const currentRef = db.ref("/activeVisitors");

  // 1. 現在のactiveVisitorsの数を取得（子要素の数をカウント）
  const currentSnap = await currentRef.get();
  const currentActiveVisitors = currentSnap.numChildren() || 0;

  // 2. 既存の最大値を取得し、現在のactiveVisitorsと比較して更新
  const peakSnap = await peakRef.get();
  const existingPeakCount = peakSnap.val() || 0;
  const newPeakCount = Math.max(existingPeakCount, currentActiveVisitors);

  // 3. 更新された最大値をDBに書き戻す (これにより、次の実行までにリアルタイムで最大値が更新される可能性を考慮)
  await peakRef.set(newPeakCount);

  // 4. API送信
  try {
    await axios.get("https://games-alchemist.com/api/portal/online-count/", {
      params: {
        game_key: "your_game_key",
        api_key: process.env.API_KEY,
        online_count: newPeakCount // 更新された最大値を送信
      }
    });
    console.log(`Sent peak count: ${newPeakCount}`);

    // 5. 次の5分間のためにリセット（現在の数値をセット）
    // ここでcurrentActiveVisitorsにリセットすることで、次の5分間の最大値は現在の値から始まる
    await peakRef.set(currentActiveVisitors);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
  process.exit(0);
}

main();