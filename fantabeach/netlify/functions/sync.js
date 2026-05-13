// netlify/functions/sync.js
// Sincronizzazione completa — solo admin
// Legge PLAYER_MAPPING + EVENTS_DB + COACHES_DB in parallelo

const { google } = require("googleapis");

const SHEET_ID     = process.env.GOOGLE_SHEETS_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY  = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

const PRICE_TABLE = [
  160,156,152,148,144,140,136,132,128,124,
  120,117,114,111,108,105,102,99,96,93,
  90,88,86,84,82,80,78,76,74,72,
  70,68,66,64,62,60,58,56,54,52,
  50,48,46,44,42,40,38,36,34,32,
  31,30,29,28,27,26,25,24,23,22,
  21,20,20,20,20,20,20,20,20,20,
  20,20,20,20,20,20,20,20,20,20,
  20,20,20,20,20,20,20,20,20,20,
  20,20,20,20,20,20,20,20,20,20,
];
const getPrice = (r) => r >= 1 && r <= PRICE_TABLE.length ? PRICE_TABLE[r - 1] : 20;

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
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

    // Legge tutti i fogli in parallelo
    const [playersRes, eventsRes, coachesRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "PLAYER_MAPPING!A:J" }),
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "EVENTS_DB!A:I" })
        .catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "COACHES_DB!A:F" })
        .catch(() => ({ data: { values: [] } })),
    ]);

    // ── Atleti ──
    const playerRows = (playersRes.data.values || []).slice(1)
      .filter(row => row[0]?.match(/^[WM]\d+$/));

    const allAthletes = playerRows.map(row => ({
      id:     row[0].trim(),
      name:   (row[1] || "").split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" "),
      gender: (row[2] || "").trim(),
    }));

    const women = allAthletes.filter(a => a.gender === "F")
      .map((a, i) => ({ ...a, ranking: i+1, cost: getPrice(i+1), prevCost: getPrice(i+1) }));
    const men   = allAthletes.filter(a => a.gender === "M")
      .map((a, i) => ({ ...a, ranking: i+1, cost: getPrice(i+1), prevCost: getPrice(i+1) }));

    // ── Tappe ──
    const eventRows = eventsRes.data.values || [];
    const eHeaders  = (eventRows[0] || []).map(h => h?.trim().toLowerCase());
    const ec = (name) => { const i = eHeaders.indexOf(name); return i >= 0 ? i : null; };

    const events = eventRows.slice(1).filter(row => row[0]).map(row => ({
      id:       row[ec("event_id") ?? 0] || row[0],
      name:     row[ec("name")     ?? 1] || row[1] || "",
      type:     row[ec("type")     ?? 2] || "Silver",
      weight:   parseFloat(row[ec("weight") ?? 3]) || 1.0,
      gender:   row[ec("gender")   ?? 4] || "F",
      date:     row[ec("date_start") ?? 5] || "",
      location: row[ec("location") ?? 7] || "",
      status:   row[ec("status")   ?? 8] || "Planned",
    }));

    // ── Coach ──
    const coaches = (coachesRes.data.values || []).slice(1)
      .filter(r => r[0])
      .map(row => ({
        id:     row[0]?.trim(),
        name:   row[1]?.trim(),
        gender: row[2]?.trim() || "M",
      }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ women, men, events, coaches, updatedAt: new Date().toISOString() }),
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
