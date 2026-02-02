import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// サービスアカウントキーのパス
const serviceAccountPath = path.join(__dirname, '../input/認証系/serviceAccount.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('Service account key not found at:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'shiden-games.firebasestorage.app'
});

const bucket = admin.storage().bucket();

async function uploadDirectory(localPath, remotePath) {
  const files = fs.readdirSync(localPath);

  for (const file of files) {
    const fullPath = path.join(localPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      await uploadDirectory(fullPath, path.join(remotePath, file));
    } else {
      const destination = path.join(remotePath, file).replace(/\\/g, '/');
      console.log(`Uploading ${fullPath} to ${destination}...`);
      await bucket.upload(fullPath, {
        destination: destination,
        public: true,
        metadata: {
          cacheControl: 'public, max-age=31536000',
        },
      });
    }
  }
}

const targetDir = path.join(__dirname, 'public/images');
uploadDirectory(targetDir, 'images')
  .then(() => {
    console.log('All images uploaded successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error uploading images:', err);
    process.exit(1);
  });
