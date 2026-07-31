import { startTransition, useDeferredValue, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFlights } from '../hooks/useFlights'
import FlightCard from '../components/FlightCard'
import PageScaffold from '../components/PageScaffold'
import { Plus, Search } from 'lucide-react'
import { useHapticFeedback } from '../hooks/useHapticFeedback'

type FilterType = 'all' | 'past' | 'upcoming'
const INITIAL_VISIBLE_FLIGHTS = 8

function FlightCardSkeleton({ index }: { index: number }) {
  return (
    <div className="card flight-card flight-card-skeleton" aria-hidden="true">
      <div className="flight-card-main">
        <div className="flight-card-topline">
          <span className="flight-skeleton flight-skeleton-pill" />
          <span className="flight-skeleton flight-skeleton-date" />
        </div>
        <div className="flight-card-route">
          <div className="flight-card-airport">
            <span
              className={`flight-skeleton flight-skeleton-iata ${index % 2 === 0 ? 'flight-skeleton-iata-wide' : ''}`}
            />
            <span className="flight-skeleton flight-skeleton-city" />
          </div>
          <div className="flight-arc-line flight-arc-line-skeleton" />
          <div className="flight-card-airport flight-card-airport-arrival">
            <span className="flight-skeleton flight-skeleton-iata" />
            <span className="flight-skeleton flight-skeleton-city flight-skeleton-city-short" />
          </div>
        </div>
        <div className="flight-card-meta">
          <div className="flight-card-meta-row">
            <span className="flight-skeleton flight-skeleton-meta flight-skeleton-meta-wide" />
            <span className="flight-skeleton flight-skeleton-meta" />
          </div>
          <div className="flight-card-meta-row flight-card-meta-row-secondary">
            <span className="flight-skeleton flight-skeleton-meta" />
            <span className="flight-skeleton flight-skeleton-separator" />
            <span className="flight-skeleton flight-skeleton-meta" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Flights() {
  const navigate = useNavigate()
  const triggerHaptic = useHapticFeedback()
  const [filter, setFilter] = useState<FilterType>('all')
  const [query, setQuery] = useState('')
  const flights = useFlights(filter)
  const isInitialLoading = flights === undefined
  const deferredQuery = useDeferredValue(query)
  const normalizedQuery = deferredQuery.trim().toLowerCase()
  const [visibleFlightsCount, setVisibleFlightsCount] = useState(INITIAL_VISIBLE_FLIGHTS)
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
  const isIncrementallyLoading = !isInitialLoading && visibleFlightsCount < filteredFlights.length
  const visibleFlights = filteredFlights.slice(0, visibleFlightsCount)

  useEffect(() => {
    if (isInitialLoading) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleFlightsCount(INITIAL_VISIBLE_FLIGHTS)

    if (filteredFlights.length <= INITIAL_VISIBLE_FLIGHTS) return

    const timer = window.setTimeout(() => {
      startTransition(() => {
        setVisibleFlightsCount(filteredFlights.length)
      })
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [filteredFlights.length, isInitialLoading, filter, normalizedQuery])

  // Group flights by year
  const grouped = visibleFlights.reduce(
    (acc: Record<string, typeof visibleFlights>, f) => {
      const year = f.scheduledDepartureDate.slice(0, 4)
      if (!acc[year]) acc[year] = []
      acc[year].push(f)
      return acc
    },
    {} as Record<string, typeof visibleFlights>
  )

  const years = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <PageScaffold
      title={<h1>My Flights</h1>}
      right={
        <button
          className="btn-ghost btn-ghost-accent"
          onClick={() => {
            triggerHaptic()
            navigate('/flights/new')
          }}
        >
          <Plus size={24} />
        </button>
      }
      scrollMode="body"
      headerBottom={
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
      }
    >
      {isInitialLoading ? (
        <div aria-busy="true" aria-label="Loading flights">
          <div className="year-group-header year-group-header-skeleton">
            <span className="flight-skeleton flight-skeleton-year" />
          </div>
          {Array.from({ length: 4 }, (_, index) => (
            <FlightCardSkeleton key={index} index={index} />
          ))}
        </div>
      ) : years.length > 0 ? (
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
      {isIncrementallyLoading && (
        <div aria-busy="true" aria-label="Loading more flights">
          {Array.from({ length: Math.min(3, filteredFlights.length - visibleFlightsCount) }, (_, index) => (
            <FlightCardSkeleton key={`incremental-${index}`} index={index} />
          ))}
        </div>
      )}
    </PageScaffold>
  )
}
