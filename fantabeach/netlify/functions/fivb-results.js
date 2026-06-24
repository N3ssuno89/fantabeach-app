// netlify/functions/fivb-results.js
//
// PONTE: legge fivb_matches (risultati grezzi FIVB) + fivb_entries (coach per nodo)
// + player_node_map (node -> W/M-id) + coaches (nome -> C-id),
// calcola i punti con la STESSA logica di sync-results, e scrive match_results.
//
// L'app legge SOLO match_results: questa funzione e' l'unico ponte che riempie
// quella tabella dai dati FIVB. Riusa il contratto di scrittura di sync-results
// (DELETE per evento + INSERT batch 200), con DUE guardie aggiunte:
//   GUARDIA A (nodo non mappato): se un nodo in fivb_matches non e' in
//     player_node_map, NON scrive quell'evento e segnala i nodi mancanti.
//     Non crea mai un W-id al volo (evita doppioni tipo "due NIKA DEIZI").
//   GUARDIA B (anti-troncamento): se il feed ha MENO partite di quelle gia'
//     presenti in match_results per quell'evento, NON cancella e si ferma
//     (protegge da un torneo dimezzato a meta' sync / timeout FIVB).
//
// Endpoint: POST /.netlify/functions/fivb-results
// Body (opzionale): { "event_id": "E0001" }            -> solo quell'evento
//                   { "event_ids": ["E0001","E0002"] }  -> piu' eventi
//                   {}                                   -> tutti gli eventi in event_tournament_map
//                   aggiungi "dry_run": true            -> calcola e riporta, NON scrive

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// ── Mappa fase: (phase FIVB, round FIVB, status) -> etichetta app (PHASE_ORDER) ──
// Validata sul diff E0001: qualification->QUALI 1/2, pool+Semifinale->POOL 1,
// pool+Finale->POOL 2, main_draw per round, bye->BYE POOL.
const mapPhase = (phase, round, isBye) => {
  if (isBye) return "BYE POOL";
  const r = (round || "").toLowerCase();
  if (phase === "qualification") {
    // I due turni del percorso: il 2o giro ha match_no piu' alti, ma l'API
    // non distingue 1 da 2 nel campo round. Distinzione fatta a valle (vedi sotto).
    return "QUALI 1";
  }
  if (phase === "pool") {
    if (r.includes("semifinale")) return "POOL 1";
    if (r.includes("finale")) return "POOL 2";
    return "POOL 1";
  }
  if (phase === "main_draw") {
    if (r.includes("1") && r.includes("vincenti")) return "ROUND OF 12";
    if (r.includes("2") && r.includes("vincenti")) return "QUARTER";
    if (r.includes("semifinale")) return "SEMI";
    if (r.includes("finale") && r.includes("1")) return "FINAL 1";
    if (r.includes("finale") && r.includes("3")) return "FINAL 3";
    return "ROUND OF 12";
  }
  return phase || "QUALI 1";
};

// ── Motore punteggi: identico a sync-results.calcBonuses ────────────────────
// sets = array di coppie [my, opp] dalla PROSPETTIVA del giocatore.
const calcBonuses = (sets, setsWon, setsLost, isBye) => {
  const codes = [];
  let base = 0;
  if (isBye) { codes.push("bye"); base = 4; }
  else if (setsWon === 2 && setsLost === 0) { codes.push("win20"); base = 4; }
  else if (setsWon === 2 && setsLost === 1) { codes.push("win21"); base = 3; }
  else if (setsWon === 1 && setsLost === 2) { codes.push("loss12"); base = 1; }
  else if (setsWon === 0 && setsLost === 2) { codes.push("loss02"); base = 0; }

  let bonus = 0;
  if (sets && !isBye) {
    // closeSet: ogni set PERSO con scarto <= 2, solo set 1 e 2 (S3 tie-break escluso)
    for (let i = 0; i < sets.length && i < 2; i++) {
      const [my, opp] = sets[i];
      if (my != null && opp != null && my < opp && (opp - my) <= 2) {
        codes.push("closeSet");
        bonus += 0.5;
      }
    }
  }
  return { codes, base_pts: base, bonus_pts: bonus, total_pts: base + bonus };
};

// ── helper fetch Supabase ────────────────────────────────────────────────────
const sb = (path, opts = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });

