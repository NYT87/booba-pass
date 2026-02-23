import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { useMembershipById } from '../hooks/useMemberships'
import { useFlightsByMembership } from '../hooks/useFlights'

function formatMileage(value: number | undefined) {
  if (value === undefined) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toLocaleString()}`
}

function formatDateDot(date: string) {
  return date.replaceAll('-', '.')
}

export default function MembershipMileage() {
  const { id } = useParams()
  const membershipId = id ? Number.parseInt(id, 10) : undefined
  const navigate = useNavigate()
  const membership = useMembershipById(membershipId)
  const flights = useFlightsByMembership(membershipId) || []

  if (!membershipId || !membership) {
    return (
      <div className="page">
        <p>Loading membership mileage...</p>
      </div>
    )
  }

  return (
    <div className="page animate-in">
      <header className="page-header">
        <button className="btn-ghost" onClick={() => navigate('/memberships')}>
          <ArrowLeft size={24} />
        </button>
        <h1>Recent Mileage</h1>
        <button
          className="btn-ghost"
          style={{ color: 'var(--accent)' }}
          onClick={() => navigate('/flights/new', { state: { membershipId } })}
        >
          <Plus size={22} />
        </button>
      </header>

      <div style={{ padding: '0 20px', marginBottom: 12 }}>
        <div style={{ fontWeight: 700 }}>{membership.airlineName}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {membership.programName || 'Membership'}
        </div>
      </div>

      <div className="card" style={{ margin: '0 20px', padding: 0, overflow: 'hidden' }}>
        {flights.filter((f) => f.mileageGranted !== undefined).length > 0 ? (
          flights
            .filter((f) => f.mileageGranted !== undefined)
            .map((f) => (
              <div
                key={f.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) 94px 80px',
                  gap: 8,
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--border)',
                  alignItems: 'center',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {f.flightNumber}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {f.departureIata}/{f.arrivalIata}
                  </div>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {formatDateDot(f.scheduledDepartureDate)}
                </div>
                <div style={{ fontWeight: 700, textAlign: 'right', color: 'var(--accent)' }}>
                  {formatMileage(f.mileageGranted)}
                </div>
              </div>
            ))
        ) : (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No flights with mileage assigned yet.
          </div>
        )}
      </div>
    </div>
  )
}
