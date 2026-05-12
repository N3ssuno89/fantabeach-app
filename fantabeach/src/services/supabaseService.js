// ─────────────────────────────────────────────────────────────
// SERVICE: Supabase
// ─────────────────────────────────────────────────────────────
// TODO: questa è una implementazione STUB (mock).
// Quando Supabase è configurato:
// 1. npm install @supabase/supabase-js
// 2. Aggiungere VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY in .env.local
// 3. Decommentare il client reale qui sotto
// ─────────────────────────────────────────────────────────────

// import { createClient } from '@supabase/supabase-js'
// export const supabase = createClient(
//   import.meta.env.VITE_SUPABASE_URL,
//   import.meta.env.VITE_SUPABASE_ANON_KEY
// )

// ── AUTH (STUB) ────────────────────────────────────────────
export const auth = {
  /**
   * TODO: supabase.auth.signInWithPassword({ email, password })
   */
  async signIn(email, password) {
    console.warn("[STUB] signIn — Supabase non ancora configurato");
    return { user: { id: "mock-user-1", email }, error: null };
  },

  /**
   * TODO: supabase.auth.signUp({ email, password })
   */
  async signUp(email, password) {
    console.warn("[STUB] signUp — Supabase non ancora configurato");
    return { user: { id: "mock-user-1", email }, error: null };
  },

  /**
   * TODO: supabase.auth.signOut()
   */
  async signOut() {
    console.warn("[STUB] signOut");
    return { error: null };
  },

  /**
   * TODO: supabase.auth.getSession()
   */
  async getSession() {
    return { session: null };
  },
};

// ── ROSTER (STUB) ──────────────────────────────────────────
export const roster = {
  /**
   * TODO: insert into rosters (user_id, league_id, player_id)
   */
  async add(userId, leagueId, playerId) {
    console.warn("[STUB] roster.add", { userId, leagueId, playerId });
    return { error: null };
  },

  /**
   * TODO: delete from rosters where user_id=... and league_id=... and player_id=...
   */
  async remove(userId, leagueId, playerId) {
    console.warn("[STUB] roster.remove", { userId, leagueId, playerId });
    return { error: null };
  },

  /**
   * TODO: select * from rosters where user_id=... and league_id=...
   */
  async get(userId, leagueId) {
    console.warn("[STUB] roster.get");
    return { data: [], error: null };
  },
};

// ── LINEUP (STUB) ──────────────────────────────────────────
export const lineup = {
  /**
   * TODO: upsert into lineups (user_id, league_id, event_id, starters, captain)
   */
  async save(userId, leagueId, eventId, starters, captain) {
    console.warn("[STUB] lineup.save");
    return { error: null };
  },
};

// ── USER LEAGUES (STUB) ────────────────────────────────────
export const userLeagues = {
  /**
   * TODO: insert into user_leagues (user_id, league_id, team_name, status='PENDING')
   */
  async join(userId, leagueId, teamName) {
    console.warn("[STUB] userLeagues.join");
    return { error: null };
  },

  /**
   * TODO: update user_leagues set status='APPROVED' where id=...
   */
  async approve(userLeagueId) {
    console.warn("[STUB] userLeagues.approve");
    return { error: null };
  },
};
