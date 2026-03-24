import { useEffect, useState } from 'react'
import { fetchGlobalLeaderboard } from '../lib/supabase'
import { t } from '../lib/i18n'

const DIFFS = ['All', 'Pro', 'Scout', 'Pundit', 'Legend']
const DIFF_COLORS = {
  Pro: 'text-amber-400', Scout: 'text-blue-400',
  Pundit: 'text-purple-400', Legend: 'text-rose-400',
}
const DIFF_BG = {
  Pro: 'bg-amber-600', Scout: 'bg-blue-600',
  Pundit: 'bg-purple-600', Legend: 'bg-rose-600',
}

function BootIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white/80">
      <path d="M3 4.5C3 3.7 3.7 3 4.5 3H11l2 3h3.5c.3 0 .5.2.5.5V10H3V4.5z"/>
      <rect x="3" y="11" width="14" height="2.5" rx="1"/>
      <circle cx="5.5" cy="15.5" r="1"/><circle cx="9" cy="15.5" r="1"/>
      <circle cx="12.5" cy="15.5" r="1"/><circle cx="16" cy="15.5" r="1"/>
    </svg>
  )
}

export default function GlobalLeaderboard({ onClose, lang = 'en' }) {
  const [filter, setFilter] = useState('All')
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const allLabel = t(lang, 'allFilter')

  const load = () => {
    setLoading(true)
    setError(false)
    fetchGlobalLeaderboard(filter === allLabel || filter === 'All' ? null : filter)
      .then(({ data, error }) => {
        if (error) { setError(true); setLoading(false); return }
        setScores(data || [])
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }

  useEffect(() => { load() }, [filter])

  const filterLabels = [allLabel, 'Pro', 'Scout', 'Pundit', 'Legend']

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/60 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl flex flex-col" style={{ maxHeight: '88dvh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-lg font-black text-white">{t(lang, 'globalTitle')}</h2>
            <p className="text-slate-500 text-xs mt-0.5">{t(lang, 'globalSub')}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:text-white hover:bg-slate-700/60 transition-all cursor-pointer text-base">✕</button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-3 py-2 border-b border-slate-800 shrink-0">
          {filterLabels.map((label, i) => {
            const key = DIFFS[i]
            const active = filter === key
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? `bg-slate-700 ${key === 'All' ? 'text-white' : DIFF_COLORS[key] || 'text-white'}`
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-3">
          {loading && <div className="text-center py-10 text-slate-500 text-sm">{t(lang, 'loading')}</div>}

          {error && (
            <div className="text-center py-10">
              <p className="text-rose-400 text-sm mb-3">{t(lang, 'connectionError')}</p>
              <button onClick={load} className="text-sm text-slate-400 hover:text-white border border-slate-700 rounded-lg px-4 py-2 transition-colors cursor-pointer">
                🔄 Retry
              </button>
            </div>
          )}

          {!loading && !error && scores.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-sm">{t(lang, 'noScores')}</div>
          )}

          {!loading && !error && scores.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {scores.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-2.5 py-2.5 rounded-xl border ${
                    i === 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-800/40 border-transparent'
                  }`}
                >
                  {/* Rank */}
                  <span className={`text-xs font-black w-4 text-center shrink-0 ${
                    i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'
                  }`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </span>

                  {/* Avatar */}
                  {s.avatar_url ? (
                    <img src={s.avatar_url} alt="" className="w-6 h-6 rounded-full shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${DIFF_BG[s.difficulty] || 'bg-slate-600'}`}>
                      <BootIcon />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-xs truncate">{s.name}</p>
                    <p className="text-emerald-400 font-black text-xs">{s.score.toLocaleString()}</p>
                    {s.difficulty && (
                      <p className={`text-[10px] font-medium ${DIFF_COLORS[s.difficulty] || 'text-slate-500'}`}>{s.difficulty}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
