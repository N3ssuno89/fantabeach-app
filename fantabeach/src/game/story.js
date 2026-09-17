// Immagine 1080x1920 per le storie. Stessa card del gioco, disegnata su canvas.
// Le figure sono sempre sagome: in questa versione nessuno ha la foto.
import { SHARE_URL } from './config.js'
import { num, tier } from './ui.js'

const W = 1080
const H = 1920
const DISPLAY = '"Big Shoulders Display","Avenir Next Condensed","Roboto Condensed","Arial Narrow",sans-serif'
const UI = '"Chakra Petch","Avenir Next","Segoe UI",Roboto,sans-serif'
const TCOL = {
  top: { c: '#FFB21E', d: '#3E2A06' },
  elite: { c: '#C084FC', d: '#281641' },
  solid: { c: '#3FD6A0', d: '#0C3427' },
  value: { c: '#FF6B2C', d: '#40190A' },
  out: { c: '#9AA59F', d: '#26312C' },
}
const BUST =
  'M10 100 C11 84 22 72 42 70 L42 59 C36 55 32 48 32 39 C32 27 40 19 50 19 C60 19 68 27 68 39 C68 48 64 55 58 59 L58 70 C78 72 89 84 90 100 Z'

let LOGO = null
let BADGE = null
let ready = null

const loadImg = src =>
  new Promise(res => {
    const im = new Image()
    im.crossOrigin = 'anonymous' // serve per non sporcare il canvas (SPEC §9)
    im.onload = () => res(im)
    im.onerror = () => res(null)
    im.src = src
  })

// Font e immagini: se tardano si disegna lo stesso dopo 1,8 secondi
export function assetsReady() {
  if (ready) return ready
  const fonts =
    document.fonts && document.fonts.load
      ? Promise.all([
          document.fonts.load('900 100px "Big Shoulders Display"'),
          document.fonts.load('800 100px "Big Shoulders Display"'),
          document.fonts.load('600 40px "Chakra Petch"'),
          document.fonts.load('700 40px "Chakra Petch"'),
        ]).catch(() => {})
      : Promise.resolve()
  const imgs = Promise.all([loadImg('/game/logo.png'), loadImg('/game/badge.png')]).then(r => {
    LOGO = r[0]
    BADGE = r[1]
  })
  ready = Promise.race([Promise.all([fonts, imgs]), new Promise(r => setTimeout(r, 1800))])
  return ready
}

const setFont = (ctx, spec, size, family) => { ctx.font = `${spec} ${size}px ${family}` }

function fitFont(ctx, text, spec, size, maxW, family, min) {
  let s = size
  setFont(ctx, spec, s, family)
  while (ctx.measureText(text).width > maxW && s > (min || 10)) {
    s -= 1
    setFont(ctx, spec, s, family)
  }
  return s
}

function rr(ctx, x, y, w, h, r) {
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

function drawFigure(ctx, x, y, s) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s / 100, s / 100)
  ctx.fillStyle = 'rgba(12,20,17,.96)'
  ctx.fill(new Path2D(BUST))
  ctx.restore()
}

function figureCanvas(size) {
  const c = document.createElement('canvas')
  c.width = c.height = Math.ceil(size)
  drawFigure(c.getContext('2d'), 0, 0, size)
  return c
}

function drawOrb(ctx, a, cx, cy, R) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  const g = ctx.createRadialGradient(cx, cy + R * 0.25, R * 0.05, cx, cy, R)
  g.addColorStop(0, '#F3E6CC')
  g.addColorStop(1, '#BCA982')
  ctx.fillStyle = g
  ctx.fill()
  ctx.restore()
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.clip()
  const fs = R * 1.72
  drawFigure(ctx, cx - fs / 2, cy + R * 1.02 - fs, fs)
  ctx.restore()
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.lineWidth = Math.max(3, R * 0.06)
  ctx.strokeStyle = TCOL[tier(a.pos)[0]].c
  ctx.stroke()
}

function borderGradient(ctx, x, y, w, h) {
  const stops = [['#FFBA38', 0], ['#FF7208', 0.2], ['#FF422A', 0.4], ['#F3ECDD', 0.6], ['#3FD6A0', 0.8], ['#FFBA38', 1]]
  const g = typeof ctx.createConicGradient === 'function'
    ? ctx.createConicGradient(-Math.PI / 2 + 0.7, x + w / 2, y + h / 2)
    : ctx.createLinearGradient(x, y, x + w, y + h)
  stops.forEach(s => g.addColorStop(s[1], s[0]))
  return g
}

