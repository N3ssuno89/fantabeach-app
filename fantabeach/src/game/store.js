// Stato locale del giocatore anonimo: voti, coppie e atleti rimandati, per genere.
// Finché non c'è il login (passo B) questa è l'unica memoria del gioco.
import { STORAGE_KEY } from './config.js'

const empty = () => ({ votes: {}, pairs: [], deferred: [] })

export function emptyState() {
  return { M: empty(), F: empty(), answers: 0 }
}

export function load() {
  const state = emptyState()
  let raw
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch (_) {
    return state // navigazione privata o storage negato: si gioca comunque, senza memoria
  }
  if (!raw) return state
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (_) {
    return state // dato corrotto: si riparte puliti invece di far crashare il gioco
  }
  for (const g of ['M', 'F']) {
    const src = parsed && parsed[g]
    if (!src || typeof src !== 'object') continue
    if (src.votes && typeof src.votes === 'object') state[g].votes = { ...src.votes }
    if (Array.isArray(src.pairs)) state[g].pairs = src.pairs.filter(x => x && x.a && x.b)
    if (Array.isArray(src.deferred)) state[g].deferred = src.deferred.filter(id => typeof id === 'string')
  }
  if (Number.isFinite(parsed && parsed.answers)) state.answers = parsed.answers
  return state
}

export function save(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (_) {
    // Quota piena o storage negato: il gioco prosegue in memoria, non si blocca
  }
}

export function clear() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch (_) {}
}
