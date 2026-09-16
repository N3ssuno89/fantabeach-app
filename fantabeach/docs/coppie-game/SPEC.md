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
| `01_schema.sql` | tabelle `game_*`, RLS, funzioni, bucket foto (già approvato da Emanuele) |
| `02_seed_2026.sql` | atleti e coppie 2026 dai dati FIVB; si può rilanciare senza toccare voti e foto |
| `03_verifica_staging.sql` | prove di sicurezza e logica, un blocco alla volta |
| `anteprima-riferimento.html` | anteprima funzionante: riferimento per HTML, CSS, animazioni e canvas delle storie |

## 3. Vincoli

- Patch chirurgiche: niente riscritture di `App.jsx`.
- Nessuna modifica a tabelle esistenti. Lo schema approvato è solo quello di `01_schema.sql`; ogni altra modifica va chiesta.
- Il client scrive nel database **solo** tramite le funzioni RPC. Nessun insert, update o delete diretto.
- Le statistiche si leggono dalle funzioni di statistica, mai scaricando tabelle intere (limite righe di PostgREST).
- Nell'anteprima i voti della community sono simulati (`VOTERS`, `pairCount`, `stayPct`): in produzione vanno sostituiti dai dati reali.

## 4. Architettura

1. **Vite multi-page**: `game.html` + `src/game/`, separati dall'app. Nel build servono entrambi gli input, `index.html` e `game.html`.
2. **Netlify**: regola `/game  /game.html  200` prima del fallback dell'app. Controllare che `/game` non apra FantaBeach e che l'app funzioni come prima.
3. **Sessione**: stesso progetto Supabase e stessa sessione dell'app. Prima di scrivere codice, leggere come `App.jsx` crea il client e dove salva il token, e fare esattamente lo stesso: stesso dominio significa che chi è loggato sull'app deve risultare loggato anche su `/game`.
4. **Link** dalla home dell'app a `/game`.

## 5. Dati

Lettura pubblica: `game_athletes` (circa 227 righe) e `game_pairs` (94 righe), entrambe sotto il limite di 1000 righe.
Pronostici: `game_votes` e `game_predictions`; ogni utente legge solo i propri.

| Funzione | Chi | Quando |
|---|---|---|
| `game_vote(pair_id, 'stay' o 'split')` | loggati | risposta a una card |
| `game_unvote(pair_id)` | loggati | «Annulla il no» |
| `game_save_pair(node_1, node_2)` | loggati | conferma di una coppia; toglie da sola le coppie in conflitto |
| `game_remove_pair(node_1, node_2)` | loggati | «Togli» dalla lista |
| `game_sync(votes, pairs)` | loggati | subito dopo il login, per le risposte date da anonimo |
| `game_vote_stats(gender)` | tutti | percentuali resta o si separa |
| `game_pair_stats(gender)` | tutti | voti per coppia: percentuali del carosello e classifica delle nuove coppie |
| `game_totals(gender)` | tutti | numeri in testa alla sezione community |

Regole lato client:
- **Mazzo**: `game_pairs` con `in_deck = true`, ordinato per `deck_order`.
- **Coppia 2026 di un atleta**: la riga di `game_pairs` che lo contiene (al massimo una).
- **Percentuale «restano»**: stay / (stay + split). Sotto i 20 voti mostrare «Ancora pochi voti».
- **Percentuale del compagno X per l'atleta A**: voti della coppia A-X diviso la somma dei voti di tutte le coppie con A. Sotto i 20 voti, «Ancora pochi voti».
- **Community**: mostrare solo coppie con almeno 20 voti.
- **Atleti da sistemare**: atleti di coppie votate «split» che non sono in nessuna coppia dell'utente (le funzioni segnano già come separate le coppie 2026 toccate da una scelta).

## 6. Flusso (una sola pagina, come nell'anteprima)

- Card della coppia 2026: «Si separano» o «Restano», anche con lo swipe.
- **No**: X e strappo, poi scelta del compagno per l'atleta più alto in ranking (carosello e ricerca), conferma, card nuova, «Condividi» o «Continua», poi «E [secondo atleta]?» con «Scegli» o «Decido dopo».
- **Sì**: la card vola nel contatore delle coppie.
- **Effetto a catena**: se l'utente sceglie un atleta la cui coppia 2026 non è ancora uscita, quando arriva quel turno compare solo il compagno rimasto senza coppia.
- **Fine**: le coppie dell'utente, gli atleti da sistemare, la storia con tutte le coppie («Le mie coppie 2027») e la community.
- Maschile e femminile sono due partite separate.
- Il testo «mercato» non deve comparire da nessuna parte.

## 7. Login

- Da anonimo lo stato vive in `localStorage` alla chiave `coppiegame:v1` (voti, coppie, rimandati, per genere).
- **Gate**: alla terza risposta (sì o no) o al tocco su «Condividi» si apre il modale «Entra» / «Registrati», con email e password come nell'app. Chiudere il modale riporta alla card, ma l'azione successiva lo riapre.
- **Registrazione**: `supabase.auth.signUp({ email, password, options: { data: { signup_source: 'coppie_game' } } })`, poi il profilo creato come fa l'app. Lo username è obbligatorio perché compare sulla storia.
- **Dopo il login**: chiamare `game_sync` con i dati locali, rileggere voti e coppie dal database e svuotare il `localStorage`.
- Chi è già loggato sull'app non vede mai il modale.
- **Conferma email**: non deve bloccare l'accesso. Su prod è così dal 26 maggio 2026 (tutte le iscrizioni successive risultano confermate subito); nei due giorni in cui era obbligatoria, 9 iscritti su 22 non sono mai entrati. Non riattivarla e verificare su staging che valga lo stesso.

## 8. Card, foto e sagome

- HTML e CSS della card si prendono dall'anteprima (`.cborder`, `.vX`, `.pair`, `.solo`, `.mini`, `.tl`).
- **Foto**: bucket pubblico `game-players`, file `<node>.png`, nome del file in `game_athletes.photo_path`. Per disegnarle nel canvas usare `img.crossOrigin = 'anonymous'`.
- **Formato richiesto**: PNG senza sfondo, dalla vita in su, testa sempre alla stessa altezza, almeno 1000 px di altezza.
- **Senza foto**: sagoma scura in controluce. Eliminare dall'anteprima tutto ciò che disegna volti (`lookOf`, pelle, capelli, occhiali): in produzione restano solo foto o sagome.

## 9. Condivisione

- Immagine 1080x1920 generata nel canvas come in `renderPairStory` e `renderMarketStory`, con «@username» preso dal profilo e l'indirizzo `fantabeach.netlify.app/game`.
- «Condividi»: `navigator.share({ files })` quando disponibile. Altrimenti l'immagine a schermo con «Tieni premuto per salvarla» e un pulsante di download.
- Sull'immagine resta la frase «Pronostico di @username, non una notizia ufficiale».

## 10. Test su staging (criteri di accettazione)

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

## 11. Rilascio

1. `01_schema.sql` e `02_seed_2026.sql` su prod (valori attesi alla fine del `02`).
2. Merge e deploy, poi link dalla home.
3. Iscritti arrivati dal gioco:

```sql
select count(*) from auth.users where raw_user_meta_data->>'signup_source' = 'coppie_game';
```

## 12. Fuori da questa specifica

- Verifica e punteggio dei pronostici nel 2027: i dati restano salvati con la data.
- Raccolta e scontorno delle foto.
- Notifiche.

## 13. Decisioni aperte: chiederle a Emanuele, non deciderle

- Nome definitivo e indirizzo.
- Dominio da mostrare sulla storia, se ne esiste uno personalizzato.
