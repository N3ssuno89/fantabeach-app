// Accesso a Supabase per il Coppie Game.
// Stesse variabili d'ambiente e stesso stile di App.jsx: REST puro, niente SDK.
// Il client non scrive mai direttamente nelle tabelle: solo funzioni RPC (SPEC §3).

const URL = import.meta.env.VITE_SUPABASE_URL || ''
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const configured = Boolean(URL && ANON)

// Foto degli atleti: bucket pubblico game-players, file indicato da photo_path
export const photoUrl = path =>
  path ? `${URL}/storage/v1/object/public/game-players/${encodeURIComponent(path)}` : null

const headers = () => ({
  apikey: ANON,
  Authorization: `Bearer ${ANON}`,
  'Content-Type': 'application/json',
})

async function get(path) {
  if (!configured) throw new Error('Supabase non configurato')
  const res = await fetch(`${URL}/rest/v1/${path}`, { headers: headers() })
  if (!res.ok) throw new Error(`Lettura ${path}: HTTP ${res.status} ${await res.text()}`)
  return res.json()
}

// Le funzioni di statistica sono eseguibili anche da anonimo (grant su anon nello schema).
// Con un token si chiama come utente: serve per le funzioni di scrittura.
async function rpc(name, args, token) {
  if (!configured) throw new Error('Supabase non configurato')
  const h = headers()
  if (token) h.Authorization = `Bearer ${token}`
  const res = await fetch(`${URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify(args || {}),
  })
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} ${await res.text()}`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

async function getAs(path, token) {
  if (!configured) throw new Error('Supabase non configurato')
  const h = headers()
  if (token) h.Authorization = `Bearer ${token}`
  const res = await fetch(`${URL}/rest/v1/${path}`, { headers: h })
  if (!res.ok) throw new Error(`Lettura ${path}: HTTP ${res.status} ${await res.text()}`)
  return res.json()
}

// Fotografia 2026: ~227 atleti e 94 coppie, sotto il limite righe di PostgREST
export const getAthletes = () =>
  get('game_athletes?select=node,gender,full_name,ranking_pos,fb_points,photo_path&limit=1000')

export const getPairs = () =>
  get('game_pairs?select=id,gender,node_1,node_2,tappe_insieme,partite_insieme,partite_vinte,punti_insieme,ultima_tappa,in_deck,deck_order&limit=1000')

// I nomi degli argomenti sono quelli reali delle funzioni SQL (p_...): PostgREST usa quelli
export const getVoteStats = gender => rpc('game_vote_stats', { p_gender: gender })
export const getPairStats = gender => rpc('game_pair_stats', { p_gender: gender })
export const getTotals = gender => rpc('game_totals', { p_gender: gender })

// ---- Scritture: solo tramite RPC, sempre con il token dell'utente ----
export const vote = (token, pairId, choice) => rpc('game_vote', { p_pair_id: pairId, p_choice: choice }, token)
export const unvote = (token, pairId) => rpc('game_unvote', { p_pair_id: pairId }, token)
export const savePair = (token, n1, n2) => rpc('game_save_pair', { p_node_1: n1, p_node_2: n2 }, token)
export const removePair = (token, n1, n2) => rpc('game_remove_pair', { p_node_1: n1, p_node_2: n2 }, token)
// p_votes: [{pair_id, choice}] · p_pairs: [{node_1, node_2}]
export const sync = (token, votes, pairs) => rpc('game_sync', { p_votes: votes, p_pairs: pairs }, token)

// ---- Riletture dei propri pronostici (RLS: ogni utente vede solo i suoi) ----
export const getMyVotes = token => getAs('game_votes?select=pair_id,choice', token)
export const getMyPredictions = token => getAs('game_predictions?select=gender,node_a,node_b,kind', token)
