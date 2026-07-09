import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

// 1. Paste your Firebase web app config here (Firebase console → Project settings → Your apps).
//    databaseURL comes from Realtime Database → Create database (see README step 2).
export const firebaseConfig = {
  apiKey: 'PASTE_YOUR_API_KEY',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project',
  appId: 'PASTE_YOUR_APP_ID',
  databaseURL: 'https://your-project-default-rtdb.europe-west1.firebasedatabase.app',
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
