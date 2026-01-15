/**
 * Notification sound utility for different dashboard events
 */

// Create audio context for generating sounds
const createAudioContext = () => {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch (e) {
    console.warn('AudioContext not supported');
    return null;
  }
};

// Generate a beep sound
const playBeep = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
  const audioContext = createAudioContext();
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = type;

  // Fade in/out for smoother sound
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

// Play a notification sound based on type
export const playNotificationSound = (type: 'booking' | 'new' | 'pending' | 'confirmation' | 'cancellation') => {
  // Check if sounds are enabled (can be stored in localStorage)
  const soundsEnabled = localStorage.getItem('notification-sounds-enabled') !== 'false';
  if (!soundsEnabled) return;

  try {
    switch (type) {
      case 'booking':
        // Pleasant success sound for booking
        playBeep(800, 0.2, 'sine');
        setTimeout(() => playBeep(1000, 0.15, 'sine'), 100);
        break;
      
      case 'new':
        // Alert sound for new appointment
        playBeep(600, 0.15, 'square');
        setTimeout(() => playBeep(800, 0.15, 'square'), 150);
        setTimeout(() => playBeep(1000, 0.2, 'square'), 300);
        break;
      
      case 'pending':
        // Gentle reminder sound
        playBeep(500, 0.2, 'sine');
        setTimeout(() => playBeep(600, 0.2, 'sine'), 200);
        break;
      
      case 'confirmation':
        // Positive confirmation sound
        playBeep(700, 0.15, 'sine');
        setTimeout(() => playBeep(900, 0.15, 'sine'), 100);
        setTimeout(() => playBeep(1100, 0.2, 'sine'), 200);
        break;
      
      case 'cancellation':
        // Warning sound for cancellation
        playBeep(400, 0.3, 'sawtooth');
        setTimeout(() => playBeep(300, 0.3, 'sawtooth'), 300);
        break;
      
      default:
        // Default beep
        playBeep(800, 0.2, 'sine');
    }
  } catch (error) {
    console.warn('Failed to play notification sound:', error);
  }
};

// Enable/disable notification sounds
export const setNotificationSoundsEnabled = (enabled: boolean) => {
  localStorage.setItem('notification-sounds-enabled', enabled.toString());
};

export const areNotificationSoundsEnabled = (): boolean => {
  return localStorage.getItem('notification-sounds-enabled') !== 'false';
};











