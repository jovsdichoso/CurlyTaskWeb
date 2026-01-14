// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // <--- 1. ADD THIS IMPORT

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC1mITRfzstSl5B4GUa0B4dtfWILondCBk",
    authDomain: "curlytask.firebaseapp.com",
    projectId: "curlytask",
    storageBucket: "curlytask.firebasestorage.app",
    messagingSenderId: "859956416154",
    appId: "1:859956416154:web:4e5bb3dd2dc78d43b7d923",
    measurementId: "G-F57YRV6K2Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Services
export const db = getFirestore(app);
export const auth = getAuth(app); // <--- 2. ADD THIS EXPORT