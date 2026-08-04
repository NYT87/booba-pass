import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import Flights from './pages/Flights'
import FlightDetail from './pages/FlightDetail'
import AddEditFlight from './pages/AddEditFlight'
import Trips from './pages/Trips'
import TripDetail from './pages/TripDetail'
import MapView from './pages/MapView'
import Stats from './pages/Stats'
import Memberships from './pages/Memberships'
import AddEditMembership from './pages/AddEditMembership'
import MembershipMileage from './pages/MembershipMileage'
import Settings from './pages/Settings'
import { db } from './db/db'
import { useTheme } from './hooks/useTheme'
import { useHapticFeedback } from './hooks/useHapticFeedback'

function App() {
  useTheme()
  const triggerHaptic = useHapticFeedback()
  const [splashStage, setSplashStage] = useState<'visible' | 'fading' | 'hidden'>('visible')
  const [availableVersion, setAvailableVersion] = useState<string | null>(null)
  const splashStartTimeRef = useRef<number>(0)
  const initialDataLoaded = useLiveQuery(async () => {
    await Promise.all([db.flights.count(), db.memberships.count(), db.trips.count()])
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

  useEffect(() => {
    if (!needRefresh[0]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailableVersion(null)
      return
    }

    let cancelled = false
    const loadAvailableVersion = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL || '/'
        const url = `${baseUrl}version.json?ts=${Date.now()}`
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { version?: string }
        if (!cancelled && data.version) {
          setAvailableVersion(data.version)
        }
      } catch {
        // Ignore and keep a generic update message when metadata is unavailable.
      }
    }

    void loadAvailableVersion()

    return () => {
      cancelled = true
    }
  }, [needRefresh])

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
      <div className="app-content">
        <Routes>
          <Route
            path="/"
            element={
              <Home
                hasUpdateAvailable={needRefresh[0]}
                availableVersion={availableVersion}
                onUpdate={() => {
                  triggerHaptic()
                  void updateServiceWorker(true)
                }}
              />
            }
          />
          <Route path="/flights" element={<Flights />} />
          <Route path="/flights/:id" element={<FlightDetail />} />
          <Route path="/flights/new" element={<AddEditFlight />} />
          <Route path="/flights/:id/edit" element={<AddEditFlight />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/trips/:id" element={<TripDetail />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/memberships" element={<Memberships />} />
          <Route path="/memberships/new" element={<AddEditMembership />} />
          <Route path="/memberships/:id/edit" element={<AddEditMembership />} />
          <Route path="/memberships/:id/mileage" element={<MembershipMileage />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
      <BottomNav />
    </Router>
  )
}

export default App
