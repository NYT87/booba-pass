import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import PageScaffold from '../components/PageScaffold'
import TripCard from '../components/TripCard'
import { saveTrip, useTrips } from '../hooks/useTrips'
import { useHapticFeedback } from '../hooks/useHapticFeedback'

const todayIso = () => new Date().toISOString().slice(0, 10)

export default function Trips() {
  const navigate = useNavigate()
  const triggerHaptic = useHapticFeedback()
  const trips = useTrips()
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState(todayIso())
  const [endDate, setEndDate] = useState(todayIso())
  const [citiesText, setCitiesText] = useState('')

  const resetForm = () => {
    setName('')
    setStartDate(todayIso())
    setEndDate(todayIso())
    setCitiesText('')
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
            setIsCreating((current) => !current)
          }}
          aria-label={isCreating ? 'Close trip form' : 'Add trip'}
        >
          {isCreating ? <X size={24} /> : <Plus size={24} />}
        </button>
      }
      scrollMode="body"
    >
      {isCreating && (
        <section className="form-section">
          <div className="trip-create-panel">
            <div className="form-section-title">New Trip</div>
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
        </section>
      )}

      {trips === undefined ? (
        <div aria-busy="true" aria-label="Loading trips">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="card trip-card trip-card-skeleton" />
          ))}
        </div>
      ) : trips.length > 0 ? (
        <div className="trips-list">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">[]</div>
          <p>No trips found.</p>
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
