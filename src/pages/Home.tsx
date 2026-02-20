import StatCard from '../components/StatCard';
import FlightCard from '../components/FlightCard';
import { useFlights, useStats } from '../hooks/useFlights';
import { Plane, MapPin, Clock, Settings as SettingsIcon, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const flights = useFlights('all');
  const stats = useStats();

  const recentFlights = flights?.slice(0, 5) ?? [];

  return (
    <div className="page animate-in">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="logo">booba-pass</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" style={{ color: 'var(--accent)' }} onClick={() => navigate('/flights/new')}><Plus size={24} /></button>
          <button className="btn-ghost" onClick={() => navigate('/settings')}><SettingsIcon size={20} /></button>
        </div>
      </header>

      <div className="stats-row">
        <StatCard
          icon={<Plane size={18} />}
          value={stats?.totalFlights ?? 0}
          label="Flights"
        />
        <StatCard
          icon={<MapPin size={18} />}
          value={((stats?.totalDistanceKm ?? 0) / 1000).toFixed(1) + 'k'}
          label="Dist (km)"
        />
        <StatCard
          icon={<Clock size={18} />}
          value={Math.round((stats?.totalDurationMin ?? 0) / 60)}
          label="Hours"
        />
      </div>

      <section style={{ marginTop: 28 }}>
        <div className="section-header">
          <h2>Global Footprint</h2>
        </div>
        <div className="map-preview-card" onClick={() => navigate('/map')}>
          <div className="map-placeholder">
            <div className="map-dot" style={{ top: '30%', left: '30%' }}></div>
            <div className="map-dot" style={{ top: '60%', left: '70%' }}></div>
            <svg className="map-line" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M 33 33 Q 50 45 67 57" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3,3" />
            </svg>
          </div>
          <div className="map-preview-info">
            <p>Explore your travel history on an interactive world map.</p>
          </div>
          <div className="map-preview-arrow">
            <MapPin size={20} />
          </div>
        </div>
      </section>

      <section>
        <div className="section-header">
          <h2>Recent Flights</h2>
          {flights && flights.length > 5 && (
            <button onClick={() => navigate('/flights')}>View All</button>
          )}
        </div>

        {recentFlights.length > 0 ? (
          recentFlights.map(f => <FlightCard key={f.id} flight={f} />)
        ) : (
          <div className="empty-state">
            <div className="empty-icon">✈️</div>
            <p>No flights tracked yet.<br />Tap the + button to add your first flight!</p>
          </div>
        )}
      </section>
    </div>
  );
}
