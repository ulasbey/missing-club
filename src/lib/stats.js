const STATS_KEY = 'footballQuiz_stats'

function defaultStats() {
  return {
    totalGames: 0,
    totalCorrect: 0,
    totalQuestions: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastPlayedDate: null,
    bestScores: {},
    gamesPerDifficulty: {},
  }
}

export function getStats() {
  try {
    const d = localStorage.getItem(STATS_KEY)
    return d ? { ...defaultStats(), ...JSON.parse(d) } : defaultStats()
  } catch { return defaultStats() }
}

function prevDay(dateStr) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export function recordGame({ difficulty, correctCount, totalQuestions, score }) {
  if (difficulty === 'Casual') return
  const stats = getStats()
  const today = new Date().toISOString().split('T')[0]

  if (stats.lastPlayedDate === today) {
    // already played today — no streak change
  } else if (stats.lastPlayedDate === prevDay(today)) {
    stats.currentStreak += 1
  } else {
    stats.currentStreak = 1
  }
  stats.lastPlayedDate = today
  stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak)

  stats.totalGames += 1
  stats.totalCorrect += correctCount
  stats.totalQuestions += totalQuestions

  if (!stats.bestScores[difficulty] || score > stats.bestScores[difficulty]) {
    stats.bestScores[difficulty] = score
  }
  stats.gamesPerDifficulty[difficulty] = (stats.gamesPerDifficulty[difficulty] || 0) + 1

  localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  return stats
}
