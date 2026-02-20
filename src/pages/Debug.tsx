import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cpu, GitBranch, Info } from 'lucide-react';

export default function Debug() {
  const navigate = useNavigate();

  return (
    <div className="page animate-in">
      <header className="page-header">
        <button onClick={() => navigate(-1)} className="btn-ghost"><ArrowLeft size={24} /></button>
        <h1>Debug Info</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className="form-section">
        <div className="form-section-title">Application Status</div>

        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 10, borderRadius: 12, background: 'rgba(37, 175, 244, 0.1)', color: 'var(--accent)' }}>
              <Info size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Version</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{__APP_VERSION__}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 10, borderRadius: 12, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <GitBranch size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Commit Hash</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: 'monospace' }}>{__COMMIT_HASH__}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 10, borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
              <Cpu size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Environment</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{import.meta.env.MODE}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">System Information</div>
        <div className="card" style={{ padding: 16, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <div><strong>User Agent:</strong> {navigator.userAgent}</div>
          <div style={{ marginTop: 8 }}><strong>Language:</strong> {navigator.language}</div>
          <div style={{ marginTop: 8 }}><strong>Platform:</strong> {(navigator as any).platform}</div>
        </div>
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}
