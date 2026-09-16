-- ============================================================================
-- Coppie Game 2027 · 02_seed_2026.sql
-- Riempie game_athletes e game_pairs con la stagione 2026 (fivb_matches + match_results).
-- Da lanciare dopo 01_schema.sql, prima su STAGING e poi su PROD.
-- Si può rilanciare: aggiorna senza cancellare, quindi non tocca voti, pronostici e foto.
-- ============================================================================
begin;

create temp table g_t on commit drop as
  select vis_id, gender, start_date
  from public.fivb_tournaments
  where season = 2026;

-- ogni partita diventa due righe, una per squadra; il lato "Bye" ha i node null e resta fuori
create temp table g_sides on commit drop as
  select m.tournament_vis_id as vis_id, m.status,
         least(m.team_a_p1_node, m.team_a_p2_node)    as n1,
         greatest(m.team_a_p1_node, m.team_a_p2_node) as n2,
         (m.status = 'finished' and m.winner = 'a')    as vinta
  from public.fivb_matches m
  join g_t on g_t.vis_id = m.tournament_vis_id
  where m.team_a_p1_node is not null and m.team_a_p2_node is not null
  union all
  select m.tournament_vis_id, m.status,
         least(m.team_b_p1_node, m.team_b_p2_node),
         greatest(m.team_b_p1_node, m.team_b_p2_node),
         (m.status = 'finished' and m.winner = 'b')
  from public.fivb_matches m
  join g_t on g_t.vis_id = m.tournament_vis_id
  where m.team_b_p1_node is not null and m.team_b_p2_node is not null;

create temp table g_pnm on commit drop as
  select distinct on (node) node, internal_id
  from public.player_node_map
  where node is not null
  order by node, verified desc nulls last, updated_at desc;

-- ---------------------------------------------------------------------------
-- Atleti: tutti quelli che hanno giocato almeno una partita nel 2026
-- ---------------------------------------------------------------------------
insert into public.game_athletes (node, gender, full_name, ranking_pos, ranking_pts, fb_points)
select a.n,
       a.gender,
       coalesce(e.name, 'Atleta ' || a.n),
       (row_number() over (partition by a.gender order by coalesce(e.player_rank, 0) desc, coalesce(p.pts, 0) desc))::integer,
       coalesce(e.player_rank, 0),
       coalesce(p.pts, 0)
from (
  select distinct on (x.n) x.n, g_t.gender
  from (select vis_id, n1 as n from g_sides union all select vis_id, n2 from g_sides) x
  join g_t on g_t.vis_id = x.vis_id
  order by x.n, g_t.start_date desc
) a
left join (
  select distinct on (node) node, name, player_rank
  from public.fivb_entries
  order by node, ingested_at desc
) e on e.node = a.n
left join g_pnm m on m.node = a.n
left join (
  select mr.player_id, round(sum(mr.total_pts * coalesce(ev.weight, 1)), 1) as pts
  from public.match_results mr
  join public.events ev on ev.id = mr.event_id
  where ev.anno = 2026
  group by mr.player_id
) p on p.player_id = m.internal_id
on conflict (node) do update
  set gender      = excluded.gender,
      full_name   = excluded.full_name,
      ranking_pos = excluded.ranking_pos,
      ranking_pts = excluded.ranking_pts,
      fb_points   = excluded.fb_points,
      updated_at  = now();

-- ---------------------------------------------------------------------------
-- Coppie 2026 ancora insieme all'ultima tappa giocata da entrambi.
-- Nel mazzo: almeno 2 tappe insieme e ultima tappa insieme da agosto in poi.
-- ---------------------------------------------------------------------------
insert into public.game_pairs (id, gender, node_1, node_2, tappe_insieme, partite_insieme, partite_vinte,
                               punti_insieme, ultima_tappa, in_deck, deck_order)
with coppie as (
  select g_t.gender, s.n1, s.n2,
         count(distinct s.vis_id)::integer                        as tappe,
         (count(*) filter (where s.status = 'finished'))::integer  as partite,
         (count(*) filter (where s.vinta))::integer                as vinte,
         max(g_t.start_date)                                       as ultima
  from g_sides s
  join g_t on g_t.vis_id = s.vis_id
  group by g_t.gender, s.n1, s.n2
),
ultima_atleta as (
  select x.n, max(g_t.start_date) as ultima
  from (select vis_id, n1 as n from g_sides union all select vis_id, n2 from g_sides) x
  join g_t on g_t.vis_id = x.vis_id
  group by x.n
),
attuali as (
  select c.*
  from coppie c
  join ultima_atleta u1 on u1.n = c.n1
  join ultima_atleta u2 on u2.n = c.n2
  where c.ultima = u1.ultima and c.ultima = u2.ultima
),
punti as (
  select ec.n1, ec.n2, round(sum(mr.total_pts * coalesce(ev.weight, 1)), 1) as pts
  from (select distinct vis_id, n1, n2 from g_sides) ec
  join public.event_tournament_map etm on etm.vis_id = ec.vis_id
  join g_pnm a on a.node = ec.n1
  join g_pnm b on b.node = ec.n2
  join public.match_results mr on mr.event_id = etm.event_id and mr.player_id in (a.internal_id, b.internal_id)
  join public.events ev on ev.id = mr.event_id
  group by ec.n1, ec.n2
),
finale as (
  select at.*,
         coalesce(pt.pts, 0) as punti,
         (at.tappe >= 2 and at.ultima >= date '2026-08-01') as mazzo,
         ga.ranking_pts + gb.ranking_pts as rk
  from attuali at
  left join punti pt on pt.n1 = at.n1 and pt.n2 = at.n2
  join public.game_athletes ga on ga.node = at.n1
  join public.game_athletes gb on gb.node = at.n2
)
select 'p' || n1 || '-' || n2, gender, n1, n2, tappe, partite, vinte, punti, ultima, mazzo,
       case when mazzo then (row_number() over (partition by gender, mazzo order by rk desc, n1))::integer end
from finale
on conflict (id) do update
  set tappe_insieme   = excluded.tappe_insieme,
      partite_insieme = excluded.partite_insieme,
      partite_vinte   = excluded.partite_vinte,
      punti_insieme   = excluded.punti_insieme,
      ultima_tappa    = excluded.ultima_tappa,
      in_deck         = excluded.in_deck,
      deck_order      = excluded.deck_order;

commit;

-- Controllo. Valori attesi su prod: atleti 123 M / 104 F, coppie 49 M / 45 F, nel mazzo 29 M / 31 F
select gender, count(*) as atleti from public.game_athletes group by gender order by gender;
select gender, count(*) as coppie, count(*) filter (where in_deck) as nel_mazzo from public.game_pairs group by gender order by gender;
