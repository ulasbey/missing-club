// Web Audio API — no dependencies, synthesized tones
let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  // Resume if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone({ freq, endFreq, type = 'sine', dur = 0.18, vol = 0.22, delay = 0 }) {
  try {
    const c = getCtx()
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.type = type
    const t = c.currentTime + delay
    osc.frequency.setValueAtTime(freq, t)
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur)
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.start(t)
    osc.stop(t + dur + 0.01)
  } catch {}
}

const KEY = 'footballQuiz_sounds'
export const isSoundOn = () => localStorage.getItem(KEY) !== 'off'
export function toggleSound() {
  const next = !isSoundOn()
  localStorage.setItem(KEY, next ? 'on' : 'off')
  return next
}

export function playCorrect() {
  if (!isSoundOn()) return
  tone({ freq: 440, endFreq: 660, dur: 0.18, vol: 0.2 })
  tone({ freq: 660, endFreq: 880, dur: 0.15, vol: 0.18, delay: 0.15 })
}

export function playWrong() {
  if (!isSoundOn()) return
  tone({ freq: 280, endFreq: 160, type: 'sawtooth', dur: 0.28, vol: 0.18 })
}

export function playTimerTick() {
  if (!isSoundOn()) return
  tone({ freq: 900, dur: 0.06, vol: 0.1, type: 'square' })
}

export function playComplete() {
  if (!isSoundOn()) return
  ;[523, 659, 784, 1047].forEach((f, i) =>
    tone({ freq: f, dur: 0.18, vol: 0.18, delay: i * 0.1 })
  )
}

export function playGameOver() {
  if (!isSoundOn()) return
  tone({ freq: 330, endFreq: 165, type: 'square', dur: 0.5, vol: 0.18 })
}
