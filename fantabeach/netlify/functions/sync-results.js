// netlify/functions/sync-results.js
//
// Legge REAL_TEAMS + MATCHES + PLAYER_MAPPING + EVENTS_DB da Google Sheets
// Calcola punti per ogni atleta per ogni partita
// Salva (o aggiorna) su Supabase match_results
//
// Endpoint: POST /.netlify/functions/sync-results
// Body (opzionale): { "event_id": "E0004" }  → sync solo quell'evento
//                   {}                         → sync tutti gli eventi

const { google } = require("googleapis");

const SHEET_ID     = process.env.GOOGLE_SHEETS_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY  = (process.env.GOOGLE_PRIVATE_KEY || "").split("\\n").join("\n");
const SUPABASE_URL = process.env.VITE_SUPABASE_URL  || process.env.NEXT_PUBLIC_SUPABASE_URL  || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// ── Normalizza nome per il matching ───────────────────────────────────────────
const norm = (s) => (s || "")
  .toUpperCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[''`]/g, "")
  .replace(/\s+/g, " ")
  .trim();

// ── Calcolo set e risultato da punteggi raw ───────────────────────────────────
// Restituisce { resultA, resultB, setsA, setsB, is_bye, scoreStr }
const calcResult = (s1a, s1b, s2a, s2b, s3a, s3b, forfeit) => {
  const toN = (v) => { const n = parseInt(v); return isNaN(n) ? null : n; };
  const S1A = toN(s1a), S1B = toN(s1b);
  const S2A = toN(s2a), S2B = toN(s2b);
  const S3A = toN(s3a), S3B = toN(s3b);

  // BYE: nessun avversario (TeamB vuoto) → già gestito dal chiamante
  if (S1A === null && S1B === null) return null;

  let setsA = 0, setsB = 0;
  const setParts = [];

  if (S1A !== null && S1B !== null) {
    if (S1A > S1B) setsA++; else setsB++;
    setParts.push(`${S1A}-${S1B}`);
  }
  if (S2A !== null && S2B !== null) {
    if (S2A > S2B) setsA++; else setsB++;
    setParts.push(`${S2A}-${S2B}`);
  }
  if (S3A !== null && S3B !== null) {
    if (S3A > S3B) setsA++; else setsB++;
    setParts.push(`${S3A}-${S3B}`);
  }

  // Forfeit override: il team che fa forfait perde 0-2
  if (forfeit === "A") { setsA = 0; setsB = 2; }
  if (forfeit === "B") { setsA = 2; setsB = 0; }

  return {
    resultA: `${setsA}-${setsB}`,
    resultB: `${setsB}-${setsA}`,
    setsA, setsB,
    scoreStr: setParts.join(" "),
    sets: { S1A, S1B, S2A, S2B, S3A, S3B },
  };
};

// ── Bonus codes per un giocatore ─────────────────────────────────────────────
const calcBonuses = (sets, setsWon, setsLost, isBye, coachInField, forfeitMe) => {
  const codes = [];
  let base = 0;

  if (isBye) {
    codes.push("bye");
    base = 4;
  } else if (forfeitMe) {
    codes.push("forfait");
    base = -1;
  } else if (setsWon === 2 && setsLost === 0) {
    codes.push("win20"); base = 4;
  } else if (setsWon === 2 && setsLost === 1) {
    codes.push("win21"); base = 3;
  } else if (setsWon === 1 && setsLost === 2) {
    codes.push("loss12"); base = 1;
  } else if (setsWon === 0 && setsLost === 2) {
    codes.push("loss02"); base = 0;
  }

  let bonus = 0;

  // CloseSet: ogni set PERSO con scarto ≤ 2
  if (sets && !isBye && !forfeitMe) {
    const checkClose = (myPts, oppPts) => {
      if (myPts !== null && oppPts !== null && myPts < oppPts && (oppPts - myPts) <= 2) {
        codes.push("closeSet");
        bonus += 0.5;
      }
    };
    // Per il giocatore A: set persi sono quelli dove myPts < oppPts
    if (sets.S1A !== null) checkClose(sets.S1A, sets.S1B);
    if (sets.S2A !== null) checkClose(sets.S2A, sets.S2B);
    if (sets.S3A !== null) checkClose(sets.S3A, sets.S3B);
  }

  // Coach in campo e vittoria
  if (coachInField && (setsWon === 2 || isBye)) {
    codes.push("coachWin");
    bonus += 0.5;
  }

  return { codes, base_pts: base, bonus_pts: bonus, total_pts: base + bonus };
};

// ── Calcola i bonus per il giocatore B (inverte i set) ───────────────────────
const calcBonusesB = (sets, setsWon, setsLost, isBye, coachInField, forfeitMe) => {
  // Inverte i set per il giocatore B
  const setsInverted = sets ? {
    S1A: sets.S1B, S1B: sets.S1A,
    S2A: sets.S2B, S2B: sets.S2A,
    S3A: sets.S3B, S3B: sets.S3A,
  } : null;
  return calcBonuses(setsInverted, setsWon, setsLost, isBye, coachInField, forfeitMe);
};

// ── Handler principale ────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  // Filtro evento opzionale dal body
  let filterEventId = null;
  try {
    const body = JSON.parse(event.body || "{}");
    filterEventId = body.event_id || null;
  } catch (_) {}

  try {
    const auth = new google.auth.JWT(
      CLIENT_EMAIL, null, PRIVATE_KEY,
      ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    );
    const sheets = google.sheets({ version: "v4", auth });

    // ── 1. Legge tutti i fogli necessari in parallelo ──────────────────────
    const [mappingRes, realTeamsRes, matchesRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "PLAYER_MAPPING!A:C" }),
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "REAL_TEAMS!A:F" }),
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "MATCHES!A:N" }),
    ]);

    const mappingRows   = (mappingRes.data.values   || []).slice(1);
    const realTeamsRows = (realTeamsRes.data.values  || []).slice(1);
    const matchRows     = (matchesRes.data.values    || []).slice(1);

    // ── Carica coach da Supabase per lookup cognome→ID ────────────────────
    const coachNameToId = {};
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/coaches?select=id,name&active=eq.true`, {
          headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
        });
        if (res.ok) {
          const coaches = await res.json();
          coaches.forEach(c => {
            // Mappa sia nome completo che cognome (primo token)
            const n = (c.name || "").toUpperCase().trim();
            coachNameToId[n] = c.id;
            const firstToken = n.split(" ")[0];
            if (firstToken) coachNameToId[firstToken] = c.id;
          });
        }
      } catch(e) { console.warn("Errore caricamento coach:", e.message); }
    }

    // Trova coach_id da stringa cognome
    const findCoach = (name) => {
      if (!name) return null;
      const n = name.toUpperCase().trim();
      return coachNameToId[n] || null;
    };

    // ── 2. PLAYER_MAPPING: nome → {id, gender} ────────────────────────────
    const nameToPlayer = {};
    mappingRows.forEach(row => {
      const id     = row[0]?.trim();
      const fedName = row[1]?.trim();
      const gender  = row[2]?.trim();
      if (id && fedName) {
        nameToPlayer[norm(fedName)] = { id, gender };
      }
    });

    // Cerca player_id da un nome generico (fuzzy su cognome)
    const findPlayer = (name) => {
      if (!name) return null;
      const n = norm(name);
      // Match esatto
      if (nameToPlayer[n]) return nameToPlayer[n].id;
      // Match parziale: cerca se il nome normalizzato contiene tutti i token
      const tokens = n.split(" ").filter(t => t.length >= 3);
      for (const [key, val] of Object.entries(nameToPlayer)) {
        if (tokens.every(t => key.includes(t))) return val.id;
      }
      return null;
    };

    // ── 3. REAL_TEAMS: costruisce mappa (event_id, nome1, nome2) → {p1_id, p2_id, coach} ──
    // Intestazione attesa: Event ID | Player 1 | Player 2 | Coach | Seed | Note
    const teamMap = {}; // chiave: "EVENT_ID::NORM_NAME1::NORM_NAME2"
    const warnings = [];

    realTeamsRows.forEach((row, i) => {
      const eventId = row[0]?.trim();
      const name1   = row[1]?.trim();
      const name2   = row[2]?.trim();
      const coach   = row[3]?.trim() || null;
      if (!eventId || !name1 || !name2) return;

      const p1Id = findPlayer(name1);
      const p2Id = findPlayer(name2);

      if (!p1Id) warnings.push(`REAL_TEAMS riga ${i+2}: "${name1}" non trovato in PLAYER_MAPPING`);
      if (!p2Id) warnings.push(`REAL_TEAMS riga ${i+2}: "${name2}" non trovato in PLAYER_MAPPING`);

      const coachId = findCoach(coach); // converte cognome → ID (es. "Chiappini" → "C0001")

      // Chiave principale: event + entrambi i nomi (normalizzati, ordine non importa)
      const key1 = `${eventId}::${norm(name1)}::${norm(name2)}`;
      const key2 = `${eventId}::${norm(name2)}::${norm(name1)}`;
      const teamEntry = { p1Id, p2Id, displayName: `${name1} - ${name2}`, coach: coachId };

      teamMap[key1] = teamEntry;
      teamMap[key2] = teamEntry;

      // Chiave anche con solo cognomi (es. "THEY - BREIDENBACH")
      const surn1 = norm(name1).split(" ")[0];
      const surn2 = norm(name2).split(" ")[0];
      if (surn1.length >= 3 && surn2.length >= 3) {
        teamMap[`${eventId}::${surn1}::${surn2}`] = teamEntry;
        teamMap[`${eventId}::${surn2}::${surn1}`] = teamEntry;
      }
    });

    // Trova una coppia in REAL_TEAMS cercando i due cognomi nel nome composito "COGNOME1 - COGNOME2"
    const findTeam = (eventId, teamStr) => {
      if (!teamStr || teamStr.trim() === "") return null;
      // teamStr può essere "THEY CHIARA - BREIDENBACH SARA" o "THEY - BREIDENBACH"
      const parts = teamStr.split(" - ").map(p => p.trim());
      if (parts.length < 2) return null;
      const [a, b] = parts;

      // Prova con nomi completi
      const key1 = `${eventId}::${norm(a)}::${norm(b)}`;
      if (teamMap[key1]) return teamMap[key1];

      // Prova con solo il primo token (cognome) di ciascuno
      const sa = norm(a).split(" ")[0];
      const sb = norm(b).split(" ")[0];
      const key2 = `${eventId}::${sa}::${sb}`;
      if (teamMap[key2]) return teamMap[key2];

      // Prova cercando nell'intero teamMap le coppie di quell'evento i cui nomi contengono sa e sb
      const evPrefix = `${eventId}::`;
      for (const [key, val] of Object.entries(teamMap)) {
        if (!key.startsWith(evPrefix)) continue;
        const [, n1, n2] = key.split("::");
        if (n1 && n2 && n1.includes(sa) && n2.includes(sb)) return val;
        if (n1 && n2 && n1.includes(sb) && n2.includes(sa)) return val;
      }

      return null;
    };

    // ── 4. MATCHES: processa ogni partita ────────────────────────────────
    // Intestazione attesa: Event ID | TAPPA | Fase | Sesso | Coppia A | Coppia B |
    //                      S1A | S1B | S2A | S2B | S3A | S3B | Coach A | Coach B | Forfait
    // Indici: 0=EventID, 1=TAPPA, 2=Fase, 3=Sesso, 4=CoppiaA, 5=CoppiaB,
    //         6=S1A, 7=S1B, 8=S2A, 9=S2B, 10=S3A, 11=S3B, 12=CoachA, 13=CoachB, 14=Forfait

    const resultsToSave = [];
    let matchIndex = 0;

    matchRows.forEach((row, i) => {
      const eventId  = row[0]?.trim();
      const fase     = row[2]?.trim();
      const coppiaA  = row[4]?.trim();
      const coppiaB  = row[5]?.trim();
      // Coach sempre presente — solo bonus, nessun malus
      const coachAIn = true;
      const coachBIn = true;
      const forfeit  = (row[14] || "").trim().toUpperCase();

      if (!eventId || !fase || !coppiaA) return;
      if (filterEventId && eventId !== filterEventId) return;

      matchIndex++;

      // BYE: coppia B vuota o dash
      const isBye = !coppiaB || coppiaB === "" || coppiaB === "-" || coppiaB === "—";

      const teamA = findTeam(eventId, coppiaA);
      const teamB = isBye ? null : findTeam(eventId, coppiaB);

      if (!teamA) {
        warnings.push(`MATCHES riga ${i+2}: Coppia A "${coppiaA}" non trovata in REAL_TEAMS (${eventId})`);
        return;
      }
      if (!isBye && !teamB) {
        warnings.push(`MATCHES riga ${i+2}: Coppia B "${coppiaB}" non trovata in REAL_TEAMS (${eventId})`);
        return;
      }

      if (isBye) {
        // BYE per entrambi i giocatori di teamA
        [teamA.p1Id, teamA.p2Id].filter(Boolean).forEach(pid => {
          const b = calcBonuses(null, 2, 0, true, false, false);
          resultsToSave.push({
            event_id: eventId, phase: fase, match_index: matchIndex,
            player_id: pid, player_name: null,
            result: "BYE", score: "", is_bye: true,
            base_pts: b.base_pts, bonus_pts: b.bonus_pts, total_pts: b.total_pts,
            bonus_codes: b.codes, opponent: "",
            coach_id: teamA.coach || null,
          });
        });
        return;
      }

      // Partita normale
      const res = calcResult(row[6], row[7], row[8], row[9], row[10], row[11], forfeit);
      if (!res) return;

      // Giocatori team A
      [teamA.p1Id, teamA.p2Id].filter(Boolean).forEach(pid => {
        const b = calcBonuses(res.sets, res.setsA, res.setsB, false, coachAIn, forfeit === "A");
        resultsToSave.push({
          event_id: eventId, phase: fase, match_index: matchIndex,
          player_id: pid, player_name: null,
          result: res.resultA, score: res.scoreStr, is_bye: false,
          base_pts: b.base_pts, bonus_pts: b.bonus_pts, total_pts: b.total_pts,
          bonus_codes: b.codes, opponent: coppiaB,
          coach_id: teamA.coach || null,
        });
      });

      // Giocatori team B
      [teamB.p1Id, teamB.p2Id].filter(Boolean).forEach(pid => {
        const b = calcBonusesB(res.sets, res.setsB, res.setsA, false, coachBIn, forfeit === "B");
        resultsToSave.push({
          event_id: eventId, phase: fase, match_index: matchIndex,
          player_id: pid, player_name: null,
          result: res.resultB, score: res.scoreStr, is_bye: false,
          base_pts: b.base_pts, bonus_pts: b.bonus_pts, total_pts: b.total_pts,
          bonus_codes: b.codes, opponent: coppiaA,
          coach_id: teamB.coach || null,
        });
      });
    });

    // ── 5. Salva su Supabase ──────────────────────────────────────────────
    let savedCount = 0;
    let deleteCount = 0;

    if (resultsToSave.length > 0 && SUPABASE_URL && SUPABASE_KEY) {
      const supaHeaders = {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      };

      // Elimina i record esistenti per gli eventi processati (per ricalcolo pulito)
      const processedEvents = [...new Set(resultsToSave.map(r => r.event_id))];
      for (const eid of processedEvents) {
        const delRes = await fetch(
          `${SUPABASE_URL}/rest/v1/match_results?event_id=eq.${encodeURIComponent(eid)}`,
          { method: "DELETE", headers: supaHeaders }
        );
        if (delRes.ok) deleteCount++;
      }

      // Inserisce i nuovi risultati in batch da 200
      const now = new Date().toISOString();
      const withTimestamp = resultsToSave.map(r => ({ ...r, synced_at: now }));

      for (let i = 0; i < withTimestamp.length; i += 200) {
        const batch = withTimestamp.slice(i, i + 200);
        const res = await fetch(`${SUPABASE_URL}/rest/v1/match_results`, {
          method: "POST",
          headers: { ...supaHeaders, "Prefer": "return=minimal" },
          body: JSON.stringify(batch),
        });
        if (res.ok) savedCount += batch.length;
        else {
          const err = await res.text();
          console.error("Batch error:", err);
          warnings.push(`Errore salvataggio batch ${i}: ${err.slice(0, 100)}`);
        }
      }
    }

    // ── 6. Risposta ───────────────────────────────────────────────────────
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        matchesProcessed: matchIndex,
        resultsGenerated: resultsToSave.length,
        savedCount,
        deleteCount,
        warnings: warnings.slice(0, 50), // max 50 warning
        updatedAt: new Date().toISOString(),
      }),
    };

  } catch (err) {
    console.error("sync-results error:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
