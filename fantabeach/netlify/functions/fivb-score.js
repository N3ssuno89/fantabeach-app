// netlify/functions/fivb-score.js
// Punti grezzi per atleta (node) da fivb_matches, regole FantaBeach.
// Default: tornei 'finished'. Override: ?ids=9387,9388. Scrive su fivb_player_scores (isolato).

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const RESULT_PTS = { "2-0": 4, "2-1": 3, "1-2": 1, "0-2": 0 };

const scoreMatch = (m) => {
  const out = [];
  const aNodes = [m.team_a_p1_node, m.team_a_p2_node].filter(n => n != null);
  const bNodes = [m.team_b_p1_node, m.team_b_p2_node].filter(n => n != null);

  if (m.status === "bye") {                       // squadra presente: +4 a testa
    (aNodes.length ? aNodes : bNodes).forEach(n => out.push({ node: n, base: 4, bonus: 0 }));
    return out;
  }
  if (m.status !== "finished" || !m.result) return out;   // scheduled / senza risultato

  const baseA = RESULT_PTS[m.result];
  const baseB = RESULT_PTS[m.result.split("-").reverse().join("-")];
  if (baseA == null || baseB == null) return out;

  // volata: +0.5 a chi PERDE un set di 2, solo nei primi 2 set
  let bonusA = 0, bonusB = 0;
  const sets = Array.isArray(m.sets) ? m.sets : [];
  for (let i = 0; i < Math.min(2, sets.length); i++) {
    const pa = Number(sets[i]?.[0]), pb = Number(sets[i]?.[1]);
    if (Math.abs(pa - pb) === 2) { if (pa < pb) bonusA += 0.5; else bonusB += 0.5; }
  }
  aNodes.forEach(n => out.push({ node: n, base: baseA, bonus: bonusA }));
  bNodes.forEach(n => out.push({ node: n, base: baseB, bonus: bonusB }));
  return out;
};

exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (!SUPABASE_URL || !SUPABASE_KEY) return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error:"Supabase env mancanti" }) };

  const supaHeaders = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` };

  let ids = (event.queryStringParameters?.ids || "").split(",").map(s => s.trim()).filter(Boolean);
  if (ids.length === 0) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/fivb_tournaments?status=eq.finished&select=vis_id`, { headers: supaHeaders });
    const t = await r.json();
    ids = Array.isArray(t) ? t.map(x => String(x.vis_id)) : [];
  }
  if (ids.length === 0) return { statusCode: 200, headers, body: JSON.stringify({ ok:true, note:"nessun torneo finished e nessun ?ids=" }) };

  try {
    const perTorneo = [];
    for (const id of ids) {
      const mr = await fetch(`${SUPABASE_URL}/rest/v1/fivb_matches?tournament_vis_id=eq.${id}&select=status,result,sets,team_a_p1_node,team_a_p2_node,team_b_p1_node,team_b_p2_node&limit=2000`, { headers: supaHeaders });
      const matches = await mr.json();
      if (!Array.isArray(matches)) throw new Error(`lettura matches ${id} fallita`);

      const agg = {};
      for (const m of matches) for (const r of scoreMatch(m)) {
        if (!agg[r.node]) agg[r.node] = { base: 0, bonus: 0, matches: 0 };
        agg[r.node].base += r.base; agg[r.node].bonus += r.bonus; agg[r.node].matches += 1;
      }

      const rows = Object.entries(agg).map(([node, v]) => ({
        tournament_vis_id: Number(id), node: Number(node),
        base_pts: v.base, bonus_pts: v.bonus, total_pts: v.base + v.bonus, matches_played: v.matches,
      }));

      const wHeaders = { ...supaHeaders, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal" };
      let scritti = 0;
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const res = await fetch(`${SUPABASE_URL}/rest/v1/fivb_player_scores?on_conflict=tournament_vis_id,node`, { method: "POST", headers: wHeaders, body: JSON.stringify(batch) });
        if (res.ok) scritti += batch.length; else throw new Error("upsert: " + (await res.text()));
      }

      const top = rows.slice().sort((a,b) => b.total_pts - a.total_pts).slice(0, 8)
        .map(r => ({ node: r.node, tot: r.total_pts, partite: r.matches_played }));
      perTorneo.push({ vis_id: Number(id), partite: matches.length, atleti: rows.length, scritti, top });
    }
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, tornei: perTorneo }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error: err.message }) };
  }
};
