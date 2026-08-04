import FlightCard from '../components/FlightCard'
import PageScaffold from '../components/PageScaffold'
import TripCard from '../components/TripCard'
import { useFlights } from '../hooks/useFlights'
import { compareTripsByStartDateDesc, isUpcomingTrip, useTrips } from '../hooks/useTrips'
import { MapPin, Settings as SettingsIcon, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { compareFlightsByScheduledDepartureDesc, flightDurationMin, isUpcoming } from '../types'
import { useHapticFeedback } from '../hooks/useHapticFeedback'

type HomeProps = {
  hasUpdateAvailable: boolean
  availableVersion: string | null
  onUpdate: () => void
}

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

function TripCardSkeleton() {
  return (
    <div className="card trip-card trip-card-skeleton" aria-hidden="true">
      <div className="trip-card-main">
        <div className="trip-card-topline">
          <span className="flight-skeleton flight-skeleton-pill" />
          <span className="flight-skeleton flight-skeleton-date" />
        </div>
        <div>
          <div className="home-trip-skeleton-name">
            <span className="flight-skeleton" />
          </div>
          <div className="trip-card-cities">
            <span className="flight-skeleton flight-skeleton-city" />
            <span className="flight-skeleton flight-skeleton-meta" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home({ hasUpdateAvailable, availableVersion, onUpdate }: HomeProps) {
  const navigate = useNavigate()
  const triggerHaptic = useHapticFeedback()
  const flights = useFlights('all')
  const trips = useTrips()
  const isTripsLoading = trips === undefined
  const isFlightsLoading = flights === undefined

  const upcomingFlights = flights?.filter(isUpcoming).sort((a, b) => compareFlightsByScheduledDepartureDesc(b, a)) ?? []
  const completedFlights = flights?.filter((flight) => !isUpcoming(flight))
  const completedStats = completedFlights
    ? {
        totalFlights: completedFlights.length,
        totalDistanceKm: Math.round(completedFlights.reduce((sum, flight) => sum + flight.distanceKm, 0)),
        totalDurationMin: completedFlights.reduce((sum, flight) => sum + flightDurationMin(flight), 0),
      }
    : undefined
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
            {isFlightsLoading ? (
              <div className="hero-value home-hero-value-skeleton">
                <span className="flight-skeleton" />
              </div>
            ) : (
              <div className="hero-value">{completedStats?.totalFlights ?? 0}</div>
            )}
          </div>
          <div className="hero-meta">
            <div className="instrument-row">
              <span>DISTANCE</span>
              {isFlightsLoading ? (
                <strong className="home-instrument-skeleton">
                  <span className="flight-skeleton" />
                </strong>
              ) : (
                <strong>{Math.round(completedStats?.totalDistanceKm ?? 0).toLocaleString()} KM</strong>
              )}
            </div>
            <div className="instrument-row">
              <span>AIR TIME</span>
              {isFlightsLoading ? (
                <strong className="home-instrument-skeleton">
                  <span className="flight-skeleton" />
                </strong>
              ) : (
                <strong>{Math.round((completedStats?.totalDurationMin ?? 0) / 60)} H</strong>
              )}
            </div>
            <div className="instrument-row">
              <span>NEXT DEPARTURE</span>
              {isFlightsLoading ? (
                <strong className="home-instrument-skeleton">
                  <span className="flight-skeleton" />
                </strong>
              ) : (
                <strong>{upcomingFlights[0]?.scheduledDepartureDate ?? 'NONE SCHEDULED'}</strong>
              )}
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

      {(isTripsLoading || upcomingTrips.length > 0) && (
        <section style={{ marginTop: 12 }} aria-busy={isTripsLoading ? 'true' : undefined}>
          <div className="section-header">
            <h2>Upcoming Trips</h2>
            {!isTripsLoading && trips && trips.length > upcomingTrips.length && (
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
            {isTripsLoading
              ? Array.from({ length: 2 }, (_, index) => <TripCardSkeleton key={index} />)
              : upcomingTrips.map((trip) => <TripCard key={trip.id} trip={trip} />)}
          </div>
        </section>
      )}

      {(isFlightsLoading || upcomingFlights.length > 0) && (
        <section style={{ marginTop: 12 }} aria-busy={isFlightsLoading ? 'true' : undefined}>
          <div className="section-header">
            <h2>Upcoming Flights</h2>
          </div>
          {isFlightsLoading
            ? Array.from({ length: 2 }, (_, index) => <FlightCardSkeleton key={index} index={index} />)
            : upcomingFlights.map((f) => <FlightCard key={f.id} flight={f} />)}
        </section>
      )}
    </PageScaffold>
  )
}
