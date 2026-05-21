import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAoRv-hB8iPaPg88nyi77El-ZVGuSy8v_s",
  authDomain: "uitm-campus-barber.firebaseapp.com",
  projectId: "uitm-campus-barber",
  storageBucket: "uitm-campus-barber.firebasestorage.app",
  messagingSenderId: "723871803668",
  appId: "1:723871803668:web:d47330fa4e1942f7e8ba01",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);