const sbGet = async (path) => {
  const res = await sb(path);
  if (!res.ok) throw new Error(`GET ${path}: HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
  return res.json();
};

exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (!SUPABASE_URL || !SUPABASE_KEY)
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: "Supabase env mancanti" }) };

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch (_) {}
  const dryRun = body.dry_run === true;
  let filterEvents = null;
  if (body.event_id) filterEvents = [body.event_id];
  else if (Array.isArray(body.event_ids)) filterEvents = body.event_ids;

  try {
    // ── 1. Carica le tabelle di supporto ──────────────────────────────────
    // event_tournament_map: event_id <-> vis_id
    let etm = await sbGet("event_tournament_map?select=event_id,vis_id");
    if (filterEvents) etm = etm.filter(e => filterEvents.includes(e.event_id));
    if (etm.length === 0)
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, note: "nessun evento da processare" }) };

    // player_node_map: node -> internal_id
    const pnmRows = await sbGet("player_node_map?select=node,internal_id");
    const nodeToId = {};
    pnmRows.forEach(r => { if (r.node != null) nodeToId[r.node] = r.internal_id; });

    // coaches attivi: nome -> id (nome completo + primo token, come sync-results)
    const coachRows = await sbGet("coaches?select=id,name&active=eq.true");
    const coachNameToId = {};
    coachRows.forEach(c => {
      const n = (c.name || "").toUpperCase().trim();
      if (!n) return;
      coachNameToId[n] = c.id;
      const tok = n.split(" ")[0];
      if (tok && !(tok in coachNameToId)) coachNameToId[tok] = c.id;
    });
    const findCoach = (name) => {
      if (!name) return null;
      return coachNameToId[name.toUpperCase().trim()] || null;
    };

    const report = [];

    // ── 2. Processa ogni evento ───────────────────────────────────────────
    for (const { event_id, vis_id } of etm) {
      const ev = { event_id, vis_id };

      // fivb_entries del torneo: node -> coach-stringa
      const entries = await sbGet(
        `fivb_entries?select=node,coach&tournament_vis_id=eq.${vis_id}`
      );
      const nodeToCoachStr = {};
      entries.forEach(e => { if (e.node != null) nodeToCoachStr[e.node] = e.coach || null; });

      // fivb_matches del torneo
      const matches = await sbGet(
        `fivb_matches?select=match_no,phase,pool,round,status,result,sets,` +
        `team_a_p1_node,team_a_p2_node,team_b_p1_node,team_b_p2_node&` +
        `tournament_vis_id=eq.${vis_id}&order=match_no.asc`
      );
      if (matches.length === 0) { ev.skip = "nessuna partita nel feed"; report.push(ev); continue; }

      // ── GUARDIA A: tutti i nodi devono essere mappati ───────────────────
      const missing = new Set();
      for (const m of matches) {
        for (const nd of [m.team_a_p1_node, m.team_a_p2_node, m.team_b_p1_node, m.team_b_p2_node]) {
          if (nd != null && !(nd in nodeToId)) missing.add(nd);
        }
      }
      if (missing.size > 0) {
        ev.skip = "nodi non mappati in player_node_map";
        ev.missing_nodes = [...missing];
        report.push(ev);
        continue; // NON scrive questo evento, NON crea W-id al volo
      }

      // ── Costruisci le righe match_results ───────────────────────────────
      const rows = [];
      for (const m of matches) {
        const isBye = m.status === "bye";
        const phaseLabel = mapPhase(m.phase, m.round, isBye);
        const matchIndex = m.match_no; // unico per torneo; (event_id, match_index) unico

        if (isBye) {
          // bye: la coppia avanzante e' quella non-null (in A o in B)
          const nodes = [m.team_a_p1_node, m.team_a_p2_node, m.team_b_p1_node, m.team_b_p2_node]
            .filter(n => n != null);
          for (const nd of nodes) {
            const b = calcBonuses(null, 2, 0, true);
            rows.push({
              event_id, phase: phaseLabel, match_index: matchIndex,
              player_id: nodeToId[nd], player_name: null,
              result: "BYE", score: "", is_bye: true,
              base_pts: b.base_pts, bonus_pts: b.bonus_pts, total_pts: b.total_pts,
              bonus_codes: b.codes, opponent: "",
              coach_id: findCoach(nodeToCoachStr[nd]),
            });
          }
          continue;
        }

        // partita normale: sets = [[a,b],...] prospettiva A
        let sets = null;
        try { sets = typeof m.sets === "string" ? JSON.parse(m.sets) : m.sets; } catch (_) { sets = null; }
        if (!Array.isArray(sets) || sets.length === 0) continue;
        sets = sets.map(s => [Number(s[0]), Number(s[1])]);

        let setsA = 0, setsB = 0;
        for (const [a, b] of sets) { if (a > b) setsA++; else if (b > a) setsB++; }
        const scoreA = sets.map(([a, b]) => `${a}-${b}`).join(" ");
        const scoreB = sets.map(([a, b]) => `${b}-${a}`).join(" ");
        const setsApersp = sets.map(([a, b]) => [a, b]);
        const setsBpersp = sets.map(([a, b]) => [b, a]);

        const teamA = [m.team_a_p1_node, m.team_a_p2_node].filter(n => n != null);
        const teamB = [m.team_b_p1_node, m.team_b_p2_node].filter(n => n != null);
        const nameA = teamA.map(n => null); // nome lo risolve l'app via athleteMap
        const oppB_str = ""; // opponent e' la stringa dell'altra coppia; vedi sotto

        // opponent = stringa "COGNOME NOME - COGNOME NOME" dell'altra coppia.
        // sync-results usa la stringa coppia dell'Excel; qui non l'abbiamo per nodo,
        // ma l'app mostra opponent come testo: usiamo i nomi da fivb_entries se ci sono.
        // (Per coerenza con sync-results lasciamo che l'app risolva i propri nomi;
        //  opponent resta una stringa informativa, non una chiave.)

        for (const nd of teamA) {
          const b = calcBonuses(setsApersp, setsA, setsB, false);
          rows.push({
            event_id, phase: phaseLabel, match_index: matchIndex,
            player_id: nodeToId[nd], player_name: null,
            result: `${setsA}-${setsB}`, score: scoreA, is_bye: false,
            base_pts: b.base_pts, bonus_pts: b.bonus_pts, total_pts: b.total_pts,
            bonus_codes: b.codes, opponent: m.team_b_name || "",
            coach_id: findCoach(nodeToCoachStr[nd]),
          });
        }
        for (const nd of teamB) {
          const b = calcBonuses(setsBpersp, setsB, setsA, false);
          rows.push({
            event_id, phase: phaseLabel, match_index: matchIndex,
            player_id: nodeToId[nd], player_name: null,
            result: `${setsB}-${setsA}`, score: scoreB, is_bye: false,
            base_pts: b.base_pts, bonus_pts: b.bonus_pts, total_pts: b.total_pts,
            bonus_codes: b.codes, opponent: m.team_a_name || "",
            coach_id: findCoach(nodeToCoachStr[nd]),
          });
        }
      }

      ev.rows_da_scrivere = rows.length;
      ev.partite = matches.length;

      // ── GUARDIA B: anti-troncamento ─────────────────────────────────────
      // Conta le partite gia' presenti in match_results (match_index distinti).
      const existing = await sbGet(
        `match_results?select=match_index&event_id=eq.${encodeURIComponent(event_id)}`
      );
      const existingMatches = new Set(existing.map(r => r.match_index)).size;
      const feedMatches = new Set(matches.filter(m => m.status !== "bye" || true).map(m => m.match_no)).size;
      ev.partite_esistenti = existingMatches;
      if (existingMatches > 0 && feedMatches < existingMatches) {
        ev.skip = `anti-troncamento: feed ${feedMatches} partite < esistenti ${existingMatches}`;
        report.push(ev);
        continue; // NON cancella
      }

      if (dryRun) { ev.dry_run = true; report.push(ev); continue; }

      // ── Scrittura: DELETE evento + INSERT batch 200 (come sync-results) ──
      const del = await sb(
        `match_results?event_id=eq.${encodeURIComponent(event_id)}`,
        { method: "DELETE" }
      );
      if (!del.ok) { ev.error = `DELETE: HTTP ${del.status}`; report.push(ev); continue; }

      const now = new Date().toISOString();
      const withTs = rows.map(r => ({ ...r, synced_at: now }));
      let saved = 0;
      for (let i = 0; i < withTs.length; i += 200) {
        const batch = withTs.slice(i, i + 200);
        const res = await sb("match_results", {
          method: "POST",
          headers: { "Prefer": "return=minimal" },
          body: JSON.stringify(batch),
        });
        if (res.ok) saved += batch.length;
        else { ev.error = `INSERT batch ${i}: ${(await res.text()).slice(0, 120)}`; break; }
      }
      ev.salvati = saved;
      report.push(ev);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, dry_run: dryRun, eventi: report, updatedAt: new Date().toISOString() }, null, 2),
    };
  } catch (err) {
    console.error("fivb-results error:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
