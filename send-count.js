import admin from "firebase-admin";
import axios from "axios";

const serviceAccount = JSON.parse(
  Buffer.from(
    process.env.FIREBASE_SERVICE_ACCOUNT_B64,
    "base64"
  ).toString("utf8")
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();
const statsRef = db.ref("/stats");

const snap = await statsRef.get();
const peak = snap.child("peak_5min").val() || 0;
const current = snap.child("current").val() || 0;

await axios.get("https://games-alchemist.com/api/portal/online-count/", {
  params: {
    game_key: process.env.GAME_KEY,
    api_key: process.env.API_KEY,
    online_count: peak
  }
});

await statsRef.update({ peak_5min: current });

console.log("sent", peak);
