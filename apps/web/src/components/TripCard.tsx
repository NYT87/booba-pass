import { useNavigate } from 'react-router-dom'
import { CalendarDays, MapPin, Plane } from 'lucide-react'
import type { Trip } from '../types'
import { useHapticFeedback } from '../hooks/useHapticFeedback'

type Props = {
  trip: Trip
}

const formatTripDates = (trip: Trip) => {
  if (trip.startDate === trip.endDate) return trip.startDate
  return `${trip.startDate} - ${trip.endDate}`
}

export default function TripCard({ trip }: Props) {
  const navigate = useNavigate()
  const triggerHaptic = useHapticFeedback()
  const citySummary = trip.cities.length > 0 ? trip.cities.join(' / ') : 'No cities added'

  return (
    <button
      type="button"
      className="card trip-card animate-in"
      onClick={() => {
        triggerHaptic()
        navigate(`/trips/${trip.id}`)
      }}
    >
      <div className="trip-card-main">
        <div className="trip-card-topline">
          <span className="badge">
            <Plane size={12} />
            {trip.flightIds.length} {trip.flightIds.length === 1 ? 'Flight' : 'Flights'}
          </span>
          <span className="trip-card-date">
            <CalendarDays size={12} />
            {formatTripDates(trip)}
          </span>
        </div>
        <div>
          <div className="trip-card-name">{trip.name}</div>
          <div className="trip-card-cities">
            <MapPin size={13} />
            <span>{citySummary}</span>
          </div>
        </div>
      </div>
    </button>
  )
}
