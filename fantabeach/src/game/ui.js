// Pezzi di interfaccia: figure, card e righe. HTML e classi vengono dall'anteprima approvata.
import { photoUrl } from './supabase.js'


export const $ = s => document.querySelector(s)

export const esc = s =>
  String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export const num = (n, d) => Number(n).toLocaleString('it-IT', { maximumFractionDigits: d || 0 })

export const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

// "l'8%" invece di "il 8%", "lo 0%" invece di "il 0%"
export const artN = n => {
  if (n === 0) return 'lo '
  return n === 1 || n === 8 || n === 11 || (n >= 80 && n <= 89) ? "l'" : 'il '
}

export function tier(r) {
  if (r <= 5) return ['top', 'Top Player']
  if (r <= 15) return ['elite', 'Elite']
  if (r <= 30) return ['solid', 'Solid Pick']
  if (r <= 50) return ['value', 'Value Pick']
  return ['out', 'Outsider']
}

export const FEW_VOTES = 'Ancora pochi voti'

export const ICON_X =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>'
export const ICON_V =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5 10-11" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'

const SHINE = '<span class="shine" aria-hidden="true"></span>'

// Busto in controluce: è la figura di chi non ha la foto, ed è anche il ripiego
// per chi ce l'ha ma non si carica (SPEC §9).
const BUST =
  'M10 100 C11 84 22 72 42 70 L42 59 C36 55 32 48 32 39 C32 27 40 19 50 19 C60 19 68 27 68 39 C68 48 64 55 58 59 L58 70 C78 72 89 84 90 100 Z'

export const figureSVG = () =>
  `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${BUST}" fill="var(--sil)" fill-opacity=".85"/></svg>`

// La sagoma resta sempre sotto: se la foto non arriva si toglie l'immagine e
// resta lei, senza riquadri vuoti e senza icone di immagine rotta.
const photoImg = a => {
  const src = photoUrl(a.photo_path)
  return src ? `<img class="ph" src="${esc(src)}" alt="" aria-hidden="true">` : ''
}

const hasPhoto = a => Boolean(a && a.photo_path)

export const figSpan = (a, cls) =>
  `<span class="fig ${cls}${hasPhoto(a) ? '' : ' sil'}">${figureSVG(a)}${photoImg(a)}</span>`

export const orbHTML = a =>
  `<span class="orb t-${tier(a.pos)[0]}${hasPhoto(a) ? '' : ' sil'}" aria-hidden="true">${figureSVG(a)}${photoImg(a)}</span>`

// L'evento error non risale, quindi si ascolta in fase di cattura, una volta sola.
if (typeof document !== 'undefined') {
  document.addEventListener(
    'error',
    e => {
      const el = e.target
      if (!el || el.tagName !== 'IMG' || !el.classList.contains('ph')) return
      const box = el.parentNode
      el.remove()
      if (box && box.classList) box.classList.add('sil')
    },
    true
  )
}

const nameBlock = a => `<span class="surname">${esc(a.last)}</span><span class="first">${esc(a.first)}</span>`

const posterBg = withBig =>
  '<div class="bg" aria-hidden="true"><span class="halftone"></span>' +
  (withBig === false ? '' : '<span class="big b2">2027</span><span class="big b1">2027</span>') +
  '<span class="glow"></span></div><div class="ground" aria-hidden="true"></div>'

export function posterPairHTML(A, B, o) {
  return (
    `<div class="cborder"><div class="vX pair">${posterBg()}` +
    `<span class="alabel${o.hot ? ' hot' : ''}">${o.label}</span><span class="bb" role="img" aria-label="FantaBeach"></span>` +
    `<div class="figs">${figSpan(A, 'a')}${figSpan(B, 'b')}</div>` +
    `<div class="names"><div>${nameBlock(A)}</div><div>${nameBlock(B)}</div></div>` +
    `<div class="stats">${o.stats}</div>${SHINE}</div></div>`
  )
}

export function posterSoloHTML(a, o, mate, mateWord) {
  o = o || {}
  const t = tier(a.pos)
  return (
    `<div class="cborder${o.sm ? ' thin' : ''}"><div class="vX solo${o.sm ? ' sm' : ''}">${posterBg()}` +
    `<span class="alabel">${t[1]} #${a.pos}</span><span class="bb" role="img" aria-label="FantaBeach"></span>` +
    `<div class="figs">${figSpan(a, 'c')}</div>` +
    `<div class="names one"><div>${nameBlock(a)}</div></div>` +
    (o.sm
      ? ''
      : `<div class="stats two"><div><b>${num(a.pts, 1)}</b><span>punti FantaBeach 2026</span></div>` +
        `<div><b>${mate ? esc(mate.short) : '—'}</b><span>${mateWord} 2026</span></div></div>`) +
    `${SHINE}</div></div>`
  )
}

export function cardShell(inner, o) {
  o = o || {}
  return (
    `<div class="cardwrap${o.float === false ? '' : ' float'}">` +
    `<div class="card3d${o.enter && o.enter !== 'none' ? ' ' + o.enter : ''}" id="${o.id || 'card'}" role="img" aria-label="${esc(o.label || '')}">` +
    (o.marks
      ? `<span class="mark no" aria-hidden="true">${ICON_X}</span><span class="mark yes" aria-hidden="true">${ICON_V}</span>`
      : '') +
    `${inner}</div></div>` +
    (o.shadow === false ? '' : '<div class="floorshadow" aria-hidden="true"></div>')
  )
}

export const statsHTML = list => list.map(s => `<div><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')

export function rankRow(A, B, val, sub, pct, cls) {
  return (
    `<li class="rrow"><span class="minis">${orbHTML(A)}${orbHTML(B)}</span>` +
    `<span><span class="rn">${esc(A.short)}/<wbr>${esc(B.short)}</span>` +
    `<span class="rbar${cls ? ' ' + cls : ''}"><i style="width:${pct}%"></i></span></span>` +
    `<span class="rv">${val}<small>${sub}</small></span></li>`
  )
}

// Riduce il corpo dei cognomi finché entrano nella card
export function fit(root) {
  ;(root || document).querySelectorAll('.surname').forEach(el => {
    el.style.fontSize = ''
    let size = parseFloat(getComputedStyle(el).fontSize)
    let guard = 0
    while (el.scrollWidth > el.clientWidth + 1 && size > 12 && guard < 40) {
      size -= 1
      el.style.fontSize = size + 'px'
      guard++
    }
  })
}
