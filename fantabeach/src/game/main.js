// Coppie Game — flusso a pagina unica, dati reali, voti salvati sul telefono.
// Login e scrittura su Supabase arrivano nel passo successivo.
import './game.css'
import { GAME_NAME, minVotes, FREE_ANSWERS, SHARE_HANDLE } from './config.js'
import { configured } from './supabase.js'
import * as db from './supabase.js'
import * as session from './session.js'
import { authSheetHTML, submitAuth } from './authui.js'
import { loadWorld, loadStats, pairKey, idOf } from './data.js'
import * as store from './store.js'
import {
  $, esc, num, norm, cap, artN, tier, FEW_VOTES, ICON_X, ICON_V,
  posterPairHTML, posterSoloHTML, cardShell, statsHTML, rankRow, fit, figSpan, orbHTML,
} from './ui.js'
import {
  hideFloor, bindTilt, bindSwipe, bindCoverflow, slash, tear, flyToCounter, dropOut, merge, burst,
} from './anim.js'
import { renderPairStory, renderAllPairsStory } from './story.js'
import { shareStory, copyLink, canvasToBlob, download, slug, gameLink as gameLinkText } from './share.js'

let ATH = {}
let LIST = { M: [], F: [] }
let P26 = { M: [], F: [] }
let DECK = { M: [], F: [] }
const STATS = { M: null, F: null }

const mk = () => ({ votes: {}, pairs: [], deferred: [], queue: [], mode: null, cur: {} })
const S = {
  g: 'M',
  G: { M: mk(), F: mk() },
  busy: false,
  lastFocus: null,
  auth: null,        // { token, user, username } quando si è loggati
  answers: 0,        // risposte sì/no date da anonimo: al terzo si chiede il login
  authMode: 'login',
}
const MIN = () => minVotes()
const isAuthed = () => Boolean(S.auth && S.auth.token)
const nodeOf = id => ATH[id].node

const gs = () => S.G[S.g]
const mateWord = () => (S.g === 'M' ? 'compagno' : 'compagna')
const announce = t => { const n = $('#sr'); if (n) n.textContent = t }
const toTop = () => { try { window.scrollTo(0, 0) } catch (_) {} }

// ---------- Persistenza locale ----------
function persist() {
  // Chi è loggato ha il database come memoria: niente copia locale da riconciliare
  if (isAuthed()) return
  const out = { answers: S.answers }
  for (const g of ['M', 'F']) {
    const st = S.G[g]
    out[g] = { votes: st.votes, pairs: st.pairs, deferred: st.deferred }
  }
  store.save(out)
}

function restore() {
  const saved = store.load()
  for (const g of ['M', 'F']) {
    const st = S.G[g]
    st.votes = saved[g].votes
    // Scarta coppie e rimandati che non esistono più nella fotografia 2026
    st.pairs = saved[g].pairs.filter(x => ATH[x.a] && ATH[x.b])
    st.deferred = saved[g].deferred.filter(id => ATH[id])
  }
  S.answers = saved.answers || 0
}

// ---------- Lettura del mondo ----------
const p26Of = id => {
  const g = ATH[id].g
  return P26[g].find(p => p.a === id || p.b === id) || null
}
const mateOf = (p, id) => (p.a === id ? p.b : p.a)
const pairById = id => P26[S.g].find(p => p.id === id) || null
const pairName = x => `${ATH[x.a].short}/${ATH[x.b].short}`
const isPlaced = id => S.G[ATH[id].g].pairs.some(x => x.a === id || x.b === id)
const partnerOf = id => {
  const st = S.G[ATH[id].g]
  for (const x of st.pairs) {
    if (x.a === id) return x.b
    if (x.b === id) return x.a
  }
  return null
}

// ---------- Percentuali reali. null = sotto soglia, si scrive "Ancora pochi voti" ----------
function stayPct(p) {
  const s = STATS[S.g]
  const v = s && s.vote[p.id]
  if (!v) return null
  const tot = v.stay + v.split
  if (tot < MIN()) return null
  return Math.round((v.stay / tot) * 100)
}

function pairPct(a, b) {
  const s = STATS[ATH[a].g]
  if (!s) return null
  const tot = s.byNode[a] || 0
  if (tot < MIN()) return null
  // Una coppia senza voti vale 0%, non 1%: non si inventa consenso che non c'è
  return Math.round(((s.pair[pairKey(a, b)] || 0) / tot) * 100)
}

function pctFor(x) {
  if (x.kind === 'confermata') {
    const p = p26Of(x.a)
    return p ? stayPct(p) : null
  }
  // Sempre dall'atleta più alto in ranking (x.a), sia da anonimo sia da loggati:
  // il database non registra chi ha scelto, così il numero non cambia dopo l'accesso.
  return pairPct(x.a, x.b)
}

const pctLine = pct =>
  pct == null
    ? `${FEW_VOTES} per dire cosa pensa la community.`
    : pct < 10
      ? `Scelta controcorrente: solo ${artN(pct)}${pct}% la pensa come te.`
      : `${cap(artN(pct))}${pct}% la pensa come te.`

// ---------- Scritture sul database ----------
// Ogni chiamata è esplicita e non fa cadere il gioco: se il server rifiuta,
// lo stato locale resta e l'utente vede un avviso.
async function write(label, fn) {
  if (!isAuthed()) return false
  try {
    await fn(S.auth.token)
    return true
  } catch (err) {
    console.error(`[coppie-game] ${label}:`, err.message)
    toast('Non sono riuscito a salvare. Riprova.')
    return false
  }
}

