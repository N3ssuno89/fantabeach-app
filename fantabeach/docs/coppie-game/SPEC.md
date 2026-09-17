# Coppie Game 2027 · Specifica per Claude Code

Gioco off-season su FantaBeach: gli utenti pronosticano le coppie 2027 partendo dalle coppie 2026. Nessun premio.
Obiettivo di business: portare nuovi iscritti a FantaBeach prima della stagione 2027.

## 1. Decisioni già prese

- **Nome di lavoro**: Coppie Game, in un'unica costante `GAME_NAME`. **Indirizzo**: `/game`.
- **Pagina separata dall'app**: l'unica modifica ad `App.jsx` è un link verso `/game` dalla home.
- **Grafica e animazioni**: quelle di `anteprima-riferimento.html` (card FantaBeach verde con il 2027, figure grandi, bordo colorato che gira, strappo a zig-zag sul no, card che si fondono alla conferma).
- **Login**: le prime 3 risposte senza account; login obbligatorio alla terza risposta o al primo tocco su «Condividi», quello che arriva prima.
- **Figure**: foto vera se c'è, altrimenti sagoma. I volti disegnati dell'anteprima non vanno in produzione.
- **Ordine di lavoro**: staging, test, poi prod.

## 2. File del pacchetto

| File | Contenuto |
|---|---|
| `01_schema.sql` | tabelle `game_*`, RLS, funzioni, bucket foto (già approvato e già lanciato su staging, 9 prove su 9 OK) |
| `02_seed_2026.sql` | atleti e coppie 2026 dai dati FIVB; si può rilanciare senza toccare voti e foto |
| `03_verifica_staging.sql` | prove di sicurezza e logica, un blocco alla volta |
| `anteprima-riferimento.html` | anteprima funzionante: riferimento per HTML, CSS, animazioni e canvas delle storie |

## 3. Vincoli

- Patch chirurgiche: niente riscritture di `App.jsx`.
- Nessuna modifica a tabelle esistenti. Lo schema approvato è solo quello di `01_schema.sql`; ogni altra modifica va chiesta.
- Il client scrive nel database **solo** tramite le funzioni RPC. Nessun insert, update o delete diretto.
- Le statistiche si leggono dalle funzioni di statistica, mai scaricando tabelle intere (limite righe di PostgREST).
- Nell'anteprima i voti della community sono simulati (`VOTERS`, `pairCount`, `stayPct`): in produzione vanno sostituiti dai dati reali.

## 4. Passo 0: prima di scrivere codice

Repository `N3ssuno89/fantabeach-app`, branch `staging`. L'app sta nella cartella `fantabeach/` (base di Netlify); questa specifica è in `fantabeach/docs/coppie-game/`.

**Database già pronto**: su staging (progetto Supabase `buaiuvmsdtdqlogesonl`) `01_schema.sql` e `02_seed_2026.sql` sono già stati eseguiti e le 9 prove di `03_verifica_staging.sql` sono tutte OK. Non eseguire SQL e non collegarti a Supabase da Claude Code: se vedi un progetto in pausa, non è quello di staging.

