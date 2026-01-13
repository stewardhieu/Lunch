// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // <--- Thêm dòng này
import { getAuth } from "firebase/auth"; // <--- Thêm dòng này

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
@ -13,10 +13,5 @@ const firebaseConfig = {
};

const app = initializeApp(firebaseConfig);

// Khởi tạo Database
export const db = getFirestore(app);

// Khởi tạo Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const auth = getAuth(app); // <--- Thêm dòng này