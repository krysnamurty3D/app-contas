/** True only when all required Firebase env vars are present at build time. Kept free of any
 * firebase SDK import so checking it never pulls the SDK into the main bundle. */
export const firebaseEnabled = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_APP_ID,
)
