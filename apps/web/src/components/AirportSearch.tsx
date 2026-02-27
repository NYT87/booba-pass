import { useEffect, useRef, useState } from 'react'
import type { Airport } from '../types'

interface Props {
  label: string
  value: Airport | null
  onChange: (airport: Airport) => void
}

let airportsCache: Airport[] | null = null
async function loadAirports(): Promise<Airport[]> {
  if (airportsCache) return airportsCache
  const baseUrl = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  const res = await fetch(`${baseUrl}airports.json`)
  airportsCache = await res.json()
  return airportsCache!
}

export default function AirportSearch({ label, value, onChange }: Props) {
  const [query, setQuery] = useState(value ? `${value.iata} – ${value.city}` : '')
  const [results, setResults] = useState<Airport[]>([])
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!value) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(`${value.iata} – ${value.city}`)
  }, [value])

  async function handleInput(q: string) {
    setQuery(q)
    if (q.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    const airports = await loadAirports()
    const qU = q.toUpperCase()
    const filtered = airports
      .filter(
        (a) =>
          a.iata.startsWith(qU) ||
          a.city.toUpperCase().includes(qU) ||
          a.name.toUpperCase().includes(qU)
      )
      .slice(0, 8)
    setResults(filtered)
    setOpen(filtered.length > 0)
  }

  function select(airport: Airport) {
    onChange(airport)
    setQuery(`${airport.iata} – ${airport.city}`)
    setOpen(false)
    setResults([])
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="form-field airport-search-wrap" ref={wrapRef}>
      <label>{label}</label>
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => query.length >= 2 && setOpen(results.length > 0)}
        placeholder="Search IATA, city or airport…"
        autoComplete="off"
      />
      {open && (
        <div className="airport-dropdown">
          {results.map((a) => (
            <div key={a.iata} className="airport-option" onMouseDown={() => select(a)}>
              <span className="apt-iata">{a.iata}</span>
              <span className="apt-name">
                {a.name} — {a.city}, {a.country}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
