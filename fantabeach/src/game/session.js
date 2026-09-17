// Sessione FantaBeach. Stesse chiavi di localStorage e stesse chiamate di App.jsx:
// chi entra su /game risulta loggato su / e viceversa.
// Queste due chiavi si scrivono e si cancellano solo qui, e solo per login,
// rinnovo del token e logout.
const URL = import.meta.env.VITE_SUPABASE_URL || ''
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const TOKEN_KEY = 'fb_access_token'
const REFRESH_KEY = 'fb_refresh_token'

const base = () => ({
  apikey: ANON,
  Authorization: `Bearer ${ANON}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
})

export const saveToken = (t, r) => {
  try {
    localStorage.setItem(TOKEN_KEY, t)
    if (r) localStorage.setItem(REFRESH_KEY, r)
  } catch (_) {}
}
export const loadToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch (_) { return null } }
export const loadRefresh = () => { try { return localStorage.getItem(REFRESH_KEY) } catch (_) { return null } }
export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
  } catch (_) {}
}

export async function signUp(email, password, username) {
  const r = await fetch(`${URL}/auth/v1/signup`, {
    method: 'POST',
    headers: base(),
    // signup_source serve a contare gli iscritti arrivati dal gioco (SPEC §12)
    body: JSON.stringify({ email, password, data: { username, signup_source: 'coppie_game' } }),
  })
  const json = await r.json()
  if (!r.ok && !json.error) json.error = { message: json.msg || 'Errore', status: r.status }
  if (json.error) json.error.status = r.status
  return json
}

export async function signIn(email, password) {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: base(),
    body: JSON.stringify({ email, password }),
  })
  const json = await r.json()
  if (!r.ok && !json.error) json.error = { message: 'Email o password errati.', status: r.status }
  if (json.error) json.error.status = r.status
  return json
}

export async function signOut(accessToken) {
  try {
    await fetch(`${URL}/auth/v1/logout`, {
      method: 'POST',
      headers: { ...base(), Authorization: `Bearer ${accessToken}` },
    })
  } catch (_) {
    // Il logout locale deve avvenire comunque: il token si cancella fuori da qui
  }
}

export async function refreshToken(rt) {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: base(),
    body: JSON.stringify({ refresh_token: rt }),
  })
  return r.json()
}

export async function getUser(accessToken) {
  const r = await fetch(`${URL}/auth/v1/user`, {
    headers: { ...base(), Authorization: `Bearer ${accessToken}` },
  })
  if (r.status === 401 || r.status === 403) return null
  return r.json()
}

// Username del profilo: serve sulla storia. Se manca si ripiega sui metadati dell'utente.
export async function getUsername(accessToken, userId) {
  try {
    const r = await fetch(`${URL}/rest/v1/profiles?select=username&id=eq.${encodeURIComponent(userId)}`, {
      headers: { apikey: ANON, Authorization: `Bearer ${accessToken}` },
    })
    const rows = await r.json()
    if (Array.isArray(rows) && rows[0] && rows[0].username) return rows[0].username
  } catch (_) {}
  return null
}

// Username già preso: stessa verifica preventiva che fa App.jsx prima della registrazione
export async function usernameTaken(username) {
  try {
    const r = await fetch(`${URL}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=id`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
    })
    const rows = await r.json()
    return Array.isArray(rows) && rows.length > 0
  } catch (_) {
    return false // in dubbio si lascia procedere: al massimo risponde il vincolo del database
  }
}

// Ripristino al caricamento, identico a quello di App.jsx: token, poi refresh, poi resa.
export async function restore() {
  const token = loadToken()
  const rt = loadRefresh()
  if (!token) return null
  try {
    const user = await getUser(token)
    if (user && user.id) return { token, user }
    if (!rt) { clearToken(); return null }
    const data = await refreshToken(rt)
    if (!data.access_token) { clearToken(); return null }
    saveToken(data.access_token, data.refresh_token || rt)
    const refreshed = await getUser(data.access_token)
    if (refreshed && refreshed.id) return { token: data.access_token, user: refreshed }
    clearToken()
    return null
  } catch (_) {
    clearToken()
    return null
  }
}

// Rinnovo automatico ogni 50 minuti, come App.jsx (il token scade a 60)
export function startAutoRefresh(onToken) {
  return setInterval(async () => {
    const rt = loadRefresh()
    if (!rt) return
    try {
      const data = await refreshToken(rt)
      if (data.access_token) {
        saveToken(data.access_token, data.refresh_token || rt)
        onToken(data.access_token)
      }
    } catch (e) {
      console.error('[coppie-game] rinnovo token fallito:', e.message)
    }
  }, 50 * 60 * 1000)
}
