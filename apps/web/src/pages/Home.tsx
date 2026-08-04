import FlightCard from '../components/FlightCard'
import PageScaffold from '../components/PageScaffold'
import TripCard from '../components/TripCard'
import { useFlights, useStats } from '../hooks/useFlights'
import { compareTripsByStartDateDesc, isUpcomingTrip, useTrips } from '../hooks/useTrips'
import { MapPin, Settings as SettingsIcon, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { compareFlightsByScheduledDepartureDesc, isUpcoming } from '../types'
import { useHapticFeedback } from '../hooks/useHapticFeedback'

type HomeProps = {
  hasUpdateAvailable: boolean
  availableVersion: string | null
  onUpdate: () => void
}

export default function Home({ hasUpdateAvailable, availableVersion, onUpdate }: HomeProps) {
  const navigate = useNavigate()
  const triggerHaptic = useHapticFeedback()
  const flights = useFlights('all')
  const trips = useTrips()
  const stats = useStats()

  const upcomingFlights = flights?.filter(isUpcoming).sort((a, b) => compareFlightsByScheduledDepartureDesc(b, a)) ?? []
  const upcomingTrips = trips?.filter(isUpcomingTrip).sort(compareTripsByStartDateDesc) ?? []

  return (
    <PageScaffold
      title={
        <div className="logo-block">
          <div className="logo">booba-pass</div>
        </div>
      }
      right={
        <div className="page-header-actions">
          <button
            className="btn-ghost btn-ghost-accent"
            onClick={() => {
              triggerHaptic()
              navigate('/flights/new')
            }}
          >
            <Plus size={24} />
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              triggerHaptic()
              navigate('/settings')
            }}
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      }
      top={
        hasUpdateAvailable ? (
          <div className="pwa-update-banner" role="status" aria-live="polite">
            <p>{availableVersion ? `Update available (v${availableVersion}).` : 'Update available.'}</p>
            <button type="button" onClick={onUpdate}>
              Update
            </button>
          </div>
        ) : null
      }
      scrollMode="body"
      headerClassName="page-header-home"
    >
      <section className="hero-panel">
        <div className="hero-grid">
          <div>
            <div className="eyebrow">TOTAL SEGMENTS</div>
            <div className="hero-value">{stats?.totalFlights ?? 0}</div>
          </div>
          <div className="hero-meta">
            <div className="instrument-row">
              <span>DISTANCE</span>
              <strong>{Math.round(stats?.totalDistanceKm ?? 0).toLocaleString()} KM</strong>
            </div>
            <div className="instrument-row">
              <span>AIR TIME</span>
              <strong>{Math.round((stats?.totalDurationMin ?? 0) / 60)} H</strong>
            </div>
            <div className="instrument-row">
              <span>NEXT DEPARTURE</span>
              <strong>{upcomingFlights[0]?.scheduledDepartureDate ?? 'NONE SCHEDULED'}</strong>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div
          className="map-preview-card"
          onClick={() => {
            triggerHaptic()
            navigate('/map')
          }}
        >
          <div className="map-placeholder">
            <div className="map-dot" style={{ top: '30%', left: '30%' }}></div>
            <div className="map-dot" style={{ top: '60%', left: '70%' }}></div>
            <svg className="map-line" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M 33 33 Q 50 45 67 57" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3,3" />
            </svg>
          </div>
          <div className="map-preview-info">
            <div className="eyebrow">MAP MODULE</div>
            <h2>Global footprint</h2>
            <p>Open the route board and inspect every segment on a world map.</p>
          </div>
          <div className="map-preview-arrow">
            <MapPin size={20} />
          </div>
        </div>
      </section>

      {upcomingTrips.length > 0 && (
        <section style={{ marginTop: 12 }}>
          <div className="section-header">
            <h2>Upcoming Trips</h2>
            {trips && trips.length > upcomingTrips.length && (
              <button
                onClick={() => {
                  triggerHaptic()
                  navigate('/trips')
                }}
              >
                View All
              </button>
            )}
          </div>
          <div className="trips-list">
            {upcomingTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      )}

      {upcomingFlights.length > 0 && (
        <section style={{ marginTop: 12 }}>
          <div className="section-header">
            <h2>Upcoming Flights</h2>
          </div>
          {upcomingFlights.map((f) => (
            <FlightCard key={f.id} flight={f} />
          ))}
        </section>
      )}
    </PageScaffold>
  )
}
