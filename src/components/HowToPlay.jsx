import { t } from '../lib/i18n'

const MODES = [
  { icon: '🎮', key: 'Casual',  colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10 border-emerald-500/20' },
  { icon: '🏟️', key: 'Pro',     colorClass: 'text-amber-400',   bgClass: 'bg-amber-500/10 border-amber-500/20' },
  { icon: '🔭', key: 'Scout',   colorClass: 'text-blue-400',    bgClass: 'bg-blue-500/10 border-blue-500/20' },
  { icon: '📺', key: 'Pundit',  colorClass: 'text-purple-400',  bgClass: 'bg-purple-500/10 border-purple-500/20' },
  { icon: '💀', key: 'Legend',  colorClass: 'text-rose-400',    bgClass: 'bg-rose-500/10 border-rose-500/20' },
]

export default function HowToPlay({ lang, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div
        className="bg-slate-900 border border-slate-700/60 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl animate-card-reveal flex flex-col"
        style={{ maxHeight: '92dvh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-700/50 shrink-0">
          <h2 className="text-white font-black text-lg">{t(lang, 'htpTitle')}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:text-white hover:bg-slate-700/60 transition-all cursor-pointer text-base"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Basic concept */}
          <section>
            <p className="text-slate-300 text-sm leading-relaxed">{t(lang, 'htpIntro')}</p>
          </section>

          {/* Steps */}
          <section>
            <h3 className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-3">{t(lang, 'htpHowTitle')}</h3>
            <div className="space-y-2.5">
              {[1, 2, 3].map(n => (
                <div key={n} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{n}</span>
                  <p className="text-slate-300 text-sm leading-relaxed">{t(lang, `htpStep${n}`)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Modes */}
          <section>
            <h3 className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-3">{t(lang, 'htpModesTitle')}</h3>
            <div className="space-y-2">
              {MODES.map(({ icon, key, colorClass, bgClass }) => (
                <div key={key} className={`rounded-xl border px-3.5 py-2.5 ${bgClass}`}>
                  <p className={`text-sm font-bold ${colorClass} mb-0.5`}>{icon} {key}</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{t(lang, `${key.toLowerCase()}Desc`)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Scoring */}
          <section>
            <h3 className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-3">{t(lang, 'htpScoringTitle')}</h3>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/40 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{t(lang, 'htpScoreBase')}</span>
                <span className="text-white font-bold">500 pts</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{t(lang, 'htpScoreTime')}</span>
                <span className="text-cyan-400 font-bold">+50 pts/s</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{t(lang, 'htpScoreMode')}</span>
                <span className="text-amber-400 font-bold">×1.0 – ×2.0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{t(lang, 'htpScoreDiff')}</span>
                <span className="text-purple-400 font-bold">×0.8 – ×1.6</span>
              </div>
            </div>
            <p className="text-slate-600 text-xs mt-2 text-center">{t(lang, 'htpScoringHint')}</p>
          </section>

          {/* Tips */}
          <section>
            <h3 className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-3">{t(lang, 'htpTipsTitle')}</h3>
            <div className="space-y-1.5">
              {[1, 2, 3].map(n => (
                <p key={n} className="text-slate-400 text-sm leading-relaxed">
                  <span className="text-slate-500 mr-1.5">›</span>{t(lang, `htpTip${n}`)}
                </p>
              ))}
            </div>
          </section>

          <div className="pb-2" />
        </div>

        {/* CTA */}
        <div className="px-5 pb-5 pt-3 border-t border-slate-700/50 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            {t(lang, 'htpReady')}
          </button>
        </div>
      </div>
    </div>
  )
}
