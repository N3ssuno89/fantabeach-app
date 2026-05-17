// netlify/functions/market-reminder.js
// Invia notifica "il mercato chiude oggi alle 23:00"
// Si esegue ogni giovedì alle 10:00 ora italiana
// schedule = "0 8 * * 4"  ← 08:00 UTC = 10:00 Europe/Rome (ora legale)

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase env vars mancanti");

    const supaHeaders = {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    };

    // Controlla se il mercato è aperto — ha senso inviare il reminder solo se aperto
    const settingsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/league_settings?league_id=eq.L002-F&select=market_open`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    const settings = await settingsRes.json();
    const marketOpen = settings?.[0]?.market_open;

    if (!marketOpen) {
      console.log("[market-reminder] Mercato già chiuso, nessun reminder inviato");
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: true }) };
    }

    // Invia notifica globale
    await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
      method: "POST",
      headers: supaHeaders,
      body: JSON.stringify({
        user_id: null,
        type: "market_closing",
        message: "⏰ Reminder: il mercato Market chiude oggi alle 23:00! Aggiorna la tua squadra in tempo.",
      }),
    });

    const now = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });
    console.log(`[market-reminder] Reminder inviato alle ${now}`);

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, message: `Reminder inviato alle ${now}` }) };

  } catch (err) {
    console.error("[market-reminder] Errore:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