// Dopo un voto salvato le percentuali devono cambiare subito: si rileggono e si ridisegna
async function refreshStats(g) {
  STATS[g] = await loadStats(g)
  if (S.g === g && !S.busy) render('none')
}

function remoteVote(pairId, choice) {
  write('game_vote', t => db.vote(t, pairId, choice)).then(ok => { if (ok) refreshStats(S.g) })
}
function remoteSavePair(a, b) {
  write('game_save_pair', t => db.savePair(t, nodeOf(a), nodeOf(b))).then(ok => { if (ok) refreshStats(S.g) })
}
function remoteUnvote(pairId) {
  write('game_unvote', t => db.unvote(t, pairId)).then(ok => { if (ok) refreshStats(S.g) })
}
function remoteRemovePair(a, b) {
  write('game_remove_pair', t => db.removePair(t, nodeOf(a), nodeOf(b))).then(ok => { if (ok) refreshStats(S.g) })
}

// ---------- Regole del gioco ----------
function addPair(a, b) {
  const st = S.G[ATH[a].g]
  st.pairs = st.pairs.filter(x => !(x.a === a || x.b === a || x.a === b || x.b === b))
  st.deferred = st.deferred.filter(id => id !== a && id !== b)
  const pa = p26Of(a)
  const same = Boolean(pa && mateOf(pa, a) === b)
  if (same) st.votes[pa.id] = 'stay'
  const A = ATH[a]
  const B = ATH[b]
  // x.a è sempre l'atleta più alto in ranking: le percentuali si calcolano da lui
  const x = B.pos < A.pos ? { a: b, b: a } : { a, b }
  x.kind = same ? 'confermata' : 'nuova'
  st.pairs.push(x)
  persist()
  return x
}

function removePair(i) {
  const st = gs()
  const x = st.pairs[i]
  if (!x) return
  st.pairs.splice(i, 1)
  remoteRemovePair(x.a, x.b)
  if (x.kind === 'confermata') {
    const p = p26Of(x.a)
    if (p) delete st.votes[p.id]
  } else {
    for (const id of [x.a, x.b]) if (st.deferred.indexOf(id) < 0) st.deferred.push(id)
  }
  persist()
  if (st.mode === 'end' || (st.mode === 'created' && st.cur.pair === x)) advance()
}

// Prima chi è rimasto senza compagno, poi le coppie del mazzo nell'ordine del database
function advance() {
  const st = gs()
  while (st.queue.length) {
    const pid = st.queue.shift()
    if (isPlaced(pid) || st.deferred.indexOf(pid) >= 0) continue
    st.mode = 'orphan'
    st.cur = { pid, why: 'split' }
    return
  }
  const deck = DECK[S.g]
  for (const p of deck) {
    if (st.votes[p.id]) continue
    const aP = isPlaced(p.a)
    const bP = isPlaced(p.b)
    if (aP || bP) {
      st.votes[p.id] = 'split'
      persist()
      remoteVote(p.id, 'split')
      if (aP && bP) continue
      const orphan = aP ? p.b : p.a
      if (st.deferred.indexOf(orphan) >= 0) continue
      st.mode = 'orphan'
      st.cur = { pid: orphan, why: 'moved', moved: aP ? p.a : p.b }
      return
    }
    st.mode = 'pair'
    st.cur = { pairId: p.id }
    return
  }
  st.mode = 'end'
  st.cur = {}
}

// ---------- Viste ----------
function viewPair(enter) {
  const st = gs()
  const p = pairById(st.cur.pairId)
  const A = ATH[p.a]
  const B = ATH[p.b]
  const stats = statsHTML([[p.tappe, 'tappe insieme'], [p.partite, 'partite insieme'], [num(p.punti), 'punti insieme']])
  return (
    cardShell(posterPairHTML(A, B, { label: 'Coppia 2026', stats }), {
      marks: true,
      enter: enter || 'in-up',
      label: `Coppia 2026: ${A.first} ${A.last} e ${B.first} ${B.last}, ${p.tappe} tappe insieme, ${p.partite} partite insieme, ${num(p.punti)} punti insieme`,
    }) +
    '<h1 class="q">Giocano ancora insieme nel 2027?</h1>' +
    `<div class="actions"><div class="actcol"><button type="button" class="act no" data-act="no" aria-label="No, si separano">${ICON_X}</button>Si separano</div>` +
    `<div class="actcol"><button type="button" class="act yes" data-act="yes" aria-label="Sì, restano insieme">${ICON_V}</button>Restano</div></div>`
  )
}

function soloCard(a, o) {
  const p = p26Of(a.id)
  const mate = p ? ATH[mateOf(p, a.id)] : null
  return posterSoloHTML(a, o, mate, mateWord())
}

function viewPick(enter) {
  const st = gs()
  const a = ATH[st.cur.pid]
  return (
    '<div class="pickhead">' +
    cardShell(soloCard(a, { sm: true }), { enter: enter || 'in-up', label: `${a.first} ${a.last}`, shadow: false }) +
    `<h1 class="q">Con chi gioca ${esc(a.short)}?</h1>` +
    `<input id="search" class="search" type="search" autocomplete="off" placeholder="Cerca per cognome" aria-label="Cerca per cognome" value="${esc(st.cur.q || '')}">` +
    fewVotesHint(a.id) +
    `<div class="carousel" id="carousel" role="list" aria-label="Scegli ${S.g === 'M' ? 'il compagno' : 'la compagna'}"></div>` +
    `<div class="minor">${st.cur.undoPair ? '<button type="button" class="linkbtn" data-act="undo">Annulla il no</button>' : ''}` +
    '<button type="button" class="linkbtn" data-act="later">Decido dopo</button></div></div>'
  )
}

