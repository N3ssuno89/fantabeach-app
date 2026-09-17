// Animazioni del flusso: strappo sul no, volo nel contatore, fusione delle due card.
// Con "riduci movimento" attivo ogni funzione chiama subito done(): il flusso resta identico.
import { $ } from './ui.js'

export const reducedMotion = () =>
  Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

const RM = reducedMotion()

export function hideFloor() {
  document.querySelectorAll('.floorshadow').forEach(f => { f.style.opacity = '0' })
}

export function bindTilt(el) {
  if (RM || !el) return
  const mv = e => {
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--ry', (x * 16).toFixed(2) + 'deg')
    el.style.setProperty('--rx', (-y * 16).toFixed(2) + 'deg')
    el.style.setProperty('--sx', (100 - (x + 0.5) * 100).toFixed(1) + '%')
  }
  const lv = () => {
    el.style.setProperty('--ry', '0deg')
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--sx', '110%')
  }
  el.addEventListener('pointermove', mv)
  el.addEventListener('pointerleave', lv)
  el.addEventListener('pointercancel', lv)
}

export function bindSwipe(onNo, onYes, isBusy) {
  const card = $('#card')
  if (!card) return
  let x0 = 0
  let dx = 0
  let on = false
  const TH = 90
  card.style.touchAction = 'pan-y'
  const set = v => {
    card.style.transform = v ? `translateX(${v}px) rotate(${v / 16}deg)` : ''
    card.style.setProperty('--l', Math.min(1, Math.max(0, -v / TH)))
    card.style.setProperty('--r', Math.min(1, Math.max(0, v / TH)))
  }
  card.addEventListener('pointerdown', e => {
    if (isBusy() || (e.pointerType === 'mouse' && e.button !== 0)) return
    on = true
    x0 = e.clientX
    dx = 0
    card.classList.add('dragging')
    try { card.setPointerCapture(e.pointerId) } catch (_) {}
  })
  card.addEventListener('pointermove', e => { if (on) { dx = e.clientX - x0; set(dx) } })
  card.addEventListener('pointerup', () => {
    if (!on) return
    on = false
    card.classList.remove('dragging')
    if (dx <= -TH) onNo()
    else if (dx >= TH) onYes()
    else set(0)
  })
  card.addEventListener('pointercancel', () => { on = false; card.classList.remove('dragging'); set(0) })
}

export function bindCoverflow(c) {
  if (RM || !c) return
  const upd = () => {
    const r = c.getBoundingClientRect()
    const cx = r.left + r.width / 2
    c.querySelectorAll('.mcard').forEach(el => {
      const b = el.getBoundingClientRect()
      const d = (b.left + b.width / 2 - cx) / (r.width / 2)
      const ad = Math.min(1, Math.abs(d))
      el.style.transform = `perspective(700px) rotateY(${(-d * 32).toFixed(1)}deg) scale(${(1 - ad * 0.14).toFixed(3)})`
      el.style.opacity = (1 - ad * 0.4).toFixed(2)
    })
  }
  let raf = 0
  c.addEventListener('scroll', () => {
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; upd() })
  }, { passive: true })
  upd()
}

export function slash(card, done) {
  if (RM || !card) { done(); return }
  const s = document.createElement('div')
  s.className = 'slash'
  s.innerHTML = '<i></i><i></i>'
  card.appendChild(s)
  setTimeout(done, 360)
}

export function tear(card, done) {
  if (RM || !card) { done(); return }
  const stage = $('#stage')
  const r = card.getBoundingClientRect()
  const s = stage.getBoundingClientRect()
  const pts = []
  const n = 12
  for (let i = 0; i <= n; i++) {
    const x = 50 + (i % 2 ? 5 : -5) + (Math.random() * 4 - 2)
    pts.push(`${x.toFixed(1)}% ${((i / n) * 100).toFixed(1)}%`)
  }
  const polys = [
    `polygon(0% 0%, ${pts.join(', ')}, 0% 100%)`,
    `polygon(100% 0%, ${pts.join(', ')}, 100% 100%)`,
  ]
  const pieces = polys.map(poly => {
    const c = card.cloneNode(true)
    c.removeAttribute('id')
    c.classList.remove('in-up', 'dragging')
    c.style.cssText =
      `position:absolute;margin:0;z-index:7;left:${r.left - s.left}px;top:${r.top - s.top}px;` +
      `width:${r.width}px;height:${r.height}px;clip-path:${poly};-webkit-clip-path:${poly};transform:none;transition:none`
    stage.appendChild(c)
    return c
  })
  card.style.visibility = 'hidden'
  pieces[0].animate(
    [
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
      { transform: 'translate(-8px,0) rotate(-1.5deg)', opacity: 1, offset: 0.14 },
      { transform: 'translate(-110px,90px) rotate(-24deg)', opacity: 0 },
    ],
    { duration: 820, easing: 'cubic-bezier(.45,0,.8,.55)', fill: 'forwards' }
  )
  const a2 = pieces[1].animate(
    [
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
      { transform: 'translate(8px,0) rotate(1.5deg)', opacity: 1, offset: 0.14 },
      { transform: 'translate(110px,90px) rotate(24deg)', opacity: 0 },
    ],
    { duration: 820, easing: 'cubic-bezier(.45,0,.8,.55)', fill: 'forwards' }
  )
  a2.onfinish = () => { pieces.forEach(p => p.remove()); done() }
}

