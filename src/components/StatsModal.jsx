import { getStats } from '../lib/stats'
import { t } from '../lib/i18n'

const DIFF_COLORS = {
  Pro: 'text-amber-400',
  Scout: 'text-blue-400',
  Pundit: 'text-purple-400',
  Legend: 'text-rose-400',
}

const DIFF_ORDER = ['Pro', 'Scout', 'Pundit', 'Legend']

export default function StatsModal({ onClose, lang = 'en' }) {
  const s = getStats()
  const accuracyPct = s.totalQuestions > 0 ? Math.round((s.totalCorrect / s.totalQuestions) * 100) : 0

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="animate-card-reveal bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-700/50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">{t(lang, 'statsTitle')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t(lang, 'statsSub')}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-xl cursor-pointer">✕</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">

          {/* Top stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800/60 rounded-xl p-3 text-center border border-slate-700/30">
              <p className="text-2xl font-black text-white">{s.totalGames}</p>
              <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-0.5">{t(lang, 'statsGames')}</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center border border-slate-700/30">
              <p className="text-2xl font-black text-emerald-400">{s.totalCorrect}</p>
              <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-0.5">{t(lang, 'statsCorrect')}</p>
            </div>
            <div className="bg-amber-500/10 rounded-xl p-3 text-center border border-amber-500/20">
              <p className="text-2xl font-black text-amber-400">{s.currentStreak}</p>
              <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-0.5">{t(lang, 'statsStreak')}</p>
            </div>
          </div>

          {/* Best streak + accuracy */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/20">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{t(lang, 'statsBestStreak')}</p>
              <p className="text-lg font-black text-white">🔥 {s.bestStreak} {t(lang, 'statsDays')}</p>
            </div>
            <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/20">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{t(lang, 'statsAccuracy')}</p>
              <p className="text-lg font-black text-cyan-400">{accuracyPct}%</p>
            </div>
          </div>

          {/* Best scores per difficulty */}
          {DIFF_ORDER.some(d => s.bestScores[d]) && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{t(lang, 'statsBestScores')}</p>
              <div className="flex flex-col gap-1.5">
                {DIFF_ORDER.filter(d => s.bestScores[d]).map(d => (
                  <div key={d} className="flex items-center justify-between bg-slate-800/40 rounded-xl px-4 py-2.5 border border-slate-700/20">
                    <span className={`text-xs font-bold uppercase tracking-wider ${DIFF_COLORS[d]}`}>{d}</span>
                    <span className="text-white font-black text-sm">{s.bestScores[d].toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {s.totalGames === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">{t(lang, 'statsEmpty')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
