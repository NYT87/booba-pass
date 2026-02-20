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
          <div key={path} className="nav-item-wrap">
            <button
              className={`nav-item ${pathname === path ? 'active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          </div>
        ))}

        <div className="nav-item-wrap">
          <button className="fab" onClick={() => navigate('/flights/new')}>
            <Plus size={22} />
          </button>
        </div>

        {NAV_ITEMS.slice(2).map(({ path, label, Icon }) => (
          <div key={path} className="nav-item-wrap">
            <button
              className={`nav-item ${pathname === path ? 'active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          </div>
        ))}
      </div>
    </nav>
  );
}
