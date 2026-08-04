import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Edit2, Link2, MapPin, Plus, Search, Trash2, Unlink, X } from 'lucide-react'
import AirlineLabel from '../components/AirlineLabel'
import PageScaffold from '../components/PageScaffold'
import { useFlights } from '../hooks/useFlights'
import {
  deleteTrip,
  linkFlightToTrip,
  saveTrip,
  unlinkFlightFromTrip,
  useTripById,
  useTripFlights,
} from '../hooks/useTrips'
import { useHapticFeedback } from '../hooks/useHapticFeedback'
import type { Airport, Flight, Trip } from '../types'

const formatTripDates = (trip: Trip) => {
  if (trip.startDate === trip.endDate) return trip.startDate
  return `${trip.startDate} - ${trip.endDate}`
}

function FlightLinkRow({
  flight,
  action,
  onAction,
}: {
  flight: Flight
  action: 'link' | 'unlink'
  onAction: () => void
}) {
  return (
    <div className="trip-flight-row">
      <div className="trip-flight-route">
        <span className="trip-flight-iata">{flight.departureIata}</span>
        <span className="trip-flight-divider">-</span>
        <span className="trip-flight-iata">{flight.arrivalIata}</span>
      </div>
      <div className="trip-flight-meta">
        <AirlineLabel name={flight.airline} />
        <span>{flight.flightNumber}</span>
        <span>{flight.scheduledDepartureDate}</span>
      </div>
      <div className="trip-flight-actions">
        <button
          type="button"
          className={`membership-icon-btn ${action === 'unlink' ? 'membership-icon-btn-danger' : ''}`}
          onClick={onAction}
          aria-label={action === 'link' ? `Link ${flight.flightNumber}` : `Unlink ${flight.flightNumber}`}
        >
          {action === 'link' ? <Link2 size={18} /> : <Unlink size={18} />}
        </button>
      </div>
    </div>
  )
}

