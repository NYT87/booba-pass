import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useFlightById, deleteFlight, saveFlight } from '../hooks/useFlights'
import { useMembershipById } from '../hooks/useMemberships'
import AirlineLabel from '../components/AirlineLabel'
import PageScaffold from '../components/PageScaffold'
import { formatDuration, flightDurationMin } from '../types'
import {
  ArrowLeft,
  Edit2,
  Trash2,
  ExternalLink,
  Download,
  Plane,
  MapPin,
  Clock,
  Camera,
  X,
  Ticket,
  Maximize2,
} from 'lucide-react'
import { useHapticFeedback } from '../hooks/useHapticFeedback'
import { exportSingleFlightToJSON } from '../utils/dataTransfer'

export default function FlightDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const flight = useFlightById(id ? parseInt(id) : undefined)
  const linkedMembership = useMembershipById(flight?.membershipId)
  const triggerHaptic = useHapticFeedback()
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showBoardingPass, setShowBoardingPass] = useState(false)

  if (!flight)
    return (
      <div className="page">
        <p>Loading...</p>
      </div>
    )

  const duration = formatDuration(flightDurationMin(flight))
  const membershipProgram = linkedMembership
    ? `${linkedMembership.airlineName}${linkedMembership.programName ? ` (${linkedMembership.programName})` : ''}`
    : null
  const hasMileage = flight.mileageGranted !== undefined
  const showMembershipSection = Boolean(membershipProgram || hasMileage)

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !flight) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string
        const currentPhotos = flight.photoDataUrls ?? []
        await saveFlight({
          ...flight,
          photoDataUrls: [...currentPhotos, base64],
        })
      }
      reader.readAsDataURL(file)
    })
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this flight?')) {
      await deleteFlight(flight.id!)
      navigate('/flights')
    }
  }

  return (
    <PageScaffold
      title={<h1>Flight Details</h1>}
      left={
        <button
          onClick={() => {
            triggerHaptic()
            navigate('/flights')
          }}
          className="btn-ghost"
        >
          <ArrowLeft size={24} />
        </button>
      }
      right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => {
              triggerHaptic()
              navigate(`/flights/${flight.id}/edit`)
            }}
            className="btn-ghost"
          >
            <Edit2 size={20} />
          </button>
          <button
            onClick={() => {
              triggerHaptic()
              exportSingleFlightToJSON(flight)
            }}
            className="btn-ghost"
          >
            <Download size={20} />
          </button>
          <button
            onClick={() => {
              triggerHaptic()
              void handleDelete()
            }}
            className="btn-ghost"
            style={{ color: 'var(--danger)' }}
          >
            <Trash2 size={20} />
          </button>
        </div>
      }
      scrollMode="body"
    >
      <div className="flight-detail-hero">
        <div className="detail-route">
          <div>
            <div className="detail-iata">{flight.departureIata}</div>
            <div className="detail-city">{flight.departureCity}</div>
          </div>
          <div className="detail-plane">
            <Plane size={32} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="detail-iata">{flight.arrivalIata}</div>
            <div className="detail-city">{flight.arrivalCity}</div>
          </div>
        </div>
        <div className="detail-meta-row">
          <span className="detail-pill">
            <AirlineLabel name={flight.airline} />
          </span>
          <span className="detail-pill">{flight.flightNumber}</span>
          <span className="detail-pill">{flight.seatClass}</span>
          {flight.seat && <span className="detail-pill">Seat {flight.seat}</span>}
        </div>
      </div>

      {flight.trackUrl && (
        <a
          href={flight.trackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            textDecoration: 'none',
            margin: '0 16px 24px',
            width: 'calc(100% - 32px)',
          }}
        >
          <ExternalLink size={18} /> Track this flight
        </a>
      )}

      <section className="form-section">
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 12 }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Departure</span>
            <span style={{ fontWeight: 600, textAlign: 'right' }}>
              {flight.scheduledDepartureDate} {flight.scheduledDepartureTime}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Arrival</span>
            <span style={{ fontWeight: 600, textAlign: 'right' }}>
              {flight.scheduledArrivalDate} {flight.scheduledArrivalTime}
            </span>
          </div>
        </div>
      </section>

      <section className="form-section">
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 12 }}>
            <span className="detail-info-label">
              <Clock size={12} style={{ marginBottom: -2, marginRight: 4 }} /> Duration
            </span>
            <span className="detail-info-value" style={{ textAlign: 'right' }}>
              {duration}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: flight.aircraft ? 8 : 0,
            }}
          >
            <span className="detail-info-label">
              <MapPin size={12} style={{ marginBottom: -2, marginRight: 4 }} /> Distance
            </span>
            <span className="detail-info-value" style={{ textAlign: 'right' }}>
              {Math.round(flight.distanceKm).toLocaleString()} km
            </span>
          </div>
          {flight.aircraft && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span className="detail-info-label">
                <Plane size={12} style={{ marginBottom: -2, marginRight: 4 }} /> Aircraft
              </span>
              <span className="detail-info-value" style={{ textAlign: 'right' }}>
                {flight.aircraft}
              </span>
            </div>
          )}
        </div>
      </section>

      {showMembershipSection && (
        <section className="form-section">
          <div className="form-section-title">Membership</div>
          <div className="card" style={{ padding: 16 }}>
            {membershipProgram && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: hasMileage ? 8 : 0,
                  gap: 12,
                }}
              >
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Program</span>
                <span style={{ fontWeight: 600, textAlign: 'right' }}>{membershipProgram}</span>
              </div>
            )}
            {hasMileage && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Mileage</span>
                <span style={{ fontWeight: 600, textAlign: 'right' }}>+{flight.mileageGranted!.toLocaleString()}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {(flight.actualDepartureTime || flight.actualArrivalTime) && (
        <section className="form-section">
          <div className="form-section-title">Actual Times</div>
          <div className="card" style={{ padding: 16, borderLeft: '4px solid var(--warning)' }}>
            {flight.actualDepartureTime && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Actual Dep.</span>
                <span style={{ fontWeight: 600 }}>{flight.actualDepartureTime}</span>
              </div>
            )}
            {flight.actualArrivalTime && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Actual Arr.</span>
                <span style={{ fontWeight: 600 }}>{flight.actualArrivalTime}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {flight.boardingPassDataUrl && (
        <section className="form-section">
          <div className="form-section-title">Boarding Pass</div>
          <button
            className="card"
            onClick={() => {
              triggerHaptic()
              setShowBoardingPass(true)
            }}
            style={{ width: '100%', padding: 16, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
          >
            <div className="membership-icon-btn" style={{ width: 44, height: 44 }}>
              <Ticket size={24} />
            </div>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>Travel Mode</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Open boarding pass for scanning</div>
            </div>
            <Maximize2 size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </section>
      )}

      <section className="form-section">
        <div
          className="form-section-title"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          Photos
          <label
            className="btn-ghost"
            style={{
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} hidden />
            <Camera size={16} /> Add
          </label>
        </div>
        <div className="photo-gallery">
          {flight.photoDataUrls &&
            flight.photoDataUrls.map((p, i) => (
              <div
                key={i}
                className="photo-item card"
                onClick={() => {
                  triggerHaptic()
                  setSelectedImage(p)
                }}
              >
                <img src={p} alt={`Flight memory ${i + 1}`} />
              </div>
            ))}
          {(!flight.photoDataUrls || flight.photoDataUrls.length === 0) && (
            <div
              className="card"
              style={{
                padding: 20,
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
              }}
            >
              No photos yet.
            </div>
          )}
        </div>
      </section>

      {flight.notes && (
        <section className="form-section">
          <div className="form-section-title">Notes</div>
          <div
            className="card"
            style={{
              padding: 16,
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
              lineHeight: 1.5,
            }}
          >
            "{flight.notes}"
          </div>
        </section>
      )}

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="lightbox-overlay"
          onClick={() => {
            triggerHaptic()
            setSelectedImage(null)
          }}
        >
          <button className="lightbox-close">
            <X size={32} />
          </button>
          <img src={selectedImage} alt="Full size" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Boarding Pass Travel Mode Modal */}
      {showBoardingPass && flight.boardingPassDataUrl && (
        <div
          className="travel-mode-overlay animate-in"
          onClick={() => {
            triggerHaptic()
            setShowBoardingPass(false)
          }}
        >
          <div className="travel-mode-content" onClick={(e) => e.stopPropagation()}>
            <header className="travel-mode-header">
              <button
                className="btn-ghost"
                onClick={() => {
                  triggerHaptic()
                  setShowBoardingPass(false)
                }}
              >
                <X size={28} />
              </button>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    opacity: 0.7,
                  }}
                >
                  Traveling to
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{flight.arrivalCity}</div>
              </div>
              <div style={{ width: 44 }} /> {/* Spacer */}
            </header>

            <div className="travel-pass-container">
              {flight.boardingPassDataUrl.startsWith('data:application/pdf') ? (
                <div className="pdf-fallback">
                  <Ticket size={64} style={{ marginBottom: 16, opacity: 0.3 }} />
                  <p>Boarding Pass (PDF)</p>
                  <a
                    href={flight.boardingPassDataUrl}
                    download={`boarding-pass-${flight.flightNumber}.pdf`}
                    className="btn-primary"
                    style={{ marginTop: 16 }}
                  >
                    Download to Open
                  </a>
                </div>
              ) : (
                <div className="boarding-pass-image-wrap">
                  <img src={flight.boardingPassDataUrl} alt="Boarding Pass" />
                </div>
              )}
            </div>

            <footer className="travel-mode-footer">
              <div className="brightness-hint">💡 Tip: Maximize your screen brightness for the airport scanner</div>
              <div className="flight-quick-info">
                <div>
                  <label>Flight</label>
                  <span>{flight.flightNumber}</span>
                </div>
                <div>
                  <label>Seat</label>
                  <span>{flight.seat || '—'}</span>
                </div>
                <div>
                  <label>Gate</label>
                  <span>Check Screens</span>
                </div>
              </div>
            </footer>
          </div>
        </div>
      )}

      <div style={{ height: 40 }} />
    </PageScaffold>
  )
}
