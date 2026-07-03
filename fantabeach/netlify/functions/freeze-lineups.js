// netlify/functions/freeze-lineups.js
//
// Congela le formazioni di una tappa che è diventata "in corso".
// Sostituisce il freeze che stava dentro sync.js (in dismissione).
//
// Sequenza per ogni evento "in corso":
//   1. GUARDIA freeze: se lineup_history per l'evento esiste già -> salta (idempotente).
//   2. AUTO-RIPORTO: per ogni utente SENZA lineups per l'evento, copia la sua
//      ultima formazione 2026 da lineup_history, SOLO se tutti gli atleti sono
//      ancora in rosa. Se ne manca uno -> salta l'utente.
//      (idempotente: salta chi ha già lineups per l'evento)
//   3. FREEZE: lineups -> lineup_history, coach preso da coach_selections.
//
// Invocazione:
//   POST {}                      -> processa tutti gli eventi con fivb_tournaments.status='ongoing'
//   POST { "event_id":"E0005" }  -> processa solo quell'evento (per test isolato)
//   POST { "dry_run":true }      -> calcola e riporta, NON scrive.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const H = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

const sbGet = async (path) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: H });
  if (!res.ok) throw new Error(`GET ${path}: HTTP ${res.status}`);
  return res.json();
};
const sbPost = async (path, body) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST", headers: { ...H, "Prefer": "return=minimal" }, body: JSON.stringify(body),
  });
const sbPatch = async (path, body) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH", headers: { ...H, "Prefer": "return=minimal" }, body: JSON.stringify(body),
  });

const leaguesForGender = (g) => g === "F" ? ["L001-F", "L002-F"] : ["L001-M", "L002-M"];

exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (!SUPABASE_URL || !SUPABASE_KEY)
    return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error:"Supabase env mancanti" }) };

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch (_) {}
  const dryRun = body.dry_run === true;
  const onlyEvent = body.event_id || null;

  const report = { eventi: [], errori: [] };

  try {
    // ── Determina gli eventi da processare ────────────────────────────────
    // Fonte autorevole = fivb_tournaments.status='ongoing', tradotto in event_id
    // via event_tournament_map. Se onlyEvent è passato, processa solo quello.
    let targetEvents = []; // [{event_id, gender}]

    if (onlyEvent) {
      const ev = await sbGet(`events?id=eq.${onlyEvent}&select=id,gender`);
      if (Array.isArray(ev) && ev[0]) targetEvents.push({ event_id: ev[0].id, gender: (ev[0].gender||"").toUpperCase() });
    } else {
      const ongoing = await sbGet(`fivb_tournaments?status=eq.ongoing&select=vis_id`);
      const visIds = (Array.isArray(ongoing) ? ongoing : []).map(t => t.vis_id);
      if (visIds.length > 0) {
        const maps = await sbGet(`event_tournament_map?vis_id=in.(${visIds.join(",")})&select=event_id`);
        const eventIds = [...new Set((Array.isArray(maps) ? maps : []).map(m => m.event_id))];
        if (eventIds.length > 0) {
          const evs = await sbGet(`events?id=in.(${eventIds.join(",")})&select=id,gender`);
          (Array.isArray(evs) ? evs : []).forEach(e => targetEvents.push({ event_id: e.id, gender: (e.gender||"").toUpperCase() }));
        }
      }
    }

    if (targetEvents.length === 0)
      return { statusCode: 200, headers, body: JSON.stringify({ ok:true, dry_run:dryRun, msg:"nessun evento ongoing da processare", report }, null, 2) };

    // ── Processa ogni evento ──────────────────────────────────────────────
    for (const { event_id, gender } of targetEvents) {
      const evReport = { event_id, gender, gia_congelato:false, riportati:[], saltati_vendita:[], snapshot_righe:0, status_aggiornato:false };

      // 1. GUARDIA FREEZE: lineup_history già esiste per questo evento?
      const hist = await sbGet(`lineup_history?event_id=eq.${event_id}&limit=1&select=id`);
      if (Array.isArray(hist) && hist.length > 0) {
        evReport.gia_congelato = true;
        report.eventi.push(evReport);
        continue; // idempotente: già congelato, non tocco nulla
      }

      // 2. Allinea events.status (grafia dal codice, non manuale)
      if (!dryRun) {
        const r = await sbPatch(`events?id=eq.${event_id}`, { status: "In corso" });
        evReport.status_aggiornato = r.ok;
      }

      const genderSlot = gender === "F" ? "F" : "M";

      for (const leagueId of leaguesForGender(gender)) {
        // 2a. chi ha già lineups per questo evento (da NON toccare)
        const have = await sbGet(`lineups?league_id=eq.${leagueId}&event_id=eq.${event_id}&select=user_id`);
        const giaSchierati = new Set(Array.isArray(have) ? have.map(r => r.user_id) : []);

        // 2b. roster attivo: user -> Set(player_id)
        const rost = await sbGet(`rosters?league_id=eq.${leagueId}&sold_at=is.null&select=user_id,player_id&limit=2000`);
        const ownedBy = {};
        (Array.isArray(rost) ? rost : []).forEach(r => { (ownedBy[r.user_id] = ownedBy[r.user_id] || new Set()).add(r.player_id); });

        // 2c. storico formazioni (solo 2026: event_id tipo E00NN)
        const histAll = await sbGet(`lineup_history?league_id=eq.${leagueId}&select=user_id,event_id,player_id,role&limit=5000`);
        const byUser = {};
        (Array.isArray(histAll) ? histAll : []).forEach(h => {
          if (!/^E\d{4}$/.test(h.event_id)) return;   // esclude E2025-*
          if (h.event_id === event_id) return;         // non da se stesso
          (byUser[h.user_id] = byUser[h.user_id] || {});
          (byUser[h.user_id][h.event_id] = byUser[h.user_id][h.event_id] || []).push(h);
        });

        // 2d. AUTO-RIPORTO
        const toInsert = [];
        for (const [userId, byEvent] of Object.entries(byUser)) {
          if (giaSchierati.has(userId)) continue;                  // idempotente
          const owned = ownedBy[userId];
          if (!owned || owned.size === 0) continue;                // niente rosa
          const lastEvent = Object.keys(byEvent).sort().pop();     // E00NN alfabetico=cronologico
          const rows = byEvent[lastEvent];
          if (!rows || rows.length === 0) continue;
          const tutti = rows.every(r => owned.has(r.player_id));   // tutti ancora in rosa?
          if (!tutti) { evReport.saltati_vendita.push({ user_id:userId, da_evento:lastEvent }); continue; }
          rows.forEach(r => toInsert.push({
            user_id:userId, league_id:leagueId, event_id, player_id:r.player_id,
            role:r.role, gender_slot:genderSlot, saved_at:new Date().toISOString(),
          }));
          evReport.riportati.push({ user_id:userId, da_evento:lastEvent, righe:rows.length });
        }
        if (toInsert.length > 0 && !dryRun) {
          const ins = await sbPost("lineups", toInsert);
          if (!ins.ok) report.errori.push(`auto-riporto ${leagueId}/${event_id}: ${await ins.text()}`);
        }
      }

      // 3. FREEZE: lineups -> lineup_history (coach da coach_selections)
      for (const leagueId of leaguesForGender(gender)) {
        const lineups = await sbGet(`lineups?league_id=eq.${leagueId}&event_id=eq.${event_id}&select=user_id,player_id,role,saved_at`);
        if (!Array.isArray(lineups) || lineups.length === 0) continue;

        // dedup per user+player (ruolo più recente)
        const dedup = {};
        lineups.forEach(l => {
          const k = `${l.user_id}::${l.player_id}`;
          if (!dedup[k] || l.saved_at > dedup[k].saved_at) dedup[k] = l;
        });

        const pids = [...new Set(Object.values(dedup).map(l => l.player_id))];
        const rosterRows = pids.length > 0
          ? await sbGet(`rosters?player_id=in.(${pids.join(",")})&select=player_id,player_name&limit=500`)
          : [];
        const nameMap = {};
        (Array.isArray(rosterRows) ? rosterRows : []).forEach(r => { if (r.player_name) nameMap[r.player_id] = r.player_name; });

        const coachSel = await sbGet(`coach_selections?league_id=eq.${leagueId}&select=user_id,coach_id,coach_name,in_field`);
        const coachMap = {};
        (Array.isArray(coachSel) ? coachSel : []).forEach(c => { coachMap[c.user_id] = c; });

        const snap = Object.values(dedup).map(l => ({
          user_id:l.user_id, league_id:leagueId, event_id, player_id:l.player_id,
          player_name: nameMap[l.player_id] || null, role:l.role,
          coach_id: coachMap[l.user_id]?.coach_id ?? null,
          coach_name: coachMap[l.user_id]?.coach_name ?? null,
          coach_in_field: coachMap[l.user_id]?.in_field ?? null,
        }));

        if (snap.length > 0 && !dryRun) {
          const r = await sbPost("lineup_history", snap);
          if (r.ok) evReport.snapshot_righe += snap.length;
          else report.errori.push(`freeze ${leagueId}/${event_id}: ${await r.text()}`);
        } else if (dryRun) {
          evReport.snapshot_righe += snap.length;
        }
      }

      report.eventi.push(evReport);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok:true, dry_run:dryRun, report }, null, 2) };
  } catch (err) {
    console.error("freeze-lineups error:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error: err.message, report }, null, 2) };
  }
};
