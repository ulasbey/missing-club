import { useState, useEffect } from 'react'
import { t } from '../lib/i18n'

const STORAGE_KEY = 'footballQuiz_leaderboard'

function getLeaderboard() {
    try {
        const data = localStorage.getItem(STORAGE_KEY)
        return data ? JSON.parse(data) : []
    } catch { return [] }
}

function saveScore(entry) {
    const board = getLeaderboard()
    board.push(entry)
    board.sort((a, b) => b.score - a.score)
    const trimmed = board.slice(0, 10)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    return trimmed
}

export function getPersonalBest() {
    const board = getLeaderboard()
    return board.length > 0 ? board[0].score : 0
}

export function saveGameScore(score, difficulty, correctCount, totalQuestions) {
    return saveScore({ score, difficulty, correctCount, totalQuestions, date: new Date().toLocaleDateString() })
}

const DIFF_COLORS = {
    Casual: 'text-emerald-400',
    Pro: 'text-amber-400',
    Scout: 'text-blue-400',
    Pundit: 'text-purple-400',
    Legend: 'text-rose-400',
}

export default function ScoreBoard({ onClose, lang = 'en' }) {
    const [board, setBoard] = useState([])

    useEffect(() => { setBoard(getLeaderboard().filter(e => e.difficulty !== 'Casual')) }, [])

    const handleClear = () => { localStorage.removeItem(STORAGE_KEY); setBoard([]) }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="animate-card-reveal bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl w-full max-w-md overflow-hidden">
                <div className="px-6 pt-6 pb-4 border-b border-slate-700/50">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-extrabold text-white tracking-tight">{t(lang, 'leaderboardTitle')}</h2>
                        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-xl cursor-pointer">✕</button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{t(lang, 'leaderboardSub')}</p>
                </div>

                <div className="px-6 py-4 max-h-80 overflow-y-auto">
                    {board.length === 0 ? (
                        <p className="text-slate-500 text-sm text-center py-8">{t(lang, 'noScoresLocal')}</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {board.map((entry, idx) => (
                                <div key={idx} className={`flex items-center justify-between py-3 px-4 rounded-xl ${idx === 0 ? 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20' : idx === 1 ? 'bg-slate-800/50 border border-slate-700/30' : idx === 2 ? 'bg-slate-800/30 border border-slate-700/20' : 'border border-transparent'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-lg font-black w-8 text-center ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-600'}`}>
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                        </span>
                                        <div>
                                            <span className={`text-xs font-bold uppercase tracking-wider ${DIFF_COLORS[entry.difficulty] || 'text-slate-400'}`}>{entry.difficulty}</span>
                                            <p className="text-[11px] text-slate-500">{t(lang, 'correctOf', entry.correctCount, entry.totalQuestions)} · {entry.date}</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-black text-white">{entry.score.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {board.length > 0 && (
                    <div className="px-6 pb-5 pt-2 border-t border-slate-700/50">
                        <button onClick={handleClear} className="w-full py-2.5 text-sm text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500/10 transition-colors cursor-pointer font-medium">
                            {t(lang, 'clearScores')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
