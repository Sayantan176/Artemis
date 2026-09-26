import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBR5_hib_8-VVOlpz_bmickiLZdoENYn6Y",
  authDomain: "phishx-81a2b.firebaseapp.com",
  projectId: "phishx-81a2b",
  storageBucket: "phishx-81a2b.firebasestorage.app",
  messagingSenderId: "665114857524",
  appId: "1:665114857524:web:3f93b41d52b0b9a162ba61",
  measurementId: "G-0ZDP9S98LS"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
