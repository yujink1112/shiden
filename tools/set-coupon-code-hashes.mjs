import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATABASE_URL = 'https://shiden-games-default-rtdb.firebaseio.com';
const TARGET_PATH = 'publicConfig/couponCodeHashes';

const normalizeCouponCode = (value) => value.trim().toUpperCase();
const hashCouponCode = (value) => createHash('sha256').update(normalizeCouponCode(value)).digest('hex');

const parseArgs = () => {
  const storyBookCodes = [];
  const supporterCodes = [];
  const args = process.argv.slice(2);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];
    if (!value) continue;

    if (arg === '--storybook') {
      storyBookCodes.push(value);
      index += 1;
      continue;
    }

    if (arg === '--supporter') {
      supporterCodes.push(value);
      index += 1;
    }
  }

  return { storyBookCodes, supporterCodes };
};

const loadServiceAccount = () => {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (b64) {
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  }

  const candidatePaths = [
    path.join(__dirname, '../input/認証系/serviceAccount.json'),
    path.join(__dirname, '../../input/認証系/serviceAccount.json')
  ];

  for (const serviceAccountPath of candidatePaths) {
    if (fs.existsSync(serviceAccountPath)) {
      return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    }
  }

  throw new Error('Service account key not found. Set FIREBASE_SERVICE_ACCOUNT_B64 or place serviceAccount.json under ../input/認証系 or ../../input/認証系');
};

const { storyBookCodes, supporterCodes } = parseArgs();

if (storyBookCodes.length === 0 && supporterCodes.length === 0) {
  console.error('Usage: node tools/set-coupon-code-hashes.mjs --storybook CODE --supporter CODE');
  process.exit(1);
}

const serviceAccount = loadServiceAccount();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || DATABASE_URL
  });
}

const payload = {
  storyBookHashes: Array.from(new Set(storyBookCodes.map(hashCouponCode))),
  supporterHashes: Array.from(new Set(supporterCodes.map(hashCouponCode))),
  updatedAt: Date.now()
};

await admin.database().ref(TARGET_PATH).set(payload);

console.log(`Saved coupon code hashes to ${TARGET_PATH}`);
console.log(JSON.stringify(payload, null, 2));
