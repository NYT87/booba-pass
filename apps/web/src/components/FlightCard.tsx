import { useNavigate } from 'react-router-dom'
import type { Flight } from '../types'
import { flightDurationMin, formatDuration, isUpcoming } from '../types'
import { Plane, Ticket } from 'lucide-react'
import AirlineLabel from './AirlineLabel'
import { useHapticFeedback } from '../hooks/useHapticFeedback'

interface Props {
  flight: Flight
}

export default function FlightCard({ flight }: Props) {
  const navigate = useNavigate()
  const triggerHaptic = useHapticFeedback()
  const upcoming = isUpcoming(flight)
  const duration = formatDuration(flightDurationMin(flight))

  return (
    <button
      type="button"
      className="card flight-card animate-in"
      onClick={() => {
        triggerHaptic()
        navigate(`/flights/${flight.id}`)
      }}
    >
      <div className="flight-card-main">
        <div className="flight-card-topline">
          <span className={`badge ${upcoming ? 'badge-upcoming' : 'badge-past'}`}>
            {upcoming ? 'Upcoming' : 'Completed'}
          </span>
          <span className="flight-card-date">
            {flight.boardingPassDataUrl && <Ticket size={12} />}
            {flight.scheduledDepartureDate}
          </span>
        </div>
        <div className="flight-card-route">
          <div className="flight-card-airport">
            <span className="iata-code">{flight.departureIata}</span>
            <span className="flight-card-city">{flight.departureCity}</span>
          </div>
          <div className="flight-arc-line">
            <Plane size={13} />
          </div>
          <div className="flight-card-airport flight-card-airport-arrival">
            <span className="iata-code">{flight.arrivalIata}</span>
            <span className="flight-card-city">{flight.arrivalCity}</span>
          </div>
        </div>
        <div className="flight-card-meta">
          <div className="flight-card-meta-row">
            <AirlineLabel name={flight.airline} className="flight-airline-label" />
            <span>{flight.flightNumber}</span>
          </div>
          <div className="flight-card-meta-row flight-card-meta-row-secondary">
            <span>{duration}</span>
            <span className="flight-card-meta-separator">|</span>
            <span>{Math.round(flight.distanceKm).toLocaleString()} km</span>
          </div>
        </div>
      </div>
    </button>
  )
}
