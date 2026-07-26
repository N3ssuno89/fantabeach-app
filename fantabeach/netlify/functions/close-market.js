// netlify/functions/close-market.js
// Scheduled: giovedì 23:00 Europe/Rome (schedule "0 21 * * 4" nel netlify.toml)
// STRADA A + FREEZE: se c'è un torneo nel weekend imminente, giovedì 23:00
//   1) chiude il mercato Market
//   2) congela le formazioni (freeze-lineups) degli eventi del torneo, con auto-riporto + coach

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
    const readHeaders = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` };

    // ── STRADA A: c'è un torneo che inizia da oggi a +4 giorni? ──
    const oggi = new Date();
    const tra4 = new Date(oggi.getTime() + 4 * 24 * 60 * 60 * 1000);
    const daISO = oggi.toISOString().slice(0, 10);
    const aISO = tra4.toISOString().slice(0, 10);

    const tRes = await fetch(
      `${SUPABASE_URL}/rest/v1/fivb_tournaments?start_date=gte.${daISO}&start_date=lte.${aISO}&select=vis_id,title,start_date`,
      { headers: readHeaders }
    );
    if (!tRes.ok) throw new Error(`Supabase (tournaments) error: ${await tRes.text()}`);
    const tornei = await tRes.json();

    if (!Array.isArray(tornei) || tornei.length === 0) {
      const nowSkip = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });
      console.log(`[close-market] Nessun torneo nel weekend (${daISO}..${aISO}), mercato APERTO, nessun freeze (${nowSkip})`);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: true, reason: "nessun torneo imminente", finestra: `${daISO}..${aISO}` }) };
    }

    // ── 1) CHIUDE IL MERCATO ──
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/league_settings?league_id=in.(L002-F,L002-M)`,
      { method: "PATCH", headers: supaHeaders, body: JSON.stringify({ market_open: false, updated_at: new Date().toISOString() }) }
    );
    if (!res.ok) throw new Error(`Supabase (market) error: ${await res.text()}`);

    await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
      method: "POST", headers: supaHeaders,
      body: JSON.stringify({ user_id: null, type: "market_closing", message: "⏰ Il mercato Market è chiuso! Riaprirà la domenica sera al termine della tappa." }),
    });

    // ── 2) FREEZE: traduce i vis_id dei tornei imminenti in event_id, poi chiama freeze-lineups ──
    const visIds = [...new Set(tornei.map(t => t.vis_id))];
    const mapRes = await fetch(
      `${SUPABASE_URL}/rest/v1/event_tournament_map?vis_id=in.(${visIds.join(",")})&select=event_id`,
      { headers: readHeaders }
    );
    const maps = await mapRes.json();
    const eventIds = [...new Set((Array.isArray(maps) ? maps : []).map(m => m.event_id))];

    const base = process.env.URL || process.env.DEPLOY_PRIME_URL || "";
    const freezeReport = [];
    for (const eid of eventIds) {
      try {
        const fr = await fetch(`${base}/.netlify/functions/freeze-lineups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_id: eid }),
        });
        const fj = await fr.json();
        freezeReport.push({ event_id: eid, ok: fr.ok, status: fr.status });
        console.log(`[close-market] freeze-lineups ${eid}:`, JSON.stringify(fj));
      } catch (e) {
        freezeReport.push({ event_id: eid, ok: false, error: e.message });
        console.error(`[close-market] freeze-lineups ${eid} errore:`, e.message);
      }
    }

    const now = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });
    console.log(`[close-market] Mercato chiuso + freeze alle ${now}${isManual ? " (manuale)" : ""} — torneo: ${tornei[0].title}, eventi: ${eventIds.join(",")}`);

    return { statusCode: 200, headers, body: JSON.stringify({
      ok: true,
      message: `Mercato chiuso + freeze alle ${now}`,
      torneo: tornei[0].title,
      eventi_congelati: eventIds,
      freeze: freezeReport,
    }) };

  } catch (err) {
    console.error("[close-market] Errore:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
