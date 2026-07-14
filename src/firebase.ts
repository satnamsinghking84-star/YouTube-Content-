import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with standard settings, which is fully compatible with cross-origin sandboxed iframes
export const db = getFirestore(app);

export const auth = getAuth(app);

