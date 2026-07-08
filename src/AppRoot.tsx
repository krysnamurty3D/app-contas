import { lazy, Suspense } from 'react'
import { Plane } from 'lucide-react'
import App from './App'
import { TripsProvider } from './context/TripsContext'
import { firebaseEnabled } from './lib/firebaseFlag'

const CloudApp = lazy(() => import('./CloudApp'))

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="rounded-xl bg-blue-600 p-3 text-white animate-pulse">
        <Plane size={24} />
      </div>
    </div>
  )
}

export function AppRoot() {
  if (!firebaseEnabled) {
    return (
      <TripsProvider>
        <App />
      </TripsProvider>
    )
  }
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CloudApp />
    </Suspense>
  )
}
