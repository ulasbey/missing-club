import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { getDailyQuestions, getTodayStr, getDailyResult, saveDailyResult, formatDailyShare, getDailyNumber } from '../lib/daily'
import TransferTimeline from './TransferTimeline'
import MultipleChoice from './MultipleChoice'
import { t } from '../lib/i18n'
import { saveDailyScore, fetchDailyLeaderboard } from '../lib/supabase'
import { containsProfanity } from '../lib/profanity'

const REVEAL_INTERVAL = 1.5
const INITIAL_REVEAL = 2
const SAVED_NAME_KEY = 'footballQuiz_savedName'

function getDailySavedKey(date) {
  return `footballQuiz_dailySaved_${date}`
}

function getYesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function BootIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white/90">
      <path d="M3 4.5C3 3.7 3.7 3 4.5 3H11l2 3h3.5c.3 0 .5.2.5.5V10H3V4.5z"/>
      <rect x="3" y="11" width="14" height="2.5" rx="1"/>
      <circle cx="5.5" cy="15.5" r="1"/>
      <circle cx="9" cy="15.5" r="1"/>
      <circle cx="12.5" cy="15.5" r="1"/>
      <circle cx="16" cy="15.5" r="1"/>
    </svg>
  )
}

function timeAgo(dateStr, lang) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return t(lang, 'agoJust')
  if (diff < 3600) return t(lang, 'agoMin', Math.floor(diff / 60))
  if (diff < 86400) return t(lang, 'agoHour', Math.floor(diff / 3600))
  return t(lang, 'agoDay', Math.floor(diff / 86400))
}

