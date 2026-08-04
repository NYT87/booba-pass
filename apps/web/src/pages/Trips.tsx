import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X } from 'lucide-react'
import PageScaffold from '../components/PageScaffold'
import TripCard from '../components/TripCard'
import { saveTrip, useTrips } from '../hooks/useTrips'
import { useHapticFeedback } from '../hooks/useHapticFeedback'

const todayIso = () => new Date().toISOString().slice(0, 10)
type TripFilter = 'all' | 'past' | 'upcoming'
const isTripPast = (endDate: string) => endDate < todayIso()

export default function Trips() {
  const navigate = useNavigate()
  const triggerHaptic = useHapticFeedback()
  const trips = useTrips()
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState(todayIso())
  const [endDate, setEndDate] = useState(todayIso())
  const [citiesText, setCitiesText] = useState('')
  const [filter, setFilter] = useState<TripFilter>('all')
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const filteredTrips =
    trips?.filter((trip) => {
      const matchesStatus =
        filter === 'past' ? isTripPast(trip.endDate) : filter === 'upcoming' ? !isTripPast(trip.endDate) : true
      if (normalizedQuery) {
        const haystack = [trip.name, ...trip.cities].join(' ').toLowerCase()
        return matchesStatus && haystack.includes(normalizedQuery)
      }
      return matchesStatus
    }) ?? []

  const resetForm = () => {
    setName('')
    setStartDate(todayIso())
    setEndDate(todayIso())
    setCitiesText('')
  }

  const closeCreateModal = () => {
    setIsCreating(false)
    resetForm()
  }

  const handleCreateTrip = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      alert('Please add a trip name.')
      return
    }
    if (!startDate || !endDate || endDate < startDate) {
      alert('Trip end date must be the same as or later than the start date.')
      return
    }

    const cityNames = citiesText
      .split(',')
      .map((city) => city.trim())
      .filter(Boolean)
    const id = await saveTrip({
      name: trimmedName,
      startDate,
      endDate,
      cities: cityNames,
      flightIds: [],
      payments: [],
    })

    triggerHaptic()
    resetForm()
    setIsCreating(false)
    navigate(`/trips/${id}`)
  }

  return (
    <PageScaffold
      title={<h1>Trips</h1>}
      right={
        <button
          className="btn-ghost btn-ghost-accent"
          onClick={() => {
            triggerHaptic()
            setIsCreating(true)
          }}
          aria-label="Add trip"
        >
          <Plus size={24} />
        </button>
      }
      scrollMode="body"
      headerBottom={
        <div className="flights-controls-layout">
          <div className="filter-tabs">
            {(['all', 'past', 'upcoming'] as const).map((value) => (
              <button
                key={value}
                className={`filter-tab ${filter === value ? 'active' : ''}`}
                onClick={() => {
                  triggerHaptic()
                  setFilter(value)
                }}
              >
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
          <div className="flights-search-wrap">
            <Search size={16} />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by trip name or city"
              aria-label="Filter trips"
            />
          </div>
        </div>
      }
    >
      {isCreating &&
        createPortal(
          <div
            className="trip-modal-overlay animate-in"
            onClick={() => {
              triggerHaptic()
              closeCreateModal()
            }}
          >
            <div
              className="trip-modal-card trip-modal-card-large"
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="trip-modal-header">
                <h3>New Trip</h3>
                <button
                  type="button"
                  className="membership-icon-btn"
                  onClick={() => {
                    triggerHaptic()
                    closeCreateModal()
                  }}
                  aria-label="Close trip form"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="trip-modal-body">
                <div className="form-field">
                  <label>Name</label>
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Spring in Seoul" />
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Start</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => {
                        const nextDate = event.target.value
                        setStartDate(nextDate)
                        if (endDate < nextDate) setEndDate(nextDate)
                      }}
                    />
                  </div>
                  <div className="form-field">
                    <label>End</label>
                    <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                  </div>
                </div>
                <div className="form-field">
                  <label>Cities</label>
                  <input
                    value={citiesText}
                    onChange={(event) => setCitiesText(event.target.value)}
                    placeholder="Seoul, Busan, Tokyo"
                  />
                </div>
                <button
                  className="btn-primary"
                  type="button"
                  onClick={() => {
                    triggerHaptic()
                    void handleCreateTrip()
                  }}
                >
                  Create Trip
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {trips === undefined ? (
        <div aria-busy="true" aria-label="Loading trips">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="card trip-card trip-card-skeleton" />
          ))}
        </div>
      ) : filteredTrips.length > 0 ? (
        <div className="trips-list">
          {filteredTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">[]</div>
          <p>{normalizedQuery ? 'No trips match this filter.' : `No ${filter !== 'all' ? filter : ''} trips found.`}</p>
          <button
            className="btn-primary"
            onClick={() => {
              triggerHaptic()
              setIsCreating(true)
            }}
          >
            Add Your First Trip
          </button>
        </div>
      )}
    </PageScaffold>
  )
}
