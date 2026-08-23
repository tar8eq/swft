import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// مفاتيح الاتصال الخاصة بقاعدتك
const firebaseConfig = {
  apiKey: "AIzaSyCruQTijtvF5HqGaSvkOAyCeLwWyyLIDd0",
  authDomain: "tarek88-5691c.firebaseapp.com",
  databaseURL: "https://tarek88-5691c-default-rtdb.firebaseio.com",
  projectId: "tarek88-5691c",
  storageBucket: "tarek88-5691c.firebasestorage.app",
  messagingSenderId: "632977435671",
  appId: "1:632977435671:web:f11e2346ffb44b9f560052",
  measurementId: "G-S50EJ6HFXV"
};

// تهيئة الخدمة والاتصال بالقاعدة
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);