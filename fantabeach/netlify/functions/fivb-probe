// netlify/functions/fivb-probe.js
// SONDA TEMPORANEA per esplorare l'API FIVB. Usa il token backend.
// Uso:  POST /.netlify/functions/fivb-probe   body: { "path": "players/12345" }
//       -> chiama https://fivbeach.com/api/v1/players/12345 e restituisce la risposta grezza.
// Restituisce status HTTP + corpo (troncato) per capire se l'endpoint esiste e cosa torna.
// RIMUOVERE dopo l'esplorazione: è uno strumento di indagine, non di produzione.

const FIVB_BASE  = "https://fivbeach.com/api/v1";
const FIVB_TOKEN = process.env.FIVBEACH_TOKEN || "";

exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (!FIVB_TOKEN) return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error:"FIVBEACH_TOKEN mancante" }) };

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch(_) {}
  const path = (body.path || "").replace(/^\/+/, ""); // togli slash iniziali
  if (!path) return { statusCode: 400, headers, body: JSON.stringify({ ok:false, error:"manca 'path' nel body, es. {\"path\":\"players/12345\"}" }) };

  const url = `${FIVB_BASE}/${path}`;
  try {
    const res = await fetch(url, { headers: { "Authorization": `Bearer ${FIVB_TOKEN}`, "Accept": "application/json" } });
    const status = res.status;
    const text = await res.text();
    // provo a parsare json; se fallisce restituisco testo grezzo troncato
    let parsed = null;
    try { parsed = JSON.parse(text); } catch(_) {}
    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        ok: res.ok,
        url_chiamato: url,
        http_status: status,
        tipo_risposta: parsed ? "json" : "testo",
        // se json: mostro le chiavi di primo livello + un campione; se testo: primi 800 char
        chiavi: parsed && typeof parsed === "object" ? Object.keys(parsed) : null,
        campione: parsed ? parsed : text.slice(0, 800),
      }, null, 2),
    };
  } catch (err) {
    return { statusCode: 200, headers, body: JSON.stringify({ ok:false, url_chiamato:url, errore: err.message }, null, 2) };
  }
};
