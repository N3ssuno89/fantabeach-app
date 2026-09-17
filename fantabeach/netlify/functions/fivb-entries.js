// netlify/functions/fivb-entries.js
// Entry list per atleta (node) dall'API → fivb_entries (isolato).
// Default: tutti i tornei in fivb_tournaments. Override: ?ids=9387,9388,9389,9390
// Idempotente (upsert tournament+node). Salva solo atleti con node.
// AUTO-COACH: dopo le entries, inserisce in `coaches` i coach nuovi del feed con costo 5.
const FIVB_BASE    = "https://fivbeach.com/api/v1";
const FIVB_TOKEN   = process.env.FIVBEACH_TOKEN || "";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (!FIVB_TOKEN) return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error:"FIVBEACH_TOKEN mancante" }) };
  if (!SUPABASE_URL || !SUPABASE_KEY) return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error:"Supabase env mancanti" }) };
  const supaHeaders = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` };
  const apiHeaders  = { "Authorization": `Bearer ${FIVB_TOKEN}`, "Accept": "application/json" };
  let ids = (event.queryStringParameters?.ids || "").split(",").map(s => s.trim()).filter(Boolean);
  if (ids.length === 0) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/fivb_tournaments?select=vis_id`, { headers: supaHeaders });
    const t = await r.json();
    ids = Array.isArray(t) ? t.map(x => String(x.vis_id)) : [];
  }
  if (ids.length === 0) return { statusCode: 200, headers, body: JSON.stringify({ ok:true, note:"nessun torneo e nessun ?ids=" }) };
  const upsert = async (rows) => {
    if (rows.length === 0) return 0;
    const wHeaders = { ...supaHeaders, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal" };
    let saved = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/fivb_entries?on_conflict=tournament_vis_id,node`, { method: "POST", headers: wHeaders, body: JSON.stringify(batch) });
      if (res.ok) saved += batch.length; else throw new Error("upsert: " + (await res.text()));
    }
    return saved;
  };
  try {
    const perTorneo = [];
    for (const id of ids) {
      const res = await fetch(`${FIVB_BASE}/tournaments/${id}/entries`, { headers: apiHeaders });
      if (!res.ok) { perTorneo.push({ vis_id: Number(id), errore: `HTTP ${res.status}` }); continue; }
      const json = await res.json();
      const rows = [];
      for (const team of (json.data || [])) {
        for (const p of (team.players || [])) {
          if (p.federvolley_node == null) continue;     // salta riserve mai in campo
          rows.push({
            tournament_vis_id: Number(id),
            node: p.federvolley_node,
            name: p.name || null,
            player_rank: p.rank ?? null,
            team_name: team.team || null,
            coach: team.coach || null,
            section: team.section || null,
            pos: team.pos ?? null,
          });
        }
      }
      // dedup per node nello stesso torneo (un atleta può comparire in più sezioni)
      const byNode = new Map();
      for (const r of rows) byNode.set(r.node, r);   // ultima vince
      const deduped = [...byNode.values()];
      const saved = await upsert(deduped);
      perTorneo.push({ vis_id: Number(id), atleti: deduped.length, doppioni: rows.length - deduped.length, salvati: saved });
    }

    // ── AUTO-COACH: inserisce in `coaches` i coach nuovi del feed con costo 5 ──
    let coachInseriti = [];
    try {
      const coachSet = new Set();
      for (const id of ids) {
        const cr = await fetch(
          `${SUPABASE_URL}/rest/v1/fivb_entries?tournament_vis_id=eq.${id}&coach=not.is.null&select=coach`,
          { headers: supaHeaders }
        );
        const crows = await cr.json();
        (Array.isArray(crows) ? crows : []).forEach(x => {
          const nome = (x.coach || "").trim();
          if (nome) coachSet.add(nome);
        });
      }

      if (coachSet.size > 0) {
        const cexRes = await fetch(`${SUPABASE_URL}/rest/v1/coaches?select=id,name`, { headers: supaHeaders });
        const cex = await cexRes.json();
        const esistenti = new Set((Array.isArray(cex) ? cex : []).map(c => (c.name || "").trim().toUpperCase()));
        let maxNum = 0;
        (Array.isArray(cex) ? cex : []).forEach(c => {
          const m = /^C(\d+)$/.exec(c.id || "");
          if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
        });

        const nuovi = [];
        for (const nome of coachSet) {
          if (!esistenti.has(nome.toUpperCase())) {
            maxNum += 1;
            nuovi.push({
              id: `C${String(maxNum).padStart(4, "0")}`,
              name: nome,
              cost: 5,
              gender: null,
              active: true,
              created_at: new Date().toISOString(),
            });
          }
        }

        if (nuovi.length > 0) {
          const wHeaders = { ...supaHeaders, "Content-Type": "application/json", "Prefer": "return=minimal" };
          const insRes = await fetch(`${SUPABASE_URL}/rest/v1/coaches`, {
            method: "POST", headers: wHeaders, body: JSON.stringify(nuovi),
          });
          if (insRes.ok) coachInseriti = nuovi.map(c => ({ id: c.id, name: c.name }));
          else console.error("[fivb-entries] auto-coach errore:", await insRes.text());
        }
      }
    } catch (e) {
      console.error("[fivb-entries] auto-coach eccezione:", e.message);
      // I coach sono opzionali: un errore qui non deve far fallire l'ingestione entries.
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, tornei: perTorneo, coach_inseriti: coachInseriti }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error: err.message }) };
  }
};
