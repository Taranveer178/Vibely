
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCq6hcgGezvfD8JaRDc_fYfVYw4T1wMSs",
  authDomain: "vibely-1d289.firebaseapp.com",
  projectId: "vibely-1d289",
  storageBucket: "vibely-1d289.firebasestorage.app",
  messagingSenderId: "660373637357",
  appId: "1:660373637357:web:ed634904355b9d71b4e4e4"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
