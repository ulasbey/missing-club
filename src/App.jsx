import { useState, useCallback, useMemo, useEffect, useRef, lazy, Suspense } from 'react'
import TransferTimeline from './components/TransferTimeline'
import MultipleChoice from './components/MultipleChoice'
import PlayerCard from './components/PlayerCard'
import ScoreBoard, { getPersonalBest, saveGameScore } from './components/ScoreBoard'
const SaveScoreModal   = lazy(() => import('./components/SaveScoreModal'))
const GlobalLeaderboard = lazy(() => import('./components/GlobalLeaderboard'))
const StatsModal       = lazy(() => import('./components/StatsModal'))
const DailyChallenge   = lazy(() => import('./components/DailyChallenge'))
const FriendLeague     = lazy(() => import('./components/FriendLeague'))
const HowToPlay        = lazy(() => import('./components/HowToPlay'))
const ProfileView      = lazy(() => import('./components/ProfileView'))
import allPlayersRaw from './data/players.json'
const allPlayers = Array.isArray(allPlayersRaw) ? allPlayersRaw : (allPlayersRaw.default || [])
console.log("Players Data:", allPlayers)
const allClubs = Array.from(new Set(allPlayers.flatMap(p => p.path ? p.path.map(t => t.club) : [])))
import { LANGUAGES, getDeviceLang, t } from './lib/i18n'
import { recordGame } from './lib/stats'
import { getDailyResult, getTodayStr } from './lib/daily'
import { supabase } from './lib/supabase'
import { isSoundOn, toggleSound, playComplete, playGameOver } from './lib/sounds'
import { shareResult } from './lib/shareCard'
import { getStats } from './lib/stats'

/* ── Difficulty configs ── */
const DIFFICULTIES = {
  Casual: {
    timer: 0, optionCount: 5, label: 'Casual', descKey: 'casualDesc',
    color: 'emerald', icon: '🎮',
    progressiveReveal: false, gameOverOnWrong: false, questionLimit: null, blindMode: false,
  },
  Pro: {
    timer: 15, optionCount: 5, label: 'Pro', descKey: 'proDesc',
    color: 'amber', icon: '🏟️',
    progressiveReveal: false, gameOverOnWrong: false, questionLimit: 15, blindMode: true,
  },
  Scout: {
    timer: 10, optionCount: 5, label: 'Scout', descKey: 'scoutDesc',
    color: 'blue', icon: '🔭',
    progressiveReveal: true, gameOverOnWrong: false, questionLimit: 15, blindMode: false,
  },
  Pundit: {
    timer: 7, optionCount: 5, label: 'Pundit', descKey: 'punditDesc',
    color: 'purple', icon: '📺',
    progressiveReveal: false, gameOverOnWrong: false, questionLimit: null,
    maxLives: 3, blindMode: false,
  },
  Legend: {
    timer: 5, optionCount: 5, label: 'Legend', descKey: 'legendDesc',
    color: 'rose', icon: '💀',
    progressiveReveal: true, gameOverOnWrong: true, questionLimit: null, blindMode: true,
  },
  Secret: {
    timer: 10, optionCount: 5, label: '?', descKey: null,
    color: 'emerald', icon: '🤫',
    progressiveReveal: false, gameOverOnWrong: false, questionLimit: 5, blindMode: true,
  },
}

const REVEAL_INTERVAL = 1.5
const INITIAL_REVEAL = 2

/* ── Scoring helpers ── */
const MODE_MULTIPLIER = { Casual: 0.5, Pro: 1.0, Scout: 1.5, Pundit: 1.3, Legend: 2.0, Secret: 1.0 }
const DIFF_MULTIPLIER = { Easy: 0.8, Medium: 1.0, Hard: 1.3, 'Very Hard': 1.6 }

