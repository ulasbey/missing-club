import { useState, useRef, useEffect } from 'react'
import { ClubShield } from './Placeholders'
import { useWikiImage, clubWikiTitles } from '../hooks/useWikiImage'

const accentColors = [
    'from-emerald-500 to-teal-600',
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-sky-600',
    'from-fuchsia-500 to-pink-600',
    'from-lime-500 to-green-600',
    'from-red-500 to-rose-600',
    'from-teal-500 to-emerald-600',
]

/**
 * ClubLogo — priority chain: Clearbit (max 1500ms) → Wikipedia API → step.logo → ClubShield.
 *
 * - Clearbit is tried first if a domain is available (max 1500ms).
 * - Wikipedia thumbnail API is fetched eagerly in parallel; used as first fallback.
 * - step.logo (Wikipedia SVG URL from data) is used as second fallback.
 * - Each instance is isolated; failures never cascade to siblings.
 */
function ClubLogo({ step, colorClass }) {
    const hasDomain = Boolean(step.domain)
    const wikiTitle = clubWikiTitles[step.club]

    // Eagerly fetch the Wikipedia thumbnail in parallel with Clearbit
    const { url: wikiUrl, loading: wikiLoading } = useWikiImage(wikiTitle)

    // Stage 0: Clearbit | Stage 1: Wikipedia API | Stage 1.5: step.logo | Stage 2: ClubShield
    const [stage, setStage] = useState(hasDomain ? 0 : 2)
    const timerRef = useRef(null)

    // Clearbit timeout — give it 1500ms before falling back
    useEffect(() => {
        if (stage !== 0) return
        timerRef.current = setTimeout(() => setStage(2), 1500)
        return () => clearTimeout(timerRef.current)
    }, [stage])

    // Upgrade from placeholder: wait for wiki API to finish before falling back to step.logo
    useEffect(() => {
        if (stage === 2 && wikiUrl) setStage(1)
        else if (stage === 2 && !wikiLoading && !wikiUrl && step.logo) setStage(15)
    }, [wikiUrl, wikiLoading, stage, step.logo])

    const handleClearbitLoad  = () => clearTimeout(timerRef.current)
    const handleClearbitError = () => { clearTimeout(timerRef.current); setStage(2) }

    if (stage === 0) {
        return (
            <img
                src={`https://logo.clearbit.com/${step.domain}`}
                alt={step.club}
                loading="eager"
                className="w-full h-full object-contain drop-shadow-md"
                onLoad={handleClearbitLoad}
                onError={handleClearbitError}
            />
        )
    }

    if (stage === 1 && wikiUrl) {
        return (
            <img
                src={wikiUrl}
                alt={step.club}
                loading="eager"
                className="w-full h-full object-contain drop-shadow-md"
                onError={() => setStage(step.logo ? 15 : 2)}
            />
        )
    }

    if (stage === 15 && step.logo) {
        return (
            <img
                src={step.logo}
                alt={step.club}
                loading="eager"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain drop-shadow-md"
                onError={() => setStage(2)}
            />
        )
    }

    return <ClubShield clubName={step.club} colorClass={colorClass} />
}


const Arrow = () => (
    <div className="flex items-center mb-5 mx-0.5 sm:mx-1 shrink-0">
        <div className="w-2 sm:w-4 h-px bg-gradient-to-r from-slate-600 to-slate-500" />
        <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-emerald-500 -ml-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
    </div>
)

export default function TransferTimeline({ path, revealCount, maskedIndex }) {
    const visibleCount = revealCount && revealCount > 0
        ? Math.min(revealCount, path.length)
        : path.length
    const visiblePath = path.slice(0, visibleCount)
    const hiddenCount = path.length - visibleCount

    // Layout based on TOTAL path length (not visible count) to prevent mid-game layout switch
    const useGrid = path.length > 6

    if (useGrid) {
        return (
            <div className="w-full py-3 flex flex-wrap justify-center gap-x-3 gap-y-3 px-2">
                {visiblePath.map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1 animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                        <div className="relative">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center p-1.5 shadow-md overflow-hidden">
                                {idx === maskedIndex ? (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-2xl">?</div>
                                ) : (
                                    <ClubLogo step={step} colorClass={accentColors[idx % accentColors.length]} />
                                )}
                            </div>
                            <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-slate-700 border border-slate-600 text-[9px] font-black text-slate-300 flex items-center justify-center leading-none">
                                {idx + 1}
                            </span>
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium w-14 text-center truncate leading-tight">
                            {idx === maskedIndex ? '???' : step.club}
                        </span>
                    </div>
                ))}
                {hiddenCount > 0 && (
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-800/40 border border-dashed border-slate-600/50 flex items-center justify-center">
                            <span className="text-slate-500 text-xs font-bold">+{hiddenCount}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-medium">more</span>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="w-full py-3 flex items-center justify-center flex-wrap gap-y-2 px-2">
            {visiblePath.map((step, idx) => (
                <div key={idx} className="flex items-center">
                    <div className="flex flex-col items-center gap-1.5 animate-fade-in-up" style={{ animationDelay: `${idx * 80}ms` }}>
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-[68px] md:h-[68px] rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center p-1.5 sm:p-2 hover:border-emerald-500/40 hover:scale-110 transition-all duration-300 backdrop-blur-sm shadow-lg overflow-hidden">
                                {idx === maskedIndex ? (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-3xl">?</div>
                                ) : (
                                    <ClubLogo step={step} colorClass={accentColors[idx % accentColors.length]} />
                                )}
                            </div>
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium max-w-[56px] sm:max-w-[68px] text-center truncate leading-tight">
                            {idx === maskedIndex ? '???' : step.club}
                        </span>
                    </div>
                    {idx < visiblePath.length - 1 && <Arrow />}
                </div>
            ))}
            {hiddenCount > 0 && (
                <div className="flex items-center">
                    <Arrow />
                    <div className="flex flex-col items-center gap-1.5">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-slate-800/40 border border-dashed border-slate-600/50 flex items-center justify-center">
                            <span className="text-slate-500 text-xs font-bold">+{hiddenCount}</span>
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium">more…</span>
                    </div>
                </div>
            )}
        </div>
    )
}
