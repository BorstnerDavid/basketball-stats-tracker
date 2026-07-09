import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

// 1. Paste your Firebase web app config here (Firebase console → Project settings → Your apps).
//    databaseURL comes from Realtime Database → Create database (see README step 2).
export const firebaseConfig = {
  apiKey: "AIzaSyAfZVjWZXE3k045xHb4qNh6_0t95Bmc4b4",
  authDomain: "bamsketball-45823.firebaseapp.com",
  projectId: "bamsketball-45823",
  storageBucket: "bamsketball-45823.firebasestorage.app",
  messagingSenderId: "271703878545",
  appId: "1:271703878545:web:28dffd8ecc1777169f8830",
  databaseURL: "https://bamsketball-45823-default-rtdb.europe-west1.firebasedatabase.app"
};


// 2. Cloudinary (free tier) for news images: create an UNSIGNED upload preset
//    at cloudinary.com → Settings → Upload → Upload presets.
export const cloudinary = {
  cloudName: 'YOUR_CLOUD_NAME',
  uploadPreset: 'YOUR_UNSIGNED_PRESET',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);      // durable data: leagues, teams, players, matches, events, news, stats
export const rtdb = getDatabase(app);     // ephemeral live game feed: scores, box, clock, play-by-play
