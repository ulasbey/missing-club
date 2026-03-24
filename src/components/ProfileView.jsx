import { useState, useEffect } from 'react'
import { signInWithGoogle, signOutUser, fetchUserScores } from '../lib/supabase'
import { getStats } from '../lib/stats'
import { t } from '../lib/i18n'

const DIFF_COLORS = { Pro: 'text-amber-400', Scout: 'text-blue-400', Pundit: 'text-purple-400', Legend: 'text-rose-400' }

export default function ProfileView({ onClose, googleUser, lang = 'en' }) {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(false)
  const localStats = getStats()

  useEffect(() => {
    if (!googleUser) return
    setLoading(true)
    fetchUserScores(googleUser.id).then(({ data }) => {
      setScores(data || [])
      setLoading(false)
    })
  }, [googleUser])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/60 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl flex flex-col" style={{ maxHeight: '85dvh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-800 shrink-0">
          <h2 className="text-lg font-black text-white">Profile</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:text-white hover:bg-slate-700/60 transition-all cursor-pointer">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {googleUser ? (
            <>
              {/* User info */}
              <div className="flex items-center gap-3 mb-5">
                {googleUser.user_metadata?.avatar_url ? (
                  <img src={googleUser.user_metadata.avatar_url} className="w-14 h-14 rounded-full border-2 border-emerald-500/40" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center text-2xl">👤</div>
                )}
                <div>
                  <p className="text-white font-bold text-base">{googleUser.user_metadata?.full_name || googleUser.email}</p>
                  <p className="text-slate-500 text-xs">{googleUser.email}</p>
                </div>
              </div>

              {/* Local stats */}
              {localStats.totalGames > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-5">
                  <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/30">
                    <p className="text-white font-black text-xl">{localStats.totalGames}</p>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider">Games</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/30">
                    <p className="text-amber-400 font-black text-xl">{localStats.currentStreak}</p>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider">Streak</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/30">
                    <p className="text-cyan-400 font-black text-xl">{localStats.totalQuestions > 0 ? Math.round(localStats.totalCorrect / localStats.totalQuestions * 100) : 0}%</p>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider">Accuracy</p>
                  </div>
                </div>
              )}

              {/* Global scores */}
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Your Global Scores</p>
              {loading && <p className="text-slate-500 text-sm text-center py-4">Loading...</p>}
              {!loading && scores.length === 0 && <p className="text-slate-600 text-sm text-center py-4">No global scores yet. Save a score to appear here!</p>}
              {!loading && scores.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-5">
                  {scores.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-800/40 rounded-xl px-3 py-2.5 border border-slate-700/20">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 text-xs w-4">{i + 1}</span>
                        <span className={`text-xs font-bold ${DIFF_COLORS[s.difficulty] || 'text-slate-400'}`}>{s.difficulty}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 font-black text-sm">{s.score.toLocaleString()}</p>
                        <p className="text-slate-600 text-[10px]">{s.correct_count}/{s.total_questions} correct</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => signOutUser().then(onClose)}
                className="w-full py-3 bg-slate-800/60 text-rose-400 rounded-xl font-bold text-sm border border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/10 transition-all cursor-pointer"
              >
                Sign Out
              </button>
            </>
          ) : (
            <div className="py-4">
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">👤</div>
                <p className="text-white font-bold text-lg mb-1">Sign in to save your progress</p>
                <p className="text-slate-500 text-sm">Your scores will be linked to your account and visible on the global leaderboard</p>
              </div>

              {localStats.totalGames > 0 && (
                <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30 mb-5">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Your local stats</p>
                  <p className="text-white font-bold">{localStats.totalGames} games played · {localStats.totalGames > 0 && localStats.totalQuestions > 0 ? Math.round(localStats.totalCorrect / localStats.totalQuestions * 100) : 0}% accuracy</p>
                </div>
              )}

              <button
                onClick={() => signInWithGoogle()}
                className="w-full py-4 bg-white text-slate-900 rounded-xl font-bold text-base flex items-center justify-center gap-3 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {t(lang, 'googleBtn')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