// Sotto soglia le card del carosello non portano percentuali: si dice perché, invece di lasciare il vuoto
function fewVotesHint(pid) {
  const s = STATS[S.g]
  const tot = (s && s.byNode[pid]) || 0
  if (tot >= MIN()) return ''
  const n = MIN()
  return `<p class="sub">${FEW_VOTES}: le percentuali compaiono con i primi ${n} ${n === 1 ? 'pronostico' : 'pronostici'}.</p>`
}

function candidates(pid) {
  const st = gs()
  const p = p26Of(pid)
  const mate = p ? mateOf(p, pid) : null
  const qn = norm((st.cur.q || '').trim())
  return LIST[S.g]
    .filter(x => {
      if (x.id === pid || isPlaced(x.id)) return false
      if (x.id === mate && st.votes[p.id] === 'split') return false
      return !qn || norm(x.last + ' ' + x.first).indexOf(qn) > -1 || norm(x.first + ' ' + x.last).indexOf(qn) > -1
    })
    .map(x => ({ a: x, pct: pairPct(pid, x.id) }))
    .sort((u, v) => (v.pct || 0) - (u.pct || 0) || u.a.pos - v.a.pos)
}

function renderCarousel() {
  const st = gs()
  const c = $('#carousel')
  if (!c) return
  const list = candidates(st.cur.pid)
  c.innerHTML = list.length
    ? list
        .map(o => {
          const a = o.a
          const t = tier(a.pos)
          const label = o.pct == null ? `${a.first} ${a.last}, ${t[1]}` : `${a.first} ${a.last}, ${t[1]}, scelto dal ${o.pct}% della community`
          return (
            `<button type="button" class="mcard" role="listitem" data-cand="${a.id}" aria-label="${esc(label)}">` +
            '<div class="cborder xs"><div class="vX mini">' +
            '<div class="bg" aria-hidden="true"><span class="halftone"></span><span class="glow"></span></div><div class="ground" aria-hidden="true"></div>' +
            (o.pct == null ? '' : `<span class="pct">${o.pct}%</span>`) +
            `<div class="figs">${figSpan(a, 'c')}</div>` +
            `<div class="names one"><div><span class="surname">${esc(a.last)}</span><span class="first">${esc(a.first)}</span></div></div></div></div></button>`
          )
        })
        .join('')
    : '<p class="sub">Nessun atleta libero con questo cognome.</p>'
  fit(c)
  bindCoverflow(c)
}

function viewConfirm() {
  const st = gs()
  const a = ATH[st.cur.pid]
  const b = ATH[st.cur.cand]
  // Stessa regola della card finale e della storia: si conta dall'atleta più alto in ranking
  const hi = a.pos <= b.pos ? a : b
  const lo = hi === a ? b : a
  const pct = pairPct(hi.id, lo.id)
  return (
    `<div class="pairup"><div class="slot a">${cardShell(soloCard(a, { sm: true }), { id: 'cardA', float: false, shadow: false, label: `${a.first} ${a.last}` })}</div>` +
    `<div class="slot b">${cardShell(soloCard(b, { sm: true }), { id: 'cardB', float: false, shadow: false, enter: 'in-right', label: `${b.first} ${b.last}` })}</div></div>` +
    `<h1 class="q">${esc(a.short)} con ${esc(b.short)}?</h1>` +
    `<p class="sub">${pct == null ? `${FEW_VOTES} su questa coppia.` : `${cap(artN(pct))}${pct}% della community ha fatto la stessa scelta.`}</p>` +
    '<div class="btns"><button type="button" class="btn" data-act="change">Cambia</button><button type="button" class="btn primary" data-act="confirm">Conferma</button></div>'
  )
}

function viewCreated() {
  const st = gs()
  const x = st.cur.pair
  const A = ATH[x.a]
  const B = ATH[x.b]
  const pct = pctFor(x)
  const stats = statsHTML([
    [num(A.pts + B.pts), 'punti 2026 in due'],
    [pct == null ? '—' : pct + '%', 'della community'],
    [`#${A.pos} #${B.pos}`, 'ranking'],
  ])
  return (
    cardShell(posterPairHTML(A, B, { label: 'Nuova coppia 2027', hot: true, stats }), {
      enter: 'pop',
      label: `Nuova coppia 2027: ${A.first} ${A.last} e ${B.first} ${B.last}`,
    }) +
    `<h1 class="q">Team ${esc(A.short)}/<wbr>${esc(B.short)}</h1>` +
    `<p class="sub">${pctLine(pct)}</p>` +
    '<div class="btns"><button type="button" class="btn" data-act="continue">Continua</button>' +
    '<button type="button" class="btn primary" data-act="share-created">Condividi nella storia</button></div>'
  )
}

