import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, Firestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCfIGH4WAsTDR47NjFtKD67t_GHAZXCrjI",
  authDomain: "smart-planner-guardian.firebaseapp.com",
  projectId: "smart-planner-guardian",
  storageBucket: "smart-planner-guardian.firebasestorage.app",
  messagingSenderId: "565793517681",
  appId: "1:565793517681:web:f4f2794529137ffa7b6bd0",
  measurementId: "G-FFP52F674Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// Initialize Firestore with offline persistence
const firestore: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache()
});
const auth: Auth = getAuth(app);

export { app, analytics, firestore, auth };