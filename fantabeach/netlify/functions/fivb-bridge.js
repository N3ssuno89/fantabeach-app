// netlify/functions/fivb-bridge.js
// Abbina PLAYER_MAPPING ↔ federvolley_node (match ordine-insensibile).
// Default = DRY RUN. Con ?write=1 scrive su player_node_map (upsert su internal_id).

const { google } = require("googleapis");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const SHEET_ID     = process.env.GOOGLE_SHEETS_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY  = (process.env.GOOGLE_PRIVATE_KEY || "").split("\\n").join("\n");

const normKey = (s) => (s || "")
  .toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[''`.]/g, " ").replace(/-/g, " ")
  .split(/\s+/).filter(Boolean).sort().join(" ");
const normGender = (g) => ((g || "").toUpperCase().startsWith("M") ? "M" : "F");

exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (!SUPABASE_URL || !SUPABASE_KEY) return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error:"Supabase env mancanti" }) };
  if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error:"Google env mancanti" }) };

  const supaHeaders = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` };
  const doWrite = event.queryStringParameters?.write === "1";

  try {
    const apiRows = [];
    for (let offset = 0; ; offset += 1000) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/fivb_rankings?select=gender,node,name,snapshot_date&order=snapshot_date.desc&limit=1000&offset=${offset}`, { headers: supaHeaders });
      const rows = await r.json();
      if (!Array.isArray(rows) || rows.length === 0) break;
      apiRows.push(...rows);
      if (rows.length < 1000) break;
    }
    const apiByKey = {}; const seen = new Set();
    for (const a of apiRows) {
      if (a.node == null) continue;
      const gn = `${a.gender}|${a.node}`;
      if (seen.has(gn)) continue; seen.add(gn);
      const k = `${normGender(a.gender)}|${normKey(a.name)}`;
      if (!apiByKey[k]) apiByKey[k] = { node: a.node, name: a.name };
    }

    const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, ["https://www.googleapis.com/auth/spreadsheets.readonly"]);
    const sheets = google.sheets({ version: "v4", auth });
    const mapRes = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "PLAYER_MAPPING!A:C" });
    const mapRows = (mapRes.data.values || []).slice(1);

    const abbinati = []; const da_controllare = [];
    for (const row of mapRows) {
      const id = (row[0] || "").trim();
      const name = (row[1] || "").trim();
      const gender = normGender(row[2]);
      if (!id || !name) continue;
      const hit = apiByKey[`${gender}|${normKey(name)}`];
      if (hit) abbinati.push({ id, node: hit.node, gender, nome_tuo: name, nome_api: hit.name });
      else da_controllare.push({ id, gender, nome_tuo: name });
    }

    let scritti = 0;
    if (doWrite) {
      const rows = [
        ...abbinati.map(a => ({ internal_id: a.id, node: a.node, gender: a.gender, name_app: a.nome_tuo, name_api: a.nome_api, match_type: "auto", verified: false })),
        ...da_controllare.map(d => ({ internal_id: d.id, node: null, gender: d.gender, name_app: d.nome_tuo, name_api: null, match_type: "none", verified: false })),
      ];
      const wHeaders = { ...supaHeaders, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal" };
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const res = await fetch(`${SUPABASE_URL}/rest/v1/player_node_map?on_conflict=internal_id`, { method: "POST", headers: wHeaders, body: JSON.stringify(batch) });
        if (res.ok) scritti += batch.length;
        else throw new Error("upsert: " + (await res.text()));
      }
    }

    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        ok: true, write: doWrite, scritti,
        totali: abbinati.length + da_controllare.length,
        abbinati_count: abbinati.length,
        da_controllare_count: da_controllare.length,
        da_controllare,
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error: err.message }) };
  }
};