function viewOrphan(enter) {
  const st = gs()
  const a = ATH[st.cur.pid]
  const f = S.g === 'F'
  let why
  if (st.cur.why === 'moved') {
    const m = ATH[st.cur.moved]
    const mp = partnerOf(m.id)
    why = `Hai messo ${esc(m.short)} con ${esc(mp ? ATH[mp].short : '')}: ${esc(a.short)} è ${f ? 'rimasta senza compagna' : 'rimasto senza compagno'}.`
  } else {
    why = f ? 'È rimasta senza compagna.' : 'È rimasto senza compagno.'
  }
  return (
    cardShell(soloCard(a, {}), { enter: enter || 'in-up', label: `${a.first} ${a.last}` }) +
    `<h1 class="q">E ${esc(a.short)}?</h1><p class="sub">${why}</p>` +
    `<div class="btns"><button type="button" class="btn" data-act="later">Decido dopo</button>` +
    `<button type="button" class="btn primary" data-act="orphan-pick">Scegli ${f ? 'la compagna' : 'il compagno'}</button></div>`
  )
}

function tileHTML(x, i, withRemove) {
  const A = ATH[x.a]
  const B = ATH[x.b]
  const conf = x.kind === 'confermata'
  return (
    `<div class="ptile${conf ? ' conf' : ''}"><div class="cborder thin"><div class="vX tl">` +
    '<div class="bg" aria-hidden="true"><span class="halftone"></span><span class="big b2">2027</span><span class="big b1">2027</span><span class="glow"></span></div><div class="ground" aria-hidden="true"></div>' +
    `<div class="figs">${figSpan(A, 'a')}${figSpan(B, 'b')}</div>` +
    `<span class="tname">${esc(A.short)}/<wbr>${esc(B.short)}</span><span class="tkind">${conf ? 'Restano insieme' : 'Nuova coppia'}</span>` +
    '</div></div>' +
    `<button type="button" class="tbtn share" data-act="share-row" data-i="${i}" aria-label="Condividi ${esc(pairName(x))}">${SHARE_ICON}</button>` +
    (withRemove ? `<button type="button" class="tbtn rm" data-rm="${i}" aria-label="Togli ${esc(pairName(x))}">×</button>` : '') +
    '</div>'
  )
}

function communityHTML() {
  const g = S.g
  const s = STATS[g]
  if (!s || !s.ok) {
    return '<section class="sec"><h2>Cosa pensa la community</h2><p class="sub">Dati non disponibili in questo momento.</p></section>'
  }

  // Nuove coppie più votate: da game_pair_stats, escluse le coppie 2026
  const isPair26 = (a, b) => P26[g].some(p => (p.a === a && p.b === b) || (p.a === b && p.b === a))
  const news = Object.entries(s.pair)
    .map(([k, c]) => {
      const [a, b] = k.split('|')
      return { a, b, c }
    })
    .filter(o => ATH[o.a] && ATH[o.b] && o.c >= MIN() && !isPair26(o.a, o.b))
    .sort((u, v) => v.c - u.c)
    .slice(0, 5)
  const maxC = news.length ? news[0].c : 1
  const newRows = news
    .map(o => {
      let A = ATH[o.a]
      let B = ATH[o.b]
      if (B.pos < A.pos) [A, B] = [B, A]
      return rankRow(A, B, num(o.c), 'voti', Math.round((o.c / maxC) * 100))
    })
    .join('')

  // Conferme e separazioni: da game_vote_stats, solo coppie sopra la soglia
  const withPct = DECK[g]
    .map(p => ({ p, pct: stayPct(p) }))
    .filter(o => o.pct != null)
    .sort((u, v) => v.pct - u.pct)
  const conf = withPct
    .filter(o => o.pct >= 50)
    .slice(0, 5)
    .map(o => rankRow(ATH[o.p.a], ATH[o.p.b], o.pct + '%', 'restano', o.pct, 'm'))
    .join('')
  const spl = withPct
    .filter(o => o.pct < 50)
    .reverse()
    .slice(0, 5)
    .map(o => rankRow(ATH[o.p.a], ATH[o.p.b], 100 - o.pct + '%', 'si separano', 100 - o.pct, 'x'))
    .join('')

  const t = s.totals
  const intro = t
    ? `${num(t.pairs)} pronostici da ${num(t.players)} persone. Compaiono solo coppie con almeno ${MIN()} ${MIN() === 1 ? 'voto' : 'voti'}.`
    : `Compaiono solo coppie con almeno ${MIN()} ${MIN() === 1 ? 'voto' : 'voti'}.`
  const none = '<li class="rrow"><span></span><span class="sub">Nessuna coppia ha ancora abbastanza voti.</span><span></span></li>'

  return (
    '<section class="sec"><h2>Cosa pensa la community</h2>' +
    `<p class="sub">${intro}</p>` +
    `<h3 class="lh">Nuove coppie più votate</h3><ul class="rlist">${newRows || none}</ul>` +
    `<h3 class="lh">Conferme più sicure</h3><ul class="rlist">${conf || none}</ul>` +
    `<h3 class="lh">Separazioni più attese</h3><ul class="rlist">${spl || none}</ul></section>`
  )
}

// Atleti da sistemare: chi sta in una coppia 2026 votata "si separano" e non è
// finito in nessuna coppia dell'utente (SPEC §6). Si deduce dai voti, non da una
// lista locale: così sopravvive al login e alla rilettura dal database.
function pendingAthletes() {
  const st = gs()
  const out = []
  for (const p of P26[S.g]) {
    if (st.votes[p.id] !== 'split') continue
    for (const id of [p.a, p.b]) {
      if (!isPlaced(id) && out.indexOf(id) < 0) out.push(id)
    }
  }
  return out
}