function calcPoints({ isCorrect, timeLeft, timerDuration, difficulty, playerDifficulty, streak }) {
  if (!isCorrect) return { points: 0, breakdown: null }
  const base = 500
  const timeBonus = Math.round(timeLeft * 50)
  const modeMult = MODE_MULTIPLIER[difficulty] ?? 1.0
  const diffMult = DIFF_MULTIPLIER[playerDifficulty] ?? 1.0
  // Speed bonus: answered in first 25% of timer
  const speedBonus = timerDuration > 0 && timeLeft >= timerDuration * 0.75 ? 150 : 0
  // Streak bonus: every 3 consecutive correct answers adds ×0.5
  const streakTier = streak >= 3 ? Math.floor(streak / 3) : 0
  const streakMult = streakTier > 0 ? 1 + streakTier * 0.5 : 1
  const points = Math.round((base + timeBonus + speedBonus) * modeMult * diffMult * streakMult)
  return { points, breakdown: { points, modeMult, diffMult, speedBonus, streakTier, multiplier: streakMult } }
}

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function App() {
  console.log("App Rendering...")

  if (!allPlayers || allPlayers.length === 0) {
    return <div className="text-white bg-slate-900 min-h-screen flex items-center justify-center p-10 text-center font-bold">Error: players.json could not be loaded or is empty.</div>
  }

  const [lang, setLang] = useState(getDeviceLang)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [gamePhase, setGamePhase] = useState('menu')
  const [difficulty, setDifficulty] = useState(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [personalBest, setPersonalBest] = useState(getPersonalBest())

  const changeLang = (code) => {
    setLang(code)
    localStorage.setItem('footballQuiz_lang', code)
    setShowLangMenu(false)
  }

  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showGlobalLeaderboard, setShowGlobalLeaderboard] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showDaily, setShowDaily] = useState(false)
  const [googleUser, setGoogleUser] = useState(null)
  const dailyDone = !!getDailyResult(getTodayStr())

  // Google OAuth: restore session + handle redirect-back
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setGoogleUser(session.user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setGoogleUser(session.user)
        const raw = localStorage.getItem('footballQuiz_pendingScore')
        if (raw) {
          try {
            const d = JSON.parse(raw)
            localStorage.removeItem('footballQuiz_pendingScore')
            setScore(d.score)
            setCorrectCount(d.correctCount)
            setDifficulty(d.difficulty)
            setPersonalBest(getPersonalBest())
            setQuestionOrder(new Array(d.totalQuestions).fill({ name: '', path: [], options: [] }))
            setCurrentIndex(d.totalQuestions)
            setLegendGameOver(false)
            setGamePhase('finished')
            setShowSaveModal(true)
          } catch {}
        }
      } else if (event === 'SIGNED_OUT') {
        setGoogleUser(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const [questionOrder, setQuestionOrder] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [lastPoints, setLastPoints] = useState(null)
  const [legendGameOver, setLegendGameOver] = useState(false)

  const [livesLeft, setLivesLeft] = useState(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [soundOn, setSoundOn] = useState(isSoundOn)
  const [showLeague, setShowLeague] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(() => !localStorage.getItem('footballQuiz_htpSeen'))
  const [leagueGameResult, setLeagueGameResult] = useState(null)
  const [resultShared, setResultShared] = useState('')
  const secretClickRef = useRef(0)
  const secretClickTimerRef = useRef(null)
  const [revealCount, setRevealCount] = useState(0)
  const revealTimerRef = useRef(null)
  
  const [disabledOptions, setDisabledOptions] = useState([])
  const [showStreakPopup, setShowStreakPopup] = useState(false)

  const totalQuestions = questionOrder.length
  const currentPlayer = questionOrder[currentIndex] || null
  const config = difficulty ? DIFFICULTIES[difficulty] : null

  // Console log selected player and masked index
  useEffect(() => {
    if (currentPlayer) {
      console.log("Current Player Selected:", currentPlayer.name, "Masked Index:", currentPlayer.maskedIndex, "Missing Club:", currentPlayer.correctClub)
    }
  }, [currentPlayer])

  /* ── Progressive reveal timer ── */
  useEffect(() => {
    if (revealTimerRef.current) clearInterval(revealTimerRef.current)

    if (!config?.progressiveReveal || !currentPlayer || gamePhase !== 'playing') {
      setRevealCount(0)
      return
    }

    const totalLogos = currentPlayer.path.length
    setRevealCount(Math.min(INITIAL_REVEAL, totalLogos))

    revealTimerRef.current = setInterval(() => {
      setRevealCount((prev) => {
        const next = prev + 1
        if (next >= totalLogos) {
          clearInterval(revealTimerRef.current)
          return totalLogos
        }
        return next
      })
    }, REVEAL_INTERVAL * 1000)

    return () => clearInterval(revealTimerRef.current)
  }, [currentIndex, config, currentPlayer, gamePhase])

  const displayOptions = useMemo(() => {
    if (!currentPlayer || !config) return []
    return currentPlayer.clubOptions.slice(0, config.optionCount)
  }, [currentPlayer, config])

  const startGame = useCallback((diff) => {
    try {
      const cfg = DIFFICULTIES[diff]
      setDifficulty(diff)
      const validPlayers = allPlayers.filter(p => !!p && !!p.name && Array.isArray(p.path) && p.path.length > 0)
      
      const pool = shuffleArray(validPlayers).map(player => {
        const pathLength = player.path.length
        let maskedIndex = Math.floor(Math.random() * pathLength)
        
        // Scout/Legend logic: maskedIndex must be in first 3 items
        if (diff === 'Scout' || diff === 'Legend') {
          maskedIndex = Math.floor(Math.random() * Math.min(3, pathLength))
        }

        const correctClub = player.path[maskedIndex]?.club || 'Unknown'
        const playerClubs = player.path.map(t => t?.club || '')
        
        let options = [correctClub]
        // Pick 4 random distractors from allClubs
        let attempts = 0
        while (options.length < 5 && attempts < 50) {
          attempts++
          const randomClub = allClubs[Math.floor(Math.random() * allClubs.length)]
          if (randomClub && !options.includes(randomClub) && !playerClubs.includes(randomClub)) {
            options.push(randomClub)
          }
        }
        
        return { ...player, maskedIndex, correctClub, clubOptions: shuffleArray(options) }
      })
      setQuestionOrder(cfg.questionLimit ? pool.slice(0, cfg.questionLimit) : pool)
      setCurrentIndex(0)
      setScore(0)
      setCorrectCount(0)
      setStreak(0)
      setLastPoints(null)
      setLegendGameOver(false)
      setLivesLeft(cfg.maxLives ?? null)
      setRevealCount(0)
      setShowSaveModal(false)
      setDisabledOptions([])
      setGamePhase('playing')
    } catch (err) {
      console.error("Crash inside startGame logic: ", err)
    }
  }, [])

  const handleAnswer = useCallback((isCorrect, timeLeft = 0) => {
    const timerDuration = config?.timer || 0
    const newStreak = isCorrect ? streak + 1 : 0

    if (isCorrect) {
      playCorrect()
      if (newStreak >= 3) {
        setShowStreakPopup(true)
        setTimeout(() => setShowStreakPopup(false), 1200)
      }
    } else {
      playWrong()
    }

    const { points, breakdown } = calcPoints({
      isCorrect,
      timeLeft,
      timerDuration,
      difficulty,
      playerDifficulty: currentPlayer?.difficulty,
      streak: newStreak,
    })

    const newScore = score + points
    const newCorrect = isCorrect ? correctCount + 1 : correctCount

    setScore(newScore)
    setCorrectCount(newCorrect)
    setStreak(newStreak)
    setLastPoints(isCorrect ? { points, breakdown } : null)

    // Handle Pundit lives
    if (!isCorrect && livesLeft !== null) {
      const newLives = livesLeft - 1
      setLivesLeft(newLives)
      if (newLives === 0) {
        setLegendGameOver(true)
        if (difficulty !== 'Casual') {
          const board = saveGameScore(newScore, difficulty, newCorrect, currentIndex + 1)
          setPersonalBest(board[0]?.score || newScore)
          recordGame({ difficulty, correctCount: newCorrect, totalQuestions: currentIndex + 1, score: newScore })
        }
        playGameOver()
        setGamePhase('finished')
        return
      }
    }

    if (!isCorrect && config?.gameOverOnWrong) {
      setLegendGameOver(true)
      if (difficulty !== 'Casual') {
        const board = saveGameScore(newScore, difficulty, newCorrect, currentIndex + 1)
        setPersonalBest(board[0]?.score || newScore)
        recordGame({ difficulty, correctCount: newCorrect, totalQuestions: currentIndex + 1, score: newScore })
      }
      playGameOver()
      setGamePhase('finished')
      return
    }

    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex(currentIndex + 1)
    } else {
      if (difficulty !== 'Casual' && difficulty !== 'Secret') {
        const board = saveGameScore(newScore, difficulty, newCorrect, totalQuestions)
        setPersonalBest(board[0]?.score || newScore)
        recordGame({ difficulty, correctCount: newCorrect, totalQuestions, score: newScore })
      }
      playComplete()
      setGamePhase('finished')
    }
  }, [config, streak, score, correctCount, currentIndex, totalQuestions, difficulty, livesLeft])

  const handleRestart = () => {
    setPersonalBest(getPersonalBest())
    setGamePhase('menu')
    setDifficulty(null)
    setLegendGameOver(false)
    setLivesLeft(null)
    setResultShared(false)
  }

  // Reset hint on next question
  useEffect(() => {
    setDisabledOptions([])
  }, [currentIndex])

  const handleHint = useCallback(() => {
    if (score < 1000 || disabledOptions.length > 0 || !currentPlayer) return
    setScore(prev => prev - 1000)
    
    const wrongOptions = currentPlayer.clubOptions.filter(o => o !== currentPlayer.correctClub)
    const shuffledWrong = shuffleArray(wrongOptions)
    setDisabledOptions([shuffledWrong[0], shuffledWrong[1]])
  }, [score, disabledOptions, currentPlayer])

  const handleFinishEarly = useCallback(() => {
    const questionsPlayed = currentIndex
    if (questionsPlayed === 0) { handleRestart(); return }
    if (difficulty !== 'Casual' && difficulty !== 'Secret') {
      const board = saveGameScore(score, difficulty, correctCount, questionsPlayed)
      setPersonalBest(board[0]?.score || score)
      recordGame({ difficulty, correctCount, totalQuestions: questionsPlayed, score })
    }
    setGamePhase('finished')
  }, [score, difficulty, correctCount, currentIndex])

  /* ════════════════════════════════════════════
     ██  MENU SCREEN
     ════════════════════════════════════════════ */
  if (gamePhase === 'menu') {
    const colors = {
      emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/60 active:border-emerald-500/70 active:bg-emerald-500/15',
      amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/30 hover:border-amber-500/60 active:border-amber-500/70 active:bg-amber-500/15',
      blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/30 hover:border-blue-500/60 active:border-blue-500/70 active:bg-blue-500/15',
      purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/30 hover:border-purple-500/60 active:border-purple-500/70 active:bg-purple-500/15',
      rose: 'from-rose-500/10 to-rose-500/5 border-rose-500/30 hover:border-rose-500/60 active:border-rose-500/70 active:bg-rose-500/15',
    }
    const textColors = { emerald: 'text-emerald-400', amber: 'text-amber-400', blue: 'text-blue-400', purple: 'text-purple-400', rose: 'text-rose-400' }
    const currentLang = LANGUAGES.find(l => l.code === lang)

    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        <div className="pointer-events-none absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />

        {/* Sound toggle — fixed top left */}
        <button
          onClick={() => { const next = toggleSound(); setSoundOn(next) }}
          className="fixed top-4 left-4 z-50 w-9 h-9 flex items-center justify-center bg-slate-800/90 border border-slate-700/60 rounded-xl text-lg hover:border-slate-500 transition-all cursor-pointer shadow-lg backdrop-blur-sm"
          title={soundOn ? 'Mute' : 'Unmute'}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>

        {/* Profile button — fixed top left, next to sound toggle */}
        <button
          onClick={() => setShowProfile(true)}
          className="fixed top-4 left-14 z-50 w-9 h-9 flex items-center justify-center bg-slate-800/90 border border-slate-700/60 rounded-xl hover:border-slate-500 transition-all cursor-pointer shadow-lg backdrop-blur-sm overflow-hidden"
        >
          {googleUser?.user_metadata?.avatar_url ? (
            <img src={googleUser.user_metadata.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-slate-400 text-base">👤</span>
          )}
        </button>

        {/* Language switcher — fixed top right for mobile portrait */}
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setShowLangMenu(v => !v)}
            className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/60 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 hover:border-slate-500 transition-all cursor-pointer shadow-lg backdrop-blur-sm"
          >
            <img src={currentLang?.flag} alt={currentLang?.code} className="w-5 h-auto rounded-sm" />
            <span className="hidden sm:inline">{currentLang?.name}</span>
            <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showLangMenu && (
            <div className="absolute right-0 mt-1 bg-slate-800 border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden w-40">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => changeLang(l.code)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors cursor-pointer ${lang === l.code ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-300 hover:bg-slate-700'}`}
                >
                  <img src={l.flag} alt={l.code} className="w-5 h-auto rounded-sm" />
                  <span>{l.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative z-10 text-center max-w-md w-full">
          <div className="mb-6 sm:mb-8">
            <span
              className="text-5xl sm:text-6xl mb-3 sm:mb-4 block cursor-default select-none"
              onClick={() => {
                secretClickRef.current += 1
                clearTimeout(secretClickTimerRef.current)
                if (secretClickRef.current >= 3) {
                  secretClickRef.current = 0
                  startGame('Secret')
                } else {
                  secretClickTimerRef.current = setTimeout(() => { secretClickRef.current = 0 }, 1500)
                }
              }}
            >⚽</span>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-2">
              {t(lang, 'title')}
            </h1>
            <p className="text-slate-400 text-base">{t(lang, 'subtitle')}</p>
          </div>

          {(() => {
            const s = getStats()
            if (s.totalGames === 0) return null
            return (
              <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
                {s.currentStreak > 0 && (
                  <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full px-3 py-1 font-semibold">
                    🔥 {s.currentStreak}d streak
                  </span>
                )}
                <span className="text-xs bg-slate-800/60 border border-slate-700/30 text-slate-500 rounded-full px-3 py-1">
                  {s.totalGames} {s.totalGames === 1 ? 'game' : 'games'}
                </span>
                {s.totalQuestions > 0 && (
                  <span className="text-xs bg-slate-800/60 border border-slate-700/30 text-slate-500 rounded-full px-3 py-1">
                    {Math.round(s.totalCorrect / s.totalQuestions * 100)}% accuracy
                  </span>
                )}
              </div>
            )
          })()}

          {personalBest > 0 && (
            <button
              onClick={() => setShowGlobalLeaderboard(true)}
              className="animate-fade-in-up mb-6 sm:mb-8 mx-auto inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/15 rounded-full px-4 sm:px-5 py-2 transition-all cursor-pointer select-none"
            >
              <span className="text-amber-400 text-sm font-bold">🏆 {t(lang, 'best')}:</span>
              <span className="text-white font-black text-lg">{personalBest.toLocaleString()}</span>
              <svg className="w-3.5 h-3.5 text-amber-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Daily Challenge banner */}
          <button
            onClick={() => setShowDaily(true)}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 hover:border-cyan-500/60 active:border-cyan-500/70 active:bg-cyan-500/15 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer select-none mb-3 flex items-center justify-between"
          >
            <div>
              <span className="text-lg font-bold text-cyan-400">📅 {t(lang, 'dailyBtn')}</span>
              <p className="text-slate-500 text-sm mt-0.5">{dailyDone ? `✅ ${t(lang, 'dailyAlready')}` : t(lang, 'dailySub')}</p>
            </div>
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Friend League */}
          <button
            onClick={() => { setLeagueGameResult(null); setShowLeague(true) }}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-purple-500/10 to-violet-500/10 border border-purple-500/30 hover:border-purple-500/60 active:border-purple-500/70 active:bg-purple-500/15 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer select-none mb-3 flex items-center justify-between"
          >
            <div>
              <span className="text-lg font-bold text-purple-400">{t(lang, 'leagueBtn')}</span>
              <p className="text-slate-500 text-sm mt-0.5">{t(lang, 'leagueBtnSub')}</p>
            </div>
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => setGamePhase('selectMode')}
            className="w-full py-5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-2xl font-black text-xl shadow-lg shadow-emerald-500/25 active:scale-[0.97] transition-all cursor-pointer select-none mb-6"
          >
            ▶ PLAY
          </button>

          <div className="grid grid-cols-4 gap-1 w-full animate-fade-in-up" style={{ animationDelay: '450ms' }}>
            {[
              { emoji: '📖', key: 'navHtp',    onClick: () => setShowHowToPlay(true),        color: 'hover:text-slate-200' },
              { emoji: '📊', key: 'navStats',  onClick: () => setShowStats(true),            color: 'hover:text-slate-200' },
              { emoji: '🏆', key: 'navLocal',  onClick: () => setShowLeaderboard(true),      color: 'hover:text-slate-200' },
              { emoji: '🌍', key: 'navGlobal', onClick: () => setShowGlobalLeaderboard(true), color: 'hover:text-emerald-400' },
            ].map(({ emoji, key, onClick, color }) => (
              <button key={key} onClick={onClick}
                className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-slate-500 ${color} hover:bg-slate-800/40 transition-all cursor-pointer select-none`}
              >
                <span className="text-lg leading-none">{emoji}</span>
                <span className="text-[11px] font-medium leading-tight text-center">{t(lang, key)}</span>
              </button>
            ))}
          </div>
        </div>

        <Suspense fallback={null}>
          {showLeaderboard && <ScoreBoard lang={lang} onClose={() => setShowLeaderboard(false)} />}
          {showGlobalLeaderboard && <GlobalLeaderboard lang={lang} onClose={() => setShowGlobalLeaderboard(false)} />}
          {showStats && <StatsModal lang={lang} onClose={() => setShowStats(false)} />}
          {showDaily && <DailyChallenge lang={lang} googleUser={googleUser} onClose={() => setShowDaily(false)} />}
          {showLeague && <FriendLeague lang={lang} googleUser={googleUser} gameResult={leagueGameResult} onClose={() => setShowLeague(false)} />}
          {showHowToPlay && <HowToPlay lang={lang} onClose={() => { localStorage.setItem('footballQuiz_htpSeen', '1'); setShowHowToPlay(false) }} />}
          {showProfile && <ProfileView lang={lang} googleUser={googleUser} onClose={() => setShowProfile(false)} />}
        </Suspense>
      </div>
    )
  }

  /* ════════════════════════════════════════════
     ██  SELECT MODE SCREEN
     ════════════════════════════════════════════ */
  if (gamePhase === 'selectMode') {
    const colors = {
      emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/60 active:border-emerald-500/70 active:bg-emerald-500/15',
      amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/30 hover:border-amber-500/60 active:border-amber-500/70 active:bg-amber-500/15',
      blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/30 hover:border-blue-500/60 active:border-blue-500/70 active:bg-blue-500/15',
      purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/30 hover:border-purple-500/60 active:border-purple-500/70 active:bg-purple-500/15',
      rose: 'from-rose-500/10 to-rose-500/5 border-rose-500/30 hover:border-rose-500/60 active:border-rose-500/70 active:bg-rose-500/15',
    }
    const textColors = { emerald: 'text-emerald-400', amber: 'text-amber-400', blue: 'text-blue-400', purple: 'text-purple-400', rose: 'text-rose-400' }
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="relative z-10 max-w-md w-full">
          {/* Back button */}
          <button onClick={() => setGamePhase('menu')} className="flex items-center gap-2 text-slate-500 hover:text-white mb-6 transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Missing Club</span>
          </button>

          <h2 className="text-2xl font-black text-white mb-1">Choose Mode</h2>
          <p className="text-slate-500 text-sm mb-6">Pick your challenge</p>

          {/* Casual */}
          <button onClick={() => startGame('Casual')} className={`w-full py-4 px-5 rounded-2xl bg-gradient-to-r ${colors.emerald} border backdrop-blur-sm text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer select-none mb-3 flex items-center justify-between`}>
            <div>
              <span className={`text-lg font-bold ${textColors.emerald}`}>🎮 Casual</span>
              <p className="text-slate-500 text-sm mt-0.5">{t(lang, 'casualDesc')}</p>
            </div>
            <svg className={`w-5 h-5 ${textColors.emerald}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>

          <p className="text-[11px] text-slate-600 uppercase tracking-widest font-bold mb-2 px-1">{t(lang, 'competitiveModes')}</p>
          <div className="grid grid-cols-2 gap-2.5">
            {(['Pro', 'Scout', 'Pundit', 'Legend']).map((key) => {
              const cfg = DIFFICULTIES[key]
              return (
                <button key={key} onClick={() => startGame(key)}
                  className={`py-4 px-4 rounded-2xl bg-gradient-to-r ${colors[cfg.color]} border backdrop-blur-sm text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer select-none`}
                >
                  <span className={`text-base font-bold ${textColors[cfg.color]} flex flex-col mb-1`}>
                    <div className="flex items-center gap-1.5">
                      {cfg.icon} {cfg.label}
                    </div>
                    {cfg.blindMode && <span className="mt-1 text-[10px] text-amber-500 font-bold uppercase tracking-widest bg-amber-500/10 self-start px-2 py-0.5 rounded border border-amber-500/20 inline-block">Blind Mode Active</span>}
                  </span>
                  <p className="text-slate-500 text-xs leading-snug">{t(lang, cfg.descKey)}</p>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  /* ════════════════════════════════════════════
     ██  END SCREEN
     ════════════════════════════════════════════ */
  if (gamePhase === 'finished') {
    const questionsPlayed = legendGameOver ? currentIndex + 1 : currentIndex < totalQuestions ? currentIndex : totalQuestions
    const pct = Math.round((correctCount / questionsPlayed) * 100)
    const isPunditGameOver = difficulty === 'Pundit' && legendGameOver
    const emoji = legendGameOver ? (isPunditGameOver ? '📺' : '💀') : pct === 100 ? '🏆' : pct >= 70 ? '⚽' : pct >= 40 ? '😅' : '💀'

    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 sm:p-6">
        <div className="text-center animate-card-reveal max-w-md w-full">
          <p className="text-slate-600 text-sm font-bold tracking-widest uppercase mb-5">⚽ Missing Club</p>

          <div className="relative mx-auto mb-5 sm:mb-6 w-24 h-24 sm:w-28 sm:h-28">
            <div className={`absolute inset-0 rounded-full ${legendGameOver ? 'bg-gradient-to-r from-rose-500 to-red-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-500'} opacity-20 blur-xl`} />
            <div className={`relative w-full h-full rounded-full bg-slate-800 border-2 ${legendGameOver ? 'border-rose-500/40' : 'border-emerald-500/40'} flex items-center justify-center shadow-xl`}>
              <span className="text-4xl sm:text-5xl">{emoji}</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 tracking-tight">
            {legendGameOver ? t(lang, 'gameOver') : t(lang, 'quizComplete')}
          </h1>
          <p className="text-slate-400 mb-5 sm:mb-6 text-base">
            {difficulty} Mode · {t(lang, 'correctOf', correctCount, questionsPlayed)}
            {legendGameOver && (
              <span className="text-rose-400 ml-1">{t(lang, 'streakEnded')}</span>
            )}
          </p>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5 sm:p-6 mb-5 sm:mb-6">
            <p className="text-sm text-slate-500 uppercase tracking-widest mb-1">{t(lang, 'totalScore')}</p>
            <p className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              {score.toLocaleString()}
            </p>
            {score >= personalBest && score > 0 && difficulty !== 'Casual' && (
              <p className="text-amber-400 text-sm font-bold mt-2 animate-pulse-glow">
                {t(lang, 'newBest')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5 sm:mb-6">
            <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/30">
              <p className="text-xl sm:text-2xl font-black text-emerald-400">{correctCount}</p>
              <p className="text-[11px] sm:text-xs text-slate-500 uppercase tracking-wider">{t(lang, 'correct')}</p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/30">
              <p className="text-xl sm:text-2xl font-black text-rose-400">{questionsPlayed - correctCount}</p>
              <p className="text-[11px] sm:text-xs text-slate-500 uppercase tracking-wider">{t(lang, 'wrong')}</p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/30">
              <p className="text-xl sm:text-2xl font-black text-cyan-400">{pct}%</p>
              <p className="text-[11px] sm:text-xs text-slate-500 uppercase tracking-wider">{t(lang, 'accuracy')}</p>
            </div>
          </div>

          {legendGameOver && (
            <div className={`rounded-xl p-4 mb-5 sm:mb-6 ${isPunditGameOver ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-rose-500/10 border border-rose-500/20'}`}>
              <p className={`text-base font-bold mb-1 ${isPunditGameOver ? 'text-purple-400' : 'text-rose-400'}`}>
                {isPunditGameOver ? t(lang, 'punditOver') : t(lang, 'legendOver')}
              </p>
              <p className="text-slate-400 text-sm">
                {isPunditGameOver ? t(lang, 'punditOverSub', correctCount) : t(lang, 'legendOverSub', correctCount)}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {score > 0 && difficulty !== 'Casual' && difficulty !== 'Secret' && (
              <button
                onClick={() => setShowSaveModal(true)}
                className="w-full py-4 sm:py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-bold text-base hover:opacity-90 active:scale-95 transition-all duration-200 shadow-lg shadow-emerald-500/25 cursor-pointer select-none"
              >
                {t(lang, 'saveScore')}
              </button>
            )}
            {score > 0 && difficulty !== 'Casual' && difficulty !== 'Secret' && (
              <button
                onClick={() => {
                  setLeagueGameResult({
                    score,
                    correctCount,
                    totalQuestions: questionsPlayed,
                    difficulty,
                    avatarUrl: googleUser?.user_metadata?.avatar_url || null,
                  })
                  setShowLeague(true)
                }}
                className="w-full py-3.5 bg-slate-800/60 text-purple-400 rounded-xl font-bold text-base border border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/10 active:scale-[0.97] transition-all cursor-pointer select-none"
              >
                {t(lang, 'leagueSaveScoreBtn')}
              </button>
            )}
            <button
              onClick={() => startGame(difficulty)}
              className="w-full py-5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-2xl font-black text-lg shadow-lg shadow-emerald-500/20 active:scale-[0.97] transition-all cursor-pointer select-none"
            >
              {legendGameOver ? t(lang, 'tryAgain') : t(lang, 'playAgain', difficulty)}
            </button>
            <button
              onClick={async () => {
                if (resultShared) return
                setResultShared('loading')
                const status = await shareResult({
                  mode: difficulty, score, correctCount,
                  totalQuestions: questionsPlayed, pct,
                  emoji: legendGameOver ? '💀' : pct === 100 ? '🏆' : pct >= 70 ? '⚽' : '😅',
                })
                setResultShared(status)
                if (status !== 'shared') setTimeout(() => setResultShared(''), 2800)
              }}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold text-base hover:opacity-90 active:scale-[0.97] transition-all duration-200 shadow-lg shadow-cyan-500/25 cursor-pointer select-none"
            >
              {resultShared === 'loading' ? '⏳ ...'
                : resultShared === 'copied' ? '✅ Copied!'
                : resultShared === 'downloaded' ? '✅ Saved!'
                : '📤 ' + t(lang, 'dailyShare').replace('📤 ', '')}
            </button>
            <button
              onClick={handleRestart}
              className="w-full py-3 bg-slate-800/40 text-slate-500 rounded-xl font-medium text-sm border border-slate-700/30 hover:text-slate-300 active:scale-[0.97] transition-all cursor-pointer select-none"
            >
              {t(lang, 'changeDiff')}
            </button>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowLeaderboard(true)} className="text-sm text-slate-500 hover:text-slate-300 transition-colors font-medium cursor-pointer py-2">
                {t(lang, 'localLeaderboard')}
              </button>
              <span className="text-slate-700 py-2">·</span>
              <button onClick={() => setShowGlobalLeaderboard(true)} className="text-sm text-slate-500 hover:text-emerald-400 transition-colors font-medium cursor-pointer py-2">
                {t(lang, 'globalLeaderboard')}
              </button>
            </div>
          </div>
        </div>

        <Suspense fallback={null}>
          {showLeaderboard && <ScoreBoard lang={lang} onClose={() => setShowLeaderboard(false)} />}
          {showGlobalLeaderboard && <GlobalLeaderboard lang={lang} onClose={() => setShowGlobalLeaderboard(false)} />}
          {showStats && <StatsModal lang={lang} onClose={() => setShowStats(false)} />}
          {showSaveModal && (
            <SaveScoreModal
              lang={lang}
              score={score}
              correctCount={correctCount}
              totalQuestions={legendGameOver ? currentIndex + 1 : currentIndex < totalQuestions ? currentIndex : totalQuestions}
              difficulty={difficulty}
              googleUser={googleUser}
              onClose={() => setShowSaveModal(false)}
              onSaved={() => { setTimeout(() => { setShowSaveModal(false); setShowGlobalLeaderboard(true) }, 1500) }}
            />
          )}
          {showLeague && (
            <FriendLeague
              lang={lang}
              googleUser={googleUser}
              gameResult={leagueGameResult}
              onClose={() => setShowLeague(false)}
            />
          )}
        </Suspense>
      </div>
    )
  }

  /* ════════════════════════════════════════════
     ██  GAME SCREEN
     ════════════════════════════════════════════ */
  const diffBadgeColors = {
    Easy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Hard: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    'Very Hard': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center px-3 sm:px-4 py-4 sm:py-6 md:py-10 relative overflow-hidden">
      <div className="pointer-events-none absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />

      {/* Header — stacks vertically on mobile */}
      <div className="w-full max-w-3xl mb-3 sm:mb-4 relative z-10">
        {/* Row 1: Title + Score + Exit */}
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-tight">
            {difficulty === 'Secret' ? '🤫' : '🧩'} {t(lang, 'title')}: {difficulty}
            {config?.gameOverOnWrong && (
              <span className="text-rose-400 text-[11px] sm:text-xs ml-1.5 font-medium">{t(lang, 'oneLife')}</span>
            )}
          </h1>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/15 text-emerald-400 text-sm font-bold px-3 py-1.5 rounded-full border border-emerald-500/20 shrink-0">
              {score.toLocaleString()} pts
            </span>
            <button
              onClick={() => { const next = toggleSound(); setSoundOn(next) }}
              className="w-7 h-7 flex items-center justify-center rounded-full text-slate-500 hover:text-white hover:bg-slate-700/60 transition-all cursor-pointer text-sm leading-none"
              title={soundOn ? 'Mute' : 'Unmute'}
            >
              {soundOn ? '🔊' : '🔇'}
            </button>
            <button
              onClick={() => setShowExitConfirm(true)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-slate-500 hover:text-white hover:bg-slate-700/60 transition-all cursor-pointer text-sm leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Row 2: Progress + Streak + Lives */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-slate-500 font-medium shrink-0">
            {t(lang, 'question')} {currentIndex + 1}
          </span>

          {streak >= 3 && (
            <span className="bg-amber-500/15 text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-500/20 animate-pulse-glow shrink-0">
              🔥 x{(1 + Math.floor(streak / 3) * 0.5).toFixed(1)}
            </span>
          )}

          {livesLeft !== null && config?.maxLives && (
            <div className="flex gap-1 items-center ml-auto">
              {Array.from({ length: config.maxLives }).map((_, i) => (
                <svg key={i} viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-all duration-300 ${i < livesLeft ? 'text-purple-400 drop-shadow-[0_0_4px_rgba(168,85,247,0.8)]' : 'text-slate-700'}`}>
                  <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                </svg>
              ))}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(currentIndex / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Points popup */}
      {lastPoints && (
        <div key={currentIndex} className="animate-fade-in-up text-center mb-2">
          <span className="text-emerald-400 text-base font-bold">
            +{lastPoints.points} pts
            {lastPoints.breakdown.speedBonus > 0 && (
              <span className="text-cyan-400 ml-1">⚡ SPEED</span>
            )}
            {lastPoints.breakdown.streakTier > 0 && (
              <span className="text-amber-400 ml-1">🔥 x{lastPoints.breakdown.multiplier}</span>
            )}
          </span>
        </div>
      )}

      {/* Combo Popup */}
      {showStreakPopup && (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-black text-2xl sm:text-3xl px-6 py-3 rounded-2xl shadow-xl z-50 animate-bounce-in border-2 border-white flex items-center gap-2">
          🔥 {streak}x STREAK!
        </div>
      )}

      {/* Player Card (Info & Question) */}
      <PlayerCard player={currentPlayer} blindMode={config?.blindMode} lang={lang} />

      {/* Transfer timeline */}
      <div className="w-full max-w-3xl relative z-10">
        <TransferTimeline
          path={currentPlayer.path || []}
          revealCount={config?.progressiveReveal ? revealCount : undefined}
          maskedIndex={currentPlayer.maskedIndex}
        />
      </div>

      {/* Multiple choice */}
      <div className="w-full max-w-3xl mt-3 sm:mt-4 relative z-10 pb-4 sm:pb-0">
        {difficulty !== 'Casual' && (
          <div className="flex justify-end mb-2">
            <button
              onClick={handleHint}
              disabled={score < 1000 || disabledOptions.length > 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border backdrop-blur-sm transition-all ${
                score >= 1000 && disabledOptions.length === 0
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:border-amber-500/60 cursor-pointer active:scale-95'
                  : 'bg-slate-800/80 text-slate-500 border-slate-700/50 cursor-not-allowed opacity-60'
              }`}
            >
              💡 50/50 Hint <span className="text-[10px] text-slate-400">(-1,000 pts)</span>
            </button>
          </div>
        )}

        <MultipleChoice
          key={currentPlayer.id + '-' + currentIndex}
          options={displayOptions}
          correctAnswer={currentPlayer.correctClub}
          onAnswer={handleAnswer}
          timerDuration={config.timer}
          disabledOptions={disabledOptions}
        />

        {/* Casual mode: Finish Game button */}
        {config?.timer === 0 && currentIndex > 0 && (
          <button
            onClick={handleFinishEarly}
            className="w-full mt-4 py-3 rounded-xl text-base font-medium text-slate-500 border border-slate-700/40 bg-slate-900/30 hover:bg-slate-800/50 hover:text-slate-300 hover:border-slate-600/60 active:scale-[0.97] transition-all duration-200 cursor-pointer select-none backdrop-blur-sm"
          >
            {t(lang, 'finishEarly')}
          </button>
        )}
      </div>

      {/* Exit confirmation modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl animate-card-reveal">
            <p className="text-white font-bold text-lg mb-1">{t(lang, 'exitConfirmTitle')}</p>
            <p className="text-slate-400 text-sm mb-5">{t(lang, 'exitConfirmMsg')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 text-slate-300 font-bold hover:bg-slate-600 transition-all cursor-pointer"
              >
                {t(lang, 'exitNo')}
              </button>
              <button
                onClick={() => { setShowExitConfirm(false); handleFinishEarly() }}
                className="flex-1 py-2.5 rounded-xl bg-rose-500/80 text-white font-bold hover:bg-rose-500 transition-all cursor-pointer"
              >
                {t(lang, 'exitYes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
