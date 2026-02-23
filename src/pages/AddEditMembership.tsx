import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { deleteMembership, useMembershipById, saveMembership } from '../hooks/useMemberships'
import type { Membership } from '../types'
import { Save, X, ScanLine, Trash2 } from 'lucide-react'

export default function AddEditMembership() {
  const { id } = useParams()
  const navigate = useNavigate()
  const existingMembership = useMembershipById(id ? parseInt(id) : undefined)

  const [airlineName, setAirlineName] = useState('')
  const [programName, setProgramName] = useState('')
  const [allianceGroup, setAllianceGroup] = useState('')
  const [memberName, setMemberName] = useState('')
  const [membershipNumber, setMembershipNumber] = useState('')
  const [qrCodeValue, setQrCodeValue] = useState('')
  const [barcodeValue, setBarcodeValue] = useState('')
  const [analyzingCodeImage, setAnalyzingCodeImage] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingMembership, setDeletingMembership] = useState(false)
  const [notes, setNotes] = useState('')

  const detectCodeFromImage = async (
    file: File
  ): Promise<{ value: string; type: 'QR' | 'BARCODE' } | null> => {
    const BarcodeDetectorApi = (
      window as Window & {
        BarcodeDetector?: new (options?: { formats?: string[] }) => {
          detect: (source: ImageBitmap) => Promise<Array<{ rawValue?: string; format?: string }>>
        }
      }
    ).BarcodeDetector

    if (!BarcodeDetectorApi) return null

    const detector = new BarcodeDetectorApi({
      formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf'],
    })

    const bitmap = await createImageBitmap(file)
    try {
      const detections = await detector.detect(bitmap)
      const first = detections.find((d) => Boolean(d.rawValue?.trim()))
      if (!first?.rawValue?.trim()) return null

      return {
        value: first.rawValue.trim(),
        type: first.format === 'qr_code' ? 'QR' : 'BARCODE',
      }
    } finally {
      bitmap.close()
    }
  }

  useEffect(() => {
    if (existingMembership) {
      setAirlineName(existingMembership.airlineName)
      setProgramName(existingMembership.programName)
      setAllianceGroup(existingMembership.allianceGroup ?? '')
      setMemberName(existingMembership.memberName)
      setMembershipNumber(existingMembership.membershipNumber)
      setQrCodeValue(
        existingMembership.qrCodeValue ??
          (existingMembership.codeType === 'QR' ? (existingMembership.codeValue ?? '') : '')
      )
      setBarcodeValue(
        existingMembership.barcodeValue ??
          (existingMembership.codeType === 'BARCODE' ? (existingMembership.codeValue ?? '') : '')
      )
      setNotes(existingMembership.notes ?? '')
    }
  }, [existingMembership])

  const handleSave = async () => {
    if (!airlineName || !memberName || !membershipNumber) {
      alert('Please fill in Airline, Member Name, and Membership Number')
      return
    }

    const membershipData: Omit<Membership, 'id'> = {
      airlineName: airlineName.toUpperCase(),
      programName: programName.toUpperCase(),
      allianceGroup: allianceGroup ? allianceGroup.toUpperCase() : undefined,
      memberName: memberName.toUpperCase(),
      membershipNumber,
      qrCodeValue: qrCodeValue || undefined,
      barcodeValue: barcodeValue || undefined,
      // Keep legacy fields for compatibility with older data consumers.
      codeValue: qrCodeValue || barcodeValue || undefined,
      codeType: qrCodeValue ? 'QR' : barcodeValue ? 'BARCODE' : 'NONE',
      notes: notes || undefined,
    }

    await saveMembership(id ? { ...membershipData, id: parseInt(id) } : membershipData)
    navigate('/memberships')
  }

  const handleCodeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAnalyzingCodeImage(true)
    try {
      const result = await detectCodeFromImage(file)
      if (!result) {
        alert(
          'No readable QR/barcode found, or your browser does not support automatic detection. Please enter the code manually.'
        )
        return
      }

      if (result.type === 'QR') {
        setQrCodeValue(result.value)
      } else {
        setBarcodeValue(result.value)
      }
      alert(`Code detected successfully as ${result.type}. Updated corresponding field.`)
    } catch (err) {
      console.error(err)
      alert('Could not analyze the image. Please try a clearer image or enter the code manually.')
    } finally {
      setAnalyzingCodeImage(false)
      e.target.value = ''
    }
  }

  const handleDeleteMembership = async () => {
    if (!id) return
    setDeletingMembership(true)
    try {
      await deleteMembership(parseInt(id))
      navigate('/memberships')
    } finally {
      setDeletingMembership(false)
      setShowDeleteModal(false)
    }
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
            onChange={(e) => setAirlineName(e.target.value.toUpperCase())}
            placeholder="e.g. Iberia, Lufthansa, Delta"
          />
        </div>
        <div className="form-field" style={{ marginTop: 12 }}>
          <label>Program Name (Optional)</label>
          <input
            type="text"
            value={programName}
            onChange={(e) => setProgramName(e.target.value.toUpperCase())}
            placeholder="e.g. Iberia Plus, Miles & More"
          />
        </div>
        <div className="form-field" style={{ marginTop: 12 }}>
          <label>Alliance / Group (Optional)</label>
          <input
            type="text"
            value={allianceGroup}
            onChange={(e) => setAllianceGroup(e.target.value.toUpperCase())}
            placeholder="e.g. Star Alliance, SkyTeam, Oneworld"
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
            onChange={(e) => setMemberName(e.target.value.toUpperCase())}
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
          <label>Scan from Image</label>
          <label
            className={`btn-ghost ${analyzingCodeImage ? 'disabled' : ''}`}
            style={{
              width: '100%',
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 12,
              background: 'var(--bg-input)',
              border: '1px dashed var(--border)',
              borderRadius: 10,
              cursor: analyzingCodeImage ? 'not-allowed' : 'pointer',
              opacity: analyzingCodeImage ? 0.6 : 1,
            }}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleCodeImageUpload}
              disabled={analyzingCodeImage}
              hidden
            />
            <ScanLine size={18} />
            {analyzingCodeImage ? 'Analyzing image...' : 'Upload QR/Barcode image'}
          </label>
        </div>
        <div className="form-field" style={{ marginTop: 12 }}>
          <label>QR Code Value (Optional)</label>
          <input
            type="text"
            value={qrCodeValue}
            onChange={(e) => setQrCodeValue(e.target.value)}
            placeholder="Decoded text for QR code"
          />
        </div>

        <div className="form-field" style={{ marginTop: 12 }}>
          <label>Barcode Value (Optional)</label>
          <input
            type="text"
            value={barcodeValue}
            onChange={(e) => setBarcodeValue(e.target.value)}
            placeholder="Decoded value for barcode"
          />
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

      {id && (
        <button
          className="btn-danger"
          type="button"
          onClick={() => setShowDeleteModal(true)}
          style={{ width: '100%', marginTop: 12 }}
        >
          <Trash2 size={16} style={{ marginRight: 8 }} />
          Delete Membership
        </button>
      )}

      <div style={{ height: 40 }} />

      {showDeleteModal && (
        <div className="confirm-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div
            className="confirm-modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="confirm-modal-title">Delete membership?</h3>
            <p className="confirm-modal-text">
              This membership card will be permanently removed from this device.
            </p>
            <div className="confirm-modal-actions">
              <button className="btn-ghost" type="button" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button
                className="btn-danger"
                type="button"
                onClick={() => void handleDeleteMembership()}
              >
                {deletingMembership ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