function viewEnd() {
  const st = gs()
  const n = st.pairs.length
  const f = S.g === 'F'
  const pend = pendingAthletes()
  const pendHTML = pend.length
    ? `<div class="pending"><p>${pend.length === 1 ? '1 atleta ancora' : pend.length + ' atleti ancora'} senza ${mateWord()}.</p><div class="chips">` +
      pend.map(id => `<button type="button" class="pchip" data-pick="${id}">${esc(ATH[id].short)}</button>`).join('') +
      '</div></div>'
    : ''
  const saveHTML = isAuthed()
    ? `<div class="savebar"><p>Salvati sul tuo account${S.auth.username ? ' @' + esc(S.auth.username) : ''}. Nel 2027 ti mostriamo quante coppie avevi azzeccato.</p></div>`
    : '<div class="savebar"><p>Vuoi ritrovarli nel 2027? Entra con l\'account FantaBeach.</p><button type="button" class="btn primary" data-act="auth">Entra e salva</button></div>'
  return (
    `<div class="endwrap"><h1>Le mie coppie 2027</h1><p class="sub">${n}${n === 1 ? ' coppia' : ' coppie'} nel ${f ? 'femminile' : 'maschile'}.</p>` +
    `<div class="tiles">${st.pairs.map((x, i) => tileHTML(x, i, false)).join('')}</div>${pendHTML}` +
    (n ? '<div class="btns" style="max-width:none"><button type="button" class="btn primary" data-act="share-all">Condividi le mie coppie</button></div>' : '') +
    saveHTML + communityHTML() +
    '</div>'
  )
}

function updateTop(bump) {
  const st = gs()
  const deck = DECK[S.g]
  const done = deck.filter(p => st.votes[p.id]).length
  const end = st.mode === 'end'
  const total = deck.length || 1
  $('#pfill').style.width = (end ? 100 : Math.round((done / total) * 100)) + '%'
  $('#pmeta').textContent = `${end ? deck.length : done}/${deck.length}`
  $('#mine-n').textContent = st.pairs.length
  document.querySelectorAll('.gtoggle [data-g]').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.g === S.g))
  })
  if (bump) {
    const m = $('#mine')
    m.classList.remove('bump')
    void m.offsetWidth
    m.classList.add('bump')
  }
}

function render(enter) {
  const st = gs()
  if (!st.mode) advance()
  const stage = $('#stage')
  stage.classList.toggle('top', st.mode === 'end')
  let html
  if (st.mode === 'pair') html = viewPair(enter)
  else if (st.mode === 'pick') html = viewPick(enter)
  else if (st.mode === 'confirm') html = viewConfirm()
  else if (st.mode === 'created') html = viewCreated()
  else if (st.mode === 'orphan') html = viewOrphan(enter)
  else html = viewEnd()
  stage.innerHTML = html
  updateTop()
  fit(stage)
  bindTilt($('#card'))
  if (st.mode === 'pair') bindSwipe(actNo, actYes, () => S.busy)
  if (st.mode === 'pick') renderCarousel()
}

// ---------- Login: gate alla terza risposta (SPEC §8) ----------
// Chiudere il modale riporta alla card, ma l'azione successiva lo riapre.
const gateClosed = () => !isAuthed() && S.answers >= FREE_ANSWERS

function countAnswer() {
  if (isAuthed()) return
  S.answers += 1
  persist()
}

function requireLogin() {
  if (!gateClosed()) return false
  openAuth()
  return true
}

// Ricostruisce lo stato dai pronostici salvati sul database
async function loadFromServer() {
  const [votes, preds] = await Promise.all([
    db.getMyVotes(S.auth.token),
    db.getMyPredictions(S.auth.token),
  ])
  for (const g of ['M', 'F']) {
    const st = S.G[g]
    st.votes = {}
    st.pairs = []
    st.deferred = []
    st.mode = null
    st.cur = {}
    st.queue = []
  }
  for (const r of votes || []) {
    const p = P26.M.find(x => x.id === r.pair_id) || P26.F.find(x => x.id === r.pair_id)
    if (p) S.G[ATH[p.a].g].votes[r.pair_id] = r.choice
  }
  for (const r of preds || []) {
    let A = ATH[idOf(r.node_a)]
    let B = ATH[idOf(r.node_b)]
    if (!A || !B) continue
    if (B.pos < A.pos) [A, B] = [B, A]
    S.G[A.g].pairs.push({ a: A.id, b: B.id, kind: r.kind })
  }
}

// Dopo il login: game_sync con quello che c'è sul telefono, poi rilettura, poi pulizia
async function enterSession(token, user, syncLocal) {
  S.auth = { token, user, username: (user && user.user_metadata && user.user_metadata.username) || null }
  if (!S.auth.username && user && user.id) {
    S.auth.username = await session.getUsername(token, user.id)
  }
  if (syncLocal) {
    const votes = []
    const pairs = []
    for (const g of ['M', 'F']) {
      const st = S.G[g]
      for (const [pair_id, choice] of Object.entries(st.votes)) votes.push({ pair_id, choice })
      for (const x of st.pairs) pairs.push({ node_1: nodeOf(x.a), node_2: nodeOf(x.b) })
    }
    if (votes.length || pairs.length) {
      try {
        await db.sync(token, votes, pairs)
      } catch (err) {
        console.error('[coppie-game] game_sync:', err.message)
        toast('Alcune risposte non sono state trasferite.')
      }
    }
  }
  try {
    await loadFromServer()
  } catch (err) {
    console.error('[coppie-game] rilettura pronostici:', err.message)
  }
  store.clear()
  S.answers = 0
  advance()
  render('none')
  refreshStats(S.g)
}

