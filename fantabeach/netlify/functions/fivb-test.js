// netlify/functions/fivb-test.js
// Test sola lettura API fivbeach. Token da env, MAI nel frontend.

const FIVB_BASE  = "https://fivbeach.com/api/v1";
const FIVB_TOKEN = process.env.FIVBEACH_TOKEN || "";

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  if (!FIVB_TOKEN) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: "FIVBEACH_TOKEN mancante nelle env var" }) };
  }

  // default: ranking M. Sovrascrivibile con ?path=/altro/endpoint
  const path = event.queryStringParameters?.path || "/rankings/ita?gender=m";
  const url  = path.startsWith("http") ? path : `${FIVB_BASE}${path}`;

  try {
    const res  = await fetch(url, {
      headers: { "Authorization": `Bearer ${FIVB_TOKEN}`, "Accept": "application/json" },
    });
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = null; }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: res.ok,
        status: res.status,
        url,
        // se è il ranking, mostra solo i primi 5 per non sputare 2600 righe
        sample: json?.data ? {
          gender: json.gender, snapshot_date: json.snapshot_date, total: json.total,
          primi5: Array.isArray(json.data) ? json.data.slice(0, 5) : json.data,
        } : (json ?? text.slice(0, 500)),
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
