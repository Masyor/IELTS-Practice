import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import config from '../../firebase-applet-config.json';

const isConfigured = !!(
  (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== "") ||
  (config?.apiKey && config?.apiKey !== "" && config?.apiKey.startsWith("AIzaSy"))
);

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || config?.apiKey || "AIzaSyFakePlaceholderKeyForGitHubPages",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || config?.authDomain || "placeholder-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || config?.projectId || "placeholder-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || config?.storageBucket || "placeholder-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || config?.messagingSenderId || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || config?.appId || "1:1234567890:web:1234567890",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || config?.measurementId || ""
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app, import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || config?.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
export const isFirebaseConfigured = isConfigured;

export const loginAsDemoUser = async () => {
  const mockUser = {
    uid: "local-demo-user",
    email: "demo-student@ielts-practice.com",
    displayName: "Demo Student",
    photoURL: "https://api.dicebear.com/7.x/adventurer/svg?seed=IELTS",
    emailVerified: true
  };
  localStorage.setItem("ielts_practice_mock_user", JSON.stringify(mockUser));
  return mockUser;
};

export const loginWithGoogle = async () => {
  if (!isFirebaseConfigured) {
    // If not configured, fall back to loginAsDemoUser as a safe graceful backup
    return await loginAsDemoUser();
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const logout = async () => {
  localStorage.removeItem("ielts_practice_mock_user");
  if (!isFirebaseConfigured) {
    return;
  }
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

export const saveResult = async (result: any): Promise<{ id: string }> => {
  if (!isFirebaseConfigured || result.userId === "local-demo-user") {
    const id = "mock-result-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9);
    const mockResults = JSON.parse(localStorage.getItem("ielts_practice_results") || "[]");
    const newResult = { id, ...result };
    mockResults.push(newResult);
    localStorage.setItem("ielts_practice_results", JSON.stringify(mockResults));
    return { id };
  }
  const docRef = await addDoc(collection(db, 'results'), result);
  return { id: docRef.id };
};

export const getResults = async (userId: string): Promise<any[]> => {
  if (!isFirebaseConfigured || userId === "local-demo-user") {
    const mockResults = JSON.parse(localStorage.getItem("ielts_practice_results") || "[]");
    return mockResults.filter((r: any) => r.userId === userId);
  }
  const q = query(collection(db, 'results'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getResultById = async (id: string): Promise<any | null> => {
  if (!isFirebaseConfigured || id.startsWith("mock-result-")) {
    const mockResults = JSON.parse(localStorage.getItem("ielts_practice_results") || "[]");
    const found = mockResults.find((r: any) => r.id === id);
    return found || null;
  }
  const docSnap = await getDoc(doc(db, 'results', id));
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const deleteResult = async (id: string): Promise<void> => {
  if (!isFirebaseConfigured || id.startsWith("mock-result-")) {
    const mockResults = JSON.parse(localStorage.getItem("ielts_practice_results") || "[]");
    const filtered = mockResults.filter((r: any) => r.id !== id);
    localStorage.setItem("ielts_practice_results", JSON.stringify(filtered));
    return;
  }
  await deleteDoc(doc(db, 'results', id));
};
