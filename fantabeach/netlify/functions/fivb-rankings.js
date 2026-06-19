// netlify/functions/fivb-rankings.js
// Ingestione ranking ITA (M+F) dall'API → tabella isolata fivb_rankings (staging).
// Non tocca nessuna tabella esistente. Idempotente: re-run aggiorna, non duplica.

const FIVB_BASE    = "https://fivbeach.com/api/v1";
const FIVB_TOKEN   = process.env.FIVBEACH_TOKEN || "";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const PRICE_TABLE = [
  160,156,152,148,144,140,136,132,128,124,
  120,117,114,111,108,105,102,99,96,93,
  90,88,86,84,82,80,78,76,74,72,
  70,68,66,64,62,60,58,56,54,52,
  50,48,46,44,42,40,38,36,34,32,
  31,30,29,28,27,26,25,24,23,22,
];
const getPrice = (r) => (r >= 1 && r <= 60 ? PRICE_TABLE[r - 1] : 20);

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

  const fetchRanking = async (gender) => {
    const res = await fetch(`${FIVB_BASE}/rankings/ita?gender=${gender}`, {
      headers: { "Authorization": `Bearer ${FIVB_TOKEN}`, "Accept": "application/json" },
    });
    if (!res.ok) throw new Error(`ranking ${gender}: HTTP ${res.status}`);
    const json = await res.json();
    const snapshot_date = json.snapshot_date || null;
    const rows = (json.data || []).map(p => ({
      snapshot_date,
      gender: gender.toUpperCase(),
      node: p.federvolley_node ?? null,
      name: p.name || null,
      position: p.position,
      points_total: p.points_total ?? null,
      points_entry: p.points_entry ?? null,
      price: getPrice(p.position),
    }));
    return { snapshot_date, total: json.total ?? null, rows };
  };

  const upsert = async (rows) => {
    let saved = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/fivb_rankings?on_conflict=snapshot_date,gender,position`, {
        method: "POST", headers: supaHeaders, body: JSON.stringify(batch),
      });
      if (res.ok) saved += batch.length;
      else throw new Error("upsert: " + (await res.text()));
    }
    return saved;
  };

  try {
    const [m, f] = await Promise.all([fetchRanking("m"), fetchRanking("f")]);
    const savedM = await upsert(m.rows);
    const savedF = await upsert(f.rows);
    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        ok: true,
        men:   { snapshot_date: m.snapshot_date, total: m.total, scaricati: m.rows.length, salvati: savedM },
        women: { snapshot_date: f.snapshot_date, total: f.total, scaricati: f.rows.length, salvati: savedF },
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error: err.message }) };
  }
};
