import { useDeferredValue, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFlights } from '../hooks/useFlights'
import FlightCard from '../components/FlightCard'
import { Plus, Search } from 'lucide-react'
import { useHapticFeedback } from '../hooks/useHapticFeedback'

type FilterType = 'all' | 'past' | 'upcoming'

export default function Flights() {
  const navigate = useNavigate()
  const triggerHaptic = useHapticFeedback()
  const [isScrolled, setIsScrolled] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [query, setQuery] = useState('')
  const flights = useFlights(filter)
  const deferredQuery = useDeferredValue(query)
  const normalizedQuery = deferredQuery.trim().toLowerCase()
  const filteredFlights =
    flights?.filter((flight) => {
      if (!normalizedQuery) return true

      const haystack = [
        flight.departureIata,
        flight.arrivalIata,
        flight.departureCity,
        flight.arrivalCity,
        flight.airline,
        flight.flightNumber,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    }) ?? []

  // Group flights by year
  const grouped = filteredFlights.reduce(
    (acc: Record<string, typeof filteredFlights>, f) => {
      const year = f.scheduledDepartureDate.slice(0, 4)
      if (!acc[year]) acc[year] = []
      acc[year].push(f)
      return acc
    },
    {} as Record<string, typeof filteredFlights>
  )

  const years = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="page page-fixed-header-shell animate-in">
      <header className="page-header">
        <h1>My Flights</h1>
        <button
          className="btn-ghost btn-ghost-accent"
          onClick={() => {
            triggerHaptic()
            navigate('/flights/new')
          }}
        >
          <Plus size={24} />
        </button>
      </header>

      <div className={`page-controls ${isScrolled ? 'page-controls-scrolled' : ''}`}>
        <div className="flights-controls-layout">
          <div className="filter-tabs">
            {(['all', 'past', 'upcoming'] as const).map((f) => (
              <button
                key={f}
                className={`filter-tab ${filter === f ? 'active' : ''}`}
                onClick={() => {
                  triggerHaptic()
                  setFilter(f)
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="flights-search-wrap">
            <Search size={16} />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by airport, airline, or flight code"
              aria-label="Filter flights"
            />
          </div>
        </div>
      </div>

      <div
        className="page-scroll-body"
        onScroll={(event) => {
          setIsScrolled(event.currentTarget.scrollTop > 0)
        }}
      >
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
            <div className="empty-icon">[ ]</div>
            <p>
              No {filter !== 'all' ? filter : ''} flights
              {normalizedQuery ? ' match this filter.' : ' found.'}
            </p>
            {filter === 'all' && !normalizedQuery && (
              <button
                className="btn-primary"
                onClick={() => {
                  triggerHaptic()
                  navigate('/flights/new')
                }}
              >
                Add Your First Flight
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
