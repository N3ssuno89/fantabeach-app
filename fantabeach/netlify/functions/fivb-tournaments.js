// netlify/functions/fivb-tournaments.js
// Ingestione tornei 2026 (M+F) dall'API → tabella isolata fivb_tournaments (staging).
// Non tocca tabelle esistenti. Idempotente (upsert su vis_id).

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

  const fetchTournaments = async (gender) => {
    const res = await fetch(`${FIVB_BASE}/tournaments?season=2026&gender=${gender}`, {
      headers: { "Authorization": `Bearer ${FIVB_TOKEN}`, "Accept": "application/json" },
    });
    if (!res.ok) throw new Error(`tournaments ${gender}: HTTP ${res.status}`);
    const json = await res.json();
    return (json.data || []).map(t => ({
      vis_id: t.vis_no ?? t.id,
      node: t.federvolley_node ?? null,
      title: t.title || null,
      gender: gender.toUpperCase(),
      city: t.city || null,
      start_date: t.start_date || null,
      end_date: t.end_date || null,
      status: t.status || null,
      web: t.web || null,
      season: 2026,
    }));
  };

  const upsert = async (rows) => {
    if (rows.length === 0) return 0;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/fivb_tournaments?on_conflict=vis_id`, {
      method: "POST", headers: supaHeaders, body: JSON.stringify(rows),
    });
    if (!res.ok) throw new Error("upsert: " + (await res.text()));
    return rows.length;
  };

  try {
    const [m, f] = await Promise.all([fetchTournaments("m"), fetchTournaments("f")]);
    const all = [...m, ...f];
    const saved = await upsert(all);
    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        ok: true, scaricati: all.length, salvati: saved,
        tornei: all.map(t => ({ vis_id: t.vis_id, gender: t.gender, title: t.title, status: t.status })),
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error: err.message }) };
  }
};
