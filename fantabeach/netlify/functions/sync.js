// netlify/functions/sync.js
// Restituisce la lista atleti (women/men) al FE per il mercato.
// Fonte: player_history su Supabase (alimentato da fivb-rankings dall'API FIVB).
// NON legge più dal Google Sheet. Prende l'ULTIMO snapshot per player_id.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (!SUPABASE_URL || !SUPABASE_KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: "Supabase env mancanti" }) };

  const readHeaders = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` };

  try {
    // Legge player_history ordinato per data crescente: l'ultima riga per player_id vince (snapshot più recente)
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/player_history?select=player_id,player_name,gender,ranking,cost,ranking_prev,cost_prev,synced_at&order=synced_at.desc&limit=20000`,
      { headers: readHeaders }
    );
    if (!res.ok) throw new Error(`player_history: HTTP ${res.status}`);
    const rows = await res.json();

    // Dedup: tieni l'ULTIMO snapshot per player_id (ordine asc -> l'ultimo sovrascrive)
    const latest = {};
    (Array.isArray(rows) ? rows : []).forEach(r => {
      if (!r.player_id) return;
      if (!latest[r.player_id]) latest[r.player_id] = r; // desc order -> il PRIMO è il più recente
    });

    const all = Object.values(latest).map(r => ({
      id:           r.player_id,
      player_id:    r.player_id,
      name:         r.player_name,
      player_name:  r.player_name,
      gender:       r.gender,
      ranking:      r.ranking,
      cost:         r.cost,
      ranking_prev: r.ranking_prev,
      cost_prev:    r.cost_prev,
    }));

    const women = all.filter(a => a.gender === "F").sort((a, b) => a.ranking - b.ranking);
    const men   = all.filter(a => a.gender === "M").sort((a, b) => a.ranking - b.ranking);

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ women, men, updatedAt: new Date().toISOString() }),
    };
  } catch (err) {
    console.error("sync error:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
