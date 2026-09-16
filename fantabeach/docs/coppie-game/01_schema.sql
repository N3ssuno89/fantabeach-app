-- ============================================================================
-- Coppie Game 2027 · 01_schema.sql
-- Da lanciare PRIMA su STAGING, poi, dopo i test, su PROD.
-- Crea solo tabelle e funzioni nuove (prefisso game_). Non modifica tabelle esistenti.
-- Si può rilanciare: usa IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================================
begin;

-- ---------------------------------------------------------------------------
-- 1. Fotografia della stagione 2026 (dati fermi, lettura pubblica)
-- ---------------------------------------------------------------------------
create table if not exists public.game_athletes (
  node         integer primary key,
  gender       text    not null check (gender in ('M','F')),
  full_name    text    not null,                 -- come in fivb_entries (COGNOME NOME)
  ranking_pos  integer not null,                 -- posizione nel ranking 2026, per genere
  ranking_pts  numeric not null default 0,
  fb_points    numeric not null default 0,       -- punti FantaBeach 2026 con moltiplicatore tappa
  photo_path   text,                             -- es. '15154.png' nel bucket game-players; null = sagoma
  updated_at   timestamptz not null default now()
);

create table if not exists public.game_pairs (
  id              text    primary key,           -- 'p<node_1>-<node_2>'
  gender          text    not null check (gender in ('M','F')),
  node_1          integer not null references public.game_athletes(node),
  node_2          integer not null references public.game_athletes(node),
  tappe_insieme   integer not null,
  partite_insieme integer not null,
  partite_vinte   integer not null,
  punti_insieme   numeric not null,              -- solo tappe 2026 giocate in coppia
  ultima_tappa    date    not null,
  in_deck         boolean not null default false, -- almeno 2 tappe insieme e unite da agosto in poi
  deck_order      integer,                        -- ordine nel mazzo: ranking sommato decrescente
  check (node_1 < node_2)
);
create index if not exists game_pairs_gender_deck_idx on public.game_pairs (gender, in_deck, deck_order);

-- ---------------------------------------------------------------------------
-- 2. Pronostici degli utenti
-- ---------------------------------------------------------------------------
create table if not exists public.game_votes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  pair_id    text not null references public.game_pairs(id) on delete restrict,
  choice     text not null check (choice in ('stay','split')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, pair_id)
);

create table if not exists public.game_predictions (
  id         bigint generated always as identity primary key,
  user_id    uuid    not null references auth.users(id) on delete cascade,
  gender     text    not null check (gender in ('M','F')),
  node_a     integer not null references public.game_athletes(node),
  node_b     integer not null references public.game_athletes(node),
  kind       text    not null check (kind in ('confermata','nuova')),
  created_at timestamptz not null default now(),
  check (node_a < node_b)
);
create index if not exists game_predictions_pair_idx on public.game_predictions (gender, node_a, node_b);
create index if not exists game_predictions_user_idx on public.game_predictions (user_id);

-- Regola del gioco anche a livello database: per ogni utente un atleta sta in una sola coppia
create or replace function public.game_predictions_one_pair_per_athlete()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from public.game_predictions p
    where p.user_id = new.user_id and p.id <> new.id
      and (p.node_a in (new.node_a, new.node_b) or p.node_b in (new.node_a, new.node_b))
  ) then
    raise exception 'Atleta già presente in un''altra coppia di questo utente';
  end if;
  return new;
end $$;
drop trigger if exists game_predictions_one_pair on public.game_predictions;
create trigger game_predictions_one_pair
  before insert or update on public.game_predictions
  for each row execute function public.game_predictions_one_pair_per_athlete();

-- ---------------------------------------------------------------------------
-- 3. RLS e permessi: lettura pubblica della fotografia, pronostici visibili solo al proprietario,
--    nessuna scrittura diretta (si scrive solo tramite le funzioni della sezione 4)
-- ---------------------------------------------------------------------------
alter table public.game_athletes    enable row level security;
alter table public.game_pairs       enable row level security;
alter table public.game_votes       enable row level security;
alter table public.game_predictions enable row level security;

