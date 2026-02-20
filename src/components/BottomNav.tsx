import { useNavigate, useLocation } from 'react-router-dom';
import { Home, List, Map, BarChart2, Plus } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Home', Icon: Home },
  { path: '/flights', label: 'Flights', Icon: List },
  { path: '/map', label: 'Map', Icon: Map },
  { path: '/stats', label: 'Stats', Icon: BarChart2 },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="bottom-nav">
      <div className="nav-items">
        {NAV_ITEMS.slice(0, 2).map(({ path, label, Icon }) => (
          <button
            key={path}
            className={`nav-item ${pathname === path ? 'active' : ''}`}
            onClick={() => navigate(path)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}

        {/* FAB in the middle */}
        <button className="fab" onClick={() => navigate('/flights/new')} style={{ position: 'relative', bottom: 'auto', right: 'auto', width: 48, height: 48, fontSize: '1.4rem' }}>
          <Plus size={22} />
        </button>

        {NAV_ITEMS.slice(2).map(({ path, label, Icon }) => (
          <button
            key={path}
            className={`nav-item ${pathname === path ? 'active' : ''}`}
            onClick={() => navigate(path)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
