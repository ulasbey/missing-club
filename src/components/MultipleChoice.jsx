import { useState, useEffect, useRef, useCallback } from 'react'
import confetti from 'canvas-confetti'
import { useWikiImage, playerWikiTitles } from '../hooks/useWikiImage'
import { PlayerSilhouette } from './Placeholders'
import { playCorrect, playWrong, playTimerTick } from '../lib/sounds'

export default function MultipleChoice({ options, correctAnswer, correctLogo, onAnswer, timerDuration, disabledOptions = [] }) {
    const [selected, setSelected] = useState(null)
    const [answered, setAnswered] = useState(false)
    const [timeLeft, setTimeLeft] = useState(timerDuration || 0)
    const timerRef = useRef(null)
    const startTimeRef = useRef(Date.now())
    const answeredRef = useRef(false)
    const tickIntervalRef = useRef(null)
    const advanceRef = useRef(null)

    // Countdown timer
    useEffect(() => {
        if (!timerDuration || timerDuration <= 0) return
        startTimeRef.current = Date.now()
        setTimeLeft(timerDuration)

        timerRef.current = setInterval(() => {
            const elapsed = (Date.now() - startTimeRef.current) / 1000
            const remaining = Math.max(0, timerDuration - elapsed)
            setTimeLeft(remaining)

            if (remaining <= 0 && !answeredRef.current) {
                clearInterval(timerRef.current)
                answeredRef.current = true
                setAnswered(true)
                setSelected(null)
                playWrong()
                setTimeout(() => {
                    onAnswer(false, 0)
                }, 2500)
            }
        }, 50)

        return () => clearInterval(timerRef.current)
    }, [timerDuration, onAnswer])

    // Tick sound when timer enters danger zone
    const timerPctForTick = timerDuration > 0 ? (timeLeft / timerDuration) * 100 : 100
    useEffect(() => {
        if (timerPctForTick <= 30 && timerPctForTick > 0 && !answered) {
            if (!tickIntervalRef.current) {
                tickIntervalRef.current = setInterval(() => playTimerTick(), 600)
            }
        } else {
            clearInterval(tickIntervalRef.current)
            tickIntervalRef.current = null
        }
        return () => { clearInterval(tickIntervalRef.current); tickIntervalRef.current = null }
    }, [timerPctForTick <= 30, answered])

    const handleClick = useCallback((option) => {
        if (answered || answeredRef.current) return

        answeredRef.current = true
        clearInterval(timerRef.current)

        setSelected(option)
        setAnswered(true)

        const isCorrect = option === correctAnswer
        const remainingTime = Math.max(0, timeLeft)

        if (isCorrect) {
            playCorrect()
        } else {
            playWrong()
        }

        if (isCorrect) {
            const fire = (opts) =>
                confetti({
                    ...opts,
                    colors: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899'],
                })

            fire({ particleCount: 80, spread: 70, origin: { x: 0.3, y: 0.6 } })
            fire({ particleCount: 80, spread: 70, origin: { x: 0.7, y: 0.6 } })

            setTimeout(() => {
                fire({ particleCount: 50, spread: 100, origin: { y: 0.5 } })
            }, 200)
        }

        const timeout = setTimeout(() => {
            onAnswer(isCorrect, remainingTime)
        }, 1500)
        advanceRef.current = { isCorrect, remainingTime, timeout }
    }, [answered, correctAnswer, onAnswer, timeLeft])

    const handleSkip = useCallback(() => {
        if (!advanceRef.current) return
        const { isCorrect, remainingTime, timeout } = advanceRef.current
        clearTimeout(timeout)
        advanceRef.current = null
        onAnswer(isCorrect, remainingTime)
    }, [onAnswer])

    const getButtonClasses = (option, idx) => {
        const base =
            'w-full py-3 sm:py-3.5 px-4 sm:px-5 rounded-xl text-sm sm:text-base font-semibold transition-all duration-200 border cursor-pointer backdrop-blur-sm select-none'
        const delay = 'animate-bounce-in'
        const stagger = { animationDelay: `${idx * 35 + 60}ms` }

        if (!answered) {
            return {
                className: `${base} ${delay} bg-slate-800/60 text-slate-200 border-slate-700/50 hover:border-emerald-500/60 hover:bg-emerald-500/10 hover:text-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] active:scale-[0.96] active:bg-emerald-500/15 active:border-emerald-500/50 active:text-emerald-300`,
                style: stagger,
            }
        }
        if (option === correctAnswer) {
            return {
                className: `${base} bg-emerald-500/20 text-emerald-400 border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.3)]`,
                style: stagger,
            }
        }
        if (option === selected && option !== correctAnswer) {
            return {
                className: `${base} bg-rose-500/20 text-rose-400 border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.3)]`,
                style: stagger,
            }
        }
        return {
            className: `${base} bg-slate-900/40 text-slate-600 border-slate-800/50 cursor-default`,
            style: stagger,
        }
    }

    // Timer bar color & danger state
    const timerPct = timerDuration > 0 ? (timeLeft / timerDuration) * 100 : 100
    const timerColor =
        timerPct > 60 ? 'from-emerald-500 to-cyan-500' :
            timerPct > 30 ? 'from-amber-500 to-yellow-500' :
                'from-rose-500 to-red-500'
    const isDanger = timerDuration > 0 && timerPct <= 30 && !answered

    return (
        <div className={`w-full max-w-lg mx-auto flex flex-col gap-2 sm:gap-3 mt-1 sm:mt-2 relative z-50 ${isDanger ? 'animate-glitch glitch-overlay' : ''}`}>

            {/* ── Countdown Timer Bar ── */}
            {timerDuration > 0 && (
                <div className="w-full mb-1 sm:mb-2" style={{ visibility: answered ? 'hidden' : 'visible' }}>
                    <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-bold ${isDanger ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>
                            ⏱ {Math.ceil(timeLeft)}s
                        </span>
                        {isDanger && (
                            <span className="text-xs text-rose-400 font-bold uppercase tracking-wider animate-pulse">
                                ⚠ Hurry up!
                            </span>
                        )}
                    </div>
                    <div className={`w-full bg-slate-800 rounded-full h-3 sm:h-2.5 overflow-hidden border ${isDanger ? 'border-rose-500/50' : 'border-slate-700/50'}`}>
                        <div
                            className={`bg-gradient-to-r ${timerColor} h-full rounded-full transition-all duration-100 ease-linear`}
                            style={{
                                width: `${timerPct}%`,
                                boxShadow: isDanger ? '0 0 16px rgba(244,63,94,0.6), 0 0 32px rgba(244,63,94,0.3)' : undefined,
                            }}
                        />
                    </div>
                </div>
            )}

            {/* The question is now rendered in PlayerCard, so we don't need questionText here */}

            {options.map((option, idx) => {
                const { className, style } = getButtonClasses(option, idx)
                const isDisabled = disabledOptions?.includes(option)
                return (
                    <button
                        key={option}
                        onClick={() => handleClick(option)}
                        disabled={answered || isDisabled}
                        className={`${className} ${isDisabled ? 'opacity-25 line-through cursor-not-allowed bg-slate-900/10 border-slate-800/20 text-slate-700' : ''}`}
                        style={style}
                    >
                        {option}
                    </button>
                )
            })}

            {/* ── Result Cards ── */}
            {answered && selected === null && (
                <div className="animate-card-reveal mt-2 mx-auto text-center relative z-50">
                    <div onClick={handleSkip} className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-slate-800 to-slate-900 px-6 sm:px-8 py-5 sm:py-6 shadow-2xl shadow-amber-500/10 cursor-pointer">
                        <p className="text-amber-400 text-sm font-bold uppercase tracking-widest mb-1">
                            ⏱ Time&apos;s Up!
                        </p>
                        <p className="text-slate-300 text-base">
                            It was <span className="text-white font-bold">{correctAnswer}</span>
                        </p>
                    </div>
                    <button 
                        onClick={handleSkip}
                        className="w-full mt-4 py-4 bg-emerald-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all animate-pulse-next cursor-pointer"
                    >
                        NEXT QUESTION ➔
                    </button>
                    <p className="text-slate-600 text-[10px] uppercase font-bold tracking-widest mt-2 opacity-50">Or tap the card to skip</p>
                </div>
            )}

            {answered && selected === correctAnswer && (
                <div className="animate-card-reveal mt-2 mx-auto relative z-50">
                    <div onClick={handleSkip} className="relative rounded-2xl overflow-hidden border border-emerald-500/30 shadow-2xl shadow-emerald-500/10 bg-gradient-to-b from-slate-800 to-slate-900 px-6 sm:px-8 py-5 sm:py-6 cursor-pointer text-center">
                        <p className="text-emerald-400 text-md font-bold uppercase tracking-widest mb-1">
                            ✅ Correct!
                        </p>
                        <p className="text-emerald-300 text-2xl font-black">
                            {correctAnswer}
                        </p>
                    </div>
                    <button 
                        onClick={handleSkip}
                        className="w-full mt-4 py-4 bg-emerald-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all animate-pulse-next cursor-pointer"
                    >
                        NEXT QUESTION ➔
                    </button>
                    <p className="text-slate-600 text-[10px] uppercase font-bold tracking-widest mt-2 opacity-50">Or tap the card to skip</p>
                </div>
            )}

            {answered && selected !== null && selected !== correctAnswer && (
                <div className="animate-card-reveal mt-2 mx-auto text-center relative z-50">
                    <div onClick={handleSkip} className="rounded-2xl border border-rose-500/30 bg-gradient-to-b from-slate-800 to-slate-900 px-6 sm:px-8 py-5 sm:py-6 shadow-2xl shadow-rose-500/10 cursor-pointer">
                        <p className="text-rose-400 text-sm font-bold uppercase tracking-widest mb-1">
                            ❌ Wrong!
                        </p>
                        <p className="text-slate-300 text-base mt-2">
                            It was <span className="text-white font-bold block text-xl">{correctAnswer}</span>
                        </p>
                    </div>
                    <button 
                        onClick={handleSkip}
                        className="w-full mt-4 py-4 bg-emerald-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all animate-pulse-next cursor-pointer"
                    >
                        NEXT QUESTION ➔
                    </button>
                    <p className="text-slate-600 text-[10px] uppercase font-bold tracking-widest mt-2 opacity-50">Or tap the card to skip</p>
                </div>
            )}
        </div>
    )
}

