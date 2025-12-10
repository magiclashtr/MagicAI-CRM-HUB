import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Firebase configuration from environment variables
// Create a .env.local file with VITE_FIREBASE_* variables
const firebaseConfig = {
  apiKey: "AIzaSyC_ZortFqUKDdml5qzTSQA-KCNyhOvg9ak",
  authDomain: "magicgenai-crm.firebaseapp.com",
  projectId: "magicgenai-crm",
  storageBucket: "magicgenai-crm.firebasestorage.app",
  messagingSenderId: "928068248319",
  appId: "1:928068248319:web:7a753abadae255e86be2ca",
  measurementId: "G-3CK0MYVX71"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

// Initialize and export Firebase services
export const db = getFirestore(app, 'magicai-crm-hub');
export const auth: Auth = getAuth(app);
export const storage = getStorage(app);