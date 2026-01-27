import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

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
export const googleProvider = new GoogleAuthProvider();
