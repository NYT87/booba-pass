import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFlights } from '../hooks/useFlights'
import FlightCard from '../components/FlightCard'
import { Plus } from 'lucide-react'

type FilterType = 'all' | 'past' | 'upcoming'

export default function Flights() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FilterType>('all')
  const flights = useFlights(filter)

  // Group flights by year
  const grouped =
    flights?.reduce(
      (acc: Record<string, typeof flights>, f) => {
        const year = f.scheduledDepartureDate.slice(0, 4)
        if (!acc[year]) acc[year] = []
        acc[year].push(f)
        return acc
      },
      {} as Record<string, typeof flights>
    ) ?? {}

  const years = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="page animate-in">
      <header
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <h1>My Flights</h1>
        <button className="btn-ghost" style={{ color: 'var(--accent)' }} onClick={() => navigate('/flights/new')}>
          <Plus size={24} />
        </button>
      </header>

      <div className="filter-tabs">
        {(['all', 'past', 'upcoming'] as const).map((f) => (
          <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {years.length > 0 ? (
        years.map((year) => (
          <div key={year}>
            <div className="year-group-header">{year}</div>
            {grouped[year].map((f) => (
              <FlightCard key={f.id} flight={f} />
            ))}
          </div>
        ))
      ) : (
        <div className="empty-state">
          <div className="empty-icon">✈️</div>
          <p>No {filter !== 'all' ? filter : ''} flights found.</p>
          {filter === 'all' && (
            <button className="btn-primary" onClick={() => navigate('/flights/new')}>
              Add Your First Flight
            </button>
          )}
        </div>
      )}
    </div>
  )
}
