import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMemberships } from '../hooks/useMemberships'
import { Barcode as BarcodeIcon, Check, Copy, CreditCard, List, Pencil, Plus, QrCode, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import Barcode from 'react-barcode'
import { useHapticFeedback } from '../hooks/useHapticFeedback'

export default function Memberships() {
  const navigate = useNavigate()
  const triggerHaptic = useHapticFeedback()
  const memberships = useMemberships() || []
  const [visibleCode, setVisibleCode] = useState<{
    membershipId: number
    kind: 'QR' | 'BARCODE'
    value: string
    airlineName: string
    programName?: string
    memberName: string
    membershipNumber: string
  } | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const handleCopyMembershipNumber = async (id: number, membershipNumber: string) => {
    triggerHaptic()
    try {
      await navigator.clipboard.writeText(membershipNumber)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      alert('Could not copy membership number')
    }
  }

  const toggleCode = (
    membershipId: number,
    kind: 'QR' | 'BARCODE',
    value: string,
    airlineName: string,
    programName?: string,
    memberName?: string,
    membershipNumber?: string
  ) => {
    setVisibleCode((current) => {
      if (current?.membershipId === membershipId && current.kind === kind) {
        return null
      }
      return {
        membershipId,
        kind,
        value,
        airlineName,
        programName,
        memberName: memberName ?? '',
        membershipNumber: membershipNumber ?? '',
      }
    })
  }

  return (
    <div className="page animate-in">
      <header className="page-header">
        <h1>Memberships</h1>
        <button
          className="btn-ghost btn-ghost-accent"
          onClick={() => {
            triggerHaptic()
            navigate('/memberships/new')
          }}
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="memberships-list">
        {memberships.length > 0 ? (
          memberships.map((m) => {
            const qrValue = m.qrCodeValue ?? (m.codeType === 'QR' ? m.codeValue : undefined)
            const barcodeValue = m.barcodeValue ?? (m.codeType === 'BARCODE' ? m.codeValue : undefined)
            const isQrVisible = visibleCode?.membershipId === m.id && visibleCode?.kind === 'QR'
            const isBarcodeVisible = visibleCode?.membershipId === m.id && visibleCode?.kind === 'BARCODE'

            return (
              <div key={m.id} className="card membership-card">
                <div className="membership-header">
                  <div>
                    <div className="airline-name">{m.airlineName}</div>
                    {m.programName && <div className="program-name">{m.programName}</div>}
                    {m.allianceGroup && (
                      <div style={{ marginTop: 6 }}>
                        <span className="membership-tag">{m.allianceGroup}</span>
                      </div>
                    )}
                  </div>
                  <div className="membership-header-actions">
                    <button
                      type="button"
                      className="membership-icon-btn"
                      onClick={() => {
                        triggerHaptic()
                        navigate(`/memberships/${m.id}/mileage`)
                      }}
                      title="View mileage history"
                      aria-label="View mileage history"
                    >
                      <List size={15} />
                    </button>
                    <button
                      type="button"
                      className="membership-icon-btn"
                      onClick={() => {
                        triggerHaptic()
                        navigate(`/memberships/${m.id}/edit`)
                      }}
                      title="Edit membership"
                      aria-label="Edit membership"
                    >
                      <Pencil size={15} />
                    </button>
                  </div>
                </div>

                <div className="membership-body">
                  <div className="membership-body-top">
                    <div className="member-info">
                      <div className="membership-label">Member</div>
                      <div className="membership-member-name">{m.memberName}</div>
                      <div className="membership-number">{m.membershipNumber}</div>
                    </div>
                    <div className="membership-body-actions">
                      <button
                        type="button"
                        className="membership-icon-btn"
                        onClick={() => void handleCopyMembershipNumber(m.id!, m.membershipNumber)}
                        title={copiedId === m.id ? 'Copied' : 'Copy membership number'}
                        aria-label={copiedId === m.id ? 'Copied' : 'Copy membership number'}
                      >
                        {copiedId === m.id ? <Check size={15} /> : <Copy size={15} />}
                      </button>
                      {qrValue && (
                        <button
                          type="button"
                          className="membership-icon-btn"
                          onClick={() => {
                            triggerHaptic()
                            toggleCode(
                              m.id!,
                              'QR',
                              qrValue,
                              m.airlineName,
                              m.programName,
                              m.memberName,
                              m.membershipNumber
                            )
                          }}
                          title={isQrVisible ? 'Hide QR code' : 'Show QR code'}
                          aria-label={isQrVisible ? 'Hide QR code' : 'Show QR code'}
                        >
                          <QrCode size={15} />
                        </button>
                      )}
                      {barcodeValue && (
                        <button
                          type="button"
                          className="membership-icon-btn"
                          onClick={() => {
                            triggerHaptic()
                            toggleCode(
                              m.id!,
                              'BARCODE',
                              barcodeValue,
                              m.airlineName,
                              m.programName,
                              m.memberName,
                              m.membershipNumber
                            )
                          }}
                          title={isBarcodeVisible ? 'Hide barcode' : 'Show barcode'}
                          aria-label={isBarcodeVisible ? 'Hide barcode' : 'Show barcode'}
                        >
                          <BarcodeIcon size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
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
              onClick={() => {
                triggerHaptic()
                navigate('/memberships/new')
              }}
              style={{ marginTop: 16 }}
            >
              Add Your First Membership
            </button>
          </div>
        )}
      </div>
      <div style={{ height: 80 }} />

      {visibleCode && (
        <div
          className="membership-code-overlay"
          onClick={() => {
            triggerHaptic()
            setVisibleCode(null)
          }}
        >
          <div className="membership-code-content" onClick={(e) => e.stopPropagation()}>
            <div className="membership-code-header">
              <div>
                <div className="membership-code-title">{visibleCode.airlineName}</div>
                {visibleCode.programName && <div className="membership-code-subtitle">{visibleCode.programName}</div>}
              </div>
              <button
                type="button"
                className="membership-code-close"
                onClick={() => {
                  triggerHaptic()
                  setVisibleCode(null)
                }}
                aria-label="Close code preview"
              >
                <X size={20} />
              </button>
            </div>

            <div className="membership-code-canvas">
              <div className="membership-code-stack">
                {visibleCode.kind === 'QR' ? (
                  <QRCodeSVG value={visibleCode.value} size={320} />
                ) : (
                  <Barcode value={visibleCode.value} width={2} height={120} displayValue={false} background="white" />
                )}
                <div className="membership-code-meta">
                  <div className="membership-code-member">{visibleCode.memberName}</div>
                  <div className="membership-code-number">{visibleCode.membershipNumber}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
