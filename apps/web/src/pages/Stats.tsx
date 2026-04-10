import { useState } from 'react'
import { useFlights, useStats } from '../hooks/useFlights'
import StatCard from '../components/StatCard'
import AirlineLabel from '../components/AirlineLabel'
import PageScaffold from '../components/PageScaffold'
import { Plane, MapPin, Clock } from 'lucide-react'

export default function Stats() {
  const [year, setYear] = useState<number | undefined>(undefined)
  const stats = useStats(year)
  const allFlights = useFlights('all')
  const years = Array.from(
    new Set((allFlights ?? []).map((flight) => Number.parseInt(flight.scheduledDepartureDate.slice(0, 4), 10)))
  )
    .filter((flightYear) => Number.isFinite(flightYear))
    .sort((a, b) => b - a)
  const flightsPerYear = Object.entries(
    (allFlights ?? []).reduce(
      (acc: Record<string, number>, flight) => {
        const flightYear = flight.scheduledDepartureDate.slice(0, 4)
        acc[flightYear] = (acc[flightYear] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
  )
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([flightYear, count]) => ({ year: flightYear, count }))

  if (!stats)
    return (
      <div className="page">
        <p>Loading stats...</p>
      </div>
    )

  const hasAirplanes = stats.airplanes.length > 0
  const hasAirlines = stats.airlines.length > 0
  const hasAirports = stats.airports.length > 0

  return (
    <PageScaffold
      title={<h1>My Stats</h1>}
      right={
        <select
          value={year || ''}
          onChange={(e) => setYear(e.target.value ? parseInt(e.target.value) : undefined)}
          style={{
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            border: 'none',
            borderRadius: 8,
            padding: '4px 8px',
          }}
        >
          <option value="">All Time</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      }
    >
      <div className="stats-row" style={{ marginTop: 8 }}>
        <StatCard icon={<Plane size={18} />} value={stats.totalFlights} label="Flights" />
        <StatCard
          icon={<MapPin size={18} />}
          value={(stats.totalDistanceKm / 1000).toFixed(1) + 'k'}
          label="Dist (km)"
        />
        <StatCard icon={<Clock size={18} />} value={Math.round(stats.totalDurationMin / 60)} label="Hours" />
      </div>

      {hasAirplanes && (
        <div className="chart-card">
          <h3>Airplanes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {stats.airplanes.map((a) => (
              <div key={a.aircraft} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{a.aircraft}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-display)', fontWeight: 700 }}>{a.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasAirlines && (
        <div className="chart-card">
          <h3>Airlines</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {stats.airlines.map((a) => (
              <div
                key={a.airline}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
              >
                <div style={{ minWidth: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-display)' }}>
                  <AirlineLabel name={a.airline} />
                </div>
                <div
                  style={{
                    flexShrink: 0,
                    fontSize: '0.85rem',
                    color: 'var(--text-display)',
                    fontWeight: 700,
                    fontFamily: 'Space Mono, monospace',
                  }}
                >
                  {a.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {flightsPerYear.length > 0 && (
        <div className="chart-card">
          <h3>Flights Per Year</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {flightsPerYear.map((entry) => (
              <div
                key={entry.year}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
              >
                <div
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: 'var(--text-display)',
                    fontFamily: 'Space Mono, monospace',
                  }}
                >
                  {entry.year}
                </div>
                <div
                  style={{
                    flexShrink: 0,
                    fontSize: '0.85rem',
                    color: 'var(--text-display)',
                    fontWeight: 700,
                    fontFamily: 'Space Mono, monospace',
                  }}
                >
                  {entry.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasAirports && (
        <div className="chart-card">
          <h3>Airports Visited</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {stats.airports.map((airport) => (
              <div
                key={airport.iata}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: 'var(--text-display)',
                      fontFamily: 'Space Mono, monospace',
                    }}
                  >
                    {airport.iata}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{airport.city}</div>
                </div>
                <div
                  style={{
                    flexShrink: 0,
                    fontSize: '0.85rem',
                    color: 'var(--text-display)',
                    fontWeight: 700,
                    fontFamily: 'Space Mono, monospace',
                  }}
                >
                  {airport.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ height: 40 }} />
    </PageScaffold>
  )
}
