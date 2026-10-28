// Shared UI settings: change the WhatsApp number, credit link and sound file here.

// 91 + 10 digit number, without spaces or +
export const PHONE = '919999999999'
export const CREDIT_URL = 'https://vrattiks.com'
// Replace with any royalty-free looping file in /public/audio. If missing, a soft synth hum plays instead.
export const AMBIENT_SRC = '/audio/ambience.mp3'

export const waLink = (text) => 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(text)

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
