import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Flights from './pages/Flights';
import FlightDetail from './pages/FlightDetail';
import AddEditFlight from './pages/AddEditFlight';
import MapView from './pages/MapView';
import Stats from './pages/Stats';
import Settings from './pages/Settings';

function App() {
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
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
      <BottomNav />
    </Router>
  );
}

export default App;