export default function DailyChallenge({ onClose, lang = 'en', googleUser = null }) {
  const today = getTodayStr()
  const yesterday = useMemo(getYesterdayStr, [])
  const dailyNum = getDailyNumber(today)
  const questions = useMemo(() => getDailyQuestions(today), [today])
  const existingResult = getDailyResult(today)

  const [phase, setPhase] = useState(existingResult ? 'result' : 'playing')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [results, setResults] = useState(existingResult?.results || [])
  const [finalScore, setFinalScore] = useState(existingResult?.score || 0)
  const [copied, setCopied] = useState(false)
  const [revealCount, setRevealCount] = useState(0)
  const revealTimerRef = useRef(null)

  // Daily leaderboard
  const [savedToBoard, setSavedToBoard] = useState(() => !!localStorage.getItem(getDailySavedKey(today)))
  const [nameInput, setNameInput] = useState(() => googleUser?.user_metadata?.full_name || localStorage.getItem(SAVED_NAME_KEY) || '')
  const [savingToBoard, setSavingToBoard] = useState(false)
  const [saveBoardError, setSaveBoardError] = useState(false)
  const [showBoard, setShowBoard] = useState(false)
  const [boardData, setBoardData] = useState([])
  const [boardLoading, setBoardLoading] = useState(false)
  const [yesterdayChamp, setYesterdayChamp] = useState(null)

  const currentPlayer = questions[currentIndex] || null

  // Fetch yesterday's champion on mount
  useEffect(() => {
    fetchDailyLeaderboard(yesterday).then(({ data }) => {
      if (data && data.length > 0) setYesterdayChamp(data[0])
    }).catch(() => {})
  }, [yesterday])

  // Fetch board when showBoard is toggled on
  useEffect(() => {
    if (!showBoard) return
    setBoardLoading(true)
    fetchDailyLeaderboard(today).then(({ data }) => {
      setBoardData(data || [])
      setBoardLoading(false)
    }).catch(() => setBoardLoading(false))
  }, [showBoard, today])

  // Progressive reveal
  useEffect(() => {
    if (revealTimerRef.current) clearInterval(revealTimerRef.current)
    if (!currentPlayer || phase !== 'playing') { setRevealCount(0); return }
    const totalLogos = currentPlayer.path.length
    setRevealCount(Math.min(INITIAL_REVEAL, totalLogos))
    revealTimerRef.current = setInterval(() => {
      setRevealCount(prev => {
        const next = prev + 1
        if (next >= totalLogos) { clearInterval(revealTimerRef.current); return totalLogos }
        return next
      })
    }, REVEAL_INTERVAL * 1000)
    return () => clearInterval(revealTimerRef.current)
  }, [currentIndex, currentPlayer, phase])

  const displayOptions = useMemo(() => {
    if (!currentPlayer) return []
    return shuffleArray(currentPlayer.options.slice(0, 5))
  }, [currentPlayer])

  const handleAnswer = useCallback((isCorrect, timeLeft = 0) => {
    const points = isCorrect ? Math.round(timeLeft * 50) + 500 : 0
    const newScore = score + points
    const newResults = [...results, isCorrect]
    setScore(newScore)
    setResults(newResults)
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1)
    } else {
      saveDailyResult(today, { results: newResults, score: newScore })
      setFinalScore(newScore)
      setPhase('result')
    }
  }, [score, results, currentIndex, questions.length, today])

  const handleShare = () => {
    const text = formatDailyShare(results, today, finalScore)
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  const handleSaveToBoard = async () => {
    const name = (googleUser?.user_metadata?.full_name || nameInput).trim()
    if (!name) return
    if (containsProfanity(name)) { setSaveBoardError(true); return }
    setSavingToBoard(true)
    setSaveBoardError(false)
    const avatarUrl = googleUser?.user_metadata?.avatar_url || null
    const { error } = await saveDailyScore({
      name,
      score: finalScore,
      correctCount: results.filter(Boolean).length,
      date: today,
      avatarUrl,
    })
    setSavingToBoard(false)
    if (error) { setSaveBoardError(true); return }
    localStorage.setItem(getDailySavedKey(today), '1')
    if (!googleUser) localStorage.setItem(SAVED_NAME_KEY, name)
    setSavedToBoard(true)
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-700/50 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-extrabold text-white">
              {showBoard ? t(lang, 'dailyBoard') : t(lang, 'dailyTitle')}
              {!showBoard && <span className="text-slate-500 font-normal text-sm"> #{dailyNum}</span>}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {showBoard ? today : t(lang, 'dailySub')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {showBoard && (
              <button onClick={() => setShowBoard(false)} className="text-slate-400 hover:text-white transition-colors text-sm cursor-pointer font-medium">
                ← Back
              </button>
            )}
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-xl cursor-pointer leading-none">✕</button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">

          {/* ── Board view ── */}
          {showBoard && (
            <div className="p-4">
              {/* Yesterday's champ */}
              {yesterdayChamp && (
                <div className="mb-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
                  <span className="text-xl shrink-0">🏆</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">{t(lang, 'dailyYestChamp')}</p>
                    <p className="text-white font-bold text-sm truncate">{yesterdayChamp.name}</p>
                  </div>
                  <span className="text-amber-400 font-black text-sm shrink-0">{yesterdayChamp.score.toLocaleString()}</span>
                </div>
              )}

              {boardLoading && <div className="text-center py-8 text-slate-500">{t(lang, 'loading')}</div>}
              {!boardLoading && boardData.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">{t(lang, 'noScores')}</div>
              )}
              {!boardLoading && boardData.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl mb-1.5 ${i === 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-slate-800/40 border border-transparent'}`}
                >
                  <span className={`text-sm font-black w-5 text-center shrink-0 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-700' : 'text-slate-600'}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </span>
                  {s.avatar_url ? (
                    <img src={s.avatar_url} alt="" className="w-7 h-7 rounded-full shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-cyan-600 flex items-center justify-center shrink-0">
                      <BootIcon />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{s.name}</p>
                    <p className="text-xs text-slate-500">
                      {s.correct_count}/5 · {timeAgo(s.created_at, lang)}
                    </p>
                  </div>
                  <span className="text-emerald-400 font-black text-sm shrink-0">{s.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Playing phase ── */}
          {!showBoard && phase === 'playing' && currentPlayer && (
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-center gap-2">
                {questions.map((_, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i < currentIndex ? (results[i] ? 'bg-emerald-400' : 'bg-rose-400') :
                    i === currentIndex ? 'bg-white scale-125' : 'bg-slate-700'
                  }`} />
                ))}
              </div>
              <TransferTimeline path={currentPlayer.path} revealCount={revealCount} />
              <MultipleChoice
                key={currentPlayer.id}
                options={displayOptions}
                correctAnswer={currentPlayer.name}
                playerName={currentPlayer.name}
                playerPhoto={currentPlayer.photo}
                onAnswer={handleAnswer}
                timerDuration={10}
              />
            </div>
          )}

          {/* ── Result phase ── */}
          {!showBoard && phase === 'result' && (
            <div className="p-6 flex flex-col gap-4">
              <div className="text-center">
                <p className="text-4xl mb-2">
                  {results.filter(Boolean).length === 5 ? '🏆' : results.filter(Boolean).length >= 3 ? '⚽' : '😅'}
                </p>
                <h3 className="text-2xl font-black text-white">
                  {results.filter(Boolean).length}/5 {t(lang, 'dailyCorrect')}
                </h3>
                <p className="text-slate-400 text-sm mt-1">{finalScore.toLocaleString()} pts</p>
              </div>

              {/* Emoji grid */}
              <div className="flex justify-center gap-2 text-3xl">
                {results.map((r, i) => <span key={i}>{r ? '🟩' : '🟥'}</span>)}
              </div>

              {/* Yesterday's champion */}
              {yesterdayChamp && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
                  <span className="text-lg shrink-0">🏆</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">{t(lang, 'dailyYestChamp')}</p>
                    <p className="text-white text-sm font-bold truncate">{yesterdayChamp.name} — {yesterdayChamp.score.toLocaleString()} pts</p>
                  </div>
                </div>
              )}

              {/* Save to board */}
              {savedToBoard ? (
                <div className="text-center text-emerald-400 text-sm font-bold py-1">✅ {t(lang, 'dailySaved')}</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {googleUser ? (
                    <div className="flex items-center gap-2 bg-slate-800/40 rounded-xl px-3 py-2.5 border border-slate-700/30">
                      {googleUser.user_metadata?.avatar_url && (
                        <img src={googleUser.user_metadata.avatar_url} alt="" className="w-6 h-6 rounded-full shrink-0" referrerPolicy="no-referrer" />
                      )}
                      <span className="text-slate-300 text-sm truncate">{googleUser.user_metadata?.full_name || googleUser.email}</span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      placeholder={t(lang, 'namePlaceholder')}
                      className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50"
                      maxLength={30}
                    />
                  )}
                  <button
                    onClick={handleSaveToBoard}
                    disabled={savingToBoard || (!googleUser && !nameInput.trim())}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {savingToBoard ? t(lang, 'dailySaving') : t(lang, 'dailySave')}
                  </button>
                  {saveBoardError && <p className="text-rose-400 text-xs text-center">{t(lang, 'dailySaveError')}</p>}
                </div>
              )}

              {/* View board */}
              <button
                onClick={() => setShowBoard(true)}
                className="w-full py-3 bg-slate-800/60 text-slate-300 rounded-xl font-bold border border-slate-700/50 hover:border-cyan-500/40 hover:text-white transition-all cursor-pointer"
              >
                {t(lang, 'dailyBoard')}
              </button>

              {/* Share */}
              <button
                onClick={handleShare}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                {copied ? t(lang, 'dailyCopied') : t(lang, 'dailyShare')}
              </button>

              <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm transition-colors cursor-pointer">
                {t(lang, 'dailyClose')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
