// netlify/functions/sync.js
// Legge RANKING_IMPORT_M/W (ordine reale = ranking)
// Fa match nome→ID tramite PLAYER_MAPPING
// Salva snapshot su Supabase player_history

const { google } = require("googleapis");

const SHEET_ID      = process.env.GOOGLE_SHEETS_ID;
const CLIENT_EMAIL  = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY   = (process.env.GOOGLE_PRIVATE_KEY || "").split("\\n").join("\n");
const SUPABASE_URL  = process.env.VITE_SUPABASE_URL  || process.env.NEXT_PUBLIC_SUPABASE_URL  || "";
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

// RANKING_PRICE_TABLE reale
const PRICE_TABLE = [
  160,156,152,148,144,140,136,132,128,124,
  120,117,114,111,108,105,102,99,96,93,
  90,88,86,84,82,80,78,76,74,72,
  70,68,66,64,62,60,58,56,54,52,
  50,48,46,44,42,40,38,36,34,32,
  31,30,29,28,27,26,25,24,23,22,
];
const getPrice = (r) => r >= 1 && r <= 60 ? PRICE_TABLE[r - 1] : 20;

// Normalizza nome per il match (rimuove accenti, apostrofi, spazi doppi)
const normalizeName = (s) => (s || "")
  .toUpperCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[''`]/g, "")
  .replace(/\s+/g, " ")
  .trim();

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const auth = new google.auth.JWT(
      CLIENT_EMAIL, null, PRIVATE_KEY,
      ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    );
    const sheets = google.sheets({ version: "v4", auth });

    // Legge tutto in parallelo
    const [mappingRes, rankMRes, rankWRes, eventsRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "PLAYER_MAPPING!A:C" }),
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "RANKING_IMPORT_M!A:D" }),
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "RANKING_IMPORT_W!A:D" }),
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "EVENTS_DB!A:K" })
        .catch(() => ({ data: { values: [] } })),
    ]);

    // ── Costruisce mappa nome → {id, gender} da PLAYER_MAPPING ──
    const nameToPlayer = {};
    (mappingRes.data.values || []).slice(1).forEach(row => {
      const id     = row[0]?.trim();
      const name   = row[1]?.trim();
      const gender = row[2]?.trim();
      if (id && name) {
        nameToPlayer[normalizeName(name)] = { id, gender };
      }
    });

    // ── Legge storico precedente da Supabase (snapshot di giorno diverso da oggi) ──
    const prevMap = {};
    try {
      const today = new Date().toISOString().slice(0, 10);
      const prevRes = await fetch(
        `${SUPABASE_URL}/rest/v1/player_history?select=player_id,ranking,cost,synced_at&order=synced_at.desc&limit=2000`,
        { headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
        }}
      );
      const prevData = await prevRes.json();
      if (Array.isArray(prevData)) {
        prevData.forEach(r => {
          const rDay = (r.synced_at || "").slice(0, 10);
          // Prende solo snapshot di un giorno precedente (non oggi)
          if (!prevMap[r.player_id] && rDay !== today) {
            prevMap[r.player_id] = { ranking: r.ranking, cost: r.cost };
          }
        });
      }
    } catch(e) { console.warn("Errore lettura storico:", e.message); }

    // ── Processa i ranking ──
    const processRanking = (rows, gender) => {
      // Salta la riga header (cerca la prima con dati numerici in colonna A)
      return rows
        .filter(row => row[0] && !isNaN(parseInt(row[0])))
        .map(row => {
          const ranking = parseInt(row[0]);
          const fedName = (row[1] || "").trim();
          const normName = normalizeName(fedName);

          // Match con PLAYER_MAPPING
          const player = nameToPlayer[normName];
          const id = player?.id || null;

          const cost = getPrice(ranking);
          const prev = id ? prevMap[id] : null;

          return {
            player_id:    id,
            player_name:  fedName.split(" ").map(w =>
              w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
            ).join(" "),
            gender,
            ranking,
            cost,
            ranking_prev: prev?.ranking || null,
            cost_prev:    prev?.cost    || null,
          };
        })
        .filter(a => a.player_id); // solo atleti con ID trovato
    };

    const men   = processRanking((rankMRes.data.values || []).slice(1), "M")
      .sort((a,b) => a.ranking - b.ranking);
    const women = processRanking((rankWRes.data.values || []).slice(1), "F")
      .sort((a,b) => a.ranking - b.ranking);
    const allAthletes = [...women, ...men];

    // ── Salva snapshot su Supabase ──
    let savedCount = 0;
    if (allAthletes.length > 0 && SUPABASE_URL && SUPABASE_KEY) {
      const snapshot = allAthletes.map(a => ({
        player_id:    a.player_id,
        player_name:  a.player_name,
        gender:       a.gender,
        ranking:      a.ranking,
        cost:         a.cost,
        ranking_prev: a.ranking_prev,
        cost_prev:    a.cost_prev,
        synced_at:    new Date().toISOString(),
      }));

      // Inserisce in batch da 100
      for (let i = 0; i < snapshot.length; i += 100) {
        const batch = snapshot.slice(i, i + 100);
        const res = await fetch(`${SUPABASE_URL}/rest/v1/player_history`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify(batch),
        });
        if (res.ok) savedCount += batch.length;
        else console.error("Batch error:", await res.text());
      }
    }

    // ── Tappe — legge da Sheet e salva su Supabase ──
    const eventRows = eventsRes.data.values || [];
    const eH = (eventRows[0] || []).map(h => (h||"").trim().toLowerCase());
    // Intestazioni reali: Event ID|Nome tappa|Circuito|Tipo tappa|Sesso|Location|Data inizio|Data fine|Peso tappa|Status|Anno
    const ec = n => {
      const idx = eH.indexOf(n.toLowerCase());
      return idx >= 0 ? idx : null;
    };
    const events = eventRows.slice(1).filter(r => r[0]?.trim()).map(row => {
      const get = (names, fallback) => {
        for (const n of names) {
          const i = ec(n);
          if (i !== null && row[i]?.trim()) return row[i].trim();
        }
        return row[fallback] || "";
      };
      const genderRaw = get(["sesso","gender"], 4);
      const gender = genderRaw.toLowerCase().includes("aschile") ? "M"
                   : genderRaw.toLowerCase().includes("emminile") ? "F"
                   : genderRaw.toUpperCase().startsWith("M") ? "M" : "F";
      const pesoRaw = get(["peso tappa","peso","weight"], 8).replace(",",".");
      return {
        id:         get(["event id","event_id"], 0),
        name:       get(["nome tappa","name"], 1),
        anno:       parseInt(get(["anno","year"], 10)) || 2026,
        circuito:   get(["circuito","circuit"], 2),
        type:       get(["tipo tappa","tipo","type"], 3) || "Silver",
        gender,
        location:   get(["location"], 5),
        date_start: get(["data inizio","date_start"], 6),
        date_end:   get(["data fine","date_end"], 7),
        weight:     parseFloat(pesoRaw) || 1.0,
        status:     get(["status"], 9) || "Planned",
      };
    }).filter(e => e.id);

    // Salva events su Supabase (upsert per ID)
    let eventsSaved = 0;
    if (events.length > 0 && SUPABASE_URL && SUPABASE_KEY) {
      const supaHeaders = {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
      };
      const eventsWithTs = events.map(e => ({ ...e, synced_at: new Date().toISOString() }));
      const res = await fetch(`${SUPABASE_URL}/rest/v1/events?on_conflict=id`, {
        method: "POST",
        headers: supaHeaders,
        body: JSON.stringify(eventsWithTs),
      });
      if (res.ok) eventsSaved = events.length;
      else console.error("Events upsert error:", await res.text());
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        women,
        men,
        events,
        savedCount,
        eventsSaved,
        updatedAt: new Date().toISOString(),
      }),
    };

  } catch (err) {
    console.error("sync error:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
