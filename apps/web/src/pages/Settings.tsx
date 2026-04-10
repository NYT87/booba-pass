import { useNavigate } from 'react-router-dom'
import { db } from '../db/db'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeft,
  Upload,
  FileJson,
  FileSpreadsheet,
  Trash2,
  Info,
  Cpu,
  GitBranch,
  X,
  Clock3,
  RefreshCw,
  Download,
} from 'lucide-react'
import { exportToJSON, exportToCSV, handleImportFile } from '../utils/dataTransfer'
import { haversineKm, normalizeAircraft, type Airport } from '../types'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import PageScaffold from '../components/PageScaffold'
import { useTheme } from '../hooks/useTheme'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useHapticFeedback } from '../hooks/useHapticFeedback'
import { useRegisterSW } from 'virtual:pwa-register/react'

type AboutItemProps = {
  icon: ReactNode
  label: string
  value: ReactNode
  valueStyle?: CSSProperties
}

function AboutItem({ icon, label, value, valueStyle }: AboutItemProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: 34,
          height: 34,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          background: 'var(--surface-raised)',
          color: 'var(--text-primary)',
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{label}</div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, ...valueStyle }}>{value}</div>
      </div>
    </div>
  )
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

export default function Settings() {
  const navigate = useNavigate()
  const triggerHaptic = useHapticFeedback()
  const flights = useLiveQuery(() => db.flights.toArray())
  const memberships = useLiveQuery(() => db.memberships.toArray())
  const airlines = useLiveQuery(() => db.airlines.toArray())
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [updateMessage, setUpdateMessage] = useState<string | null>(null)
  const [availableVersion, setAvailableVersion] = useState<string | null>(null)
  const [checkingForUpdates, setCheckingForUpdates] = useState(false)
  const [theme, setTheme] = useTheme()
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    immediate: true,
  })
  const aboutItems = [
    {
      label: 'Version',
      value: __APP_VERSION__,
      icon: <Info size={18} />,
    },
    {
      label: 'Commit',
      value: __COMMIT_HASH__,
      icon: <GitBranch size={18} />,
      valueStyle: { fontFamily: 'monospace' },
    },
    {
      label: 'Environment',
      value: import.meta.env.MODE,
      icon: <Cpu size={18} />,
    },
  ] satisfies AboutItemProps[]

  const handleClickHaptics: React.MouseEventHandler<HTMLDivElement> = (event) => {
    const target = event.target as HTMLElement | null
    const clickable = target?.closest('button, a, label')
    if (!clickable) return
    if (clickable instanceof HTMLButtonElement && clickable.disabled) return
    triggerHaptic()
  }

  useEffect(() => {
    if (!needRefresh[0]) {
      setAvailableVersion(null)
      return
    }

    let cancelled = false
    const loadAvailableVersion = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL || '/'
        const url = `${baseUrl}version.json?ts=${Date.now()}`
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { version?: string }
        if (!cancelled && data.version) {
          setAvailableVersion(data.version)
        }
      } catch {
        // Ignore lookup failures and keep generic copy.
      }
    }

    void loadAvailableVersion()

    return () => {
      cancelled = true
    }
  }, [needRefresh[0]])

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setMessage(null)
    setImportResult(null)
    try {
      const result = await handleImportFile(file)
      setImportResult({
        type: 'success',
        text: `Import complete! ${result.success} items (Flights/Loyalty) upserted successfully. ${result.failed} rows skipped.`,
      })
    } catch (err) {
      console.error(err)
      setImportResult({ type: 'error', text: 'Failed to import file. Please check format.' })
    } finally {
      setImporting(false)
      // Clear input
      e.target.value = ''
    }
  }

  const migrateTimezones = async () => {
    setImporting(true)
    setMessage(null)
    try {
      const baseUrl = import.meta.env.BASE_URL || '/'
      const res = await fetch(`${baseUrl}data/airports.json`)
      if (!res.ok) {
        throw new Error(`Airport database request failed (${res.status} ${res.statusText})`)
      }

      const airports: Airport[] = await res.json()
      const airportMap = new Map(airports.map((airport) => [airport.iata, airport]))

      const allFlights = await db.flights.toArray()
      let timezoneUpdatedCount = 0
      let distanceUpdatedCount = 0
      let seatClassUpdatedCount = 0
      let airlineUpdatedCount = 0
      let aircraftUpdatedCount = 0

      for (const f of allFlights) {
        let changed = false
        const departureAirport = airportMap.get(f.departureIata)
        const arrivalAirport = airportMap.get(f.arrivalIata)

        if (!f.departureTimeZone && departureAirport?.timezone) {
          f.departureTimeZone = departureAirport.timezone
          changed = true
          timezoneUpdatedCount++
        }

        if (!f.arrivalTimeZone && arrivalAirport?.timezone) {
          f.arrivalTimeZone = arrivalAirport.timezone
          changed = true
          timezoneUpdatedCount++
        }

        if (!f.distanceKm || f.distanceKm <= 0) {
          const departureLat = Number.isFinite(f.departureLat) ? f.departureLat : departureAirport?.lat
          const departureLon = Number.isFinite(f.departureLon) ? f.departureLon : departureAirport?.lon
          const arrivalLat = Number.isFinite(f.arrivalLat) ? f.arrivalLat : arrivalAirport?.lat
          const arrivalLon = Number.isFinite(f.arrivalLon) ? f.arrivalLon : arrivalAirport?.lon

          if (
            departureLat !== undefined &&
            departureLon !== undefined &&
            arrivalLat !== undefined &&
            arrivalLon !== undefined
          ) {
            f.distanceKm = haversineKm(departureLat, departureLon, arrivalLat, arrivalLon)
            changed = true
            distanceUpdatedCount++
          }
        }

        if (f.seatClass !== 'Economy' && f.seatClass !== 'Business' && f.seatClass !== 'First') {
          f.seatClass = 'Economy'
          changed = true
          seatClassUpdatedCount++
        }

        const normalizedAirline = f.airline.trim().toUpperCase()
        if (normalizedAirline && normalizedAirline !== f.airline) {
          f.airline = normalizedAirline
          changed = true
          airlineUpdatedCount++
        }

        if (f.aircraft) {
          const normalizedAircraft = normalizeAircraft(f.aircraft)
          if (normalizedAircraft && normalizedAircraft !== f.aircraft) {
            f.aircraft = normalizedAircraft
            changed = true
            aircraftUpdatedCount++
          }
        }

        if (changed) {
          await db.flights.put(f)
        }
      }

      setMessage({
        type: 'success',
        text: `Updated ${timezoneUpdatedCount} timezone fields, ${distanceUpdatedCount} flight distances, ${seatClassUpdatedCount} seat classes, ${airlineUpdatedCount} airline names, and ${aircraftUpdatedCount} aircraft names.`,
      })
    } catch (err) {
      console.error(err)
      setMessage({
        type: 'error',
        text: `Failed to migrate timezones: ${getErrorMessage(err)}`,
      })
    } finally {
      setImporting(false)
    }
  }

  const clearData = async () => {
    if (
      confirm('Are you ABSOLUTELY sure? This will delete all your flights, memberships, and photos from this device.')
    ) {
      await Promise.all([db.flights.clear(), db.memberships.clear()])
      alert('Local storage cleared.')
    }
  }

  const checkForUpdates = async () => {
    setCheckingForUpdates(true)
    setUpdateMessage(null)
    try {
      if (!('serviceWorker' in navigator)) {
        setUpdateMessage('Updates are not supported in this browser.')
        return
      }

      if (!navigator.onLine) {
        setUpdateMessage('Go online to check for updates.')
        return
      }

      const scopeUrl = new URL(import.meta.env.BASE_URL || '/', window.location.origin).href
      const registration =
        (await navigator.serviceWorker.getRegistration(scopeUrl)) ?? (await navigator.serviceWorker.getRegistration())

      if (!registration) {
        setUpdateMessage('Service worker not installed on this device yet.')
        return
      }

      await registration.update()

      if (registration.waiting) {
        setUpdateMessage('Update ready to install.')
      } else {
        setUpdateMessage('No update available right now.')
      }
    } catch (error) {
      console.error(error)
      setUpdateMessage('Could not check for updates in this browser session.')
    } finally {
      setCheckingForUpdates(false)
    }
  }

  return (
    <PageScaffold
      title={<h1>Settings</h1>}
      left={
        <button onClick={() => navigate(-1)} className="btn-ghost">
          <ArrowLeft size={24} />
        </button>
      }
      contentProps={{ onClickCapture: handleClickHaptics }}
    >
      <div className="form-section">
        <div className="form-section-title">Appearance</div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                className={`class-btn ${theme === t ? 'active' : ''}`}
                onClick={() => setTheme(t)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 8px',
                }}
              >
                {t === 'light' && <Sun size={18} />}
                {t === 'dark' && <Moon size={18} />}
                {t === 'system' && <Monitor size={18} />}
                <span style={{ fontSize: '0.7rem' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="form-section" style={{ marginTop: 24 }}>
        <div className="form-section-title">Data & Privacy</div>
        <p className="settings-section-copy">
          Your data is stored locally in your browser. Use the tools below to backup or restore your flight history.
        </p>

        <div className="card" style={{ padding: 16 }}>
          <h4 style={{ marginBottom: 12, fontSize: '0.9rem' }}>Export Data</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn-ghost"
              onClick={() => flights && memberships && airlines && exportToJSON(flights, memberships, airlines)}
              style={{
                justifyContent: 'flex-start',
                padding: 12,
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
              }}
            >
              <FileJson size={18} style={{ marginRight: 10, color: 'var(--accent)' }} />
              <div className="settings-action-copy">
                <div className="settings-action-title">Full Backup (JSON)</div>
                <div className="settings-action-description">Includes flights, boarding passes, and loyalty cards.</div>
              </div>
            </button>

            <button
              className="btn-ghost"
              onClick={() => flights && exportToCSV(flights)}
              style={{
                justifyContent: 'flex-start',
                padding: 12,
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
              }}
            >
              <FileSpreadsheet size={18} style={{ marginRight: 10, color: 'var(--text-primary)' }} />
              <div className="settings-action-copy">
                <div className="settings-action-title">Flights Data (CSV)</div>
                <div className="settings-action-description">Best for Excel. Metadata only (no photos).</div>
              </div>
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: 16, marginTop: 16 }}>
          <h4 style={{ marginBottom: 12, fontSize: '0.9rem' }}>Import Data</h4>
          <label
            className={`btn-primary ${importing ? 'disabled' : ''}`}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <input type="file" accept=".json,.csv" onChange={onImport} disabled={importing} hidden />
            <Upload size={18} />
            {importing ? 'Importing...' : 'Restore from Backup / CSV'}
          </label>
          <p
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              marginTop: 8,
              textAlign: 'center',
            }}
          >
            Smart Upsert enabled: Existing flights will be updated, new ones will be added.
          </p>
        </div>

        <div className="card" style={{ padding: 16, marginTop: 16 }}>
          <h4 style={{ marginBottom: 12, fontSize: '0.9rem' }}>Database Maintenance</h4>
          <button
            className="btn-ghost"
            onClick={migrateTimezones}
            disabled={importing}
            style={{
              width: '100%',
              padding: 12,
              justifyContent: 'flex-start',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
            }}
          >
            <Clock3 size={18} style={{ marginRight: 10, color: 'var(--text-primary)' }} />
            <div className="settings-action-copy">
              <div className="settings-action-title">Repair Flight Data</div>
              <div className="settings-action-description">
                Backfills timezones and distances, and normalizes seat class, airline, and aircraft names.
              </div>
            </div>
          </button>
        </div>

        {message && (
          <div
            className={`card animate-in`}
            style={{
              padding: 12,
              marginTop: 16,
              border: `1px solid ${message.type === 'success' ? 'var(--text-primary)' : 'var(--danger)'}`,
              background: 'rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                color: message.type === 'success' ? 'var(--text-primary)' : 'var(--danger)',
                fontSize: '0.85rem',
              }}
            >
              {message.text}
            </div>
          </div>
        )}
      </div>

      <div className="form-section" style={{ marginTop: 24 }}>
        <div className="form-section-title">About booba-pass</div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {aboutItems.map((item) => (
              <AboutItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                value={item.value}
                valueStyle={item.valueStyle}
              />
            ))}
          </div>

          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid var(--bg-input)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}
          >
            <strong>System:</strong> {navigator.userAgent.slice(0, 50)}...
          </div>

          <div className="settings-update-actions">
            <button className="btn-ghost" type="button" onClick={() => void checkForUpdates()}>
              <RefreshCw size={16} />
              {checkingForUpdates ? 'Checking...' : 'Check for updates'}
            </button>
            {needRefresh[0] && (
              <button
                className="btn-primary"
                type="button"
                onClick={() => {
                  setUpdateMessage(null)
                  void updateServiceWorker(true)
                }}
              >
                <Download size={16} />
                {availableVersion ? `Update to v${availableVersion}` : 'Update app'}
              </button>
            )}
          </div>
          {updateMessage && <p className="settings-update-status">{updateMessage}</p>}
        </div>
      </div>

      <div className="form-section" style={{ marginTop: 24 }}>
        <div className="form-section-title" style={{ color: 'var(--danger)' }}>
          Danger Zone
        </div>
        <div className="card" style={{ padding: 16, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <button
            className="btn-ghost"
            onClick={clearData}
            style={{ color: 'var(--danger)', width: '100%', justifyContent: 'center' }}
          >
            <Trash2 size={18} style={{ marginRight: 8 }} />
            Clear All App Data
          </button>
        </div>
      </div>

      <div style={{ height: 40 }} />

      {importResult && (
        <div className="settings-modal-overlay" onClick={() => setImportResult(null)}>
          <div
            className="settings-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-result-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="settings-modal-close"
              type="button"
              onClick={() => setImportResult(null)}
              aria-label="Close import result"
            >
              <X size={18} />
            </button>
            <h3 id="import-result-title" className="settings-modal-title">
              {importResult.type === 'success' ? 'Import completed' : 'Import failed'}
            </h3>
            <p
              className={`settings-modal-text ${
                importResult.type === 'success' ? 'settings-modal-text-success' : 'settings-modal-text-error'
              }`}
            >
              {importResult.text}
            </p>
            <button className="btn-primary" type="button" onClick={() => setImportResult(null)}>
              OK
            </button>
          </div>
        </div>
      )}
    </PageScaffold>
  )
}
