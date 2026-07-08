import { useTrips } from './context/TripsContext'
import { Home } from './components/Home'
import { TripShell } from './components/TripShell'

function App() {
  const { currentTrip } = useTrips()

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {currentTrip ? <TripShell trip={currentTrip} /> : <Home />}
    </div>
  )
}

export default App
