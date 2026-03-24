/**
 * High-quality SVG placeholder components for the gaming UI.
 */

/** Footballer silhouette — used when player photo is unavailable */
export function PlayerSilhouette({ name, size = 'lg' }) {
    const initials = (name || '?')
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()

    const dims = size === 'lg' ? 'w-48 h-56 sm:w-56 sm:h-64' : 'w-16 h-16'

    return (
        <div className={`${dims} flex items-center justify-center relative`}>
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 via-slate-800 to-slate-900 rounded-2xl" />

            {/* Silhouette SVG */}
            <svg
                viewBox="0 0 200 260"
                className="w-3/4 h-3/4 relative z-10 drop-shadow-lg"
                fill="none"
            >
                {/* Head */}
                <circle cx="100" cy="60" r="35" fill="url(#silGrad)" opacity="0.7" />
                {/* Shoulders / Body */}
                <path
                    d="M30 260 Q30 160 100 140 Q170 160 170 260"
                    fill="url(#silGrad)"
                    opacity="0.6"
                />
                {/* Jersey number / initials */}
                <text
                    x="100"
                    y="220"
                    textAnchor="middle"
                    fill="white"
                    fontSize="32"
                    fontWeight="bold"
                    fontFamily="system-ui, sans-serif"
                    opacity="0.9"
                >
                    {initials}
                </text>
                <defs>
                    <linearGradient id="silGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    )
}

/** Club crest shield — used when club logo is unavailable */
export function ClubShield({ clubName, colorClass = 'from-emerald-500 to-teal-600' }) {
    const initials = (clubName || '?')
        .split(/[\s-]+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 3)

    return (
        <div className="w-full h-full flex items-center justify-center">
            <svg viewBox="0 0 80 96" className="w-full h-full drop-shadow-lg">
                {/* Shield shape */}
                <path
                    d="M40 4 L72 18 L72 52 Q72 80 40 92 Q8 80 8 52 L8 18 Z"
                    fill="url(#shieldGrad)"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="1.5"
                />
                {/* Inner highlight */}
                <path
                    d="M40 10 L66 22 L66 50 Q66 74 40 86 Q14 74 14 50 L14 22 Z"
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="1"
                />
                {/* Club initials */}
                <text
                    x="40"
                    y="58"
                    textAnchor="middle"
                    fill="white"
                    fontSize="20"
                    fontWeight="bold"
                    fontFamily="system-ui, sans-serif"
                    letterSpacing="1"
                >
                    {initials}
                </text>
                <defs>
                    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="50%" stopColor="#0d9488" />
                        <stop offset="100%" stopColor="#0e7490" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    )
}