drop policy if exists game_athletes_read on public.game_athletes;
create policy game_athletes_read on public.game_athletes for select to anon, authenticated using (true);
drop policy if exists game_pairs_read on public.game_pairs;
create policy game_pairs_read on public.game_pairs for select to anon, authenticated using (true);
drop policy if exists game_votes_own on public.game_votes;
create policy game_votes_own on public.game_votes for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists game_predictions_own on public.game_predictions;
create policy game_predictions_own on public.game_predictions for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.game_athletes, public.game_pairs, public.game_votes, public.game_predictions from anon, authenticated;
grant select on public.game_athletes, public.game_pairs to anon, authenticated;
grant select on public.game_votes, public.game_predictions to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Funzioni di scrittura (serve il login)
-- ---------------------------------------------------------------------------

-- Salva una coppia 2027: toglie le coppie dell'utente in conflitto e registra quella nuova.
-- Se i due non sono la stessa coppia 2026, le loro coppie 2026 risultano separate.
create or replace function public.game_save_pair(p_node_1 integer, p_node_2 integer)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid    := auth.uid();
  v_a    integer := least(p_node_1, p_node_2);
  v_b    integer := greatest(p_node_1, p_node_2);
  v_ga   text;
  v_gb   text;
  v_kind text;
  v_id   bigint;
begin
  if v_uid is null then raise exception 'Login richiesto' using errcode = '28000'; end if;
  if v_a is null or v_a = v_b then raise exception 'Coppia non valida'; end if;
  select gender into v_ga from public.game_athletes where node = v_a;
  select gender into v_gb from public.game_athletes where node = v_b;
  if v_ga is null or v_gb is null then raise exception 'Atleta inesistente'; end if;
  if v_ga <> v_gb then raise exception 'Solo coppie dello stesso genere'; end if;

  delete from public.game_predictions
   where user_id = v_uid and (node_a in (v_a, v_b) or node_b in (v_a, v_b));

  v_kind := case when exists (select 1 from public.game_pairs where node_1 = v_a and node_2 = v_b)
                 then 'confermata' else 'nuova' end;

  insert into public.game_predictions (user_id, gender, node_a, node_b, kind)
  values (v_uid, v_ga, v_a, v_b, v_kind)
  returning id into v_id;

  if v_kind = 'confermata' then
    insert into public.game_votes (user_id, pair_id, choice)
    select v_uid, gp.id, 'stay' from public.game_pairs gp where gp.node_1 = v_a and gp.node_2 = v_b
    on conflict (user_id, pair_id) do update set choice = 'stay', updated_at = now();
  else
    insert into public.game_votes (user_id, pair_id, choice)
    select v_uid, gp.id, 'split' from public.game_pairs gp
     where gp.node_1 in (v_a, v_b) or gp.node_2 in (v_a, v_b)
    on conflict (user_id, pair_id) do update set choice = 'split', updated_at = now();
  end if;
  return v_id;
end $$;

