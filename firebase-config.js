import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC1HMz_0MOsed-GZbQWJr5ZPlUd5drF4iw",
  authDomain: "nora-loja.firebaseapp.com",
  projectId: "nora-loja",
  storageBucket: "nora-loja.firebasestorage.app",
  messagingSenderId: "886939522599",
  appId: "1:886939522599:web:488070038bc64170ea2002",
  measurementId: "G-2XFG6195W4"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
