import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const getFirebaseConfig = () => ({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
});

let appInstance: any = null;
let authInstance: any = null;
let dbInstance: any = null;

const getApp = () => {
  if (!appInstance) {
    appInstance = initializeApp(getFirebaseConfig());
  }
  return appInstance;
}

export const getFirebaseAuth = () => {
  if (!authInstance) {
    authInstance = getAuth(getApp());
  }
  return authInstance;
}

export const getFirebaseDb = () => {
  if (!dbInstance) {
    dbInstance = getFirestore(getApp());
  }
  return dbInstance;
}

export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(getFirebaseAuth(), googleProvider);
export const logout = () => signOut(getFirebaseAuth());
