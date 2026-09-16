-- ============================================================================
-- Coppie Game 2027 · 03_verifica_staging.sql  (versione "un solo Run")
-- Lancia tutto il file in una volta sola: restituisce una tabella con una riga per prova ed esito OK / KO.
-- Non lascia dati: ogni prova che scrive viene annullata al suo interno.
-- ============================================================================
create or replace function pg_temp.game_verifica()
returns table (n integer, prova text, esito text, dettaglio text)
language plpgsql as $$
declare
  u1 uuid; u2 uuid; p_id text;
  m1 integer; m2 integer; m3 integer; f1 integer;
  c integer; v_det text; v_state text; v_msg text;
begin
  select id into u1 from auth.users order by created_at limit 1;
  select id into u2 from auth.users order by created_at offset 1 limit 1;
  select id into p_id from public.game_pairs where in_deck and gender = 'M' order by deck_order limit 1;
  select (array_agg(node order by ranking_pos))[1], (array_agg(node order by ranking_pos))[2], (array_agg(node order by ranking_pos))[3]
    into m1, m2, m3 from public.game_athletes where gender = 'M';
  select node into f1 from public.game_athletes where gender = 'F' order by ranking_pos limit 1;

  -- 1 · RLS attiva
  select count(*) into c from pg_class cl join pg_namespace ns on ns.oid = cl.relnamespace
   where ns.nspname = 'public' and cl.relrowsecurity
     and cl.relname in ('game_athletes','game_pairs','game_votes','game_predictions');
  n := 1; prova := 'RLS attiva sulle 4 tabelle';
  esito := case when c = 4 then 'OK' else 'KO' end; dettaglio := c || ' tabelle su 4'; return next;

  -- 2 · Permessi sulle tabelle
  c := (has_table_privilege('anon', 'public.game_votes', 'SELECT'))::integer
     + (has_table_privilege('anon', 'public.game_predictions', 'SELECT'))::integer
     + (has_table_privilege('authenticated', 'public.game_votes', 'INSERT'))::integer
     + (has_table_privilege('authenticated', 'public.game_predictions', 'INSERT'))::integer
     + (not has_table_privilege('anon', 'public.game_athletes', 'SELECT'))::integer
     + (not has_table_privilege('anon', 'public.game_pairs', 'SELECT'))::integer;
  n := 2; prova := 'Permessi: nessuna scrittura diretta, anonimi senza voti, atleti e coppie pubblici';
  esito := case when c = 0 then 'OK' else 'KO' end; dettaglio := c || ' permessi sbagliati'; return next;

  -- 3 · Il voto "restano" crea la coppia confermata
  n := 3; prova := 'Voto «restano» salva voto e coppia confermata';
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.game_vote(p_id, 'stay');
    raise exception 'FINE_PROVA' using detail =
      (select count(*) from public.game_votes where pair_id = p_id and choice = 'stay') || '|' ||
      (select count(*) from public.game_predictions where kind = 'confermata');
  exception when others then
    get stacked diagnostics v_det = pg_exception_detail, v_msg = message_text;
    esito := case when v_msg = 'FINE_PROVA' and v_det = '1|1' then 'OK' else 'KO' end;
    dettaglio := case when v_msg = 'FINE_PROVA' then 'voti|coppie = ' || v_det else v_msg end;
  end;
  return next;

  -- 4 · Un atleta in una sola coppia
  n := 4; prova := 'Un atleta sta in una sola coppia';
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.game_save_pair(m1, m2);
    perform public.game_save_pair(m1, m3);
    raise exception 'FINE_PROVA' using detail =
      (select count(*) from public.game_predictions) || '|' ||
      (select count(*) from public.game_predictions where node_a = least(m1, m3) and node_b = greatest(m1, m3));
  exception when others then
    get stacked diagnostics v_det = pg_exception_detail, v_msg = message_text;
    esito := case when v_msg = 'FINE_PROVA' and v_det = '1|1' then 'OK' else 'KO' end;
    dettaglio := case when v_msg = 'FINE_PROVA' then 'coppie totali|coppia giusta = ' || v_det else v_msg end;
  end;
  return next;

  -- 5 · Scrittura diretta vietata a un utente loggato
  n := 5; prova := 'Scrittura diretta in game_votes vietata';
  begin
    execute 'set local role authenticated';
    insert into public.game_votes (user_id, pair_id, choice) values (u1, p_id, 'stay');
    raise exception 'SCRITTURA_RIUSCITA';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
    esito := case when v_state = '42501' then 'OK' else 'KO' end; dettaglio := v_msg;
  end;
  return next;

  -- 6 · Un visitatore senza login non può votare
  n := 6; prova := 'Senza login non si vota';
  begin
    perform set_config('request.jwt.claims', '', true);
    execute 'set local role anon';
    perform public.game_vote(p_id, 'stay');
    raise exception 'VOTO_RIUSCITO';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
    esito := case when v_state = '42501' then 'OK' else 'KO' end; dettaglio := v_msg;
  end;
  return next;

  -- 7 · Un utente non vede i pronostici di un altro
  n := 7; prova := 'Ognuno vede solo i propri pronostici';
  if u2 is null then
    esito := 'SALTATA'; dettaglio := 'serve un secondo utente su staging'; return next;
  else
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
      execute 'set local role authenticated';
      perform public.game_save_pair(m1, m2);
      perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
      raise exception 'FINE_PROVA' using detail = (select count(*) from public.game_predictions where node_a = least(m1, m2) and node_b = greatest(m1, m2));
    exception when others then
      get stacked diagnostics v_det = pg_exception_detail, v_msg = message_text;
      esito := case when v_msg = 'FINE_PROVA' and v_det = '0' then 'OK' else 'KO' end;
      dettaglio := case when v_msg = 'FINE_PROVA' then 'righe dell''altro utente visibili = ' || v_det else v_msg end;
    end;
    return next;
  end if;

  -- 8 · Statistiche leggibili senza login
  n := 8; prova := 'Statistiche leggibili senza login';
  begin
    perform set_config('request.jwt.claims', '', true);
    execute 'set local role anon';
    raise exception 'FINE_PROVA' using detail =
      (select count(*) from public.game_vote_stats('M')) || '|' || (select count(*) from public.game_totals('M'));
  exception when others then
    get stacked diagnostics v_det = pg_exception_detail, v_msg = message_text;
    esito := case when v_msg = 'FINE_PROVA' and split_part(v_det, '|', 1)::integer > 0 and split_part(v_det, '|', 2) = '1' then 'OK' else 'KO' end;
    dettaglio := case when v_msg = 'FINE_PROVA' then 'coppie con statistiche|righe totali = ' || v_det else v_msg end;
  end;
  return next;

  -- 9 · Niente coppie miste
  n := 9; prova := 'Niente coppie tra maschile e femminile';
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.game_save_pair(m1, f1);
    raise exception 'COPPIA_MISTA_SALVATA';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    esito := case when v_msg = 'Solo coppie dello stesso genere' then 'OK' else 'KO' end; dettaglio := v_msg;
  end;
  return next;
end $$;

select * from pg_temp.game_verifica() order by n;
