import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import PageScaffold from '../components/PageScaffold'
import { useMembershipById } from '../hooks/useMemberships'
import { useFlightsByMembership } from '../hooks/useFlights'
import { useHapticFeedback } from '../hooks/useHapticFeedback'

function formatMileage(value: number | undefined) {
  if (value === undefined) return ''
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
  const triggerHaptic = useHapticFeedback()
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
    <PageScaffold
      title={<h1>Recent Mileage</h1>}
      left={
        <button
          className="btn-ghost"
          onClick={() => {
            triggerHaptic()
            navigate('/memberships')
          }}
        >
          <ArrowLeft size={24} />
        </button>
      }
      right={
        <button
          className="btn-ghost btn-ghost-accent"
          onClick={() => {
            triggerHaptic()
            navigate('/flights/new', { state: { membershipId } })
          }}
        >
          <Plus size={22} />
        </button>
      }
    >
      <div style={{ padding: '0 20px', marginBottom: 12 }}>
        <div style={{ fontWeight: 700 }}>{membership.airlineName}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {membership.programName || 'Membership'}
        </div>
      </div>

      <div className="card membership-mileage-list">
        {flights.length > 0 ? (
          flights.map((f) => (
            <button
              key={f.id}
              type="button"
              className="membership-mileage-row"
              onClick={() => {
                if (f.id === undefined) return
                triggerHaptic()
                navigate(`/flights/${f.id}`, { state: { returnTo: `/memberships/${membershipId}/mileage` } })
              }}
              aria-label={`Open ${f.flightNumber} details`}
            >
              <div className="membership-mileage-flight">
                <div className="membership-mileage-flight-code">
                  <span>{f.flightNumber}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {f.departureIata}/{f.arrivalIata}
                </div>
              </div>
              <div
                className="membership-mileage-value"
                style={{
                  color: f.mileageGranted !== undefined ? 'var(--accent)' : 'transparent',
                }}
              >
                {formatMileage(f.mileageGranted)}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                {formatDateDot(f.scheduledDepartureDate)}
              </div>
            </button>
          ))
        ) : (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No flights linked to this membership yet.
          </div>
        )}
      </div>
    </PageScaffold>
  )
}