export function flyToCounter(el, done) {
  if (RM || !el) { done(); return }
  const cur = el.style.transform || 'translate(0px,0px)'
  el.style.transform = ''
  const r = el.getBoundingClientRect()
  el.style.transform = cur
  const t = $('#mine').getBoundingClientRect()
  const dx = t.left + t.width / 2 - (r.left + r.width / 2)
  const dy = t.top + t.height / 2 - (r.top + r.height / 2)
  el.animate(
    [
      { transform: cur, opacity: 1 },
      { transform: 'translate(0px,-34px) scale(1.05) rotate(-2deg)', opacity: 1, offset: 0.25 },
      { transform: `translate(${dx.toFixed(0)}px,${dy.toFixed(0)}px) scale(.06) rotate(12deg)`, opacity: 0.25 },
    ],
    { duration: 720, easing: 'cubic-bezier(.55,0,.35,1)', fill: 'forwards' }
  ).onfinish = done
}

export function dropOut(el, done) {
  if (RM || !el) { done(); return }
  el.animate(
    [
      { transform: 'translateY(0) scale(1)', opacity: 1 },
      { transform: 'translateY(140px) scale(.9) rotateX(24deg)', opacity: 0 },
    ],
    { duration: 420, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' }
  ).onfinish = done
}

function flash() {
  if (RM) return
  const f = document.createElement('div')
  f.className = 'flash'
  $('#stage').appendChild(f)
  f.animate(
    [
      { opacity: 0, transform: 'scale(.6)' },
      { opacity: 1, transform: 'scale(1)', offset: 0.3 },
      { opacity: 0, transform: 'scale(1.3)' },
    ],
    { duration: 560, easing: 'ease-out' }
  ).onfinish = () => f.remove()
}

export function merge(done) {
  if (RM) { done(); return }
  const A = $('#cardA')
  const B = $('#cardB')
  if (!A || !B) { done(); return }
  A.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(40%,0) scale(.72)', opacity: 0 }],
    { duration: 440, easing: 'cubic-bezier(.6,0,.4,1)', fill: 'forwards' })
  B.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(-40%,0) scale(.72)', opacity: 0 }],
    { duration: 440, easing: 'cubic-bezier(.6,0,.4,1)', fill: 'forwards' }).onfinish = () => { flash(); done() }
}

export function burst() {
  if (RM) return
  const stage = $('#stage')
  const card = $('#card')
  if (!card) return
  const r = card.getBoundingClientRect()
  const s = stage.getBoundingClientRect()
  const cx = r.left - s.left + r.width / 2
  const cy = r.top - s.top + r.height / 2
  const cols = ['#FF6B2C', '#FFB21E', '#3FD6A0', '#F3ECDD']
  for (let i = 0; i < 28; i++) {
    const d = document.createElement('span')
    d.className = 'spark'
    d.style.left = cx + 'px'
    d.style.top = cy + 'px'
    d.style.background = cols[i % 4]
    d.style.boxShadow = '0 0 12px ' + cols[i % 4]
    stage.appendChild(d)
    const ang = Math.random() * Math.PI * 2
    const dist = 130 + Math.random() * 130
    d.animate(
      [
        { transform: 'translate(0,0) scale(1.2)', opacity: 1 },
        { transform: `translate(${(Math.cos(ang) * dist).toFixed(1)}px,${(Math.sin(ang) * dist).toFixed(1)}px) scale(.3)`, opacity: 0 },
      ],
      { duration: 750 + Math.random() * 350, easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'forwards' }
    ).onfinish = () => d.remove()
  }
}
