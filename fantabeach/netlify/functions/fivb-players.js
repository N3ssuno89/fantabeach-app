// netlify/functions/fivb-players.js
//
// Allinea l'anagrafica player_node_map con gli atleti visti nei dati FIVB.
// Sorgente nomi: fivb_entries (node,name). Fallback nome: fivb_matches (stringa coppia).
// NON chiama l'API esterna: lavora sui dati gia' scaricati da fivb-entries/fivb-matches.
//
// Logica semi-automatica (prudente):
//   - node gia' in player_node_map             -> ignora.
//   - nome IDENTICO a 1 solo W/M-id senza node -> AGGANCIA (UPDATE).  [auto]
//   - nome del tutto ASSENTE e nessun simile   -> CREA nuovo id.      [auto]
//   - qualsiasi ambiguita'                      -> DUBBIO (segnala, non tocca).
//
// Endpoint: POST /.netlify/functions/fivb-players
// Body (opz): { "dry_run": true } -> calcola e riporta, NON scrive.
//             { "tournament_ids": [9393,9394] } -> limita a certi tornei (default: tutti).

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const norm = (s) => (s || "")
  .toUpperCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^A-Z0-9 ]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const tokens = (s) => norm(s).split(" ").filter(Boolean);

const sb = (path, opts = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });

const sbGet = async (path) => {
  const res = await sb(path);
  if (!res.ok) throw new Error(`GET ${path}: HTTP ${res.status}`);
  return res.json();
};

exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (!SUPABASE_URL || !SUPABASE_KEY)
    return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error:"Supabase env mancanti" }) };

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch (_) {}
  const dryRun = body.dry_run === true;
  const tournamentIds = Array.isArray(body.tournament_ids) ? body.tournament_ids.map(Number) : null;

  try {
    const pnm = await sbGet("player_node_map?select=internal_id,node,gender,name_app,name_api");
    const nodeSet = new Set(pnm.filter(p => p.node != null).map(p => p.node));
    const byName = {};
    for (const p of pnm) {
      const nm = norm(p.name_app || p.name_api);
      if (!nm) continue;
      (byName[nm] = byName[nm] || []).push({ internal_id: p.internal_id, node: p.node, gender: p.gender });
    }
    const maxId = { W: 0, M: 0 };
    for (const p of pnm) {
      const m = /^([WM])(\d+)$/.exec(p.internal_id || "");
      if (m) { const n = Number(m[2]); if (n > maxId[m[1]]) maxId[m[1]] = n; }
    }
    const nextId = (prefix) => `${prefix}${String(++maxId[prefix]).padStart(4, "0")}`;

    let entFilter = "";
    if (tournamentIds) entFilter = `&tournament_vis_id=in.(${tournamentIds.join(",")})`;
    const entries = await sbGet(`fivb_entries?select=node,name,tournament_vis_id,section${entFilter}`);

    const tours = await sbGet("fivb_tournaments?select=vis_id,gender");
    const genderByVis = Object.fromEntries(tours.map(t => [String(t.vis_id), (t.gender || "").toUpperCase()]));

    const wanted = {};
    for (const e of entries) {
      if (e.node == null) continue;
      if (!wanted[e.node]) wanted[e.node] = { node: e.node, name: e.name || null, gender: genderByVis[String(e.tournament_vis_id)] || null };
      else if (!wanted[e.node].name && e.name) wanted[e.node].name = e.name;
    }

    const needName = Object.values(wanted).filter(w => !w.name).map(w => w.node);
    if (needName.length > 0) {
      const inList = needName.join(",");
      const mm = await sbGet(
        `fivb_matches?select=team_a_name,team_b_name,team_a_p1_node,team_a_p2_node,team_b_p1_node,team_b_p2_node&or=(team_a_p1_node.in.(${inList}),team_a_p2_node.in.(${inList}),team_b_p1_node.in.(${inList}),team_b_p2_node.in.(${inList}))`
      );
      const splitPair = (s) => (s || "").split(" - ").map(x => x.trim());
      for (const m of mm) {
        const checks = [
          [m.team_a_p1_node, m.team_a_name, 0], [m.team_a_p2_node, m.team_a_name, 1],
          [m.team_b_p1_node, m.team_b_name, 0], [m.team_b_p2_node, m.team_b_name, 1],
        ];
        for (const [nd, pair, idx] of checks) {
          if (nd != null && wanted[nd] && !wanted[nd].name) {
            const parts = splitPair(pair);
            if (parts[idx]) wanted[nd].name = parts[idx];
          }
        }
      }
    }

    const report = { agganciati: [], creati: [], gia_presenti: 0, da_rivedere: [] };
    const writes = [];

    for (const w of Object.values(wanted)) {
      if (nodeSet.has(w.node)) { report.gia_presenti++; continue; }

      const nm = norm(w.name);
      if (!nm) {
        report.da_rivedere.push({ node: w.node, motivo: "nome non ricavabile (entries+matches vuoti)" });
        continue;
      }

      const exact = byName[nm] || [];
      const senzaNode = exact.filter(x => x.node == null);
      const conNode   = exact.filter(x => x.node != null);

      if (senzaNode.length === 1 && conNode.length === 0) {
        writes.push({ op: "update", internal_id: senzaNode[0].internal_id, node: w.node, name: w.name });
        report.agganciati.push({ node: w.node, name: w.name, internal_id: senzaNode[0].internal_id });
        continue;
      }
      if (exact.length > 0) {
        report.da_rivedere.push({ node: w.node, name: w.name, motivo: "nome identico ma ambiguo", candidati: exact });
        continue;
      }

      const tw = tokens(w.name);
      const cognome = tw[0];
      const simili = Object.keys(byName).filter(k => {
        const kt = k.split(" ");
        if (kt[0] === cognome) return true;
        if (tw.length >= 2 && k === [...tw].reverse().join(" ")) return true;
        return false;
      });
      if (simili.length > 0) {
        report.da_rivedere.push({ node: w.node, name: w.name, motivo: "nessun match esatto ma esistono simili", simili });
        continue;
      }

      const prefix = w.gender === "M" ? "M" : "W";
      const newId = nextId(prefix);
      writes.push({ op: "insert", internal_id: newId, node: w.node, name: w.name, gender: prefix });
      report.creati.push({ node: w.node, name: w.name, internal_id: newId });
    }

    const ADMIN_ID = "e393e7f7-df59-4bf6-8aec-18c89c5cc3d6"; // zioema

    let scritti = 0;
    if (!dryRun) {
      for (const wr of writes) {
        if (wr.op === "update") {
          const res = await sb(
            `player_node_map?internal_id=eq.${encodeURIComponent(wr.internal_id)}&node=is.null`,
            { method: "PATCH", headers: { "Prefer": "return=minimal" },
              body: JSON.stringify({ node: wr.node, name_api: wr.name, verified: true }) }
          );
          if (res.ok) scritti++;
        } else {
          const res = await sb("player_node_map", {
            method: "POST", headers: { "Prefer": "return=minimal" },
            body: JSON.stringify({ internal_id: wr.internal_id, node: wr.node, name_app: wr.name, name_api: wr.name, gender: wr.gender, verified: true }),
          });
          if (res.ok) scritti++;
        }
      }

      // Notifica all'admin SOLO se ci sono casi dubbi da rivedere a mano.
      if (report.da_rivedere.length > 0) {
        try {
          await sb("notifications", {
            method: "POST",
            headers: { "Prefer": "return=minimal" },
            body: JSON.stringify({
              user_id: ADMIN_ID,
              type: "anagrafica_dubbi",
              message: `⚠️ Anagrafica: ${report.da_rivedere.length} atleti da verificare ` +
                       `(agganciati ${report.agganciati.length}, creati ${report.creati.length}). ` +
                       `Lancia fivb-players in dry_run per il dettaglio.`,
            }),
          });
        } catch (_) { /* la notifica non deve far fallire il sync */ }
      }
    }

    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        ok: true, dry_run: dryRun,
        riepilogo: {
          nodi_visti: Object.keys(wanted).length,
          gia_presenti: report.gia_presenti,
          agganciati: report.agganciati.length,
          creati: report.creati.length,
          da_rivedere: report.da_rivedere.length,
          scritti: dryRun ? 0 : scritti,
        },
        agganciati: report.agganciati,
        creati: report.creati,
        da_rivedere: report.da_rivedere,
      }, null, 2),
    };
  } catch (err) {
    console.error("fivb-players error:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error: err.message }) };
  }
};
