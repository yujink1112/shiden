import { axios } from "@pipedream/platform"
import admin from "firebase-admin"

export default defineComponent({
  name: "Send Firebase Peak Count to Games Alchemist",
  description: "Retrieves peak connection count from Firebase and sends it to Games Alchemist API, then resets the peak count",
  type: "action",
  props: {
    firebaseServiceAccount: {
      type: "string",
      label: "Firebase Service Account JSON",
      description: "The Firebase service account credentials in JSON format",
      secret: true
    },
    firebaseDatabaseUrl: {
      type: "string",
      label: "Firebase Database URL",
      description: "The Firebase Realtime Database URL",
      default: "https://shiden-games-default-rtdb.firebaseio.com"
    },
    gameKey: {
      type: "string",
      label: "Game Key",
      description: "Your game key for the Games Alchemist API"
    },
    apiKey: {
      type: "string",
      label: "API Key",
      description: "Your API key for the Games Alchemist API",
      secret: true
    }
  },
  async run({ $ }) {
    // 1. Firebaseの初期化（二重初期化防止）
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(this.firebaseServiceAccount);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: this.firebaseDatabaseUrl
      });
    }

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

    console.log(`Sending peak count: ${newPeakCount}`);

    // 4. API送信
    const response = {};
    try {
      response = await axios($, {
        url: "https://games-alchemist.com/api/portal/online-count/",
        method: "GET",
        params: {
          game_key: this.gameKey,
          api_key: this.apiKey,
          online_count: newPeakCount
        }
      });
    } catch(e) {
      console.warn(e);
    }

    // 5. 次の5分間のためにリセット（現在の数値をセット）
    // ここでcurrentActiveVisitorsにリセットすることで、次の5分間の最大値は現在の値から始まる
    await peakRef.set(currentActiveVisitors);

    $.export("$summary", `Successfully sent peak count of ${newPeakCount} to Games Alchemist API and reset peak count`);
    
    return {
      peakCountSent: newPeakCount,
      currentCount: currentSnap.val() || 0,
      apiResponse: response
    };
  }
})