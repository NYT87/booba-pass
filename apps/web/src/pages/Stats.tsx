import { useState } from 'react'
import { useFlights, useStats } from '../hooks/useFlights'
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import StatCard from '../components/StatCard'
import AirlineLabel from '../components/AirlineLabel'
import { Plane, MapPin, Clock } from 'lucide-react'

const COLORS = ['#25aff4', '#a78bfa', '#f59e0b', '#ef4444', '#10b981']

export default function Stats() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [year, setYear] = useState<number | undefined>(undefined)
  const stats = useStats(year)
  const allFlights = useFlights('all')
  const years = Array.from(
    new Set((allFlights ?? []).map((flight) => Number.parseInt(flight.scheduledDepartureDate.slice(0, 4), 10)))
  )
    .filter((flightYear) => Number.isFinite(flightYear))
    .sort((a, b) => b - a)

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
    <div
      className="page animate-in"
      onScroll={(event) => {
        setIsScrolled(event.currentTarget.scrollTop > 0)
      }}
    >
      <header className={`page-header ${isScrolled ? 'page-header-scrolled' : ''}`}>
        <h1>My Stats</h1>
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
      </header>

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
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
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.airlines}
                  dataKey="count"
                  nameKey="airline"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                >
                  {stats.airlines.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    boxShadow: 'var(--shadow-card)',
                    opacity: 1,
                  }}
                  itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 10,
              justifyContent: 'center',
            }}
          >
            {stats.airlines.slice(0, 5).map((a, i) => (
              <div key={a.airline} style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: COLORS[i % COLORS.length],
                  }}
                />
                <span style={{ color: 'var(--text-secondary)', maxWidth: 120 }}>
                  <AirlineLabel name={a.airline} />
                </span>
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
    </div>
  )
}
