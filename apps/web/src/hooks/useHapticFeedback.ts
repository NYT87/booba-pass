import { useWebHaptics } from 'web-haptics/react'

type HapticPreset = 'nudge' | 'success' | 'error'

export function useHapticFeedback() {
  const { trigger } = useWebHaptics()

  return (preset: HapticPreset = 'nudge') => {
    void trigger?.(preset)?.catch(() => {
      // Ignore unsupported browsers/devices.
    })
  }
}
