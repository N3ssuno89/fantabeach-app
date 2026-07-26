// netlify/functions/market-reminder.js
// Scheduled: giovedì 10:00 Europe/Rome (schedule "0 8 * * 4")
// STRADA A: invia il reminder SOLO se mercato aperto E c'è un torneo imminente.

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

    // Reminder solo se mercato aperto
    const settingsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/league_settings?league_id=eq.L002-F&select=market_open`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    const settings = await settingsRes.json();
    const marketOpen = settings?.[0]?.market_open;

    if (!marketOpen) {
      console.log("[market-reminder] Mercato già chiuso, nessun reminder");
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: true, reason: "mercato chiuso" }) };
    }

    // STRADA A: c'è un torneo imminente (oggi..+4gg)?
    const oggi = new Date();
    const tra4 = new Date(oggi.getTime() + 4 * 24 * 60 * 60 * 1000);
    const daISO = oggi.toISOString().slice(0, 10);
    const aISO = tra4.toISOString().slice(0, 10);

    const tRes = await fetch(
      `${SUPABASE_URL}/rest/v1/fivb_tournaments?start_date=gte.${daISO}&start_date=lte.${aISO}&select=vis_id&limit=1`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    const tornei = await tRes.json();

    if (!Array.isArray(tornei) || tornei.length === 0) {
      console.log(`[market-reminder] Nessun torneo nel weekend (${daISO}..${aISO}), nessun reminder`);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: true, reason: "nessun torneo imminente" }) };
    }

    await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
      method: "POST", headers: supaHeaders,
      body: JSON.stringify({ user_id: null, type: "market_closing", message: "⏰ Reminder: il mercato Market chiude oggi alle 23:00! Aggiorna la tua squadra in tempo." }),
    });

    const now = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });
    console.log(`[market-reminder] Reminder inviato alle ${now}`);

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, message: `Reminder inviato alle ${now}` }) };

  } catch (err) {
    console.error("[market-reminder] Errore:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
