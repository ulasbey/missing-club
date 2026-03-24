import allPlayers from '../data/players.json'

// Seeded PRNG (mulberry32)
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function dateToSeed(dateStr) {
  // "2026-03-24" → 20260324
  return parseInt(dateStr.replace(/-/g, ''), 10)
}

export function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

export function getDailyNumber(dateStr) {
  const epoch = new Date('2026-01-01')
  const d = new Date(dateStr)
  return Math.floor((d - epoch) / 86400000) + 1
}

export function getDailyQuestions(dateStr) {
  const rng = mulberry32(dateToSeed(dateStr))
  const pool = [...allPlayers]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 5)
}

const DAILY_KEY = (d) => `footballQuiz_daily_${d}`

export function getDailyResult(dateStr) {
  try {
    const d = localStorage.getItem(DAILY_KEY(dateStr))
    return d ? JSON.parse(d) : null
  } catch { return null }
}

export function saveDailyResult(dateStr, { results, score }) {
  localStorage.setItem(DAILY_KEY(dateStr), JSON.stringify({ results, score, completedAt: Date.now() }))
}

export function formatDailyShare(results, dateStr, score) {
  const num = getDailyNumber(dateStr)
  const emojis = results.map(r => r ? '🟩' : '🟥').join('')
  const correct = results.filter(Boolean).length
  return `🧩 Missing Club Daily #${num}\n${emojis}\n${correct}/5 correct · ${score} pts\n${window.location.origin}`
}
