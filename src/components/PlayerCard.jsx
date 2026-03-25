import React from 'react'
import { PlayerSilhouette } from './Placeholders'
import { t } from '../lib/i18n'
import { useWikiImage, playerWikiTitles } from '../hooks/useWikiImage'

export default function PlayerCard({ player, blindMode, lang }) {
  const wikiTitle = playerWikiTitles[player?.name] || player?.name
  const { url: wikiPhoto } = useWikiImage(blindMode ? null : wikiTitle)

  if (!player) return null

  const photoUrl = blindMode ? null : (player.photo || wikiPhoto)
  const playerName = blindMode ? '???' : player.name
  const questionText = blindMode 
  const isBlind = blindMode 
    ? t(lang, 'missingClubBlind') 
    : t(lang, 'missingClubNamed').replace('{name}', playerName)

  console.log("Current Player rendering in UI:", player)

  return (
    <div className={`w-full max-w-sm mx-auto panini-card rounded-[2rem] p-4 sm:p-5 shadow-2xl animate-card-reveal ${
      player.difficulty === 'Very Hard' ? 'panini-gold' : 
      player.difficulty === 'Hard' ? 'panini-silver' : ''
    }`}>
      {/* Card Header: Difficulty & Image */}
      <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden bg-slate-900 mb-4 border border-white/5">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={playerName}
            className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <PlayerSilhouette name={playerName} />
        )}
        
        {/* Difficulty Badge (Corner) */}
        {player.difficulty && (
          <div className="absolute top-3 left-3 z-20">
            <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border shadow-lg backdrop-blur-md ${
              player.difficulty === 'Hard' || player.difficulty === 'Very Hard'
                ? 'bg-rose-500/80 text-white border-rose-400/50 shadow-rose-500/20'
                : player.difficulty === 'Medium'
                ? 'bg-amber-500/80 text-white border-amber-400/50 shadow-amber-500/20'
                : 'bg-emerald-500/80 text-white border-emerald-400/50 shadow-emerald-500/20'
            }`}>
              {player.difficulty}
            </span>
          </div>
        )}

        {/* Card Shine Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-50" />
      </div>

      {/* Card Footer: Player Name & Stats Placeholder */}
      <div className="text-center px-2 pb-2">
        <h2 className="text-xl sm:text-2xl font-black text-white leading-tight mb-1 drop-shadow-md">
          {playerName}
        </h2>
        <div className="h-1 w-12 bg-emerald-500 mx-auto rounded-full mb-3 opacity-80" />
        
        <p className="text-[11px] sm:text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">
          {isBlind ? 'SECRET PLAYER' : 'MISSING CLUB CAREER'}
        </p>
      </div>

      {/* Retro Card Details (Optional icons) */}
      <div className="absolute bottom-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity">
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
          <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" />
        </svg>
      </div>
    </div>
  )
}
