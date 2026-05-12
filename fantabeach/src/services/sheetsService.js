// ─────────────────────────────────────────────────────────────
// SERVICE: Google Sheets
// ─────────────────────────────────────────────────────────────
// TODO: Questa implementazione è uno STUB.
// Ora restituisce i dati mock. Quando la Sheets API è pronta,
// sostituire le funzioni con fetch reale.
//
// NOTA: Le chiamate alle Sheets API devono passare per un
// backend/proxy (Netlify Function o API Route) per non
// esporre le credenziali nel browser.
// ─────────────────────────────────────────────────────────────

import { WOMEN_ATHLETES, MEN_ATHLETES } from '@/data/mockAthletes';
import { EVENTS } from '@/data/mockEvents';
import { STANDINGS } from '@/data/mockStandings';
import { COACHES } from '@/data/mockCoaches';

// Future: const SHEETS_API = import.meta.env.VITE_GOOGLE_SHEETS_ID;

/**
 * Legge gli atleti dal Google Sheet PLAYERS_DB
 * TODO: sostituire con fetch a /api/sheets/athletes
 */
export async function fetchAthletes(gender) {
  // MOCK
  await new Promise(r => setTimeout(r, 0));
  return gender === 'F' ? WOMEN_ATHLETES : MEN_ATHLETES;
}

/**
 * Legge le tappe dal Google Sheet EVENTS_DB
 * TODO: sostituire con fetch a /api/sheets/events
 */
export async function fetchEvents(gender) {
  await new Promise(r => setTimeout(r, 0));
  return EVENTS.filter(e => !gender || e.gender === gender);
}

/**
 * Legge le classifiche calcolate
 * TODO: sostituire con fetch a /api/sheets/standings
 */
export async function fetchStandings(leagueId) {
  await new Promise(r => setTimeout(r, 0));
  return STANDINGS[leagueId] || [];
}

/**
 * Legge i coach dal Google Sheet COACHES_DB
 * TODO: sostituire con fetch a /api/sheets/coaches
 */
export async function fetchCoaches() {
  await new Promise(r => setTimeout(r, 0));
  return COACHES;
}
