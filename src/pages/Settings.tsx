import { useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Upload, FileJson, FileSpreadsheet, Trash2, Info, Cpu, GitBranch } from 'lucide-react';
import { exportToJSON, exportToCSV, handleImportFile } from '../utils/dataTransfer';
import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { Moon, Sun, Monitor } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const flights = useLiveQuery(() => db.flights.toArray());
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [theme, setTheme] = useTheme();

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);
    try {
      const result = await handleImportFile(file);
      setMessage({
        type: 'success',
        text: `Import complete! ${result.success} flights upserted successfully. ${result.failed} rows skipped.`
      });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to import file. Please check format.' });
    } finally {
      setImporting(false);
      // Clear input
      e.target.value = '';
    }
  };

  const migrateTimezones = async () => {
    setImporting(true);
    setMessage(null);
    try {
      const res = await fetch('/airports.json');
      const airports: any[] = await res.json();
      const airportMap = new Map(airports.map(a => [a.iata, a.timezone]));

      const allFlights = await db.flights.toArray();
      let updatedCount = 0;

      for (const f of allFlights) {
        let changed = false;
        if (!f.departureTimeZone && airportMap.has(f.departureIata)) {
          f.departureTimeZone = airportMap.get(f.departureIata);
          changed = true;
        }
        if (!f.arrivalTimeZone && airportMap.has(f.arrivalIata)) {
          f.arrivalTimeZone = airportMap.get(f.arrivalIata);
          changed = true;
        }

        if (changed) {
          await db.flights.put(f);
          updatedCount++;
        }
      }

      setMessage({ type: 'success', text: `Successfully updated ${updatedCount} flights with timezone data.` });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to migrate timezones.' });
    } finally {
      setImporting(false);
    }
  };

  const clearData = async () => {
    if (confirm('Are you ABSOLUTELY sure? This will delete all your flight data and photos from this device.')) {
      await db.flights.clear();
      alert('Local storage cleared.');
    }
  };

  return (
    <div className="page animate-in">
      <header className="page-header">
        <button onClick={() => navigate(-1)} className="btn-ghost"><ArrowLeft size={24} /></button>
        <h1>Settings</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className="form-section">
        <div className="form-section-title">Appearance</div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                className={`class-btn ${theme === t ? 'active' : ''}`}
                onClick={() => setTheme(t)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px' }}
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
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
          Your data is stored locally in your browser. Use the tools below to backup or restore your flight history.
        </p>

        <div className="card" style={{ padding: 16 }}>
          <h4 style={{ marginBottom: 12, fontSize: '0.9rem' }}>Export Data</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn-ghost" onClick={() => flights && exportToJSON(flights)} style={{ justifyContent: 'flex-start', padding: 12, background: 'var(--bg-input)' }}>
              <FileJson size={18} style={{ marginRight: 10, color: 'var(--accent)' }} />
              <div>
                <div style={{ fontSize: '0.9rem' }}>Full Backup (JSON)</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Includes all flight details and photos.</div>
              </div>
            </button>

            <button className="btn-ghost" onClick={() => flights && exportToCSV(flights)} style={{ justifyContent: 'flex-start', padding: 12, background: 'var(--bg-input)' }}>
              <FileSpreadsheet size={18} style={{ marginRight: 10, color: '#10b981' }} />
              <div>
                <div style={{ fontSize: '0.9rem' }}>Flights Data (CSV)</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Best for Excel. Metadata only (no photos).</div>
              </div>
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: 16, marginTop: 16 }}>
          <h4 style={{ marginBottom: 12, fontSize: '0.9rem' }}>Import Data</h4>
          <label className={`btn-primary ${importing ? 'disabled' : ''}`} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <input type="file" accept=".json,.csv" onChange={onImport} disabled={importing} hidden />
            <Upload size={18} />
            {importing ? 'Importing...' : 'Restore from Backup / CSV'}
          </label>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 8, textAlign: 'center' }}>
            Smart Upsert enabled: Existing flights will be updated, new ones will be added.
          </p>
        </div>

        <div className="card" style={{ padding: 16, marginTop: 16 }}>
          <h4 style={{ marginBottom: 12, fontSize: '0.9rem' }}>Database Maintenance</h4>
          <button className="btn-ghost" onClick={migrateTimezones} disabled={importing} style={{ width: '100%', background: 'var(--bg-input)', padding: 12 }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.9rem' }}>Fix Missing Timezones</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Scans existing flights and adds missing timezone data from the airport database.</div>
            </div>
          </button>
        </div>

        {message && (
          <div className={`card animate-in`} style={{ padding: 12, marginTop: 16, border: `1px solid ${message.type === 'success' ? '#10b981' : 'var(--danger)'}`, background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ color: message.type === 'success' ? '#10b981' : 'var(--danger)', fontSize: '0.85rem' }}>
              {message.text}
            </div>
          </div>
        )}
      </div>

      <div className="form-section" style={{ marginTop: 24 }}>
        <div className="form-section-title">About booba-pass</div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 8, borderRadius: 10, background: 'rgba(37, 175, 244, 0.1)', color: 'var(--accent)' }}>
                <Info size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Version</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{__APP_VERSION__}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 8, borderRadius: 10, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <GitBranch size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Commit</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'monospace' }}>{__COMMIT_HASH__}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 8, borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                <Cpu size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Environment</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{import.meta.env.MODE}</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--bg-input)', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <strong>System:</strong> {navigator.userAgent.slice(0, 50)}...
          </div>
        </div>
      </div>

      <div className="form-section" style={{ marginTop: 24 }}>
        <div className="form-section-title" style={{ color: 'var(--danger)' }}>Danger Zone</div>
        <div className="card" style={{ padding: 16, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <button className="btn-ghost" onClick={clearData} style={{ color: 'var(--danger)', width: '100%', justifyContent: 'center' }}>
            <Trash2 size={18} style={{ marginRight: 8 }} />
            Clear All App Data
          </button>
        </div>
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}