export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const tripId = id ? Number.parseInt(id, 10) : undefined
  const trip = useTripById(tripId)
  const linkedFlights = useTripFlights(trip)
  const allFlights = useFlights('all')
  const triggerHaptic = useHapticFeedback()
  const [showDateInput, setShowDateInput] = useState(false)
  const [tripStartDateInput, setTripStartDateInput] = useState('')
  const [tripEndDateInput, setTripEndDateInput] = useState('')
  const [cityInput, setCityInput] = useState('')
  const [showCityInput, setShowCityInput] = useState(false)
  const [editingCity, setEditingCity] = useState<string | null>(null)
  const [showPaymentInput, setShowPaymentInput] = useState(false)
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [paymentDescription, setPaymentDescription] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentCurrency, setPaymentCurrency] = useState('USD')
  const [showFlightPicker, setShowFlightPicker] = useState(false)
  const [flightSearchQuery, setFlightSearchQuery] = useState('')
  const [airportsByIata, setAirportsByIata] = useState<Map<string, Airport>>(new Map())

  useEffect(() => {
    let cancelled = false
    const loadAirports = async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/airports.json`)
        if (!res.ok) return
        const airports = (await res.json()) as Airport[]
        if (!cancelled) {
          setAirportsByIata(new Map(airports.map((airport) => [airport.iata.toUpperCase(), airport])))
        }
      } catch {
        // Airport-name search is best-effort; city/code search still works from flight records.
      }
    }

    void loadAirports()

    return () => {
      cancelled = true
    }
  }, [])

  const availableFlights = useMemo(() => {
    if (!trip || !allFlights) return []
    const linkedIds = new Set(trip.flightIds)
    return allFlights.filter((flight) => flight.id !== undefined && !linkedIds.has(flight.id))
  }, [allFlights, trip])
  const normalizedFlightSearchQuery = flightSearchQuery.trim().toLowerCase()
  const visibleAvailableFlights = useMemo(() => {
    if (!normalizedFlightSearchQuery) return availableFlights.slice(0, 5)

    return availableFlights.filter((flight) => {
      const departureAirport = airportsByIata.get(flight.departureIata.toUpperCase())
      const arrivalAirport = airportsByIata.get(flight.arrivalIata.toUpperCase())
      const haystack = [
        flight.departureIata,
        flight.arrivalIata,
        flight.departureCity,
        flight.arrivalCity,
        departureAirport?.name,
        arrivalAirport?.name,
        departureAirport?.city,
        arrivalAirport?.city,
        flight.airline,
        flight.flightNumber,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedFlightSearchQuery)
    })
  }, [airportsByIata, availableFlights, normalizedFlightSearchQuery])

  useEffect(() => {
    if (!trip) return
    setTripStartDateInput(trip.startDate)
    setTripEndDateInput(trip.endDate)
  }, [trip])

  if (!trip) {
    return (
      <div className="page">
        <p>Loading...</p>
      </div>
    )
  }

  const handleAddCity = async () => {
    const city = cityInput.trim()
    if (!city) return
    const existingCities = new Set(
      trip.cities.filter((value) => value !== editingCity).map((value) => value.toLowerCase())
    )
    if (existingCities.has(city.toLowerCase())) {
      setCityInput('')
      return
    }
    await saveTrip({
      ...trip,
      cities: editingCity ? trip.cities.map((value) => (value === editingCity ? city : value)) : [...trip.cities, city],
    })
    setCityInput('')
    setEditingCity(null)
    setShowCityInput(false)
  }

  const handleRemoveCity = async (city: string) => {
    await saveTrip({
      ...trip,
      cities: trip.cities.filter((value) => value !== city),
    })
  }

  const handleSavePayment = async () => {
    const description = paymentDescription.trim()
    const currency = paymentCurrency.trim().toUpperCase()
    const amount = Number.parseFloat(paymentAmount)

    if (!description) {
      alert('Please add a payment description.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Please add a valid payment amount.')
      return
    }
    if (!currency) {
      alert('Please add a currency.')
      return
    }

    const nextPayment = {
      id: editingPaymentId ?? crypto.randomUUID(),
      description,
      price: {
        amount,
        currency,
      },
    }

    await saveTrip({
      ...trip,
      payments: editingPaymentId
        ? (trip.payments ?? []).map((payment) => (payment.id === editingPaymentId ? nextPayment : payment))
        : [...(trip.payments ?? []), nextPayment],
    })
    setEditingPaymentId(null)
    setPaymentDescription('')
    setPaymentAmount('')
    setPaymentCurrency(currency)
    setShowPaymentInput(false)
  }

  const handleRemovePayment = async (paymentId: string) => {
    await saveTrip({
      ...trip,
      payments: (trip.payments ?? []).filter((payment) => payment.id !== paymentId),
    })
  }

  const handleSaveTripDates = async () => {
    if (!tripStartDateInput || !tripEndDateInput) {
      alert('Please add both trip dates.')
      return
    }
    if (tripEndDateInput < tripStartDateInput) {
      alert('Trip end date must be the same as or later than the start date.')
      return
    }

    await saveTrip({
      ...trip,
      startDate: tripStartDateInput,
      endDate: tripEndDateInput,
    })
    setShowDateInput(false)
  }

  const handleDelete = async () => {
    if (!trip.id || !confirm('Delete this trip? Linked flights will stay in your flight list.')) return
    await deleteTrip(trip.id)
    navigate('/trips')
  }

  return (
    <PageScaffold
      title={<h1>Trip Details</h1>}
      left={
        <button
          onClick={() => {
            triggerHaptic()
            navigate('/trips')
          }}
          className="btn-ghost"
        >
          <ArrowLeft size={24} />
        </button>
      }
      right={
        <button
          onClick={() => {
            triggerHaptic()
            void handleDelete()
          }}
          className="btn-ghost"
          style={{ color: 'var(--danger)' }}
        >
          <Trash2 size={20} />
        </button>
      }
      scrollMode="body"
    >
      <section className="trip-detail-hero">
        <div className="trip-detail-name">{trip.name}</div>
        <div className="trip-detail-facts">
          <span>
            <CalendarDays size={14} />
            {formatTripDates(trip)}
            <button
              type="button"
              className="trip-inline-icon-btn"
              onClick={() => {
                triggerHaptic()
                setTripStartDateInput(trip.startDate)
                setTripEndDateInput(trip.endDate)
                setShowDateInput(true)
              }}
              aria-label="Edit trip dates"
            >
              <Edit2 size={14} />
            </button>
          </span>
          <span>
            <MapPin size={14} />
            {trip.cities.length} {trip.cities.length === 1 ? 'City' : 'Cities'}
          </span>
        </div>
      </section>

      <section className="form-section">
        <div className="section-header trip-section-header">
          <h2>Flights</h2>
          <button
            type="button"
            className="membership-icon-btn"
            onClick={() => {
              triggerHaptic()
              setShowFlightPicker(true)
            }}
            aria-label="Add flight"
          >
            <Plus size={18} />
          </button>
        </div>
        {linkedFlights === undefined ? (
          <div className="card trip-empty-panel">Loading flights...</div>
        ) : linkedFlights.length > 0 ? (
          <div className="trip-flight-list">
            {linkedFlights.map((flight) => (
              <FlightLinkRow
                key={flight.id}
                flight={flight}
                action="unlink"
                onAction={() => {
                  if (flight.id === undefined) return
                  triggerHaptic()
                  void unlinkFlightFromTrip(trip, flight.id)
                }}
              />
            ))}
          </div>
        ) : (
          <div className="card trip-empty-panel">No flights linked.</div>
        )}
      </section>

      <section className="form-section">
        <div className="section-header trip-section-header">
          <h2>Cities</h2>
          <button
            type="button"
            className="membership-icon-btn"
            onClick={() => {
              triggerHaptic()
              setEditingCity(null)
              setCityInput('')
              setShowCityInput(true)
            }}
            aria-label="Add city"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="trip-city-editor">
          <div className="trip-city-list">
            {trip.cities.length > 0 ? (
              trip.cities.map((city) => (
                <div key={city} className="trip-city-row">
                  <span className="trip-city-name">{city}</span>
                  <div className="trip-row-actions">
                    <button
                      type="button"
                      className="membership-icon-btn"
                      onClick={() => {
                        triggerHaptic()
                        setEditingCity(city)
                        setCityInput(city)
                        setShowCityInput(true)
                      }}
                      aria-label={`Edit ${city}`}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      type="button"
                      className="membership-icon-btn membership-icon-btn-danger"
                      onClick={() => {
                        triggerHaptic()
                        void handleRemoveCity(city)
                      }}
                      aria-label={`Remove ${city}`}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <span className="trip-muted-copy">No cities added yet.</span>
            )}
          </div>
        </div>
      </section>

      <section className="form-section">
        <div className="section-header trip-section-header">
          <h2>Payments</h2>
          <button
            type="button"
            className="membership-icon-btn"
            onClick={() => {
              triggerHaptic()
              setEditingPaymentId(null)
              setPaymentDescription('')
              setPaymentAmount('')
              setShowPaymentInput(true)
            }}
            aria-label="Add payment"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="trip-payment-list">
          {(trip.payments ?? []).length > 0 ? (
            (trip.payments ?? []).map((payment) => (
              <div key={payment.id} className="trip-payment-row">
                <div className="trip-payment-copy">
                  <span className="trip-payment-description">{payment.description}</span>
                  <span className="trip-payment-price">
                    {payment.price.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}{' '}
                    {payment.price.currency}
                  </span>
                </div>
                <div className="trip-row-actions">
                  <button
                    type="button"
                    className="membership-icon-btn"
                    onClick={() => {
                      triggerHaptic()
                      setEditingPaymentId(payment.id)
                      setPaymentDescription(payment.description)
                      setPaymentAmount(String(payment.price.amount))
                      setPaymentCurrency(payment.price.currency)
                      setShowPaymentInput(true)
                    }}
                    aria-label={`Edit ${payment.description}`}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    type="button"
                    className="membership-icon-btn membership-icon-btn-danger"
                    onClick={() => {
                      triggerHaptic()
                      void handleRemovePayment(payment.id)
                    }}
                    aria-label={`Remove ${payment.description}`}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <span className="trip-muted-copy">No payments added yet.</span>
          )}
        </div>
      </section>

      {showDateInput &&
        createPortal(
          <div
            className="trip-modal-overlay animate-in"
            onClick={() => {
              triggerHaptic()
              setShowDateInput(false)
              setTripStartDateInput(trip.startDate)
              setTripEndDateInput(trip.endDate)
            }}
          >
            <div className="trip-modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="trip-modal-header">
                <h3>Edit Dates</h3>
                <button
                  type="button"
                  className="membership-icon-btn"
                  onClick={() => {
                    triggerHaptic()
                    setShowDateInput(false)
                    setTripStartDateInput(trip.startDate)
                    setTripEndDateInput(trip.endDate)
                  }}
                  aria-label="Close date editor"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="trip-modal-body">
                <div className="trip-date-input-row">
                  <div className="form-field">
                    <label>Start</label>
                    <input
                      type="date"
                      value={tripStartDateInput}
                      onChange={(event) => {
                        const nextDate = event.target.value
                        setTripStartDateInput(nextDate)
                        if (tripEndDateInput < nextDate) setTripEndDateInput(nextDate)
                      }}
                    />
                  </div>
                  <div className="form-field">
                    <label>End</label>
                    <input
                      type="date"
                      value={tripEndDateInput}
                      onChange={(event) => setTripEndDateInput(event.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    triggerHaptic()
                    void handleSaveTripDates()
                  }}
                >
                  Save Dates
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showFlightPicker &&
        createPortal(
          <div
            className="trip-modal-overlay animate-in"
            onClick={() => {
              triggerHaptic()
              setShowFlightPicker(false)
              setFlightSearchQuery('')
            }}
          >
            <div
              className="trip-modal-card trip-modal-card-large"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="trip-modal-header">
                <h3>Add Flight</h3>
                <button
                  type="button"
                  className="membership-icon-btn"
                  onClick={() => {
                    triggerHaptic()
                    setShowFlightPicker(false)
                    setFlightSearchQuery('')
                  }}
                  aria-label="Close flight picker"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="trip-modal-body">
                <div className="flights-search-wrap trip-flight-search-wrap">
                  <Search size={16} />
                  <input
                    type="text"
                    value={flightSearchQuery}
                    onChange={(event) => setFlightSearchQuery(event.target.value)}
                    placeholder="Search by city, airport, or code"
                    aria-label="Search flights to link"
                  />
                </div>
                <div className="trip-flight-list">
                  {allFlights === undefined ? (
                    <div className="trip-muted-copy">Loading flights...</div>
                  ) : visibleAvailableFlights.length > 0 ? (
                    visibleAvailableFlights.map((flight) => (
                      <FlightLinkRow
                        key={flight.id}
                        flight={flight}
                        action="link"
                        onAction={() => {
                          if (flight.id === undefined) return
                          triggerHaptic()
                          void linkFlightToTrip(trip, flight.id)
                        }}
                      />
                    ))
                  ) : allFlights.length === 0 ? (
                    <div className="trip-muted-copy">No saved flights found.</div>
                  ) : normalizedFlightSearchQuery ? (
                    <div className="trip-muted-copy">No flights match this search.</div>
                  ) : (
                    <div className="trip-muted-copy">Every saved flight is already linked to this trip.</div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showCityInput &&
        createPortal(
          <div
            className="trip-modal-overlay animate-in"
            onClick={() => {
              triggerHaptic()
              setShowCityInput(false)
              setEditingCity(null)
              setCityInput('')
            }}
          >
            <div className="trip-modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="trip-modal-header">
                <h3>{editingCity ? 'Edit City' : 'Add City'}</h3>
                <button
                  type="button"
                  className="membership-icon-btn"
                  onClick={() => {
                    triggerHaptic()
                    setShowCityInput(false)
                    setEditingCity(null)
                    setCityInput('')
                  }}
                  aria-label="Close city input"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="trip-modal-body">
                <div className="trip-city-input-row">
                  <div className="form-field">
                    <input
                      value={cityInput}
                      onChange={(event) => setCityInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          void handleAddCity()
                        }
                      }}
                      placeholder="Seoul"
                      aria-label="City name"
                    />
                  </div>
                  <button
                    type="button"
                    className="membership-icon-btn"
                    onClick={() => {
                      triggerHaptic()
                      void handleAddCity()
                    }}
                    aria-label={editingCity ? 'Update city' : 'Save city'}
                  >
                    {editingCity ? <Edit2 size={18} /> : <Plus size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showPaymentInput &&
        createPortal(
          <div
            className="trip-modal-overlay animate-in"
            onClick={() => {
              triggerHaptic()
              setShowPaymentInput(false)
              setEditingPaymentId(null)
              setPaymentDescription('')
              setPaymentAmount('')
            }}
          >
            <div className="trip-modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="trip-modal-header">
                <h3>{editingPaymentId ? 'Edit Payment' : 'Add Payment'}</h3>
                <button
                  type="button"
                  className="membership-icon-btn"
                  onClick={() => {
                    triggerHaptic()
                    setShowPaymentInput(false)
                    setEditingPaymentId(null)
                    setPaymentDescription('')
                    setPaymentAmount('')
                  }}
                  aria-label="Close payment input"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="trip-modal-body">
                <div className="form-field">
                  <input
                    value={paymentDescription}
                    onChange={(event) => setPaymentDescription(event.target.value)}
                    placeholder="Hotel deposit"
                    aria-label="Payment description"
                  />
                </div>
                <div className="trip-payment-input-row">
                  <div className="form-field">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(event) => setPaymentAmount(event.target.value)}
                      placeholder="120.00"
                      aria-label="Payment amount"
                    />
                  </div>
                  <div className="form-field">
                    <input
                      value={paymentCurrency}
                      onChange={(event) => setPaymentCurrency(event.target.value.toUpperCase())}
                      maxLength={3}
                      placeholder="USD"
                      aria-label="Payment currency"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    triggerHaptic()
                    void handleSavePayment()
                  }}
                >
                  {editingPaymentId ? 'Update Payment' : 'Save Payment'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </PageScaffold>
  )
}
