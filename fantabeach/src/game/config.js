// Costanti del Coppie Game. Il nome di lavoro sta qui e solo qui (SPEC §1).
export const GAME_NAME = 'Coppie Game'

// Soglia sotto la quale non si mostrano percentuali ma "Ancora pochi voti".
// Su staging basta un voto per vedere subito se i numeri girano; in produzione
// restano 20 come da SPEC §6. La decisione è presa dal nome del sito.
export function minVotes() {
  let host = ''
  try { host = String(window.location.hostname || '').toLowerCase() } catch (_) {}
  const isStaging = host.includes('staging') || host === 'localhost' || host === '127.0.0.1'
  return isStaging ? 1 : 20
}

// Risposte date da anonimo dopo le quali si chiede il login (SPEC §8)
export const FREE_ANSWERS = 3

// Stato di chi non ha ancora fatto login (SPEC §8)
export const STORAGE_KEY = 'coppiegame:v1'

// Indirizzo scritto sulle immagini da condividere (SPEC §10)
export const SHARE_URL = 'fantabeach.netlify.app/game'

// Profilo da taggare nelle storie
export const SHARE_HANDLE = '@zioema.official'