function openAuth(msg) {
  S.authMode = S.authMode || 'login'
  openSheet(authSheetHTML(S.authMode, msg), '#au-email')
}

// ---------- Azioni ----------
const lock = () => { S.busy = true }
const unlock = () => { S.busy = false }

function actYes() {
  const st = gs()
  if (S.busy || st.mode !== 'pair') return
  if (requireLogin()) return
  const p = pairById(st.cur.pairId)
  lock()
  hideFloor()
  flyToCounter($('#card'), () => {
    addPair(p.a, p.b)
    // game_vote('stay') salva anche la coppia confermata: una sola chiamata
    remoteVote(p.id, 'stay')
    countAnswer()
    advance()
    render('in-up')
    updateTop(true)
    unlock()
    announce(`${ATH[p.a].short} e ${ATH[p.b].short}: restano insieme`)
    if (gateClosed()) openAuth()
  })
}

function actNo() {
  const st = gs()
  if (S.busy || st.mode !== 'pair') return
  if (requireLogin()) return
  const p = pairById(st.cur.pairId)
  const card = $('#card')
  lock()
  hideFloor()
  slash(card, () => {
    tear(card, () => {
      st.votes[p.id] = 'split'
      persist()
      remoteVote(p.id, 'split')
      countAnswer()
      st.queue = [p.b]
      st.mode = 'pick'
      st.cur = { pid: p.a, undoPair: p.id, q: '' }
      render('in-up')
      unlock()
      announce(`${ATH[p.a].short} e ${ATH[p.b].short}: si separano`)
      if (gateClosed()) openAuth()
    })
  })
}

function actCand(cid) {
  const st = gs()
  if (S.busy || st.mode !== 'pick') return
  if (requireLogin()) return
  st.cur.cand = cid
  st.mode = 'confirm'
  render()
}

function actConfirm() {
  const st = gs()
  if (S.busy || st.mode !== 'confirm') return
  if (requireLogin()) return
  const a = st.cur.pid
  const b = st.cur.cand
  lock()
  merge(() => {
    const x = addPair(a, b)
    remoteSavePair(a, b)
    st.queue = st.queue.filter(id => id !== b)
    st.mode = 'created'
    st.cur = { pair: x }
    render()
    burst()
    updateTop(true)
    unlock()
    announce('Nuova coppia: ' + pairName(x))
  })
}

function actContinue() {
  const st = gs()
  if (S.busy || st.mode !== 'created') return
  lock()
  hideFloor()
  flyToCounter($('#card'), () => { advance(); render('in-up'); unlock() })
}

function actLater() {
  const st = gs()
  const pid = st.cur.pid
  if (S.busy || !pid) return
  if (requireLogin()) return
  if (st.deferred.indexOf(pid) < 0) st.deferred.push(pid)
  persist()
  lock()
  hideFloor()
  dropOut($('#card'), () => { advance(); render('in-up'); unlock() })
}

function actUndo() {
  const st = gs()
  const pid = st.cur.undoPair
  if (S.busy || !pid) return
  if (requireLogin()) return
  delete st.votes[pid]
  persist()
  remoteUnvote(pid)
  st.queue = []
  st.mode = 'pair'
  st.cur = { pairId: pid }
  render('in-up')
}

// ---------- Pannello "Le mie coppie" ----------
function openSheet(html, focusSel) {
  S.lastFocus = document.activeElement
  $('#sheet-panel').innerHTML = html
  $('#sheet').hidden = false
  document.body.style.overflow = 'hidden'
  $('#toast').classList.remove('on')
  const f = focusSel ? $(focusSel) : $('#sheet-panel button')
  if (f) { try { f.focus({ preventScroll: true }) } catch (_) { f.focus() } }
}

function closeSheet() {
  share.token++
  share.blob = null
  $('#sheet').hidden = true
  document.body.style.overflow = ''
  if (S.lastFocus && document.contains(S.lastFocus)) {
    try { S.lastFocus.focus({ preventScroll: true }) } catch (_) {}
  }
}

function openMine(refreshOnly) {
  const panel = $('#sheet-panel')
  if (refreshOnly && ($('#sheet').hidden || !panel.querySelector('[data-sheet="mine"]'))) return
  const st = gs()
  const n = st.pairs.length
  const html =
    '<div class="grab" aria-hidden="true" data-sheet="mine"></div><h3 id="sheet-title">Le mie coppie</h3>' +
    `<p class="sheet-sub">${n ? `${n}${n === 1 ? ' coppia' : ' coppie'} nel ${S.g === 'F' ? 'femminile' : 'maschile'}. Tocca la × per toglierne una.` : 'Ancora nessuna coppia: rispondi alla prima card.'}</p>` +
    (n ? `<div class="tiles">${st.pairs.map((x, i) => tileHTML(x, i, true)).join('')}</div>` +
      '<div class="btns" style="max-width:none"><button type="button" class="btn primary" data-act="share-all">Condividi le mie coppie</button></div>' : '') +
    `<div class="sheet-foot">${isAuthed() ? '<button type="button" class="linkish" data-act="logout">Esci</button>' : '<span></span>'}<button type="button" class="btn" data-act="close">Chiudi</button></div>`
  if (refreshOnly) { panel.innerHTML = html; fit(panel); return }
  openSheet(html, '[data-act="close"]')
  fit(panel)
}

