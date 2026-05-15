// netlify/functions/athletes.js
// Legge PLAYER_MAPPING da Google Sheets e restituisce la lista atleti

const { google } = require("googleapis");

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

// Tabella ranking → prezzo (identica al prototipo)
const PRICE_TABLE = [
  140,135,130,125,120,117,114,112,111,109,
  107,105,103,101,99,97,94,91,88,85,
  82,79,76,73,70,68,66,64,62,60,
  58,56,54,52,50,48,46,44,42,40,
  38,36,34,32,30,28,26,24,22,20,
  19,18,17,16,15,14,13,12,11,10,
  9,8,7,6,5,4,3,2,1,1,
];
const getPrice = (r) => r >= 1 && r <= 70 ? PRICE_TABLE[r - 1] : 1;

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    // Auth Google
    const auth = new google.auth.JWT(
      CLIENT_EMAIL,
      null,
      PRIVATE_KEY,
      ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    );
    const sheets = google.sheets({ version: "v4", auth });

    // Legge PLAYER_MAPPING — colonne: Player ID, Federation Name, Sesso, Nome, Cognome, ...
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "PLAYER_MAPPING!A:J",
    });

    const rows = res.data.values || [];
    if (rows.length < 2) {
      return { statusCode: 200, headers, body: JSON.stringify({ women: [], men: [] }) };
    }

    // Salta la riga di intestazione (riga 0)
    const athletes = rows.slice(1)
      .filter(row => row[0] && row[0].match(/^[WM]\d+$/)) // solo righe con ID valido
      .map((row, index) => {
        const id = row[0]?.trim();             // W0001
        const fedName = row[1]?.trim();        // VALENTINA GOTTARDI
        const gender = row[2]?.trim();         // F o M
        const cognome = row[3]?.trim() || "";  // GOTTARDI
        const nome = row[4]?.trim() || "";     // VALENTINA

        // Nome display: Cognome Nome (capitalizzato)
        const displayName = fedName
          ? fedName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
          : `${cognome} ${nome}`.trim();

        // Ranking = posizione nell'elenco (1-based, separato per genere)
        const ranking = index + 1; // verrà ricalcolato sotto per genere
        const cost = getPrice(ranking);

        return { id, name: displayName, surname: cognome, gender, ranking, cost };
      });

    // Separa e riassegna ranking per genere
    const women = athletes
      .filter(a => a.gender === "F")
      .map((a, i) => ({ ...a, ranking: i + 1, cost: getPrice(i + 1) }));

    const men = athletes
      .filter(a => a.gender === "M")
      .map((a, i) => ({ ...a, ranking: i + 1, cost: getPrice(i + 1) }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ women, men, updatedAt: new Date().toISOString() }),
    };

  } catch (err) {
    console.error("athletes function error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
