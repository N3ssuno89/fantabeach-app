// netlify/functions/fivb-matches.js
// Ingestione partite dall'API → tabella isolata fivb_matches (staging).
// Default: tornei 'ongoing' in fivb_tournaments. Override: ?ids=9389,9390
// Idempotente (upsert su tournament_vis_id+match_no): rilancia per aggiornare i risultati.

const FIVB_BASE    = "https://fivbeach.com/api/v1";
const FIVB_TOKEN   = process.env.FIVBEACH_TOKEN || "";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (!FIVB_TOKEN) return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error:"FIVBEACH_TOKEN mancante" }) };
  if (!SUPABASE_URL || !SUPABASE_KEY) return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error:"Supabase env mancanti" }) };

  const supaHeaders = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=minimal",
  };
  const apiHeaders = { "Authorization": `Bearer ${FIVB_TOKEN}`, "Accept": "application/json" };

  // tornei da ingerire: ?ids=... oppure tutti gli 'ongoing'
  let ids = (event.queryStringParameters?.ids || "").split(",").map(s => s.trim()).filter(Boolean);
  if (ids.length === 0) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/fivb_tournaments?status=eq.ongoing&select=vis_id`, { headers: supaHeaders });
    const t = await r.json();
    ids = Array.isArray(t) ? t.map(x => String(x.vis_id)) : [];
  }
  if (ids.length === 0) return { statusCode: 200, headers, body: JSON.stringify({ ok:true, note:"nessun torneo ongoing e nessun ?ids=" }) };

  const mapMatch = (vis_id, mm) => {
    const pa = mm.teams?.a?.players || [];
    const pb = mm.teams?.b?.players || [];
    return {
      tournament_vis_id: Number(vis_id),
      match_no: mm.match_no,
      phase: mm.phase || null, pool: mm.pool || null, round: mm.round || null,
      status: mm.status || null, scheduled_at: mm.scheduled_at || null, court: mm.court || null,
      team_a_name: mm.teams?.a?.name || null,
      team_a_p1_node: pa[0]?.federvolley_node ?? null,
      team_a_p2_node: pa[1]?.federvolley_node ?? null,
      team_b_name: mm.teams?.b?.name || null,
      team_b_p1_node: pb[0]?.federvolley_node ?? null,
      team_b_p2_node: pb[1]?.federvolley_node ?? null,
      sets: mm.sets ?? null, result: mm.result || null, winner: mm.winner || null,
      duration_min: mm.duration_min ?? null,
    };
  };

  const upsert = async (rows) => {
    let saved = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/fivb_matches?on_conflict=tournament_vis_id,match_no`, {
        method: "POST", headers: supaHeaders, body: JSON.stringify(batch),
      });
      if (res.ok) saved += batch.length;
      else throw new Error("upsert: " + (await res.text()));
    }
    return saved;
  };

  try {
    const perTorneo = [];
    for (const id of ids) {
      const res = await fetch(`${FIVB_BASE}/tournaments/${id}/matches`, { headers: apiHeaders });
      if (!res.ok) throw new Error(`matches ${id}: HTTP ${res.status}`);
      const json = await res.json();
      const rows = (json.data || []).map(mm => mapMatch(id, mm));
      const saved = await upsert(rows);
      const giocate = rows.filter(r => r.status === "finished").length;
      perTorneo.push({ vis_id: Number(id), partite: rows.length, giocate, salvate: saved });
    }
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, tornei: perTorneo }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error: err.message }) };
  }
};
