import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMemberships, deleteMembership } from '../hooks/useMemberships'
import { Copy, CreditCard, Pencil, Plus, QrCode, Trash2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import Barcode from 'react-barcode'

export default function Memberships() {
  const navigate = useNavigate()
  const memberships = useMemberships() || []
  const [visibleCodeId, setVisibleCodeId] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    if (confirm('Delete this membership?')) {
      await deleteMembership(id)
    }
  }

  const handleCopyMembershipNumber = async (id: number, membershipNumber: string) => {
    try {
      await navigator.clipboard.writeText(membershipNumber)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      alert('Could not copy membership number')
    }
  }

  const toggleCode = (membershipId: number) => {
    setVisibleCodeId((currentId) => (currentId === membershipId ? null : membershipId))
  }

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
              style={{ padding: 0, marginBottom: 16 }}
            >
              <div
                className="membership-header"
                style={{
                  padding: '16px 16px 8px 16px',
                  background: 'rgba(37, 175, 244, 0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div className="airline-name" style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    {m.airlineName}
                  </div>
                  {m.programName && (
                    <div className="program-name" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      {m.programName}
                    </div>
                  )}
                  {m.allianceGroup && (
                    <div style={{ marginTop: 6 }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: 9999,
                          border: '1px solid var(--border)',
                          background: 'var(--bg-card)',
                        }}
                      >
                        {m.allianceGroup}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="membership-body" style={{ padding: 16 }}>
                <div className="member-info" style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.5 }}>
                    Member
                  </div>
                  <div style={{ fontWeight: 600 }}>{m.memberName}</div>
                  <div
                    style={{
                      fontSize: '0.9rem',
                      marginTop: 4,
                      letterSpacing: 1,
                      wordBreak: 'break-all',
                    }}
                  >
                    {m.membershipNumber}
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <button
                    className="btn-ghost"
                    onClick={() => navigate(`/memberships/${m.id}/edit`)}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 9999,
                      padding: '8px 12px',
                    }}
                  >
                    <Pencil size={14} style={{ marginRight: 6 }} />
                    Edit
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => void handleCopyMembershipNumber(m.id!, m.membershipNumber)}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 9999,
                      padding: '8px 12px',
                    }}
                  >
                    <Copy size={14} style={{ marginRight: 6 }} />
                    {copiedId === m.id ? 'Copied' : 'Copy number'}
                  </button>
                  {m.codeValue && m.codeType !== 'NONE' && (
                    <button
                      className="btn-ghost"
                      onClick={() => toggleCode(m.id!)}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 9999,
                        padding: '8px 12px',
                      }}
                    >
                      <QrCode size={14} style={{ marginRight: 6 }} />
                      {visibleCodeId === m.id
                        ? 'Hide code'
                        : `Show ${m.codeType === 'QR' ? 'QR' : 'barcode'}`}
                    </button>
                  )}
                  <button
                    className="btn-ghost"
                    onClick={() => void handleDelete(m.id!)}
                    style={{
                      border: '1px solid var(--danger)',
                      color: 'var(--danger)',
                      borderRadius: 9999,
                      padding: '8px 12px',
                    }}
                  >
                    <Trash2 size={14} style={{ marginRight: 6 }} />
                    Delete
                  </button>
                </div>

                {m.codeValue && visibleCodeId === m.id && (
                  <div
                    className="code-display"
                    style={{
                      background: 'white',
                      padding: 12,
                      borderRadius: 8,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: 100,
                      overflowX: 'auto',
                    }}
                  >
                    {m.codeType === 'QR' ? (
                      <QRCodeSVG value={m.codeValue} size={128} />
                    ) : m.codeType === 'BARCODE' ? (
                      <Barcode
                        value={m.codeValue}
                        width={1.5}
                        height={50}
                        displayValue={false}
                        background="white"
                      />
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <CreditCard size={48} />
            </div>
            <p>
              No memberships added yet.
              <br />
              Keep all your loyalty codes in one place!
            </p>
            <button
              className="btn-primary"
              onClick={() => navigate('/memberships/new')}
              style={{ marginTop: 16 }}
            >
              Add Your First Membership
            </button>
          </div>
        )}
      </div>
      <div style={{ height: 80 }} />
    </div>
  )
}
