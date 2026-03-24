import { useState } from 'react'
import { saveScoreToGlobal, signInWithGoogle, signOutUser } from '../lib/supabase'
import { containsProfanity } from '../lib/profanity'
import { t } from '../lib/i18n'

const EMAIL_KEY = 'footballQuiz_savedEmail'
const PENDING_KEY = 'footballQuiz_pendingScore'

// Max points per correct answer per mode (timer * 50 + 500 base) × mode mult × max diff mult (1.6)
const MAX_PER_CORRECT = { Pro: 2000, Scout: 2400, Pundit: 1904, Legend: 2400, Casual: 0, Secret: 2000 }

function isScorePlausible(score, correctCount, totalQuestions, difficulty) {
  if (score < 0 || score > 10_000_000) return false
  if (correctCount < 0 || correctCount > totalQuestions) return false
  const maxPerCorrect = MAX_PER_CORRECT[difficulty] ?? 2400
  if (correctCount > 0 && score / correctCount > maxPerCorrect * 1.1) return false
  return true
}

export default function SaveScoreModal({ score, correctCount, totalQuestions, difficulty, onClose, onSaved, lang = 'en', googleUser }) {
  const [name, setName] = useState(() => googleUser?.user_metadata?.full_name || googleUser?.user_metadata?.name || '')
  const [email, setEmail] = useState(() => googleUser?.email || localStorage.getItem(EMAIL_KEY) || '')
  const [status, setStatus] = useState('idle') // idle | loading | success | error | profanity

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    if (containsProfanity(name) || containsProfanity(email)) { setStatus('profanity'); return }
    if (!isScorePlausible(score, correctCount, totalQuestions, difficulty)) { setStatus('error'); return }
    setStatus('loading')

    const { error } = await saveScoreToGlobal({
      name: name.trim(),
      email: email.trim(),
      score,
      correctCount,
      totalQuestions,
      difficulty,
      userId: googleUser?.id || null,
      avatarUrl: googleUser?.user_metadata?.avatar_url || null,
    })

    if (error) {
      setStatus('error')
    } else {
      localStorage.setItem(EMAIL_KEY, email.trim())
      setStatus('success')
      onSaved?.()
    }
  }

  const handleGoogleSignIn = () => {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ score, correctCount, totalQuestions, difficulty }))
    signInWithGoogle()
  }

  const handleSignOut = () => {
    signOutUser()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-card-reveal">

        {status === 'success' ? (
          <div className="text-center py-4">
            <span className="text-5xl mb-4 block">🎉</span>
            <h2 className="text-xl font-black text-white mb-2">{t(lang, 'saveSuccess')}</h2>
            <p className="text-slate-400 text-sm mb-6">{t(lang, 'saveSuccessSub')}</p>
            <button onClick={onClose} className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer">
              {t(lang, 'ok')}
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-3">
                <span className="text-emerald-400 font-black text-lg">{score.toLocaleString()} pts</span>
              </div>
              <h2 className="text-xl font-black text-white">{t(lang, 'saveTitle')}</h2>
              <p className="text-slate-500 text-sm mt-1">{difficulty} · {t(lang, 'correctOf', correctCount, totalQuestions)}</p>
            </div>

            {/* Google sign-in or signed-in state */}
            {googleUser ? (
              <div className="flex items-center gap-3 bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 mb-4">
                {googleUser.user_metadata?.avatar_url && (
                  <img src={googleUser.user_metadata.avatar_url} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{googleUser.user_metadata?.full_name || googleUser.user_metadata?.name}</p>
                  <p className="text-slate-500 text-xs truncate">{googleUser.email}</p>
                </div>
                <button onClick={handleSignOut} className="text-slate-600 hover:text-slate-400 text-xs cursor-pointer shrink-0">
                  {t(lang, 'signOut')}
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-xl border border-gray-200 transition-all active:scale-95 cursor-pointer mb-4 shadow-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {t(lang, 'googleBtn')}
                </button>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-slate-700/60" />
                  <span className="text-slate-600 text-xs">{t(lang, 'orDivider')}</span>
                  <div className="flex-1 h-px bg-slate-700/60" />
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {!googleUser && (
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">{t(lang, 'nameLabel')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t(lang, 'namePlaceholder')}
                    maxLength={30}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition-colors text-sm"
                    required
                  />
                </div>
              )}
              {!googleUser && (
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">{t(lang, 'emailLabel')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t(lang, 'emailPlaceholder')}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition-colors text-sm"
                    required
                  />
                  <p className="text-slate-600 text-xs mt-1 ml-1">{t(lang, 'emailHint')}</p>
                </div>
              )}

              {status === 'error' && <p className="text-rose-400 text-sm text-center">{t(lang, 'saveError')}</p>}
              {status === 'profanity' && <p className="text-rose-400 text-sm text-center">{t(lang, 'profanityError')}</p>}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer mt-1"
              >
                {status === 'loading' ? t(lang, 'submitting') : t(lang, 'submitBtn')}
              </button>
              <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm transition-colors py-1 cursor-pointer">
                {t(lang, 'skip')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
