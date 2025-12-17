import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import * as _auth from "firebase/auth";
import { getStorage } from "firebase/storage";
// import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_ZortFqUKDdml5qzTSQA-KCNyhOvg9ak",
  authDomain: "magicgenai-crm.firebaseapp.com",
  projectId: "magicgenai-crm",
  storageBucket: "magicgenai-crm.appspot.com",
  messagingSenderId: "928068248319",
  appId: "1:928068248319:web:31a078c9aeb9704a6be2ca",
  measurementId: "G-CY183L2HT2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

// Initialize and export Firebase services
export const db = getFirestore(app);
// FIX: Use namespace import and cast to any to resolve TS errors with firebase/auth exports
const authLib = _auth as any;
export const auth = authLib.getAuth(app);
export const storage = getStorage(app);