// netlify/functions/athletes.js
// Legge PLAYER_MAPPING da Google Sheets — usa RANKING_PRICE_TABLE reale

const { google } = require("googleapis");

const SHEET_ID    = process.env.GOOGLE_SHEETS_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY  = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

// RANKING_PRICE_TABLE reale da FANTABEACH 2 2026
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
const getPrice = (r) => r >= 1 && r <= PRICE_TABLE.length
  ? PRICE_TABLE[r - 1]
  : 20; // tutto oltre ranking 100 vale 20

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

    // PLAYER_MAPPING: Player ID | Federation Name | Sesso | Nome | Cognome | ...
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "PLAYER_MAPPING!A:J",
    });

    const rows = (res.data.values || []).slice(1) // salta header
      .filter(row => row[0]?.match(/^[WM]\d+$/));

    const allAthletes = rows.map(row => {
      const id      = row[0].trim();
      const fedName = (row[1] || "").trim();
      const gender  = (row[2] || "").trim();
      // Nome display: prima lettera maiuscola per parola
      const name = fedName
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
      return { id, name, gender };
    });

    // Separa per genere e assegna ranking per posizione
    const women = allAthletes
      .filter(a => a.gender === "F")
      .map((a, i) => ({
        ...a,
        ranking:  i + 1,
        cost:     getPrice(i + 1),
        prevCost: getPrice(i + 1), // sarà aggiornato con storico
      }));

    const men = allAthletes
      .filter(a => a.gender === "M")
      .map((a, i) => ({
        ...a,
        ranking:  i + 1,
        cost:     getPrice(i + 1),
        prevCost: getPrice(i + 1),
      }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ women, men, updatedAt: new Date().toISOString() }),
    };

  } catch (err) {
    console.error("athletes error:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