function drawPosterCard(ctx, A, B, x, y, w, o) {
  const h = Math.round((w * 430) / 320)
  const s = w / 320
  const R = 24 * s
  const bw = Math.max(8, 6 * s)
  const cx = x + w / 2
  const cy = y + h * 0.38

  ctx.save()
  ctx.shadowColor = 'rgba(255,114,8,.55)'
  ctx.shadowBlur = 80 * s
  ctx.shadowOffsetY = 28 * s
  rr(ctx, x - bw, y - bw, w + bw * 2, h + bw * 2, R + bw)
  ctx.fillStyle = '#FF7208'
  ctx.fill()
  ctx.restore()
  rr(ctx, x - bw, y - bw, w + bw * 2, h + bw * 2, R + bw)
  ctx.fillStyle = borderGradient(ctx, x, y, w, h)
  ctx.fill()

  ctx.save()
  rr(ctx, x, y, w, h, R)
  ctx.clip()
  const bg = ctx.createLinearGradient(0, y, 0, y + h)
  bg.addColorStop(0, '#0B5C4A')
  bg.addColorStop(0.6, '#06362B')
  bg.addColorStop(1, '#042219')
  ctx.fillStyle = bg
  ctx.fillRect(x, y, w, h)

  const step = 9 * s
  const rx = w * 0.72
  const ry = h * 0.56
  for (let yy = y + step / 2; yy < y + h * 0.85; yy += step) {
    for (let xx = x + step / 2; xx < x + w; xx += step) {
      const dx = (xx - cx) / rx
      const dy = (yy - cy) / ry
      const d = Math.sqrt(dx * dx + dy * dy)
      const al = d < 0.15 ? 1 : Math.max(0, 1 - (d - 0.15) / 0.65)
      if (al <= 0.02) continue
      ctx.fillStyle = `rgba(255,186,56,${(0.26 * al).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(xx, yy, 1.35 * s, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.save()
  ctx.translate(cx, y + h * 0.1)
  ctx.rotate((-8 * Math.PI) / 180)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  setFont(ctx, '900', Math.round(188 * s), DISPLAY)
  ctx.fillStyle = 'rgba(255,186,56,.24)'
  ctx.fillText('2027', 9 * s, 0)
  ctx.lineWidth = 2.5 * s
  ctx.strokeStyle = '#FF7208'
  ctx.strokeText('2027', 0, 0)
  ctx.restore()

  const gr = Math.hypot(w * 0.525, w * 0.525)
  const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr)
  gl.addColorStop(0, 'rgba(255,244,214,.96)')
  gl.addColorStop(0.23, 'rgba(255,186,56,.4)')
  gl.addColorStop(0.5, 'rgba(255,114,8,0)')
  gl.addColorStop(1, 'rgba(255,114,8,0)')
  ctx.fillStyle = gl
  ctx.fillRect(x, y, w, h)

  const fig = (cxp, drop, fw) => {
    const fc = figureCanvas(fw)
    ctx.save()
    ctx.shadowColor = 'rgba(255,214,140,.9)'
    ctx.shadowBlur = 12 * s
    ctx.drawImage(fc, x + w * cxp - fw / 2, y + h * (0.05 + drop), fw, fw)
    ctx.restore()
  }
  if (B) { fig(0.7, 0.02, w * 0.82); fig(0.3, 0, w * 0.82) } else fig(0.5, -0.01, w * 0.96)

  const gd = ctx.createLinearGradient(0, y + h * 0.63, 0, y + h)
  gd.addColorStop(0, 'rgba(6,58,45,0)')
  gd.addColorStop(0.15, '#063A2D')
  gd.addColorStop(1, '#02201A')
  ctx.fillStyle = gd
  ctx.fillRect(x, y + h * 0.63, w, h * 0.37 + 1)

  setFont(ctx, '700', Math.round(12 * s), UI)
  const lw = ctx.measureText(o.label).width + 20 * s
  const lh = 22 * s
  const lx = x + 14 * s
  const ly = y + 14 * s
  rr(ctx, lx, ly, lw, lh, lh / 2)
  if (o.hot) {
    const hg = ctx.createLinearGradient(lx, 0, lx + lw, 0)
    hg.addColorStop(0, '#FFBA38')
    hg.addColorStop(1, '#FF7208')
    ctx.fillStyle = hg
  } else ctx.fillStyle = 'rgba(4,14,10,.55)'
  ctx.fill()
  ctx.fillStyle = o.hot ? '#1B1204' : '#F3ECDD'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(o.label, lx + 10 * s, ly + lh / 2 + s)

  if (BADGE) {
    const bs = 34 * s
    const bx = x + w - 12 * s - bs
    const by = y + 12 * s
    ctx.beginPath()
    ctx.arc(bx + bs / 2, by + bs / 2, bs / 2 + 2 * s, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.save()
    ctx.beginPath()
    ctx.arc(bx + bs / 2, by + bs / 2, bs / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(BADGE, bx, by, bs, bs)
    ctx.restore()
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const ny = y + h * 0.715
  const colW = B ? (w - 24 * s) / 2 : w - 24 * s
  const cols = B ? [[A, x + 12 * s + colW / 2], [B, x + 12 * s + colW * 1.5]] : [[A, x + w / 2]]
  for (const n of cols) {
    const up = n[0].last.toUpperCase()
    ctx.fillStyle = '#F3ECDD'
    fitFont(ctx, up, '900', Math.round(27 * s), colW - 8 * s, DISPLAY, 10)
    ctx.fillText(up, n[1], ny + 26 * s)
    ctx.fillStyle = 'rgba(243,236,221,.78)'
    fitFont(ctx, n[0].first, '500', Math.round(12 * s), colW - 8 * s, UI, 8)
    ctx.fillText(n[0].first, n[1], ny + 42 * s)
  }

  const sx = x + 10 * s
  const sw = w - 20 * s
  const sh = 52 * s
  const sy = y + h - 10 * s - sh
  rr(ctx, sx, sy, sw, sh, 16 * s)
  ctx.fillStyle = 'rgba(4,14,10,.55)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(243,236,221,.16)'
  ctx.lineWidth = 1.5 * s
  ctx.stroke()
  o.stats.forEach((st, i) => {
    const ccx = sx + (sw * (i + 0.5)) / o.stats.length
    const cw = sw / o.stats.length - 10 * s
    ctx.fillStyle = '#F3ECDD'
    fitFont(ctx, String(st[0]), '800', Math.round(25 * s), cw, DISPLAY, 10)
    ctx.fillText(String(st[0]), ccx, sy + 28 * s)
    ctx.fillStyle = 'rgba(243,236,221,.75)'
    fitFont(ctx, st[1], '500', Math.round(10.5 * s), cw, UI, 8)
    ctx.fillText(st[1], ccx, sy + 44 * s)
  })

  rr(ctx, x + 0.75 * s, y + 0.75 * s, w - 1.5 * s, h - 1.5 * s, R)
  ctx.strokeStyle = 'rgba(243,236,221,.28)'
  ctx.lineWidth = 1.5 * s
  ctx.stroke()
  ctx.restore()
}

function storyBase(ctx) {
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0D5A48')
  bg.addColorStop(0.5, '#063026')
  bg.addColorStop(1, '#03140F')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  const gl = ctx.createRadialGradient(W * 0.5, H * 0.42, 20, W * 0.5, H * 0.42, W * 0.9)
  gl.addColorStop(0, 'rgba(255,186,56,.18)')
  gl.addColorStop(1, 'rgba(255,186,56,0)')
  ctx.fillStyle = gl
  ctx.fillRect(0, 0, W, H)
  for (let yy = 10; yy < H; yy += 22) {
    for (let xx = 10; xx < W; xx += 22) {
      const d = Math.hypot((xx - W * 0.5) / W, (yy - H * 0.42) / H)
      const al = Math.max(0, 0.12 - d * 0.18)
      if (al <= 0.01) continue
      ctx.fillStyle = `rgba(255,186,56,${al.toFixed(3)})`
      ctx.beginPath()
      ctx.arc(xx, yy, 2.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  const lh = 100
  const lw = LOGO ? Math.round((lh * LOGO.naturalWidth) / LOGO.naturalHeight) : 270
  rr(ctx, 64, 56, lw + 56, lh + 34, (lh + 34) / 2)
  ctx.fillStyle = 'rgba(243,236,221,.96)'
  ctx.fill()
  if (LOGO) ctx.drawImage(LOGO, 92, 73, lw, lh)
}

// L'indirizzo è quello della SPEC §10. Il profilo da taggare NON va qui:
// l'immagine la leggono i follower di chi condivide, non chi condivide.
function storyFooter(ctx, g, username) {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#F3ECDD'
  setFont(ctx, '700', 48, UI)
  ctx.fillText(`E tu con chi ${g === 'M' ? 'li' : 'le'} metti?`, W / 2, 1738)
  ctx.fillStyle = '#FFBA38'
  setFont(ctx, '600', 40, UI)
  ctx.fillText(SHARE_URL, W / 2, 1798)
  ctx.fillStyle = 'rgba(243,236,221,.7)'
  setFont(ctx, '500', 28, UI)
  ctx.fillText(`Pronostico di @${username}, non una notizia ufficiale.`, W / 2, 1878)
}

const newCanvas = () => {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  return c
}

// Storia di una coppia. stats e pct arrivano già calcolati da main.js.
export async function renderPairStory({ A, B, confermata, stats, pctLine, gender, username }) {
  await assetsReady()
  const c = newCanvas()
  const ctx = c.getContext('2d')
  storyBase(ctx)
  ctx.fillStyle = '#F3ECDD'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  fitFont(ctx, 'Il mio pronostico', '900', 112, W - 160, DISPLAY, 60)
  ctx.fillText('Il mio pronostico', 80, 318)
  const cw = 740
  drawPosterCard(ctx, A, B, (W - cw) / 2, 390, cw, {
    label: confermata ? 'Restano insieme nel 2027' : 'Nuova coppia 2027',
    hot: true,
    stats,
  })
  ctx.textAlign = 'center'
  ctx.fillStyle = '#F3ECDD'
  const tn = `Team ${A.short}/${B.short}`
  fitFont(ctx, tn, '900', 96, W - 120, DISPLAY, 40)
  ctx.fillText(tn, W / 2, 1510)
  ctx.fillStyle = '#FFBA38'
  setFont(ctx, '700', 44, UI)
  ctx.fillText(pctLine, W / 2, 1590)
  storyFooter(ctx, gender, username)
  return c
}

// Storia con tutte le coppie dell'utente. Il titolo non usa la parola vietata (SPEC §7).
export async function renderAllPairsStory({ gender, rows, username }) {
  await assetsReady()
  const c = newCanvas()
  const ctx = c.getContext('2d')
  storyBase(ctx)
  ctx.fillStyle = '#F3ECDD'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const s1 = fitFont(ctx, 'coppie 2027', '900', 170, W - 160, DISPLAY, 60)
  setFont(ctx, '900', s1, DISPLAY)
  ctx.fillText('Le mie', 80, 360)
  ctx.fillText('coppie 2027', 80, 360 + s1 * 0.92)
  ctx.fillStyle = 'rgba(243,236,221,.75)'
  setFont(ctx, '600', 40, UI)
  ctx.fillText(gender === 'M' ? 'Circuito maschile' : 'Circuito femminile', 80, 360 + s1 * 0.92 + 70)

  const y0 = 360 + s1 * 0.92 + 180
  const rowH = 112
  const max = Math.min(rows.length, 8)
  for (let i = 0; i < max; i++) {
    const { A, B, confermata } = rows[i]
    const y = y0 + i * rowH
    ctx.save()
    rr(ctx, 64, y - 78, W - 128, 96, 30)
    ctx.fillStyle = 'rgba(4,14,10,.45)'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = borderGradient(ctx, 64, y - 78, W - 128, 96)
    ctx.stroke()
    ctx.restore()
    drawOrb(ctx, A, 124, y - 30, 34)
    drawOrb(ctx, B, 176, y - 30, 34)
    const nm = `${A.short.toUpperCase()}/${B.short.toUpperCase()}`
    ctx.textAlign = 'left'
    ctx.fillStyle = '#F3ECDD'
    fitFont(ctx, nm, '800', 58, 560, DISPLAY, 28)
    ctx.fillText(nm, 236, y - 10)
    ctx.textAlign = 'right'
    ctx.fillStyle = confermata ? '#3FD6A0' : '#FFBA38'
    setFont(ctx, '600', 32, UI)
    ctx.fillText(confermata ? 'restano' : 'nuova', W - 96, y - 14)
  }
  if (rows.length > max) {
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(243,236,221,.75)'
    setFont(ctx, '600', 36, UI)
    ctx.fillText(`e altre ${rows.length - max}`, 80, y0 + max * rowH)
  }
  storyFooter(ctx, gender, username)
  return c
}

export { num }
