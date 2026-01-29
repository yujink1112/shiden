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
  const currentRef = db.ref("/connections_count");

  // 1. 最大値を取得
  const snap = await peakRef.get();
  const peakCount = snap.val() || 0;

  // 2. API送信
  try {
    await axios.get("https://games-alchemist.com/api/portal/online-count/", {
      params: {
        game_key: "your_game_key",
        api_key: process.env.API_KEY,
        online_count: peakCount
      }
    });
    console.log(`Sent peak count: ${peakCount}`);

    // 3. 次の5分間のためにリセット（現在の数値をセット）
    const currentSnap = await currentRef.get();
    await peakRef.set(currentSnap.val() || 0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
  process.exit(0);
}

main();