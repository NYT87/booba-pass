import { useState } from 'react';
import { useStats } from '../hooks/useFlights';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StatCard from '../components/StatCard';
import { Plane, MapPin, Clock } from 'lucide-react';

const COLORS = ['#25aff4', '#a78bfa', '#f59e0b', '#ef4444', '#10b981'];

export default function Stats() {
  const [year, setYear] = useState<number | undefined>(new Date().getFullYear());
  const stats = useStats(year);

  // Get list of years from now down to 2000
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1999 }, (_, i) => currentYear - i);

  if (!stats) return <div className="page"><p>Loading stats...</p></div>;

  return (
    <div className="page animate-in">
      <header className="page-header">
        <h1>My Stats</h1>
        <select
          value={year || ''}
          onChange={e => setYear(e.target.value ? parseInt(e.target.value) : undefined)}
          style={{ background: 'var(--bg-input)', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 8px' }}
        >
          <option value="">All Time</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </header>

      <div className="stats-row" style={{ marginTop: 8 }}>
        <StatCard icon={<Plane size={18} />} value={stats.totalFlights} label="Flights" />
        <StatCard icon={<MapPin size={18} />} value={(stats.totalDistanceKm / 1000).toFixed(1) + 'k'} label="Dist (k)" />
        <StatCard icon={<Clock size={18} />} value={Math.round(stats.totalDurationMin / 60)} label="Hours" />
      </div>

      <div className="chart-card">
        <h3>Monthly Activity</h3>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.flightsByMonth}>
              <XAxis dataKey="month" hide />
              <Tooltip
                contentStyle={{ background: '#1a2236', border: '1px solid #374151', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', opacity: 1 }}
                itemStyle={{ color: 'var(--accent)', fontWeight: 600 }}
                labelStyle={{ color: 'var(--text-secondary)' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="count" fill="#25aff4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <h3>Top Routes</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stats.topRoutes.map((r, i) => (
            <div key={r.route} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 80, fontSize: '0.8rem', fontWeight: 600 }}>{r.route}</div>
              <div style={{ flex: 1, height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(r.count / stats.topRoutes[0].count) * 100}%`, height: '100%', background: COLORS[i % COLORS.length] }} />
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-card">
        <h3>Airlines</h3>
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
                contentStyle={{ background: '#1a2236', border: '1px solid #374151', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', opacity: 1 }}
                itemStyle={{ color: '#fff', fontWeight: 600 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, justifyContent: 'center' }}>
          {stats.airlines.slice(0, 5).map((a, i) => (
            <div key={a.airline} style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
              <span style={{ color: 'var(--text-secondary)' }}>{a.airline}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}
