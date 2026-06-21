import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC6giGuNGBn5xasa4onSjo9iVb-dxavk_4",
  authDomain: "mi-cursada.firebaseapp.com",
  projectId: "mi-cursada",
  storageBucket: "mi-cursada.firebasestorage.app",
  messagingSenderId: "296135184876",
  appId: "1:296135184876:web:4c140d8545745fdfc4f0c9"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Persistencia offline: cachea los datos en IndexedDB del navegador para que la app
// funcione sin conexion y sincronice automaticamente al volver a tener internet.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }),
});