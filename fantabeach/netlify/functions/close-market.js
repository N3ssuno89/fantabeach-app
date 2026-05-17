// netlify/functions/close-market.js
// Scheduled function — si esegue ogni giovedì alle 23:00 (Europe/Rome)
// Configurazione in netlify.toml:
//   [functions.close-market]
//   schedule = "0 21 * * 4"  ← 21:00 UTC = 23:00 Europe/Rome (ora legale)
//                               oppure "0 22 * * 4" in inverno (ora solare)

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  const isManual = event.httpMethod === "POST";

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase env vars mancanti");

    const supaHeaders = {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    };

    // Chiude il mercato Market
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/league_settings?league_id=in.(L002-F,L002-M)`,
      { method: "PATCH", headers: supaHeaders, body: JSON.stringify({ market_open: false, updated_at: new Date().toISOString() }) }
    );
    if (!res.ok) throw new Error(`Supabase error: ${await res.text()}`);

    // Notifica globale chiusura mercato
    await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
      method: "POST", headers: supaHeaders,
      body: JSON.stringify({ user_id: null, type: "market_closing", message: "⏰ Il mercato Market è chiuso! Riaprirà lunedì alle 09:00." }),
    });

    const now = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });
    console.log(`[close-market] Mercato chiuso alle ${now}${isManual?" (manuale)":""}`);

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, message: `Mercato chiuso alle ${now}` }) };

  } catch (err) {
    console.error("[close-market] Errore:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
