// Trasforma le righe di game_athletes / game_pairs nelle strutture usate dal gioco.
import { getAthletes, getPairs, getVoteStats, getPairStats, getTotals } from './supabase.js'

const COMPOUND = ['MARIA RACHELE', 'CINDY LEE', 'LUKAS PHILIP', 'ANNA MARIA', 'GIAN MARCO']

const accents = s =>
  s.replace(/A'/g, 'À').replace(/E'/g, 'È').replace(/I'/g, 'Ì').replace(/O'/g, 'Ò').replace(/U'/g, 'Ù')

const titleCase = s => s.toLowerCase().replace(/(^|[\s-])(\S)/g, (m, p, c) => p + c.toUpperCase())

// full_name arriva come "COGNOME NOME": il nome è l'ultima parola, salvo i nomi composti noti
export function splitName(raw) {
  const s = accents(String(raw).trim().replace(/\s+/g, ' ').toUpperCase())
  for (const c of COMPOUND) {
    if (s.length > c.length + 1 && s.slice(-(c.length + 1)) === ' ' + c) {
      return { last: titleCase(s.slice(0, -(c.length + 1))), first: titleCase(c) }
    }
  }
  const parts = s.split(' ')
  if (parts.length === 1) return { last: titleCase(s), first: '' }
  const first = parts.pop()
  return { last: titleCase(parts.join(' ')), first: titleCase(first) }
}

export const idOf = node => 'n' + node

export async function loadWorld() {
  const [athRows, pairRows] = await Promise.all([getAthletes(), getPairs()])

  const ATH = {}
  const LIST = { M: [], F: [] }
  const P26 = { M: [], F: [] }
  const DECK = { M: [], F: [] }

  for (const r of athRows) {
    const nm = splitName(r.full_name)
    const a = {
      id: idOf(r.node),
      node: r.node,
      first: nm.first,
      last: nm.last,
      pos: r.ranking_pos,
      pts: Number(r.fb_points) || 0,
      g: r.gender,
      photo_path: r.photo_path || null,
    }
    ATH[a.id] = a
    if (LIST[a.g]) LIST[a.g].push(a)
  }

  // Cognomi ripetuti: si aggiunge l'iniziale del nome per distinguerli
  for (const g of ['M', 'F']) {
    const seen = {}
    LIST[g].forEach(a => { seen[a.last] = (seen[a.last] || 0) + 1 })
    LIST[g].forEach(a => { a.short = seen[a.last] > 1 && a.first ? `${a.last} ${a.first.charAt(0)}.` : a.last })
    LIST[g].sort((u, v) => u.pos - v.pos)
  }

  for (const r of pairRows) {
    let A = ATH[idOf(r.node_1)]
    let B = ATH[idOf(r.node_2)]
    if (!A || !B) continue
    if (B.pos < A.pos) [A, B] = [B, A] // in card e nomi viene prima chi è più alto in ranking
    const p = {
      id: r.id,
      a: A.id,
      b: B.id,
      tappe: r.tappe_insieme,
      partite: r.partite_insieme,
      vinte: r.partite_vinte,
      punti: Number(r.punti_insieme) || 0,
      ultima: r.ultima_tappa,
      inDeck: r.in_deck === true,
      order: r.deck_order,
    }
    if (!P26[r.gender]) continue
    P26[r.gender].push(p)
    if (p.inDeck) DECK[r.gender].push(p)
  }

  // Ordine del mazzo: prima le coppie con la foto a entrambi, poi quelle senza
  // foto a nessuno dei due, per ultime le miste (una card con una foto e una
  // sagoma sembra rotta). Dentro ogni gruppo resta il deck_order del database.
  const gruppo = p => {
    const a = Boolean(ATH[p.a].photo_path)
    const b = Boolean(ATH[p.b].photo_path)
    if (a && b) return 0
    if (!a && !b) return 1
    return 2
  }
  for (const g of ['M', 'F']) {
    DECK[g].sort((u, v) => gruppo(u) - gruppo(v) || (u.order ?? 1e9) - (v.order ?? 1e9))
  }

  return { ATH, LIST, P26, DECK }
}

const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`)
export { pairKey }

// Voti reali della community. Se le funzioni non rispondono il gioco resta
// giocabile: si mostra "Ancora pochi voti" ovunque invece di bloccarsi.
export async function loadStats(gender) {
  const stats = { vote: {}, pair: {}, byNode: {}, totals: null, ok: false }
  let voteRows, pairRows, totals
  try {
    ;[voteRows, pairRows, totals] = await Promise.all([
      getVoteStats(gender),
      getPairStats(gender),
      getTotals(gender),
    ])
  } catch (err) {
    console.error('[coppie-game] statistiche community non disponibili:', err.message)
    return stats
  }
  for (const r of voteRows || []) {
    stats.vote[r.pair_id] = { stay: r.stay || 0, split: r.split || 0 }
  }
  for (const r of pairRows || []) {
    const n = r.votes || 0
    stats.pair[pairKey(idOf(r.node_a), idOf(r.node_b))] = n
    stats.byNode[idOf(r.node_a)] = (stats.byNode[idOf(r.node_a)] || 0) + n
    stats.byNode[idOf(r.node_b)] = (stats.byNode[idOf(r.node_b)] || 0) + n
  }
  stats.totals = (totals && totals[0]) || null
  stats.ok = true
  return stats
}
