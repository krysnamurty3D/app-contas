import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'
import { firebaseEnabled } from './firebaseFlag'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export { firebaseEnabled }
export const firebaseApp = firebaseEnabled ? initializeApp(config) : null
export const auth = firebaseApp ? getAuth(firebaseApp) : null
// ignoreUndefinedProperties: optional fields like Expense.paymentMethodId are
// `undefined` when unset (matching the local/JSON model) — Firestore rejects
// undefined by default, so this keeps writes from throwing.
export const db = firebaseApp
  ? initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true })
  : null
