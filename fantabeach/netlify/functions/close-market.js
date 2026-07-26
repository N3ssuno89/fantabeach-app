// netlify/functions/close-market.js
// Scheduled: giovedì 23:00 Europe/Rome (schedule "0 21 * * 4" nel netlify.toml)
// STRADA A: chiude il mercato SOLO se c'è un torneo che inizia nel weekend imminente.

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

    // STRADA A: c'è un torneo che inizia da oggi a +4 giorni? (giovedì -> copre ven/sab/dom)
    const oggi = new Date();
    const tra4 = new Date(oggi.getTime() + 4 * 24 * 60 * 60 * 1000);
    const daISO = oggi.toISOString().slice(0, 10);
    const aISO = tra4.toISOString().slice(0, 10);

    const tRes = await fetch(
      `${SUPABASE_URL}/rest/v1/fivb_tournaments?start_date=gte.${daISO}&start_date=lte.${aISO}&select=vis_id,title,start_date&limit=1`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    if (!tRes.ok) throw new Error(`Supabase (tournaments) error: ${await tRes.text()}`);
    const tornei = await tRes.json();

    if (!Array.isArray(tornei) || tornei.length === 0) {
      const nowSkip = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });
      console.log(`[close-market] Nessun torneo nel weekend (${daISO}..${aISO}), mercato resta APERTO (${nowSkip})`);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: true, reason: "nessun torneo imminente", finestra: `${daISO}..${aISO}` }) };
    }

    // C'è un torneo imminente -> chiudo il mercato
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/league_settings?league_id=in.(L002-F,L002-M)`,
      { method: "PATCH", headers: supaHeaders, body: JSON.stringify({ market_open: false, updated_at: new Date().toISOString() }) }
    );
    if (!res.ok) throw new Error(`Supabase error: ${await res.text()}`);

    await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
      method: "POST", headers: supaHeaders,
      body: JSON.stringify({ user_id: null, type: "market_closing", message: "⏰ Il mercato Market è chiuso! Riaprirà la domenica sera al termine della tappa." }),
    });

    const now = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });
    console.log(`[close-market] Mercato chiuso alle ${now}${isManual ? " (manuale)" : ""} — torneo: ${tornei[0].title}`);

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, message: `Mercato chiuso alle ${now}`, torneo: tornei[0].title }) };

  } catch (err) {
    console.error("[close-market] Errore:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
