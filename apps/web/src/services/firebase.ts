/**
 * Adaptador único del SDK de Firebase.
 * REGLA DE ARQUITECTURA: ningún componente de UI importa este módulo
 * directamente; siempre a través de hooks de features o servicios.
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import {
  initializeAppCheck,
  getToken as getAppCheckToken,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from 'firebase/app-check';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(config);

// App Check: anillo 1 del modelo Zero-Trust
const siteKey = import.meta.env.VITE_APPCHECK_SITE_KEY as string | undefined;
let appCheck: AppCheck | undefined;
if (siteKey && !import.meta.env.DEV) {
  appCheck = initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const authInstance = getAuth(firebaseApp);

// Persistencia offline (caché L0): esencial para 2G/3G y ferias sin señal
export const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export const storage = getStorage(firebaseApp);

if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}

// ---- helpers de autenticación ----
const googleProvider = new GoogleAuthProvider();

export const firebaseAuth = {
  onChange: (cb: (user: User | null) => void) => onAuthStateChanged(authInstance, cb),
  loginGoogle: () => signInWithPopup(authInstance, googleProvider),
  loginEmail: (email: string, password: string) => signInWithEmailAndPassword(authInstance, email, password),
  registerEmail: (email: string, password: string) => createUserWithEmailAndPassword(authInstance, email, password),
  resetPassword: (email: string) => sendPasswordResetEmail(authInstance, email),
  logout: () => signOut(authInstance),
  currentToken: async () => authInstance.currentUser?.getIdToken() ?? null,
};

// ---- App Check ----
export const firebaseAppCheck = {
  /**
   * Token de atestación para la cabecera `X-Firebase-AppCheck`.
   *
   * `getToken` **espera** a que la atestación termine, y ahí está lo importante:
   * App Check inicializa de forma asíncrona, así que sin este await las primeras
   * peticiones de un arranque en frío saldrían sin atestar. El SDK cachea el
   * token y lo renueva solo, de modo que el coste real es únicamente la primera
   * llamada.
   *
   * Devuelve `null` —en vez de lanzar— cuando App Check no está activo (DEV,
   * emuladores) o cuando la atestación falla. La petición sale sin la cabecera y
   * **decide el servidor**: la política de rechazo vive en el backend, no acá.
   */
  currentToken: async (): Promise<string | null> => {
    if (!appCheck) return null;
    try {
      return (await getAppCheckToken(appCheck)).token;
    } catch {
      return null;
    }
  },
};

export type { User };
