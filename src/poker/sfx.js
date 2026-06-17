// Efectos de sonido sin archivos, generados con WebAudio.
let ctx = null
let enabled = true

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) ctx = new AC()
  }
  if (ctx && ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq, dur, type = 'sine', gain = 0.05, when = 0) {
  const c = ac()
  if (!c || !enabled) return
  const t = c.currentTime + when
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

export function setSoundEnabled(on) {
  enabled = on
}

export const sfx = {
  chip() { tone(820, 0.06, 'square', 0.05); tone(1180, 0.05, 'square', 0.03, 0.02) },
  deal() { tone(260, 0.06, 'triangle', 0.06) },
  check() { tone(440, 0.08, 'sine', 0.04) },
  fold() { tone(180, 0.2, 'sawtooth', 0.04) },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'sine', 0.06, i * 0.11)) },
  lose() { tone(330, 0.25, 'sine', 0.05); tone(247, 0.35, 'sine', 0.05, 0.12) },
}
