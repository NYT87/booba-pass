import { useState } from 'react'
import { MapContainer, TileLayer, Polyline, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useFlights } from '../hooks/useFlights'
import type { Flight } from '../types'
import { useTheme } from '../hooks/useTheme'

export default function MapView() {
  const flights = useFlights('all')
  const [theme] = useTheme()
  const [isScrolled, setIsScrolled] = useState(false)
  const validFlights =
    flights?.filter(
      (flight) =>
        Number.isFinite(flight.departureLat) &&
        Number.isFinite(flight.departureLon) &&
        Number.isFinite(flight.arrivalLat) &&
        Number.isFinite(flight.arrivalLon) &&
        Math.abs(flight.departureLat) <= 90 &&
        Math.abs(flight.arrivalLat) <= 90 &&
        Math.abs(flight.departureLon) <= 180 &&
        Math.abs(flight.arrivalLon) <= 180
    ) ?? []

  // Determine actual theme for map tiles
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

  return (
    <div
      className="page animate-in"
      onScroll={(event) => {
        setIsScrolled(event.currentTarget.scrollTop > 0)
      }}
    >
      <header className={`page-header ${isScrolled ? 'page-header-scrolled' : ''}`}>
        <h1>Flight Map</h1>
      </header>

      <div className="map-full">
        {validFlights.length > 0 ? (
          <MapContainer
            center={[20, 0]}
            zoom={2}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url={tileUrl}
            />
            {validFlights.map((f: Flight) => (
              <Polyline
                key={f.id}
                positions={[
                  [f.departureLat, f.departureLon],
                  [f.arrivalLat, f.arrivalLon],
                ]}
                pathOptions={{
                  color: 'var(--accent)',
                  weight: 2,
                  opacity: 0.6,
                  dashArray: '5, 5',
                }}
              >
                <Popup>
                  <div style={{ color: '#000' }}>
                    <strong>
                      {f.departureIata} → {f.arrivalIata}
                    </strong>
                    <br />
                    {f.airline} {f.flightNumber}
                    <br />
                    {f.scheduledDepartureDate}
                  </div>
                </Popup>
              </Polyline>
            ))}
          </MapContainer>
        ) : (
          <div
            className="card"
            style={{
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              padding: 24,
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>No mappable routes yet</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Add flights with valid airport coordinates to display them on the map.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
