import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  type Auth,
  type Persistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as FirebaseAuth from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCMLDuwQlh8S3xLavCJHC45go3KyI-O70s",
  authDomain: "dealership-15869.firebaseapp.com",
  projectId: "dealership-15869",
  storageBucket: "dealership-15869.firebasestorage.app",
  messagingSenderId: "614539220236",
  appId: "1:614539220236:web:a16ee842ddb6f739032529",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

type FirebaseGlobal = typeof globalThis & { __firebaseAuth?: Auth };

function createAuth(): Auth {
  const g = globalThis as FirebaseGlobal;
  if (g.__firebaseAuth) {
    return g.__firebaseAuth;
  }

  if (Platform.OS === "web") {
    g.__firebaseAuth = getAuth(app);
    return g.__firebaseAuth;
  }

  const getReactNativePersistence = (
    FirebaseAuth as typeof FirebaseAuth & {
      getReactNativePersistence?: (storage: typeof ReactNativeAsyncStorage) => Persistence;
    }
  ).getReactNativePersistence;

  try {
    g.__firebaseAuth = getReactNativePersistence
      ? initializeAuth(app, {
          persistence: getReactNativePersistence(ReactNativeAsyncStorage),
        })
      : getAuth(app);
  } catch {
    g.__firebaseAuth = getAuth(app);
  }

  return g.__firebaseAuth;
}

export const firebaseApp = app;
export const auth = createAuth();
export const db = getFirestore(app);
export const storage = getStorage(app);