1. **Allineare `staging` a `main`**. Oggi `staging` è indietro: su `main` ci sono correzioni che mancano, per esempio `fivb-results.js` che legge `player_node_map` con `limit=100000` e `fivb-tournaments` ogni ora in `netlify.toml`. Fare il merge di `main` in `staging`; nei conflitti sulle funzioni FIVB e su `netlify.toml` tenere la versione di `main`.
2. **Funzioni di prova senza protezione**, presenti solo su `staging`: `fivb-probe.js` (inoltra qualsiasi richiesta all'API FIVB con il token di Emanuele), `fivb-bridge.js` (con `?write=1` scrive in `player_node_map`), `fivb-score.js` (scrive in `fivb_player_scores`), `fivb-test.js`. Non devono arrivare su `main`. Chiedere a Emanuele se cancellarle o proteggerle: non decidere da solo.

## 5. Architettura

Percorsi reali nel repository:
1. **Pagina separata**: `fantabeach/game.html` e il codice in `fantabeach/src/game/`, separati dall'app.
2. **Vite**: in `fantabeach/vite.config.js` aggiungere `build.rollupOptions.input` con `index.html` e `game.html`.
3. **Netlify**: in `fantabeach/netlify.toml` aggiungere, **prima** della regola esistente `/*` → `/index.html`, la regola `from = "/game"`, `to = "/game.html"`, `status = 200`. Controllare che `/game` non apra l'app e che l'app funzioni come prima.
4. **Sessione**: `App.jsx` non usa supabase-js. Usa un client REST fatto a mano con le variabili `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` e salva il login in `localStorage` alle chiavi `fb_access_token` e `fb_refresh_token` (intorno alla riga 108). Il gioco deve usare le stesse chiavi e la stessa logica di rinnovo del token: chi è loggato sull'app deve risultare loggato su `/game`, e viceversa. Estrarre la logica in un modulo condiviso è possibile solo senza cambiare il comportamento di `App.jsx`.
5. **Chiamate alle funzioni**: `POST {VITE_SUPABASE_URL}/rest/v1/rpc/<nome_funzione>` con gli header `apikey` (chiave anon) e `Authorization: Bearer <fb_access_token>`; per chi non è loggato, `Bearer <chiave anon>`.
6. **Link** dalla home dell'app a `/game`.

## 6. Dati

Lettura pubblica: `game_athletes` (circa 227 righe) e `game_pairs` (94 righe), entrambe sotto il limite di 1000 righe.
Pronostici: `game_votes` e `game_predictions`; ogni utente legge solo i propri.

I nomi degli argomenti sono quelli reali delle funzioni SQL. PostgREST usa quelli:
nel corpo della chiamata vanno scritti con il prefisso `p_`, non con il nome della colonna.

| Funzione (nomi reali degli argomenti) | Chi | Quando |
|---|---|---|
| `game_vote(p_pair_id, p_choice)` — `'stay'` o `'split'` | loggati | risposta a una card. Con `'stay'` chiama da sola `game_save_pair` |
| `game_unvote(p_pair_id)` | loggati | «Annulla il no» |
| `game_save_pair(p_node_1, p_node_2)` | loggati | conferma di una coppia; toglie da sola le coppie in conflitto |
| `game_remove_pair(p_node_1, p_node_2)` | loggati | «Togli» dalla lista |
| `game_sync(p_votes, p_pairs)` | loggati | subito dopo il login, per le risposte date da anonimo |
| `game_vote_stats(p_gender)` | tutti | percentuali resta o si separa |
| `game_pair_stats(p_gender)` | tutti | voti per coppia: percentuali del carosello e classifica delle nuove coppie |
| `game_totals(p_gender)` | tutti | numeri in testa alla sezione community |

Corpo di `game_sync`: `p_votes` è `[{"pair_id":"p15154-15163","choice":"split"}]`,
`p_pairs` è `[{"node_1":15154,"node_2":14287}]`. Massimo 200 elementi per lista.

Regole lato client:
- **Mazzo**: `game_pairs` con `in_deck = true`, ordinato per `deck_order`.
- **Coppia 2026 di un atleta**: la riga di `game_pairs` che lo contiene (al massimo una).
- **Percentuale «restano»**: stay / (stay + split). Sotto soglia mostrare «Ancora pochi voti».
- **Soglia**: 20 voti in produzione, 1 voto su staging. La decide il nome del sito: se l'indirizzo contiene `staging` la soglia è 1.
- Una coppia con zero voti vale **0%**, non 1%.
- **Percentuale del compagno X per l'atleta A**: voti della coppia A-X diviso la somma dei voti di tutte le coppie con A. Sotto soglia, sopra il carosello, la riga «Ancora pochi voti: le percentuali compaiono con i primi N pronostici».
- **Community**: mostrare solo coppie sopra soglia. Se non ce n'è nessuna, scrivere «Nessuna coppia ha ancora abbastanza voti» invece di lasciare la lista vuota.
- **Atleti da sistemare**: atleti di coppie votate «split» che non sono in nessuna coppia dell'utente (le funzioni segnano già come separate le coppie 2026 toccate da una scelta).

## 7. Flusso (una sola pagina, come nell'anteprima)

- Card della coppia 2026: «Si separano» o «Restano», anche con lo swipe.
- **No**: X e strappo, poi scelta del compagno per l'atleta più alto in ranking (carosello e ricerca), conferma, card nuova, «Condividi» o «Continua», poi «E [secondo atleta]?» con «Scegli» o «Decido dopo».
- **Sì**: la card vola nel contatore delle coppie.
- **Effetto a catena**: se l'utente sceglie un atleta la cui coppia 2026 non è ancora uscita, quando arriva quel turno compare solo il compagno rimasto senza coppia.
- **Fine**: le coppie dell'utente, gli atleti da sistemare, la storia con tutte le coppie («Le mie coppie 2027») e la community.
- Maschile e femminile sono due partite separate.
- Il testo «mercato» non deve comparire da nessuna parte.

## 8. Login

- Da anonimo lo stato vive in `localStorage` alla chiave `coppiegame:v1` (voti, coppie, rimandati, per genere).
- **Gate**: alla terza risposta (sì o no) o al tocco su «Condividi» si apre il modale «Entra» / «Registrati», con email e password come nell'app. Chiudere il modale riporta alla card, ma l'azione successiva lo riapre.
- **Registrazione**: la stessa chiamata `auth/v1/signup` che usa `App.jsx`, aggiungendo nel corpo `"data": { "signup_source": "coppie_game" }`, poi il profilo creato come fa l'app. Lo username è obbligatorio perché compare sulla storia.
- **Dopo il login**: chiamare `game_sync` con i dati locali, rileggere voti e coppie dal database e svuotare il `localStorage`.
- Chi è già loggato sull'app non vede mai il modale.
- **Conferma email**: non deve bloccare l'accesso. Su prod è così dal 26 maggio 2026 (tutte le iscrizioni successive risultano confermate subito); nei due giorni in cui era obbligatoria, 9 iscritti su 22 non sono mai entrati. Non riattivarla e verificare su staging che valga lo stesso.

## 9. Card, foto e sagome

- HTML e CSS della card si prendono dall'anteprima (`.cborder`, `.vX`, `.pair`, `.solo`, `.mini`, `.tl`).
- **Foto**: bucket pubblico `game-players`, file `<node>.png`, nome del file in `game_athletes.photo_path`. Per disegnarle nel canvas usare `img.crossOrigin = 'anonymous'`.
- **Formato richiesto**: PNG senza sfondo, dalla vita in su, testa sempre alla stessa altezza, almeno 1000 px di altezza.
- **Senza foto**: sagoma scura in controluce. Eliminare dall'anteprima tutto ciò che disegna volti (`lookOf`, pelle, capelli, occhiali): in produzione restano solo foto o sagome.

## 10. Condivisione

- Immagine 1080x1920 generata nel canvas come in `renderPairStory` e `renderMarketStory`, con «@username» preso dal profilo e l'indirizzo `fantabeach.netlify.app/game`.
- «Condividi»: `navigator.share({ files })` quando disponibile. Altrimenti l'immagine a schermo con «Tieni premuto per salvarla» e un pulsante di download.
- Sull'immagine resta la frase «Pronostico di @username, non una notizia ufficiale».

## 11. Test su staging (criteri di accettazione)

1. `01`, `02` e i blocchi di `03` su staging con gli esiti attesi scritti nel file.
2. `/game` si apre e l'app FantaBeach funziona come prima.
3. Da anonimo: dopo 3 risposte si apre il modale; «Condividi» lo apre subito.
4. Registrazione nuova da `/game` **senza confermare l'email**: si continua a giocare subito, `signup_source` è salvato e le 3 risposte da anonimo compaiono nel database dopo il login.
5. Utente già loggato sull'app: nessun modale.
6. Un atleta in una sola coppia, verificato dall'interfaccia: una seconda coppia con lo stesso atleta toglie la prima.
7. Con meno di 20 voti compare «Ancora pochi voti» al posto delle percentuali.
8. iPhone e Android veri, link aperto **dentro Instagram**: login, gioco completo, condivisione o salvataggio dell'immagine.
9. Con «riduci movimento» attivo il flusso funziona senza animazioni.
10. Nessun errore in console.

## 12. Rilascio

1. Controllare che nel merge verso `main` non ci siano le funzioni di prova del passo 0.
2. `01_schema.sql` e `02_seed_2026.sql` su prod (valori attesi alla fine del `02`).
3. Merge e deploy, poi link dalla home.
4. Iscritti arrivati dal gioco:

```sql
select count(*) from auth.users where raw_user_meta_data->>'signup_source' = 'coppie_game';
```

## 13. Fuori da questa specifica

- Verifica e punteggio dei pronostici nel 2027: i dati restano salvati con la data.
- Raccolta e scontorno delle foto.
- Notifiche.

## 14. Decisioni aperte: chiederle a Emanuele, non deciderle

- Nome definitivo e indirizzo.
- Dominio da mostrare sulla storia, se ne esiste uno personalizzato.
