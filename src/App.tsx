import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import Flights from './pages/Flights'
import FlightDetail from './pages/FlightDetail'
import AddEditFlight from './pages/AddEditFlight'
import MapView from './pages/MapView'
import Stats from './pages/Stats'
import Memberships from './pages/Memberships'
import AddEditMembership from './pages/AddEditMembership'
import Settings from './pages/Settings'
import { db } from './db/db'
import { useTheme } from './hooks/useTheme'

function App() {
  useTheme()
  const [splashStage, setSplashStage] = useState<'visible' | 'fading' | 'hidden'>('visible')
  const splashStartTimeRef = useRef<number>(0)
  const initialDataLoaded = useLiveQuery(async () => {
    await Promise.all([db.flights.count(), db.memberships.count()])
    return true
  })
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    immediate: true,
  })

  useEffect(() => {
    splashStartTimeRef.current = performance.now()
  }, [])

  useEffect(() => {
    if (!initialDataLoaded) return

    const elapsed = performance.now() - splashStartTimeRef.current
    const minVisibleMs = 1000
    const remainingMs = Math.max(0, minVisibleMs - elapsed)
    const fadeTimer = window.setTimeout(() => setSplashStage('fading'), remainingMs)
    const hideTimer = window.setTimeout(() => setSplashStage('hidden'), remainingMs + 350)

    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(hideTimer)
    }
  }, [initialDataLoaded])

  return (
    <Router>
      {splashStage !== 'hidden' && (
        <div className={`app-splash ${splashStage === 'fading' ? 'app-splash-fade' : ''}`}>
          <div className="app-splash-card">
            <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="Booba Pass" />
            <h1>booba-pass</h1>
            <p>Your travel wallet</p>
            <div className="app-splash-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}
      {needRefresh[0] && (
        <div className="pwa-update-banner" role="status" aria-live="polite">
          <p>New version available.</p>
          <div className="pwa-update-actions">
            <button type="button" onClick={() => void updateServiceWorker(true)}>
              Update now
            </button>
            <button type="button" onClick={() => needRefresh[1](false)}>
              Later
            </button>
          </div>
        </div>
      )}
      <div className="app-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/flights" element={<Flights />} />
          <Route path="/flights/:id" element={<FlightDetail />} />
          <Route path="/flights/new" element={<AddEditFlight />} />
          <Route path="/flights/:id/edit" element={<AddEditFlight />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/memberships" element={<Memberships />} />
          <Route path="/memberships/new" element={<AddEditMembership />} />
          <Route path="/memberships/:id/edit" element={<AddEditMembership />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
      <BottomNav />
    </Router>
  )
}

export default App
