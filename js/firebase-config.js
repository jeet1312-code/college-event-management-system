/* =========================================================
   firebase-config.js
   ---------------------------------------------------------
   1. Go to https://console.firebase.google.com
   2. Create a project (Firebase Authentication + Firestore
      Database, both explained in the setup steps you were given)
   3. Project settings -> General -> "Your apps" -> Web app (</>)
   4. Copy the firebaseConfig object Firebase gives you and
      paste its values below, replacing the placeholders.
   ========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCpF9OxlQvU6itK1wysbljH5GKMCD4nrAY",
  authDomain: "college-event-management-dcfd8.firebaseapp.com",
  projectId: "college-event-management-dcfd8",
  storageBucket: "college-event-management-dcfd8.firebasestorage.app",
  messagingSenderId: "449647514403",
  appId: "1:449647514403:web:602d3a0ab14612695eb296",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
