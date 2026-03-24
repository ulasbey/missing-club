import { useState, useEffect } from 'react'
import { createLeague, fetchLeague, saveLeagueScore, fetchLeagueScores } from '../lib/supabase'
import { containsProfanity } from '../lib/profanity'
import { t } from '../lib/i18n'

const CODE_KEY = 'footballQuiz_leagueCode'
const LNAME_KEY = 'footballQuiz_leagueName'
const PLAYER_KEY = 'footballQuiz_savedName'

function generateCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let c = ''
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)]
  return c
}

export default function FriendLeague({ lang, googleUser, onClose, gameResult }) {
  const [tab, setTab] = useState('create')
  const [leagueName, setLeagueName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [active, setActive] = useState(null) // { code, name }
  const [scores, setScores] = useState([])
  const [scoresLoading, setScoresLoading] = useState(false)
  const [status, setStatus] = useState('idle') // idle | loading | error | notfound
  const [playerName, setPlayerName] = useState(
    () => googleUser?.user_metadata?.full_name || googleUser?.user_metadata?.name || localStorage.getItem(PLAYER_KEY) || ''
  )
  const [savedScore, setSavedScore] = useState(false)
  const [savingScore, setSavingScore] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)

  // Load active league from localStorage
  useEffect(() => {
    const code = localStorage.getItem(CODE_KEY)
    const name = localStorage.getItem(LNAME_KEY)
    if (code && name) setActive({ code, name })
  }, [])

  // Load scores when active league set
  useEffect(() => {
    if (!active) return
    setScoresLoading(true)
    fetchLeagueScores(active.code).then(({ data }) => {
      setScores(data || [])
      setScoresLoading(false)
    })
  }, [active])

  const handleCreate = async () => {
    if (!leagueName.trim()) return
    if (containsProfanity(leagueName)) { setStatus('profanity'); return }
    setStatus('loading')
    const code = generateCode()
    const { error } = await createLeague(leagueName.trim(), code)
    if (error) { setStatus('error'); return }
    localStorage.setItem(CODE_KEY, code)
    localStorage.setItem(LNAME_KEY, leagueName.trim())
    setActive({ code, name: leagueName.trim() })
    setStatus('idle')
  }

  const handleJoin = async () => {
    if (joinCode.trim().length < 4) return
    const code = joinCode.trim().toUpperCase()
    setStatus('loading')
    const { data, error } = await fetchLeague(code)
    if (error || !data?.length) { setStatus('notfound'); return }
    const name = data[0].name
    localStorage.setItem(CODE_KEY, code)
    localStorage.setItem(LNAME_KEY, name)
    setActive({ code, name })
    setStatus('idle')
  }

  const handleLeave = () => {
    localStorage.removeItem(CODE_KEY)
    localStorage.removeItem(LNAME_KEY)
    setActive(null)
    setScores([])
    setSavedScore(false)
    setStatus('idle')
  }

  const handleSaveScore = async () => {
    if (!playerName.trim() || !gameResult || !active) return
    if (containsProfanity(playerName)) { setSaveError(true); return }
    setSavingScore(true)
    setSaveError(false)
    localStorage.setItem(PLAYER_KEY, playerName.trim())
    const { error } = await saveLeagueScore({
      leagueCode: active.code,
      playerName: playerName.trim(),
      score: gameResult.score,
      correctCount: gameResult.correctCount,
      totalQuestions: gameResult.totalQuestions,
      difficulty: gameResult.difficulty,
      avatarUrl: gameResult.avatarUrl || null,
    })
    if (error) { setSaveError(true); setSavingScore(false); return }
    setSavedScore(true)
    setSavingScore(false)
    const { data } = await fetchLeagueScores(active.code)
    setScores(data || [])
  }

  const copyCode = () => {
    navigator.clipboard.writeText(active.code).then(() => {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    })
  }

  // ── ACTIVE LEAGUE VIEW ──
  if (active) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-sm shadow-2xl animate-card-reveal flex flex-col" style={{ maxHeight: '90dvh' }}>

          {/* Header */}
          <div className="p-5 border-b border-slate-700/50 shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-white font-black text-lg leading-tight">{active.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-slate-500 text-sm font-mono tracking-widest">{active.code}</span>
                  <button onClick={copyCode} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer">
                    {codeCopied ? t(lang, 'leagueCopied') : t(lang, 'leagueCopyCode')}
                  </button>
                </div>
              </div>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-500 hover:text-white hover:bg-slate-700/60 transition-all cursor-pointer text-sm shrink-0">
                ✕
              </button>
            </div>
          </div>

          {/* Save score */}
          {gameResult && !savedScore && (
            <div className="p-4 border-b border-slate-700/50 bg-slate-800/30 shrink-0">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
                {t(lang, 'leagueSaveScore')} · <span className="text-emerald-400 font-bold">{gameResult.score.toLocaleString()} pts · {gameResult.difficulty}</span>
              </p>
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder={t(lang, 'leaguePlayerNamePlaceholder')}
                maxLength={30}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm mb-2 focus:outline-none focus:border-emerald-500/60 transition-colors"
              />
              {saveError && <p className="text-rose-400 text-xs mb-2">{t(lang, 'leagueSaveError')}</p>}
              <button
                onClick={handleSaveScore}
                disabled={savingScore || !playerName.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {savingScore ? t(lang, 'leagueSaving') : t(lang, 'leagueSaveScoreBtn')}
              </button>
            </div>
          )}
          {gameResult && savedScore && (
            <div className="p-3 border-b border-slate-700/50 bg-emerald-500/10 text-center shrink-0">
              <p className="text-emerald-400 text-sm font-bold">{t(lang, 'leagueSaved')}</p>
            </div>
          )}

          {/* Leaderboard */}
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-xs text-slate-600 uppercase tracking-widest font-bold mb-3">Top Scores</p>
            {scoresLoading ? (
              <p className="text-slate-500 text-sm text-center py-6">{t(lang, 'loading')}</p>
            ) : scores.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">{t(lang, 'leagueNoScores')}</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {scores.map((s, i) => (
                  <div key={i} className="flex items-center gap-2.5 bg-slate-800/40 rounded-xl px-3 py-2.5 border border-slate-700/30">
                    <span className={`text-sm font-black w-5 text-center shrink-0 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'}`}>
                      {i + 1}
                    </span>
                    {s.avatar_url
                      ? <img src={s.avatar_url} alt="" className="w-6 h-6 rounded-full shrink-0" referrerPolicy="no-referrer" />
                      : <div className="w-6 h-6 rounded-full bg-slate-700 shrink-0" />
                    }
                    <span className="flex-1 text-sm text-white font-semibold truncate">{s.player_name}</span>
                    <span className="text-[11px] text-slate-500 shrink-0">{s.difficulty}</span>
                    <span className="text-sm font-bold text-emerald-400 shrink-0">{s.score.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700/50 shrink-0">
            <button onClick={handleLeave} className="w-full text-slate-600 hover:text-slate-400 text-sm transition-colors py-1 cursor-pointer">
              {t(lang, 'leagueLeave')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── CREATE / JOIN VIEW ──
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-sm p-5 shadow-2xl animate-card-reveal">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-black text-lg">{t(lang, 'leagueTitle')}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-500 hover:text-white hover:bg-slate-700/60 transition-all cursor-pointer text-sm">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800 rounded-xl p-1 mb-5">
          {['create', 'join'].map(key => (
            <button
              key={key}
              onClick={() => { setTab(key); setStatus('idle') }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${tab === key ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {key === 'create' ? t(lang, 'leagueCreate') : t(lang, 'leagueJoin')}
            </button>
          ))}
        </div>

        {tab === 'create' ? (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">{t(lang, 'leagueLeagueName')}</label>
              <input
                type="text"
                value={leagueName}
                onChange={e => setLeagueName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder={t(lang, 'leagueLeagueNamePlaceholder')}
                maxLength={40}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition-colors text-sm"
              />
            </div>
            {status === 'error' && <p className="text-rose-400 text-sm text-center">{t(lang, 'saveError')}</p>}
            {status === 'profanity' && <p className="text-rose-400 text-sm text-center">{t(lang, 'profanityError')}</p>}
            <button
              onClick={handleCreate}
              disabled={status === 'loading' || !leagueName.trim()}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {status === 'loading' ? t(lang, 'leagueSaving') : t(lang, 'leagueCreateBtn')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">{t(lang, 'leagueCodeLabel')}</label>
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder={t(lang, 'leagueCodePlaceholder')}
                maxLength={6}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition-colors text-sm font-mono tracking-widest"
              />
            </div>
            {status === 'notfound' && <p className="text-rose-400 text-sm text-center">{t(lang, 'leagueNotFound')}</p>}
            {status === 'error' && <p className="text-rose-400 text-sm text-center">{t(lang, 'saveError')}</p>}
            <button
              onClick={handleJoin}
              disabled={status === 'loading' || joinCode.length < 4}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {status === 'loading' ? t(lang, 'leagueSaving') : t(lang, 'leagueJoinBtn')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
