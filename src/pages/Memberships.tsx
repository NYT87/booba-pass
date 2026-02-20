import { useNavigate } from 'react-router-dom';
import { useMemberships, deleteMembership } from '../hooks/useMemberships';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';

export default function Memberships() {
  const navigate = useNavigate();
  const memberships = useMemberships() || [];

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm('Delete this membership?')) {
      await deleteMembership(id);
    }
  };

  return (
    <div className="page animate-in">
      <header className="page-header">
        <h1>Memberships</h1>
        <button className="btn-ghost" onClick={() => navigate('/memberships/new')}>
          <Plus size={24} />
        </button>
      </header>

      <div className="memberships-list">
        {memberships.length > 0 ? (
          memberships.map((m) => (
            <div
              key={m.id}
              className="card membership-card"
              onClick={() => navigate(`/memberships/${m.id}/edit`)}
              style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}
            >
              <div className="membership-header" style={{
                padding: '16px 16px 8px 16px',
                background: 'rgba(37, 175, 244, 0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div>
                  <div className="airline-name" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{m.airlineName}</div>
                  <div className="program-name" style={{ fontSize: '0.8rem', opacity: 0.7 }}>{m.programName}</div>
                </div>
                <button
                  className="btn-ghost"
                  onClick={(e) => handleDelete(e, m.id!)}
                  style={{ color: 'var(--danger)', padding: 4 }}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="membership-body" style={{ padding: 16 }}>
                <div className="member-info" style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.5 }}>Member</div>
                  <div style={{ fontWeight: 600 }}>{m.memberName}</div>
                  <div style={{ fontSize: '0.9rem', marginTop: 4, letterSpacing: 1 }}>{m.membershipNumber}</div>
                </div>

                {m.codeValue && (
                  <div className="code-display" style={{
                    background: 'white',
                    padding: 12,
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: 100
                  }}>
                    {m.codeType === 'QR' ? (
                      <QRCodeSVG value={m.codeValue} size={128} />
                    ) : m.codeType === 'BARCODE' ? (
                      <Barcode value={m.codeValue} width={1.5} height={50} displayValue={false} background="white" />
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon"><CreditCard size={48} /></div>
            <p>No memberships added yet.<br />Keep all your loyalty codes in one place!</p>
            <button className="btn-primary" onClick={() => navigate('/memberships/new')} style={{ marginTop: 16 }}>
              Add Your First Membership
            </button>
          </div>
        )}
      </div>
      <div style={{ height: 80 }} />
    </div>
  );
}
