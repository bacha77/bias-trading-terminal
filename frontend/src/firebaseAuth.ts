import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  type User 
} from 'firebase/auth';

const firebaseConfig = {
  projectId: "bias-trading-terminal-app",
  appId: "1:901493256178:web:d4fd4019a684cba7a3056b",
  storageBucket: "bias-trading-terminal-app.firebasestorage.app",
  apiKey: "AIzaSyB8hsESUVUFi7yUCNil0VQZiB3TM_30qns",
  authDomain: "bias-trading-terminal-app.firebaseapp.com",
  messagingSenderId: "901493256178"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Authorized email addresses (Admin & Traders permitted to access live execution)
export const AUTHORIZED_EMAILS = [
  'bacha7@gmail.com',
  'bacha77@gmail.com',
  'samedipatricia77@gmail.com',
  'philadelphie@gmail.com',
  'admin@bias-terminal.com'
];

export const isUserAuthorized = (user: User | null): boolean => {
  if (!user || !user.email) return false;
  // Always authorize owner email bacha7@gmail.com or whitelist
  return AUTHORIZED_EMAILS.some(e => e.toLowerCase() === user.email?.toLowerCase());
};

export const signInWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const logOut = async (): Promise<void> => {
  await signOut(auth);
};

export { onAuthStateChanged };
export type { User };
