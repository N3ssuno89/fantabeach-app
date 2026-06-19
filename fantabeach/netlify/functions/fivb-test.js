// netlify/functions/fivb-players.js
// TEST ISOLATO: l'API fivbeach come fonte e come id (federvolley_node).
// Non legge fogli, non scrive su Supabase, non tocca NIENTE di esistente.
// Pesca il ranking ITA M+F, calcola il prezzo dalla posizione, restituisce la lista.

const FIVB_BASE  = "https://fivbeach.com/api/v1";
const FIVB_TOKEN = process.env.FIVBEACH_TOKEN || "";

// stessa scala prezzi di sync.js (1°=160 … 60°=22, oltre = 20)
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

  const fetchRanking = async (gender) => {
    const res = await fetch(`${FIVB_BASE}/rankings/ita?gender=${gender}`, {
      headers: { "Authorization": `Bearer ${FIVB_TOKEN}`, "Accept": "application/json" },
    });
    if (!res.ok) throw new Error(`ranking ${gender}: HTTP ${res.status}`);
    const json = await res.json();
    return (json.data || []).map(p => ({
      node: p.federvolley_node,
      name: p.name,
      gender: gender.toUpperCase(),
      position: p.position,
      points_total: p.points_total,
      price: getPrice(p.position),
    }));
  };

  try {
    const [men, women] = await Promise.all([fetchRanking("m"), fetchRanking("f")]);
    const full = event.queryStringParameters?.full === "1";
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        count: { men: men.length, women: women.length },
        men:   full ? men   : men.slice(0, 20),   // default: primi 20 per lato
        women: full ? women : women.slice(0, 20), // ?full=1 per la lista intera
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error: err.message }) };
  }
};
