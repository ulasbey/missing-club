const MODE_COLORS = {
  Casual: '#10b981', Pro: '#f59e0b',
  Scout: '#3b82f6', Pundit: '#a855f7', Legend: '#f43f5e',
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export async function generateShareImage({ mode, score, correctCount, totalQuestions, pct, emoji }) {
  const S = 1080
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')
  const cx = S / 2

  // Background
  const bg = ctx.createRadialGradient(cx, S * 0.25, 0, cx, cx, S * 0.85)
  bg.addColorStop(0, '#0f172a')
  bg.addColorStop(1, '#020617')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, S, S)

  // Subtle center glow
  const modeColor = MODE_COLORS[mode] || '#10b981'
  const glow = ctx.createRadialGradient(cx, cx * 0.9, 0, cx, cx * 0.9, 380)
  glow.addColorStop(0, modeColor + '18')
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, S, S)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // Header: game name
  ctx.fillStyle = '#475569'
  ctx.font = '600 40px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillText('🧩  MISSING CLUB', cx, 110)

  // Big result emoji
  ctx.font = '190px serif'
  ctx.fillText(emoji, cx, 370)

  // Mode badge
  const bw = 260, bh = 58, bx = cx - bw / 2, by = 410
  drawRoundRect(ctx, bx, by, bw, bh, bh / 2)
  ctx.fillStyle = modeColor + '20'
  ctx.fill()
  drawRoundRect(ctx, bx, by, bw, bh, bh / 2)
  ctx.strokeStyle = modeColor + '50'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = modeColor
  ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillText(mode + ' Mode', cx, by + 39)

  // Score (big gradient number)
  const scoreGrad = ctx.createLinearGradient(cx - 320, 0, cx + 320, 0)
  scoreGrad.addColorStop(0, '#10b981')
  scoreGrad.addColorStop(1, '#06b6d4')
  ctx.fillStyle = scoreGrad
  ctx.font = 'bold 168px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillText(score.toLocaleString(), cx, 690)

  ctx.fillStyle = '#334155'
  ctx.font = '500 44px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillText('P O I N T S', cx, 754)

  // Stats row
  ctx.fillStyle = '#64748b'
  ctx.font = '38px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillText(`${correctCount} / ${totalQuestions} correct   ·   ${pct}% accuracy`, cx, 860)

  // Separator
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx - 180, 920)
  ctx.lineTo(cx + 180, 920)
  ctx.stroke()

  // URL
  ctx.fillStyle = '#334155'
  ctx.font = '34px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillText(window.location.host, cx, 985)

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'))
}

export async function shareResult({ mode, score, correctCount, totalQuestions, pct, emoji }) {
  const text = `🧩 Missing Club — ${mode} Mode\n${emoji} ${correctCount}/${totalQuestions} correct · ${score.toLocaleString()} pts\n\n${window.location.origin}`

  try {
    const blob = await generateShareImage({ mode, score, correctCount, totalQuestions, pct, emoji })
    const file = new File([blob], 'transfer-quiz.png', { type: 'image/png' })

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text })
      return 'shared'
    }

    // Desktop fallback: download the image
    if (!navigator.share) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'transfer-quiz-result.png'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      return 'downloaded'
    }
  } catch { /* fall through */ }

  // Text-only share
  if (navigator.share) {
    try { await navigator.share({ text }); return 'shared' } catch { /* fall through */ }
  }

  // Clipboard
  try { await navigator.clipboard.writeText(text); return 'copied' } catch {}
  return 'failed'
}
