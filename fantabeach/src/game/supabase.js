// Accesso a Supabase per il Coppie Game.
// Stesse variabili d'ambiente e stesso stile di App.jsx: REST puro, niente SDK.
// In questo passo si legge soltanto: la scrittura dei voti arriva con il login.

const URL = import.meta.env.VITE_SUPABASE_URL || ''
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const configured = Boolean(URL && ANON)

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

// Le funzioni di statistica sono eseguibili anche da anonimo (grant su anon nello schema)
async function rpc(name, args) {
  if (!configured) throw new Error('Supabase non configurato')
  const res = await fetch(`${URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(args || {}),
  })
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} ${await res.text()}`)
  return res.json()
}

// Fotografia 2026: ~227 atleti e 94 coppie, sotto il limite righe di PostgREST
export const getAthletes = () =>
  get('game_athletes?select=node,gender,full_name,ranking_pos,fb_points,photo_path&limit=1000')

export const getPairs = () =>
  get('game_pairs?select=id,gender,node_1,node_2,tappe_insieme,partite_insieme,partite_vinte,punti_insieme,ultima_tappa,in_deck,deck_order&limit=1000')

// I nomi degli argomenti sono quelli reali della funzione SQL (p_gender), non quelli della tabella in SPEC §6
export const getVoteStats = gender => rpc('game_vote_stats', { p_gender: gender })
export const getPairStats = gender => rpc('game_pair_stats', { p_gender: gender })
export const getTotals = gender => rpc('game_totals', { p_gender: gender })