-- Voto "restano" / "si separano" su una coppia 2026.
create or replace function public.game_vote(p_pair_id text, p_choice text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := auth.uid();
  v_n1   integer;
  v_n2   integer;
begin
  if v_uid is null then raise exception 'Login richiesto' using errcode = '28000'; end if;
  if p_choice not in ('stay','split') then raise exception 'Scelta non valida'; end if;
  select node_1, node_2 into v_n1, v_n2 from public.game_pairs where id = p_pair_id;
  if v_n1 is null then raise exception 'Coppia inesistente'; end if;

  insert into public.game_votes (user_id, pair_id, choice) values (v_uid, p_pair_id, p_choice)
  on conflict (user_id, pair_id) do update set choice = excluded.choice, updated_at = now();

  if p_choice = 'stay' then
    perform public.game_save_pair(v_n1, v_n2);
  else
    delete from public.game_predictions where user_id = v_uid and node_a = v_n1 and node_b = v_n2;
  end if;
end $$;

-- Toglie una coppia dai pronostici. Se era la coppia 2026 confermata, quel voto torna da dare.
create or replace function public.game_remove_pair(p_node_1 integer, p_node_2 integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid    := auth.uid();
  v_a   integer := least(p_node_1, p_node_2);
  v_b   integer := greatest(p_node_1, p_node_2);
begin
  if v_uid is null then raise exception 'Login richiesto' using errcode = '28000'; end if;
  delete from public.game_predictions where user_id = v_uid and node_a = v_a and node_b = v_b;
  delete from public.game_votes v using public.game_pairs gp
   where v.user_id = v_uid and v.pair_id = gp.id and gp.node_1 = v_a and gp.node_2 = v_b and v.choice = 'stay';
end $$;

-- "Annulla il no": cancella il voto su una coppia 2026 (e l'eventuale coppia confermata).
create or replace function public.game_unvote(p_pair_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_n1  integer;
  v_n2  integer;
begin
  if v_uid is null then raise exception 'Login richiesto' using errcode = '28000'; end if;
  select node_1, node_2 into v_n1, v_n2 from public.game_pairs where id = p_pair_id;
  delete from public.game_votes where user_id = v_uid and pair_id = p_pair_id;
  delete from public.game_predictions where user_id = v_uid and node_a = v_n1 and node_b = v_n2;
end $$;

-- Dopo il login: carica in un colpo i voti e le coppie fatti prima di entrare (salvati sul telefono).
-- p_votes: [{"pair_id":"p15154-15163","choice":"split"}], p_pairs: [{"node_1":15154,"node_2":14287}]
create or replace function public.game_sync(p_votes jsonb, p_pairs jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if auth.uid() is null then raise exception 'Login richiesto' using errcode = '28000'; end if;
  if jsonb_array_length(coalesce(p_votes, '[]'::jsonb)) > 200 or jsonb_array_length(coalesce(p_pairs, '[]'::jsonb)) > 200 then
    raise exception 'Troppi elementi';
  end if;
  for r in select * from jsonb_to_recordset(coalesce(p_votes, '[]'::jsonb)) as x(pair_id text, choice text) loop
    perform public.game_vote(r.pair_id, r.choice);
  end loop;
  for r in select * from jsonb_to_recordset(coalesce(p_pairs, '[]'::jsonb)) as x(node_1 integer, node_2 integer) loop
    perform public.game_save_pair(r.node_1, r.node_2);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Statistiche della community: solo totali, mai i voti dei singoli
-- ---------------------------------------------------------------------------
create or replace function public.game_vote_stats(p_gender text)
returns table (pair_id text, stay integer, split integer)
language sql stable security definer set search_path = '' as $$
  select gp.id,
         (count(v.user_id) filter (where v.choice = 'stay'))::integer,
         (count(v.user_id) filter (where v.choice = 'split'))::integer
  from public.game_pairs gp
  left join public.game_votes v on v.pair_id = gp.id
  where gp.gender = p_gender and gp.in_deck
  group by gp.id;
$$;

create or replace function public.game_pair_stats(p_gender text)
returns table (node_a integer, node_b integer, votes integer)
language sql stable security definer set search_path = '' as $$
  select p.node_a, p.node_b, count(*)::integer
  from public.game_predictions p
  where p.gender = p_gender
  group by p.node_a, p.node_b;
$$;

create or replace function public.game_totals(p_gender text)
returns table (players integer, votes integer, pairs integer)
language sql stable security definer set search_path = '' as $$
  select
    (select count(distinct u.user_id) from (
        select v.user_id from public.game_votes v join public.game_pairs gp on gp.id = v.pair_id where gp.gender = p_gender
        union
        select p.user_id from public.game_predictions p where p.gender = p_gender) u)::integer,
    (select count(*) from public.game_votes v join public.game_pairs gp on gp.id = v.pair_id where gp.gender = p_gender)::integer,
    (select count(*) from public.game_predictions p where p.gender = p_gender)::integer;
$$;

revoke all on function public.game_save_pair(integer, integer), public.game_vote(text, text), public.game_unvote(text),
                       public.game_remove_pair(integer, integer), public.game_sync(jsonb, jsonb) from public, anon;
grant execute on function public.game_save_pair(integer, integer), public.game_vote(text, text), public.game_unvote(text),
                          public.game_remove_pair(integer, integer), public.game_sync(jsonb, jsonb) to authenticated;
revoke all on function public.game_vote_stats(text), public.game_pair_stats(text), public.game_totals(text) from public;
grant execute on function public.game_vote_stats(text), public.game_pair_stats(text), public.game_totals(text) to anon, authenticated;
revoke all on function public.game_predictions_one_pair_per_athlete() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Foto degli atleti: bucket pubblico in sola lettura (i file li carichi tu dalla dashboard)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('game-players', 'game-players', true)
on conflict (id) do nothing;

commit;
