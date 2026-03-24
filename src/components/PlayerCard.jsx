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
    ? t(lang, 'missingClubBlind') 
    : t(lang, 'missingClubNamed').replace('{name}', playerName)

  console.log("Current Player rendering in UI:", player)

  return (
    <div className="w-full max-w-3xl mb-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4 sm:gap-6 shadow-xl backdrop-blur-sm z-10 relative">
      <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-slate-900 rounded-full border-2 border-slate-700/80 overflow-hidden flex items-center justify-center shadow-inner">
        {photoUrl ? (
          <img src={photoUrl} alt={playerName} className="w-full h-full object-cover object-top" />
        ) : (
          <PlayerSilhouette name={playerName} size="sm" />
        )}
      </div>
      <div className="flex-1">
        {player.difficulty && (
          <span className={`inline-block text-[10px] sm:text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md mb-1.5 border shadow-sm ${
            player.difficulty === 'Hard' || player.difficulty === 'Very Hard'
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
              : player.difficulty === 'Medium'
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
          }`}>
            {player.difficulty}
          </span>
        )}
        <h2 className="text-lg sm:text-2xl font-black text-white leading-tight mb-1">
          {playerName}
        </h2>
        <p className="text-amber-400 text-sm sm:text-base font-semibold">
          {questionText}
        </p>
      </div>
    </div>
  )
}
