import { initializeApp } from "firebase/app";
import { getDatabase, ref, runTransaction, serverTimestamp } from "firebase/database";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDEOQ0xiSg2MfqmL5qVlm-MP6fRC32OpVQ",
  authDomain: "shiden-games.firebaseapp.com",
  databaseURL: "https://shiden-games-default-rtdb.firebaseio.com",
  projectId: "shiden-games",
  storageBucket: "shiden-games.firebasestorage.app",
  messagingSenderId: "764248462785",
  appId: "1:764248462785:web:aa3e68326893a71d288b40",
  measurementId: "G-V0VXR4MERY"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const storageBaseUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/`;
const storageCache: { [key: string]: string } = {};
export const getStorageUrl = (path: string) => {
  if (!path) return '';
  if (storageCache[path]) return storageCache[path];
  const encodedPath = encodeURIComponent(path.startsWith('/') ? path.substring(1) : path);
  const url = `${storageBaseUrl}${encodedPath}?alt=media`;
  storageCache[path] = url;
  return url;
};
export const googleProvider = new GoogleAuthProvider();

export const recordAccess = () => {
  const totalAccessRef = ref(database, 'totalAccess');
  runTransaction(totalAccessRef, (currentData) => {
    if (currentData === null) {
      return 1;
    } else {
      return currentData + 1;
    }
  })
  .then(() => console.log("Total access count incremented successfully!"))
  .catch((e) => console.error("Error incrementing total access count: ", e));
};

export const uploadDeneiImage = async (uid: string, dataUrl: string) => {
  const imageRef = storageRef(storage, `images/denei/${uid}.png`);
  // dataUrl は "data:image/png;base64,xxxx" という形式なので uploadString の data_url 形式でアップロード可能
  await uploadString(imageRef, dataUrl, 'data_url');
  return await getDownloadURL(imageRef);
};
