import { useAirlineByName } from '../hooks/useAirlines'

interface Props {
  name: string
  size?: number
  className?: string
}

export default function AirlineLabel({ name, size = 16, className }: Props) {
  const airline = useAirlineByName(name)
  const displayName = name.toUpperCase()

  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      {airline?.image && (
        <img
          src={airline.image}
          alt={displayName}
          style={{
            width: size,
            height: size,
            objectFit: 'contain',
            borderRadius: 3,
            flexShrink: 0,
          }}
        />
      )}
      <span style={{ minWidth: 0, whiteSpace: 'normal', wordBreak: 'break-word' }}>{displayName}</span>
    </span>
  )
}