// ---------- Condivisione (SPEC §10) ----------
const share = { token: 0, blob: null, filename: '' }
const SHARE_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'

const shareNote = t => { const n = $('#share-note'); if (n) n.textContent = t }

function shareBlockHTML() {
  const link = gameLinkText()
  return (
    '<div class="story-wrap" id="story-slot"><div class="story-img loading"><span>Preparo l\'immagine</span></div></div>' +
    // Il segnaposto sta qui, davanti a chi condivide: sull'immagine lo leggerebbero i suoi follower
    `<p class="micro">Nella storia tagga ${SHARE_HANDLE} e aggiungi lo sticker Link: è facoltativo.</p>` +
    '<div class="share-actions">' +
    '<button type="button" class="btn primary" data-act="do-share" disabled>Condividi nella storia</button>' +
    '<button type="button" class="btn ghost" data-act="copy-link">Copia il link</button>' +
    '</div>' +
    // Il link resta a vista e selezionabile: se gli appunti non funzionano si copia a mano
    `<p class="micro"><span id="share-link" style="user-select:text;-webkit-user-select:text;word-break:break-all">${esc(link)}</span></p>` +
    '<p class="micro" id="share-note"></p>'
  )
}

async function mountStory(tok, canvas, filename, alt) {
  if (tok !== share.token) return
  const slot = $('#story-slot')
  if (!slot) return
  const img = new Image()
  img.className = 'story-img'
  img.alt = alt
  img.src = canvas.toDataURL('image/png')
  slot.innerHTML = ''
  slot.appendChild(img)
  share.filename = filename
  const blob = await canvasToBlob(canvas)
  if (tok !== share.token) return
  share.blob = blob
  const b = $('[data-act="do-share"]')
  if (b) b.disabled = !blob
}

// Il profilo mostrato sulla storia è quello di chi gioca (SPEC §10)
const storyUsername = () => (S.auth && S.auth.username) || 'giocatore'

function openShareSheet(title, sub, build) {
  if (!isAuthed()) { openAuth(); return }
  const tok = ++share.token
  share.blob = null
  openSheet(
    '<div class="grab" aria-hidden="true" data-sheet="share"></div>' +
    `<h3 id="sheet-title">${title}</h3><p class="sheet-sub">${sub}</p>` +
    shareBlockHTML() +
    '<div class="sheet-foot"><span></span><button type="button" class="btn ghost" data-act="close">Fatto</button></div>',
    '[data-act="close"]'
  )
  build().then(({ canvas, filename, alt }) => mountStory(tok, canvas, filename, alt)).catch(err => {
    console.error('[coppie-game] immagine storia:', err.message)
    shareNote('Non riesco a preparare l\'immagine. Riprova.')
  })
}

function sharePair(x) {
  const A = ATH[x.a]
  const B = ATH[x.b]
  const conf = x.kind === 'confermata'
  const pct = pctFor(x)
  const p = p26Of(x.a)
  const stats = conf && p
    ? [[p.tappe, 'tappe insieme'], [p.partite, 'partite insieme'], [num(p.punti), 'punti insieme']]
    : [[num(A.pts + B.pts), 'punti 2026 in due'], [pct == null ? '—' : pct + '%', 'della community'], [`#${A.pos} #${B.pos}`, 'ranking']]
  const line = pct == null
    ? 'Ancora pochi voti sulla community'
    : pct < 10
      ? `Solo ${artN(pct)}${pct}% la pensa come me`
      : `${cap(artN(pct))}${pct}% la pensa come me`
  openShareSheet(
    `Team ${esc(A.short)}/${esc(B.short)}`,
    conf ? 'Per te restano insieme nel 2027.' : 'Nuova coppia nel tuo pronostico 2027.',
    async () => ({
      canvas: await renderPairStory({
        A, B, confermata: conf, stats, pctLine: line, gender: S.g, username: storyUsername(),
      }),
      filename: `fantabeach-pronostico-${slug(A.short)}-${slug(B.short)}.png`,
      alt: `Storia: il mio pronostico 2027, Team ${A.short}/${B.short}`,
    })
  )
}

function shareAll() {
  const st = gs()
  if (!st.pairs.length) return
  const rows = st.pairs.map(x => ({ A: ATH[x.a], B: ATH[x.b], confermata: x.kind === 'confermata' }))
  openShareSheet(
    'Le mie coppie 2027',
    `${rows.length}${rows.length === 1 ? ' coppia' : ' coppie'} nel ${S.g === 'F' ? 'femminile' : 'maschile'}.`,
    async () => ({
      canvas: await renderAllPairsStory({ gender: S.g, rows, username: storyUsername() }),
      filename: 'fantabeach-coppie-2027.png',
      alt: 'Storia: le mie coppie 2027',
    })
  )
}

async function doShare() {
  if (!share.blob) return
  const { outcome, copied } = await shareStory(share.blob, share.filename)
  if (outcome === 'shared') {
    shareNote(copied
      ? 'Link copiato: nella storia aggiungi lo sticker Link e incollalo.'
      : 'Tieni premuto sul link per copiarlo.')
    return
  }
  if (outcome === 'cancelled') return
  // Niente condivisione di file su questo browser
  shareNote('Tieni premuto per salvarla.')
  download(share.blob, share.filename)
}

let tt = null
function toast(msg) {
  const t = $('#toast')
  t.textContent = msg
  t.classList.add('on')
  clearTimeout(tt)
  tt = setTimeout(() => t.classList.remove('on'), 2400)
}

