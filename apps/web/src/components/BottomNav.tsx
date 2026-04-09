import { useNavigate, useLocation } from 'react-router-dom'
import { Home, List, BarChart2, CreditCard } from 'lucide-react'
import { useHapticFeedback } from '../hooks/useHapticFeedback'

const NAV_ITEMS = [
  { path: '/', label: 'Home', Icon: Home },
  { path: '/flights', label: 'Flights', Icon: List },
  { path: '/memberships', label: 'Loyalty', Icon: CreditCard },
  { path: '/stats', label: 'Stats', Icon: BarChart2 },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const triggerHaptic = useHapticFeedback()

  return (
    <nav className="bottom-nav">
      <div className="nav-items">
        {NAV_ITEMS.map(({ path, label, Icon }) => (
          <div key={path} className="nav-item-wrap">
            <button
              className={`nav-item ${pathname === path ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic()
                navigate(path)
              }}
            >
              <span className="nav-item-icon">
                <Icon />
              </span>
              <span>{label}</span>
            </button>
          </div>
        ))}
      </div>
    </nav>
  )
}
