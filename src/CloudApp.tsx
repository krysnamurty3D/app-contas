import { Plane } from 'lucide-react'
import App from './App'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CloudTripsProvider } from './context/CloudTripsProvider'
import { AuthScreen } from './components/AuthScreen'

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="rounded-xl bg-blue-600 p-3 text-white animate-pulse">
        <Plane size={24} />
      </div>
    </div>
  )
}

function AuthGate() {
  const { user, loading, signOut } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <AuthScreen />
  return (
    <CloudTripsProvider>
      <App userEmail={user.email ?? undefined} onSignOut={signOut} />
    </CloudTripsProvider>
  )
}

/** Everything Firebase-dependent lives behind this lazily-loaded entry point, so the
 * firebase SDK is only fetched when cloud sync is actually configured and enabled. */
export default function CloudApp() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
