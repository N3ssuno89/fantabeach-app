# FantaBeach 🏐

Fantasy Beach Volley — Circuito FIPAV 2026

## Stack

| Layer | Tecnologia |
|-------|-----------|
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| Hosting | Netlify |
| Repository | GitHub |
| Auth (futuro) | Supabase |
| Database utenti (futuro) | Supabase PostgreSQL |
| Dati sportivi (futuro) | Google Sheets API |

---

## Setup locale

### 1. Clona il repository

```bash
git clone https://github.com/TUO_USERNAME/fantabeach-app.git
cd fantabeach-app
```

### 2. Installa le dipendenze

```bash
npm install
```

### 3. Configura le variabili ambiente

```bash
cp .env.example .env.local
# Apri .env.local e inserisci i valori reali
```

### 4. Avvia in locale

```bash
npm run dev
# → http://localhost:5173
```

### 5. Build di produzione

```bash
npm run build
# Output in: dist/
```

---

## Struttura cartelle

```
fantabeach-app/
├── src/
│   ├── pages/
│   │   └── FantaBeach.jsx      ← App principale (prototipo completo)
│   ├── components/
│   │   ├── ui/                 ← Componenti base riusabili
│   │   │   ├── Logo.jsx
│   │   │   ├── AthleteAvatar.jsx
│   │   │   └── BonusItem.jsx
│   │   ├── market/
│   │   │   └── AthleteProfile.jsx
│   │   ├── calendar/
│   │   │   └── EventDetail.jsx
│   │   ├── squad/              ← (vuoto — pronto per componenti futuri)
│   │   ├── admin/              ← (vuoto — pronto per componenti futuri)
│   │   └── layout/             ← (vuoto — AuthGuard andrà qui)
│   ├── data/                   ← DATI MOCK (da sostituire con API reali)
│   │   ├── mockAthletes.js     → Google Sheets PLAYERS_DB
│   │   ├── mockLeagues.js      → Supabase user_leagues
│   │   ├── mockEvents.js       → Google Sheets EVENTS_DB + MATCHES
│   │   ├── mockStandings.js    → calcolo da Sheets + Supabase
│   │   └── mockCoaches.js      → Google Sheets COACHES_DB
│   ├── services/
│   │   ├── sheetsService.js    ← Wrapper Google Sheets API (STUB)
│   │   └── supabaseService.js  ← Wrapper Supabase (STUB)
│   ├── utils/
│   │   └── scoring.js          ← calcPoints, getCategory, isMarketOpen...
│   ├── config/
│   │   ├── colors.js           ← Design system colori (B.green, B.sand...)
│   │   └── constants.js        ← TABS, CATEGORIES, PRICE_TABLE...
│   ├── hooks/                  ← Custom hooks (vuoto — pronto)
│   ├── App.jsx                 ← Router principale
│   └── main.jsx                ← Entry point React
├── public/
│   └── index.html
├── .env.example                ← Template variabili ambiente
├── .gitignore
├── netlify.toml                ← Config deploy Netlify
├── vite.config.js
└── package.json
```

---

## Deploy su Netlify

### Primo deploy

1. Pusha il codice su GitHub
2. Vai su [netlify.com](https://netlify.com)
3. "Add new site" → "Import an existing project"
4. Seleziona il repository GitHub `fantabeach-app`
5. Netlify rileva automaticamente `netlify.toml` — nessuna configurazione manuale necessaria
6. Clicca "Deploy site"

### Variabili ambiente su Netlify

Site settings → Environment variables → Add variable:

| Nome | Valore |
|------|--------|
| `VITE_SUPABASE_URL` | URL del tuo progetto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key del tuo progetto Supabase |
| `VITE_GOOGLE_SHEETS_ID` | ID del Google Sheet |
| `VITE_APP_URL` | URL del sito su Netlify |

> **Attenzione:** le variabili con prefisso `VITE_` sono visibili nel browser.  
> Le credenziali Google Sheets NON vanno mai messe come `VITE_` — servono Netlify Functions per nasconderle.

---

## Stato attuale — cosa è mock

| Dato | Stato | Dove andrà |
|------|-------|-----------|
| Lista atleti F/M | 🟡 Mock (nomi reali FIPAV, 100+100) | Google Sheets `PLAYERS_DB` |
| Tappe calendario | 🟡 Mock | Google Sheets `EVENTS_DB` |
| Risultati partite | 🟡 Mock | Google Sheets `MATCHES` |
| Classifiche | 🟡 Mock | Calcolo da Sheets |
| Iscrizioni utenti | 🟡 Mock (in localStorage) | Supabase `user_leagues` |
| Roster/formazione | 🟡 Mock (in useState) | Supabase `rosters` + `lineups` |
| Auth login/logout | 🔴 Non implementata | Supabase Auth |
| Prezzi atleti | 🟡 Mock (calcolati da ranking) | Google Sheets `PLAYERS_DB` aggiornato |

---

## Prossimi step

1. [ ] Creare repo GitHub e fare primo push
2. [ ] Collegare repo a Netlify (deploy automatico)
3. [ ] Testare che il prototipo funzioni online
4. [ ] Creare progetto Supabase e configurare tabelle
5. [ ] Abilitare Google Sheets API su Google Cloud Console
6. [ ] Sostituire `sheetsService.js` con chiamate reali
7. [ ] Implementare auth con Supabase

---

## Comandi utili

```bash
npm run dev      # Avvia in locale
npm run build    # Build produzione
npm run preview  # Anteprima build locale
```

---

## Autore

Zio Emanuele — Fantasy Beach Volley FIPAV 2026
