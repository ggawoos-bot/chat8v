// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "chat-4c3a7.firebaseapp.com",
  projectId: "chat-4c3a7",
  storageBucket: "chat-4c3a7.firebasestorage.app",
  messagingSenderId: "995636644973",
  appId: "1:995636644973:web:1f133c19af8be180444364",
  measurementId: "G-9VCJVBR4LR"
};

// 환경변수 검증
if (!firebaseConfig.apiKey) {
  throw new Error(
    "Firebase API key is missing. Please set VITE_FIREBASE_API_KEY in .env.local"
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Analytics (optional)
export const analytics = getAnalytics(app);

export default app;
