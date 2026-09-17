// Modale di accesso: stessa coppia email/password dell'app, più lo username in registrazione.
import { esc } from './ui.js'
import * as session from './session.js'

export function authSheetHTML(mode, msg) {
  const reg = mode === 'signup'
  return (
    '<div class="grab" aria-hidden="true" data-sheet="auth"></div>' +
    `<h3 id="sheet-title">${reg ? 'Registrati' : 'Entra'}</h3>` +
    `<p class="sheet-sub">${reg
      ? 'Ti serve un account FantaBeach per salvare i pronostici e ritrovarli nel 2027.'
      : 'Entra con il tuo account FantaBeach: è lo stesso del gioco.'}</p>` +
    '<form id="authform" autocomplete="on">' +
    (reg
      ? '<input class="search" id="au-username" name="username" type="text" autocomplete="username" placeholder="Username" aria-label="Username" required minlength="3">'
      : '') +
    '<input class="search" id="au-email" name="email" type="email" autocomplete="email" placeholder="Email" aria-label="Email" required>' +
    `<input class="search" id="au-password" name="password" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" placeholder="Password" aria-label="Password" required minlength="6">` +
    `<p class="micro" id="au-msg" role="alert">${msg ? esc(msg) : ''}</p>` +
    '<div class="btns" style="max-width:none">' +
    `<button type="button" class="btn" data-act="auth-switch">${reg ? 'Ho già un account' : 'Registrati'}</button>` +
    `<button type="submit" class="btn primary" id="au-submit">${reg ? 'Crea account' : 'Entra'}</button>` +
    '</div></form>' +
    '<div class="sheet-foot"><span></span><button type="button" class="btn ghost" data-act="close">Non ora</button></div>'
  )
}

// Ritorna {token, user} oppure {error}. I messaggi ricalcano quelli dell'app.
export async function submitAuth(mode, { email, password, username }) {
  if (mode === 'signup') {
    if (!username || username.trim().length < 3) return { error: 'Username troppo corto (minimo 3 caratteri).' }
    if (await session.usernameTaken(username.trim())) return { error: 'Username già in uso. Scegline un altro.' }
  }
  let data
  try {
    data = mode === 'signup'
      ? await session.signUp(email, password, username.trim())
      : await session.signIn(email, password)
  } catch (_) {
    return { error: 'Errore di rete. Riprova.' }
  }

  if (data.error) {
    const m = (data.error.message || data.error.error_description || data.error.msg || '').toLowerCase()
    if (mode === 'signup') {
      if (m.includes('already registered') || m.includes('already exists') || data.error.status === 422) {
        return { error: 'Email già registrata. Prova a entrare.' }
      }
      if (m.includes('username') || m.includes('duplicate')) return { error: 'Username già in uso. Scegline un altro.' }
      if (m.includes('password') || m.includes('weak')) return { error: 'Password troppo debole: almeno 6 caratteri.' }
      return { error: data.error.message || 'Errore. Riprova.' }
    }
    if (m.includes('not confirmed') || m.includes('confirmation')) {
      return { error: 'Account da confermare. Controlla la mail, anche nello spam.' }
    }
    return { error: 'Email o password errati.' }
  }

  // Supabase risponde identities=[] quando l'email è già registrata, senza errore esplicito
  if (mode === 'signup' && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { error: 'Email già registrata. Prova a entrare.' }
  }

  if (!data.access_token) {
    // Succede solo se qualcuno riattiva la conferma email obbligatoria (SPEC §8: non va riattivata)
    return { error: 'Registrazione fatta. Controlla la mail per confermare, poi entra.' }
  }

  session.saveToken(data.access_token, data.refresh_token)
  return { token: data.access_token, user: data.user }
}
