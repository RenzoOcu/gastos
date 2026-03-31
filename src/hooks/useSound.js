import { useCallback, useRef } from 'react'

// Configuración de sonidos
const SOUNDS = {
  click: { frequency: 800, duration: 0.05, type: 'sine' },
  hover: { frequency: 600, duration: 0.03, type: 'sine' },
  success: { frequency: 523.25, duration: 0.15, type: 'sine' }, // Do
  error: { frequency: 200, duration: 0.2, type: 'sawtooth' },
  delete: { frequency: 150, duration: 0.15, type: 'square' },
  save: { frequency: 659.25, duration: 0.1, type: 'sine' }, // Mi
}

export const useSound = () => {
  const audioContextRef = useRef(null)

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  const playSound = useCallback((soundName) => {
    try {
      const audioContext = getAudioContext()
      const soundConfig = SOUNDS[soundName] || SOUNDS.click

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.type = soundConfig.type
      oscillator.frequency.setValueAtTime(soundConfig.frequency, audioContext.currentTime)

      // Envolvente ADSR simple
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + soundConfig.duration)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + soundConfig.duration)
    } catch (error) {
      console.log('Audio no disponible:', error)
    }
  }, [getAudioContext])

  return { playSound }
}

export default useSound