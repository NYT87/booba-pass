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
import { useTheme } from './hooks/useTheme'

function App() {
  useTheme()
  return (
    <Router>
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
