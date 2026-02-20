import { useState } from 'react';
import { useFlights } from '../hooks/useFlights';
import FlightCard from '../components/FlightCard';

type FilterType = 'all' | 'past' | 'upcoming';

export default function Flights() {
  const [filter, setFilter] = useState<FilterType>('all');
  const flights = useFlights(filter);

  // Group flights by year
  const grouped = flights?.reduce((acc: Record<string, typeof flights>, f) => {
    const year = f.scheduledDepartureDate.slice(0, 4);
    if (!acc[year]) acc[year] = [];
    acc[year].push(f);
    return acc;
  }, {} as Record<string, typeof flights>) ?? {};

  const years = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="page">
      <header className="page-header">
        <h1>My Flights</h1>
      </header>

      <div className="filter-tabs">
        {(['all', 'past', 'upcoming'] as const).map(f => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {years.length > 0 ? (
        years.map(year => (
          <div key={year}>
            <div className="year-group-header">{year}</div>
            {grouped[year].map(f => (
              <FlightCard key={f.id} flight={f} />
            ))}
          </div>
        ))
      ) : (
        <div className="empty-state">
          <p>No {filter !== 'all' ? filter : ''} flights found.</p>
        </div>
      )}
    </div>
  );
}
