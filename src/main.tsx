import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TripsProvider } from './context/TripsContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TripsProvider>
      <App />
    </TripsProvider>
  </StrictMode>,
)
