import { useNavigate } from 'react-router-dom';
import type { Flight } from '../types';
import { flightDurationMin, formatDuration, isUpcoming } from '../types';
import { Plane, Ticket } from 'lucide-react';

interface Props { flight: Flight; }

export default function FlightCard({ flight }: Props) {
  const navigate = useNavigate();
  const upcoming = isUpcoming(flight);
  const duration = formatDuration(flightDurationMin(flight));

  return (
    <div className="card card-hover flight-card animate-in" onClick={() => navigate(`/flights/${flight.id}`)}>
      <div style={{ flex: 1 }}>
        <div className="flight-card-route">
          <span className="iata-code">{flight.departureIata}</span>
          <div className="flight-arc-line">
            <Plane size={13} />
          </div>
          <span className="iata-code">{flight.arrivalIata}</span>
        </div>
        <div className="flight-card-meta">
          {flight.airline} · {flight.flightNumber} · {duration} · {Math.round(flight.distanceKm).toLocaleString()} km
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <span className={`badge ${upcoming ? 'badge-upcoming' : 'badge-past'}`}>
          {upcoming ? 'Upcoming' : 'Completed'}
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          {flight.boardingPassDataUrl && <Ticket size={12} style={{ color: 'var(--accent)' }} />}
          {flight.scheduledDepartureDate}
        </span>
      </div>
    </div>
  );
}
