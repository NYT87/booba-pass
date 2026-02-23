import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useFlightById, saveFlight, useStats } from '../hooks/useFlights'
import { useMemberships } from '../hooks/useMemberships'
import AirportSearch from '../components/AirportSearch'
import type { Airport, Flight } from '../types'
import { haversineKm, computeDurationMin, formatDuration } from '../types'
import { ArrowLeftRight, Save, X, Camera, Trash2, Ticket } from 'lucide-react'

export default function AddEditFlight() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const existingFlight = useFlightById(id ? parseInt(id) : undefined)
  const memberships = useMemberships() || []
  const stats = useStats() // Get stats for all time for suggestions
  const prefilledMembershipId =
    typeof (location.state as { membershipId?: unknown } | null)?.membershipId === 'number'
      ? ((location.state as { membershipId: number }).membershipId ?? null)
      : null

  const [departure, setDeparture] = useState<Airport | null>(null)
  const [arrival, setArrival] = useState<Airport | null>(null)

  const [scheduledDepartureDate, setScheduledDepartureDate] = useState('')
  const [scheduledDepartureTime, setScheduledDepartureTime] = useState('')
  const [scheduledArrivalDate, setScheduledArrivalDate] = useState('')
  const [scheduledArrivalTime, setScheduledArrivalTime] = useState('')

  const [actualDepartureDate, setActualDepartureDate] = useState('')
  const [actualDepartureTime, setActualDepartureTime] = useState('')
  const [actualArrivalDate, setActualArrivalDate] = useState('')
  const [actualArrivalTime, setActualArrivalTime] = useState('')

  const [airline, setAirline] = useState('')
  const [flightNumber, setFlightNumber] = useState('')
  const [seatClass, setSeatClass] = useState<Flight['seatClass']>('Economy')
  const [seat, setSeat] = useState('')
  const [aircraft, setAircraft] = useState('')
  const [notes, setNotes] = useState('')
  const [trackUrl, setTrackUrl] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [boardingPass, setBoardingPass] = useState<string | undefined>(undefined)
  const [membershipId, setMembershipId] = useState<number | ''>('')
  const [mileageGranted, setMileageGranted] = useState('')

  useEffect(() => {
    if (existingFlight) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDeparture({
        iata: existingFlight.departureIata,
        name: existingFlight.departureCity, // approximation for loading back
        city: existingFlight.departureCity,
        country: '',
        lat: existingFlight.departureLat,
        lon: existingFlight.departureLon,
        timezone: existingFlight.departureTimeZone,
      })
      setArrival({
        iata: existingFlight.arrivalIata,
        name: existingFlight.arrivalCity,
        city: existingFlight.arrivalCity,
        country: '',
        lat: existingFlight.arrivalLat,
        lon: existingFlight.arrivalLon,
        timezone: existingFlight.arrivalTimeZone,
      })
      setScheduledDepartureDate(existingFlight.scheduledDepartureDate)
      setScheduledDepartureTime(existingFlight.scheduledDepartureTime)
      setScheduledArrivalDate(existingFlight.scheduledArrivalDate)
      setScheduledArrivalTime(existingFlight.scheduledArrivalTime)

      setActualDepartureDate(existingFlight.actualDepartureDate ?? '')
      setActualDepartureTime(existingFlight.actualDepartureTime ?? '')
      setActualArrivalDate(existingFlight.actualArrivalDate ?? '')
      setActualArrivalTime(existingFlight.actualArrivalTime ?? '')

      setAirline(existingFlight.airline)
      setFlightNumber(existingFlight.flightNumber)
      setSeatClass(existingFlight.seatClass)
      setSeat(existingFlight.seat ?? '')
      setAircraft(existingFlight.aircraft ?? '')
      setNotes(existingFlight.notes ?? '')
      setTrackUrl(existingFlight.trackUrl ?? '')
      setPhotos(existingFlight.photoDataUrls ?? [])
      setBoardingPass(existingFlight.boardingPassDataUrl)
      setMembershipId(existingFlight.membershipId ?? '')
      setMileageGranted(
        existingFlight.mileageGranted !== undefined ? String(existingFlight.mileageGranted) : ''
      )
    } else {
      const now = new Date()
      const today = now.toISOString().slice(0, 10)
      setScheduledDepartureDate(today)
      setScheduledArrivalDate(today)
      setMembershipId(prefilledMembershipId ?? '')
      setMileageGranted('')
    }
  }, [existingFlight, prefilledMembershipId])

  const handleScheduledDepartureDateChange = (val: string) => {
    const oldDepDate = scheduledDepartureDate
    setScheduledDepartureDate(val)
    // If arrival was same as old departure, or arrival is now earlier than departure, move arrival to same day
    if (scheduledArrivalDate === oldDepDate || scheduledArrivalDate < val) {
      setScheduledArrivalDate(val)
    }
  }

  const handleSave = async () => {
    if (
      !departure ||
      !arrival ||
      !scheduledDepartureDate ||
      !scheduledDepartureTime ||
      !airline ||
      !flightNumber
    ) {
      alert('Please fill in required fields (Airports, Date/Time, Airline, Flight Number)')
      return
    }

    // Validation for arrival vs departure chronological order
    const depDateTime = `${scheduledDepartureDate}T${scheduledDepartureTime}`
    const arrDateTime = `${scheduledArrivalDate}T${scheduledArrivalTime}`
    if (arrDateTime <= depDateTime) {
      alert('Arrival must be later than departure. Please check dates and times.')
      return
    }

    const distanceKm = haversineKm(departure.lat, departure.lon, arrival.lat, arrival.lon)
    const parsedMileage = mileageGranted.trim()
      ? Number.parseInt(mileageGranted.trim(), 10)
      : undefined

    if (mileageGranted.trim() && Number.isNaN(parsedMileage)) {
      alert('Mileage granted must be a valid number.')
      return
    }

    const flightData: Omit<Flight, 'id'> = {
      departureIata: departure.iata,
      arrivalIata: arrival.iata,
      departureCity: departure.city,
      arrivalCity: arrival.city,
      departureLat: departure.lat,
      departureLon: departure.lon,
      arrivalLat: arrival.lat,
      arrivalLon: arrival.lon,
      scheduledDepartureDate,
      scheduledDepartureTime,
      scheduledArrivalDate,
      scheduledArrivalTime,
      actualDepartureDate: actualDepartureDate || undefined,
      actualDepartureTime: actualDepartureTime || undefined,
      actualArrivalDate: actualArrivalDate || undefined,
      actualArrivalTime: actualArrivalTime || undefined,
      departureTimeZone: departure.timezone,
      arrivalTimeZone: arrival.timezone,
      airline,
      flightNumber: flightNumber.toUpperCase(),
      seatClass,
      seat: seat || undefined,
      aircraft: aircraft || undefined,
      notes: notes || undefined,
      trackUrl: trackUrl || undefined,
      photoDataUrls: photos.length > 0 ? photos : undefined,
      boardingPassDataUrl: boardingPass,
      distanceKm,
      membershipId: membershipId === '' ? undefined : membershipId,
      mileageGranted: parsedMileage,
    }

    const savedId = await saveFlight(id ? { ...flightData, id: parseInt(id) } : flightData)
    navigate(`/flights/${savedId}`)
  }

  const swapAirports = () => {
    const temp = departure
    setDeparture(arrival)
    setArrival(temp)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotos((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleBoardingPassUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setBoardingPass(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="page animate-in">
      <header className="page-header">
        <button onClick={() => navigate(id ? `/flights/${id}` : '/flights')} className="btn-ghost">
          <X size={24} />
        </button>
        <h1>{id ? 'Edit Flight' : 'Add Flight'}</h1>
        <button onClick={handleSave} className="btn-ghost" style={{ color: 'var(--accent)' }}>
          <Save size={24} />
        </button>
      </header>

      <div className="form-section">
        <div className="form-section-title">Route</div>
        <div className="form-row" style={{ alignItems: 'flex-start' }}>
          <AirportSearch label="Departure" value={departure} onChange={setDeparture} />
          <button className="swap-btn" onClick={swapAirports}>
            <ArrowLeftRight size={18} />
          </button>
          <AirportSearch label="Arrival" value={arrival} onChange={setArrival} />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Schedule</div>
        <div className="form-row">
          <div className="form-field">
            <label>Departure Date</label>
            <input
              type="date"
              value={scheduledDepartureDate}
              onChange={(e) => handleScheduledDepartureDateChange(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Time</label>
            <input
              type="time"
              value={scheduledDepartureTime}
              onChange={(e) => setScheduledDepartureTime(e.target.value)}
            />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 10 }}>
          <div className="form-field">
            <label>Arrival Date</label>
            <input
              type="date"
              value={scheduledArrivalDate}
              onChange={(e) => setScheduledArrivalDate(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Time</label>
            <input
              type="time"
              value={scheduledArrivalTime}
              onChange={(e) => setScheduledArrivalTime(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Real Times (Optional)</div>
        <div className="form-row">
          <div className="form-field">
            <label>Actual Dep. Date</label>
            <input
              type="date"
              value={actualDepartureDate}
              onChange={(e) => setActualDepartureDate(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Time</label>
            <input
              type="time"
              value={actualDepartureTime}
              onChange={(e) => setActualDepartureTime(e.target.value)}
            />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 10 }}>
          <div className="form-field">
            <label>Actual Arr. Date</label>
            <input
              type="date"
              value={actualArrivalDate}
              onChange={(e) => setActualArrivalDate(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Time</label>
            <input
              type="time"
              value={actualArrivalTime}
              onChange={(e) => setActualArrivalTime(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Flight Details</div>
        <div className="form-row">
          <div className="form-field">
            <label>Airline</label>
            <input
              type="text"
              list="airline-list"
              value={airline}
              onChange={(e) => setAirline(e.target.value.toUpperCase())}
              placeholder="e.g. Korean Air"
            />
            <datalist id="airline-list">
              {stats?.airlines.map((a) => (
                <option key={a.airline} value={a.airline} />
              ))}
            </datalist>
          </div>
          <div className="form-field">
            <label>Flight #</label>
            <input
              type="text"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
              placeholder="e.g. KE709"
            />
          </div>
        </div>

        <div className="form-field" style={{ marginTop: 12 }}>
          <label>Class</label>
          <div className="class-selector">
            {(['Economy', 'Business', 'First'] as const).map((c) => (
              <button
                key={c}
                className={`class-btn ${seatClass === c ? 'active' : ''}`}
                onClick={() => setSeatClass(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row" style={{ marginTop: 12 }}>
          <div className="form-field">
            <label>Seat</label>
            <input
              type="text"
              value={seat}
              onChange={(e) => setSeat(e.target.value.toUpperCase())}
              placeholder="e.g. 12A"
            />
          </div>
          <div className="form-field">
            <label>Aircraft</label>
            <input
              type="text"
              list="aircraft-list"
              value={aircraft}
              onChange={(e) => setAircraft(e.target.value.toUpperCase())}
              placeholder="e.g. A350-900"
            />
            <datalist id="aircraft-list">
              {stats?.airplanes.map((a) => (
                <option key={a.aircraft} value={a.aircraft} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Other</div>
        <div className="form-row">
          <div className="form-field">
            <label>Loyalty Membership (Optional)</label>
            <select
              value={membershipId}
              onChange={(e) =>
                setMembershipId(e.target.value ? Number.parseInt(e.target.value, 10) : '')
              }
            >
              <option value="">None</option>
              {memberships.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.airlineName}
                  {m.programName ? ` - ${m.programName}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Mileage Granted (Optional)</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={mileageGranted}
              onChange={(e) => setMileageGranted(e.target.value)}
              placeholder="e.g. 2286"
            />
          </div>
        </div>
        <div className="form-field">
          <label>Track URL</label>
          <input
            type="url"
            value={trackUrl}
            onChange={(e) => setTrackUrl(e.target.value)}
            placeholder="FlightRadar24 / FlightAware link"
          />
        </div>
        <div className="form-field" style={{ marginTop: 12 }}>
          <label>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any memories from the flight?"
          />
        </div>
      </div>

      {departure &&
        arrival &&
        scheduledDepartureDate &&
        scheduledDepartureTime &&
        scheduledArrivalDate &&
        scheduledArrivalTime && (
          <div className="form-section">
            <div
              className="card"
              style={{
                padding: 16,
                textAlign: 'center',
                background: 'rgba(37, 175, 244, 0.1)',
                border: '1px solid rgba(37, 175, 244, 0.2)',
              }}
            >
              <div style={{ color: 'var(--accent)', fontSize: '0.8rem', marginBottom: 4 }}>
                Calculated Duration
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                {formatDuration(
                  computeDurationMin(
                    actualDepartureDate || scheduledDepartureDate,
                    actualDepartureTime || scheduledDepartureTime,
                    actualArrivalDate || scheduledArrivalDate,
                    actualArrivalTime || scheduledArrivalTime,
                    departure.timezone,
                    arrival.timezone
                  )
                )}
              </div>
              {departure.timezone && arrival.timezone ? (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Timezone aware: {departure.iata} ({departure.timezone}) → {arrival.iata} (
                  {arrival.timezone})
                </div>
              ) : (
                <div style={{ fontSize: '0.7rem', color: 'var(--warning)', marginTop: 4 }}>
                  Falling back to local browser timezone (missing airport TZ data)
                </div>
              )}
            </div>
          </div>
        )}

      <div className="form-section">
        <div className="form-section-title">Boarding Pass</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleBoardingPassUpload}
              hidden
            />
            <Ticket size={18} />
            <span>Add Boarding Pass</span>
          </label>
          <p
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              textAlign: 'center',
              fontStyle: 'italic',
            }}
          >
            Note: This purely stores the image/PDF for quick access. It does not auto-fill flight
            details (yet!).
          </p>
        </div>
        {boardingPass && (
          <div
            className="card"
            style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <div
              className="boarding-pass-preview"
              style={{
                width: 60,
                height: 60,
                borderRadius: 8,
                overflow: 'hidden',
                background: 'var(--bg-input)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {boardingPass.startsWith('data:application/pdf') ? (
                <Ticket size={24} style={{ opacity: 0.5 }} />
              ) : (
                <img
                  src={boardingPass}
                  alt="Boarding Pass"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Boarding Pass Attached</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Ready for your trip
              </div>
            </div>
            <button
              className="btn-ghost"
              style={{ color: 'var(--danger)' }}
              onClick={() => setBoardingPass(undefined)}
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="form-section">
        <div className="form-section-title">Photos</div>
        <div className="photo-upload-grid">
          {photos.map((p, i) => (
            <div key={i} className="photo-preview-item card">
              <img src={p} alt="Flight" />
              <button className="photo-remove-btn" onClick={() => removePhoto(i)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <label className="photo-add-btn card">
            <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} hidden />
            <Camera size={24} />
            <span>Add Photos</span>
          </label>
        </div>
      </div>

      <button className="btn-primary" onClick={handleSave}>
        {id ? 'Update Flight' : 'Save Flight'}
      </button>

      <div style={{ height: 40 }} />
    </div>
  )
}
