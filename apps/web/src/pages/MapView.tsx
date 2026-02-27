import { MapContainer, TileLayer, Polyline, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useFlights } from '../hooks/useFlights'
import type { Flight } from '../types'
import { useTheme } from '../hooks/useTheme'

export default function MapView() {
  const flights = useFlights('all')
  const [theme] = useTheme()

  // Determine actual theme for map tiles
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

  return (
    <div className="page animate-in">
      <header className="page-header">
        <h1>Flight Map</h1>
      </header>

      <div className="map-full">
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
          {flights?.map((f: Flight) => (
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
      </div>
    </div>
  )
}
