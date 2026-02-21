/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMembershipById, saveMembership } from '../hooks/useMemberships'
import type { Membership, MembershipCodeType } from '../types'
import { Save, X, QrCode, Barcode as BarcodeIcon, Ban } from 'lucide-react'

export default function AddEditMembership() {
  const { id } = useParams()
  const navigate = useNavigate()
  const existingMembership = useMembershipById(id ? parseInt(id) : undefined)

  const [airlineName, setAirlineName] = useState('')
  const [programName, setProgramName] = useState('')
  const [memberName, setMemberName] = useState('')
  const [membershipNumber, setMembershipNumber] = useState('')
  const [codeValue, setCodeValue] = useState('')
  const [codeType, setCodeType] = useState<MembershipCodeType>('QR')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (existingMembership) {
      setAirlineName(existingMembership.airlineName)
      setProgramName(existingMembership.programName)
      setMemberName(existingMembership.memberName)
      setMembershipNumber(existingMembership.membershipNumber)
      setCodeValue(existingMembership.codeValue ?? '')
      setCodeType(existingMembership.codeType)
      setNotes(existingMembership.notes ?? '')
    }
  }, [existingMembership])

  const handleSave = async () => {
    if (!airlineName || !memberName || !membershipNumber) {
      alert('Please fill in Airline, Member Name, and Membership Number')
      return
    }

    const membershipData: Omit<Membership, 'id'> = {
      airlineName,
      programName,
      memberName,
      membershipNumber,
      codeValue: codeValue || undefined,
      codeType,
      notes: notes || undefined,
    }

    await saveMembership(id ? { ...membershipData, id: parseInt(id) } : membershipData)
    navigate('/memberships')
  }

  return (
    <div className="page animate-in">
      <header className="page-header">
        <button onClick={() => navigate('/memberships')} className="btn-ghost">
          <X size={24} />
        </button>
        <h1>{id ? 'Edit Membership' : 'Add Membership'}</h1>
        <button onClick={handleSave} className="btn-ghost" style={{ color: 'var(--accent)' }}>
          <Save size={24} />
        </button>
      </header>

      <div className="form-section">
        <div className="form-section-title">Program Info</div>
        <div className="form-field">
          <label>Airline Name</label>
          <input
            type="text"
            value={airlineName}
            onChange={(e) => setAirlineName(e.target.value)}
            placeholder="e.g. Iberia, Lufthansa, Delta"
          />
        </div>
        <div className="form-field" style={{ marginTop: 12 }}>
          <label>Program Name (Optional)</label>
          <input
            type="text"
            value={programName}
            onChange={(e) => setProgramName(e.target.value)}
            placeholder="e.g. Iberia Plus, Miles & More"
          />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Member Info</div>
        <div className="form-field">
          <label>Member Full Name</label>
          <input
            type="text"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            placeholder="As it appears on your card"
          />
        </div>
        <div className="form-field" style={{ marginTop: 12 }}>
          <label>Membership Number</label>
          <input
            type="text"
            value={membershipNumber}
            onChange={(e) => setMembershipNumber(e.target.value)}
            placeholder="Account ID / Number"
          />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Scannable Code</div>
        <div className="form-field">
          <label>Code Value (QR / Barcode Content)</label>
          <input
            type="text"
            value={codeValue}
            onChange={(e) => setCodeValue(e.target.value)}
            placeholder="The text/number inside the QR/Barcode"
          />
        </div>

        <div className="form-field" style={{ marginTop: 12 }}>
          <label>Code Type</label>
          <div
            className="class-selector"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}
          >
            <button
              className={`class-btn ${codeType === 'QR' ? 'active' : ''}`}
              onClick={() => setCodeType('QR')}
              style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 8px' }}
            >
              <QrCode size={20} />
              <span style={{ fontSize: '0.7rem' }}>QR Code</span>
            </button>
            <button
              className={`class-btn ${codeType === 'BARCODE' ? 'active' : ''}`}
              onClick={() => setCodeType('BARCODE')}
              style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 8px' }}
            >
              <BarcodeIcon size={20} />
              <span style={{ fontSize: '0.7rem' }}>Barcode</span>
            </button>
            <button
              className={`class-btn ${codeType === 'NONE' ? 'active' : ''}`}
              onClick={() => setCodeType('NONE')}
              style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 8px' }}
            >
              <Ban size={20} />
              <span style={{ fontSize: '0.7rem' }}>None</span>
            </button>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Notes</div>
        <div className="form-field">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional info (tier status, expiry, etc.)"
          />
        </div>
      </div>

      <button className="btn-primary" onClick={handleSave}>
        {id ? 'Update Membership' : 'Save Membership'}
      </button>

      <div style={{ height: 40 }} />
    </div>
  )
}
