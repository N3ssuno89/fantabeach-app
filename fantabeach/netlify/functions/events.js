// netlify/functions/events.js
// Legge EVENTS_DB da Google Sheets

const { google } = require("googleapis");

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

exports.handler = async (event, context) => {
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

    // EVENTS_DB — colonne attese: event_id, name, type, weight, gender, date_start, date_end, location, status
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "EVENTS_DB!A:I",
    });

    const rows = res.data.values || [];
    if (rows.length < 2) {
      return { statusCode: 200, headers, body: JSON.stringify({ events: [] }) };
    }

    // Usa la prima riga come header per mappare le colonne dinamicamente
    const headers_row = rows[0].map(h => h?.trim().toLowerCase());
    const col = (name) => headers_row.indexOf(name);

    const events = rows.slice(1)
      .filter(row => row[col("event_id") >= 0 ? col("event_id") : 0])
      .map(row => ({
        id:       row[col("event_id")] || row[0],
        name:     row[col("name")] || row[1],
        type:     row[col("type")] || row[2] || "Silver",
        weight:   parseFloat(row[col("weight")] || row[3]) || 1.0,
        gender:   row[col("gender")] || row[4] || "F",
        date:     `${row[col("date_start")] || row[5] || ""} – ${row[col("date_end")] || row[6] || ""}`.trim(),
        location: row[col("location")] || row[7] || "",
        status:   row[col("status")] || row[8] || "Planned",
      }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ events, updatedAt: new Date().toISOString() }),
    };

  } catch (err) {
    console.error("events function error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