// ---------- Eventi ----------
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act],[data-g],[data-cand],[data-pick],[data-rm]')
  if (!t || t.disabled) return
  const d = t.dataset
  const st = gs()
  if (d.g !== undefined) {
    if (S.busy || d.g === S.g) return
    S.g = d.g
    ensureStats(S.g).then(() => render('none'))
    render('in-up')
    return
  }
  if (d.cand !== undefined) { actCand(d.cand); return }
  if (d.pick !== undefined) {
    if (S.busy || requireLogin()) return
    st.mode = 'pick'
    st.cur = { pid: d.pick, q: '' }
    render('in-up')
    toTop()
    return
  }
  if (d.rm !== undefined) {
    const rx = st.pairs[+d.rm]
    removePair(+d.rm)
    render('none')
    openMine(true)
    if (rx) toast('Tolta ' + pairName(rx))
    return
  }
  switch (d.act) {
    case 'yes': actYes(); break
    case 'no': actNo(); break
    case 'change': if (!S.busy) { st.mode = 'pick'; delete st.cur.cand; render('none') } break
    case 'confirm': actConfirm(); break
    case 'continue': actContinue(); break
    case 'orphan-pick': if (!S.busy && !requireLogin()) { st.mode = 'pick'; st.cur = { pid: st.cur.pid, q: '' }; render('none') } break
    case 'later': actLater(); break
    case 'undo': actUndo(); break
    case 'mine': openMine(false); break
    case 'auth': openAuth(); break
    case 'auth-switch':
      S.authMode = S.authMode === 'signup' ? 'login' : 'signup'
      openAuth()
      break
    case 'logout': doLogout(); break
    case 'share-created': if (st.cur.pair) sharePair(st.cur.pair); break
    case 'share-row': if (st.pairs[+d.i]) sharePair(st.pairs[+d.i]); break
    case 'share-all': shareAll(); break
    case 'do-share': doShare(); break
    case 'copy-link':
      copyLink().then(ok => shareNote(ok
        ? 'Link copiato: nella storia aggiungi lo sticker Link e incollalo.'
        : 'Tieni premuto sul link per copiarlo.'))
      break
    case 'close': closeSheet(); break
  }
})

// Invio del modale di accesso
document.addEventListener('submit', async e => {
  if (!e.target || e.target.id !== 'authform') return
  e.preventDefault()
  const btn = $('#au-submit')
  const msg = $('#au-msg')
  const email = ($('#au-email') || {}).value || ''
  const password = ($('#au-password') || {}).value || ''
  const username = ($('#au-username') || {}).value || ''
  btn.disabled = true
  msg.textContent = 'Un attimo...'
  const res = await submitAuth(S.authMode, { email, password, username })
  if (res.error) {
    btn.disabled = false
    msg.textContent = res.error
    return
  }
  closeSheet()
  await enterSession(res.token, res.user, true)
  toast('Pronostici salvati sul tuo account')
})

async function doLogout() {
  const token = S.auth && S.auth.token
  S.auth = null
  if (token) await session.signOut(token)
  session.clearToken()
  for (const g of ['M', 'F']) S.G[g] = mk()
  S.answers = 0
  store.clear()
  closeSheet()
  advance()
  render('none')
  toast('Sei uscito')
}

document.addEventListener('input', e => {
  if (e.target && e.target.id === 'search') { gs().cur.q = e.target.value; renderCarousel() }
})

document.addEventListener('keydown', e => {
  if (!$('#sheet').hidden) { if (e.key === 'Escape') closeSheet(); return }
  if (e.target && e.target.id === 'search') return
  const st = gs()
  if (S.busy) return
  if (st.mode === 'pair') {
    if (e.key === 'ArrowLeft') actNo()
    else if (e.key === 'ArrowRight') actYes()
  }
})

let rz = null
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => fit(), 120) })

// ---------- Avvio ----------
async function ensureStats(g) {
  if (STATS[g]) return STATS[g]
  STATS[g] = await loadStats(g)
  return STATS[g]
}

function fatal(msg) {
  const stage = $('#stage')
  if (stage) stage.innerHTML = `<div class="endwrap"><h1>${GAME_NAME}</h1><p class="sub">${esc(msg)}</p></div>`
}

async function boot() {
  if (!configured) {
    fatal('Configurazione mancante: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY non sono impostate.')
    return
  }
  try {
    const world = await loadWorld()
    ATH = world.ATH
    LIST = world.LIST
    P26 = world.P26
    DECK = world.DECK
  } catch (err) {
    console.error('[coppie-game]', err)
    fatal('Non riesco a caricare gli atleti. Riprova tra poco.')
    return
  }
  if (!DECK.M.length && !DECK.F.length) {
    fatal('Nessuna coppia 2026 nel mazzo: controlla il seed del database.')
    return
  }
  if (!DECK.M.length) S.g = 'F'
  restore()

  // Chi è già loggato sull'app non vede mai il modale: si riparte dalla sua sessione
  const live = await session.restore()
  if (live) {
    const hasLocal = ['M', 'F'].some(g => Object.keys(S.G[g].votes).length || S.G[g].pairs.length)
    await enterSession(live.token, live.user, hasLocal)
    session.startAutoRefresh(t => { if (S.auth) S.auth.token = t })
  }

  render('in-up')
  await ensureStats(S.g)
  render('none')
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fit())
}

boot()
