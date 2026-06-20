import React, { useState, useMemo, useEffect } from "react";

// ─── SUPABASE CLIENT ───────────────────────────────────────────
// Le chiavi vengono iniettate da Netlify come variabili ambiente
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || process.env.NEXT_PUBLIC_SUPABASE_URL  || "";import React, { useState, useMemo, useEffect } from "react";

// ─── SUPABASE CLIENT ───────────────────────────────────────────
// Le chiavi vengono iniettate da Netlify come variabili ambiente
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || process.env.NEXT_PUBLIC_SUPABASE_URL  || "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Client Supabase minimale (senza SDK, puro fetch)
const supabase = {
  _headers: {
    "apikey": SUPABASE_ANON,
    "Authorization": `Bearer ${SUPABASE_ANON}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  },
  async signUp(email, password, username) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method:"POST", headers: this._headers,
      body: JSON.stringify({ email, password, data: { username } })
    });
    const json = await r.json();
    if (!r.ok && !json.error) json.error = { message: json.msg || "Errore", status: r.status };
    if (json.error) json.error.status = r.status;
    return json;
  },
  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method:"POST", headers: this._headers,
      body: JSON.stringify({ email, password })
    });
    const json = await r.json();
    if (!r.ok && !json.error) json.error = { message: "Email o password errati.", status: r.status };
    if (json.error) json.error.status = r.status;
    return json;
  },
  async signOut(accessToken) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method:"POST",
      headers: { ...this._headers, "Authorization": `Bearer ${accessToken}` }
    });
  },
  async updatePassword(accessToken, newPassword) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method:"PUT",
      headers: { ...this._headers, "Authorization": `Bearer ${accessToken}` },
      body: JSON.stringify({ password: newPassword })
    });
    const json = await r.json();
    if (!r.ok) json.error = json.error || { message: json.msg || "Errore aggiornamento password" };
    return json;
  },
  async refreshToken(refreshToken) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method:"POST", headers: this._headers,
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    return r.json();
  },
  async getUser(accessToken) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { ...this._headers, "Authorization": `Bearer ${accessToken}` }
    });
    if (r.status === 403 || r.status === 401) return null;
    return r.json();
  },
  _auth(accessToken) {
    return { ...this._headers, "Authorization": `Bearer ${accessToken}` };
  },
  async from(table, accessToken) {
    const headers = accessToken ? this._auth(accessToken) : this._headers;
    return {
      select: async (query="*", filters="") => {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${query}${filters}`, { headers });
        return r.json();
      },
      insert: async (data) => {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
          method:"POST", headers, body: JSON.stringify(data)
        });
        return r.json();
      },
      upsert: async (data, onConflict) => {
        const url = `${SUPABASE_URL}/rest/v1/${table}${onConflict?`?on_conflict=${onConflict}`:""}`;
        const r = await fetch(url, {
          method:"POST",
          headers: { ...headers, "Prefer": "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify(data)
        });
        return r.json();
      },
      update: async (data, filters="") => {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}`, {
          method:"PATCH", headers, body: JSON.stringify(data)
        });
        return r.json();
      },
      delete: async (filters="") => {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}`, {
          method:"DELETE", headers
        });
        return r.ok;
      },
    };
  },
};

// Persistenza token in localStorage
const TOKEN_KEY   = "fb_access_token";
const REFRESH_KEY = "fb_refresh_token";
const saveToken    = (t, r) => { try { localStorage.setItem(TOKEN_KEY, t); if(r) localStorage.setItem(REFRESH_KEY, r); } catch(_){} };
const loadToken    = ()     => { try { return localStorage.getItem(TOKEN_KEY); } catch(_){ return null; } };
const loadRefresh  = ()     => { try { return localStorage.getItem(REFRESH_KEY); } catch(_){ return null; } };
const clearToken   = ()     => { try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(REFRESH_KEY); } catch(_){} };
// ──────────────────────────────────────────────────────────────

const B = {
  sand:"#F5EFE3", sandDark:"#EDE4D0", sandDeep:"#D8CEBC",
  green:"#3D7A69", greenDark:"#2D5C4F", greenLight:"#4E9A86", greenPale:"#EAF3EF",
  orange:"#E8541A", orangeLight:"#F07040", orangePale:"#FDF0EB",
  yellow:"#F5A623", yellowPale:"#FEF7E8",
  red:"#D94F1E", cream:"#F7F3EC", creamDark:"#EDE7DC",
  white:"#FFFFFF", dark:"#1A2E28", gray:"#6B7B74",
  grayLight:"#C8D4CF", grayPale:"#F0F4F2",
};

const PRICE_TABLE = [
  160,156,152,148,144,140,136,132,128,124,
  120,117,114,111,108,105,102,99,96,93,
  90,88,86,84,82,80,78,76,74,72,
  70,68,66,64,62,60,58,56,54,52,
  50,48,46,44,42,40,38,36,34,32,
  31,30,29,28,27,26,25,24,23,22,
];
const getPrice = (r) => r >= 1 && r <= 60 ? PRICE_TABLE[r - 1] : 20;

const CATEGORIES = [
  { label:"Top Player", bg:B.yellow,    text:"#7A4F00", range:[1,5]   },
  { label:"Elite",      bg:"#C084FC",   text:"#4C1D95", range:[6,15]  },
  { label:"Solid Pick", bg:B.greenPale, text:B.greenDark,range:[16,30]},
  { label:"Value Pick", bg:B.orangePale,text:B.orange,  range:[31,50] },
  { label:"Outsider",   bg:B.creamDark, text:B.gray,    range:[51,60] },
  { label:"Wild Card",  bg:B.grayPale,  text:B.gray,    range:[61,999]},
];
const getCategory = (r) => CATEGORIES.find(c => r>=c.range[0] && r<=c.range[1]) || CATEGORIES[5];

// Athlete photos (base64) — rimosse, tutti usano il fallback (ranking/iniziali)
const ATHLETE_PHOTOS = {};

const COACHES = [
  { id:"C001", name:"Ettore Marcovecchio", athletes:["W0001","W0002"], cost:5 },
  { id:"C002", name:"Alessandro Martino",  athletes:["W0003","W0004"], cost:5 },
  { id:"C003", name:"Marco Solustri",      athletes:["W0005","W0006"], cost:5 },
  { id:"C004", name:"Andrea Lupo",         athletes:["M0001","M0002"], cost:5 },
  { id:"C005", name:"Roberto Damiani",     athletes:["M0003","M0004"], cost:5 },
];

// ─── DATI ATLETI — caricati da API (fallback mock) ────────────
// Aggiunge i campi necessari all'app (normalizza player_name→name, ecc.)
const enrichAthlete = (a) => {
  const ranking  = parseInt(a.ranking)  || 1;
  const cost     = parseInt(a.cost)     || getPrice(ranking);
  const prevCost = parseInt(a.cost_prev) || parseInt(a.prevCost) || cost;
  const rankPrev = parseInt(a.ranking_prev) || ranking;
  return {
    ...a,
    id:          a.id       || a.player_id  || "",
    name:        a.name     || a.player_name || "—",
    ranking,
    cost,
    prevCost,
    rankingPrev: rankPrev,
    rankDelta:   rankPrev !== ranking ? rankPrev - ranking : null, // positivo = salito
    costHistory: prevCost !== cost ? [prevCost, cost] : [cost],
    results:     a.results || [],
  };
};

// Fallback minimale — solo se tutto fallisce
let WOMEN = [];
let MEN   = [];

const ATHLETES_CACHE_KEY = "fb_athletes_cache";

// Salva atleti in sessionStorage
const cacheAthletes = (women, men) => {
  try {
    sessionStorage.setItem(ATHLETES_CACHE_KEY, JSON.stringify({
      women, men, cachedAt: new Date().toISOString()
    }));
  } catch(e) {}
};

// Carica atleti da sessionStorage se presenti
const loadCachedAthletes = () => {
  try {
    const raw = sessionStorage.getItem(ATHLETES_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.women?.length > 0 && data.men?.length > 0) return data;
  } catch(e) {}
  return null;
};

// Carica atleti reali dall'API sync (ordine ranking reale)
async function loadAthletesFromAPI() {
  // Prima controlla la cache sessionStorage
  const cached = loadCachedAthletes();
  if (cached) {
    WOMEN = cached.women.map(enrichAthlete);
    MEN   = cached.men.map(enrichAthlete);
    return true;
  }
  // Altrimenti chiama la function sync
  try {
    const res = await fetch("/.netlify/functions/sync");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (data.women?.length > 0) {
      WOMEN = data.women.map(enrichAthlete);
    }
    if (data.men?.length > 0) {
      MEN = data.men.map(enrichAthlete);
    }
    // Salva in cache
    cacheAthletes(data.women || [], data.men || []);
    return true;
  } catch(e) {
    console.warn("Sync API non disponibile, uso fallback:", e.message);
    return false;
  }
}

// MOCK_MATCHES rimosso — dati reali da Supabase match_results


const LEAGUES_INIT = [
  { id:"L001-F", name:"Classic F", type:"classic", gender:"F", status:"OPEN",   marketOpen:false },
  { id:"L001-M", name:"Classic M", type:"classic", gender:"M", status:"OPEN",   marketOpen:false },
  { id:"L002-F", name:"Market F",  type:"market",  gender:"F", status:"OPEN",   marketOpen:false },
  { id:"L002-M", name:"Market M",  type:"market",  gender:"M", status:"OPEN",   marketOpen:false },
];

const EVENT_TYPE_META = {
  Silver:      { label:"Silver",       weight:1.0, color:"#3D7A69", bg:"#EAF3EF" },
  Gold:        { label:"Gold",         weight:1.3, color:"#B8860B", bg:"#FEF7E8" },
  CoppaItalia: { label:"Coppa Italia", weight:1.5, color:"#D94F1E", bg:"#FDF0EB" },
  Finale:      { label:"Finale",       weight:1.7, color:"#7C3AED", bg:"#F3E8FF" },
};
// EVENTS caricato da Supabase (tabella events) — non più hardcoded
// Fallback vuoto: viene popolato da loadEventsFromDB() al login
const EVENTS_FALLBACK = []; // usato solo se Supabase non risponde


// STANDINGS e COMBO rimossi — classifica reale caricata da Supabase

const PRIZES=[
  {threshold:10,pos:"3°",name:"Borsone Under Armour",         icon:"🎒"},
  {threshold:18,pos:"2°",name:"Canotta/Top firmata Nazionale", icon:"👕"},
  {threshold:25,pos:"1°",name:"AirPods 4",                    icon:"🎧"},
];

const PRICE_RANGES = [
  {label:"Tutti",          filter:()=>true,                    bg:B.grayPale,    color:B.gray,     activeBg:B.greenDark,  activeColor:B.white},
  {label:"< 50 $",         filter:a=>a.cost<50,                bg:"#FFF7ED",     color:"#92400E",  activeBg:"#92400E",    activeColor:B.white},
  {label:"50 $ - 99 $",    filter:a=>a.cost>=50&&a.cost<100,   bg:B.greenPale,   color:B.greenDark,activeBg:B.greenDark,  activeColor:B.white},
  {label:"> 100 $",        filter:a=>a.cost>=100,              bg:B.yellowPale,  color:"#7A4F00",  activeBg:"#7A4F00",    activeColor:B.white},
];

// ─── LOGO FANTABEACH (SVG vettoriale, sfondo trasparente) ────
const LogoIcon = ({size=48}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:"block",flexShrink:0}}>
    <defs>
      <clipPath id="fb-clip"><circle cx="50" cy="50" r="46"/></clipPath>
    </defs>
    {/* Verde scuro — riempie il fondo */}
    <circle cx="50" cy="50" r="46" fill="#2A5C4E"/>
    {/* Giallo-arancio — grande arco in alto a sinistra, come sole che sorge */}
    <path d="M 4 50 C 4 22 22 4 50 4 C 62 4 72 8 80 16 C 68 18 56 26 50 36 C 44 44 38 52 20 56 C 12 58 6 54 4 50 Z" fill="#F5A623" clipPath="url(#fb-clip)"/>
    {/* Arancione — onda larga diagonale al centro */}
    <path d="M 4 50 C 6 54 12 58 20 56 C 38 52 44 44 50 36 C 56 26 68 18 80 16 C 88 22 94 34 96 46 C 80 42 68 50 58 60 C 48 68 36 72 16 68 C 8 66 4 60 4 56 Z" fill="#E8541A" clipPath="url(#fb-clip)"/>
    {/* Rosso-arancio scuro — striscia sottile */}
    <path d="M 4 56 C 4 60 8 66 16 68 C 36 72 48 68 58 60 C 68 50 80 42 96 46 C 96 52 94 58 90 64 C 76 58 64 64 54 72 C 44 80 30 82 12 76 C 6 74 4 66 4 62 Z" fill="#C0392B" clipPath="url(#fb-clip)"/>
    {/* Verde scuro — grande onda concava in basso */}
    <path d="M 4 62 C 4 66 6 74 12 76 C 30 82 44 80 54 72 C 64 64 76 58 90 64 C 86 76 76 88 62 94 C 50 98 36 96 24 90 C 10 82 4 74 4 68 Z" fill="#2A5C4E" clipPath="url(#fb-clip)"/>
  </svg>
);

// Logo completo: icona + "FantaBeach" sulla stessa riga
const LogoFull = ({height=48}) => (
  <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
    <LogoIcon size={Math.round(height*1.1)}/>
    <span style={{fontFamily:"Georgia,'Times New Roman',serif",fontWeight:"bold",fontSize:Math.round(height*0.58),color:"#2D5C4F",letterSpacing:"-0.5px",whiteSpace:"nowrap",lineHeight:1}}>
      Fanta<span style={{color:"#E8541A"}}>Beach</span>
    </span>
  </div>
);

const LogoBall = ({size=48}) => <LogoIcon size={size}/>;
// ─────────────────────────────────────────────────────────────

// Athlete photo avatar
const AthleteAvatar = ({athlete, size=70, isStarter, isCaptain}) => {
  const photo = ATHLETE_PHOTOS[athlete.id];
  const cat = getCategory(athlete.ranking);
  const borderColor = isCaptain ? B.yellow : isStarter ? B.green : B.grayLight;
  const borderStyle = isStarter ? "2px solid" : "2px dashed";
  return (
    <div style={{width:size, height:size, borderRadius:"50%", overflow:"hidden", flexShrink:0,
      border:`${borderStyle} ${borderColor}`, position:"relative",
      background: photo ? "#000" : isStarter ? (isCaptain ? B.yellow : B.green) : B.grayPale,
      display:"flex", alignItems:"center", justifyContent:"center"}}>
      {photo ? (
        <img src={photo} alt={athlete.name} style={{width:"100%", height:"100%", objectFit:"cover", objectPosition:"top"}}/>
      ) : (
        <span style={{fontSize:size*0.13, color:isStarter?B.white:B.gray, fontWeight:"bold",
          textAlign:"center", padding:"0 4px", lineHeight:1.2}}>
          {athlete.name.split(" ")[0].substring(0,7)}
        </span>
      )}
      {isCaptain && (
        <div style={{position:"absolute", top:-4, right:-4, width:20, height:20,
          background:B.orange, borderRadius:"50%", display:"flex",
          alignItems:"center", justifyContent:"center", fontSize:11, color:B.white, fontWeight:"bold"}}>★</div>
      )}
    </div>
  );
};

const TABS = [
  { id:0, emoji:"🏪", label:"Mercato"    },
  { id:1, emoji:"👕", label:"Squadra"    },
  { id:2, emoji:"🏆", label:"Classifica" },
  { id:3, emoji:"📅", label:"Calendario" },
  { id:4, emoji:"⚙️", label:"Admin"      },
];
const INIT_JOIN = {"L001-F":null,"L001-M":null,"L002-F":null,"L002-M":null};

// ─── JOIN GATE (componente esterno per evitare re-render su keystroke) ──
function JoinGate({ myJoin, league, showJoinForm, setShowJoinForm, joinTeamName, setJoinTeamName, onJoinRequest }) {
  return (
    <div style={{textAlign:"center",padding:"30px 16px"}}>
      <LogoIcon size={70}/>
      <div style={{marginTop:14,fontWeight:"bold",fontSize:18,color:B.greenDark}}>
        {myJoin==="PENDING"?"Richiesta in attesa":`Iscriviti alla ${league.name}`}
      </div>
      {myJoin==="PENDING"?(
        <div>
          <div style={{marginTop:8,fontSize:13,color:B.gray,lineHeight:1.6}}>La tua richiesta è stata inviata.<br/>L'admin la approverà a breve.</div>
          <div style={{marginTop:16,background:B.yellowPale,border:`1px solid ${B.yellow}`,borderRadius:12,padding:"12px 16px",display:"inline-block"}}>
            <span style={{fontSize:13,color:"#7A4F00",fontWeight:"bold"}}>⏳ In attesa di approvazione</span>
          </div>
        </div>
      ):showJoinForm?(
        <div style={{marginTop:16,textAlign:"left"}}>
          <div style={{fontSize:13,color:B.gray,marginBottom:12}}>Nome squadra per <b>{league.name}</b>:</div>
          <input
            placeholder="Es. Beach Warriors..."
            value={joinTeamName}
            onChange={e=>setJoinTeamName(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&onJoinRequest()}
            autoFocus
            style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${B.grayLight}`,background:B.white,color:B.dark,fontSize:14,fontFamily:"Georgia,serif",outline:"none",boxSizing:"border-box",marginBottom:10}}/>
          <div style={{fontSize:11,color:B.gray,marginBottom:14}}>{league.type==="classic"?"⚠️ Classic: puoi modificare finché l'admin non chiude le iscrizioni.":"ℹ️ Market: compravendite lun 09:00 - gio 23:00. Mercato libero durante la settimana."}</div>
          <button onClick={onJoinRequest} style={{width:"100%",padding:"12px",background:B.greenDark,border:"none",borderRadius:10,color:B.white,fontWeight:"bold",fontSize:14,cursor:"pointer",fontFamily:"Georgia,serif",marginBottom:8}}>Invia Richiesta</button>
          <button onClick={()=>setShowJoinForm(false)} style={{width:"100%",padding:"10px",background:"transparent",border:`1px solid ${B.grayLight}`,borderRadius:10,color:B.gray,fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>Annulla</button>
        </div>
      ):(
        <div>
          <div style={{marginTop:8,fontSize:13,color:B.gray,lineHeight:1.6}}>Non sei ancora iscritto.<br/>Invia una richiesta all'admin.</div>
          <button onClick={()=>setShowJoinForm(true)} style={{marginTop:20,padding:"12px 32px",background:B.greenDark,border:"none",borderRadius:12,color:B.white,fontWeight:"bold",fontSize:14,cursor:"pointer",fontFamily:"Georgia,serif"}}>Richiedi Iscrizione</button>
        </div>
      )}
    </div>
  );
}

// ─── SCHERMATA LOGIN / REGISTRAZIONE ──────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode]       = useState("login"); // "login" | "signup" | "forgot"
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [resetSent, setResetSent] = useState(false);

  const handleForgotPassword = async () => {
    if (!email.trim()) { setError("Inserisci la tua email per il reset."); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: "POST",
        headers: { "apikey": SUPABASE_ANON, "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });
      // Supabase risponde sempre 200 anche se l'email non esiste (sicurezza)
      setResetSent(true);
    } catch(e) { setError("Errore di rete. Riprova."); }
    setLoading(false);
  };

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    try {
      let data;
      if (mode === "signup") {
        if (!username.trim()) { setError("Inserisci uno username"); setLoading(false); return; }
        if (username.trim().length < 3) { setError("Username troppo corto (min 3 caratteri)"); setLoading(false); return; }
        if (password.length < 6) { setError("Password troppo corta (min 6 caratteri)"); setLoading(false); return; }
        // Verifica preventiva username duplicato
        try {
          const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(username.trim())}&select=id`, {
            headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${SUPABASE_ANON}` }
          });
          const existing = await r.json();
          if (Array.isArray(existing) && existing.length > 0) {
            setError("Username già in uso. Scegline un altro.");
            setLoading(false); return;
          }
        } catch(e) { /* silenzioso, continua */ }
        data = await supabase.signUp(email, password, username);
        if (data.error) {
          const msg = data.error.message || "";
          const code = data.error.code || data.error.status || "";
          console.log("Signup error:", JSON.stringify(data.error));
          if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("email") || code === "user_already_exists" || data.status === 422 || code === 422)
            setError("Email già registrata. Prova ad accedere.");
          else if (msg.includes("username") || msg.includes("profiles_username_unique") || msg.includes("duplicate") || data.status === 500 || code === 500)
            setError("Username già in uso. Scegline un altro.");
          else if (msg.includes("password") || msg.includes("weak"))
            setError("Password troppo debole. Usa almeno 6 caratteri.");
          else
            setError(`Errore: ${msg || "Riprova."}`);
          setLoading(false); return;
        }
        // Supabase restituisce identities=[] se l'email è già registrata (senza errore esplicito)
        if (data.user?.identities?.length === 0) {
          setError("Email già registrata. Prova ad accedere.");
          setLoading(false); return;
        }
        // Signup riuscito
        // Se Supabase ha conferma email DISABILITATA → access_token diretto → login immediato
        // Se Supabase ha conferma email ATTIVA → nessun token → mostra messaggio controlla email
        if (data.access_token) {
          saveToken(data.access_token, data.refresh_token);
          onAuth(data.access_token, data.refresh_token, data.user);
          return;
        }
        setError("✅ Registrazione completata! Controlla la tua email (anche spam) e clicca il link di conferma per accedere.");
        setLoading(false);
        return;
      } else {
        data = await supabase.signIn(email, password);
      }
      if (data.error) {
        const msg = (data.error.message || data.error.error_description || data.error.msg || "").toLowerCase();
        console.log("Login error:", JSON.stringify(data.error));
        if (msg.includes("email not confirmed") || msg.includes("not confirmed") || msg.includes("confirmation"))
          setError("📧 Controlla la tua email! Clicca il link di conferma per attivare l'account. Se non la trovi, controlla anche la cartella spam.");
        else if (msg.includes("invalid") || msg.includes("credentials") || msg.includes("wrong") || msg.includes("password") || msg.includes("email"))
          setError("Email o password errati.");
        else if (msg.includes("not found") || msg.includes("no user"))
          setError("Nessun account trovato con questa email.");
        else if (data.error)
          setError("Email o password errati.");
        setLoading(false); return;
      }
      if (data.access_token) {
        saveToken(data.access_token, data.refresh_token);
        onAuth(data.access_token, data.refresh_token, data.user);
      }
    } catch(e) { setError("Errore di rete. Riprova."); }
    setLoading(false);
  };

  const inp = {
    width:"100%", padding:"11px 14px", borderRadius:10,
    border:`1px solid ${B.grayLight}`, background:B.white, color:B.dark,
    fontSize:14, fontFamily:"Georgia,serif", outline:"none",
    boxSizing:"border-box", marginBottom:10,
  };

  return (
    <div style={{fontFamily:"Georgia,serif",minHeight:"100vh",background:B.sand,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:B.white,borderRadius:20,padding:"32px 28px",maxWidth:420,width:"100%",boxShadow:"0 4px 24px rgba(0,0,0,.08)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
            <LogoFull height={76}/>
          </div>
        </div>

        {mode !== "forgot" && (
          <div style={{display:"flex",gap:8,marginBottom:20}}>
            {["login","signup"].map(m=>(
              <button key={m} onClick={()=>{setMode(m);setError("");setResetSent(false);}}
                style={{flex:1,padding:"9px",borderRadius:10,border:`1px solid ${mode===m?B.green:B.grayLight}`,
                  background:mode===m?B.greenPale:"transparent",color:mode===m?B.greenDark:B.gray,
                  fontWeight:mode===m?"bold":"normal",fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>
                {m==="login"?"Accedi":"Registrati"}
              </button>
            ))}
          </div>
        )}
        {mode === "forgot" && (
          <div style={{marginBottom:16}}>
            <div style={{fontWeight:"bold",fontSize:16,color:B.dark,marginBottom:4}}>🔑 Reset password</div>
          </div>
        )}

        {mode==="signup" && (
          <input placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} style={inp}/>
        )}
        <input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} style={inp}/>
        {mode !== "forgot" && (
          <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handleSubmit()} style={{...inp,marginBottom:error?8:16}}/>
        )}

        {error && <div style={{fontSize:12,color:error.startsWith("✅")?B.greenDark:B.red,marginBottom:12,padding:"8px 12px",background:error.startsWith("✅")?B.greenPale:"#FDF0EB",borderRadius:8}}>{error}</div>}

        {mode !== "forgot" && (
          <button onClick={handleSubmit} disabled={loading}
            style={{width:"100%",padding:"12px",background:loading?B.grayLight:B.greenDark,border:"none",
              borderRadius:10,color:B.white,fontWeight:"bold",fontSize:14,cursor:loading?"not-allowed":"pointer",
              fontFamily:"Georgia,serif"}}>
            {loading?"Attendere...":(mode==="login"?"Accedi":"Crea Account")}
          </button>
        )}

        {mode==="signup" && (
          <div style={{textAlign:"center",marginTop:10,fontSize:11,color:B.gray,lineHeight:1.5}}>
            Continuando la registrazione, dichiari di aver letto e accettato i{" "}
            <a href="https://drive.google.com/file/d/1qfO4zfRISXNkvClkwDcNlsb7Ztj-UQUX/view?usp=sharing"
              target="_blank" rel="noopener noreferrer"
              style={{color:B.greenDark,fontWeight:"bold",textDecoration:"underline"}}>
              Termini e Condizioni
            </a>
            {" "}di FantaBeach.
          </div>
        )}

        {mode==="login" && !resetSent && (
          <div style={{textAlign:"center",marginTop:8}}>
            <button onClick={()=>{setMode("forgot");setError("");setResetSent(false);}}
              style={{background:"none",border:"none",cursor:"pointer",fontSize:12,
                color:B.gray,fontFamily:"Georgia,serif",textDecoration:"underline",padding:4}}>
              Password dimenticata?
            </button>
          </div>
        )}

        {mode==="forgot" && (
          <div style={{marginTop:8}}>
            {resetSent ? (
              <div style={{background:B.greenPale,border:`1px solid ${B.greenDark}44`,borderRadius:10,
                padding:"12px 14px",textAlign:"center",fontSize:13,color:B.greenDark,lineHeight:1.6}}>
                ✅ <strong>Email inviata!</strong><br/>
                Controlla la tua casella (anche spam).<br/>
                Il link per il reset è valido 1 ora.
              </div>
            ) : (
              <div>
                <p style={{margin:"0 0 10px",fontSize:13,color:B.gray,lineHeight:1.6}}>
                  Inserisci la tua email e ti manderemo un link per reimpostare la password.
                </p>
                <button onClick={handleForgotPassword} disabled={loading}
                  style={{width:"100%",padding:"12px",background:loading?B.grayLight:B.orange,
                    border:"none",borderRadius:10,color:B.white,fontWeight:"bold",fontSize:14,
                    cursor:loading?"not-allowed":"pointer",fontFamily:"Georgia,serif",marginBottom:8}}>
                  {loading?"Invio in corso...":"📧 Invia link di reset"}
                </button>
                <button onClick={()=>{setMode("login");setError("");setResetSent(false);}}
                  style={{width:"100%",padding:"10px",background:"transparent",
                    border:`1px solid ${B.grayLight}`,borderRadius:10,color:B.gray,
                    fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>
                  ← Torna al login
                </button>
              </div>
            )}
            {resetSent && (
              <button onClick={()=>{setMode("login");setResetSent(false);setError("");}}
                style={{width:"100%",marginTop:10,padding:"10px",background:"transparent",
                  border:`1px solid ${B.grayLight}`,borderRadius:10,color:B.gray,
                  fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>
                ← Torna al login
              </button>
            )}
          </div>
        )}

        <div style={{textAlign:"center",marginTop:10,fontSize:11,color:B.gray}}>
          Powered by Zioema
        </div>
      </div>
    </div>
  );
}

// ─── APP WRAPPER CON AUTH ──────────────────────────────────────
export default function FantaBeachApp() {
  const [accessToken, setAccessToken] = useState(null);
  const [authUser, setAuthUser]       = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [athletesReady, setAthletesReady] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState(null); // token per reset password

  // Rileva token di recovery dall'URL hash al caricamento
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const token = params.get("access_token");
      if (token) {
        setRecoveryToken(token);
        // Pulisce l'URL senza ricaricare la pagina
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Carica atleti reali dall'API al mount
  useEffect(() => {
    loadAthletesFromAPI().finally(() => setAthletesReady(true));
  }, []);

  // Ripristina sessione da localStorage al mount
  useEffect(() => {
    const token = loadToken();
    const rt    = loadRefresh();
    if (token) {
      supabase.getUser(token).then(user => {
        if (user && user.id) {
          setAccessToken(token);
          setAuthUser(user);
          setAuthLoading(false);
        } else if (rt) {
          // Token scaduto o 403 — prova il refresh
          supabase.refreshToken(rt).then(async data => {
            if (data.access_token) {
              saveToken(data.access_token, data.refresh_token || rt);
              setAccessToken(data.access_token);
              const refreshedUser = await supabase.getUser(data.access_token);
              if (refreshedUser?.id) setAuthUser(refreshedUser);
              else clearToken();
            } else {
              clearToken();
            }
            setAuthLoading(false);
          }).catch(() => { clearToken(); setAuthLoading(false); });
        } else {
          clearToken();
          setAuthLoading(false);
        }
      }).catch(() => { clearToken(); setAuthLoading(false); });
    } else {
      setAuthLoading(false);
    }
  }, []);

  const handleAuth = (token, refreshTok, user) => {
    setAccessToken(token);
    setAuthUser(user);
  };

  const handleLogout = async () => {
    if (accessToken) await supabase.signOut(accessToken);
    clearToken();
    setAccessToken(null);
    setAuthUser(null);
  };

  // Refresh automatico del token ogni 50 minuti (scade dopo 60)
  useEffect(() => {
    const interval = setInterval(async () => {
      const rt = loadRefresh();
      if (!rt) return;
      try {
        const data = await supabase.refreshToken(rt);
        if (data.access_token) {
          saveToken(data.access_token, data.refresh_token || rt);
          setAccessToken(data.access_token);
        }
      } catch(e) { console.error("Token refresh fallito:", e); }
    }, 50 * 60 * 1000); // 50 minuti
    return () => clearInterval(interval);
  }, []);

  if (authLoading || !athletesReady) return (
    <div style={{fontFamily:"Georgia,serif",minHeight:"100vh",background:B.sand,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <LogoFull height={60}/>
        <div style={{marginTop:16,color:B.gray,fontSize:14}}>Caricamento...</div>
      </div>
    </div>
  );

  if (recoveryToken) return <ResetPasswordScreen token={recoveryToken} onDone={() => setRecoveryToken(null)}/>;
  if (!accessToken) return <AuthScreen onAuth={handleAuth}/>;
  return <FantaBeach accessToken={accessToken} authUser={authUser} onLogout={handleLogout}/>;
}

// ─── RESET PASSWORD SCREEN ───────────────────────────────────────
function ResetPasswordScreen({ token, onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState(false);

  const handleReset = async () => {
    if (!password || password.length < 6) { setError("La password deve essere di almeno 6 caratteri."); return; }
    if (password !== confirm) { setError("Le password non corrispondono."); return; }
    setLoading(true); setError("");
    try {
      const data = await supabase.updatePassword(token, password);
      if (data.error) {
        setError(data.error.message || "Errore durante il reset. Riprova.");
      } else {
        setSuccess(true);
      }
    } catch(e) { setError("Errore di rete. Riprova."); }
    setLoading(false);
  };

  const inp = {
    width:"100%", padding:"11px 14px", borderRadius:10,
    border:`1px solid ${B.grayLight}`, background:B.white, color:B.dark,
    fontSize:14, fontFamily:"Georgia,serif", outline:"none",
    boxSizing:"border-box", marginBottom:10,
  };

  return (
    <div style={{fontFamily:"Georgia,serif",minHeight:"100vh",background:B.sand,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:B.white,borderRadius:20,padding:"32px 24px",maxWidth:360,width:"100%",boxShadow:"0 4px 24px rgba(0,0,0,.08)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
            <LogoFull height={76}/>
          </div>
        </div>

        {success ? (
          <div>
            <div style={{background:B.greenPale,border:`1px solid ${B.greenDark}44`,borderRadius:12,
              padding:"20px",textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:32,marginBottom:8}}>✅</div>
              <div style={{fontWeight:"bold",fontSize:16,color:B.greenDark,marginBottom:6}}>Password aggiornata!</div>
              <div style={{fontSize:13,color:B.gray,lineHeight:1.6}}>Ora puoi accedere con la tua nuova password.</div>
            </div>
            <button onClick={onDone}
              style={{width:"100%",padding:"12px",background:B.greenDark,border:"none",
                borderRadius:10,color:B.white,fontWeight:"bold",fontSize:14,cursor:"pointer",
                fontFamily:"Georgia,serif"}}>
              Vai al login →
            </button>
          </div>
        ) : (
          <div>
            <h2 style={{margin:"0 0 6px",fontSize:20,color:B.dark}}>🔑 Nuova password</h2>
            <p style={{margin:"0 0 20px",fontSize:13,color:B.gray,lineHeight:1.6}}>
              Scegli una nuova password per il tuo account FantaBeach.
            </p>
            <input placeholder="Nuova password (min. 6 caratteri)" type="password"
              value={password} onChange={e=>setPassword(e.target.value)} style={inp}/>
            <input placeholder="Conferma nuova password" type="password"
              value={confirm} onChange={e=>setConfirm(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleReset()}
              style={{...inp,marginBottom:error?8:16}}/>
            {error && <div style={{fontSize:12,color:B.red,marginBottom:12,padding:"8px 12px",background:"#FDF0EB",borderRadius:8}}>{error}</div>}
            <button onClick={handleReset} disabled={loading}
              style={{width:"100%",padding:"12px",background:loading?B.grayLight:B.orange,border:"none",
                borderRadius:10,color:B.white,fontWeight:"bold",fontSize:14,
                cursor:loading?"not-allowed":"pointer",fontFamily:"Georgia,serif",marginBottom:8}}>
              {loading?"Salvataggio...":"Salva nuova password"}
            </button>
            <button onClick={onDone}
              style={{width:"100%",padding:"10px",background:"transparent",
                border:`1px solid ${B.grayLight}`,borderRadius:10,color:B.gray,
                fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>
              Annulla
            </button>
          </div>
        )}

        <div style={{textAlign:"center",marginTop:16,fontSize:11,color:B.gray}}>
          Powered by Zioema
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPALE ─────────────────────────────────────
function FantaBeach({ accessToken, authUser, onLogout }) {
  const [tab, setTab]             = useState(0);
  const [hiddenPage, setHiddenPage] = useState(null);
  const [athletes_data, setAthletesData] = useState({ women: WOMEN, men: MEN }); // 'stats-atleti'|'stats-utenti'|'stats-awards'|'profile'|'prizes'|'rules'|'terms'
  const [leagueId, setLeagueId]   = useState("L001-F");
  const [teamNames, setTeamNames] = useState({});
  const [standings, setStandings] = useState({}); // leagueId → array
  const [combo, setCombo]         = useState([]);
  const [standingsLoading, setStandingsLoading] = useState(false);

  // Carica classifica reale da Supabase
  // Cache standings: { data, timestamp }
  const standingsCache = React.useRef({ ts: 0, data: null, combo: null });
  const STANDINGS_TTL = 5 * 60 * 1000; // 5 minuti

  const loadStandings = async (token, force = false) => {
    if (!token) return;
    // Cache: non ricaricare se freschi
    const now = Date.now();
    if (!force && standingsCache.current.ts && (now - standingsCache.current.ts) < STANDINGS_TTL) {
      if (standingsCache.current.data) {
        setStandings(standingsCache.current.data);
        setCombo(standingsCache.current.combo || []);
      }
      return;
    }
    setStandingsLoading(true);
    try {
      // 1 chiamata alla vista aggregata invece di 4 chiamate separate
      const [scoresRes, profilesRes, historyRes] = await Promise.all([
        supabase.from("user_league_scores", token).then(db =>
          db.select("user_id,league_id,team_name,budget,total_pts,events_played,matches_played")),
        supabase.from("profiles", token).then(db =>
          db.select("id,username")),
        supabase.from("standings_history", token).then(db =>
          db.select("user_id,league_id,rank,recorded_at", "&order=recorded_at.desc&limit=200")),
      ]);

      const scores = Array.isArray(scoresRes) ? scoresRes : [];
      const profiles = Array.isArray(profilesRes) ? profilesRes : [];
      const history = Array.isArray(historyRes) ? historyRes : [];

      // Mappa profili
      const profileMap = {};
      profiles.forEach(p => { profileMap[p.id] = p.username; });

      // Mappa rank precedente da standings_history (ultimo snapshot per lega)
      const prevRankMap = {}; // user_id::league_id → rank precedente
      const seenKeys = new Set();
      history.forEach(h => {
        const k = `${h.user_id}::${h.league_id}`;
        if (!seenKeys.has(k)) {
          seenKeys.add(k);
          prevRankMap[k] = h.rank;
        }
      });

      // Costruisce classifica per ogni lega
      const newStandings = {};
      const leagueIds = ["L001-F","L001-M","L002-F","L002-M"];
      leagueIds.forEach(lid => {
        const members = scores.filter(s => s.league_id === lid);
        const ranked = members
          .sort((a,b) => b.total_pts - a.total_pts)
          .map((s, i) => {
            const rank = i + 1;
            const prevKey = `${s.user_id}::${lid}`;
            const prev = prevRankMap[prevKey] || rank; // se nessuno storico = stesso posto
            return {
              user_id: s.user_id,
              user: profileMap[s.user_id] || s.user_id.slice(0,8),
              team: s.team_name || profileMap[s.user_id] || "Squadra",
              pts: Math.round((s.total_pts || 0) * 100) / 100,
              budget: Math.round(s.budget || 0),
              events_played: s.events_played || 0,
              rank,
              prev,
            };
          });
        newStandings[lid] = ranked;
      });

      // Combo: somma punti tra tutte le leghe (min 2 leghe)
      const comboMap = {};
      leagueIds.forEach(lid => {
        (newStandings[lid] || []).forEach(s => {
          if (!comboMap[s.user_id]) comboMap[s.user_id] = { user: s.user, pts: 0, leagues: 0 };
          comboMap[s.user_id].pts += s.pts;
          comboMap[s.user_id].leagues += 1;
        });
      });
      const comboArr = Object.values(comboMap)
        .filter(c => c.leagues >= 2)
        .sort((a,b) => b.pts - a.pts)
        .map((c,i) => ({ ...c, rank: i+1, prev: i+1,
          pts: Math.round(c.pts * 10) / 10 }));

      setStandings(newStandings);
      setCombo(comboArr);
      // Salva in cache
      standingsCache.current = { ts: Date.now(), data: newStandings, combo: comboArr };

    } catch(e) {
      console.warn("Errore classifica:", e.message);
    }
    setStandingsLoading(false);
  };
  const [budgets, setBudgets]     = useState({"L001-F":450,"L001-M":450,"L002-F":400,"L002-M":400});
  const [rosters, setRosters]     = useState({"L001-F":[],"L001-M":[],"L002-F":[],"L002-M":[]});
  const [lineups, setLineups]     = useState({"L001-F":[],"L001-M":[],"L002-F":[],"L002-M":[]});
  const [captains, setCaptains]   = useState({"L001-F":null,"L001-M":null,"L002-F":null,"L002-M":null});
  const [coaches, setCoaches]     = useState({"L001-F":null,"L001-M":null,"L002-F":null,"L002-M":null});
  const [coachInField, setCoachInField] = useState({"L001-F":false,"L001-M":false,"L002-F":false,"L002-M":false});
  const [joinStatus, setJoinStatus] = useState(INIT_JOIN);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinTeamName, setJoinTeamName] = useState("");
  const [notif, setNotif]         = useState(null);
  const [inAppNotifs, setInAppNotifs] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifPollRef = React.useRef(null);
  const tradingRef = React.useRef(false); // blocca click doppi su buy/sell
  const [popup, setPopup]         = useState(null);
  const [search, setSearch]       = useState("");
  const [coachSearch, setCoachSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Tutti");
  const [priceFilter, setPriceFilter] = useState(0);
  const [visibleCount, setVisibleCount] = useState(30);
  const [marketTab, setMarketTab] = useState("athletes"); // "athletes" | "coaches"
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showMenu, setShowMenu]     = useState(false);
  const [menuSection, setMenuSection] = useState(null);
  const [leagues, setLeagues]     = useState(LEAGUES_INIT);
  const [dbLoading, setDbLoading] = useState(false);
  const [events, setEvents] = useState(EVENTS_FALLBACK);
  const [coachesList, setCoachesList] = useState(COACHES); // fallback hardcoded, sostituito da DB
  const [isAdmin, setIsAdmin]     = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalSquads, setTotalSquads] = useState(0);
  const [topF, setTopF]           = useState([]);
  const [topM, setTopM]           = useState([]);
  const [leagueUserCounts, setLeagueUserCounts] = useState({});
  const [lastSyncFipav, setLastSyncFipav] = useState(null);
  const [lastSyncFipavOk, setLastSyncFipavOk] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResultsLoading, setSyncResultsLoading] = useState(false);
  const [lastSyncResults, setLastSyncResults] = useState(null);
  const [lastSyncResultsOk, setLastSyncResultsOk] = useState(null);
  const [matchResultsData, setMatchResultsData] = useState({}); // event_id → array risultati

  // Carica match_results da Supabase per un evento
  const loadMatchResults = async (eventId) => {
    if (!accessToken || !eventId) return;
    try {
      const db = await supabase.from("match_results", accessToken);
      const rows = await db.select("*", `&event_id=eq.${eventId}&order=match_index.asc`);
      console.log(`[matchResults] ${eventId}:`, Array.isArray(rows) ? `${rows.length} righe OK` : JSON.stringify(rows).slice(0,100));
      setMatchResultsData(prev => ({ ...prev, [eventId]: Array.isArray(rows) ? rows : [] }));
    } catch(e) {
      console.warn("Errore match_results:", e.message);
      setMatchResultsData(prev => ({ ...prev, [eventId]: [] }));
    }
  };

  // ── Carica dati utente da Supabase al mount ──────────────────
  useEffect(() => {
    if (!accessToken || !authUser) return;
    setDbLoading(true);
    loadUserData(accessToken, authUser.id).finally(() => setDbLoading(false));
  }, [accessToken, authUser]);

  const loadUserData = async (token, userId) => {
    try {
      // Tutte le chiamate in parallelo — da 6 chiamate sequenziali a 3 parallele
      const [profileRes, leaguesRes, rosterRes, lineupRes, coachesRes, eventsRes, coachSelectRes, leagueSettingsRes] = await Promise.all([
        supabase.from("profiles", token).then(db => db.select("role,username,display_name", `&id=eq.${userId}`)),
        supabase.from("user_leagues", token).then(db => db.select("*", `&user_id=eq.${userId}`)),
        supabase.from("rosters", token).then(db => db.select("*", `&user_id=eq.${userId}&sold_at=is.null`)),
        supabase.from("lineups", token).then(db => db.select("*", `&user_id=eq.${userId}`)),
        supabase.from("coaches", token).then(db => db.select("*", "&active=eq.true&order=cost.desc,name.asc")),
        supabase.from("events", token).then(db => db.select("*", "&order=anno.asc,id.asc")),
        supabase.from("coach_selections", token).then(db => db.select("*", `&user_id=eq.${userId}`)),
        supabase.from("league_settings", token).then(db => db.select("*")),
      ]);

      // ── League settings (status e marketOpen) da Supabase ──
      if (Array.isArray(leagueSettingsRes) && leagueSettingsRes.length > 0) {
        setLeagues(ls => ls.map(l => {
          const s = leagueSettingsRes.find(x => x.league_id === l.id);
          if (!s) return l;
          return { ...l, status: s.status || "OPEN", marketOpen: s.market_open || false };
        }));
      }

      // ── Coach selezionati ──
      if (Array.isArray(coachSelectRes) && coachSelectRes.length > 0) {
        const newCoaches = {"L001-F":null,"L001-M":null,"L002-F":null,"L002-M":null};
        const newCoachInField = {"L001-F":false,"L001-M":false,"L002-F":false,"L002-M":false};
        coachSelectRes.forEach(cs => {
          if (newCoaches[cs.league_id] !== undefined) {
            newCoaches[cs.league_id] = cs.coach_id;
            newCoachInField[cs.league_id] = cs.in_field || false;
          }
        });
        setCoaches(newCoaches);
        setCoachInField(newCoachInField);
      }

      // ── Events da DB ──
      if (Array.isArray(eventsRes) && eventsRes.length > 0) {
        setEvents(eventsRes.map(e => ({
          ...e,
          date: e.date_start || "",
        })));
      }

      // ── Coach da DB (sostituisce hardcoded se DB ha dati) ──
      if (Array.isArray(coachesRes) && coachesRes.length > 0) {
        const mapped = coachesRes
          .filter(c => c.active !== false)
          .map(c => ({
            id: c.id,
            name: c.name || "",
            cost: c.cost || 5,
            athletes: [],
          }));
        console.log(`[coaches] caricati ${mapped.length} coach da Supabase`);
        setCoachesList(mapped);
      }

      // ── Profilo e ruolo ──
      const userIsAdmin = Array.isArray(profileRes) && profileRes[0]?.role === "admin";
      setIsAdmin(userIsAdmin);

      // ── Se admin: carica dati aggiuntivi in parallelo ──
      if (userIsAdmin) {
        const [pendingRes, countRes, approvedRes, rostersAllRes] = await Promise.all([
          supabase.from("user_leagues", token).then(db =>
            db.select("id,user_id,league_id,team_name,status", "&status=eq.pending&order=created_at.asc")),
          supabase.from("profiles", token).then(db => db.select("id", "")),
          supabase.from("user_leagues", token).then(db =>
            db.select("id,league_id,user_id", "&status=eq.approved")),
          supabase.from("rosters", token).then(db =>
            db.select("player_id,player_name,gender", "&sold_at=is.null")),
        ]);

        // Pending requests — carica username in parallelo
        if (Array.isArray(pendingRes) && pendingRes.length > 0) {
          const userIds = [...new Set(pendingRes.map(r => r.user_id))];
          const profdb = await supabase.from("profiles", token);
          const profiles = await profdb.select("id,username", `&id=in.(${userIds.join(",")})`);
          const profMap = {};
          if (Array.isArray(profiles)) profiles.forEach(p => { profMap[p.id] = p.username; });
          setPendingRequests(pendingRes.map(r => ({ ...r, username: profMap[r.user_id] || r.user_id })));
        } else {
          setPendingRequests([]);
        }

        // Statistiche admin
        setTotalUsers(Array.isArray(countRes) ? countRes.length : 0);
        setTotalSquads(Array.isArray(approvedRes) ? approvedRes.length : 0);

        if (Array.isArray(approvedRes)) {
          const counts = {};
          const userLeagueCounts = {};
          approvedRes.forEach(a => {
            counts[a.league_id] = (counts[a.league_id]||0) + 1;
            userLeagueCounts[a.user_id] = (userLeagueCounts[a.user_id]||0) + 1;
          });
          counts["COMBO"] = Object.values(userLeagueCounts).filter(c => c > 1).length;
          setLeagueUserCounts(counts);
        }

        if (Array.isArray(rostersAllRes)) {
          const countF = {}, countM = {};
          rostersAllRes.forEach(r => {
            if (r.gender === "F") countF[r.player_id] = { name: r.player_name, count: (countF[r.player_id]?.count||0)+1 };
            else countM[r.player_id] = { name: r.player_name, count: (countM[r.player_id]?.count||0)+1 };
          });
          setTopF(Object.values(countF).sort((a,b)=>b.count-a.count).slice(0,3));
          setTopM(Object.values(countM).sort((a,b)=>b.count-a.count).slice(0,3));
        }
      }

      // ── Leghe utente ──
      if (Array.isArray(leaguesRes)) {
        const newJoin = { "L001-F":null,"L001-M":null,"L002-F":null,"L002-M":null };
        const newBudgets = { "L001-F":450,"L001-M":450,"L002-F":400,"L002-M":400 };
        const newTeamNames = {};
        leaguesRes.forEach(ul => {
          newJoin[ul.league_id] = ul.status === "approved" ? "APPROVED" : ul.status === "pending" ? "PENDING" : null;
          if (ul.budget !== undefined) newBudgets[ul.league_id] = ul.budget;
          if (ul.team_name) newTeamNames[ul.league_id] = ul.team_name;
        });

        // Auto-join admin su tutte le leghe
        if (userIsAdmin) {
          const username = profileRes?.[0]?.username || "admin";
          const leaguesToJoin = ["L001-F","L001-M","L002-F","L002-M"].filter(lid => !newJoin[lid]);
          if (leaguesToJoin.length > 0) {
            const adb = await supabase.from("user_leagues", token);
            await Promise.all(leaguesToJoin.map(lid =>
              adb.upsert({ user_id: userId, league_id: lid, status: "approved",
                team_name: username,
                budget: ["L001-F","L001-M"].includes(lid) ? 450 : 400
              }, "user_id,league_id")
                .then(() => { newJoin[lid] = "APPROVED"; })
            ));
          }
        }

        setJoinStatus(newJoin);
        setBudgets(newBudgets);
        setTeamNames(newTeamNames);
        loadStandings(token);
      }

      // ── Roster ──
      if (Array.isArray(rosterRes)) {
        const newRosters = { "L001-F":[],"L001-M":[],"L002-F":[],"L002-M":[] };
        rosterRes.forEach(r => {
          const athlete = r.gender === "F"
            ? athletes_data.women.find(a => a.id === r.player_id)
            : athletes_data.men.find(a => a.id === r.player_id);
          if (athlete && newRosters[r.league_id] !== undefined)
            newRosters[r.league_id].push(athlete);
        });
        setRosters(newRosters);
      }

      // ── Lineup (solo evento corrente per lega) ──
      if (Array.isArray(lineupRes)) {
        const newLineups  = { "L001-F":[],"L001-M":[],"L002-F":[],"L002-M":[] };
        const newCaptains = { "L001-F":null,"L001-M":null,"L002-F":null,"L002-M":null };

        // Roster attivo per lega (per filtrare atleti venduti)
        const rosterIds = {};
        if (Array.isArray(rosterRes)) {
          rosterRes.forEach(r => {
            if (!rosterIds[r.league_id]) rosterIds[r.league_id] = new Set();
            rosterIds[r.league_id].add(r.player_id);
          });
        }

        // Stessa logica di handleSaveFormation: In corso → primo Planned → E_PRESTAGIONE
        const allEvents = Array.isArray(eventsRes) ? eventsRes : [];
        const activeEventIdForLeague = (lid) => {
          const gender = lid.endsWith("-F") ? "F" : "M";
          const evG = allEvents.filter(e => (e.gender||"").toUpperCase() === gender);
          const active = evG.find(e => e.status === "In corso")
            || evG.find(e => e.status === "Planned")
            || null;
          return active?.id || "E_PRESTAGIONE";
        };

        Object.keys(newLineups).forEach(lid => {
          const eventId = activeEventIdForLeague(lid);
          // Solo righe della lega + evento corrente — mai toccato lo storico
          const rows = lineupRes.filter(l => l.league_id === lid && l.event_id === eventId);
          // Deduplica i titolari/capitano
          const starterIds = [...new Set(
            rows.filter(r => r.role === "titolare" || r.role === "capitano")
                .map(r => r.player_id)
          )];
          // Filtra sugli atleti ancora nel roster attivo
          const filtered = rosterIds[lid]
            ? starterIds.filter(id => rosterIds[lid].has(id))
            : starterIds;
          newLineups[lid] = filtered;
          // Capitano solo se ancora tra i titolari filtrati
          const capId = rows.find(r => r.role === "capitano")?.player_id || null;
          newCaptains[lid] = (capId && filtered.includes(capId)) ? capId : null;
        });

        setLineups(newLineups);
        setCaptains(newCaptains);
      }

    } catch(e) { console.error("Errore caricamento dati:", e); }
  };

  const league   = leagues.find(l => l.id === leagueId);
  const athletes = league.gender === "F" ? athletes_data.women : athletes_data.men;
  const budget   = budgets[leagueId];
  const roster   = rosters[leagueId];
  const lineup   = lineups[leagueId];
  const captain  = captains[leagueId];
  const myCoach  = coaches[leagueId];
  const myJoin   = joinStatus[leagueId];

  const loadNotifications = async (token, userId) => {
    if (!token || !userId) return;
    try {
      // Prende la data di creazione account dell'utente per filtrare notifiche globali precedenti
      const userCreatedAt = authUser?.created_at || new Date(0).toISOString();
      const db = await supabase.from("notifications", token);
      const rows = await db.select("*",
        `&or=(user_id.eq.${userId},user_id.is.null)&order=created_at.desc&limit=20`);
      if (Array.isArray(rows)) {
        const readIds = JSON.parse(localStorage.getItem(`fb_notif_read_${userId}`) || "[]");
        const unread = rows.filter(n => {
          if (n.read || readIds.includes(n.id)) return false;
          // Le notifiche globali (user_id=null) le mostra solo se create DOPO la registrazione
          if (!n.user_id && n.created_at < userCreatedAt) return false;
          return true;
        });
        setInAppNotifs(unread);
      }
    } catch(e) { /* silenzioso */ }
  };

  const showNotif = (msg, type="success") => { setNotif({msg,type}); setTimeout(()=>setNotif(null),2800); };

  useEffect(() => {
    if (!accessToken || !authUser) {
      if (notifPollRef.current) clearInterval(notifPollRef.current);
      return;
    }
    loadNotifications(accessToken, authUser.id);
    notifPollRef.current = setInterval(() => {
      loadNotifications(accessToken, authUser.id);
    }, 60000);
    return () => { if(notifPollRef.current) clearInterval(notifPollRef.current); };
  }, [accessToken, authUser?.id]);
  // Tappa in corso per questo genere (anno 2026)
  const tappaInCorso2026 = events.find(e =>
    e.status === "In corso" &&
    (e.anno || 2026) === 2026 &&
    (e.gender||"").toUpperCase() === league.gender
  );

  // Tappa completata per questo genere (anno 2026)
  const tappaCompletata2026 = events.find(e =>
    e.status === "Completato" &&
    (e.anno || 2026) === 2026 &&
    (e.gender||"").toUpperCase() === league.gender
  );

  // Classic:
  //   - Tutto Planned → mercato + formazione aperti
  //   - In corso → tutto bloccato
  //   - Completata → formazione aperta, mercato bloccato
  // Market:
  //   - Toggle marketOpen controlla tutto
  //   - In corso → sempre bloccato
  // Deadline: giovedì 23:00 → tutto bloccato automaticamente
  const isDeadlinePassed = () => {
    const now = new Date();
    const day = now.getDay(); // 0=dom, 1=lun, 2=mar, 3=mer, 4=gio, 5=ven, 6=sab
    const hour = now.getHours();
    if (day === 4 && hour >= 23) return true; // giovedì dopo le 23
    if (day === 5 || day === 6 || day === 0) return true; // ven, sab, dom
    return false;
  };

  const canTrade = () => {
    if (myJoin !== "APPROVED") return false;
    if (tappaInCorso2026) return false; // tappa in corso → sempre bloccato
    if (isDeadlinePassed()) return false; // giovedì 23:00 → bloccato automaticamente
    if (league.type === "classic") return !tappaCompletata2026;
    return league.marketOpen;
  };

  // Formazione: aperta anche dopo tappa completata
  const canSaveFormation = () => {
    if (myJoin !== "APPROVED") return false;
    if (tappaInCorso2026) return false;
    if (isDeadlinePassed()) return false; // giovedì 23:00 → bloccato
    return true;
  };

  // Coach: stessa logica della formazione
  const canSelectCoach = () => {
    if (myJoin !== "APPROVED") return false;
    if (tappaInCorso2026) return false;
    if (isDeadlinePassed()) return false;
    if (league.type === "classic") return !tappaCompletata2026;
    return league.marketOpen;
  };

  const isOwned   = (a) => !!roster.find(r=>r.id===a.id);
  const isStarter = (a) => lineup.includes(a.id);
  const isCaptain = (a) => captain===a.id;

  const handleBuy = async (a) => {
    if (myJoin!=="APPROVED") return showNotif("Non sei ancora approvato!","error");
    if (!canTrade()) return showNotif(league.type==="classic"?"Iscrizioni chiuse!":"Mercato chiuso! Lun 09:00 - Gio 23:00","error");
    if (roster.length>=5) return showNotif("Hai già 5 atleti nel roster!","error");
    if (budget<a.cost)    return showNotif("Crediti insufficienti!","error");
    if (isOwned(a))       return showNotif("Atleta già nel roster!","error");
    if (tradingRef.current) return; // blocca doppio click
    tradingRef.current = true;
    // Aggiorna UI ottimisticamente
    setRosters(r=>({...r,[leagueId]:[...r[leagueId],{...a}]}));
    setBudgets(b=>({...b,[leagueId]:b[leagueId]-a.cost}));
    showNotif(`${a.name} aggiunto! 🏐`);
    // Salva su Supabase
    try {
      const newBudget = budget - a.cost;
      const rdb = await supabase.from("rosters", accessToken);
      await rdb.insert({ user_id:authUser.id, league_id:leagueId, player_id:a.id, player_name:a.name, gender:a.gender, price:a.cost });
      const udb = await supabase.from("user_leagues", accessToken);
      await udb.update({ budget: newBudget }, `user_id=eq.${authUser.id}&league_id=eq.${leagueId}`);
      const tdb = await supabase.from("transfer_history", accessToken);
      await tdb.insert({ user_id:authUser.id, league_id:leagueId, player_id:a.id, player_name:a.name, action:"buy", price:a.cost, budget_after:newBudget });
    } catch(e) { console.error("Errore acquisto:", e); }
    finally { tradingRef.current = false; }
  };

  const handleSell = async (a) => {
    if (!canTrade()) return showNotif(league.type==="classic"?"Iscrizioni chiuse!":"Mercato chiuso!","error");
    if (!isOwned(a)) return; // blocca vendita di atleta non nel roster (double-click, stato stale)
    if (tradingRef.current) return; // blocca doppio click
    tradingRef.current = true;
    // Aggiorna UI ottimisticamente
    setRosters(r=>({...r,[leagueId]:r[leagueId].filter(x=>x.id!==a.id)}));
    setLineups(l=>({...l,[leagueId]:l[leagueId].filter(id=>id!==a.id)}));
    if (captain===a.id) setCaptains(c=>({...c,[leagueId]:null}));
    setBudgets(b=>({...b,[leagueId]:b[leagueId]+a.cost}));
    showNotif(`Venduto per $${a.cost}`);
    // Salva su Supabase
    try {
      const newBudget = budget + a.cost;
      const now = new Date().toISOString();
      const rdb = await supabase.from("rosters", accessToken);
      await rdb.update({ sold_at: now }, `user_id=eq.${authUser.id}&league_id=eq.${leagueId}&player_id=eq.${a.id}&sold_at=is.null`);
      // Fix 3: rimuove il venduto dalla formazione dell'evento attivo (niente formazioni sporche al freeze)
      const eventsForGenderSell = events.filter(e => (e.gender||"").toUpperCase() === league.gender.toUpperCase());
      const activeEventSell = eventsForGenderSell.find(e => e.status === "In corso")
        || eventsForGenderSell.find(e => e.status === "Planned") || null;
      const sellEventId = activeEventSell?.id || "E_PRESTAGIONE";
      const ldb = await supabase.from("lineups", accessToken);
      await ldb.delete(`user_id=eq.${authUser.id}&league_id=eq.${leagueId}&player_id=eq.${a.id}&event_id=eq.${sellEventId}`);
      const udb = await supabase.from("user_leagues", accessToken);
      await udb.update({ budget: newBudget }, `user_id=eq.${authUser.id}&league_id=eq.${leagueId}`);
      const tdb = await supabase.from("transfer_history", accessToken);
      await tdb.insert({ user_id:authUser.id, league_id:leagueId, player_id:a.id, player_name:a.name, action:"sell", price:a.cost, budget_after:newBudget });
    } catch(e) { console.error("Errore vendita:", e); }
    finally { tradingRef.current = false; }
  };

  const handleBuyCoach = async (c) => {
    if (!canSelectCoach()) return showNotif("Coach bloccato durante la tappa!","error");
    if (myCoach===c.id) return showNotif("Coach già selezionato!","error");
    const prev = coachesList.find(x=>x.id===myCoach);
    const prevCost = prev?.cost || 0;
    if (budget - prevCost < c.cost) return showNotif("Crediti insufficienti!","error");
    if (tradingRef.current) return; // blocca doppio click
    tradingRef.current = true;
    // Aggiorna stato locale
    if (myCoach) setBudgets(b=>({...b,[leagueId]:b[leagueId]+prevCost}));
    setCoaches(ch=>({...ch,[leagueId]:c.id}));
    setBudgets(b=>({...b,[leagueId]:b[leagueId]-c.cost}));
    showNotif(`Coach ${c.name} selezionato!`);
    // Persiste su Supabase
    try {
      const db = await supabase.from("coach_selections", accessToken);
      await db.delete(`user_id=eq.${authUser.id}&league_id=eq.${leagueId}`);
      await db.insert({ user_id:authUser.id, league_id:leagueId, coach_id:c.id, coach_name:c.name });
      // Aggiorna budget
      const udb = await supabase.from("user_leagues", accessToken);
      const newBudget = myCoach ? budget - c.cost + prevCost : budget - c.cost;
      await udb.update({ budget: newBudget }, `user_id=eq.${authUser.id}&league_id=eq.${leagueId}`);
    } catch(e) { console.error("Errore selezione coach:", e); }
    finally { tradingRef.current = false; }
  };

  const handleRemoveCoach = async () => {
    if (!canSelectCoach()) return showNotif("Mercato coach chiuso!","error");
    if (!myCoach) return;
    const c = coachesList.find(x=>x.id===myCoach);
    const cost = c?.cost || 0;
    setBudgets(b=>({...b,[leagueId]:b[leagueId]+cost}));
    setCoaches(ch=>({...ch,[leagueId]:null}));
    showNotif("Coach rimosso");
    try {
      const db = await supabase.from("coach_selections", accessToken);
      await db.delete(`user_id=eq.${authUser.id}&league_id=eq.${leagueId}`);
      const udb = await supabase.from("user_leagues", accessToken);
      await udb.update({ budget: budget+cost }, `user_id=eq.${authUser.id}&league_id=eq.${leagueId}`);
    } catch(e) { console.error("Errore rimozione coach:", e); }
  };

  const toggleStarter = (a) => {
    if (!canSaveFormation()) return showNotif("Tappa in corso — formazione bloccata","error");
    const currentLineup = [...new Set(lineup)];
    if (currentLineup.includes(a.id)) {
      setLineups(l=>({...l,[leagueId]:currentLineup.filter(id=>id!==a.id)}));
      if (captain===a.id) setCaptains(c=>({...c,[leagueId]:null}));
    } else {
      if (currentLineup.length>=3) return showNotif("Max 3 titolari!","error");
      setLineups(l=>({...l,[leagueId]:[...currentLineup,a.id]}));
    }
  };

  const toggleCaptain = (a) => {
    if (!canSaveFormation()) return showNotif("Tappa in corso — formazione bloccata","error");
    if (!isStarter(a)) return showNotif("Il capitano deve essere titolare!","error");
    setCaptains(c=>({...c,[leagueId]:c[leagueId]===a.id?null:a.id}));
  };

  const handleSaveFormation = async () => {
    if (roster.length<5) {
      setPopup({
        title:"Roster incompleto",
        message:`Hai solo ${roster.length}/5 atleti. Devi avere esattamente 5 atleti prima di salvare.`,
        hint:canTrade()?"Vai al Mercato e acquista altri atleti.":"Il mercato è chiuso. Contatta l'admin.",
        action:canTrade()?()=>{setPopup(null);setTab(0);}:null,
        actionLabel:canTrade()?"Vai al Mercato":null,
      });
      return;
    }
    if (lineup.length<3) {
      setPopup({title:"Titolari mancanti",message:"Schiera esattamente 3 titolari prima di salvare.",hint:"Tocca gli atleti in panchina per aggiungerli in campo."});
      return;
    }
    if (!captain) {
      setPopup({title:"Capitano mancante",message:"Devi nominare un capitano tra i 3 titolari.",hint:"Premi il bottone ★ vicino a un titolare per nominarlo capitano."});
      return;
    }
    showNotif("Formazione salvata! 🏐");
    try {
      const eventsForGender = events.filter(e =>
        (e.gender||"").toUpperCase() === league.gender.toUpperCase()
      );
      const activeEvent = eventsForGender.find(e => e.status === "In corso")
        || eventsForGender.find(e => e.status === "Planned")
        || null;
      const eventId = activeEvent?.id || "E_PRESTAGIONE";
      const ldb = await supabase.from("lineups", accessToken);
      
      // Cancella solo le righe dell'evento attivo — non tocca lo storico delle tappe precedenti
      await ldb.delete(`user_id=eq.${authUser.id}&league_id=eq.${leagueId}&event_id=eq.${eventId}`);
      
      const entries = lineup.map(pid => ({
        user_id: authUser.id,
        league_id: leagueId,
        event_id: eventId,
        player_id: pid,
        role: pid === captain ? "capitano" : "titolare",
        gender_slot: league.gender,
      }));
      roster.filter(a => !lineup.includes(a.id)).forEach(a => {
        entries.push({
          user_id: authUser.id, league_id: leagueId, event_id: eventId,
          player_id: a.id, role: "riserva", gender_slot: league.gender,
        });
      });
      await ldb.insert(entries);
    } catch(e) { console.error("Errore salvataggio formazione:", e); }
  };

  const handleJoinRequest = async () => {
    if (!joinTeamName.trim()) return showNotif("Inserisci il nome della squadra!","error");
    setShowJoinForm(false); setJoinTeamName("");
    // Aggiorna UI ottimisticamente
    setJoinStatus(j=>({...j,[leagueId]:"PENDING"}));
    showNotif("Richiesta inviata! Attendi l'approvazione.");
    // Salva su Supabase
    try {
      const db = await supabase.from("user_leagues", accessToken);
      await db.upsert({
        user_id: authUser.id,
        league_id: leagueId,
        status: "pending",
        team_name: joinTeamName.trim(),
        budget: ["L001-F","L001-M"].includes(league.id) ? 450 : 400,
      }, "user_id,league_id");
    } catch(e) { console.error("Errore salvataggio iscrizione:", e); }
  };

  const filtered = useMemo(()=>{
    let list = athletes;
    if (search) list=list.filter(a=>a.name.toLowerCase().includes(search.toLowerCase()));
    if (catFilter!=="Tutti") list=list.filter(a=>getCategory(a.ranking).label===catFilter);
    list=list.filter(PRICE_RANGES[priceFilter].filter);
    return list;
  },[athletes,search,catFilter,priceFilter]);

  const visibleAthletes = filtered.slice(0,visibleCount);
  const hasMore = visibleCount < filtered.length;
  const starters = roster.filter(a=>isStarter(a));
  const bench    = roster.filter(a=>!isStarter(a));
  const leagueStandings = standings[leagueId] || [];
  const currentCoach = coachesList.find(c=>c.id===myCoach);

  return (
    <div style={{fontFamily:"Georgia,serif",minHeight:"100vh",background:B.sand,color:B.dark,position:"relative"}}>

      {notif&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:notif.type==="error"?B.orange:B.greenDark,color:B.white,padding:"10px 22px",borderRadius:30,fontWeight:"bold",fontSize:13,zIndex:999,boxShadow:"0 4px 16px rgba(0,0,0,.2)",whiteSpace:"nowrap"}}>{notif.msg}</div>}

      {popup&&(
        <div style={{position:"fixed",inset:0,background:"rgba(26,46,40,.6)",zIndex:998,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:B.white,borderRadius:16,padding:"24px 20px",maxWidth:340,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:8}}>⚠️</div>
            <div style={{fontWeight:"bold",fontSize:17,color:B.dark,marginBottom:8}}>{popup.title}</div>
            <div style={{fontSize:13,color:B.gray,lineHeight:1.6,marginBottom:8}}>{popup.message}</div>
            {popup.hint&&<div style={{fontSize:12,color:B.greenDark,background:B.greenPale,borderRadius:8,padding:"8px 12px",marginBottom:16}}>💡 {popup.hint}</div>}
            <div style={{display:"flex",gap:8,flexDirection:"column"}}>
              {popup.action&&<button onClick={popup.action} style={{padding:"11px",background:B.greenDark,border:"none",borderRadius:10,color:B.white,fontWeight:"bold",fontSize:14,cursor:"pointer",fontFamily:"Georgia,serif"}}>{popup.actionLabel}</button>}
              <button onClick={()=>setPopup(null)} style={{padding:"10px",background:B.grayPale,border:"none",borderRadius:10,color:B.gray,fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>Chiudi</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{background:B.sandDark,padding:"env(safe-area-inset-top, 16px) 16px 0",paddingTop:"max(env(safe-area-inset-top), 20px)",color:B.dark,borderBottom:`2px solid ${B.sandDeep}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <button onClick={()=>setShowMenu(true)} style={{width:36,height:36,borderRadius:10,border:`1px solid ${B.sandDeep}`,background:B.white,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,flexShrink:0}}>
            <div style={{width:16,height:2,borderRadius:1,background:B.dark}}/>
            <div style={{width:16,height:2,borderRadius:1,background:B.dark}}/>
            <div style={{width:12,height:2,borderRadius:1,background:B.dark}}/>
          </button>
          <LogoFull height={46}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {/* Badge notifiche */}
            <button onClick={()=>setShowNotifPanel(p=>!p)} style={{position:"relative",background:"none",border:"none",cursor:"pointer",padding:6}}>
              <span style={{fontSize:20}}>🔔</span>
              {inAppNotifs.length>0&&(
                <span style={{position:"absolute",top:0,right:0,background:B.orange,color:B.white,
                  borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:"bold",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {inAppNotifs.length}
                </span>
              )}
            </button>
            <div style={{background:B.white,border:`1px solid ${B.sandDeep}`,borderRadius:30,padding:"6px 14px",textAlign:"center"}}>
              <div style={{color:B.yellow,fontWeight:"bold",fontSize:18,lineHeight:1}}>${budget}</div>
              <div style={{color:B.gray,fontSize:10}}>crediti</div>
            </div>
          </div>
        </div>

        {/* Pannello notifiche */}
        {showNotifPanel&&(
          <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,margin:"0 0 10px",overflow:"hidden"}}>
            <div style={{padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${B.creamDark}`}}>
              <div style={{fontSize:12,fontWeight:"bold",color:B.dark}}>🔔 Notifiche</div>
              {inAppNotifs.length>0&&(
                <button onClick={async()=>{
                  // Salva gli ID letti in localStorage (funziona anche per notifiche globali)
                  const readIds = JSON.parse(localStorage.getItem(`fb_notif_read_${authUser.id}`) || "[]");
                  const newReadIds = [...new Set([...readIds, ...inAppNotifs.map(n => n.id)])];
                  localStorage.setItem(`fb_notif_read_${authUser.id}`, JSON.stringify(newReadIds));
                  // Marca come lette quelle personali su Supabase
                  try {
                    const db = await supabase.from("notifications", accessToken);
                    const personalIds = inAppNotifs.filter(n => n.user_id === authUser.id).map(n => n.id);
                    if (personalIds.length > 0)
                      await db.update({read:true}, `id=in.(${personalIds.join(",")})`);
                  } catch(e) { /* silenzioso */ }
                  setInAppNotifs([]);
                  setShowNotifPanel(false);
                }} style={{fontSize:10,color:B.gray,background:"none",border:"none",cursor:"pointer",fontFamily:"Georgia,serif"}}>
                  Segna tutte come lette
                </button>
              )}
            </div>
            {inAppNotifs.length===0
              ? <div style={{padding:"16px",textAlign:"center",color:B.gray,fontSize:12}}>Nessuna notifica</div>
              : inAppNotifs.map((n,i)=>(
                <div key={n.id} style={{padding:"10px 14px",borderBottom:i<inAppNotifs.length-1?`1px solid ${B.creamDark}`:"none",display:"flex",gap:10,alignItems:"flex-start"}}>
                  <span style={{fontSize:16,flexShrink:0,display:"none"}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,color:B.dark}}>{n.message}</div>
                    <div style={{fontSize:10,color:B.gray,marginTop:2}}>
                      {n.created_at?new Date(n.created_at).toLocaleString("it-IT",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):""}
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:10,scrollbarWidth:"none"}}>
          {leagues.map(l=>{
            const js=joinStatus[l.id];
            return(
              <button key={l.id} onClick={()=>{setLeagueId(l.id);setVisibleCount(30);setSelectedEvent(null);}} style={{flexShrink:0,padding:"6px 12px",borderRadius:20,border:`1px solid ${leagueId===l.id?B.orange:B.creamDark}`,cursor:"pointer",fontSize:11,fontFamily:"Georgia,serif",background:leagueId===l.id?B.orange:B.white,color:leagueId===l.id?B.white:"#333333",fontWeight:leagueId===l.id?"bold":"normal",display:"flex",alignItems:"center",gap:5}}>
                {l.name}
                <span style={{width:6,height:6,borderRadius:"50%",display:"inline-block",background:js==="APPROVED"?"#4ADE80":js==="PENDING"?B.yellow:"#F87171"}}/>
              </button>
            );
          })}
        </div>

        <div style={{display:"flex",alignItems:"center",gap:8,paddingBottom:10,fontSize:11}}>
          <span style={{padding:"2px 10px",borderRadius:10,fontSize:10,fontWeight:"bold",
            background:tappaInCorso2026?B.orangePale:canTrade()?"#D1FAE5":B.sandDeep,
            color:tappaInCorso2026?B.orange:canTrade()?"#065F46":B.gray,
            border:`1px solid ${tappaInCorso2026?B.orange:canTrade()?"#34D399":B.grayLight}`}}>
            {tappaInCorso2026
              ? "🔴 Tappa in corso"
              : isDeadlinePassed()
                ? "🔴 Mercato chiuso — deadline giovedì 23:00"
                : league.type==="classic"
                  ? tappaCompletata2026
                    ? "🟡 Formazione aperta · Mercato chiuso"
                    : "🟢 Formazione e mercato aperti"
                  : league.marketOpen ? "🟢 Mercato aperto" : "🔴 Mercato chiuso"}
          </span>
          {myJoin==="APPROVED"&&<span style={{color:B.gray,fontSize:10}}>{roster.length}/5 atleti · {lineup.length}/3 titolari{captain?" · ★ Cap":""}</span>}
        </div>

        {myJoin==="APPROVED"&&(
          <div style={{display:"flex",gap:5,paddingBottom:14,alignItems:"center"}}>
            {Array.from({length:5}).map((_,i)=>(
              <div key={i} style={{flex:1,height:3,borderRadius:2,background:i<roster.length?B.greenDark:B.sandDeep}}/>
            ))}
          </div>
        )}

        <div style={{display:"flex",background:B.sandDark,borderRadius:"10px 10px 0 0",padding:"4px 4px 0",marginLeft:-16,marginRight:-16,paddingLeft:10,paddingRight:10}}>
          {TABS.filter(t => t.id !== 4 || isAdmin).map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"7px 2px 10px",border:"none",cursor:"pointer",background:tab===t.id?B.white:"transparent",color:tab===t.id?B.greenDark:"#333333",borderRadius:"8px 8px 0 0",fontSize:9,fontFamily:"Georgia,serif",fontWeight:tab===t.id?"bold":"normal",transition:"all .15s",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <span style={{fontSize:16,lineHeight:1}}>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"14px 14px 60px"}}>

        {/* PAGINE NASCOSTE — da menu hamburger */}
        {hiddenPage&&(
          <div>
            {hiddenPage==="stats-atleti"&&isAdmin&&<StatsAtleti onBack={()=>setHiddenPage(null)} accessToken={accessToken} athletesData={athletes_data}/>}
            {hiddenPage==="stats-utenti"&&isAdmin&&<StatsUtenti onBack={()=>setHiddenPage(null)} accessToken={accessToken} athletesData={athletes_data}/>}
            {hiddenPage==="stats-awards"&&isAdmin&&<StatsAwards onBack={()=>setHiddenPage(null)} accessToken={accessToken} athletesData={athletes_data}/>}
            {hiddenPage==="profile"&&<PageProfilo authUser={authUser} isAdmin={isAdmin} joinStatus={joinStatus} teamNames={teamNames} accessToken={accessToken} leagueId={leagueId} onBack={()=>setHiddenPage(null)}/>}
            {hiddenPage==="prizes"&&<PagePremi onBack={()=>setHiddenPage(null)}/>}
            {hiddenPage==="rules"&&<PageRegole onBack={()=>setHiddenPage(null)}/>}
            {hiddenPage==="terms"&&<PageTermini onBack={()=>setHiddenPage(null)}/>}
            {hiddenPage==="history"&&<PageHistory authUser={authUser} accessToken={accessToken} leagueId={leagueId} leagues={leagues} events={events} coachesList={coachesList} athletesData={athletes_data} onBack={()=>setHiddenPage(null)}/>}         
            {hiddenPage==="formations"&&<PageLeagueFormations authUser={authUser} accessToken={accessToken} leagueId={leagueId} leagues={leagues} events={events} coachesList={coachesList} athletesData={athletes_data} onBack={()=>setHiddenPage(null)}/>}
            {hiddenPage==="risultati"&&<PageRisultati accessToken={accessToken} events={events} leagueId={leagueId} leagues={leagues} onBack={()=>setHiddenPage(null)}/>}
          </div>
    )}

        {!hiddenPage&&(<div>

        {/* TAB 0: MERCATO */}
        {tab===0&&(
          myJoin!=="APPROVED"?<JoinGate myJoin={myJoin} league={league} showJoinForm={showJoinForm} setShowJoinForm={setShowJoinForm} joinTeamName={joinTeamName} setJoinTeamName={setJoinTeamName} onJoinRequest={handleJoinRequest}/>:(
          <div>
            {/* Profilo atleta inline nel mercato */}
            {selectedAthlete?(
              <AthleteProfile a={selectedAthlete} onBack={()=>setSelectedAthlete(null)} isOwned={isOwned(selectedAthlete)} onBuy={()=>handleBuy(selectedAthlete)} onSell={()=>handleSell(selectedAthlete)} budget={budget} canTrade={canTrade()} accessToken={accessToken}/>
            ):(
            <div>
            {/* Market sub-tabs */}
            <div style={{display:"flex",gap:6,marginBottom:12}}>
              {[{id:"athletes",label:"🏐 Atleti"},{id:"coaches",label:"🧢 Coach"}].map(mt=>(
                <button key={mt.id} onClick={()=>setMarketTab(mt.id)} style={{flex:1,padding:"8px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"Georgia,serif",fontSize:13,fontWeight:marketTab===mt.id?"bold":"normal",background:marketTab===mt.id?B.greenDark:B.grayPale,color:marketTab===mt.id?B.white:B.gray}}>
                  {mt.label}
                </button>
              ))}
            </div>

            {!canTrade()&&(()=>{
              const activeTappa = events.find(e=>e.status==="In corso"&&(e.gender||"").toUpperCase()===league.gender);
              const msg = activeTappa
                ? `🔴 Mercato chiuso — ${activeTappa.name} in corso`
                : league.type==="classic"
                  ? "🔒 Classic: mercato chiuso per tutta la stagione"
                  : "🔒 Mercato chiuso — riapre lunedì 09:00";
              return <div style={{background:B.orangePale,border:`1px solid ${B.orange}44`,borderRadius:10,padding:"9px 12px",marginBottom:10,fontSize:12,color:B.orange,display:"flex",alignItems:"center",gap:8}}>{msg}</div>;
            })()}

            {marketTab==="athletes"&&(
              <div>
                <div style={{position:"relative",marginBottom:8}}>
                  <input placeholder="🔍 Cerca atleta..." value={search} onChange={e=>{setSearch(e.target.value);setVisibleCount(30);}}
                    style={{width:"100%",padding:"10px 36px 10px 14px",borderRadius:10,border:`1px solid ${B.grayLight}`,background:B.white,color:B.dark,fontSize:13,fontFamily:"Georgia,serif",outline:"none",boxSizing:"border-box"}}/>
                  {search&&(
                    <button onClick={()=>{setSearch("");setVisibleCount(30);}}
                      style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:B.gray,padding:"2px 6px",lineHeight:1}}>✕</button>
                  )}
                </div>

                <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:6,scrollbarWidth:"none",marginBottom:6}}>
                  {["Tutti",...CATEGORIES.map(c=>c.label)].map(label=>{
                    const cat=CATEGORIES.find(c=>c.label===label);
                    const active=catFilter===label;
                    return(<button key={label} onClick={()=>{setCatFilter(label);setVisibleCount(30);}} style={{flexShrink:0,padding:"5px 11px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,fontFamily:"Georgia,serif",fontWeight:active?"bold":"normal",background:active?(cat?cat.bg:B.greenDark):(cat?`${cat.bg}88`:B.grayPale),color:active?(cat?cat.text:B.white):(cat?cat.text:B.gray)}}>{label}</button>);
                  })}
                </div>

                <div style={{display:"flex",gap:5,marginBottom:12}}>
                  {PRICE_RANGES.map((pr,i)=>(
                    <button key={i} onClick={()=>{setPriceFilter(i);setVisibleCount(30);}} style={{flex:1,padding:"7px 4px",borderRadius:8,border:`1px solid ${priceFilter===i?pr.activeBg:B.creamDark}`,cursor:"pointer",fontSize:12,fontFamily:"Georgia,serif",background:priceFilter===i?pr.activeBg:pr.bg,color:priceFilter===i?pr.activeColor:pr.color,fontWeight:priceFilter===i?"bold":"normal",whiteSpace:"nowrap"}}>{pr.label}</button>
                  ))}
                </div>

                <div style={{fontSize:11,color:B.gray,marginBottom:8}}>{filtered.length} atleti{roster.length>0?` · ${roster.length} nel tuo roster`:""}</div>

                {/* Box atleti nel mio roster — sempre in cima */}
                {roster.length>0&&(
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:8}}>
                      🏖️ Nel mio roster ({roster.length}/5)
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:7}}>
                      {roster.map(a=>{
                        const cat=getCategory(a.ranking);
                        const diff=a.cost-a.prevCost;
                        return(
                          <div key={a.id} style={{background:B.greenPale,border:`1px solid ${B.greenDark}`,borderLeft:`3px solid ${B.greenDark}`,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>{setSelectedAthlete(a);setTab(0);}}>
                            <div style={{width:34,height:34,borderRadius:8,flexShrink:0,overflow:"hidden",background:B.greenDark,display:"flex",alignItems:"center",justifyContent:"center"}}>
                              {ATHLETE_PHOTOS[a.id]
                                ?<img src={ATHLETE_PHOTOS[a.id]} alt={a.name} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}}/>
                                :<span style={{color:B.white,fontWeight:"bold",fontSize:11}}>#{a.ranking}</span>
                              }
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{color:B.greenDark,fontWeight:"bold",fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div>
                              <div style={{display:"flex",gap:5,marginTop:3,alignItems:"center"}}>
                                <span style={{fontSize:10,padding:"1px 7px",borderRadius:8,background:cat.bg,color:cat.text,fontWeight:"bold"}}>{cat.label}</span>
                                {diff!==0&&<span style={{fontSize:10,color:diff>0?B.greenDark:B.orange,fontWeight:"bold"}}>{diff>0?"▲":"▼"}${Math.abs(diff)}</span>}
                                {isStarter(a)&&<span style={{fontSize:10,color:B.orange,fontWeight:"bold"}}>{isCaptain(a)?"★ Cap":"Titolare"}</span>}
                              </div>
                            </div>
                            <div style={{textAlign:"center",flexShrink:0,marginRight:4}}>
                              <div style={{color:B.orange,fontWeight:"bold",fontSize:17}}>${a.cost}</div>
                            </div>
                            <button onClick={e=>{e.stopPropagation();handleSell(a);}} style={{padding:"7px 11px",borderRadius:8,border:canTrade()?`1px solid ${B.orange}`:`1px solid ${B.grayLight}`,background:canTrade()?B.orangePale:B.grayPale,color:canTrade()?B.orange:B.gray,fontSize:11,fontWeight:"bold",cursor:"pointer",flexShrink:0,fontFamily:"Georgia,serif"}}>{canTrade()?"Vendi":"Bloccato"}</button>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{height:1,background:B.sandDeep,margin:"14px 0"}}/>
                  </div>
                )}

                <div style={{display:"flex",flexDirection:"column",gap:7}}>
                  {visibleAthletes.map(a=>{
                    const owned=isOwned(a);
                    const cat=getCategory(a.ranking);
                    const diff=a.cost-a.prevCost;
                    const canBuy=!owned&&budget>=a.cost&&roster.length<5&&canTrade();
                    return(
                      <div key={a.id} style={{background:B.white,border:`1px solid ${owned?B.greenDark:B.creamDark}`,borderLeft:`3px solid ${owned?B.greenDark:B.creamDark}`,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>{setSelectedAthlete(a);setTab(0);}}>
                        <div style={{width:34,height:34,borderRadius:8,flexShrink:0,overflow:"hidden",background:a.ranking<=3?B.yellow:a.ranking<=10?B.orange:B.greenPale,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {ATHLETE_PHOTOS[a.id]
                            ?<img src={ATHLETE_PHOTOS[a.id]} alt={a.name} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}}/>
                            :<span style={{color:a.ranking<=10?B.white:B.greenDark,fontWeight:"bold",fontSize:12}}>#{a.ranking}</span>
                          }
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:B.dark,fontWeight:"bold",fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div>
                          <div style={{display:"flex",gap:5,marginTop:3,alignItems:"center"}}>
                            <span style={{fontSize:10,padding:"1px 7px",borderRadius:8,background:cat.bg,color:cat.text,fontWeight:"bold"}}>{cat.label}</span>
                            {diff!==0&&<span style={{fontSize:10,color:diff>0?B.greenDark:B.orange,fontWeight:"bold"}}>{diff>0?"▲":"▼"}${Math.abs(diff)}</span>}
                            {a.rankDelta!==null&&a.rankDelta!==0&&<span style={{fontSize:10,color:a.rankDelta>0?B.greenDark:B.orange,fontWeight:"bold"}}>{a.rankDelta>0?"▲":"▼"}{Math.abs(a.rankDelta)} pos</span>}
                            {owned&&<span style={{fontSize:10,color:B.greenDark}}>● Roster</span>}
                          </div>
                        </div>
                        <div style={{textAlign:"center",flexShrink:0,marginRight:4}}>
                          <div style={{color:B.orange,fontWeight:"bold",fontSize:17}}>${a.cost}</div>
                        </div>
                        {owned?(
                          <button onClick={e=>{e.stopPropagation();handleSell(a);}} style={{padding:"7px 11px",borderRadius:8,border:canTrade()?`1px solid ${B.orange}`:`1px solid ${B.grayLight}`,background:canTrade()?B.orangePale:B.grayPale,color:canTrade()?B.orange:B.gray,fontSize:11,fontWeight:"bold",cursor:"pointer",flexShrink:0,fontFamily:"Georgia,serif"}}>{canTrade()?"Vendi":"Bloccato"}</button>
                        ):(
                          <button onClick={e=>{e.stopPropagation();handleBuy(a);}} style={{padding:"7px 11px",borderRadius:8,border:"none",background:canBuy?B.greenDark:B.grayPale,color:canBuy?B.white:B.gray,fontSize:11,fontWeight:"bold",cursor:"pointer",flexShrink:0,fontFamily:"Georgia,serif"}}>Acquista</button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {hasMore&&<button onClick={()=>setVisibleCount(v=>v+30)} style={{width:"100%",marginTop:12,padding:"11px",background:B.grayPale,border:`1px solid ${B.grayLight}`,borderRadius:10,color:B.gray,fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>Carica altri ({filtered.length-visibleCount})</button>}
              </div>
            )}

            {marketTab==="coaches"&&(
              <div>
                <div style={{background:B.greenPale,border:`1px solid ${B.greenDark}33`,borderRadius:10,padding:"10px 13px",marginBottom:12,fontSize:12,color:B.greenDark}}>
                  Il coach è opzionale. Se la sua coppia vince ottieni +0.5 pt per partita.
                </div>

                {currentCoach&&(
                  <div style={{background:B.yellowPale,border:`1px solid ${B.yellow}`,borderRadius:12,padding:"12px 14px",marginBottom:12}}>
                    <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:"#7A4F00",marginBottom:6}}>Il tuo Coach</div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:40,height:40,borderRadius:"50%",background:B.yellow,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🧢</div>
                      <div style={{flex:1}}>
                        <div style={{color:B.dark,fontWeight:"bold",fontSize:14}}>{currentCoach.name}</div>
                        <div style={{color:B.gray,fontSize:11}}>${currentCoach.cost} · +0.5 pt per vittoria</div>
                      </div>
                      {canSelectCoach()&&<button onClick={handleRemoveCoach} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${B.orange}`,background:B.orangePale,color:B.orange,fontSize:11,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif"}}>Rimuovi</button>}
                    </div>
                  </div>
                )}

                {/* Search coach */}
                <div style={{position:"relative",marginBottom:12}}>
                  <input placeholder="🔍 Cerca coach..." value={coachSearch} onChange={e=>setCoachSearch(e.target.value)}
                    style={{width:"100%",padding:"10px 36px 10px 14px",borderRadius:10,border:`1px solid ${B.grayLight}`,background:B.white,color:B.dark,fontSize:13,fontFamily:"Georgia,serif",outline:"none",boxSizing:"border-box"}}/>
                  {coachSearch&&(
                    <button onClick={()=>setCoachSearch("")}
                      style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:B.gray,padding:"2px 6px",lineHeight:1}}>✕</button>
                  )}
                </div>

                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {coachesList.filter(c => c.active !== false).filter(c => !coachSearch || c.name.toLowerCase().includes(coachSearch.toLowerCase())).map(c=>{
                    const isSelected = myCoach===c.id;
                    return(
                      <div key={c.id} style={{background:isSelected?B.greenPale:B.white,border:`1px solid ${isSelected?B.greenDark:B.creamDark}`,borderLeft:`3px solid ${isSelected?B.greenDark:B.creamDark}`,borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
                        <div style={{width:40,height:40,borderRadius:"50%",background:isSelected?B.greenDark:B.grayPale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🧢</div>
                        <div style={{flex:1}}>
                          <div style={{color:B.dark,fontWeight:"bold",fontSize:13}}>{c.name}</div>
                          <div style={{color:B.gray,fontSize:11,marginTop:2}}>+0.5 pt per vittoria</div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{color:B.orange,fontWeight:"bold",fontSize:16}}>${c.cost}</div>
                          {isSelected?(
                            <span style={{fontSize:10,color:B.greenDark,fontWeight:"bold"}}>✓ Scelto</span>
                          ):(
                            <button onClick={()=>handleBuyCoach(c)} style={{marginTop:4,padding:"5px 10px",borderRadius:8,border:"none",background:canSelectCoach()&&budget>=c.cost?B.greenDark:B.grayPale,color:canSelectCoach()&&budget>=c.cost?B.white:B.gray,fontSize:11,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif"}}>{canSelectCoach()?"Scegli":"Bloccato"}</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            </div>)} {/* fine !selectedAthlete */}
          </div>
          )
        )}

        {/* TAB 1: SQUADRA */}
        {tab===1&&(
          myJoin!=="APPROVED"?<JoinGate myJoin={myJoin} league={league} showJoinForm={showJoinForm} setShowJoinForm={setShowJoinForm} joinTeamName={joinTeamName} setJoinTeamName={setJoinTeamName} onJoinRequest={handleJoinRequest}/>:(
          <div>
            {/* Vista punti durante tappa in corso */}
            {(()=>{
              const activeEvent = events.find(e => e.status==="In corso" && (e.gender||"").toUpperCase()===league.gender);
              if (!activeEvent || roster.length===0) return null;

              // Carica i risultati da Supabase se non ancora caricati
              if (!matchResultsData[activeEvent.id]) {
                loadMatchResults(activeEvent.id);
                return null; // mostra niente finché non carica
              }

              const eventMatches = matchResultsData[activeEvent.id] || [];
              const et = EVENT_TYPE_META[activeEvent.type]||EVENT_TYPE_META.Silver;

              // Calcola partite di un atleta con punti per partita
              const calcPlayerMatches = (athlete) => {
                const playerMatches = eventMatches.filter(m => m.player_id === athlete.id);
                let grandTotal = 0;
                const matchResults = playerMatches.map(m => {
                  const codes = m.bonus_codes || [];
                  // Rimuovi coachWin/coachMalus dal calcolo atleta
                  // Il bonus coach viene calcolato separatamente
                  const coachWinPts = codes.includes("coachWin") ? 0.5 : 0;
                  const coachMalusPts = codes.includes("coachMalus") ? 1 : 0;
                  const totalPts = (m.base_pts || 0) + (m.bonus_pts || 0) - coachWinPts + coachMalusPts;
                  grandTotal += totalPts;
                  const baseCodes = ["win20","win21","loss12","loss02","bye","forfait","coachWin","coachMalus"];
                  const extraBonuses = codes.filter(c => !baseCodes.includes(c));
                  return {
                    phase: m.phase,
                    opponent: m.opponent || "—",
                    result: m.result || "—",
                    scoreA: m.score || "",
                    isBye: m.is_bye || false,
                    basePts: m.base_pts || 0,
                    extraBonuses,
                    extraPts: (m.bonus_pts || 0) - coachWinPts + coachMalusPts,
                    totalPts,
                  };
                });
                return { matchResults, grandTotal };
              };

              const coachOnField = coachInField[leagueId];

              return (
                <div>
                  {/* Header tappa — compatto, non ripetitivo */}
                  <div style={{background:B.greenDark,borderRadius:12,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10,color:B.white}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:"bold",fontSize:15}}>🔴 {activeEvent.name}</div>
                      <div style={{fontSize:10,color:"rgba(255,255,255,.7)",marginTop:2}}>Mercato bloccato durante la tappa</div>
                    </div>
                    <div style={{background:et.bg,color:et.color,padding:"4px 10px",borderRadius:8,fontSize:12,fontWeight:"bold"}}>×{et.weight}</div>
                  </div>

                  {/* Formazione schierata */}
                  <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:12}}>
                    <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:12}}>La tua formazione</div>
                    <div style={{display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap",marginBottom:14}}>
                      {starters.map(a=>(
                        <div key={a.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                          <AthleteAvatar athlete={a} size={64} isStarter={true} isCaptain={isCaptain(a)}/>
                          <div style={{fontSize:9,color:isCaptain(a)?B.orange:B.greenDark,fontWeight:"bold",textAlign:"center",maxWidth:64,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {isCaptain(a)&&"★ "}{a.name.split(" ")[0]}
                          </div>
                          <div style={{fontSize:8,color:B.gray}}>{getCategory(a.ranking).label}</div>
                        </div>
                      ))}
                      {/* Coach alla stessa altezza dei titolari se schierato */}
                      {currentCoach&&coachOnField&&(
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                          <div style={{width:64,height:64,borderRadius:"50%",background:B.yellowPale,border:`2px solid ${B.yellow}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🧢</div>
                          <div style={{fontSize:9,color:"#7A4F00",fontWeight:"bold",textAlign:"center",maxWidth:64,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{currentCoach.name.split(" ")[0]}</div>
                          <div style={{fontSize:8,color:B.greenDark,fontWeight:"bold"}}>Schierato</div>
                        </div>
                      )}
                      {!currentCoach&&(
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,opacity:0.4}}>
                          <div style={{width:64,height:64,borderRadius:"50%",background:B.grayPale,border:`2px dashed ${B.grayLight}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🧢</div>
                          <div style={{fontSize:8,color:B.gray}}>Nessun coach</div>
                        </div>
                      )}
                    </div>
                    {/* Panchina */}
                    {(bench.length>0||(currentCoach&&!coachOnField))&&(
                      <div>
                        <div style={{fontSize:9,color:B.gray,textAlign:"center",marginBottom:8,letterSpacing:1}}>— PANCHINA —</div>
                        <div style={{display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap"}}>
                          {bench.map(a=>(
                            <div key={a.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,opacity:0.6}}>
                              <AthleteAvatar athlete={a} size={48} isStarter={false} isCaptain={false}/>
                              <div style={{fontSize:9,color:B.gray,textAlign:"center",maxWidth:48,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name.split(" ")[0]}</div>
                            </div>
                          ))}
                          {currentCoach&&!coachOnField&&(
                            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,opacity:0.6}}>
                              <div style={{width:48,height:48,borderRadius:"50%",background:B.grayPale,border:`2px dashed ${B.grayLight}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🧢</div>
                              <div style={{fontSize:9,color:B.gray}}>{currentCoach.name.split(" ")[0]}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Legenda bonus */}
                  <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"10px 12px",marginBottom:12}}>
                    <div style={{fontSize:9,fontWeight:"bold",letterSpacing:1.5,textTransform:"uppercase",color:B.greenDark,marginBottom:6}}>Legenda bonus</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {Object.entries(BONUS_META)
                        .filter(([k]) => ["closeSet","captain","coachWin"].includes(k))
                        .map(([k,m])=>(
                          <span key={k} style={{display:"inline-flex",alignItems:"center",gap:3,background:m.bg,color:m.color,fontSize:9,padding:"2px 7px",borderRadius:20,border:`1px solid ${m.color}22`}}>
                            {m.icon} {m.pts!==undefined?(m.pts>0?`+${m.pts}`:`${m.pts}`):`×${m.mult}`} {m.label}
                          </span>
                        ))}
                    </div>
                  </div>

                  {/* Partite per atleta */}
                  {[...starters.map(a=>({...a,_isStart:true})),...bench.map(a=>({...a,_isStart:false}))].map((a,idx,arr)=>{
                    const isStart = a._isStart;
                    const showStarterLabel = isStart && idx===0;
                    const showBenchLabel = !isStart && (idx===0 || arr[idx-1]._isStart);
                    const {matchResults, grandTotal} = calcPlayerMatches(a);
                    const isCapt = isCaptain(a);
                    const totalTappa = (grandTotal * (et.weight||1) * (isCapt ? 1.3 : 1));
                    return (
                      <React.Fragment key={a.id}>
                        {showStarterLabel&&<div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:6}}>⚡ Titolari</div>}
                        {showBenchLabel&&<div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.gray,marginTop:10,marginBottom:6}}>⏸ Panchina</div>}
                        {matchResults.length===0
                          ? <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"10px 12px",marginBottom:8,opacity:0.5}}>
                              <div style={{fontSize:12,color:B.gray}}>{isCapt?"★ ":""}{a.name} — nessuna partita trovata</div>
                            </div>
                          : <div style={{background:B.white,border:`1px solid ${isStart?B.greenDark:B.creamDark}`,borderLeft:`3px solid ${isStart?B.greenDark:B.sandDeep}`,borderRadius:10,marginBottom:10,overflow:"hidden",opacity:isStart?1:0.75}}>
                              {/* Header atleta */}
                              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderBottom:`1px solid ${B.creamDark}`}}>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:13,fontWeight:"bold",color:B.dark}}>
                                    {isCapt&&<span style={{color:B.yellow,marginRight:4}}>★</span>}{a.name}
                                  </div>
                                  <div style={{fontSize:10,color:B.gray}}>#{a.ranking} · {getCategory(a.ranking).label}</div>
                                </div>
                                <div style={{textAlign:"right"}}>
                                  <div style={{fontSize:18,fontWeight:"bold",color:totalTappa>0?B.greenDark:totalTappa<0?B.orange:B.gray}}>
                                    {totalTappa>0?`+${totalTappa.toFixed(2)}`:totalTappa===0?"—":totalTappa.toFixed(2)} pt
                                  </div>
                                  {isCapt&&<div style={{fontSize:9,color:B.yellow}}>★ ×1.3 cap</div>}
                                </div>
                              </div>
                              {/* Righe partite */}
                              {matchResults.map((mr,j)=>(
                                <div key={j} style={{padding:"8px 12px",borderBottom:j<matchResults.length-1?`1px solid ${B.creamDark}`:"none"}}>
                                  {/* Riga principale: fase | risultato | avversario | punti */}
                                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                                    <div style={{fontSize:9,color:B.gray,flexShrink:0,minWidth:55}}>{mr.phase}</div>
                                    {mr.isBye
                                      ? <span style={{fontSize:12,fontWeight:"bold",color:B.greenDark,background:B.greenPale,padding:"1px 7px",borderRadius:5,flexShrink:0}}>BYE</span>
                                      : <span style={{fontSize:12,fontWeight:"bold",color:mr.result.startsWith("2")?"#065F46":"#DC2626",background:mr.result.startsWith("2")?"#D1FAE5":"#FEE2E2",padding:"1px 7px",borderRadius:5,flexShrink:0}}>{mr.result}</span>
                                    }
                                    <div style={{flex:1,fontSize:10,color:B.gray,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                      {mr.isBye?"—":mr.opponent||"—"}
                                    </div>
                                    <div style={{fontSize:13,fontWeight:"bold",color:mr.basePts>0?B.greenDark:mr.basePts===0?B.gray:B.orange,flexShrink:0,minWidth:24,textAlign:"right"}}>
                                      {mr.basePts>0?`+${mr.basePts}`:mr.basePts===0?"0":mr.basePts}
                                    </div>
                                    {mr.extraBonuses.length>0&&(
                                      <div style={{display:"flex",gap:2,flexShrink:0}}>
                                        {mr.extraBonuses.map((b,bi)=>(
                                          <span key={bi} title={`${BONUS_META[b]?.label} (${BONUS_META[b]?.pts>0?"+":""}${BONUS_META[b]?.pts})`} style={{fontSize:13}}>{BONUS_META[b]?.icon}</span>
                                        ))}
                                      </div>
                                    )}
                                    <div style={{fontSize:12,fontWeight:"bold",color:mr.totalPts>0?B.greenDark:mr.totalPts<0?B.orange:B.gray,flexShrink:0,minWidth:30,textAlign:"right",borderLeft:`1px solid ${B.creamDark}`,paddingLeft:7}}>
                                      {mr.totalPts>0?`+${mr.totalPts}`:mr.totalPts===0?"0":mr.totalPts}
                                    </div>
                                  </div>
                                  {/* Set score — grande, su riga separata */}
                                  {mr.scoreA&&!mr.isBye&&(
                                    <div style={{fontSize:14,fontWeight:"bold",color:B.dark,marginTop:4,marginLeft:62}}>{mr.scoreA}</div>
                                  )}
                                </div>
                              ))}
                              {/* Footer: totale partite → moltiplicatore → totale tappa */}
                              <div style={{background:B.sandDark,padding:"8px 12px"}}>
                                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:B.gray,marginBottom:2}}>
                                  <span>Totale partite</span>
                                  <span style={{color:B.dark,fontWeight:"bold"}}>{grandTotal>0?`+${grandTotal}`:grandTotal} pt</span>
                                </div>
                                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:B.gray,marginBottom:2}}>
                                  <span>{et.label} ×{et.weight}</span>
                                  <span style={{color:et.color,fontWeight:"bold"}}>{(grandTotal*(et.weight||1))>0?`+${(grandTotal*(et.weight||1)).toFixed(2)}`:(grandTotal*(et.weight||1)).toFixed(2)} pt</span>
                                </div>
                                {isCapt&&<div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:B.gray,marginBottom:2}}>
                                  <span>★ Capitano ×1.3</span>
                                  <span style={{color:B.yellow,fontWeight:"bold"}}>+{((grandTotal*(et.weight||1))*0.3).toFixed(2)} pt</span>
                                </div>}
                                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:"bold",paddingTop:6,borderTop:`1px solid ${B.sandDeep}`,marginTop:2}}>
                                  <span style={{color:B.dark}}>Totale tappa</span>
                                  <span style={{color:totalTappa>0?B.greenDark:totalTappa<0?B.orange:B.gray}}>
                                    {totalTappa>0?`+${totalTappa.toFixed(2)}`:totalTappa===0?"—":totalTappa.toFixed(2)} pt
                                  </span>
                                </div>
                              </div>
                            </div>
                        }
                      </React.Fragment>
                    );
                  })}

                  {/* Totale squadra */}
                  {(()=>{
                    let tot = 0;
                    starters.forEach(a => {
                      const {grandTotal} = calcPlayerMatches(a);
                      tot += grandTotal * (et.weight||1) * (isCaptain(a) ? 1.3 : 1);
                    });

                    // Punti coach — solo se schierato in campo
                    let coachPts = 0;
                    const coachBox = currentCoach ? (()=>{
                      const coachMatches = eventMatches.filter(m => m.coach_id === currentCoach.id);
                      const byMatch = {};
                      coachMatches.forEach(m => {
                        if (!byMatch[m.match_index]) byMatch[m.match_index] = m;
                      });
                      const uniqueMatches = Object.values(byMatch);
                      // Punti coach contano SOLO se schierato
                      if (coachOnField) {
                        coachPts = uniqueMatches.reduce((s, m) => {
                      if ((m.result || "").startsWith("2") || m.is_bye) return s + 0.5;
                      return s;
                        }, 0);
                       }
                      const isOnField = coachOnField;
                      return (
                        <div style={{
                          background: isOnField ? B.yellowPale : B.grayPale,
                          border: `1px solid ${isOnField ? B.yellow : B.grayLight}`,
                          borderRadius:12, overflow:"hidden", marginBottom:10,
                          opacity: isOnField ? 1 : 0.65,
                        }}>
                          <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10,
                            background: isOnField ? "rgba(245,166,35,0.15)" : "transparent"}}>
                            <span style={{fontSize:20}}>🧢</span>
                            <div style={{flex:1}}>
                              <div style={{fontSize:12,fontWeight:"bold",color:isOnField?"#7A4F00":B.gray}}>
                                {currentCoach.name}
                              </div>
                              <div style={{fontSize:10,color:isOnField?"#9A6700":B.gray}}>
                                {isOnField?"Schierato — punti conteggiati":"In panchina — punti non conteggiati"}
                              </div>
                            </div>
                            {isOnField&&<div style={{fontWeight:"bold",fontSize:16,color:coachPts>0?B.greenDark:coachPts<0?B.orange:"#7A4F00"}}>
                              {coachPts>0?`+${coachPts}`:coachPts} pt
                            </div>}
                          </div>
                          {uniqueMatches.map((m, i) => {
                            const win = (m.result || "").startsWith("2") || m.is_bye;
                            const oppParts = (m.opponent||"").split(" - ");
                            const opp1 = oppParts[0]?.split(" ").slice(0,-1).join(" ") || oppParts[0] || "—";
                            const opp2 = oppParts[1]?.split(" ").slice(0,-1).join(" ") || oppParts[1] || "";
                            return (
                              <div key={i} style={{padding:"7px 14px",borderTop:`1px solid ${isOnField?B.yellow+"44":B.grayLight}`,display:"flex",alignItems:"center",gap:8}}>
                                <span style={{fontSize:10,padding:"1px 6px",borderRadius:4,fontWeight:"bold",
                                  background:m.result?.startsWith("2")?B.greenDark:B.orange,
                                  color:B.white,flexShrink:0}}>{m.result||"—"}</span>
                                <div style={{flex:1,fontSize:11,color:B.gray}}>{m.phase} vs {opp1}{opp2?` - ${opp2}`:""}</div>
                                {isOnField&&<div style={{fontSize:11,fontWeight:"bold",
                                  color:win?B.greenDark:B.gray,flexShrink:0}}>
                                  {win?"+0.5":"0"} pt
                                </div>}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })() : null;

                    return (
                      <>
                        {/* Coach sempre PRIMA del totale */}
                        {coachBox}
                        <div style={{background:B.greenDark,borderRadius:10,padding:"14px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                          <div>
                            <div style={{color:"rgba(255,255,255,.9)",fontSize:14,fontWeight:"bold"}}>Punteggio totale</div>
                            <div style={{color:"rgba(255,255,255,.6)",fontSize:10}}>
                              Titolari · ×{et.weight} {et.label}{coachOnField&&coachPts!==0?` · Coach ${coachPts>0?"+":""}${coachPts}`:""}
                            </div>
                          </div>
                          <span style={{color:B.white,fontWeight:"bold",fontSize:24}}>
                            {(tot+coachPts)>0?`+${(tot+coachPts).toFixed(2)}`:(tot+coachPts).toFixed(2)} pt
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              );
            })()}

            <div style={{fontSize:11,color:B.gray,textAlign:"center",marginBottom:6}}>{league.name} · Deadline: giovedì 23:00</div>
            {!canTrade()&&events.find(e=>e.status==="In corso"&&(e.gender||"").toUpperCase()===league.gender)&&(
              <div style={{background:"#FEE2E2",border:"1px solid #DC262644",borderRadius:10,padding:"9px 12px",marginBottom:10,fontSize:12,color:"#DC2626",display:"flex",alignItems:"center",gap:8}}>
                <span>🔴</span><b>Tappa in corso — formazione bloccata</b>
              </div>
            )}
            <div style={{background:B.orangePale,border:`1px solid ${B.orange}44`,borderRadius:10,padding:"8px 12px",marginBottom:14,fontSize:12,color:B.orange,textAlign:"center"}}>
              Scegli 3 titolari + 1 capitano unico (×1.3 punti)
            </div>

            {roster.length===0?(
              <div style={{textAlign:"center",padding:"40px 20px",color:B.gray}}>
                <LogoIcon size={62}/>
                <div style={{marginTop:12,fontSize:15,fontWeight:"bold",color:B.greenDark}}>Roster vuoto</div>
                {canTrade()&&<button onClick={()=>setTab(0)} style={{marginTop:14,padding:"10px 24px",borderRadius:20,border:"none",background:B.greenDark,color:B.white,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif"}}>Vai al Mercato</button>}
              </div>
            ):(
              <div>
                {/* Tappa in corso → mostra punti tappa */}
                {events.some(e=>e.status==="In corso"&&(e.gender||"").toUpperCase()===league.gender)
                  ? null /* gestito dal blocco punti sopra */
                  : (
                  /* Formazione modificabile — sempre visibile se non c'è tappa in corso */
                <div>
                  {/* IN CAMPO */}
                  <div style={{marginBottom:18}}>
                  <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:12,textAlign:"center"}}>
                    ⚡ In Campo ({starters.length}/3) {captain&&"· ★ Cap: "+(roster.find(a=>a.id===captain)||{name:""}).name.split(" ")[0]}
                  </div>
                  <div style={{display:"flex",justifyContent:"center",gap:14,flexWrap:"wrap"}}>
                    {starters.map(a=>(
                      <div key={a.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                        <AthleteAvatar athlete={a} size={72} isStarter={true} isCaptain={isCaptain(a)}/>
                        <div style={{fontSize:9,color:B.gray,textAlign:"center",maxWidth:72,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name.split(" ").slice(-1)[0]}</div>
                        <div style={{display:"flex",gap:4}}>
                          <button onClick={()=>toggleStarter(a)} style={{padding:"2px 7px",borderRadius:7,border:`1px solid ${B.orange}`,background:B.orangePale,color:B.orange,fontSize:9,cursor:"pointer",fontFamily:"Georgia,serif"}}>↓</button>
                          <button onClick={()=>toggleCaptain(a)} style={{padding:"2px 7px",borderRadius:7,border:"none",cursor:"pointer",background:isCaptain(a)?B.orange:B.grayPale,color:isCaptain(a)?B.white:B.gray,fontSize:9,fontFamily:"Georgia,serif"}}>
                            {isCaptain(a)?"★ Cap":"Cap?"}
                          </button>
                        </div>
                      </div>
                    ))}
                    {Array.from({length:Math.max(0,3-starters.length)}).map((_,i)=>(
                      <div key={i} style={{width:72,height:72,borderRadius:"50%",border:`2px dashed ${B.grayLight}`,display:"flex",alignItems:"center",justifyContent:"center",color:B.grayLight,fontSize:24}}>+</div>
                    ))}
                  </div>
                  </div>

                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                  <div style={{flex:1,height:1,background:B.creamDark}}/>
                  <span style={{fontSize:10,color:B.gray,letterSpacing:1,textTransform:"uppercase"}}>Panchina</span>
                  <div style={{flex:1,height:1,background:B.creamDark}}/>
                </div>

                <div style={{display:"flex",justifyContent:"center",gap:14,flexWrap:"wrap",marginBottom:18}}>
                  {bench.map(a=>(
                    <div key={a.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                      <AthleteAvatar athlete={a} size={64} isStarter={false} isCaptain={false}/>
                      <div style={{fontSize:9,color:B.gray,textAlign:"center",maxWidth:64,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name.split(" ").slice(-1)[0]}</div>
                      <button onClick={()=>toggleStarter(a)} style={{padding:"2px 10px",borderRadius:7,border:"none",background:B.greenDark,color:B.white,fontSize:9,cursor:"pointer",fontFamily:"Georgia,serif"}}>▲ Titolare</button>
                    </div>
                  ))}
                </div>

                {/* Coach */}
                {currentCoach&&(
                  <div style={{background:B.yellowPale,border:`1px solid ${B.yellow}44`,borderRadius:10,padding:"10px 13px",marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:20}}>🧢</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:"bold",color:B.dark}}>Coach: {currentCoach.name}</div>
                        <div style={{fontSize:10,color:B.gray}}>+0.5 pt per ogni vittoria se schierato</div>
                      </div>
                      {/* Toggle schierato/panchina — sempre disponibile se non tappa In corso */}
                      <button onClick={async ()=>{
                        if (tappaInCorso2026 || isDeadlinePassed()) return;
                        const newVal = !coachInField[leagueId];
                        setCoachInField(cf=>({...cf,[leagueId]:newVal}));
                        try {
                          const db = await supabase.from("coach_selections", accessToken);
                          await db.update({in_field: newVal}, `user_id=eq.${authUser.id}&league_id=eq.${leagueId}`);
                        } catch(e) { console.warn("Errore salvataggio in_field:", e); }
                      }}
                        style={{padding:"5px 10px",borderRadius:8,border:"none",cursor:canTrade()?"pointer":"default",fontFamily:"Georgia,serif",fontSize:10,fontWeight:"bold",
                          background:coachInField[leagueId]?B.greenDark:B.grayPale,
                          color:coachInField[leagueId]?B.white:B.gray}}>
                        {coachInField[leagueId]?"✓ Schierato":"⏸ Panchina"}
                      </button>
                    </div>
                    {!coachInField[leagueId]&&(
                      <div style={{fontSize:10,color:B.orange,marginTop:6,paddingTop:6,borderTop:`1px solid ${B.yellow}44`}}>
                        ⚠️ Coach in panchina — nessun bonus, ma anche nessun malus se assente
                      </div>
                    )}
                  </div>
                )}

                <div style={{background:B.grayPale,borderRadius:10,padding:"11px 13px",fontSize:12,color:B.gray,lineHeight:1.7,marginBottom:12}}>
                  <b style={{color:B.dark}}>Come funziona:</b><br/>
                  Premi ▲ per portare un atleta in campo (max 3).<br/>
                  Premi ★ per nominarlo <b>capitano unico</b> (punti ×1.3).<br/>
                  Salva entro giovedì 23:00.
                </div>

                <button onClick={canSaveFormation()?handleSaveFormation:()=>showNotif("Tappa in corso — formazione bloccata","error")}
                  style={{width:"100%",padding:"13px",background:!canSaveFormation()?"#DC2626":roster.length===5&&lineup.length===3&&captain?B.greenDark:B.grayLight,border:"none",borderRadius:12,color:!canSaveFormation()||roster.length===5&&lineup.length===3&&captain?B.white:B.gray,fontWeight:"bold",fontSize:15,cursor:"pointer",fontFamily:"Georgia,serif"}}>
                  {!canSaveFormation()?"🔴 Tappa in corso":roster.length<5?`⚠️ Roster (${roster.length}/5)`:lineup.length<3?`Schiera titolari (${lineup.length}/3)`:!captain?"★ Nomina il capitano":"Salva Formazione ✓"}
                </button>
                </div>
                  )}
              </div>
            )}
          </div>
          )
        )}

        {/* TAB 2: CLASSIFICA */}
        {tab===2&&(
          <div>
            <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"12px 14px",marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:10}}>🏆 Premi {league.name}</div>
              {PRIZES.map((p,i)=>{
                const leagueCount = leagueUserCounts[league.id] || 0;
                const unlocked = leagueCount >= p.threshold;
                return(<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",opacity:unlocked?1:0.45,borderBottom:i<PRIZES.length-1?`1px solid ${B.creamDark}`:"none"}}>
                  <span style={{fontSize:20}}>{p.icon}</span>
                  <div style={{flex:1}}><div style={{fontSize:12,fontWeight:"bold",color:B.dark}}>{p.name}</div><div style={{fontSize:10,color:B.gray}}>{p.pos} posto · {p.threshold}+ utenti</div></div>
                  {unlocked?<span style={{fontSize:10,padding:"2px 8px",borderRadius:8,background:B.greenPale,color:B.greenDark,fontWeight:"bold"}}>✓</span>:<span style={{fontSize:10,color:B.gray}}>{leagueCount}/{p.threshold}</span>}
                </div>);
              })}
            </div>

            <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:10}}>Classifica {league.name}</div>
            <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:18}}>
              {standingsLoading ? (
                <div style={{textAlign:"center",padding:"20px",color:B.gray,fontSize:12}}>⏳ Caricamento classifica...</div>
              ) : leagueStandings.length === 0 ? (
                <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"20px",textAlign:"center"}}>
                  <div style={{fontSize:28,marginBottom:8}}>🏖️</div>
                  <div style={{fontSize:13,fontWeight:"bold",color:B.dark,marginBottom:4}}>Nessun risultato ancora</div>
                  <div style={{fontSize:11,color:B.gray}}>La classifica si aggiornerà dopo la prima tappa disputata.</div>
                </div>
              ) : leagueStandings.map(s=>{
                const myUsername = authUser?.user_metadata?.username || authUser?.email?.split("@")[0];
                const isMe = s.user === myUsername;
                return(
                  <div key={s.user_id} style={{background:isMe?B.greenPale:B.white,border:`1px solid ${isMe?B.greenDark:B.creamDark}`,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:30,height:30,borderRadius:8,flexShrink:0,background:s.rank===1?B.yellow:s.rank===2?B.grayLight:s.rank===3?"#CD7F32":B.grayPale,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold",fontSize:s.rank<=3?14:12}}>
                      {s.rank<=3?["🥇","🥈","🥉"][s.rank-1]:s.rank}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{color:isMe?B.greenDark:B.dark,fontWeight:"bold",fontSize:13}}>{s.team}{isMe&&" ⭐"}</div>
                      <div style={{color:B.gray,fontSize:11}}>@{s.user} · {s.budget}$ rimasti</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{color:s.rank===1?B.orange:B.dark,fontWeight:"bold",fontSize:20}}>{s.pts}</div>
                      <div style={{color:B.gray,fontSize:9}}>punti</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"12px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.orange}}>🔥 Combo</div>
                <span style={{fontSize:10,color:B.gray}}>{combo.length} giocatori</span>
              </div>
              {combo.length === 0 ? (
                <div style={{textAlign:"center",padding:"12px",color:B.gray,fontSize:11}}>Nessun giocatore iscritto a più leghe ancora.</div>
              ) : combo.map(s=>{
                const myUsername2=authUser?.user_metadata?.username||authUser?.email?.split("@")[0];
                const isMe=s.user===myUsername2;
                return(
                  <div key={s.user} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${B.creamDark}`}}>
                    <div style={{width:22,textAlign:"center",color:B.gray,fontWeight:"bold",fontSize:13}}>{s.rank}</div>
                    <div style={{flex:1}}>
                      <div style={{color:isMe?B.greenDark:B.dark,fontWeight:isMe?"bold":"normal",fontSize:13}}>@{s.user}{isMe&&" ⭐"}</div>
                      <div style={{color:B.gray,fontSize:10}}>{s.leagues} leghe</div>
                    </div>
                    <div style={{color:B.orange,fontWeight:"bold",fontSize:16}}>{s.pts}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: ATLETA */}
        {/* TAB 3: CALENDARIO */}
        {tab===3&&(
          <div>
            {selectedEvent?(
              <EventDetail
                event={selectedEvent}
                onBack={()=>setSelectedEvent(null)}
                myRoster={roster}
                matchResults={matchResultsData[selectedEvent.id]}
                onLoad={()=>loadMatchResults(selectedEvent.id)}
                athletes={athletes_data}/>
            ):(
              <div>
                {/* Filtro genere automatico dalla lega selezionata */}
                {(() => {
                  const leagueGender = league.gender; // "F" o "M"
                  const filteredEvents = events.filter(e => {
                    if ((e.anno || 2026) !== 2026) return false; // solo 2026
                    const eg = (e.gender||"").toUpperCase();
                    if (eg === "F" || eg === "FEMMINILE") return leagueGender === "F";
                    if (eg === "M" || eg === "MASCHILE")  return leagueGender === "M";
                    return true;
                  });
                  return (
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                        <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark}}>Stagione 2026</div>
                        <span style={{fontSize:10,padding:"2px 8px",borderRadius:8,background:leagueGender==="F"?B.orangePale:B.greenPale,color:leagueGender==="F"?B.orange:B.greenDark,fontWeight:"bold"}}>{leagueGender==="F"?"♀ Femminile":"♂ Maschile"}</span>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {filteredEvents.length===0
                          ? <div style={{textAlign:"center",padding:30,color:B.gray}}>
                              <div style={{fontSize:32,marginBottom:8}}>📅</div>
                              <div style={{fontSize:13,fontWeight:"bold",color:B.dark}}>Nessuna tappa disponibile</div>
                              <div style={{fontSize:11,color:B.gray,marginTop:4}}>Le tappe appariranno qui quando programmate.</div>
                            </div>
                          : filteredEvents.map(e=>{
                            const et = EVENT_TYPE_META[e.type]||EVENT_TYPE_META.Silver;
                            const isPlanned = e.status === "Planned";
                            const isClickable = !isPlanned; // solo Completato o In corso
                            return (
                              <div key={e.id}
                                onClick={isClickable
                                  ? ()=>{
                                      // Forza ricaricamento pulito ad ogni click
                                      setMatchResultsData(prev => {
                                        const next = {...prev};
                                        delete next[e.id];
                                        return next;
                                      });
                                      setSelectedEvent(e);
                                    }
                                  : ()=>setPopup({
                                      title:"Tappa non ancora disputata",
                                      msg:`${e.name} (${e.date}) non è ancora stata giocata. I risultati saranno disponibili dopo l'inserimento dei dati ufficiali.`,
                                      confirm:"Ok",
                                      onConfirm:()=>setPopup(null),
                                      onCancel:null,
                                    })
                                }
                                style={{background:B.cream,
                                  border:`1px solid ${e.status==="In corso"?B.orange:B.creamDark}`,
                                  borderLeft:`4px solid ${isPlanned?B.grayLight:et.color}`,
                                  borderRadius:10,padding:"12px 14px",
                                  cursor:isClickable?"pointer":"default",
                                  opacity:isPlanned?0.65:1,
                                  display:"flex",alignItems:"center",gap:12}}>
                                <div style={{width:52,height:52,borderRadius:10,flexShrink:0,
                                  background:isPlanned?B.sandDeep:et.bg,display:"flex",flexDirection:"column",
                                  alignItems:"center",justifyContent:"center",gap:1}}>
                                  <span style={{fontSize:9,fontWeight:"bold",color:isPlanned?B.gray:et.color,textAlign:"center",lineHeight:1.2}}>{et.label}</span>
                                  <span style={{fontSize:14,fontWeight:"900",color:isPlanned?B.gray:et.color}}>×{et.weight}</span>
                                </div>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{color:B.dark,fontWeight:"bold",fontSize:14}}>{e.name}</div>
                                  <div style={{color:B.gray,fontSize:11,marginTop:2}}>{e.date}{e.location?` · ${e.location}`:""}</div>
                                </div>
                                <span style={{fontSize:11,padding:"4px 10px",borderRadius:20,fontWeight:"bold",flexShrink:0,
                                  background:e.status==="Completato"?B.greenPale:e.status==="In corso"?B.orangePale:B.sandDeep,
                                  color:e.status==="Completato"?B.greenDark:e.status==="In corso"?B.orange:B.gray}}>
                                  {e.status==="In corso"?"🔴 In corso":e.status==="Completato"?"✓ Concluso":"📅 Pianificata"}
                                </span>
                              </div>
                            );
                          })
                        }
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ADMIN */}
        {tab===4&&isAdmin&&(
          <div>
            <div style={{background:B.orangePale,border:`1px solid ${B.orange}44`,borderRadius:10,padding:"9px 13px",marginBottom:14,fontSize:12,color:B.orange,textAlign:"center",fontWeight:"bold"}}>🔐 Pannello Admin</div>

            {/* Card statistiche reali */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"12px 10px",textAlign:"center"}}>
                <span style={{fontSize:20}}>👥</span>
                <div style={{color:B.orange,fontWeight:"bold",fontSize:22,marginTop:4}}>{totalUsers}</div>
                <div style={{color:B.gray,fontSize:11}}>Utenti</div>
              </div>
              <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"12px 10px",textAlign:"center"}}>
                <span style={{fontSize:20}}>🏖️</span>
                <div style={{color:B.orange,fontWeight:"bold",fontSize:22,marginTop:4}}>{totalSquads}</div>
                <div style={{color:B.gray,fontSize:11}}>Squadre create</div>
              </div>
              {/* Top 3 atlete F più comprate */}
              <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"12px 10px",gridColumn:"1/-1"}}>
                <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:8}}>♀ Atlete F più comprate</div>
                {topF.length===0?<div style={{color:B.gray,fontSize:11}}>Nessun dato</div>:topF.map((a,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderBottom:i<topF.length-1?`1px solid ${B.creamDark}`:"none"}}>
                    <span style={{color:B.orange,fontWeight:"bold",fontSize:13,width:16}}>{i+1}.</span>
                    <span style={{flex:1,fontSize:12,color:B.dark}}>{a.name}</span>
                    <span style={{fontSize:11,color:B.gray}}>{a.count} roster</span>
                  </div>
                ))}
              </div>
              {/* Top 3 atleti M più comprati */}
              <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"12px 10px",gridColumn:"1/-1"}}>
                <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:8}}>♂ Atleti M più comprati</div>
                {topM.length===0?<div style={{color:B.gray,fontSize:11}}>Nessun dato</div>:topM.map((a,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderBottom:i<topM.length-1?`1px solid ${B.creamDark}`:"none"}}>
                    <span style={{color:B.orange,fontWeight:"bold",fontSize:13,width:16}}>{i+1}.</span>
                    <span style={{flex:1,fontSize:12,color:B.dark}}>{a.name}</span>
                    <span style={{fontSize:11,color:B.gray}}>{a.count} roster</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Richieste iscrizione */}
            <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"12px 14px",marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:10}}>
                Richieste Iscrizione {pendingRequests.length>0&&<span style={{background:B.orange,color:B.white,borderRadius:20,padding:"1px 8px",fontSize:10,marginLeft:6}}>{pendingRequests.length}</span>}
              </div>
              {pendingRequests.length===0?(
                <div style={{color:B.gray,fontSize:12,textAlign:"center",padding:"10px 0"}}>Nessuna richiesta in attesa ✓</div>
              ):pendingRequests.map((req,i)=>(
                <div key={req.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:i<pendingRequests.length-1?`1px solid ${B.creamDark}`:"none"}}>
                  <div style={{flex:1}}>
                    <div style={{color:B.dark,fontWeight:"bold",fontSize:13}}>{req.team_name||"—"}</div>
                    <div style={{color:B.gray,fontSize:11}}>{req.username} · {req.league_id}</div>
                  </div>
                  <button onClick={async()=>{
                    try {
                      const db = await supabase.from("user_leagues",accessToken);
                      await db.update({status:"approved"},`id=eq.${req.id}`);
                      // Invia notifica all'utente approvato
                      try {
                        const ndb = await supabase.from("notifications", accessToken);
                        await ndb.insert({
                          user_id: req.user_id,
                          type: "approved",
                          message: `✅ Iscrizione alla lega ${{"L001-F":"Classic Femminile","L001-M":"Classic Maschile","L002-F":"Market Femminile","L002-M":"Market Maschile"}[req.league_id]||req.league_id} approvata! Puoi ora acquistare atleti.`,
                        });
                      } catch(e) { /* silenzioso */ }
                      setPendingRequests(r=>r.filter(x=>x.id!==req.id));
                      setTotalSquads(s=>s+1);
                      showNotif(`${req.username} approvato! ✓`);
                    } catch(e){ showNotif("Errore approvazione","error"); }
                  }} style={{padding:"6px 12px",borderRadius:8,border:"none",background:B.greenPale,color:B.greenDark,fontSize:12,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif"}}>✓ Ok</button>
                  <button onClick={async()=>{
                    try {
                      const db = await supabase.from("user_leagues",accessToken);
                      await db.update({status:"rejected"},`id=eq.${req.id}`);
                      // Notifica all'utente del rifiuto
                      try {
                        const ndb = await supabase.from("notifications", accessToken);
                        const lgName = {"L001-F":"Classic Femminile","L001-M":"Classic Maschile","L002-F":"Market Femminile","L002-M":"Market Maschile"}[req.league_id]||req.league_id;
                        await ndb.insert({
                          user_id: req.user_id,
                          type: "rejected",
                          message: `❌ La tua richiesta di iscrizione alla lega ${lgName} non è stata accettata. Contatta l'admin per info.`,
                        });
                      } catch(e) { /* silenzioso */ }
                      setPendingRequests(r=>r.filter(x=>x.id!==req.id));
                      showNotif(`${req.username} rifiutato`,"error");
                    } catch(e){ showNotif("Errore rifiuto","error"); }
                  }} style={{padding:"6px 12px",borderRadius:8,border:"none",background:B.orangePale,color:B.orange,fontSize:12,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif"}}>✗ No</button>
                </div>
              ))}
            </div>

            {/* Sblocco premi per lega */}
            <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"12px 14px",marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:12}}>Sblocco Premi per Lega</div>
              {[
                {id:"L001-F",label:"Classic F",threshold:25,combo:false},
                {id:"L001-M",label:"Classic M",threshold:25,combo:false},
                {id:"L002-F",label:"Market F", threshold:25,combo:false},
                {id:"L002-M",label:"Market M", threshold:25,combo:false},
                {id:"COMBO",  label:"Combo",    threshold:30,combo:true},
              ].map((lg,i)=>{
                const count = leagueUserCounts[lg.id]||0;
                const prizes = lg.combo
                  ? [{t:30,icon:"🎧",name:"Super Premio"}]
                  : [{t:10,icon:"🎒",name:"Borsone"},{t:18,icon:"👕",name:"Canotta"},{t:25,icon:"🎧",name:"AirPods"}];
                return(
                  <div key={lg.id} style={{marginBottom:i<4?14:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <span style={{fontSize:12,fontWeight:"bold",color:B.dark}}>{lg.label}</span>
                      <span style={{fontSize:11,color:B.gray}}>{count}/{lg.threshold} utenti</span>
                    </div>
                    <div style={{height:5,background:B.grayPale,borderRadius:3,marginBottom:5,position:"relative"}}>
                      <div style={{height:"100%",borderRadius:3,width:`${Math.min(100,(count/lg.threshold)*100)}%`,background:count>=lg.threshold?B.greenDark:B.orange,transition:"width .4s"}}/>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      {prizes.map((p,j)=>(
                        <div key={j} style={{flex:1,background:count>=p.t?B.greenPale:B.grayPale,borderRadius:8,padding:"5px 6px",textAlign:"center",border:`1px solid ${count>=p.t?B.greenDark+"44":B.creamDark}`}}>
                          <div style={{fontSize:14}}>{p.icon}</div>
                          <div style={{fontSize:9,color:count>=p.t?B.greenDark:B.gray,fontWeight:count>=p.t?"bold":"normal"}}>{p.t}+</div>
                          <div style={{fontSize:9,color:count>=p.t?B.greenDark:B.gray}}>{p.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>


            {/* Pulsanti azioni con stato dinamico */}
            {[
              {
                icon:"🏪",
                title:"Mercato Market",
                desc:`Compravendite — attualmente ${leagues.find(l=>l.id==="L002-F")?.marketOpen?"aperto":"chiuso"}`,
                isOpen: leagues.find(l=>l.id==="L002-F")?.marketOpen,
                action: async () => {
                  const newMarket = !leagues.find(l=>l.id==="L002-F")?.marketOpen;
                  setLeagues(ls=>ls.map(l=>l.type==="market"?{...l,marketOpen:newMarket}:l));
                  showNotif(`Mercato Market ${newMarket?"aperto":"chiuso"}!`);
                  try {
                    const db = await supabase.from("league_settings", accessToken);
                    for (const lid of ["L002-F","L002-M"]) {
                      await db.upsert({league_id:lid,market_open:newMarket,updated_at:new Date().toISOString()},"league_id");
                    }
                  } catch(e) { console.warn("Errore salvataggio settings:", e); }
                }
              },
              {
                icon:"🔄",
                title:"Ranking FIPAV",
                desc: syncLoading
                  ? "⏳ Sincronizzazione in corso..."
                  : `Ultimo aggiornamento: ${lastSyncFipav||"mai"} ${lastSyncFipavOk===true?"✓":lastSyncFipavOk===false?"✗ Errore":""}`,
                isOpen: null,
                action: async () => {
                  if (syncLoading) return;
                  setSyncLoading(true);
                  try {
                    const res = await fetch("/.netlify/functions/sync");
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    if (data.error) throw new Error(data.error);

                    const newWomen = data.women?.length > 0 ? data.women.map(enrichAthlete) : athletes_data.women;
                    const newMen   = data.men?.length   > 0 ? data.men.map(enrichAthlete)   : athletes_data.men;

                    // Salva in cache e aggiorna state
                    cacheAthletes(data.women || [], data.men || []);
                    setAthletesData({ women: newWomen, men: newMen });

                    // Aggiorna eventi e coach da Supabase senza reload
                    if (accessToken && authUser) {
                      try {
                        const [evRes, coachRes] = await Promise.all([
                          supabase.from("events", accessToken).then(db => db.select("*", "&order=anno.asc,id.asc")),
                          supabase.from("coaches", accessToken).then(db => db.select("*", "&active=eq.true&order=cost.desc,name.asc")),
                        ]);
                        if (Array.isArray(evRes) && evRes.length > 0) {
                          const newEvents = evRes.map(e => ({ ...e, date: e.date_start || "" }));
                          // Controlla se qualche tappa è passata a Completato
                          const justCompleted = newEvents.filter(e =>
                            e.status === "Completato" &&
                            events.find(old => old.id === e.id && old.status !== "Completato")
                          );
                          if (justCompleted.length > 0 && accessToken) {
                            try {
                              const ndb = await supabase.from("notifications", accessToken);
                              for (const ev of justCompleted) {
                                await ndb.insert({
                                  user_id: null,
                                  type: "scores_ready",
                                  message: `🏆 ${ev.name} completata! I punteggi sono ora disponibili in classifica.`,
                                });
                              }
                            } catch(e) { /* silenzioso */ }
                          }
                          setEvents(newEvents);
                        }
                        if (Array.isArray(coachRes) && coachRes.length > 0)
                          setCoachesList(coachRes.filter(c => c.active !== false).map(c => ({ ...c, athletes: [] })));
                      } catch(e) { console.warn("Refresh eventi/coach:", e.message); }
                    }

                    const now = new Date().toLocaleString("it-IT", {
                      day:"2-digit", month:"2-digit",
                      hour:"2-digit", minute:"2-digit"
                    });
                    setLastSyncFipav(now);
                    setLastSyncFipavOk(true);
                    showNotif(`✓ Ranking aggiornato! ${newWomen.length}F + ${newMen.length}M atleti`);
                  } catch(e) {
                    console.error("Sync error:", e);
                    setLastSyncFipavOk(false);
                    showNotif("Errore sincronizzazione: " + e.message, "error");
                  }
                  setSyncLoading(false);
                }
              },
              {
                icon:"🏆",
                title:"Risultati Tappa",
                desc: syncResultsLoading
                  ? "⏳ Calcolo punti in corso..."
                  : `Ultimo caricamento: ${lastSyncResults||"mai"} ${lastSyncResultsOk===true?"✓":lastSyncResultsOk===false?"✗ Errore":""}`,
                isOpen: null,
                action: async () => {
                  if (syncResultsLoading) return;
                  // Chiede quale evento sincronizzare
                  const eventsInCorso = events.filter(e => e.status === "In corso" || e.status === "Completato");
                  const eventId = window.prompt(
                    `Quale evento sincronizzare?\n\n` +
                    eventsInCorso.map(e => `${e.id} — ${e.name} (${e.status})`).join("\n") +
                    "\n\nScrivi l'Event ID (es. E0004) oppure lascia vuoto per tutti:"
                  );
                  if (eventId === null) return; // ha premuto Annulla
                  setSyncResultsLoading(true);
                  try {
                    const body = eventId.trim() ? { event_id: eventId.trim() } : {};
                    const res = await fetch("/.netlify/functions/sync-results", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(body),
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    if (data.error) throw new Error(data.error);

                    const now = new Date().toLocaleString("it-IT", {
                      day:"2-digit", month:"2-digit",
                      hour:"2-digit", minute:"2-digit"
                    });
                    setLastSyncResults(now);
                    setLastSyncResultsOk(true);

                    // Salva snapshot classifica per le frecce ▲▼
                    const eventIdSynced = body?.event_id;
                    if (eventIdSynced) {
                      try {
                        const snapDb = await supabase.from("", accessToken); // usa RPC
                        await fetch(`${SUPABASE_URL}/rest/v1/rpc/save_standings_snapshot`, {
                          method: "POST",
                          headers: {
                            "apikey": SUPABASE_ANON,
                            "Authorization": `Bearer ${accessToken}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({ p_event_id: eventIdSynced }),
                        });
                      } catch(e) { console.warn("Snapshot classifica fallito:", e.message); }
                    }
                    // Ricarica classifica (forza aggiornamento cache)
                    loadStandings(accessToken, true);
                    // Reset cache partite così si ricaricano al prossimo click
                    setMatchResultsData({});

                    const msg = `✓ ${data.resultsGenerated} risultati salvati (${data.matchesProcessed} partite)`;
                    showNotif(msg);
                    // Notifica globale punteggi disponibili
                    try {
                      const ndb = await supabase.from("notifications", accessToken);
                      await ndb.insert({
                        user_id: null, // globale per tutti
                        type: "scores_ready",
                        message: `🏆 Punteggi aggiornati! I risultati della tappa sono disponibili.`,
                      });
                    } catch(e) { /* silenzioso */ }
                    if (data.warnings && data.warnings.length > 0) {
                      console.warn("Sync warnings:", data.warnings);
                      setTimeout(() => showNotif(`⚠️ ${data.warnings.length} warning — vedi console`, "error"), 2000);
                    }
                  } catch(e) {
                    console.error("Sync results error:", e);
                    setLastSyncResultsOk(false);
                    showNotif("Errore sync risultati: " + e.message, "error");
                  }
                  setSyncResultsLoading(false);
                }
              }
            ].map((item,i)=>(
              <div key={i} style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"11px 13px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:22,flexShrink:0}}>{item.icon}</span>
                <div style={{flex:1}}>
                  <div style={{color:B.dark,fontWeight:"bold",fontSize:13}}>{item.title}</div>
                  <div style={{color:B.gray,fontSize:11,marginTop:1}}>{item.desc}</div>
                </div>
                {item.isOpen!==null?(
                  <button onClick={item.action} style={{padding:"7px 14px",borderRadius:8,border:"none",
                    background:item.isOpen?"#FEE2E2":"#D1FAE5",
                    color:item.isOpen?"#DC2626":"#065F46",
                    fontSize:11,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif",flexShrink:0,minWidth:64}}>
                    {item.isOpen?"Chiudi":"Apri"}
                  </button>
                ):(
                  <button onClick={item.action} disabled={item.title==="Ranking FIPAV"?syncLoading:item.title==="Risultati Tappa"?syncResultsLoading:false}
                    style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${B.grayLight}`,
                    background:B.greenPale,color:B.greenDark,
                    fontSize:11,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif",flexShrink:0}}>
                    {item.title==="Ranking FIPAV" && syncLoading ? "..." : item.title==="Risultati Tappa" && syncResultsLoading ? "..." : "Sync"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        </div>)} {/* fine !hiddenPage */}
      </div>


      {/* HAMBURGER MENU */}
      {showMenu&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex"}}>
          <div onClick={()=>{setShowMenu(false);setMenuSection(null);}} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)"}}/>
          <div style={{position:"relative",width:300,maxWidth:"85vw",height:"100%",background:B.cream,overflowY:"auto",display:"flex",flexDirection:"column"}}>
            <div style={{background:B.sandDark,padding:"20px 16px 14px",borderBottom:`1px solid ${B.sandDeep}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <LogoFull height={42}/>
                <button onClick={()=>{setShowMenu(false);setMenuSection(null);}} style={{width:30,height:30,borderRadius:"50%",border:`1px solid ${B.sandDeep}`,background:B.white,cursor:"pointer",fontSize:14,color:B.gray,fontFamily:"Georgia,serif"}}>x</button>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:42,height:42,borderRadius:"50%",background:B.greenDark,display:"flex",alignItems:"center",justifyContent:"center",color:B.white,fontWeight:"bold",fontSize:17}}>
                  {(authUser?.email||"?")[0].toUpperCase()}
                </div>
                <div>
                  <div style={{fontWeight:"bold",color:B.dark,fontSize:14}}>{authUser?.user_metadata?.username||authUser?.email?.split("@")[0]||"Utente"}</div>
                  <div style={{color:B.gray,fontSize:11}}>{isAdmin?"Admin 🔐":"Giocatore"} · {Object.values(joinStatus).filter(s=>s==="APPROVED").length} leghe</div>
                </div>
              </div>
            </div>

            <div style={{padding:"8px 0",flex:1}}>
                {[
                  {icon:"👤", label:"Il mio profilo",  sub:"Dati e squadre",          sec:"profile"},
                  {icon:"📊", label:"Storico Tappe", sub:"Punti per tappa e formazione", sec:"history"},
                 {icon:"👥", label:"Formazioni di Lega", sub:"Le formazioni di tutti, per tappa", sec:"formations"},
                  {icon:"🏟️", label:"Risultati Tappa", sub:"Partite reali del torneo", sec:"risultati"},
                  {icon:"🏆", label:"Premi",            sub:"Cosa vinci e scalatura",   sec:"prizes"},
                  {icon:"📋", label:"Regole di gioco",  sub:"Punti, bonus e malus",     sec:"rules"},
                  {icon:"📅", label:"Calendario",       sub:"9 tappe 2026",             sec:"cal"},
                  {icon:"📄", label:"Termini",          sub:"Regolamento ufficiale",    sec:"terms"},
                  ...(isAdmin?[
                    {icon:"🏐", label:"Stats Atleti",   sub:"Performance e ownership",  sec:"stats-atleti"},
                    {icon:"👥", label:"Stats Utenti",   sub:"Guru, Trader, Casinò",     sec:"stats-utenti"},
                    {icon:"🏅", label:"Awards",         sub:"Bandit, Scam, Gem...",     sec:"stats-awards"},
                  ]:[]),
                ].map((item,i)=>(
                  <button key={i} onClick={()=>{
                    if (item.sec==="cal") { setTab(3); setShowMenu(false); setHiddenPage(null); }
                    else { setHiddenPage(item.sec); setShowMenu(false); }
                  }}
                    style={{width:"100%",padding:"12px 16px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"Georgia,serif",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${B.sandDeep}`,textAlign:"left"}}>
                    <div style={{width:36,height:36,borderRadius:10,background:item.sec?.startsWith("stats")?"#FDF0EB":B.greenPale,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontSize:18}}>{item.icon}</span>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{color:item.sec?.startsWith("stats")?"#E8541A":B.dark,fontWeight:"bold",fontSize:13}}>{item.label}</div>
                      <div style={{color:B.gray,fontSize:11,marginTop:1}}>{item.sub}</div>
                    </div>
                    <span style={{color:B.grayLight,fontSize:12}}>›</span>
                  </button>
                ))}
                <button onClick={()=>{setShowMenu(false);onLogout();}}
                  style={{width:"100%",padding:"12px 16px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"Georgia,serif",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${B.sandDeep}`,textAlign:"left"}}>
                  <div style={{width:36,height:36,borderRadius:10,background:B.orangePale,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:18}}>🚪</span>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{color:B.orange,fontWeight:"bold",fontSize:13}}>Logout</div>
                    <div style={{color:B.gray,fontSize:11,marginTop:1}}>Esci dall'account</div>
                  </div>
                </button>
              </div>

          </div>
        </div>
      )}

      <style>{`*{box-sizing:border-box;}button,input,select{font-family:Georgia,serif;}input::placeholder{color:${B.grayLight};}::-webkit-scrollbar{display:none;}`}</style>
    </div>
  );
}

// ─── HELPER PAGINE MENU ───────────────────────────────────────
function MenuPage({ title, emoji, onBack, children }) {
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <button onClick={onBack} style={{background:B.grayPale,border:"none",color:B.gray,padding:"7px 14px",borderRadius:20,cursor:"pointer",fontSize:12,fontFamily:"Georgia,serif"}}>← Indietro</button>
        <span style={{fontSize:20}}>{emoji}</span>
        <div style={{fontWeight:"bold",fontSize:17,color:B.dark}}>{title}</div>
      </div>
      {children}
    </div>
  );
}

// ─── PAGINA PROFILO ───────────────────────────────────────────
function PageProfilo({ authUser, isAdmin, joinStatus, teamNames, accessToken, leagueId, onBack }) {
  const username = authUser?.user_metadata?.username || authUser?.email?.split("@")[0] || "—";
  const legheAttive = Object.values(joinStatus).filter(s=>s==="APPROVED").length;
  const [transfers, setTransfers] = React.useState(null);
  const [filterLeague, setFilterLeague] = React.useState(leagueId || "L001-F");

  useEffect(() => {
    if (!accessToken || !authUser?.id) return;
    setTransfers(null); // reset prima del caricamento
    const load = async () => {
      try {
        const db = await supabase.from("transfer_history", accessToken);
        const rows = await db.select("*",
          `&user_id=eq.${authUser.id}&league_id=eq.${filterLeague}&order=created_at.desc&limit=30`);
        setTransfers(Array.isArray(rows) ? rows : []);
      } catch(e) { setTransfers([]); }
    };
    load();
  }, [authUser?.id, filterLeague]);

  const LEGHE = [{id:"L001-F",name:"Classic F"},{id:"L001-M",name:"Classic M"},{id:"L002-F",name:"Market F"},{id:"L002-M",name:"Market M"}];

  return (
    <MenuPage title="Il mio profilo" emoji="👤" onBack={onBack}>
      {[
        {l:"Username",    v:username},
        {l:"Email",       v:authUser?.email||"—"},
        {l:"Ruolo",       v:isAdmin?"Admin 🔐":"Giocatore"},
        {l:"Leghe attive",v:String(legheAttive)},
      ].map((f,i)=>(
        <div key={i} style={{background:B.white,borderRadius:10,padding:"12px 14px",marginBottom:8,border:`1px solid ${B.creamDark}`}}>
          <div style={{fontSize:10,color:B.gray,textTransform:"uppercase",letterSpacing:1}}>{f.l}</div>
          <div style={{fontSize:14,fontWeight:"bold",color:B.dark,marginTop:3}}>{f.v}</div>
        </div>
      ))}

      {/* Leghe */}
      <div style={{background:B.greenPale,border:`1px solid ${B.greenDark}33`,borderRadius:12,padding:"14px",marginTop:8,marginBottom:14}}>
        <div style={{fontWeight:"bold",fontSize:13,color:B.greenDark,marginBottom:6}}>Le mie leghe</div>
        {LEGHE.map(l=>{
          const isActive = l.id === leagueId;
          return (
            <div key={l.id} style={{padding:"8px 0",borderBottom:`1px solid ${B.greenDark}22`,background:isActive?"rgba(45,92,79,0.05)":"transparent",borderRadius:isActive?6:0,paddingLeft:isActive?6:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,color:B.dark,fontWeight:isActive?"bold":"normal"}}>
                  {isActive&&"→ "}{l.name}
                </span>
                <span style={{fontSize:11,fontWeight:"bold",padding:"2px 10px",borderRadius:20,
                  background:joinStatus[l.id]==="APPROVED"?B.greenDark:joinStatus[l.id]==="PENDING"?B.yellowPale:B.grayPale,
                  color:joinStatus[l.id]==="APPROVED"?B.white:joinStatus[l.id]==="PENDING"?"#7A4F00":B.gray}}>
                  {joinStatus[l.id]==="APPROVED"?"✓ Iscritto":joinStatus[l.id]==="PENDING"?"⏳ In attesa":"Non iscritto"}
                </span>
              </div>
              {teamNames?.[l.id] && joinStatus[l.id]==="APPROVED" && (
                <div style={{fontSize:12,color:B.greenDark,marginTop:3,fontWeight:isActive?"bold":"normal"}}>
                  🏖️ {teamNames[l.id]}{isActive&&" ← lega attiva"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Storico trasferimenti filtrato per lega */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontWeight:"bold",fontSize:13,color:B.dark}}>📋 Storico Trasferimenti</div>
          <select value={filterLeague} onChange={e=>{setFilterLeague(e.target.value);setTransfers(null);}}
            style={{fontSize:11,border:`1px solid ${B.creamDark}`,borderRadius:8,padding:"3px 6px",background:B.white,color:B.dark,fontFamily:"Georgia,serif"}}>
            {LEGHE.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        {transfers === null
          ? <div style={{textAlign:"center",padding:"12px",color:B.gray,fontSize:11}}>⏳ Caricamento...</div>
          : transfers.length === 0
            ? <div style={{textAlign:"center",padding:"12px",color:B.gray,fontSize:11}}>Nessun trasferimento in {LEGHE.find(l=>l.id===filterLeague)?.name}</div>
            : transfers.map((t,i) => (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",
                borderBottom:i<transfers.length-1?`1px solid ${B.creamDark}`:"none"}}>
                <span style={{fontSize:18}}>{t.action==="buy"?"🟢":"🔴"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:"bold",color:B.dark,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {t.player_name||t.player_id}
                  </div>
                  <div style={{fontSize:10,color:B.gray}}>
                    {t.action==="buy"?"Acquistato":"Venduto"} · {t.created_at?new Date(t.created_at).toLocaleDateString("it-IT"):""}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:13,fontWeight:"bold",color:t.action==="buy"?B.orange:B.greenDark}}>
                    {t.action==="buy"?"-":"+"}${t.price||0}
                  </div>
                  <div style={{fontSize:9,color:B.gray}}>saldo: ${t.budget_after||0}</div>
                </div>
              </div>
            ))
        }
      </div>
    </MenuPage>
  );
}

// ─── PAGINA PREMI ─────────────────────────────────────────────
function PagePremi({ onBack }) {
  return (
    <MenuPage title="Premi" emoji="🏆" onBack={onBack}>
      <div style={{fontSize:12,color:B.gray,marginBottom:16,lineHeight:1.6,background:B.sandDark,borderRadius:10,padding:"10px 14px"}}>
        I premi si sbloccano per soglia di iscritti <b>per singola lega</b>. Le soglie non si sommano tra leghe diverse.
      </div>

      {[
        {pos:"1° posto",name:"AirPods 4",emoji:"🎧",threshold:25,color:B.orange,desc:"Il vincitore di ogni lega porta a casa le nuove AirPods 4."},
        {pos:"2° posto",name:"Canotta/Top Nazionale",emoji:"👕",threshold:18,color:B.greenDark,desc:"Canotta (leghe M) o Top (leghe F) firmata dagli atleti della Nazionale Italiana."},
        {pos:"3° posto",name:"Borsone Under Armour",emoji:"🎒",threshold:10,color:B.gray,desc:"Borsone griffato Under Armour per il terzo classificato di ogni lega."},
      ].map((p,i)=>(
        <div key={i} style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"16px",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:8}}>
            <div style={{fontSize:44,lineHeight:1}}>{p.emoji}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:B.gray,fontWeight:"bold",textTransform:"uppercase",letterSpacing:1}}>{p.pos}</div>
              <div style={{fontSize:15,fontWeight:"bold",color:B.dark,marginTop:2}}>{p.name}</div>
              <div style={{fontSize:11,color:p.color,fontWeight:"bold",marginTop:3}}>Si sblocca con {p.threshold}+ iscritti</div>
            </div>
          </div>
          <div style={{fontSize:12,color:B.gray,lineHeight:1.6}}>{p.desc}</div>
        </div>
      ))}

      <div style={{background:B.orangePale,border:`1px solid ${B.orange}44`,borderRadius:12,padding:"16px",marginBottom:10}}>
        <div style={{fontWeight:"bold",fontSize:15,color:B.orange,marginBottom:6}}>🔥 Super Premio Combo</div>
        <div style={{fontSize:12,color:B.dark,lineHeight:1.7,marginBottom:8}}>
          Chi è iscritto ad almeno 2 leghe partecipa alla classifica Combo (somma punti di tutte le leghe). Il vincitore con almeno 30 squadre multi-lega vince un super premio speciale.
        </div>
        <div style={{fontSize:11,color:B.orange,fontWeight:"bold"}}>Soglia: 30 squadre multi-lega</div>
      </div>

      <div style={{background:B.greenPale,border:`1px solid ${B.greenDark}33`,borderRadius:12,padding:"16px"}}>
        <div style={{fontWeight:"bold",fontSize:14,color:B.greenDark,marginBottom:10}}>📐 Regola Scalatura</div>
        <div style={{fontSize:12,color:B.dark,lineHeight:1.8,marginBottom:10}}>
          Se un utente vince sia una lega che la Combo, riceve <b>solo il premio Combo</b>. La classifica della lega vinta scorre verso l'alto:
        </div>
        {["2° posto → riceve il premio del 1°","3° posto → riceve il premio del 2°","4° posto → entra in podio e riceve il premio del 3°"].map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:i<2?`1px solid ${B.greenDark}22`:"none"}}>
            <span style={{color:B.greenDark,fontSize:14}}>→</span>
            <span style={{fontSize:12,color:B.dark}}>{s}</span>
          </div>
        ))}
        <div style={{marginTop:10,padding:"8px 10px",background:B.white,borderRadius:8,fontSize:11,color:B.gray,lineHeight:1.6}}>
          Esempio: Marco vince Market M e la Combo. Prende il super premio Combo. Il 2° di Market M riceve gli AirPods, il 3° la canotta, il 4° il borsone.
        </div>
      </div>
    </MenuPage>
  );
}

// ─── PAGINA REGOLE ────────────────────────────────────────────
function PageRegole({ onBack }) {
  const Row = ({label,value,color,bg}) => (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${B.creamDark}`}}>
      <span style={{fontSize:13,color:B.dark}}>{label}</span>
      <span style={{fontSize:13,fontWeight:"bold",padding:"2px 12px",borderRadius:8,background:bg,color:color}}>{value}</span>
    </div>
  );
  const Section = ({title,color}) => (
    <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:color||B.greenDark,marginTop:20,marginBottom:10}}>{title}</div>
  );
  const InfoBox = ({children,color,bg}) => (
    <div style={{background:bg||B.sandDark,border:`1px solid ${color||B.sandDeep}`,borderRadius:8,padding:"10px 12px",marginTop:8,fontSize:11,color:color?B.dark:B.gray,lineHeight:1.7}}>
      {children}
    </div>
  );

  return (
    <MenuPage title="Regole di Gioco" emoji="📋" onBack={onBack}>

      {/* Struttura torneo */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:12}}>
        <Section title="🏖️ Struttura torneo"/>
        <div style={{fontSize:12,color:B.dark,lineHeight:1.8}}>
          La stagione 2026 conta <b>9 tappe</b>. Ogni tappa si svolge nel fine settimana:
        </div>
        {[
          {giorno:"Venerdì",desc:"Qualifiche 1 e 2 — valgono punti fantasy"},
          {giorno:"Sabato",  desc:"Main Draw: Pool da 4 squadre"},
          {giorno:"Domenica",desc:"Ottavi → Quarti → Semifinali → Finali"},
        ].map((g,i)=>(
          <div key={i} style={{display:"flex",gap:10,padding:"6px 0",borderBottom:`1px solid ${B.creamDark}`}}>
            <span style={{fontSize:11,fontWeight:"bold",color:B.orange,width:60,flexShrink:0}}>{g.giorno}</span>
            <span style={{fontSize:12,color:B.dark}}>{g.desc}</span>
          </div>
        ))}
        <InfoBox>
          <b>Pool:</b> 1° classificato → BYE (accesso diretto ai quarti, vale come vittoria 2-0). 2° e 3° → ottavi. 4° → eliminato.
        </InfoBox>
      </div>

      {/* Punti base */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:12}}>
        <Section title="🏐 Punti base per partita"/>
        <Row label="Vittoria 2-0"    value="+4 pt" color={B.greenDark} bg={B.greenPale}/>
        <Row label="Vittoria 2-1"    value="+3 pt" color={B.greenDark} bg={B.greenPale}/>
        <Row label="Sconfitta 1-2"   value="+1 pt" color={B.orange}    bg={B.orangePale}/>
        <Row label="Sconfitta 0-2"   value="0 pt"  color={B.gray}      bg={B.grayPale}/>
        <Row label="BYE (tavolino)"  value="+4 pt" color={B.greenDark} bg={B.greenPale}/>
        <InfoBox>
          I punti vengono assegnati per ogni partita giocata. Un'atleta che gioca 5 partite accumula i punti di tutte e 5.
        </InfoBox>
      </div>

      {/* Bonus */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:12}}>
        <Section title="✨ Bonus"/>
        <Row label="🎯 Set perso di misura" value="+0.5 pt" color={"#7C3AED"} bg={"#F3E8FF"}/>
        <Row label="★ Capitano"             value="×1.3"   color={B.yellow}   bg={B.yellowPale}/>
        <Row label="🧢 Coach vittoria"       value="+0.5 pt" color={B.greenDark} bg={B.greenPale}/>
        <InfoBox>
          <b>Set perso di misura (+0.5 pt)</b><br/>
          Si guadagna +0.5 pt se si perde un set con esattamente 2 punti di scarto. Vale solo nei primi due set, non nel tie-break. Il bonus va alla coppia che ha perso quel set.<br/><br/>
          ✅ Perdi il 1° set 19-21 → <b>+0.5 pt</b> (scarto = 2)<br/>
          ✅ Perdi il 2° set 21-23 → <b>+0.5 pt</b> (scarto = 2)<br/>
          ✅ Perdi il 2° set 23-25 → <b>+0.5 pt</b> (scarto = 2)<br/>
          ❌ Perdi il 1° set 18-21 → <b>0 pt</b> (scarto = 3, non basta)<br/>
          ❌ Perdi il 1° set 15-21 → <b>0 pt</b> (scarto troppo grande)<br/>
          ❌ Vinci il set 21-19 → <b>0 pt</b> (vale solo per chi perde il set)<br/>
          ❌ Perdi il 3° set 13-15 → <b>0 pt</b> (tie-break, non vale mai)<br/><br/>
          <b>Capitano (×1.3):</b> moltiplicatore sul punteggio del capitano. Si cumula con il moltiplicatore tappa.<br/><br/>
          <b>Coach vittoria (+0.5 pt):</b> +0.5 pt per ogni partita vinta dalla coppia del tuo coach, solo se schierato.
        </InfoBox>
      </div>

      {/* Malus Coach rimosso — solo bonus */}

      {/* Moltiplicatori tappa */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:12}}>
        <Section title="⚡ Moltiplicatori tappa"/>
        <div style={{fontSize:12,color:B.gray,marginBottom:10}}>Il moltiplicatore si applica al <b>punteggio finale</b> del team per quella tappa, inclusi capitano e coach.</div>
        {[
          {tipo:"Silver",       mult:"×1.0", esempi:"Falconara, Marina di Ravenna, Caorle qualif.", color:B.greenDark, bg:B.greenPale},
          {tipo:"Gold",         mult:"×1.3", esempi:"Termoli, Marina di Modica",                    color:"#B8860B",  bg:"#FEF7E8"},
          {tipo:"Coppa Italia", mult:"×1.5", esempi:"Montesilvano",                                 color:B.orange,   bg:B.orangePale},
          {tipo:"Finale",       mult:"×1.7", esempi:"Caorle — tappa finale di stagione",            color:"#7C3AED",  bg:"#F3E8FF"},
        ].map((t,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<3?`1px solid ${B.creamDark}`:"none"}}>
            <span style={{fontSize:11,fontWeight:"bold",padding:"3px 10px",borderRadius:20,background:t.bg,color:t.color,flexShrink:0,minWidth:80,textAlign:"center"}}>{t.tipo}</span>
            <span style={{fontSize:18,fontWeight:"bold",color:t.color,flexShrink:0,width:36}}>{t.mult}</span>
            <span style={{fontSize:11,color:B.gray}}>{t.esempi}</span>
          </div>
        ))}
        <InfoBox>
          Esempio Gold: capitano vince 2-0 → 4 pt × 1.3 (Gold) × 1.3 (capitano) = 6.76 pt
        </InfoBox>
      </div>

      {/* Roster e formazione */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:12}}>
        <Section title="👕 Roster e formazione"/>
        {[
          {l:"Budget iniziale Classic",v:"450 crediti"},
          {l:"Budget iniziale Market", v:"400 crediti"},
          {l:"Atleti nel roster",v:"5 esatti"},
          {l:"Titolari",         v:"3 per tappa"},
          {l:"Capitano",         v:"1 tra i titolari"},
          {l:"Coach",            v:"Opzionale"},
          {l:"Deadline formazione",v:"Giovedì ore 23:00"},
        ].map((r,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${B.creamDark}`}}>
            <span style={{fontSize:12,color:B.gray}}>{r.l}</span>
            <span style={{fontSize:12,fontWeight:"bold",color:B.dark}}>{r.v}</span>
          </div>
        ))}
        <InfoBox>
          La formazione va rischierata ad ogni tappa: i titolari della tappa precedente non vengono riportati automaticamente. Se non schieri 3 titolari + capitano entro giovedì 23:00, per quella tappa non ottieni punti.
        </InfoBox>
      </div>

      {/* Capitano — già nella sezione Bonus sopra */}

      {/* Coach */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:12}}>
        <Section title="🧢 Coach"/>
        <div style={{fontSize:12,color:B.dark,lineHeight:1.7,marginBottom:6}}>
          Il coach è <b>opzionale</b>. Puoi sceglierlo dal mercato nella tab Coach.
        </div>
        {[
          {l:"Costo",          v:"5 crediti"},
          {l:"Bonus vittoria", v:"+0.5 pt per partita vinta"},
          {l:"Se in panchina", v:"Nessun bonus"},
        ].map((r,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${B.creamDark}`}}>
            <span style={{fontSize:12,color:B.gray}}>{r.l}</span>
            <span style={{fontSize:12,fontWeight:"bold",color:B.dark}}>{r.v}</span>
          </div>
        ))}
        <InfoBox>
          Il bonus coach (+0.5 pt per vittoria) è già incluso nella sezione Bonus qui sopra.
          Per attivarlo devi schierare il coach nella tab Squadra — il toggle "Panchina" non genera né bonus né malus.
        </InfoBox>
      </div>

      {/* Prezzi atleti */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:12}}>
        <Section title="💰 Prezzi atleti"/>
        <div style={{fontSize:12,color:B.dark,lineHeight:1.7,marginBottom:10}}>
          Il prezzo di ogni atleta è determinato dal ranking FIPAV ufficiale. Più alto il ranking, maggiore il costo.
        </div>
        {[
          {cat:"Top Player", range:"Ranking 1–5",   cost:"160–144 cr", color:"#7A4F00", bg:B.yellowPale},
          {cat:"Elite",      range:"Ranking 6–15",  cost:"140–108 cr", color:"#4C1D95", bg:"#F3E8FF"},
          {cat:"Solid Pick", range:"Ranking 16–30", cost:"105–72 cr",  color:B.greenDark,bg:B.greenPale},
          {cat:"Value Pick", range:"Ranking 31–50", cost:"70–32 cr",   color:B.orange,   bg:B.orangePale},
          {cat:"Outsider",   range:"Ranking 51–60", cost:"31–22 cr",   color:B.gray,     bg:B.creamDark},
          {cat:"Wild Card",  range:"Ranking 61+",   cost:"20 cr fissi",color:B.gray,     bg:B.grayPale},
        ].map((c,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:i<5?`1px solid ${B.creamDark}`:"none"}}>
            <span style={{fontSize:10,fontWeight:"bold",padding:"2px 8px",borderRadius:10,background:c.bg,color:c.color,flexShrink:0,minWidth:72,textAlign:"center"}}>{c.cat}</span>
            <span style={{flex:1,fontSize:11,color:B.gray}}>{c.range}</span>
            <span style={{fontSize:12,fontWeight:"bold",color:B.dark}}>{c.cost}</span>
          </div>
        ))}
      </div>

      {/* Leghe */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:12}}>
        <Section title="🏆 Le 4 leghe"/>
        {[
          {nome:"Classic F",  tipo:"Classic",desc:"Roster bloccato dopo chiusura iscrizioni. Nessun cambio per tutta la stagione."},
          {nome:"Classic M",  tipo:"Classic",desc:"Roster bloccato dopo chiusura iscrizioni. Nessun cambio per tutta la stagione."},
          {nome:"Market F",   tipo:"Market", desc:"Mercato attivo lun 09:00 – gio 23:00. Acquista e vendi liberamente durante la settimana."},
          {nome:"Market M",   tipo:"Market", desc:"Mercato attivo lun 09:00 – gio 23:00. Acquista e vendi liberamente durante la settimana."},
        ].map((l,i)=>(
          <div key={i} style={{padding:"10px 0",borderBottom:i<3?`1px solid ${B.creamDark}`:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <span style={{fontWeight:"bold",fontSize:13,color:B.dark}}>{l.nome}</span>
              <span style={{fontSize:10,padding:"1px 8px",borderRadius:10,background:l.tipo==="Market"?B.orangePale:B.greenPale,color:l.tipo==="Market"?B.orange:B.greenDark,fontWeight:"bold"}}>{l.tipo}</span>
            </div>
            <div style={{fontSize:12,color:B.gray,lineHeight:1.6}}>{l.desc}</div>
          </div>
        ))}
        <InfoBox>
          <b>Combo:</b> chi è iscritto ad almeno 2 leghe partecipa alla classifica Combo (somma punti di tutte le leghe). Super premio se 30+ squadre multi-lega.
        </InfoBox>
      </div>

    </MenuPage>
  );
}

// ─── PAGINA TERMINI ───────────────────────────────────────────
function PageTermini({ onBack }) {
  return (
    <MenuPage title="Termini e Condizioni" emoji="📄" onBack={onBack}>
      <div style={{fontSize:12,color:B.gray,marginBottom:16,lineHeight:1.6}}>
        Regolamento ufficiale FantaBeach 2026 — stagione FIPAV Beach Volley Italia.
      </div>
      {[
        {n:"1",t:"Natura del gioco",d:"FantaBeach è un gioco fantasy non ufficiale basato sui risultati reali del Campionato Italiano Assoluto di Beach Volley FIPAV 2026. Non ha alcun rapporto ufficiale con la FIPAV."},
        {n:"2",t:"Iscrizioni",d:"Le iscrizioni aprono il 18 maggio 2026 e chiudono il 25 maggio 2026 alle 23:59. Il costo è di 10€ per singola lega. Dopo la chiusura non è possibile iscriversi."},
        {n:"3",t:"Crediti fantasy",d:"I crediti fantasy ($450 per le leghe Classic, $400 per le leghe Market) non hanno alcun valore monetario reale. Sono un sistema interno di gioco e non possono essere convertiti in denaro."},
        {n:"4",t:"Premi fisici",d:"I premi fisici (AirPods, canotta, borsone) vengono consegnati solo se la lega raggiunge le soglie minime di iscritti previste dal regolamento. In assenza del numero minimo, il premio non viene assegnato."},
        {n:"5",t:"Correzioni punteggi",d:"L'admin può correggere errori nei punteggi entro 48 ore dalla pubblicazione ufficiale dei risultati FIPAV. Oltre questo termine, i punteggi sono definitivi."},
        {n:"6",t:"Casi particolari",d:"In caso di forfait, ritiro, infortuni o situazioni non previste dal regolamento, l'admin prende una decisione discrezionale ispirandosi allo spirito del gioco. La decisione è definitiva."},
        {n:"7",t:"Fair play",d:"È vietato creare account multipli, condividere credenziali o tentare di manipolare le classifiche. L'admin si riserva il diritto di escludere utenti che non rispettino le regole di fair play."},
        {n:"8",t:"Responsabilità",d:"FantaBeach è un progetto amatoriale creato per la community del beach volley italiano. Nessuna responsabilità per eventuali disservizi tecnici o variazioni del calendario FIPAV."},
      ].map((t,i)=>(
        <div key={i} style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"12px 14px",marginBottom:8}}>
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{fontSize:11,fontWeight:"bold",color:B.orange,background:B.orangePale,borderRadius:20,padding:"2px 8px",flexShrink:0}}>{t.n}</span>
            <div>
              <div style={{fontWeight:"bold",fontSize:13,color:B.dark,marginBottom:4}}>{t.t}</div>
              <div style={{fontSize:12,color:B.gray,lineHeight:1.7}}>{t.d}</div>
            </div>
          </div>
        </div>
      ))}
    </MenuPage>
  );
}
// MOCK_STATS rimosso — statistiche calcolate dinamicamente


// ─── HELPERS STATISTICHE ──────────────────────────────────────
const CAT_FILTERS = ["Tutti","Top Player","Elite","Solid Pick","Value Pick","Outsider","Wild Card"];

function StatPage({ title, emoji, onBack, children }) {
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{background:B.sandDark,padding:"16px",borderBottom:`1px solid ${B.sandDeep}`,flexShrink:0}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",color:B.gray,cursor:"pointer",fontSize:13,fontFamily:"Georgia,serif",marginBottom:8}}>← back</button>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:22}}>{emoji}</span>
          <div style={{fontWeight:"bold",fontSize:17,color:B.dark}}>{title}</div>
        </div>
        <div style={{fontSize:10,color:B.orange,marginTop:3,fontWeight:"bold"}}>🔐 Solo Admin · Dati simulati</div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
        {children}
      </div>
    </div>
  );
}

function CatFilter({ value, onChange }) {
  return (
    <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:8,scrollbarWidth:"none",marginBottom:12}}>
      {CAT_FILTERS.map(c=>{
        const cat = CATEGORIES.find(x=>x.label===c);
        const active = value===c;
        return (
          <button key={c} onClick={()=>onChange(c)}
            style={{flexShrink:0,padding:"4px 10px",borderRadius:20,border:"none",cursor:"pointer",
              fontSize:10,fontFamily:"Georgia,serif",fontWeight:active?"bold":"normal",
              background:active?(cat?cat.bg:B.greenDark):(cat?`${cat.bg}88`:B.grayPale),
              color:active?(cat?cat.text:B.white):(cat?cat.text:B.gray)}}>
            {c}
          </button>
        );
      })}
    </div>
  );
}

function StatCard({ emoji, title, subtitle, desc, items, renderRow }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"12px",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:open?8:10}}>
        <span style={{fontSize:18}}>{emoji}</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:"bold",fontSize:13,color:B.dark}}>{title}</div>
          {subtitle&&<div style={{fontSize:10,color:B.gray}}>{subtitle}</div>}
        </div>
        {desc&&(
          <button onClick={()=>setOpen(o=>!o)}
            style={{width:20,height:20,borderRadius:"50%",border:`1px solid ${B.grayLight}`,
              background:open?B.greenDark:B.white,color:open?B.white:B.gray,
              fontSize:11,fontWeight:"bold",cursor:"pointer",flexShrink:0,
              display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif"}}>
            ?
          </button>
        )}
      </div>
      {open&&desc&&(
        <div style={{background:B.greenPale,border:`1px solid ${B.greenDark}22`,borderRadius:8,
          padding:"8px 10px",marginBottom:10,fontSize:11,color:B.greenDark,lineHeight:1.6}}>
          {desc}
        </div>
      )}
      {items.map((item,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",
          borderBottom:i<items.length-1?`1px solid ${B.creamDark}`:"none"}}>
          <span style={{color:i===0?B.yellow:i===1?B.grayLight:i===2?"#CD7F32":B.gray,
            fontWeight:"bold",fontSize:13,width:18,flexShrink:0}}>{i+1}</span>
          {renderRow(item,i)}
        </div>
      ))}
    </div>
  );
}

function CatBadge({cat}) {
  const c = CATEGORIES.find(x=>x.label===cat);
  if (!c) return null;
  return <span style={{fontSize:9,padding:"1px 6px",borderRadius:6,background:c.bg,color:c.text,fontWeight:"bold",flexShrink:0}}>{cat}</span>;
}

// ─── STATO VUOTO STATISTICHE ──────────────────────────────────
function StatComingSoon({ emoji, title, desc, onBack }) {
  return (
    <StatPage title={title} emoji={emoji} onBack={onBack}>
      <div style={{textAlign:"center",padding:"40px 20px"}}>
        <div style={{fontSize:48,marginBottom:12}}>{emoji}</div>
        <div style={{fontSize:15,fontWeight:"bold",color:B.dark,marginBottom:8}}>{title}</div>
        <div style={{fontSize:12,color:B.gray,lineHeight:1.6,marginBottom:16}}>{desc}</div>
        <div style={{background:B.sandDark,borderRadius:12,padding:"12px 16px",display:"inline-block"}}>
          <div style={{fontSize:11,color:B.gray}}>📊 Dati disponibili dopo la prima tappa disputata</div>
        </div>
      </div>
    </StatPage>
  );
}

// ─── COSTANTI STATISTICHE ─────────────────────────────────────
const STATS_DAY0 = "2026-05-20"; // Giorno 0 stagione — modificabile
const STATS_LEAGUES = [
  { id: "L001-F", label: "Classic F", gender: "F" },
  { id: "L001-M", label: "Classic M", gender: "M" },
  { id: "L002-F", label: "Market F",  gender: "F" },
  { id: "L002-M", label: "Market M",  gender: "M" },
];

// Hook generico per caricare stats con cache
function useStatsData(loader, deps) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  useEffect(() => {
    setLoading(true);
    loader().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, deps || []);
  return { data, loading };
}

// Componente riga top5
function Top5Row({ rank, name, sub, value, unit, color, bg }) {
  const medals = ["🥇","🥈","🥉","4°","5°"];
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",
      borderBottom:`1px solid ${B.creamDark}`}}>
      <div style={{width:28,height:28,borderRadius:8,flexShrink:0,
        background:rank<=3?[B.yellow,B.grayLight,"#CD7F32"][rank-1]:B.grayPale,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:rank<=3?16:11,fontWeight:"bold",color:rank<=3?B.white:B.gray}}>
        {medals[rank-1]}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:"bold",color:B.dark,overflow:"hidden",
          textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</div>
        {sub&&<div style={{fontSize:10,color:B.gray,marginTop:1}}>{sub}</div>}
      </div>
      <div style={{flexShrink:0,background:bg||B.greenPale,color:color||B.greenDark,
        padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:"bold"}}>
        {value}{unit||""}
      </div>
    </div>
  );
}

// Componente sezione con tab Globale + 4 leghe
function StatsSection({ title, emoji, desc, loading, dataByLeague, renderRow, emptyMsg }) {
  const [tab, setTab] = React.useState("global");
  const tabs = [{id:"global",label:"🌍 Globale"}, ...STATS_LEAGUES.map(l=>({id:l.id,label:l.label}))];
  const rows = dataByLeague?.[tab] || [];
  return (
    <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,
      padding:"14px",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <span style={{fontSize:20}}>{emoji}</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:"bold",fontSize:14,color:B.dark}}>{title}</div>
          {desc&&<div style={{fontSize:10,color:B.gray,marginTop:1}}>{desc}</div>}
        </div>
      </div>
      {/* Tab leghe */}
      <div style={{display:"flex",gap:4,overflowX:"auto",scrollbarWidth:"none",
        marginBottom:10,paddingBottom:2}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flexShrink:0,padding:"4px 10px",borderRadius:20,border:"none",
              cursor:"pointer",fontSize:10,fontFamily:"Georgia,serif",
              fontWeight:tab===t.id?"bold":"normal",
              background:tab===t.id?B.greenDark:B.grayPale,
              color:tab===t.id?B.white:B.gray}}>
            {t.label}
          </button>
        ))}
      </div>
      {loading
        ? <div style={{textAlign:"center",padding:"20px",color:B.gray,fontSize:12}}>⏳ Caricamento...</div>
        : rows.length===0
          ? <div style={{textAlign:"center",padding:"16px",color:B.gray,fontSize:12}}>{emptyMsg||"Nessun dato disponibile"}</div>
          : rows.slice(0,5).map((row,i) => renderRow(row, i+1))
      }
    </div>
  );
}

// ─── PAGINA 1: STATS ATLETI ───────────────────────────────────
function StatsAtleti({ onBack, accessToken, athletesData }) {
  // Costruisce nameMap da athletes_data (fonte completa e affidabile)
  const allAthletesList = [...(athletesData?.women||[]), ...(athletesData?.men||[])];
  const globalNameMap = {};
  allAthletesList.forEach(a => { if (a.id && a.name) globalNameMap[a.id] = a.name; });
  const [allData, setAllData] = React.useState(null);
  const [ownerMap, setOwnerMap] = React.useState({});
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    if (!accessToken) return;
    loadAthleteStats(accessToken).then(d => {
      if (d) { setAllData(d.stats); setOwnerMap(d.ownerMap||{}); }
      setLoading(false);
    });
  }, []);

  async function loadAthleteStats(token) {
    try {
      // Carica match_results tappe completate 2026
      const db = await supabase.from("match_results", token);
      const results = await db.select(
        "player_id,player_name,total_pts,bonus_codes,event_id",
        "&order=player_id.asc&limit=5000"
      );

      // Carica roster per ownership (include anche venduti per nameMap)
      const rdb = await supabase.from("rosters", token);
      const rosters = await rdb.select("player_id,player_name,gender,league_id,price", "&sold_at=is.null");

      // Carica player_history per prezzi dal day0
      const pdb = await supabase.from("player_history", token);
      const history = await pdb.select(
        "player_id,player_name,ranking,cost,synced_at",
        `&synced_at=gte.${STATS_DAY0}T00:00:00Z&order=synced_at.asc&limit=5000`
      );

      // Carica tutti i roster (anche venduti) per nameMap completo
      const rdbAll = await supabase.from("rosters", token);
      const rostersAll = await rdbAll.select("player_id,player_name,gender", "");

      // Costruisce nameMap da tutte le fonti disponibili
      const nameMap = {};
      if (Array.isArray(rostersAll)) rostersAll.forEach(r => { if (r.player_name && !nameMap[r.player_id]) nameMap[r.player_id] = r.player_name; });
      if (Array.isArray(history)) history.forEach(r => { if (r.player_name && !nameMap[r.player_id]) nameMap[r.player_id] = r.player_name; });
      if (Array.isArray(results)) results.forEach(r => { if (r.player_name && !nameMap[r.player_id]) nameMap[r.player_id] = r.player_name; });

      // Carica eventi completati 2026 per filtrare per genere
      const edb = await supabase.from("events", token);
      const events = await edb.select("id,gender,weight,name", "&status=eq.Completato&anno=eq.2026");
      const evMap = {};
      if (Array.isArray(events)) events.forEach(e => { evMap[e.id] = e; });

      // Merge nameMap: priorità a globalNameMap (più completo) poi nameMap da DB
      const mergedNameMap = { ...nameMap, ...globalNameMap };
      return buildAthleteStats(results, rosters, history, evMap, mergedNameMap);
    } catch(e) { console.error("Stats atleti:", e); return null; }
  }

  function buildAthleteStats(results, rosters, history, evMap, nameMap={}) {
    if (!Array.isArray(results) || !Array.isArray(rosters)) return null;

    // Punti totali per atleta
    const ptsByPlayer = {};
    const ptsByPlayerByLeague = { "L001-F":{}, "L001-M":{}, "L002-F":{}, "L002-M":{} };

    results.forEach(r => {
      if (!r.player_id) return;
      const ev = evMap[r.event_id];
      if (!ev) return; // solo tappe completate
      const g = ev.gender?.toUpperCase();
      const leagues = g==="F" ? ["L001-F","L002-F"] : ["L001-M","L002-M"];

      if (!ptsByPlayer[r.player_id]) ptsByPlayer[r.player_id] = { id:r.player_id, name:nameMap[r.player_id]||r.player_name||r.player_id, pts:0, matches:0 };
      ptsByPlayer[r.player_id].pts += r.total_pts||0;
      ptsByPlayer[r.player_id].matches += 1;
      ptsByPlayer[r.player_id].gender = g;

      leagues.forEach(lid => {
        if (!ptsByPlayerByLeague[lid][r.player_id])
          ptsByPlayerByLeague[lid][r.player_id] = { id:r.player_id, name:nameMap[r.player_id]||r.player_name||r.player_id, pts:0, matches:0, gender:g };
        ptsByPlayerByLeague[lid][r.player_id].pts += r.total_pts||0;
        ptsByPlayerByLeague[lid][r.player_id].matches += 1;
      });
    });

    // Ownership per atleta
    const ownerByPlayer = {};
    const ownerByPlayerByLeague = { "L001-F":{}, "L001-M":{}, "L002-F":{}, "L002-M":{} };
    if (Array.isArray(rosters)) {
      rosters.forEach(r => {
        if (!ownerByPlayer[r.player_id]) ownerByPlayer[r.player_id] = { id:r.player_id, name:nameMap[r.player_id]||r.player_name||r.player_id, count:0, gender:r.gender, price:r.price };
        ownerByPlayer[r.player_id].count++;
        if (ownerByPlayerByLeague[r.league_id]) {
          if (!ownerByPlayerByLeague[r.league_id][r.player_id])
            ownerByPlayerByLeague[r.league_id][r.player_id] = { id:r.player_id, name:nameMap[r.player_id]||r.player_name||r.player_id, count:0, gender:r.gender, price:r.price };
          ownerByPlayerByLeague[r.league_id][r.player_id].count++;
        }
      });
    }

    // Storico prezzi per atleta: prima e ultima riga dal day0
    const priceFirst = {}, priceLast = {};
    if (Array.isArray(history)) {
      history.forEach(h => {
        if (!priceFirst[h.player_id]) priceFirst[h.player_id] = h;
        priceLast[h.player_id] = h;
      });
    }

    // Helper: top5 per metrica
    const top5 = (obj, scorer, filter) => {
      let arr = Object.values(obj);
      if (filter) arr = arr.filter(filter);
      return arr
        .map(a => ({ ...a, _score: scorer(a) }))
        .filter(a => a._score > 0 || a._score !== undefined)
        .sort((a,b) => b._score - a._score)
        .slice(0,5);
    };

    // Costruisce dataset per ogni sezione
    const build = (leagueId, genderFilter) => {
      const pmap = leagueId ? ptsByPlayerByLeague[leagueId] : ptsByPlayer;
      const omap = leagueId ? ownerByPlayerByLeague[leagueId] : ownerByPlayer;
      const gf = genderFilter ? (a => a.gender===genderFilter) : null;

      // TopScorer
      const topScorer = top5(pmap, a => Math.round(a.pts*10)/10, gf);

      // HiddenGem: punti / costo * 10
      const hiddenGem = top5(pmap, a => {
        const price = ownerByPlayer[a.id]?.price || priceFirst[a.id]?.cost || 20;
        return price > 0 ? Math.round((a.pts / price)*100)/100 : 0;
      }, gf);

      // Ownership
      const ownership = top5(omap, a => a.count, gf);

      // Differential: tanti punti, pochi owner
      const diff = top5(pmap, a => {
        const owners = omap[a.id]?.count || 1;
        return Math.round((a.pts / owners)*10)/10;
      }, a => (gf ? gf(a) : true) && (omap[a.id]?.count||0) <= 2 );

      // Rocket: più migliorato in ranking
      const rocket = Object.entries(priceFirst)
        .map(([id, first]) => {
          const last = priceLast[id];
          if (!last) return null;
          const delta = first.ranking - last.ranking; // positivo = salito
          const g = ownerByPlayer[id]?.gender;
          if (genderFilter && g !== genderFilter) return null;
          return { id, name: nameMap[id] || ownerByPlayer[id]?.name || id, _score: delta, delta, gender:g };
        })
        .filter(Boolean)
        .filter(a => a._score > 0)
        .sort((a,b) => b._score - a._score)
        .slice(0,5);

      // WallStreet: più variazione di prezzo
      const wallStreet = Object.entries(priceFirst)
        .map(([id, first]) => {
          const last = priceLast[id];
          if (!last || first.cost === last.cost) return null;
          const delta = last.cost - first.cost;
          const pct = Math.round(((last.cost - first.cost) / first.cost)*100);
          const g = ownerByPlayer[id]?.gender;
          if (genderFilter && g !== genderFilter) return null;
          return { id, name: nameMap[id] || ownerByPlayer[id]?.name || id, _score: Math.abs(delta), delta, pct, gender:g };
        })
        .filter(Boolean)
        .sort((a,b) => b._score - a._score)
        .slice(0,5);

      return { topScorer, hiddenGem, ownership, diff, rocket, wallStreet };
    };

    return {
      stats: {
        global: build(null, null),
        "L001-F": build("L001-F", "F"),
        "L001-M": build("L001-M", "M"),
        "L002-F": build("L002-F", "F"),
        "L002-M": build("L002-M", "M"),
      },
      ownerMap: ownerByPlayer,
    };
  }

  const sections = [
    { key:"topScorer",  emoji:"🏆", title:"Top Scorer",   desc:"Più punti totali nelle tappe completate",          unit:" pt",  color:B.orange,    bg:B.orangePale },
    { key:"hiddenGem",  emoji:"💎", title:"Hidden Gem",   desc:"Miglior rapporto punti/costo (rendimento)",         unit:"x",   color:"#7C3AED",   bg:"#F3E8FF"    },
    { key:"ownership",  emoji:"👑", title:"Più Acquistato",desc:"Atleta presente nel maggior numero di roster",     unit:" roster",color:B.greenDark,bg:B.greenPale },
    { key:"diff",       emoji:"🎯", title:"Differential", desc:"Tanti punti ma pochi owner (max 2 roster)",        unit:" pt",  color:B.greenDark, bg:B.greenPale  },
    { key:"rocket",     emoji:"🚀", title:"Rocket",       desc:"Più migliorato in ranking dal giorno 0",           unit:" pos", color:B.green,     bg:B.greenPale  },
    { key:"wallStreet", emoji:"📈", title:"Wall Street",  desc:"Maggiore variazione di prezzo dal giorno 0",       unit:"$",   color:"#B8860B",   bg:"#FEF7E8"    },
  ];

  return (
    <StatPage title="Stats Atleti" emoji="🏐" onBack={onBack}>
      {sections.map(sec => {
        const [leagueTab, setLeagueTab] = React.useState("global");
        const tabs = [{id:"global",label:"🌍 Globale"}, ...STATS_LEAGUES.map(l=>({id:l.id,label:l.label}))];
        const rows = allData?.[leagueTab]?.[sec.key] || [];
        return (
          <div key={sec.key} style={{background:B.white,border:`1px solid ${B.creamDark}`,
            borderRadius:12,padding:"14px",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:20}}>{sec.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:"bold",fontSize:14,color:B.dark}}>{sec.title}</div>
                <div style={{fontSize:10,color:B.gray,marginTop:1}}>{sec.desc}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:4,overflowX:"auto",scrollbarWidth:"none",marginBottom:10}}>
              {tabs.map(t=>(
                <button key={t.id} onClick={()=>setLeagueTab(t.id)}
                  style={{flexShrink:0,padding:"4px 10px",borderRadius:20,border:"none",
                    cursor:"pointer",fontSize:10,fontFamily:"Georgia,serif",
                    fontWeight:leagueTab===t.id?"bold":"normal",
                    background:leagueTab===t.id?B.greenDark:B.grayPale,
                    color:leagueTab===t.id?B.white:B.gray}}>
                  {t.label}
                </button>
              ))}
            </div>
            {loading
              ? <div style={{textAlign:"center",padding:"16px",color:B.gray,fontSize:12}}>⏳ Caricamento...</div>
              : !allData
                ? <div style={{textAlign:"center",padding:"16px",color:B.gray,fontSize:12}}>Nessun dato disponibile</div>
                : rows.length===0
                  ? <div style={{textAlign:"center",padding:"16px",color:B.gray,fontSize:12}}>Nessuna variazione rilevata ancora</div>
                  : rows.map((row,i) => (
                      <Top5Row key={row.id||i} rank={i+1}
                        name={row.name||row.id}
                        sub={row.delta!==undefined
                          ? (sec.key==="rocket"?`▲${row.delta} posizioni in ranking`
                            :sec.key==="wallStreet"?`${row.delta>0?"+":""}$${row.delta} (${row.pct>0?"+":""}${row.pct}% dal giorno 0)`
                            :null)
                          : row.matches?`${row.matches} partite`:null}
                        value={sec.key==="hiddenGem"
                          ? (row.pts/(ownerMap?.[row.id]?.price||20)).toFixed(2)
                          : sec.key==="rocket" ? row.delta
                          : sec.key==="wallStreet" ? (row.delta>0?"+":"")+(row.delta||0)
                          : sec.key==="ownership" ? row.count
                          : Math.round((row._score||0)*10)/10}
                        unit={sec.unit} color={sec.color} bg={sec.bg}/>
                    ))
            }
          </div>
        );
      })}
    </StatPage>
  );
}

// ─── PAGINA 2: STATS UTENTI ───────────────────────────────────
function StatsUtenti({ onBack, accessToken }) {
  const [allData, setAllData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    if (!accessToken) return;
    loadUserStats(accessToken).then(d => { setAllData(d); setLoading(false); });
  }, []);

  async function loadUserStats(token) {
    try {
      // Classifica per Guru
      const sdb = await supabase.from("user_league_scores", token);
      const scores = await sdb.select("user_id,league_id,team_name,total_pts,budget");

      // Profili per username
      const pdb = await supabase.from("profiles", token);
      const profiles = await pdb.select("id,username");
      const profMap = {};
      if (Array.isArray(profiles)) profiles.forEach(p => { profMap[p.id] = p.username; });

      // Trasferimenti per Casinò e Trader — solo 2026
      const tdb = await supabase.from("transfer_history", token);
      const transfers = await tdb.select("user_id,league_id,action,price,budget_after,created_at",
        "&created_at=gte.2026-01-01T00:00:00Z&limit=2000");

      return buildUserStats(scores, profMap, transfers);
    } catch(e) { console.error("Stats utenti:", e); return null; }
  }

  function buildUserStats(scores, profMap, transfers) {
    if (!Array.isArray(scores)) return null;

    // Guru: classifica per punti totali per lega
    const buildGuru = (leagueId) => {
      const filtered = leagueId ? scores.filter(s => s.league_id === leagueId) : scores;
      // Globale: somma per utente
      if (!leagueId) {
        const byUser = {};
        filtered.forEach(s => {
          if (!byUser[s.user_id]) byUser[s.user_id] = { id:s.user_id, name:profMap[s.user_id]||s.user_id, pts:0, leagues:0 };
          byUser[s.user_id].pts += s.total_pts||0;
          byUser[s.user_id].leagues++;
        });
        return Object.values(byUser).sort((a,b)=>b.pts-a.pts).slice(0,5)
          .map(u => ({ ...u, _score: Math.round(u.pts*10)/10 }));
      }
      return filtered.sort((a,b)=>(b.total_pts||0)-(a.total_pts||0)).slice(0,5)
        .map(s => ({ id:s.user_id, name:profMap[s.user_id]||s.user_id, team:s.team_name, _score:Math.round((s.total_pts||0)*10)/10 }));
    };

    // Casinò: più operazioni di mercato
    const buildCasino = (leagueId) => {
      const filtered = leagueId ? (Array.isArray(transfers)?transfers.filter(t=>t.league_id===leagueId):[]) : (transfers||[]);
      const byUser = {};
      if (Array.isArray(filtered)) {
        filtered.forEach(t => {
          if (!byUser[t.user_id]) byUser[t.user_id] = { id:t.user_id, name:profMap[t.user_id]||t.user_id, ops:0, buys:0, sells:0 };
          byUser[t.user_id].ops++;
          if (t.action==="buy") byUser[t.user_id].buys++;
          else byUser[t.user_id].sells++;
        });
      }
      return Object.values(byUser).sort((a,b)=>b.ops-a.ops).slice(0,5)
        .map(u => ({ ...u, _score: u.ops }));
    };

    // Trader: guadagno netto da vendite (vendita - acquisto originale)
    const buildTrader = (leagueId) => {
      const filtered = leagueId ? (Array.isArray(transfers)?transfers.filter(t=>t.league_id===leagueId):[]) : (transfers||[]);
      const byUser = {};
      if (Array.isArray(filtered)) {
        filtered.forEach(t => {
          if (!byUser[t.user_id]) byUser[t.user_id] = { id:t.user_id, name:profMap[t.user_id]||t.user_id, spent:0, earned:0 };
          if (t.action==="buy") byUser[t.user_id].spent += t.price||0;
          else byUser[t.user_id].earned += t.price||0;
        });
      }
      return Object.values(byUser)
        .filter(u => u.earned > 0) // almeno una vendita
        .map(u => ({ ...u, _score: u.earned - u.spent, net: u.earned - u.spent }))
        .sort((a,b)=>b._score-a._score)
        .slice(0,5);
    };

    const build = (leagueId) => ({
      guru: buildGuru(leagueId),
      casino: buildCasino(leagueId),
      trader: buildTrader(leagueId),
    });

    return {
      global:   build(null),
      "L001-F": build("L001-F"),
      "L001-M": build("L001-M"),
      "L002-F": build("L002-F"),
      "L002-M": build("L002-M"),
    };
  }

  const sections = [
    { key:"guru",   emoji:"🧠", title:"Guru",   desc:"Più punti in classifica — il miglior fantacalciatore",       unit:" pt",  color:B.orange,  bg:B.orangePale },
    { key:"casino", emoji:"🎰", title:"Casinò", desc:"Più operazioni di mercato effettuate (buy + sell)",          unit:" op",  color:"#7C3AED", bg:"#F3E8FF"    },
    { key:"trader", emoji:"💹", title:"Trader", desc:"Guadagno netto dalle operazioni di mercato (venduto - comprato)", unit:"$", color:B.greenDark, bg:B.greenPale },
  ];

  return (
    <StatPage title="Stats Utenti" emoji="👥" onBack={onBack}>
      {sections.map(sec => {
        const [leagueTab, setLeagueTab] = React.useState("global");
        const tabs = [{id:"global",label:"🌍 Globale"}, ...STATS_LEAGUES.map(l=>({id:l.id,label:l.label}))];
        const rows = allData?.[leagueTab]?.[sec.key] || [];
        return (
          <div key={sec.key} style={{background:B.white,border:`1px solid ${B.creamDark}`,
            borderRadius:12,padding:"14px",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:20}}>{sec.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:"bold",fontSize:14,color:B.dark}}>{sec.title}</div>
                <div style={{fontSize:10,color:B.gray,marginTop:1}}>{sec.desc}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:4,overflowX:"auto",scrollbarWidth:"none",marginBottom:10}}>
              {tabs.map(t=>(
                <button key={t.id} onClick={()=>setLeagueTab(t.id)}
                  style={{flexShrink:0,padding:"4px 10px",borderRadius:20,border:"none",
                    cursor:"pointer",fontSize:10,fontFamily:"Georgia,serif",
                    fontWeight:leagueTab===t.id?"bold":"normal",
                    background:leagueTab===t.id?B.greenDark:B.grayPale,
                    color:leagueTab===t.id?B.white:B.gray}}>
                  {t.label}
                </button>
              ))}
            </div>
            {loading
              ? <div style={{textAlign:"center",padding:"16px",color:B.gray,fontSize:12}}>⏳ Caricamento...</div>
              : !allData
                ? <div style={{textAlign:"center",padding:"16px",color:B.gray,fontSize:12}}>Nessun dato disponibile</div>
                : rows.length===0
                  ? <div style={{textAlign:"center",padding:"16px",color:B.gray,fontSize:12}}>Nessun dato per questa lega</div>
                  : rows.map((row,i) => (
                      <Top5Row key={row.id||i} rank={i+1}
                        name={row.name||row.id}
                        sub={sec.key==="casino"?`${row.buys||0} acquisti · ${row.sells||0} vendite`
                          :sec.key==="trader"?`Guadagnato $${row.earned||0} · Speso $${row.spent||0}`
                          :sec.key==="guru"&&row.leagues?`${row.leagues} leghe`:row.team||null}
                        value={sec.key==="trader"?(row.net>0?"+":"")+row.net : row._score}
                        unit={sec.unit} color={sec.color} bg={sec.bg}/>
                    ))
            }
          </div>
        );
      })}
    </StatPage>
  );
}

// ─── PAGINA 3: AWARDS ─────────────────────────────────────────
function StatsAwards({ onBack, accessToken, athletesData }) {
  const allAthletesList = [...(athletesData?.women||[]), ...(athletesData?.men||[])];
  const globalNameMap = {};
  allAthletesList.forEach(a => { if (a.id && a.name) globalNameMap[a.id] = a.name; });
  const [allData, setAllData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    if (!accessToken) return;
    loadAwards(accessToken).then(d => { setAllData(d); setLoading(false); });
  }, []);

  async function loadAwards(token) {
    try {
      // Match results — filtra per eventi 2026 tramite join lato app
      // Prima carica gli event_id 2026
      const evdb0 = await supabase.from("events", token);
      const evList0 = await evdb0.select("id", "&anno=eq.2026&status=eq.Completato");
      const ev2026ids = Array.isArray(evList0) ? evList0.map(e => `"${e.id}"`).join(",") : "";
      const db = await supabase.from("match_results", token);
      const results = ev2026ids
        ? await db.select("player_id,player_name,total_pts,event_id,bonus_codes", `&event_id=in.(${ev2026ids})&limit=5000`)
        : [];

      // Mappa nomi atleti da player_history (più affidabile di match_results.player_name)
      const phdb = await supabase.from("player_history", token);
      const phRows = await phdb.select("player_id,player_name", "&order=synced_at.desc&limit=2000");
      const nameMap = {};
      if (Array.isArray(phRows)) phRows.forEach(r => { if (r.player_name && !nameMap[r.player_id]) nameMap[r.player_id] = r.player_name; });

      // Roster (attivi + venduti per Traditore)
      const rdb = await supabase.from("rosters", token);
      const rostersAll = await rdb.select("user_id,player_id,player_name,price,league_id,acquired_at,sold_at");

      // Transfer history per Fedelissimi e Traditore
      const tdb = await supabase.from("transfer_history", token);
      const transfers = await tdb.select("user_id,player_id,player_name,action,league_id,created_at", "&limit=2000");

      // Profili
      const pdb = await supabase.from("profiles", token);
      const profiles = await pdb.select("id,username");
      const profMap = {};
      if (Array.isArray(profiles)) profiles.forEach(p => { profMap[p.id] = p.username; });

      // Roster attivi per ownership
      const rdbActive = await supabase.from("rosters", token);
      const rostersActive = await rdbActive.select("player_id,player_name,league_id", "&sold_at=is.null");

      // Carica events per nomi tappe
      const evdb2 = await supabase.from("events", token);
      const evList = await evdb2.select("id,name", "&anno=eq.2026");
      const evMap = {};
      if (Array.isArray(evList)) evList.forEach(e => { evMap[e.id] = e; });
      const mergedNameMap = { ...nameMap, ...globalNameMap };
      return buildAwards(results, rostersAll, rostersActive, transfers, profMap, mergedNameMap, evMap);
    } catch(e) { console.error("Awards:", e); return null; }
  }

  function buildAwards(results, rostersAll, rostersActive, transfers, profMap, nameMap={}, evMap={}) {
    if (!Array.isArray(results)) return null;

    // Punti per atleta per evento
    const ptsByPlayerEvent = {};
    const ptsByPlayer = {};
    results.forEach(r => {
      if (!r.player_id) return;
      const key = `${r.player_id}::${r.event_id}`;
      if (!ptsByPlayerEvent[key]) ptsByPlayerEvent[key] = { player_id:r.player_id, name:nameMap[r.player_id]||r.player_name||r.player_id, event_id:r.event_id, tappaName:evMap[r.event_id]?.name||r.event_id, pts:0 };
      ptsByPlayerEvent[key].pts += r.total_pts||0;
      if (!ptsByPlayer[r.player_id]) ptsByPlayer[r.player_id] = { id:r.player_id, name:nameMap[r.player_id]||r.player_name||r.player_id, pts:0 };
      ptsByPlayer[r.player_id].pts += r.total_pts||0;
    });

    // BANDIT: squadra con più punti in una singola tappa
    // Somma i punti per user/lega/evento dai match_results × lineup
    // Approssimazione: usa la classifica per tappa (già calcolata dalla vista)
    // Per semplicità mostriamo l'atleta con più punti in una singola tappa
    const bandit = Object.values(ptsByPlayerEvent)
      .sort((a,b) => b.pts - a.pts)
      .slice(0,5)
      .map(a => ({ ...a, _score: Math.round(a.pts*10)/10 }));

    // SCAM: atleta più comprato ma meno punti
    const ownerCount = {};
    if (Array.isArray(rostersActive)) {
      rostersActive.forEach(r => {
        if (!ownerCount[r.player_id]) ownerCount[r.player_id] = { id:r.player_id, name:r.player_name||r.player_id, count:0 };
        ownerCount[r.player_id].count++;
      });
    }
    const scam = Object.values(ownerCount)
      .filter(a => (a.count||0) >= 2)
      .map(a => {
        const pts = ptsByPlayer[a.id]?.pts || 0;
        return { ...a, pts, _score: a.count - pts/10 };
      })
      .sort((a,b) => b._score - a._score)
      .slice(0,5);

    // FEDELISSIMI: utenti che non hanno mai venduto
    const selledUsers = new Set();
    if (Array.isArray(transfers)) {
      transfers.filter(t => t.action==="sell").forEach(t => selledUsers.add(t.user_id));
    }
    const allUsers = new Set();
    if (Array.isArray(rostersAll)) rostersAll.forEach(r => allUsers.add(r.user_id));
    const fedelissimi = [...allUsers]
      .filter(uid => !selledUsers.has(uid))
      .map(uid => ({ id:uid, name:profMap[uid]||uid, _score:1 }))
      .slice(0,5);

    // TRADITORE: ha venduto un atleta che poi ha fatto molti punti
    const traditore = [];
    if (Array.isArray(transfers)) {
      const sells = transfers.filter(t => t.action==="sell");
      sells.forEach(t => {
        const pts = ptsByPlayer[t.player_id]?.pts || 0;
        if (pts > 10) {
          traditore.push({
            id: t.user_id,
            name: profMap[t.user_id]||t.user_id,
            player: nameMap[t.player_id] || ptsByPlayer[t.player_id]?.name || t.player_name || t.player_id,
            pts,
            _score: pts,
          });
        }
      });
    }
    traditore.sort((a,b) => b._score - a._score);
    const tradiUnique = [];
    const seen = new Set();
    traditore.forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); tradiUnique.push(t); } });

    return { bandit, scam, traditore: tradiUnique.slice(0,5) };
  }

  const awards = [
    {
      key:"bandit", emoji:"💣", title:"The Bandit",
      desc:"L'atleta con il punteggio più alto in una singola tappa",
      color:B.orange, bg:B.orangePale,
      renderRow:(row,i) => <Top5Row key={row.player_id||i} rank={i}
        name={row.name} sub={`${row.tappaName && row.tappaName !== row.event_id ? row.tappaName : ("Tappa " + (row.event_id||"").replace(/^E0*/,""))}`}
        value={row._score} unit=" pt" color={B.orange} bg={B.orangePale}/>
    },
    {
      key:"scam", emoji:"🙈", title:"The Scam",
      desc:"L'atleta più comprato ma con i punti più bassi — la fregatura del mercato",
      color:"#DC2626", bg:"#FEE2E2",
      renderRow:(row,i) => <Top5Row key={row.id||i} rank={i}
        name={row.name} sub={`${row.count} roster · ${Math.round(row.pts*10)/10} pt totali`}
        value={row.count} unit=" roster" color={"#DC2626"} bg={"#FEE2E2"}/>
    },
    {
      key:"traditore", emoji:"🗡️", title:"Il Traditore",
      desc:"Ha venduto un atleta che poi ha fatto molti punti",
      color:"#7C3AED", bg:"#F3E8FF",
      renderRow:(row,i) => <Top5Row key={row.id||i} rank={i}
        name={row.name} sub={`Ha venduto ${row.player} (${Math.round(row.pts*10)/10} pt dopo)`}
        value={Math.round(row.pts*10)/10} unit=" pt persi" color={"#7C3AED"} bg={"#F3E8FF"}/>
    },
  ];

  return (
    <StatPage title="Awards" emoji="🏅" onBack={onBack}>
      <div style={{background:B.yellowPale,border:`1px solid ${B.yellow}`,borderRadius:10,
        padding:"10px 13px",marginBottom:14,fontSize:12,color:"#7A4F00"}}>
        🏅 Gli Awards sono calcolati automaticamente dai dati reali della stagione.
        Aggiornati dopo ogni Sync Risultati.
      </div>
      {awards.map(award => (
        <div key={award.key} style={{background:B.white,border:`1px solid ${B.creamDark}`,
          borderRadius:12,padding:"14px",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <span style={{fontSize:22}}>{award.emoji}</span>
            <div>
              <div style={{fontWeight:"bold",fontSize:14,color:B.dark}}>{award.title}</div>
              <div style={{fontSize:10,color:B.gray,marginTop:1}}>{award.desc}</div>
            </div>
          </div>
          {loading
            ? <div style={{textAlign:"center",padding:"12px",color:B.gray,fontSize:12}}>⏳ Caricamento...</div>
            : !allData
              ? <div style={{textAlign:"center",padding:"12px",color:B.gray,fontSize:12}}>Nessun dato disponibile</div>
              : (allData[award.key]||[]).length===0
                ? <div style={{textAlign:"center",padding:"12px",color:B.gray,fontSize:12}}>Nessun dato ancora</div>
                : (allData[award.key]||[]).map((row,i) => award.renderRow(row, i+1))
          }
        </div>
      ))}
    </StatPage>
  );
}


function AthleteProfile({a,onBack,isOwned,onBuy,onSell,budget,canTrade,accessToken}) {
  const cat  = getCategory(a.ranking);
  const diff = a.cost - (a.prevCost || a.cost);
  const rankDelta = a.rankDelta || null;
  const photo = ATHLETE_PHOTOS[a.id];
  const [fullHistory, setFullHistory] = React.useState(null);

  // Carica storico prezzi: 1 punto per giorno, max 30 giorni
  useEffect(() => {
    if (!accessToken || !a.id) return;
    const load = async () => {
      try {
        const db = await supabase.from("player_history", accessToken);
        // Prende tutte le righe ordinate per data — poi deduplicha per giorno lato JS
        const rows = await db.select("cost,ranking,synced_at",
          `&player_id=eq.${a.id}&order=synced_at.asc&limit=500`);
        if (Array.isArray(rows) && rows.length > 0) {
          // Deduplica: tieni solo L'ULTIMA riga per ogni giorno
          const byDay = {};
          rows.forEach(r => {
            const day = (r.synced_at || "").slice(0, 10); // "2026-05-13"
            byDay[day] = r; // sovrascrive → tieni l'ultima del giorno
          });
          // Ordina per giorno e prendi max 30
          const deduplicated = Object.values(byDay)
            .sort((a, b) => a.synced_at.localeCompare(b.synced_at))
            .slice(-30);
          // Forza l'ultimo punto al valore corrente dell'atleta
          if (deduplicated.length > 0) {
            deduplicated[deduplicated.length - 1] = {
              ...deduplicated[deduplicated.length - 1],
              cost: a.cost, // valore corrente
              ranking: a.ranking,
            };
          }
          setFullHistory(deduplicated);
        }
      } catch(e) { /* silenzioso */ }
    };
    load();
  }, [a.id]);

  // Grafico storico prezzi
  const historyData = fullHistory
    ? fullHistory.map((r, i, arr) => ({
        cost: r.cost,
        label: new Date(r.synced_at).toLocaleDateString("it-IT", {day:"2-digit",month:"2-digit"}),
        isCurrent: i === arr.length - 1,
      }))
    : (a.costHistory || [a.cost]).map((c, i, arr) => ({
        cost: c,
        label: i === arr.length-1 ? "Ora" : `Sync ${i+1}`,
        isCurrent: i === arr.length - 1,
      }));

  const costs = historyData.map(h => h.cost);
  const minV = Math.min(...costs) * 0.88;
  const maxV = Math.max(...costs) * 1.08;
  const range = maxV - minV || 1;

  return (
    <div>
      <button onClick={onBack} style={{background:B.grayPale,border:"none",color:B.gray,padding:"7px 14px",borderRadius:20,cursor:"pointer",marginBottom:14,fontSize:12,fontFamily:"Georgia,serif"}}>← Indietro</button>

      {/* HEADER ATLETA */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:14,padding:"18px 16px",marginBottom:12,textAlign:"center"}}>
        <div style={{width:80,height:80,borderRadius:"50%",margin:"0 auto 10px",overflow:"hidden",background:photo?"#000":cat.bg,border:`2px solid ${cat.text}44`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {photo?<img src={photo} alt={a.name} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}}/>:<LogoIcon size={54}/>}
        </div>
        <div style={{color:B.dark,fontWeight:"bold",fontSize:19}}>{a.name}</div>
        <div style={{display:"flex",justifyContent:"center",gap:8,margin:"8px 0 12px"}}>
          <span style={{fontSize:11,padding:"2px 10px",borderRadius:8,background:cat.bg,color:cat.text,fontWeight:"bold"}}>{cat.label}</span>
          <span style={{fontSize:11,padding:"2px 10px",borderRadius:8,background:B.grayPale,color:B.gray}}>{a.gender==="F"?"♀ Femminile":"♂ Maschile"}</span>
        </div>

        {/* STATS: ranking, costo, delta */}
        <div style={{display:"flex",justifyContent:"center",borderTop:`1px solid ${B.creamDark}`,paddingTop:12}}>
          {[
            {
              label:"Ranking",
              value:`#${a.ranking}`,
              color:B.orange,
              sub: rankDelta !== null && rankDelta !== 0
                ? <span style={{fontSize:11,color:rankDelta>0?B.greenDark:B.orange,fontWeight:"bold"}}>{rankDelta>0?`▲${rankDelta}`:`▼${Math.abs(rankDelta)}`} pos</span>
                : <span style={{fontSize:11,color:B.grayLight}}>—</span>
            },
            {
              label:"Costo",
              value:`$${a.cost}`,
              color:B.greenDark,
              sub: diff !== 0
                ? <span style={{fontSize:11,color:diff>0?B.greenDark:B.orange,fontWeight:"bold"}}>{diff>0?`▲$${diff}`:`▼$${Math.abs(diff)}`}</span>
                : <span style={{fontSize:11,color:B.grayLight}}>stabile</span>
            },
            {
              label:"Variazione",
              value: diff===0 ? "—" : diff>0 ? `+$${diff}` : `-$${Math.abs(diff)}`,
              color: diff>0?B.greenDark:diff<0?B.orange:B.gray,
              sub: <span style={{fontSize:11,color:B.grayLight}}>{diff===0?"nessuna":"vs. tappa prec."}</span>
            },
          ].map((s,i)=>(
            <div key={i} style={{flex:1,padding:"8px 4px",borderRight:i<2?`1px solid ${B.creamDark}`:"none"}}>
              <div style={{color:s.color,fontWeight:"bold",fontSize:18}}>{s.value}</div>
              <div style={{color:B.gray,fontSize:10,marginBottom:2}}>{s.label}</div>
              {s.sub}
            </div>
          ))}
        </div>

        {/* BOTTONE ACQUISTA/VENDI */}
        <div style={{marginTop:14}}>
          {isOwned
            ? <button onClick={onSell} style={{padding:"10px 24px",borderRadius:10,border:`1px solid ${canTrade?B.orange:B.grayLight}`,background:canTrade?B.orangePale:B.grayPale,color:canTrade?B.orange:B.gray,fontWeight:"bold",fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>
                {canTrade?`Vendi ($${a.cost})`:"Vendita bloccata"}
              </button>
            : <button onClick={onBuy} style={{padding:"10px 24px",borderRadius:10,border:"none",background:budget>=a.cost&&canTrade?B.greenDark:B.grayPale,color:budget>=a.cost&&canTrade?B.white:B.gray,fontWeight:"bold",fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>
                {!canTrade?"Mercato chiuso":budget>=a.cost?`Acquista ($${a.cost})`:"Crediti insufficienti"}
              </button>
          }
        </div>
      </div>

      {/* GRAFICO STORICO PREZZI */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px 13px",marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:12}}>
          Andamento Prezzo {fullHistory===null&&<span style={{fontSize:9,color:B.gray,fontWeight:"normal"}}>⏳</span>}
        </div>
        {(() => {
          // Dimensioni responsive — usa viewBox largo, si scala al 100% del contenitore
          const W = 360, H = 120, PAD = 28;
          const innerW = W - PAD * 2;
          const n = historyData.length;
          const px = (i) => PAD + (i / Math.max(n - 1, 1)) * innerW;
          const py = (v) => H - 26 - ((v - minV) / range) * (H - 50);
          const pts = historyData.map((h,i) => `${px(i)},${py(h.cost)}`).join(" ");
          const area = `${PAD},${H-26} ${pts} ${px(n-1)},${H-26}`;

          // Mostra label solo primo, ultimo e punti con cambio valore
          const showLabel = (i) => {
            if (i === 0 || i === n-1) return true;
            return historyData[i].cost !== historyData[i-1].cost;
          };

          return (
            <>
              <svg width="100%" viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="xMidYMid meet"
                style={{display:"block",overflow:"visible"}}>
                <polygon points={area} fill={B.greenDark} fillOpacity="0.07"/>
                <polyline points={pts} fill="none" stroke={B.greenDark} strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
                {historyData.map((h,i)=>{
                  const isLast = i === n-1;
                  const changed = i > 0 && h.cost !== historyData[i-1].cost;
                  // Mostra cerchio su tutti i punti ma più piccolo sui punti invariati
                  const r = (isLast || changed) ? 5 : 2.5;
                  const fillColor = isLast ? B.orange : B.greenDark;
                  return (
                    <g key={i}>
                      <circle cx={px(i)} cy={py(h.cost)} r={r} fill={fillColor}/>
                      {/* Mostra etichetta $ solo su primo, ultimo e cambio */}
                      {(i===0 || isLast || changed) && (
                        <text x={px(i)} y={py(h.cost)-9}
                          textAnchor={i===0?"start":isLast?"end":"middle"}
                          fontSize="9" fill={isLast?B.orange:B.dark}
                          fontFamily="Georgia,serif" fontWeight="bold">
                          ${h.cost}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
              {/* Label date — solo primo e ultimo */}
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4,paddingLeft:PAD-4,paddingRight:PAD-4}}>
                <div style={{fontSize:10,color:B.gray}}>{historyData[0]?.label}</div>
                <div style={{fontSize:10,color:B.orange,fontWeight:"bold"}}>{historyData[n-1]?.label} (ora)</div>
              </div>
            </>
          );
        })()}
      </div>

      {/* ULTIMI RISULTATI — stato vuoto sicuro, nessun mock */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px 13px"}}>
        <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:10}}>Ultimi Risultati</div>
        <div style={{textAlign:"center",padding:"20px",color:B.gray,fontSize:12}}>
          <div style={{fontSize:24,marginBottom:6}}>🏐</div>
          Nessun risultato disponibile per questa atleta
        </div>
      </div>
    </div>
  );
}

// ─── BONUS/MALUS DEFINITIONS ────────────────────────────────
const BONUS_META = {
  win20:    { icon:"🏆", label:"Vittoria 2-0",        color:B.greenDark, bg:B.greenPale,    pts:+4    },
  win21:    { icon:"🏅", label:"Vittoria 2-1",        color:B.greenDark, bg:B.greenPale,    pts:+3    },
  loss12:   { icon:"💪", label:"Sconfitta 1-2",       color:B.orange,    bg:B.orangePale,   pts:+1    },
  loss02:   { icon:"😔", label:"Sconfitta 0-2",       color:B.gray,      bg:B.grayPale,     pts:0     },
  bye:      { icon:"⏭️", label:"BYE (tavolino)",      color:B.greenDark, bg:B.greenPale,    pts:+4    },
  closeSet: { icon:"🎯", label:"Set perso di misura", color:"#7C3AED",   bg:"#F3E8FF",      pts:+0.5  },
  captain:  { icon:"★",  label:"Capitano",            color:B.yellow,    bg:B.yellowPale,   mult:1.3  },
  coachWin: { icon:"🧢", label:"Coach presente+vittoria", color:B.greenDark, bg:B.greenPale, pts:+0.5 },
  coachAbs: { icon:"🚫", label:"Coach assente tappa", color:"#DC2626",   bg:"#FEE2E2",      pts:-2    },
  coachNoBench: { icon:"⚠️", label:"Coach non in panchina", color:B.orange, bg:B.orangePale, pts:-1  },
  forfait:  { icon:"🤕", label:"Forfait partita",     color:B.orange,    bg:B.orangePale,   pts:-1    },
  absEvent: { icon:"❌", label:"Assente alla tappa",  color:"#DC2626",   bg:"#FEE2E2",      pts:-3    },
};

// Mock matches arricchiti con bonus/malus

const PHASE_ORDER = [
  // Nomi usati nel DB (dalla sync-results)
  "QUALI 1","QUALI 2","POOL 1","POOL 2","POOL 3","BYE POOL",
  "ROUND OF 16","ROUND OF 12","ROUND OF 8",
  "QUARTI","SEMIFINALE","FINALE 3","FINALE 1",
  // Nomi alternativi (vecchio formato 2025)
  "Qualifiche 1","Qualifiche 2","Pool 1","Pool 2","Pool 3","BYE Pool",
  "Round of 12","Round of 8","Quarti","Semifinale",
  "Finale 3° posto","Finale 1° posto",
];

function EventDetail({event, onBack, myRoster, matchResults, onLoad, athletes}) {
  useEffect(() => {
    if (onLoad) onLoad();
  }, [event.id]);

  if (matchResults === undefined) return (
    <div>
      <button onClick={onBack} style={{background:B.grayPale,border:"none",color:B.gray,padding:"7px 14px",borderRadius:20,cursor:"pointer",marginBottom:14,fontSize:12,fontFamily:"Georgia,serif"}}>← Calendario</button>
      <div style={{textAlign:"center",padding:"60px 20px",color:B.gray}}>
        <div style={{fontSize:32,marginBottom:10}}>⏳</div>
        <div>Caricamento risultati...</div>
      </div>
    </div>
  );

  const et = EVENT_TYPE_META[event.type] || EVENT_TYPE_META.Silver;
  const myPlayerIds = new Set((myRoster || []).map(a => a.id));
  const allAthletes = [...(athletes?.women||[]), ...(athletes?.men||[])];

  // Cognome da player_id — usa surname (colonna Cognome dal PLAYER_MAPPING via sync)
  const getPlayerName = (playerId) => {
    const find = (list) => list?.find(x => x.id === playerId);
    const a = find(myRoster) || find(allAthletes);
    if (!a) return playerId;
    // Usa stessa logica di extractSurname: tutto tranne l'ultimo token
    // Federation Name = "COGNOME NOME" → "DI PRIMA VALENTINA" → "DI PRIMA"
    const tokens = a.name.trim().split(" ");
    if (tokens.length === 1) return tokens[0].toUpperCase();
    return tokens.slice(0, -1).join(" ").toUpperCase();
  };

  // Per teamB: opponent è "COGNOME1 NOME1 - COGNOME2 NOME2" (Federation Name format)
  // Prende tutto tranne l'ultimo token = cognome (funziona anche per DI PRIMA)
  const extractSurname = (fullName) => {
    if (!fullName) return "";
    const tokens = fullName.trim().split(" ");
    if (tokens.length === 1) return tokens[0].toUpperCase();
    // Formato COGNOME NOME → tutto tranne ultimo = cognome
    return tokens.slice(0, -1).join(" ").toUpperCase();
  };

  // Ricostruisce partite uniche raggruppando per match_index
  // Ogni partita ha 4 righe: 2 per coppia A e 2 per coppia B con opponent invertito
  const buildMatches = (rows) => {
    const byIndex = {};
    rows.forEach(r => {
      if (!byIndex[r.match_index]) byIndex[r.match_index] = [];
      byIndex[r.match_index].push(r);
    });

    return Object.values(byIndex).map(matchRows => {
      const first = matchRows[0];

      // BYE
      if (first.is_bye) {
        const teamANames = matchRows.slice(0,2)
          .map(r => getPlayerName(r.player_id)).filter(Boolean).join(" - ");
        return {
          phase: first.phase, result: "2-0", score: "21-0 21-0",
          isBye: true, teamA: teamANames || "—", teamB: "",
          winA: true, winB: false,
          myInMatch: matchRows.filter(r => myPlayerIds.has(r.player_id)),
          _rows: matchRows,
        };
      }

      // Partita normale: raggruppa per opponent
      const groups = {};
      matchRows.forEach(r => {
        const key = r.opponent || "";
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
      });

      const groupEntries = Object.entries(groups);

      if (groupEntries.length < 2) {
        const g = groupEntries[0]?.[1] || matchRows;
        const names = g.slice(0,2).map(r => getPlayerName(r.player_id)).filter(Boolean).join(" - ");
        const oppRaw = g[0]?.opponent || "";
        const oppNames = oppRaw ? oppRaw.split(" - ").map(n => extractSurname(n.trim())).join(" - ") : "—";
        return {
          phase: first.phase, result: g[0]?.result || "—",
          score: g[0]?.score || "", isBye: false,
          teamA: names, teamB: oppNames,
          winA: g[0]?.result?.startsWith("2") || false,
          winB: !(g[0]?.result?.startsWith("2") || false),
          myInMatch: matchRows.filter(r => myPlayerIds.has(r.player_id)),
          _rows: matchRows,
        };
      }

      // Coppia A = gruppo con player_id numericamente più basso
      // (la sync salva prima coppia A poi coppia B, W0013 < W0036 → ZANON è coppia A)
      const [key1, rows1] = groupEntries[0];
      const [key2, rows2] = groupEntries[1];
      const minId1 = Math.min(...rows1.map(r => parseInt(r.player_id.slice(1))));
      const minId2 = Math.min(...rows2.map(r => parseInt(r.player_id.slice(1))));
      const [rowsA, rowsB] = minId1 < minId2 ? [rows1, rows2] : [rows2, rows1];

      // Nome coppia A dai player_id (cognomi reali)
      const teamANames = rowsA.slice(0,2)
        .map(r => getPlayerName(r.player_id)).filter(Boolean).join(" - ");

      // Nome coppia B dall'opponent di coppia A
      const teamBRaw = rowsA[0]?.opponent || "";
      const teamBNames = teamBRaw
        ? teamBRaw.split(" - ").map(n => extractSurname(n.trim())).join(" - ")
        : "";

      // Risultato dalla prospettiva di coppia A (non riordinare mai)
      const resultA = rowsA[0]?.result || "—";
      const winA = resultA.startsWith("2");
      const winB = !winA;
      const myInMatch = matchRows.filter(r => myPlayerIds.has(r.player_id));

      return {
        phase: first.phase,
        result: rowsA[0]?.result || "—",
        score: rowsA[0]?.score || "",
        isBye: false,
        teamA: teamANames || "—",
        teamB: teamBNames || "—",
        winA, winB,
        myInMatch,
        _rows: matchRows,
      };
    }).sort((a,b) => a._rows[0].match_index - b._rows[0].match_index);
  };

  const builtMatches = (() => {
    try { return buildMatches(matchResults || []); }
    catch(e) { console.warn("buildMatches error:", e); return []; }
  })();

  const phasesPresent = [...new Set(builtMatches.map(m => m.phase))];
  const phases = [
    ...PHASE_ORDER.filter(p => phasesPresent.includes(p)),
    ...phasesPresent.filter(p => !PHASE_ORDER.includes(p)),
  ];

  return (
    <div>
      <button onClick={onBack} style={{background:B.grayPale,border:"none",color:B.gray,padding:"7px 14px",borderRadius:20,cursor:"pointer",marginBottom:14,fontSize:12,fontFamily:"Georgia,serif"}}>← Calendario</button>
      <div style={{background:B.greenDark,borderRadius:12,padding:"14px 16px",marginBottom:14,color:B.white}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontWeight:"bold",fontSize:17}}>{event.name}</div>
            <div style={{color:"rgba(255,255,255,.7)",fontSize:11,marginTop:2}}>{event.date_start||event.date}{event.location?` · ${event.location}`:""}</div>
          </div>
          <div style={{background:et.bg,color:et.color,padding:"3px 10px",borderRadius:8,fontSize:11,fontWeight:"bold"}}>{et.label} ×{et.weight}</div>
        </div>
      </div>

      {builtMatches.length === 0 ? (
        <div style={{textAlign:"center",padding:"40px 20px",color:B.gray}}>
          <div style={{fontSize:40,marginBottom:10}}>{event.status==="In corso"?"🔴":"📋"}</div>
          <div style={{fontSize:13,fontWeight:"bold",color:B.dark,marginBottom:6}}>
            {event.status==="In corso" ? "Tappa in corso — risultati non ancora inseriti" : "Nessun risultato disponibile"}
          </div>
          <div style={{fontSize:11,color:B.gray,lineHeight:1.5}}>
            {event.status==="In corso"
              ? "I risultati verranno caricati dall\u2019admin al termine di ogni giornata di gara."
              : "I risultati di questa tappa non sono ancora stati inseriti nel sistema."}
          </div>
        </div>
      ) : phases.map(phase => {
        const phaseMatches = builtMatches.filter(m => m.phase === phase);
        const isGrid = ["QUALI","QUALIF","POOL","ROUND","GROUP"].some(k => phase.toUpperCase().includes(k));
        return (
          <div key={phase} style={{marginBottom:18}}>
            <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1,height:1,background:B.creamDark}}/>{phase} ({phaseMatches.length})<div style={{flex:1,height:1,background:B.creamDark}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isGrid?"repeat(auto-fill,minmax(min(100%,300px),1fr))":"1fr",gap:6}}>
              {phaseMatches.map((m, i) => {
                const hasMyPlayer = m.myInMatch.length > 0;
                return (
                  <div key={i} style={{
                    background: hasMyPlayer ? B.greenPale : B.white,
                    border:`1px solid ${hasMyPlayer?B.greenDark:B.creamDark}`,
                    borderLeft:`3px solid ${hasMyPlayer?B.greenDark:B.creamDark}`,
                    borderRadius:8, padding:"10px",
                    textAlign:"center",
                  }}>
                    {/* Coppia A */}
                    <div style={{
                      fontSize:11,
                      fontWeight: m.winA||m.isBye ? "bold" : "normal",
                      color: m.winA||m.isBye ? B.dark : "#555",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                      marginBottom:4,
                    }}>
                      {m.teamA || "—"}
                    </div>

                    {/* Risultato + score */}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,margin:"4px 0"}}>
                      <span style={{
                        fontSize:11,fontWeight:"bold",
                        background: m.winA||m.isBye ? B.greenDark : B.orange,
                        color:B.white,
                        padding:"2px 8px",borderRadius:4,flexShrink:0,
                      }}>
                        {m.isBye?"2-0":m.result}
                      </span>
                      <span style={{fontSize:10,color:B.gray}}>
                        {m.isBye?"21-0 21-0":m.score}
                      </span>
                    </div>

                    {/* Coppia B o BYE */}
                    <div style={{
                      fontSize:11,
                      fontWeight: m.winB ? "bold" : "normal",
                      color: m.isBye ? B.grayLight : m.winB ? B.dark : "#555",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                      marginTop:4, fontStyle:m.isBye?"italic":"normal",
                    }}>
                      {m.isBye ? "BYE" : (m.teamB || "—")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
// ─── PAGINA STORICO TAPPE ─────────────────────────────────────
function PageHistory({ authUser, accessToken, leagueId, leagues, events, coachesList, athletesData, onBack }) {
  const [selectedLeague, setSelectedLeague] = React.useState(leagueId || "L001-F");
  const [selectedEventId, setSelectedEventId] = React.useState(null);
  const [historyData, setHistoryData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const league = leagues.find(l => l.id === selectedLeague);
  const completedEvents = events.filter(e =>
    e.status === "Completato" &&
    (e.anno || 2026) === 2026 &&
    (e.gender || "").toUpperCase() === (league?.gender || "F")
  );

  const loadHistory = async (eventId) => {
    if (!accessToken || !authUser?.id) return;
    setLoading(true);
    setHistoryData(null);
    try {
      const [matchRes, lineupRes, coachSelRes] = await Promise.all([
        supabase.from("match_results", accessToken).then(db =>
          db.select("*", `&event_id=eq.${eventId}&order=match_index.asc`)),
        supabase.from("lineup_history", accessToken).then(db =>
          db.select("*", `&user_id=eq.${authUser.id}&league_id=eq.${selectedLeague}&event_id=eq.${eventId}`)),
        supabase.from("coach_selections", accessToken).then(db =>
          db.select("*", `&user_id=eq.${authUser.id}&league_id=eq.${selectedLeague}`)),
      ]);

      const matches = Array.isArray(matchRes) ? matchRes : [];
      const lineup = Array.isArray(lineupRes) ? lineupRes : [];
      const coachSel = Array.isArray(coachSelRes) ? coachSelRes[0] : null;

      // Costruisce mappa player_id → role dalla lineup
      const roleMap = {};
      lineup.forEach(l => { roleMap[l.player_id] = l.role; });

      // Trova evento per moltiplicatore
      const event = events.find(e => e.id === eventId);
      const et = EVENT_TYPE_META[event?.type] || EVENT_TYPE_META.Silver;

      // Raggruppa match per player_id
      const byPlayer = {};
      matches.forEach(m => {
        if (!m.player_id) return;
        if (!byPlayer[m.player_id]) byPlayer[m.player_id] = { player_id: m.player_id, player_name: m.player_name, matches: [] };
        byPlayer[m.player_id].matches.push(m);
      });

      // Mappa atleti per genere lega → nome leggibile
      const athleteList = (league?.gender || "F").toUpperCase() === "F"
        ? (athletesData?.women || [])
        : (athletesData?.men || []);
      const athleteMap = Object.fromEntries(athleteList.map(a => [a.id, a]));

      // Calcola punti per ogni giocatore in lineup
      const players = lineup.map(l => {
        const playerData = byPlayer[l.player_id] || { player_id: l.player_id, player_name: l.player_id, matches: [] };
        const role = l.role;
        const isStarter = role === "titolare" || role === "capitano";
        const isCaptain = role === "capitano";

        let rawPts = 0;
        playerData.matches.forEach(m => {
          const codes = m.bonus_codes || [];
          const coachWinPts = codes.includes("coachWin") ? 0.5 : 0;
          rawPts += (m.base_pts || 0) + (m.bonus_pts || 0) - coachWinPts;
        });

        const withMult = rawPts * (et.weight || 1);
        const finalPts = withMult * (isCaptain ? 1.3 : 1);

        const playerName =
          playerData.player_name ||
          athleteMap[l.player_id]?.name ||
          l.player_id;

        return { ...playerData, player_name: playerName, role, isStarter, isCaptain, rawPts, finalPts: Math.round(finalPts * 100) / 100 };
      });

      // Coach — letto dalle colonne CONGELATE in lineup_history (non da coach_selections)
      let coachPts = 0;
      const frozenCoachRow = lineup.find(l => l.coach_id);
      const frozenCoachId = frozenCoachRow?.coach_id || null;
      const coachInField = frozenCoachRow?.coach_in_field || false;
      const coach = frozenCoachId ? coachesList.find(c => c.id === frozenCoachId) : null;
      if (coach && coachInField) {
        // +0.5 per ogni match in cui ALMENO una coppia del coach ha vinto (gestisce i derby)
        const wonByMatch = {};
        matches.filter(m => m.coach_id === frozenCoachId).forEach(m => {
          const won = (m.result || "").startsWith("2") || m.is_bye;
          if (won) wonByMatch[m.match_index] = true;
          else if (!(m.match_index in wonByMatch)) wonByMatch[m.match_index] = false;
        });
        coachPts = Object.values(wonByMatch).filter(Boolean).length * 0.5;
      }

      const starters = players.filter(p => p.isStarter);
      const bench = players.filter(p => !p.isStarter);
      const totalPts = starters.reduce((s, p) => s + p.finalPts, 0) + coachPts;

      setHistoryData({ players, starters, bench, coach, coachPts, coachInField, totalPts: Math.round(totalPts * 100) / 100, et, event });
    } catch(e) { console.error("Errore storico:", e); }
    setLoading(false);
  };

  React.useEffect(() => {
    setSelectedEventId(null);
    setHistoryData(null);
  }, [selectedLeague]);
const MatchRows = ({ matches }) => {
    if (!matches || matches.length === 0) return null;
    return (
      <div style={{marginTop:8,borderTop:`1px solid ${B.creamDark}`,paddingTop:6}}>
        {matches.map((m,i) => {
          const tot = (m.total_pts != null) ? m.total_pts : (m.base_pts||0) + (m.bonus_pts||0);
          const win = (m.result||"").startsWith("2");
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",borderBottom:i<matches.length-1?`1px solid ${B.creamDark}`:"none"}}>
              <div style={{fontSize:9,color:B.gray,minWidth:62,flexShrink:0}}>{m.phase||"—"}</div>
              <span style={{fontSize:10,fontWeight:"bold",flexShrink:0,padding:"1px 6px",borderRadius:4,
                background:m.is_bye?B.greenPale:win?"#D1FAE5":"#FEE2E2",
                color:m.is_bye?B.greenDark:win?"#065F46":"#DC2626"}}>
                {m.is_bye?"BYE":(m.result||"—")}
              </span>
              <div style={{flex:1,minWidth:0,fontSize:10,color:B.gray,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {m.is_bye?"—":(m.opponent||"—")}{m.score?` · ${m.score}`:""}
              </div>
              <div style={{fontSize:10,color:B.gray,flexShrink:0,minWidth:46,textAlign:"right"}}>
                {m.base_pts>0?`+${m.base_pts}`:(m.base_pts||0)}{m.bonus_pts?` ${m.bonus_pts>0?"+":""}${m.bonus_pts}`:""}
              </div>
              <div style={{fontSize:11,fontWeight:"bold",flexShrink:0,minWidth:28,textAlign:"right",
                color:tot>0?B.greenDark:tot<0?B.orange:B.gray}}>
                {tot>0?`+${tot}`:tot}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  return (
    <MenuPage title="Storico Tappe" emoji="📊" onBack={onBack}>

      {/* Selettore lega */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {leagues.map(l => (
          <button key={l.id} onClick={()=>setSelectedLeague(l.id)}
            style={{padding:"6px 12px",borderRadius:20,border:`1px solid ${selectedLeague===l.id?B.orange:B.creamDark}`,
              background:selectedLeague===l.id?B.orange:B.white,
              color:selectedLeague===l.id?B.white:B.dark,
              fontWeight:selectedLeague===l.id?"bold":"normal",
              fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif"}}>
            {l.name}
          </button>
        ))}
      </div>

      {/* Lista tappe completate */}
      {completedEvents.length === 0 ? (
        <div style={{textAlign:"center",padding:"40px 20px",color:B.gray}}>
          <div style={{fontSize:36,marginBottom:10}}>📅</div>
          <div style={{fontSize:13,color:B.dark,fontWeight:"bold"}}>Nessuna tappa completata ancora</div>
          <div style={{fontSize:11,color:B.gray,marginTop:4}}>I dati appariranno dopo la prima tappa disputata.</div>
        </div>
      ) : (
        <div>
          <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:16}}>
            {completedEvents.map(e => {
              const et = EVENT_TYPE_META[e.type] || EVENT_TYPE_META.Silver;
              const isSelected = selectedEventId === e.id;
              return (
                <button key={e.id}
                  onClick={()=>{ setSelectedEventId(e.id); loadHistory(e.id); }}
                  style={{background:isSelected?B.greenDark:B.white,
                    border:`1px solid ${isSelected?B.greenDark:B.creamDark}`,
                    borderLeft:`4px solid ${isSelected?B.white:et.color}`,
                    borderRadius:10,padding:"11px 14px",cursor:"pointer",fontFamily:"Georgia,serif",
                    display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:"bold",fontSize:13,color:isSelected?B.white:B.dark}}>{e.name}</div>
                    <div style={{fontSize:10,color:isSelected?"rgba(255,255,255,.7)":B.gray,marginTop:2}}>{e.date_start||e.date}</div>
                  </div>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:8,fontWeight:"bold",
                    background:isSelected?"rgba(255,255,255,.2)":et.bg,
                    color:isSelected?B.white:et.color}}>
                    ×{et.weight}
                  </span>
                  <span style={{color:isSelected?"rgba(255,255,255,.7)":B.grayLight,fontSize:12}}>›</span>
                </button>
              );
            })}
          </div>

          {/* Dettaglio tappa selezionata */}
          {loading && (
            <div style={{textAlign:"center",padding:"30px",color:B.gray,fontSize:12}}>⏳ Caricamento...</div>
          )}

          {historyData && !loading && (
            <div>
              <div style={{background:B.greenDark,borderRadius:12,padding:"12px 14px",marginBottom:14,color:B.white,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:"bold",fontSize:15}}>{historyData.event?.name}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.7)",marginTop:2}}>{historyData.et.label} ×{historyData.et.weight}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:24,fontWeight:"bold"}}>{historyData.totalPts}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,.7)"}}>punti totali</div>
                </div>
              </div>

              {/* Titolari */}
              <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:8}}>⚡ Titolari</div>
              {historyData.starters.length === 0
                ? <div style={{fontSize:12,color:B.gray,marginBottom:12}}>Nessuna formazione salvata per questa tappa.</div>
                : historyData.starters.map((p,i) => (
                  <div key={p.player_id} style={{background:B.white,border:`1px solid ${B.greenDark}`,borderLeft:`3px solid ${p.isCaptain?B.yellow:B.greenDark}`,borderRadius:10,padding:"10px 12px",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:"bold",color:B.dark}}>
                          {p.isCaptain&&<span style={{color:B.yellow,marginRight:4}}>★</span>}{p.player_name||p.player_id}
                        </div>
                        <div style={{fontSize:10,color:B.gray,marginTop:2}}>
                          {p.matches.length} {p.matches.length===1?"partita":"partite"}
                          {p.isCaptain&&<span style={{color:B.yellow,marginLeft:6}}>× 1.3 cap</span>}
                          {" · "}base {Math.round(p.rawPts * 100) / 100} pt × {historyData.et.weight}
                        </div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:18,fontWeight:"bold",color:p.finalPts>0?B.greenDark:B.gray}}>{p.finalPts>0?`+${p.finalPts}`:p.finalPts}</div>
                        <div style={{fontSize:9,color:B.gray}}>pt tappa</div>
                      </div>
                    </div>
                    <MatchRows matches={p.matches}/>
                  </div>
                ))
              }

              {/* Coach */}
              {historyData.coach && (
                <div style={{background:historyData.coachInField?B.yellowPale:B.grayPale,
                  border:`1px solid ${historyData.coachInField?B.yellow:B.grayLight}`,
                  borderRadius:10,padding:"10px 12px",marginBottom:14,display:"flex",alignItems:"center",gap:10,opacity:historyData.coachInField?1:0.65}}>
                  <span style={{fontSize:20}}>🧢</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:"bold",color:B.dark}}>{historyData.coach.name}</div>
                    <div style={{fontSize:10,color:B.gray}}>{historyData.coachInField?"Schierato":"In panchina — punti non conteggiati"}</div>
                  </div>
                  {historyData.coachInField&&(
                    <div style={{fontSize:18,fontWeight:"bold",color:historyData.coachPts>0?B.greenDark:B.gray}}>
                      {historyData.coachPts>0?`+${historyData.coachPts}`:historyData.coachPts}
                    </div>
                  )}
                </div>
              )}

              {/* Panchina */}
              {historyData.bench.length > 0 && (
                <div>
                  <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.gray,marginBottom:8}}>⏸ Panchina (non conteggiata)</div>
                 {historyData.bench.map(p => (
                    <div key={p.player_id} style={{background:B.grayPale,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"10px 12px",marginBottom:6,opacity:0.65}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,color:B.dark}}>{p.player_name||p.player_id}</div>
                          <div style={{fontSize:10,color:B.gray}}>{p.matches.length} partite · base {Math.round(p.rawPts*100)/100} pt</div>
                        </div>
                        <div style={{fontSize:13,color:B.gray}}>({p.finalPts} pt)</div>
                      </div>
                      <MatchRows matches={p.matches}/>
                    </div>
                  ))}
                </div>
              )}

              {/* Totale */}
              <div style={{background:B.greenDark,borderRadius:10,padding:"14px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
                <div style={{color:"rgba(255,255,255,.9)",fontSize:14,fontWeight:"bold"}}>Totale tappa</div>
                <span style={{color:B.white,fontWeight:"bold",fontSize:24}}>{historyData.totalPts>0?`+${historyData.totalPts}`:historyData.totalPts} pt</span>
              </div>
            </div>
          )}
        </div>
      )}
       </MenuPage>
  );
}
   // ─── PAGINA FORMAZIONI DI LEGA (per tappa) ───────────────────
// ─── PAGINA RISULTATI TAPPA (dati reali dall'API, tabelle fivb_*) ───
function PageRisultati({ accessToken, events, leagueId, leagues, onBack }) {
  const [map, setMap] = React.useState([]);
  const [sel, setSel] = React.useState(null);        // { location, vis }
  const [matches, setMatches] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [view, setView] = React.useState("lista");   // "lista" | "bracket"

  const A = { card:"#FFFFFF", line:"#ECECF0", text:"#1C1C1E", sub:"#8E8E93", soft:"#B0B0B8", accent:"#2D5C4F", track:"#EDEDF1" };
  const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

  const league = leagues ? leagues.find(l => l.id === leagueId) : null;
  const gender = (league?.gender || "M").toUpperCase();

  React.useEffect(() => {
    if (!accessToken) return;
    supabase.from("event_tournament_map", accessToken)
      .then(db => db.select("*", "&limit=200"))
      .then(rows => setMap(Array.isArray(rows) ? rows : []))
      .catch(() => setMap([]));
  }, [accessToken]);

  const visByEvent = Object.fromEntries(map.map(m => [m.event_id, m.vis_id]));
  const tappe = [];
  const seen = {};
  events
    .filter(e => (e.anno || 2026) === 2026 && (e.gender || "").toUpperCase() === gender && visByEvent[e.id])
    .forEach(e => {
      const key = e.location || e.name;
      if (!seen[key]) { seen[key] = { location: key, vis: visByEvent[e.id] }; tappe.push(seen[key]); }
    });

  const loadMatches = async (location, vis) => {
    setSel({ location, vis });
    setLoading(true); setMatches(null);
    try {
      const rows = await supabase.from("fivb_matches", accessToken)
        .then(db => db.select(
          "match_no,phase,pool,round,team_a_name,team_b_name,result,sets,status",
          `&tournament_vis_id=eq.${vis}&order=match_no.asc&limit=500`));
      setMatches(Array.isArray(rows) ? rows : []);
    } catch (e) { console.error("Errore risultati:", e); setMatches([]); }
    setLoading(false);
  };

  // etichetta + peso (ordine decrescente: finali in alto, qualifiche in fondo)
  const groupInfo = (phase, pool, round, realCount, byeCount) => {
    const r = round || "";
    if (phase === "main_draw") {
      if (/3°-4°|3-4/.test(r)) return { label: "Finale 3°/4° posto", w: 1 };
      if (/1°-2°|1-2/.test(r) || r === "Finale") return { label: "Finale", w: 0 };
      // squadre nel turno = partite vere × 2 + bye (chi passa diretto)
      const teams = realCount * 2 + byeCount;
      const byTeams = { 4:"Semifinali", 8:"Quarti di finale", 12:"Round of 12", 16:"Ottavi di finale", 24:"Round of 24", 32:"Sedicesimi di finale" };
      return { label: byTeams[teams] || r, w: teams };
    }
    if (phase === "pool") {
      const L = (pool || "?").toUpperCase();
      return { label: `Pool ${L}`, w: 1000 + (L.charCodeAt(0) - 65) };
    }
    // qualificazioni: un blocco per percorso, in ordine prima→sesta
    const po = { prima:1, seconda:2, terza:3, quarta:4, quinta:5, sesta:6, settima:7, ottava:8 };
    const mm = r.match(/percorso\s+(\w+)\s+coppia/i);
    const ord = mm ? (po[mm[1].toLowerCase()] || 99) : 99;
    return { label: r || "Qualificazioni", w: 2000 + ord };
  };

  const gmap = {};
  (matches || []).forEach(m => {
    let key;
    if (m.phase === "pool") key = `pool|${m.pool}`;
    else if (m.phase === "main_draw") key = `md|${m.round}`;
    else key = `qual|${m.round}`;
    if (!gmap[key]) gmap[key] = { phase: m.phase, pool: m.pool, round: m.round, rows: [] };
    gmap[key].rows.push(m);   // include i bye, servono per contare le squadre
  });
  const groups = Object.values(gmap)
    .map(g => {
      const real = g.rows.filter(m => m.status !== "bye");
      const byes = g.rows.length - real.length;
      return { ...g, rows: real, ...groupInfo(g.phase, g.pool, g.round, real.length, byes) };
    })
    .filter(g => g.rows.length > 0)
    .sort((a, b) => a.w - b.w);

  // sezioni per fase (Main Draw / Pool / Qualifiche) con sfondo leggero
  const phaseMeta = {
    main_draw:     { label: "Main Draw",  bg: "#E9F2EE", w: 0 },
    pool:          { label: "Pool",       bg: "#FAF1E0", w: 1 },
    qualification: { label: "Qualifiche", bg: "#EDEFF4", w: 2 },
  };
  const sections = [];
  const smap = {};
  groups.forEach(g => {
    if (!smap[g.phase]) { smap[g.phase] = { phase: g.phase, groups: [] }; sections.push(smap[g.phase]); }
    smap[g.phase].groups.push(g);
  });
  sections.sort((a, b) => (phaseMeta[a.phase]?.w ?? 9) - (phaseMeta[b.phase]?.w ?? 9));

  const setsTxt = (s) => Array.isArray(s) ? s.map(x => `${x[0]}\u2013${x[1]}`).join("   ") : "";

  return (
    <MenuPage title="Risultati Tappa" emoji="🏟️" onBack={onBack}>
      <div style={{fontFamily:SANS}}>
        <div style={{fontSize:12,color:A.sub,margin:"0 2px 12px"}}>
          {league ? `${league.name} · ${gender === "F" ? "Femminile" : "Maschile"}` : ""}
        </div>

        {/* selettore tappa */}
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4,marginBottom:16}}>
          {tappe.length === 0 && <div style={{color:A.sub,fontSize:13}}>Nessuna tappa mappata.</div>}
          {tappe.map(t => {
            const on = sel?.location === t.location;
            return (
              <button key={t.location} onClick={() => loadMatches(t.location, t.vis)}
                style={{flexShrink:0,padding:"7px 16px",borderRadius:980,border:"none",cursor:"pointer",fontFamily:SANS,fontSize:13,fontWeight:on?600:500,background:on?A.accent:A.track,color:on?"#FFFFFF":A.text}}>
                {t.location}
              </button>
            );
          })}
        </div>

        {/* toggle Lista / Bracket */}
        {sel && (
          <div style={{display:"flex",background:A.track,borderRadius:10,padding:3,marginBottom:20}}>
            {[["lista","Lista"],["bracket","Bracket"]].map(([v,lab]) => {
              const on = view === v;
              return (
                <button key={v} onClick={() => setView(v)}
                  style={{flex:1,padding:"7px 0",borderRadius:8,border:"none",cursor:"pointer",fontFamily:SANS,fontSize:13,fontWeight:on?600:500,
                    background:on?"#FFFFFF":"transparent",color:on?A.text:A.sub,boxShadow:on?"0 1px 3px rgba(0,0,0,0.10)":"none"}}>
                  {lab}
                </button>
              );
            })}
          </div>
        )}

        {!sel && <div style={{color:A.sub,fontSize:14,textAlign:"center",padding:"48px 0"}}>Scegli una tappa.</div>}
        {loading && <div style={{color:A.sub,fontSize:14,textAlign:"center",padding:"48px 0"}}>Caricamento…</div>}

        {/* BRACKET: predisposto, da disegnare */}
        {sel && !loading && view === "bracket" && (
          <div style={{textAlign:"center",padding:"56px 20px",color:A.sub}}>
            <div style={{fontSize:34,marginBottom:10}}>🗂️</div>
            <div style={{fontSize:15,fontWeight:600,color:A.text,marginBottom:6}}>Bracket in arrivo</div>
            <div style={{fontSize:13,lineHeight:1.5}}>La vista ad albero del tabellone è predisposta ma non ancora disegnata. Per ora usa la Lista.</div>
          </div>
        )}

        {/* LISTA */}
        {sel && !loading && view === "lista" && matches && matches.length === 0 && (
          <div style={{color:A.sub,fontSize:14,textAlign:"center",padding:"48px 0"}}>Nessuna partita disponibile per questa tappa.</div>
        )}
        {!loading && view === "lista" && sections.map((sec, si) => {
          const pm = phaseMeta[sec.phase] || { label: sec.phase, bg: "#F2F2F7" };
          return (
            <div key={si} style={{marginBottom:26}}>
              <div style={{background:pm.bg,borderRadius:10,padding:"9px 14px",marginBottom:12}}>
                <span style={{fontSize:12,fontWeight:700,color:A.text,letterSpacing:0.6,textTransform:"uppercase"}}>{pm.label}</span>
              </div>
              {sec.groups.map((g, gi) => (
                <div key={gi} style={{marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:600,color:A.text,margin:"0 2px 8px"}}>{g.label}</div>
                  <div style={{background:A.card,borderRadius:14,border:`1px solid ${A.line}`,overflow:"hidden"}}>
                    {g.rows.map((m, mi) => {
                      const a = m.team_a_name || "—", b = m.team_b_name || "—";
                      const parts = (m.result || "").split("-");
                      const ra = parts[0] || "", rb = parts[1] || "";
                      const sch = m.status === "scheduled" || !m.result;
                      const aWin = !sch && ra > rb, bWin = !sch && rb > ra;
                      return (
                        <div key={mi} style={{padding:"13px 15px",borderTop:mi>0?`1px solid ${A.line}`:"none"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                            <span style={{fontSize:14,color:A.text,fontWeight:aWin?600:400}}>{a}</span>
                            <span style={{fontSize:15,fontWeight:700,color:aWin?A.accent:A.soft,minWidth:16,textAlign:"right"}}>{sch?"":ra}</span>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginTop:5}}>
                            <span style={{fontSize:14,color:A.text,fontWeight:bWin?600:400}}>{b}</span>
                            <span style={{fontSize:15,fontWeight:700,color:bWin?A.accent:A.soft,minWidth:16,textAlign:"right"}}>{sch?"":rb}</span>
                          </div>
                          {m.sets && <div style={{fontSize:12,color:A.soft,marginTop:7,fontVariantNumeric:"tabular-nums"}}>{setsTxt(m.sets)}</div>}
                          {sch && <div style={{fontSize:12,color:"#C7A23A",marginTop:7}}>Da giocare</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </MenuPage>
  );
}

function PageLeagueFormations({ authUser, accessToken, leagueId, leagues, events, coachesList, athletesData, onBack }) {
  const [selectedLeague, setSelectedLeague] = React.useState(leagueId || "L001-F");
  const [selectedEventId, setSelectedEventId] = React.useState(null);
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const league = leagues.find(l => l.id === selectedLeague);
  const frozenEvents = events.filter(e =>
    (e.status === "Completato" || e.status === "In corso") &&
    (e.anno || 2026) === 2026 &&
    (e.gender || "").toUpperCase() === (league?.gender || "F")
  );

  const loadAll = async (eventId) => {
    if (!accessToken) return;
    setLoading(true); setData(null);
    try {
      const [matchRes, lineupRes, profRes] = await Promise.all([
        supabase.from("match_results", accessToken).then(db => db.select("*", `&event_id=eq.${eventId}`)),
        supabase.from("lineup_history", accessToken).then(db => db.select("*", `&league_id=eq.${selectedLeague}&event_id=eq.${eventId}`)),
        supabase.from("profiles", accessToken).then(db => db.select("id,username", `&limit=1000`)),
      ]);
      const matches = Array.isArray(matchRes) ? matchRes : [];
      const lineup  = Array.isArray(lineupRes) ? lineupRes : [];
      const profs   = Array.isArray(profRes) ? profRes : [];
      const nameByUser = Object.fromEntries(profs.map(p => [p.id, p.username]));

      const event = events.find(e => e.id === eventId);
      const et = EVENT_TYPE_META[event?.type] || EVENT_TYPE_META.Silver;

      const byPlayer = {};
      matches.forEach(m => { if (m.player_id) (byPlayer[m.player_id] = byPlayer[m.player_id] || []).push(m); });

      const athleteList = (league?.gender || "F").toUpperCase() === "F" ? (athletesData?.women || []) : (athletesData?.men || []);
      const athleteMap = Object.fromEntries(athleteList.map(a => [a.id, a]));

      const byUser = {};
      lineup.forEach(l => { (byUser[l.user_id] = byUser[l.user_id] || []).push(l); });

      const users = Object.entries(byUser).map(([userId, rows]) => {
        const players = rows.map(l => {
          const isCaptain = l.role === "capitano";
          const isStarter = isCaptain || l.role === "titolare";
          let rawPts = 0;
          (byPlayer[l.player_id] || []).forEach(m => {
            const coachWinPts = (m.bonus_codes || []).includes("coachWin") ? 0.5 : 0;
            rawPts += (m.base_pts || 0) + (m.bonus_pts || 0) - coachWinPts;
          });
          const finalPts = rawPts * (et.weight || 1) * (isCaptain ? 1.3 : 1);
          const name = l.player_name || athleteMap[l.player_id]?.name || l.player_id;
          return { name, isStarter, isCaptain, finalPts };
        });
        let coachPts = 0;
        const frozenCoachRow = rows.find(l => l.coach_id);
        const frozenCoachId = frozenCoachRow?.coach_id || null;
        const coachInField = frozenCoachRow?.coach_in_field || false;
        const coach = frozenCoachId ? coachesList.find(c => c.id === frozenCoachId) : null;
        if (coach && coachInField) {
          const won = {};
          matches.filter(m => m.coach_id === frozenCoachId).forEach(m => {
            const w = (m.result || "").startsWith("2") || m.is_bye;
            if (w) won[m.match_index] = true;
            else if (!(m.match_index in won)) won[m.match_index] = false;
          });
          coachPts = Object.values(won).filter(Boolean).length * 0.5;
        }
        const starters = players.filter(p => p.isStarter);
        const total = Math.round((starters.reduce((s, p) => s + p.finalPts, 0) + coachPts) * 100) / 100;
        return { userId, username: nameByUser[userId] || "—", starters, coachName: (coach && coachInField) ? coach.name : null, total };
      }).sort((a, b) => b.total - a.total);

      setData({ users, event, et });
    } catch (e) { console.error("Errore formazioni lega:", e); }
    setLoading(false);
  };

  React.useEffect(() => { setSelectedEventId(null); setData(null); }, [selectedLeague]);

  return (
    <MenuPage title="Formazioni di Lega" emoji="👥" onBack={onBack}>
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {leagues.map(l => (
          <button key={l.id} onClick={()=>setSelectedLeague(l.id)}
            style={{padding:"6px 12px",borderRadius:20,border:`1px solid ${selectedLeague===l.id?B.orange:B.creamDark}`,
              background:selectedLeague===l.id?B.orange:B.white,color:selectedLeague===l.id?B.white:B.dark,
              fontWeight:selectedLeague===l.id?"bold":"normal",fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif"}}>
            {l.name}
          </button>
        ))}
      </div>

      {frozenEvents.length === 0 ? (
        <div style={{textAlign:"center",padding:"40px 20px",color:B.gray}}>
          <div style={{fontSize:36,marginBottom:10}}>📅</div>
          <div style={{fontSize:13,color:B.dark,fontWeight:"bold"}}>Nessuna tappa con formazioni congelate</div>
          <div style={{fontSize:11,color:B.gray,marginTop:4}}>Le formazioni appaiono dopo la chiusura del mercato della tappa.</div>
        </div>
      ) : (
        <>
          <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:16}}>
            {frozenEvents.map(e => {
              const et = EVENT_TYPE_META[e.type] || EVENT_TYPE_META.Silver;
              const sel = selectedEventId === e.id;
              return (
                <button key={e.id} onClick={()=>{ setSelectedEventId(e.id); loadAll(e.id); }}
                  style={{background:sel?B.greenDark:B.white,border:`1px solid ${sel?B.greenDark:B.creamDark}`,
                    borderLeft:`4px solid ${sel?B.white:et.color}`,borderRadius:10,padding:"11px 14px",cursor:"pointer",
                    fontFamily:"Georgia,serif",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:"bold",fontSize:13,color:sel?B.white:B.dark}}>{e.name}</div>
                    <div style={{fontSize:10,color:sel?"rgba(255,255,255,.7)":B.gray,marginTop:2}}>{e.date_start||e.date}{e.status==="In corso"?" · in corso":""}</div>
                  </div>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:8,fontWeight:"bold",background:sel?"rgba(255,255,255,.2)":et.bg,color:sel?B.white:et.color}}>×{et.weight}</span>
                </button>
              );
            })}
          </div>

          {loading && <div style={{textAlign:"center",padding:"30px",color:B.gray,fontSize:12}}>⏳ Caricamento...</div>}

          {data && !loading && (
            data.users.length === 0 ? (
              <div style={{textAlign:"center",padding:"20px",color:B.gray,fontSize:12}}>Nessuna formazione per questa tappa.</div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {data.users.map((u, i) => (
                  <div key={u.userId} style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"11px 13px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <span style={{fontSize:12,fontWeight:"bold",color:B.gray,minWidth:20}}>{i+1}°</span>
                      <div style={{flex:1,fontSize:13,fontWeight:"bold",color:B.dark}}>{u.username}</div>
                      <div style={{fontSize:18,fontWeight:"bold",color:u.total>0?B.greenDark:B.gray}}>{u.total>0?`+${u.total}`:u.total}</div>
                    </div>
                    <div style={{fontSize:11,color:B.gray,lineHeight:1.6}}>
                      {u.starters.map((p,j) => (
                        <span key={j}>{p.isCaptain&&<span style={{color:B.yellow}}>★</span>}{p.name}{j<u.starters.length-1?" · ":""}</span>
                      ))}
                      {u.coachName && <span> · 🧢 {u.coachName}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

    </MenuPage>
  );
}
function BonusItem({b}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{background:"#FFFFFF",border:"1px solid #EDE7DC",borderRadius:10,marginBottom:8,overflow:"hidden"}}>
      <button onClick={()=>setOpen(!open)}
        style={{width:"100%",padding:"11px 14px",border:"none",background:"transparent",
          cursor:"pointer",fontFamily:"Georgia,serif",display:"flex",alignItems:"center",
          gap:10,textAlign:"left"}}>
        <span style={{fontSize:20}}>{b.icon==="star"?"⭐":b.icon==="hat"?"🧢":"🔥"}</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:"bold",fontSize:13,color:"#1A2E28"}}>{b.label}</div>
          <div style={{fontSize:11,color:"#6B7B74"}}>{b.sub}</div>
        </div>
        <span style={{color:"#6B7B74",fontSize:14}}>{open?"▲":"▼"}</span>
      </button>
      {open&&(
        <div style={{padding:"10px 14px 12px",fontSize:12,color:"#6B7B74",
          lineHeight:1.7,borderTop:"1px solid #EDE7DC"}}>
          {b.detail}
        </div>
      )}
    </div>
  );
}
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Client Supabase minimale (senza SDK, puro fetch)
const supabase = {
  _headers: {
    "apikey": SUPABASE_ANON,
    "Authorization": `Bearer ${SUPABASE_ANON}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  },
  async signUp(email, password, username) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method:"POST", headers: this._headers,
      body: JSON.stringify({ email, password, data: { username } })
    });
    const json = await r.json();
    if (!r.ok && !json.error) json.error = { message: json.msg || "Errore", status: r.status };
    if (json.error) json.error.status = r.status;
    return json;
  },
  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method:"POST", headers: this._headers,
      body: JSON.stringify({ email, password })
    });
    const json = await r.json();
    if (!r.ok && !json.error) json.error = { message: "Email o password errati.", status: r.status };
    if (json.error) json.error.status = r.status;
    return json;
  },
  async signOut(accessToken) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method:"POST",
      headers: { ...this._headers, "Authorization": `Bearer ${accessToken}` }
    });
  },
  async updatePassword(accessToken, newPassword) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method:"PUT",
      headers: { ...this._headers, "Authorization": `Bearer ${accessToken}` },
      body: JSON.stringify({ password: newPassword })
    });
    const json = await r.json();
    if (!r.ok) json.error = json.error || { message: json.msg || "Errore aggiornamento password" };
    return json;
  },
  async refreshToken(refreshToken) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method:"POST", headers: this._headers,
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    return r.json();
  },
  async getUser(accessToken) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { ...this._headers, "Authorization": `Bearer ${accessToken}` }
    });
    if (r.status === 403 || r.status === 401) return null;
    return r.json();
  },
  _auth(accessToken) {
    return { ...this._headers, "Authorization": `Bearer ${accessToken}` };
  },
  async from(table, accessToken) {
    const headers = accessToken ? this._auth(accessToken) : this._headers;
    return {
      select: async (query="*", filters="") => {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${query}${filters}`, { headers });
        return r.json();
      },
      insert: async (data) => {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
          method:"POST", headers, body: JSON.stringify(data)
        });
        return r.json();
      },
      upsert: async (data, onConflict) => {
        const url = `${SUPABASE_URL}/rest/v1/${table}${onConflict?`?on_conflict=${onConflict}`:""}`;
        const r = await fetch(url, {
          method:"POST",
          headers: { ...headers, "Prefer": "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify(data)
        });
        return r.json();
      },
      update: async (data, filters="") => {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}`, {
          method:"PATCH", headers, body: JSON.stringify(data)
        });
        return r.json();
      },
      delete: async (filters="") => {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}`, {
          method:"DELETE", headers
        });
        return r.ok;
      },
    };
  },
};

// Persistenza token in localStorage
const TOKEN_KEY   = "fb_access_token";
const REFRESH_KEY = "fb_refresh_token";
const saveToken    = (t, r) => { try { localStorage.setItem(TOKEN_KEY, t); if(r) localStorage.setItem(REFRESH_KEY, r); } catch(_){} };
const loadToken    = ()     => { try { return localStorage.getItem(TOKEN_KEY); } catch(_){ return null; } };
const loadRefresh  = ()     => { try { return localStorage.getItem(REFRESH_KEY); } catch(_){ return null; } };
const clearToken   = ()     => { try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(REFRESH_KEY); } catch(_){} };
// ──────────────────────────────────────────────────────────────

const B = {
  sand:"#F5EFE3", sandDark:"#EDE4D0", sandDeep:"#D8CEBC",
  green:"#3D7A69", greenDark:"#2D5C4F", greenLight:"#4E9A86", greenPale:"#EAF3EF",
  orange:"#E8541A", orangeLight:"#F07040", orangePale:"#FDF0EB",
  yellow:"#F5A623", yellowPale:"#FEF7E8",
  red:"#D94F1E", cream:"#F7F3EC", creamDark:"#EDE7DC",
  white:"#FFFFFF", dark:"#1A2E28", gray:"#6B7B74",
  grayLight:"#C8D4CF", grayPale:"#F0F4F2",
};

const PRICE_TABLE = [
  160,156,152,148,144,140,136,132,128,124,
  120,117,114,111,108,105,102,99,96,93,
  90,88,86,84,82,80,78,76,74,72,
  70,68,66,64,62,60,58,56,54,52,
  50,48,46,44,42,40,38,36,34,32,
  31,30,29,28,27,26,25,24,23,22,
];
const getPrice = (r) => r >= 1 && r <= 60 ? PRICE_TABLE[r - 1] : 20;

const CATEGORIES = [
  { label:"Top Player", bg:B.yellow,    text:"#7A4F00", range:[1,5]   },
  { label:"Elite",      bg:"#C084FC",   text:"#4C1D95", range:[6,15]  },
  { label:"Solid Pick", bg:B.greenPale, text:B.greenDark,range:[16,30]},
  { label:"Value Pick", bg:B.orangePale,text:B.orange,  range:[31,50] },
  { label:"Outsider",   bg:B.creamDark, text:B.gray,    range:[51,60] },
  { label:"Wild Card",  bg:B.grayPale,  text:B.gray,    range:[61,999]},
];
const getCategory = (r) => CATEGORIES.find(c => r>=c.range[0] && r<=c.range[1]) || CATEGORIES[5];

// Athlete photos (base64) — rimosse, tutti usano il fallback (ranking/iniziali)
const ATHLETE_PHOTOS = {};

const COACHES = [
  { id:"C001", name:"Ettore Marcovecchio", athletes:["W0001","W0002"], cost:5 },
  { id:"C002", name:"Alessandro Martino",  athletes:["W0003","W0004"], cost:5 },
  { id:"C003", name:"Marco Solustri",      athletes:["W0005","W0006"], cost:5 },
  { id:"C004", name:"Andrea Lupo",         athletes:["M0001","M0002"], cost:5 },
  { id:"C005", name:"Roberto Damiani",     athletes:["M0003","M0004"], cost:5 },
];

// ─── DATI ATLETI — caricati da API (fallback mock) ────────────
// Aggiunge i campi necessari all'app (normalizza player_name→name, ecc.)
const enrichAthlete = (a) => {
  const ranking  = parseInt(a.ranking)  || 1;
  const cost     = parseInt(a.cost)     || getPrice(ranking);
  const prevCost = parseInt(a.cost_prev) || parseInt(a.prevCost) || cost;
  const rankPrev = parseInt(a.ranking_prev) || ranking;
  return {
    ...a,
    id:          a.id       || a.player_id  || "",
    name:        a.name     || a.player_name || "—",
    ranking,
    cost,
    prevCost,
    rankingPrev: rankPrev,
    rankDelta:   rankPrev !== ranking ? rankPrev - ranking : null, // positivo = salito
    costHistory: prevCost !== cost ? [prevCost, cost] : [cost],
    results:     a.results || [],
  };
};

// Fallback minimale — solo se tutto fallisce
let WOMEN = [];
let MEN   = [];

const ATHLETES_CACHE_KEY = "fb_athletes_cache";

// Salva atleti in sessionStorage
const cacheAthletes = (women, men) => {
  try {
    sessionStorage.setItem(ATHLETES_CACHE_KEY, JSON.stringify({
      women, men, cachedAt: new Date().toISOString()
    }));
  } catch(e) {}
};

// Carica atleti da sessionStorage se presenti
const loadCachedAthletes = () => {
  try {
    const raw = sessionStorage.getItem(ATHLETES_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.women?.length > 0 && data.men?.length > 0) return data;
  } catch(e) {}
  return null;
};

// Carica atleti reali dall'API sync (ordine ranking reale)
async function loadAthletesFromAPI() {
  // Prima controlla la cache sessionStorage
  const cached = loadCachedAthletes();
  if (cached) {
    WOMEN = cached.women.map(enrichAthlete);
    MEN   = cached.men.map(enrichAthlete);
    return true;
  }
  // Altrimenti chiama la function sync
  try {
    const res = await fetch("/.netlify/functions/sync");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (data.women?.length > 0) {
      WOMEN = data.women.map(enrichAthlete);
    }
    if (data.men?.length > 0) {
      MEN = data.men.map(enrichAthlete);
    }
    // Salva in cache
    cacheAthletes(data.women || [], data.men || []);
    return true;
  } catch(e) {
    console.warn("Sync API non disponibile, uso fallback:", e.message);
    return false;
  }
}

// MOCK_MATCHES rimosso — dati reali da Supabase match_results


const LEAGUES_INIT = [
  { id:"L001-F", name:"Classic F", type:"classic", gender:"F", status:"OPEN",   marketOpen:false },
  { id:"L001-M", name:"Classic M", type:"classic", gender:"M", status:"OPEN",   marketOpen:false },
  { id:"L002-F", name:"Market F",  type:"market",  gender:"F", status:"OPEN",   marketOpen:false },
  { id:"L002-M", name:"Market M",  type:"market",  gender:"M", status:"OPEN",   marketOpen:false },
];

const EVENT_TYPE_META = {
  Silver:      { label:"Silver",       weight:1.0, color:"#3D7A69", bg:"#EAF3EF" },
  Gold:        { label:"Gold",         weight:1.3, color:"#B8860B", bg:"#FEF7E8" },
  CoppaItalia: { label:"Coppa Italia", weight:1.5, color:"#D94F1E", bg:"#FDF0EB" },
  Finale:      { label:"Finale",       weight:1.7, color:"#7C3AED", bg:"#F3E8FF" },
};
// EVENTS caricato da Supabase (tabella events) — non più hardcoded
// Fallback vuoto: viene popolato da loadEventsFromDB() al login
const EVENTS_FALLBACK = []; // usato solo se Supabase non risponde


// STANDINGS e COMBO rimossi — classifica reale caricata da Supabase

const PRIZES=[
  {threshold:10,pos:"3°",name:"Borsone Under Armour",         icon:"🎒"},
  {threshold:18,pos:"2°",name:"Canotta/Top firmata Nazionale", icon:"👕"},
  {threshold:25,pos:"1°",name:"AirPods 4",                    icon:"🎧"},
];

const PRICE_RANGES = [
  {label:"Tutti",          filter:()=>true,                    bg:B.grayPale,    color:B.gray,     activeBg:B.greenDark,  activeColor:B.white},
  {label:"< 50 $",         filter:a=>a.cost<50,                bg:"#FFF7ED",     color:"#92400E",  activeBg:"#92400E",    activeColor:B.white},
  {label:"50 $ - 99 $",    filter:a=>a.cost>=50&&a.cost<100,   bg:B.greenPale,   color:B.greenDark,activeBg:B.greenDark,  activeColor:B.white},
  {label:"> 100 $",        filter:a=>a.cost>=100,              bg:B.yellowPale,  color:"#7A4F00",  activeBg:"#7A4F00",    activeColor:B.white},
];

// ─── LOGO FANTABEACH (SVG vettoriale, sfondo trasparente) ────
const LogoIcon = ({size=48}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:"block",flexShrink:0}}>
    <defs>
      <clipPath id="fb-clip"><circle cx="50" cy="50" r="46"/></clipPath>
    </defs>
    {/* Verde scuro — riempie il fondo */}
    <circle cx="50" cy="50" r="46" fill="#2A5C4E"/>
    {/* Giallo-arancio — grande arco in alto a sinistra, come sole che sorge */}
    <path d="M 4 50 C 4 22 22 4 50 4 C 62 4 72 8 80 16 C 68 18 56 26 50 36 C 44 44 38 52 20 56 C 12 58 6 54 4 50 Z" fill="#F5A623" clipPath="url(#fb-clip)"/>
    {/* Arancione — onda larga diagonale al centro */}
    <path d="M 4 50 C 6 54 12 58 20 56 C 38 52 44 44 50 36 C 56 26 68 18 80 16 C 88 22 94 34 96 46 C 80 42 68 50 58 60 C 48 68 36 72 16 68 C 8 66 4 60 4 56 Z" fill="#E8541A" clipPath="url(#fb-clip)"/>
    {/* Rosso-arancio scuro — striscia sottile */}
    <path d="M 4 56 C 4 60 8 66 16 68 C 36 72 48 68 58 60 C 68 50 80 42 96 46 C 96 52 94 58 90 64 C 76 58 64 64 54 72 C 44 80 30 82 12 76 C 6 74 4 66 4 62 Z" fill="#C0392B" clipPath="url(#fb-clip)"/>
    {/* Verde scuro — grande onda concava in basso */}
    <path d="M 4 62 C 4 66 6 74 12 76 C 30 82 44 80 54 72 C 64 64 76 58 90 64 C 86 76 76 88 62 94 C 50 98 36 96 24 90 C 10 82 4 74 4 68 Z" fill="#2A5C4E" clipPath="url(#fb-clip)"/>
  </svg>
);

// Logo completo: icona + "FantaBeach" sulla stessa riga
const LogoFull = ({height=48}) => (
  <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
    <LogoIcon size={Math.round(height*1.1)}/>
    <span style={{fontFamily:"Georgia,'Times New Roman',serif",fontWeight:"bold",fontSize:Math.round(height*0.58),color:"#2D5C4F",letterSpacing:"-0.5px",whiteSpace:"nowrap",lineHeight:1}}>
      Fanta<span style={{color:"#E8541A"}}>Beach</span>
    </span>
  </div>
);

const LogoBall = ({size=48}) => <LogoIcon size={size}/>;
// ─────────────────────────────────────────────────────────────

// Athlete photo avatar
const AthleteAvatar = ({athlete, size=70, isStarter, isCaptain}) => {
  const photo = ATHLETE_PHOTOS[athlete.id];
  const cat = getCategory(athlete.ranking);
  const borderColor = isCaptain ? B.yellow : isStarter ? B.green : B.grayLight;
  const borderStyle = isStarter ? "2px solid" : "2px dashed";
  return (
    <div style={{width:size, height:size, borderRadius:"50%", overflow:"hidden", flexShrink:0,
      border:`${borderStyle} ${borderColor}`, position:"relative",
      background: photo ? "#000" : isStarter ? (isCaptain ? B.yellow : B.green) : B.grayPale,
      display:"flex", alignItems:"center", justifyContent:"center"}}>
      {photo ? (
        <img src={photo} alt={athlete.name} style={{width:"100%", height:"100%", objectFit:"cover", objectPosition:"top"}}/>
      ) : (
        <span style={{fontSize:size*0.13, color:isStarter?B.white:B.gray, fontWeight:"bold",
          textAlign:"center", padding:"0 4px", lineHeight:1.2}}>
          {athlete.name.split(" ")[0].substring(0,7)}
        </span>
      )}
      {isCaptain && (
        <div style={{position:"absolute", top:-4, right:-4, width:20, height:20,
          background:B.orange, borderRadius:"50%", display:"flex",
          alignItems:"center", justifyContent:"center", fontSize:11, color:B.white, fontWeight:"bold"}}>★</div>
      )}
    </div>
  );
};

const TABS = [
  { id:0, emoji:"🏪", label:"Mercato"    },
  { id:1, emoji:"👕", label:"Squadra"    },
  { id:2, emoji:"🏆", label:"Classifica" },
  { id:3, emoji:"📅", label:"Calendario" },
  { id:4, emoji:"⚙️", label:"Admin"      },
];
const INIT_JOIN = {"L001-F":null,"L001-M":null,"L002-F":null,"L002-M":null};

// ─── JOIN GATE (componente esterno per evitare re-render su keystroke) ──
function JoinGate({ myJoin, league, showJoinForm, setShowJoinForm, joinTeamName, setJoinTeamName, onJoinRequest }) {
  return (
    <div style={{textAlign:"center",padding:"30px 16px"}}>
      <LogoIcon size={70}/>
      <div style={{marginTop:14,fontWeight:"bold",fontSize:18,color:B.greenDark}}>
        {myJoin==="PENDING"?"Richiesta in attesa":`Iscriviti alla ${league.name}`}
      </div>
      {myJoin==="PENDING"?(
        <div>
          <div style={{marginTop:8,fontSize:13,color:B.gray,lineHeight:1.6}}>La tua richiesta è stata inviata.<br/>L'admin la approverà a breve.</div>
          <div style={{marginTop:16,background:B.yellowPale,border:`1px solid ${B.yellow}`,borderRadius:12,padding:"12px 16px",display:"inline-block"}}>
            <span style={{fontSize:13,color:"#7A4F00",fontWeight:"bold"}}>⏳ In attesa di approvazione</span>
          </div>
        </div>
      ):showJoinForm?(
        <div style={{marginTop:16,textAlign:"left"}}>
          <div style={{fontSize:13,color:B.gray,marginBottom:12}}>Nome squadra per <b>{league.name}</b>:</div>
          <input
            placeholder="Es. Beach Warriors..."
            value={joinTeamName}
            onChange={e=>setJoinTeamName(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&onJoinRequest()}
            autoFocus
            style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${B.grayLight}`,background:B.white,color:B.dark,fontSize:14,fontFamily:"Georgia,serif",outline:"none",boxSizing:"border-box",marginBottom:10}}/>
          <div style={{fontSize:11,color:B.gray,marginBottom:14}}>{league.type==="classic"?"⚠️ Classic: puoi modificare finché l'admin non chiude le iscrizioni.":"ℹ️ Market: compravendite lun 09:00 - gio 23:00. Mercato libero durante la settimana."}</div>
          <button onClick={onJoinRequest} style={{width:"100%",padding:"12px",background:B.greenDark,border:"none",borderRadius:10,color:B.white,fontWeight:"bold",fontSize:14,cursor:"pointer",fontFamily:"Georgia,serif",marginBottom:8}}>Invia Richiesta</button>
          <button onClick={()=>setShowJoinForm(false)} style={{width:"100%",padding:"10px",background:"transparent",border:`1px solid ${B.grayLight}`,borderRadius:10,color:B.gray,fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>Annulla</button>
        </div>
      ):(
        <div>
          <div style={{marginTop:8,fontSize:13,color:B.gray,lineHeight:1.6}}>Non sei ancora iscritto.<br/>Invia una richiesta all'admin.</div>
          <button onClick={()=>setShowJoinForm(true)} style={{marginTop:20,padding:"12px 32px",background:B.greenDark,border:"none",borderRadius:12,color:B.white,fontWeight:"bold",fontSize:14,cursor:"pointer",fontFamily:"Georgia,serif"}}>Richiedi Iscrizione</button>
        </div>
      )}
    </div>
  );
}

// ─── SCHERMATA LOGIN / REGISTRAZIONE ──────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode]       = useState("login"); // "login" | "signup" | "forgot"
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [resetSent, setResetSent] = useState(false);

  const handleForgotPassword = async () => {
    if (!email.trim()) { setError("Inserisci la tua email per il reset."); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: "POST",
        headers: { "apikey": SUPABASE_ANON, "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });
      // Supabase risponde sempre 200 anche se l'email non esiste (sicurezza)
      setResetSent(true);
    } catch(e) { setError("Errore di rete. Riprova."); }
    setLoading(false);
  };

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    try {
      let data;
      if (mode === "signup") {
        if (!username.trim()) { setError("Inserisci uno username"); setLoading(false); return; }
        if (username.trim().length < 3) { setError("Username troppo corto (min 3 caratteri)"); setLoading(false); return; }
        if (password.length < 6) { setError("Password troppo corta (min 6 caratteri)"); setLoading(false); return; }
        // Verifica preventiva username duplicato
        try {
          const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(username.trim())}&select=id`, {
            headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${SUPABASE_ANON}` }
          });
          const existing = await r.json();
          if (Array.isArray(existing) && existing.length > 0) {
            setError("Username già in uso. Scegline un altro.");
            setLoading(false); return;
          }
        } catch(e) { /* silenzioso, continua */ }
        data = await supabase.signUp(email, password, username);
        if (data.error) {
          const msg = data.error.message || "";
          const code = data.error.code || data.error.status || "";
          console.log("Signup error:", JSON.stringify(data.error));
          if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("email") || code === "user_already_exists" || data.status === 422 || code === 422)
            setError("Email già registrata. Prova ad accedere.");
          else if (msg.includes("username") || msg.includes("profiles_username_unique") || msg.includes("duplicate") || data.status === 500 || code === 500)
            setError("Username già in uso. Scegline un altro.");
          else if (msg.includes("password") || msg.includes("weak"))
            setError("Password troppo debole. Usa almeno 6 caratteri.");
          else
            setError(`Errore: ${msg || "Riprova."}`);
          setLoading(false); return;
        }
        // Supabase restituisce identities=[] se l'email è già registrata (senza errore esplicito)
        if (data.user?.identities?.length === 0) {
          setError("Email già registrata. Prova ad accedere.");
          setLoading(false); return;
        }
        // Signup riuscito
        // Se Supabase ha conferma email DISABILITATA → access_token diretto → login immediato
        // Se Supabase ha conferma email ATTIVA → nessun token → mostra messaggio controlla email
        if (data.access_token) {
          saveToken(data.access_token, data.refresh_token);
          onAuth(data.access_token, data.refresh_token, data.user);
          return;
        }
        setError("✅ Registrazione completata! Controlla la tua email (anche spam) e clicca il link di conferma per accedere.");
        setLoading(false);
        return;
      } else {
        data = await supabase.signIn(email, password);
      }
      if (data.error) {
        const msg = (data.error.message || data.error.error_description || data.error.msg || "").toLowerCase();
        console.log("Login error:", JSON.stringify(data.error));
        if (msg.includes("email not confirmed") || msg.includes("not confirmed") || msg.includes("confirmation"))
          setError("📧 Controlla la tua email! Clicca il link di conferma per attivare l'account. Se non la trovi, controlla anche la cartella spam.");
        else if (msg.includes("invalid") || msg.includes("credentials") || msg.includes("wrong") || msg.includes("password") || msg.includes("email"))
          setError("Email o password errati.");
        else if (msg.includes("not found") || msg.includes("no user"))
          setError("Nessun account trovato con questa email.");
        else if (data.error)
          setError("Email o password errati.");
        setLoading(false); return;
      }
      if (data.access_token) {
        saveToken(data.access_token, data.refresh_token);
        onAuth(data.access_token, data.refresh_token, data.user);
      }
    } catch(e) { setError("Errore di rete. Riprova."); }
    setLoading(false);
  };

  const inp = {
    width:"100%", padding:"11px 14px", borderRadius:10,
    border:`1px solid ${B.grayLight}`, background:B.white, color:B.dark,
    fontSize:14, fontFamily:"Georgia,serif", outline:"none",
    boxSizing:"border-box", marginBottom:10,
  };

  return (
    <div style={{fontFamily:"Georgia,serif",minHeight:"100vh",background:B.sand,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:B.white,borderRadius:20,padding:"32px 28px",maxWidth:420,width:"100%",boxShadow:"0 4px 24px rgba(0,0,0,.08)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
            <LogoFull height={76}/>
          </div>
        </div>

        {mode !== "forgot" && (
          <div style={{display:"flex",gap:8,marginBottom:20}}>
            {["login","signup"].map(m=>(
              <button key={m} onClick={()=>{setMode(m);setError("");setResetSent(false);}}
                style={{flex:1,padding:"9px",borderRadius:10,border:`1px solid ${mode===m?B.green:B.grayLight}`,
                  background:mode===m?B.greenPale:"transparent",color:mode===m?B.greenDark:B.gray,
                  fontWeight:mode===m?"bold":"normal",fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>
                {m==="login"?"Accedi":"Registrati"}
              </button>
            ))}
          </div>
        )}
        {mode === "forgot" && (
          <div style={{marginBottom:16}}>
            <div style={{fontWeight:"bold",fontSize:16,color:B.dark,marginBottom:4}}>🔑 Reset password</div>
          </div>
        )}

        {mode==="signup" && (
          <input placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} style={inp}/>
        )}
        <input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} style={inp}/>
        {mode !== "forgot" && (
          <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handleSubmit()} style={{...inp,marginBottom:error?8:16}}/>
        )}

        {error && <div style={{fontSize:12,color:error.startsWith("✅")?B.greenDark:B.red,marginBottom:12,padding:"8px 12px",background:error.startsWith("✅")?B.greenPale:"#FDF0EB",borderRadius:8}}>{error}</div>}

        {mode !== "forgot" && (
          <button onClick={handleSubmit} disabled={loading}
            style={{width:"100%",padding:"12px",background:loading?B.grayLight:B.greenDark,border:"none",
              borderRadius:10,color:B.white,fontWeight:"bold",fontSize:14,cursor:loading?"not-allowed":"pointer",
              fontFamily:"Georgia,serif"}}>
            {loading?"Attendere...":(mode==="login"?"Accedi":"Crea Account")}
          </button>
        )}

        {mode==="signup" && (
          <div style={{textAlign:"center",marginTop:10,fontSize:11,color:B.gray,lineHeight:1.5}}>
            Continuando la registrazione, dichiari di aver letto e accettato i{" "}
            <a href="https://drive.google.com/file/d/1qfO4zfRISXNkvClkwDcNlsb7Ztj-UQUX/view?usp=sharing"
              target="_blank" rel="noopener noreferrer"
              style={{color:B.greenDark,fontWeight:"bold",textDecoration:"underline"}}>
              Termini e Condizioni
            </a>
            {" "}di FantaBeach.
          </div>
        )}

        {mode==="login" && !resetSent && (
          <div style={{textAlign:"center",marginTop:8}}>
            <button onClick={()=>{setMode("forgot");setError("");setResetSent(false);}}
              style={{background:"none",border:"none",cursor:"pointer",fontSize:12,
                color:B.gray,fontFamily:"Georgia,serif",textDecoration:"underline",padding:4}}>
              Password dimenticata?
            </button>
          </div>
        )}

        {mode==="forgot" && (
          <div style={{marginTop:8}}>
            {resetSent ? (
              <div style={{background:B.greenPale,border:`1px solid ${B.greenDark}44`,borderRadius:10,
                padding:"12px 14px",textAlign:"center",fontSize:13,color:B.greenDark,lineHeight:1.6}}>
                ✅ <strong>Email inviata!</strong><br/>
                Controlla la tua casella (anche spam).<br/>
                Il link per il reset è valido 1 ora.
              </div>
            ) : (
              <div>
                <p style={{margin:"0 0 10px",fontSize:13,color:B.gray,lineHeight:1.6}}>
                  Inserisci la tua email e ti manderemo un link per reimpostare la password.
                </p>
                <button onClick={handleForgotPassword} disabled={loading}
                  style={{width:"100%",padding:"12px",background:loading?B.grayLight:B.orange,
                    border:"none",borderRadius:10,color:B.white,fontWeight:"bold",fontSize:14,
                    cursor:loading?"not-allowed":"pointer",fontFamily:"Georgia,serif",marginBottom:8}}>
                  {loading?"Invio in corso...":"📧 Invia link di reset"}
                </button>
                <button onClick={()=>{setMode("login");setError("");setResetSent(false);}}
                  style={{width:"100%",padding:"10px",background:"transparent",
                    border:`1px solid ${B.grayLight}`,borderRadius:10,color:B.gray,
                    fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>
                  ← Torna al login
                </button>
              </div>
            )}
            {resetSent && (
              <button onClick={()=>{setMode("login");setResetSent(false);setError("");}}
                style={{width:"100%",marginTop:10,padding:"10px",background:"transparent",
                  border:`1px solid ${B.grayLight}`,borderRadius:10,color:B.gray,
                  fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>
                ← Torna al login
              </button>
            )}
          </div>
        )}

        <div style={{textAlign:"center",marginTop:10,fontSize:11,color:B.gray}}>
          Powered by Zioema
        </div>
      </div>
    </div>
  );
}

// ─── APP WRAPPER CON AUTH ──────────────────────────────────────
export default function FantaBeachApp() {
  const [accessToken, setAccessToken] = useState(null);
  const [authUser, setAuthUser]       = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [athletesReady, setAthletesReady] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState(null); // token per reset password

  // Rileva token di recovery dall'URL hash al caricamento
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const token = params.get("access_token");
      if (token) {
        setRecoveryToken(token);
        // Pulisce l'URL senza ricaricare la pagina
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Carica atleti reali dall'API al mount
  useEffect(() => {
    loadAthletesFromAPI().finally(() => setAthletesReady(true));
  }, []);

  // Ripristina sessione da localStorage al mount
  useEffect(() => {
    const token = loadToken();
    const rt    = loadRefresh();
    if (token) {
      supabase.getUser(token).then(user => {
        if (user && user.id) {
          setAccessToken(token);
          setAuthUser(user);
          setAuthLoading(false);
        } else if (rt) {
          // Token scaduto o 403 — prova il refresh
          supabase.refreshToken(rt).then(async data => {
            if (data.access_token) {
              saveToken(data.access_token, data.refresh_token || rt);
              setAccessToken(data.access_token);
              const refreshedUser = await supabase.getUser(data.access_token);
              if (refreshedUser?.id) setAuthUser(refreshedUser);
              else clearToken();
            } else {
              clearToken();
            }
            setAuthLoading(false);
          }).catch(() => { clearToken(); setAuthLoading(false); });
        } else {
          clearToken();
          setAuthLoading(false);
        }
      }).catch(() => { clearToken(); setAuthLoading(false); });
    } else {
      setAuthLoading(false);
    }
  }, []);

  const handleAuth = (token, refreshTok, user) => {
    setAccessToken(token);
    setAuthUser(user);
  };

  const handleLogout = async () => {
    if (accessToken) await supabase.signOut(accessToken);
    clearToken();
    setAccessToken(null);
    setAuthUser(null);
  };

  // Refresh automatico del token ogni 50 minuti (scade dopo 60)
  useEffect(() => {
    const interval = setInterval(async () => {
      const rt = loadRefresh();
      if (!rt) return;
      try {
        const data = await supabase.refreshToken(rt);
        if (data.access_token) {
          saveToken(data.access_token, data.refresh_token || rt);
          setAccessToken(data.access_token);
        }
      } catch(e) { console.error("Token refresh fallito:", e); }
    }, 50 * 60 * 1000); // 50 minuti
    return () => clearInterval(interval);
  }, []);

  if (authLoading || !athletesReady) return (
    <div style={{fontFamily:"Georgia,serif",minHeight:"100vh",background:B.sand,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <LogoFull height={60}/>
        <div style={{marginTop:16,color:B.gray,fontSize:14}}>Caricamento...</div>
      </div>
    </div>
  );

  if (recoveryToken) return <ResetPasswordScreen token={recoveryToken} onDone={() => setRecoveryToken(null)}/>;
  if (!accessToken) return <AuthScreen onAuth={handleAuth}/>;
  return <FantaBeach accessToken={accessToken} authUser={authUser} onLogout={handleLogout}/>;
}

// ─── RESET PASSWORD SCREEN ───────────────────────────────────────
function ResetPasswordScreen({ token, onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState(false);

  const handleReset = async () => {
    if (!password || password.length < 6) { setError("La password deve essere di almeno 6 caratteri."); return; }
    if (password !== confirm) { setError("Le password non corrispondono."); return; }
    setLoading(true); setError("");
    try {
      const data = await supabase.updatePassword(token, password);
      if (data.error) {
        setError(data.error.message || "Errore durante il reset. Riprova.");
      } else {
        setSuccess(true);
      }
    } catch(e) { setError("Errore di rete. Riprova."); }
    setLoading(false);
  };

  const inp = {
    width:"100%", padding:"11px 14px", borderRadius:10,
    border:`1px solid ${B.grayLight}`, background:B.white, color:B.dark,
    fontSize:14, fontFamily:"Georgia,serif", outline:"none",
    boxSizing:"border-box", marginBottom:10,
  };

  return (
    <div style={{fontFamily:"Georgia,serif",minHeight:"100vh",background:B.sand,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:B.white,borderRadius:20,padding:"32px 24px",maxWidth:360,width:"100%",boxShadow:"0 4px 24px rgba(0,0,0,.08)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
            <LogoFull height={76}/>
          </div>
        </div>

        {success ? (
          <div>
            <div style={{background:B.greenPale,border:`1px solid ${B.greenDark}44`,borderRadius:12,
              padding:"20px",textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:32,marginBottom:8}}>✅</div>
              <div style={{fontWeight:"bold",fontSize:16,color:B.greenDark,marginBottom:6}}>Password aggiornata!</div>
              <div style={{fontSize:13,color:B.gray,lineHeight:1.6}}>Ora puoi accedere con la tua nuova password.</div>
            </div>
            <button onClick={onDone}
              style={{width:"100%",padding:"12px",background:B.greenDark,border:"none",
                borderRadius:10,color:B.white,fontWeight:"bold",fontSize:14,cursor:"pointer",
                fontFamily:"Georgia,serif"}}>
              Vai al login →
            </button>
          </div>
        ) : (
          <div>
            <h2 style={{margin:"0 0 6px",fontSize:20,color:B.dark}}>🔑 Nuova password</h2>
            <p style={{margin:"0 0 20px",fontSize:13,color:B.gray,lineHeight:1.6}}>
              Scegli una nuova password per il tuo account FantaBeach.
            </p>
            <input placeholder="Nuova password (min. 6 caratteri)" type="password"
              value={password} onChange={e=>setPassword(e.target.value)} style={inp}/>
            <input placeholder="Conferma nuova password" type="password"
              value={confirm} onChange={e=>setConfirm(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleReset()}
              style={{...inp,marginBottom:error?8:16}}/>
            {error && <div style={{fontSize:12,color:B.red,marginBottom:12,padding:"8px 12px",background:"#FDF0EB",borderRadius:8}}>{error}</div>}
            <button onClick={handleReset} disabled={loading}
              style={{width:"100%",padding:"12px",background:loading?B.grayLight:B.orange,border:"none",
                borderRadius:10,color:B.white,fontWeight:"bold",fontSize:14,
                cursor:loading?"not-allowed":"pointer",fontFamily:"Georgia,serif",marginBottom:8}}>
              {loading?"Salvataggio...":"Salva nuova password"}
            </button>
            <button onClick={onDone}
              style={{width:"100%",padding:"10px",background:"transparent",
                border:`1px solid ${B.grayLight}`,borderRadius:10,color:B.gray,
                fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>
              Annulla
            </button>
          </div>
        )}

        <div style={{textAlign:"center",marginTop:16,fontSize:11,color:B.gray}}>
          Powered by Zioema
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPALE ─────────────────────────────────────
function FantaBeach({ accessToken, authUser, onLogout }) {
  const [tab, setTab]             = useState(0);
  const [hiddenPage, setHiddenPage] = useState(null);
  const [athletes_data, setAthletesData] = useState({ women: WOMEN, men: MEN }); // 'stats-atleti'|'stats-utenti'|'stats-awards'|'profile'|'prizes'|'rules'|'terms'
  const [leagueId, setLeagueId]   = useState("L001-F");
  const [teamNames, setTeamNames] = useState({});
  const [standings, setStandings] = useState({}); // leagueId → array
  const [combo, setCombo]         = useState([]);
  const [standingsLoading, setStandingsLoading] = useState(false);

  // Carica classifica reale da Supabase
  // Cache standings: { data, timestamp }
  const standingsCache = React.useRef({ ts: 0, data: null, combo: null });
  const STANDINGS_TTL = 5 * 60 * 1000; // 5 minuti

  const loadStandings = async (token, force = false) => {
    if (!token) return;
    // Cache: non ricaricare se freschi
    const now = Date.now();
    if (!force && standingsCache.current.ts && (now - standingsCache.current.ts) < STANDINGS_TTL) {
      if (standingsCache.current.data) {
        setStandings(standingsCache.current.data);
        setCombo(standingsCache.current.combo || []);
      }
      return;
    }
    setStandingsLoading(true);
    try {
      // 1 chiamata alla vista aggregata invece di 4 chiamate separate
      const [scoresRes, profilesRes, historyRes] = await Promise.all([
        supabase.from("user_league_scores", token).then(db =>
          db.select("user_id,league_id,team_name,budget,total_pts,events_played,matches_played")),
        supabase.from("profiles", token).then(db =>
          db.select("id,username")),
        supabase.from("standings_history", token).then(db =>
          db.select("user_id,league_id,rank,recorded_at", "&order=recorded_at.desc&limit=200")),
      ]);

      const scores = Array.isArray(scoresRes) ? scoresRes : [];
      const profiles = Array.isArray(profilesRes) ? profilesRes : [];
      const history = Array.isArray(historyRes) ? historyRes : [];

      // Mappa profili
      const profileMap = {};
      profiles.forEach(p => { profileMap[p.id] = p.username; });

      // Mappa rank precedente da standings_history (ultimo snapshot per lega)
      const prevRankMap = {}; // user_id::league_id → rank precedente
      const seenKeys = new Set();
      history.forEach(h => {
        const k = `${h.user_id}::${h.league_id}`;
        if (!seenKeys.has(k)) {
          seenKeys.add(k);
          prevRankMap[k] = h.rank;
        }
      });

      // Costruisce classifica per ogni lega
      const newStandings = {};
      const leagueIds = ["L001-F","L001-M","L002-F","L002-M"];
      leagueIds.forEach(lid => {
        const members = scores.filter(s => s.league_id === lid);
        const ranked = members
          .sort((a,b) => b.total_pts - a.total_pts)
          .map((s, i) => {
            const rank = i + 1;
            const prevKey = `${s.user_id}::${lid}`;
            const prev = prevRankMap[prevKey] || rank; // se nessuno storico = stesso posto
            return {
              user_id: s.user_id,
              user: profileMap[s.user_id] || s.user_id.slice(0,8),
              team: s.team_name || profileMap[s.user_id] || "Squadra",
              pts: Math.round((s.total_pts || 0) * 100) / 100,
              budget: Math.round(s.budget || 0),
              events_played: s.events_played || 0,
              rank,
              prev,
            };
          });
        newStandings[lid] = ranked;
      });

      // Combo: somma punti tra tutte le leghe (min 2 leghe)
      const comboMap = {};
      leagueIds.forEach(lid => {
        (newStandings[lid] || []).forEach(s => {
          if (!comboMap[s.user_id]) comboMap[s.user_id] = { user: s.user, pts: 0, leagues: 0 };
          comboMap[s.user_id].pts += s.pts;
          comboMap[s.user_id].leagues += 1;
        });
      });
      const comboArr = Object.values(comboMap)
        .filter(c => c.leagues >= 2)
        .sort((a,b) => b.pts - a.pts)
        .map((c,i) => ({ ...c, rank: i+1, prev: i+1,
          pts: Math.round(c.pts * 10) / 10 }));

      setStandings(newStandings);
      setCombo(comboArr);
      // Salva in cache
      standingsCache.current = { ts: Date.now(), data: newStandings, combo: comboArr };

    } catch(e) {
      console.warn("Errore classifica:", e.message);
    }
    setStandingsLoading(false);
  };
  const [budgets, setBudgets]     = useState({"L001-F":450,"L001-M":450,"L002-F":400,"L002-M":400});
  const [rosters, setRosters]     = useState({"L001-F":[],"L001-M":[],"L002-F":[],"L002-M":[]});
  const [lineups, setLineups]     = useState({"L001-F":[],"L001-M":[],"L002-F":[],"L002-M":[]});
  const [captains, setCaptains]   = useState({"L001-F":null,"L001-M":null,"L002-F":null,"L002-M":null});
  const [coaches, setCoaches]     = useState({"L001-F":null,"L001-M":null,"L002-F":null,"L002-M":null});
  const [coachInField, setCoachInField] = useState({"L001-F":false,"L001-M":false,"L002-F":false,"L002-M":false});
  const [joinStatus, setJoinStatus] = useState(INIT_JOIN);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinTeamName, setJoinTeamName] = useState("");
  const [notif, setNotif]         = useState(null);
  const [inAppNotifs, setInAppNotifs] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifPollRef = React.useRef(null);
  const tradingRef = React.useRef(false); // blocca click doppi su buy/sell
  const [popup, setPopup]         = useState(null);
  const [search, setSearch]       = useState("");
  const [coachSearch, setCoachSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Tutti");
  const [priceFilter, setPriceFilter] = useState(0);
  const [visibleCount, setVisibleCount] = useState(30);
  const [marketTab, setMarketTab] = useState("athletes"); // "athletes" | "coaches"
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showMenu, setShowMenu]     = useState(false);
  const [menuSection, setMenuSection] = useState(null);
  const [leagues, setLeagues]     = useState(LEAGUES_INIT);
  const [dbLoading, setDbLoading] = useState(false);
  const [events, setEvents] = useState(EVENTS_FALLBACK);
  const [coachesList, setCoachesList] = useState(COACHES); // fallback hardcoded, sostituito da DB
  const [isAdmin, setIsAdmin]     = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalSquads, setTotalSquads] = useState(0);
  const [topF, setTopF]           = useState([]);
  const [topM, setTopM]           = useState([]);
  const [leagueUserCounts, setLeagueUserCounts] = useState({});
  const [lastSyncFipav, setLastSyncFipav] = useState(null);
  const [lastSyncFipavOk, setLastSyncFipavOk] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResultsLoading, setSyncResultsLoading] = useState(false);
  const [lastSyncResults, setLastSyncResults] = useState(null);
  const [lastSyncResultsOk, setLastSyncResultsOk] = useState(null);
  const [matchResultsData, setMatchResultsData] = useState({}); // event_id → array risultati

  // Carica match_results da Supabase per un evento
  const loadMatchResults = async (eventId) => {
    if (!accessToken || !eventId) return;
    try {
      const db = await supabase.from("match_results", accessToken);
      const rows = await db.select("*", `&event_id=eq.${eventId}&order=match_index.asc`);
      console.log(`[matchResults] ${eventId}:`, Array.isArray(rows) ? `${rows.length} righe OK` : JSON.stringify(rows).slice(0,100));
      setMatchResultsData(prev => ({ ...prev, [eventId]: Array.isArray(rows) ? rows : [] }));
    } catch(e) {
      console.warn("Errore match_results:", e.message);
      setMatchResultsData(prev => ({ ...prev, [eventId]: [] }));
    }
  };

  // ── Carica dati utente da Supabase al mount ──────────────────
  useEffect(() => {
    if (!accessToken || !authUser) return;
    setDbLoading(true);
    loadUserData(accessToken, authUser.id).finally(() => setDbLoading(false));
  }, [accessToken, authUser]);

  const loadUserData = async (token, userId) => {
    try {
      // Tutte le chiamate in parallelo — da 6 chiamate sequenziali a 3 parallele
      const [profileRes, leaguesRes, rosterRes, lineupRes, coachesRes, eventsRes, coachSelectRes, leagueSettingsRes] = await Promise.all([
        supabase.from("profiles", token).then(db => db.select("role,username,display_name", `&id=eq.${userId}`)),
        supabase.from("user_leagues", token).then(db => db.select("*", `&user_id=eq.${userId}`)),
        supabase.from("rosters", token).then(db => db.select("*", `&user_id=eq.${userId}&sold_at=is.null`)),
        supabase.from("lineups", token).then(db => db.select("*", `&user_id=eq.${userId}`)),
        supabase.from("coaches", token).then(db => db.select("*", "&active=eq.true&order=cost.desc,name.asc")),
        supabase.from("events", token).then(db => db.select("*", "&order=anno.asc,id.asc")),
        supabase.from("coach_selections", token).then(db => db.select("*", `&user_id=eq.${userId}`)),
        supabase.from("league_settings", token).then(db => db.select("*")),
      ]);

      // ── League settings (status e marketOpen) da Supabase ──
      if (Array.isArray(leagueSettingsRes) && leagueSettingsRes.length > 0) {
        setLeagues(ls => ls.map(l => {
          const s = leagueSettingsRes.find(x => x.league_id === l.id);
          if (!s) return l;
          return { ...l, status: s.status || "OPEN", marketOpen: s.market_open || false };
        }));
      }

      // ── Coach selezionati ──
      if (Array.isArray(coachSelectRes) && coachSelectRes.length > 0) {
        const newCoaches = {"L001-F":null,"L001-M":null,"L002-F":null,"L002-M":null};
        const newCoachInField = {"L001-F":false,"L001-M":false,"L002-F":false,"L002-M":false};
        coachSelectRes.forEach(cs => {
          if (newCoaches[cs.league_id] !== undefined) {
            newCoaches[cs.league_id] = cs.coach_id;
            newCoachInField[cs.league_id] = cs.in_field || false;
          }
        });
        setCoaches(newCoaches);
        setCoachInField(newCoachInField);
      }

      // ── Events da DB ──
      if (Array.isArray(eventsRes) && eventsRes.length > 0) {
        setEvents(eventsRes.map(e => ({
          ...e,
          date: e.date_start || "",
        })));
      }

      // ── Coach da DB (sostituisce hardcoded se DB ha dati) ──
      if (Array.isArray(coachesRes) && coachesRes.length > 0) {
        const mapped = coachesRes
          .filter(c => c.active !== false)
          .map(c => ({
            id: c.id,
            name: c.name || "",
            cost: c.cost || 5,
            athletes: [],
          }));
        console.log(`[coaches] caricati ${mapped.length} coach da Supabase`);
        setCoachesList(mapped);
      }

      // ── Profilo e ruolo ──
      const userIsAdmin = Array.isArray(profileRes) && profileRes[0]?.role === "admin";
      setIsAdmin(userIsAdmin);

      // ── Se admin: carica dati aggiuntivi in parallelo ──
      if (userIsAdmin) {
        const [pendingRes, countRes, approvedRes, rostersAllRes] = await Promise.all([
          supabase.from("user_leagues", token).then(db =>
            db.select("id,user_id,league_id,team_name,status", "&status=eq.pending&order=created_at.asc")),
          supabase.from("profiles", token).then(db => db.select("id", "")),
          supabase.from("user_leagues", token).then(db =>
            db.select("id,league_id,user_id", "&status=eq.approved")),
          supabase.from("rosters", token).then(db =>
            db.select("player_id,player_name,gender", "&sold_at=is.null")),
        ]);

        // Pending requests — carica username in parallelo
        if (Array.isArray(pendingRes) && pendingRes.length > 0) {
          const userIds = [...new Set(pendingRes.map(r => r.user_id))];
          const profdb = await supabase.from("profiles", token);
          const profiles = await profdb.select("id,username", `&id=in.(${userIds.join(",")})`);
          const profMap = {};
          if (Array.isArray(profiles)) profiles.forEach(p => { profMap[p.id] = p.username; });
          setPendingRequests(pendingRes.map(r => ({ ...r, username: profMap[r.user_id] || r.user_id })));
        } else {
          setPendingRequests([]);
        }

        // Statistiche admin
        setTotalUsers(Array.isArray(countRes) ? countRes.length : 0);
        setTotalSquads(Array.isArray(approvedRes) ? approvedRes.length : 0);

        if (Array.isArray(approvedRes)) {
          const counts = {};
          const userLeagueCounts = {};
          approvedRes.forEach(a => {
            counts[a.league_id] = (counts[a.league_id]||0) + 1;
            userLeagueCounts[a.user_id] = (userLeagueCounts[a.user_id]||0) + 1;
          });
          counts["COMBO"] = Object.values(userLeagueCounts).filter(c => c > 1).length;
          setLeagueUserCounts(counts);
        }

        if (Array.isArray(rostersAllRes)) {
          const countF = {}, countM = {};
          rostersAllRes.forEach(r => {
            if (r.gender === "F") countF[r.player_id] = { name: r.player_name, count: (countF[r.player_id]?.count||0)+1 };
            else countM[r.player_id] = { name: r.player_name, count: (countM[r.player_id]?.count||0)+1 };
          });
          setTopF(Object.values(countF).sort((a,b)=>b.count-a.count).slice(0,3));
          setTopM(Object.values(countM).sort((a,b)=>b.count-a.count).slice(0,3));
        }
      }

      // ── Leghe utente ──
      if (Array.isArray(leaguesRes)) {
        const newJoin = { "L001-F":null,"L001-M":null,"L002-F":null,"L002-M":null };
        const newBudgets = { "L001-F":450,"L001-M":450,"L002-F":400,"L002-M":400 };
        const newTeamNames = {};
        leaguesRes.forEach(ul => {
          newJoin[ul.league_id] = ul.status === "approved" ? "APPROVED" : ul.status === "pending" ? "PENDING" : null;
          if (ul.budget !== undefined) newBudgets[ul.league_id] = ul.budget;
          if (ul.team_name) newTeamNames[ul.league_id] = ul.team_name;
        });

        // Auto-join admin su tutte le leghe
        if (userIsAdmin) {
          const username = profileRes?.[0]?.username || "admin";
          const leaguesToJoin = ["L001-F","L001-M","L002-F","L002-M"].filter(lid => !newJoin[lid]);
          if (leaguesToJoin.length > 0) {
            const adb = await supabase.from("user_leagues", token);
            await Promise.all(leaguesToJoin.map(lid =>
              adb.upsert({ user_id: userId, league_id: lid, status: "approved",
                team_name: username,
                budget: ["L001-F","L001-M"].includes(lid) ? 450 : 400
              }, "user_id,league_id")
                .then(() => { newJoin[lid] = "APPROVED"; })
            ));
          }
        }

        setJoinStatus(newJoin);
        setBudgets(newBudgets);
        setTeamNames(newTeamNames);
        loadStandings(token);
      }

      // ── Roster ──
      if (Array.isArray(rosterRes)) {
        const newRosters = { "L001-F":[],"L001-M":[],"L002-F":[],"L002-M":[] };
        rosterRes.forEach(r => {
          const athlete = r.gender === "F"
            ? athletes_data.women.find(a => a.id === r.player_id)
            : athletes_data.men.find(a => a.id === r.player_id);
          if (athlete && newRosters[r.league_id] !== undefined)
            newRosters[r.league_id].push(athlete);
        });
        setRosters(newRosters);
      }

      // ── Lineup (solo evento corrente per lega) ──
      if (Array.isArray(lineupRes)) {
        const newLineups  = { "L001-F":[],"L001-M":[],"L002-F":[],"L002-M":[] };
        const newCaptains = { "L001-F":null,"L001-M":null,"L002-F":null,"L002-M":null };

        // Roster attivo per lega (per filtrare atleti venduti)
        const rosterIds = {};
        if (Array.isArray(rosterRes)) {
          rosterRes.forEach(r => {
            if (!rosterIds[r.league_id]) rosterIds[r.league_id] = new Set();
            rosterIds[r.league_id].add(r.player_id);
          });
        }

        // Stessa logica di handleSaveFormation: In corso → primo Planned → E_PRESTAGIONE
        const allEvents = Array.isArray(eventsRes) ? eventsRes : [];
        const activeEventIdForLeague = (lid) => {
          const gender = lid.endsWith("-F") ? "F" : "M";
          const evG = allEvents.filter(e => (e.gender||"").toUpperCase() === gender);
          const active = evG.find(e => e.status === "In corso")
            || evG.find(e => e.status === "Planned")
            || null;
          return active?.id || "E_PRESTAGIONE";
        };

        Object.keys(newLineups).forEach(lid => {
          const eventId = activeEventIdForLeague(lid);
          // Solo righe della lega + evento corrente — mai toccato lo storico
          const rows = lineupRes.filter(l => l.league_id === lid && l.event_id === eventId);
          // Deduplica i titolari/capitano
          const starterIds = [...new Set(
            rows.filter(r => r.role === "titolare" || r.role === "capitano")
                .map(r => r.player_id)
          )];
          // Filtra sugli atleti ancora nel roster attivo
          const filtered = rosterIds[lid]
            ? starterIds.filter(id => rosterIds[lid].has(id))
            : starterIds;
          newLineups[lid] = filtered;
          // Capitano solo se ancora tra i titolari filtrati
          const capId = rows.find(r => r.role === "capitano")?.player_id || null;
          newCaptains[lid] = (capId && filtered.includes(capId)) ? capId : null;
        });

        setLineups(newLineups);
        setCaptains(newCaptains);
      }

    } catch(e) { console.error("Errore caricamento dati:", e); }
  };

  const league   = leagues.find(l => l.id === leagueId);
  const athletes = league.gender === "F" ? athletes_data.women : athletes_data.men;
  const budget   = budgets[leagueId];
  const roster   = rosters[leagueId];
  const lineup   = lineups[leagueId];
  const captain  = captains[leagueId];
  const myCoach  = coaches[leagueId];
  const myJoin   = joinStatus[leagueId];

  const loadNotifications = async (token, userId) => {
    if (!token || !userId) return;
    try {
      // Prende la data di creazione account dell'utente per filtrare notifiche globali precedenti
      const userCreatedAt = authUser?.created_at || new Date(0).toISOString();
      const db = await supabase.from("notifications", token);
      const rows = await db.select("*",
        `&or=(user_id.eq.${userId},user_id.is.null)&order=created_at.desc&limit=20`);
      if (Array.isArray(rows)) {
        const readIds = JSON.parse(localStorage.getItem(`fb_notif_read_${userId}`) || "[]");
        const unread = rows.filter(n => {
          if (n.read || readIds.includes(n.id)) return false;
          // Le notifiche globali (user_id=null) le mostra solo se create DOPO la registrazione
          if (!n.user_id && n.created_at < userCreatedAt) return false;
          return true;
        });
        setInAppNotifs(unread);
      }
    } catch(e) { /* silenzioso */ }
  };

  const showNotif = (msg, type="success") => { setNotif({msg,type}); setTimeout(()=>setNotif(null),2800); };

  useEffect(() => {
    if (!accessToken || !authUser) {
      if (notifPollRef.current) clearInterval(notifPollRef.current);
      return;
    }
    loadNotifications(accessToken, authUser.id);
    notifPollRef.current = setInterval(() => {
      loadNotifications(accessToken, authUser.id);
    }, 60000);
    return () => { if(notifPollRef.current) clearInterval(notifPollRef.current); };
  }, [accessToken, authUser?.id]);
  // Tappa in corso per questo genere (anno 2026)
  const tappaInCorso2026 = events.find(e =>
    e.status === "In corso" &&
    (e.anno || 2026) === 2026 &&
    (e.gender||"").toUpperCase() === league.gender
  );

  // Tappa completata per questo genere (anno 2026)
  const tappaCompletata2026 = events.find(e =>
    e.status === "Completato" &&
    (e.anno || 2026) === 2026 &&
    (e.gender||"").toUpperCase() === league.gender
  );

  // Classic:
  //   - Tutto Planned → mercato + formazione aperti
  //   - In corso → tutto bloccato
  //   - Completata → formazione aperta, mercato bloccato
  // Market:
  //   - Toggle marketOpen controlla tutto
  //   - In corso → sempre bloccato
  // Deadline: giovedì 23:00 → tutto bloccato automaticamente
  const isDeadlinePassed = () => {
    const now = new Date();
    const day = now.getDay(); // 0=dom, 1=lun, 2=mar, 3=mer, 4=gio, 5=ven, 6=sab
    const hour = now.getHours();
    if (day === 4 && hour >= 23) return true; // giovedì dopo le 23
    if (day === 5 || day === 6 || day === 0) return true; // ven, sab, dom
    return false;
  };

  const canTrade = () => {
    if (myJoin !== "APPROVED") return false;
    if (tappaInCorso2026) return false; // tappa in corso → sempre bloccato
    if (isDeadlinePassed()) return false; // giovedì 23:00 → bloccato automaticamente
    if (league.type === "classic") return !tappaCompletata2026;
    return league.marketOpen;
  };

  // Formazione: aperta anche dopo tappa completata
  const canSaveFormation = () => {
    if (myJoin !== "APPROVED") return false;
    if (tappaInCorso2026) return false;
    if (isDeadlinePassed()) return false; // giovedì 23:00 → bloccato
    return true;
  };

  // Coach: stessa logica della formazione
  const canSelectCoach = () => {
    if (myJoin !== "APPROVED") return false;
    if (tappaInCorso2026) return false;
    if (isDeadlinePassed()) return false;
    if (league.type === "classic") return !tappaCompletata2026;
    return league.marketOpen;
  };

  const isOwned   = (a) => !!roster.find(r=>r.id===a.id);
  const isStarter = (a) => lineup.includes(a.id);
  const isCaptain = (a) => captain===a.id;

  const handleBuy = async (a) => {
    if (myJoin!=="APPROVED") return showNotif("Non sei ancora approvato!","error");
    if (!canTrade()) return showNotif(league.type==="classic"?"Iscrizioni chiuse!":"Mercato chiuso! Lun 09:00 - Gio 23:00","error");
    if (roster.length>=5) return showNotif("Hai già 5 atleti nel roster!","error");
    if (budget<a.cost)    return showNotif("Crediti insufficienti!","error");
    if (isOwned(a))       return showNotif("Atleta già nel roster!","error");
    if (tradingRef.current) return; // blocca doppio click
    tradingRef.current = true;
    // Aggiorna UI ottimisticamente
    setRosters(r=>({...r,[leagueId]:[...r[leagueId],{...a}]}));
    setBudgets(b=>({...b,[leagueId]:b[leagueId]-a.cost}));
    showNotif(`${a.name} aggiunto! 🏐`);
    // Salva su Supabase
    try {
      const newBudget = budget - a.cost;
      const rdb = await supabase.from("rosters", accessToken);
      await rdb.insert({ user_id:authUser.id, league_id:leagueId, player_id:a.id, player_name:a.name, gender:a.gender, price:a.cost });
      const udb = await supabase.from("user_leagues", accessToken);
      await udb.update({ budget: newBudget }, `user_id=eq.${authUser.id}&league_id=eq.${leagueId}`);
      const tdb = await supabase.from("transfer_history", accessToken);
      await tdb.insert({ user_id:authUser.id, league_id:leagueId, player_id:a.id, player_name:a.name, action:"buy", price:a.cost, budget_after:newBudget });
    } catch(e) { console.error("Errore acquisto:", e); }
    finally { tradingRef.current = false; }
  };

  const handleSell = async (a) => {
    if (!canTrade()) return showNotif(league.type==="classic"?"Iscrizioni chiuse!":"Mercato chiuso!","error");
    if (!isOwned(a)) return; // blocca vendita di atleta non nel roster (double-click, stato stale)
    if (tradingRef.current) return; // blocca doppio click
    tradingRef.current = true;
    // Aggiorna UI ottimisticamente
    setRosters(r=>({...r,[leagueId]:r[leagueId].filter(x=>x.id!==a.id)}));
    setLineups(l=>({...l,[leagueId]:l[leagueId].filter(id=>id!==a.id)}));
    if (captain===a.id) setCaptains(c=>({...c,[leagueId]:null}));
    setBudgets(b=>({...b,[leagueId]:b[leagueId]+a.cost}));
    showNotif(`Venduto per $${a.cost}`);
    // Salva su Supabase
    try {
      const newBudget = budget + a.cost;
      const now = new Date().toISOString();
      const rdb = await supabase.from("rosters", accessToken);
      await rdb.update({ sold_at: now }, `user_id=eq.${authUser.id}&league_id=eq.${leagueId}&player_id=eq.${a.id}&sold_at=is.null`);
      // Fix 3: rimuove il venduto dalla formazione dell'evento attivo (niente formazioni sporche al freeze)
      const eventsForGenderSell = events.filter(e => (e.gender||"").toUpperCase() === league.gender.toUpperCase());
      const activeEventSell = eventsForGenderSell.find(e => e.status === "In corso")
        || eventsForGenderSell.find(e => e.status === "Planned") || null;
      const sellEventId = activeEventSell?.id || "E_PRESTAGIONE";
      const ldb = await supabase.from("lineups", accessToken);
      await ldb.delete(`user_id=eq.${authUser.id}&league_id=eq.${leagueId}&player_id=eq.${a.id}&event_id=eq.${sellEventId}`);
      const udb = await supabase.from("user_leagues", accessToken);
      await udb.update({ budget: newBudget }, `user_id=eq.${authUser.id}&league_id=eq.${leagueId}`);
      const tdb = await supabase.from("transfer_history", accessToken);
      await tdb.insert({ user_id:authUser.id, league_id:leagueId, player_id:a.id, player_name:a.name, action:"sell", price:a.cost, budget_after:newBudget });
    } catch(e) { console.error("Errore vendita:", e); }
    finally { tradingRef.current = false; }
  };

  const handleBuyCoach = async (c) => {
    if (!canSelectCoach()) return showNotif("Coach bloccato durante la tappa!","error");
    if (myCoach===c.id) return showNotif("Coach già selezionato!","error");
    const prev = coachesList.find(x=>x.id===myCoach);
    const prevCost = prev?.cost || 0;
    if (budget - prevCost < c.cost) return showNotif("Crediti insufficienti!","error");
    if (tradingRef.current) return; // blocca doppio click
    tradingRef.current = true;
    // Aggiorna stato locale
    if (myCoach) setBudgets(b=>({...b,[leagueId]:b[leagueId]+prevCost}));
    setCoaches(ch=>({...ch,[leagueId]:c.id}));
    setBudgets(b=>({...b,[leagueId]:b[leagueId]-c.cost}));
    showNotif(`Coach ${c.name} selezionato!`);
    // Persiste su Supabase
    try {
      const db = await supabase.from("coach_selections", accessToken);
      await db.delete(`user_id=eq.${authUser.id}&league_id=eq.${leagueId}`);
      await db.insert({ user_id:authUser.id, league_id:leagueId, coach_id:c.id, coach_name:c.name });
      // Aggiorna budget
      const udb = await supabase.from("user_leagues", accessToken);
      const newBudget = myCoach ? budget - c.cost + prevCost : budget - c.cost;
      await udb.update({ budget: newBudget }, `user_id=eq.${authUser.id}&league_id=eq.${leagueId}`);
    } catch(e) { console.error("Errore selezione coach:", e); }
    finally { tradingRef.current = false; }
  };

  const handleRemoveCoach = async () => {
    if (!canSelectCoach()) return showNotif("Mercato coach chiuso!","error");
    if (!myCoach) return;
    const c = coachesList.find(x=>x.id===myCoach);
    const cost = c?.cost || 0;
    setBudgets(b=>({...b,[leagueId]:b[leagueId]+cost}));
    setCoaches(ch=>({...ch,[leagueId]:null}));
    showNotif("Coach rimosso");
    try {
      const db = await supabase.from("coach_selections", accessToken);
      await db.delete(`user_id=eq.${authUser.id}&league_id=eq.${leagueId}`);
      const udb = await supabase.from("user_leagues", accessToken);
      await udb.update({ budget: budget+cost }, `user_id=eq.${authUser.id}&league_id=eq.${leagueId}`);
    } catch(e) { console.error("Errore rimozione coach:", e); }
  };

  const toggleStarter = (a) => {
    if (!canSaveFormation()) return showNotif("Tappa in corso — formazione bloccata","error");
    const currentLineup = [...new Set(lineup)];
    if (currentLineup.includes(a.id)) {
      setLineups(l=>({...l,[leagueId]:currentLineup.filter(id=>id!==a.id)}));
      if (captain===a.id) setCaptains(c=>({...c,[leagueId]:null}));
    } else {
      if (currentLineup.length>=3) return showNotif("Max 3 titolari!","error");
      setLineups(l=>({...l,[leagueId]:[...currentLineup,a.id]}));
    }
  };

  const toggleCaptain = (a) => {
    if (!canSaveFormation()) return showNotif("Tappa in corso — formazione bloccata","error");
    if (!isStarter(a)) return showNotif("Il capitano deve essere titolare!","error");
    setCaptains(c=>({...c,[leagueId]:c[leagueId]===a.id?null:a.id}));
  };

  const handleSaveFormation = async () => {
    if (roster.length<5) {
      setPopup({
        title:"Roster incompleto",
        message:`Hai solo ${roster.length}/5 atleti. Devi avere esattamente 5 atleti prima di salvare.`,
        hint:canTrade()?"Vai al Mercato e acquista altri atleti.":"Il mercato è chiuso. Contatta l'admin.",
        action:canTrade()?()=>{setPopup(null);setTab(0);}:null,
        actionLabel:canTrade()?"Vai al Mercato":null,
      });
      return;
    }
    if (lineup.length<3) {
      setPopup({title:"Titolari mancanti",message:"Schiera esattamente 3 titolari prima di salvare.",hint:"Tocca gli atleti in panchina per aggiungerli in campo."});
      return;
    }
    if (!captain) {
      setPopup({title:"Capitano mancante",message:"Devi nominare un capitano tra i 3 titolari.",hint:"Premi il bottone ★ vicino a un titolare per nominarlo capitano."});
      return;
    }
    showNotif("Formazione salvata! 🏐");
    try {
      const eventsForGender = events.filter(e =>
        (e.gender||"").toUpperCase() === league.gender.toUpperCase()
      );
      const activeEvent = eventsForGender.find(e => e.status === "In corso")
        || eventsForGender.find(e => e.status === "Planned")
        || null;
      const eventId = activeEvent?.id || "E_PRESTAGIONE";
      const ldb = await supabase.from("lineups", accessToken);
      
      // Cancella solo le righe dell'evento attivo — non tocca lo storico delle tappe precedenti
      await ldb.delete(`user_id=eq.${authUser.id}&league_id=eq.${leagueId}&event_id=eq.${eventId}`);
      
      const entries = lineup.map(pid => ({
        user_id: authUser.id,
        league_id: leagueId,
        event_id: eventId,
        player_id: pid,
        role: pid === captain ? "capitano" : "titolare",
        gender_slot: league.gender,
      }));
      roster.filter(a => !lineup.includes(a.id)).forEach(a => {
        entries.push({
          user_id: authUser.id, league_id: leagueId, event_id: eventId,
          player_id: a.id, role: "riserva", gender_slot: league.gender,
        });
      });
      await ldb.insert(entries);
    } catch(e) { console.error("Errore salvataggio formazione:", e); }
  };

  const handleJoinRequest = async () => {
    if (!joinTeamName.trim()) return showNotif("Inserisci il nome della squadra!","error");
    setShowJoinForm(false); setJoinTeamName("");
    // Aggiorna UI ottimisticamente
    setJoinStatus(j=>({...j,[leagueId]:"PENDING"}));
    showNotif("Richiesta inviata! Attendi l'approvazione.");
    // Salva su Supabase
    try {
      const db = await supabase.from("user_leagues", accessToken);
      await db.upsert({
        user_id: authUser.id,
        league_id: leagueId,
        status: "pending",
        team_name: joinTeamName.trim(),
        budget: ["L001-F","L001-M"].includes(league.id) ? 450 : 400,
      }, "user_id,league_id");
    } catch(e) { console.error("Errore salvataggio iscrizione:", e); }
  };

  const filtered = useMemo(()=>{
    let list = athletes;
    if (search) list=list.filter(a=>a.name.toLowerCase().includes(search.toLowerCase()));
    if (catFilter!=="Tutti") list=list.filter(a=>getCategory(a.ranking).label===catFilter);
    list=list.filter(PRICE_RANGES[priceFilter].filter);
    return list;
  },[athletes,search,catFilter,priceFilter]);

  const visibleAthletes = filtered.slice(0,visibleCount);
  const hasMore = visibleCount < filtered.length;
  const starters = roster.filter(a=>isStarter(a));
  const bench    = roster.filter(a=>!isStarter(a));
  const leagueStandings = standings[leagueId] || [];
  const currentCoach = coachesList.find(c=>c.id===myCoach);

  return (
    <div style={{fontFamily:"Georgia,serif",minHeight:"100vh",background:B.sand,color:B.dark,position:"relative"}}>

      {notif&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:notif.type==="error"?B.orange:B.greenDark,color:B.white,padding:"10px 22px",borderRadius:30,fontWeight:"bold",fontSize:13,zIndex:999,boxShadow:"0 4px 16px rgba(0,0,0,.2)",whiteSpace:"nowrap"}}>{notif.msg}</div>}

      {popup&&(
        <div style={{position:"fixed",inset:0,background:"rgba(26,46,40,.6)",zIndex:998,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:B.white,borderRadius:16,padding:"24px 20px",maxWidth:340,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:8}}>⚠️</div>
            <div style={{fontWeight:"bold",fontSize:17,color:B.dark,marginBottom:8}}>{popup.title}</div>
            <div style={{fontSize:13,color:B.gray,lineHeight:1.6,marginBottom:8}}>{popup.message}</div>
            {popup.hint&&<div style={{fontSize:12,color:B.greenDark,background:B.greenPale,borderRadius:8,padding:"8px 12px",marginBottom:16}}>💡 {popup.hint}</div>}
            <div style={{display:"flex",gap:8,flexDirection:"column"}}>
              {popup.action&&<button onClick={popup.action} style={{padding:"11px",background:B.greenDark,border:"none",borderRadius:10,color:B.white,fontWeight:"bold",fontSize:14,cursor:"pointer",fontFamily:"Georgia,serif"}}>{popup.actionLabel}</button>}
              <button onClick={()=>setPopup(null)} style={{padding:"10px",background:B.grayPale,border:"none",borderRadius:10,color:B.gray,fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>Chiudi</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{background:B.sandDark,padding:"env(safe-area-inset-top, 16px) 16px 0",paddingTop:"max(env(safe-area-inset-top), 20px)",color:B.dark,borderBottom:`2px solid ${B.sandDeep}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <button onClick={()=>setShowMenu(true)} style={{width:36,height:36,borderRadius:10,border:`1px solid ${B.sandDeep}`,background:B.white,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,flexShrink:0}}>
            <div style={{width:16,height:2,borderRadius:1,background:B.dark}}/>
            <div style={{width:16,height:2,borderRadius:1,background:B.dark}}/>
            <div style={{width:12,height:2,borderRadius:1,background:B.dark}}/>
          </button>
          <LogoFull height={46}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {/* Badge notifiche */}
            <button onClick={()=>setShowNotifPanel(p=>!p)} style={{position:"relative",background:"none",border:"none",cursor:"pointer",padding:6}}>
              <span style={{fontSize:20}}>🔔</span>
              {inAppNotifs.length>0&&(
                <span style={{position:"absolute",top:0,right:0,background:B.orange,color:B.white,
                  borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:"bold",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {inAppNotifs.length}
                </span>
              )}
            </button>
            <div style={{background:B.white,border:`1px solid ${B.sandDeep}`,borderRadius:30,padding:"6px 14px",textAlign:"center"}}>
              <div style={{color:B.yellow,fontWeight:"bold",fontSize:18,lineHeight:1}}>${budget}</div>
              <div style={{color:B.gray,fontSize:10}}>crediti</div>
            </div>
          </div>
        </div>

        {/* Pannello notifiche */}
        {showNotifPanel&&(
          <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,margin:"0 0 10px",overflow:"hidden"}}>
            <div style={{padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${B.creamDark}`}}>
              <div style={{fontSize:12,fontWeight:"bold",color:B.dark}}>🔔 Notifiche</div>
              {inAppNotifs.length>0&&(
                <button onClick={async()=>{
                  // Salva gli ID letti in localStorage (funziona anche per notifiche globali)
                  const readIds = JSON.parse(localStorage.getItem(`fb_notif_read_${authUser.id}`) || "[]");
                  const newReadIds = [...new Set([...readIds, ...inAppNotifs.map(n => n.id)])];
                  localStorage.setItem(`fb_notif_read_${authUser.id}`, JSON.stringify(newReadIds));
                  // Marca come lette quelle personali su Supabase
                  try {
                    const db = await supabase.from("notifications", accessToken);
                    const personalIds = inAppNotifs.filter(n => n.user_id === authUser.id).map(n => n.id);
                    if (personalIds.length > 0)
                      await db.update({read:true}, `id=in.(${personalIds.join(",")})`);
                  } catch(e) { /* silenzioso */ }
                  setInAppNotifs([]);
                  setShowNotifPanel(false);
                }} style={{fontSize:10,color:B.gray,background:"none",border:"none",cursor:"pointer",fontFamily:"Georgia,serif"}}>
                  Segna tutte come lette
                </button>
              )}
            </div>
            {inAppNotifs.length===0
              ? <div style={{padding:"16px",textAlign:"center",color:B.gray,fontSize:12}}>Nessuna notifica</div>
              : inAppNotifs.map((n,i)=>(
                <div key={n.id} style={{padding:"10px 14px",borderBottom:i<inAppNotifs.length-1?`1px solid ${B.creamDark}`:"none",display:"flex",gap:10,alignItems:"flex-start"}}>
                  <span style={{fontSize:16,flexShrink:0,display:"none"}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,color:B.dark}}>{n.message}</div>
                    <div style={{fontSize:10,color:B.gray,marginTop:2}}>
                      {n.created_at?new Date(n.created_at).toLocaleString("it-IT",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):""}
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:10,scrollbarWidth:"none"}}>
          {leagues.map(l=>{
            const js=joinStatus[l.id];
            return(
              <button key={l.id} onClick={()=>{setLeagueId(l.id);setVisibleCount(30);setSelectedEvent(null);}} style={{flexShrink:0,padding:"6px 12px",borderRadius:20,border:`1px solid ${leagueId===l.id?B.orange:B.creamDark}`,cursor:"pointer",fontSize:11,fontFamily:"Georgia,serif",background:leagueId===l.id?B.orange:B.white,color:leagueId===l.id?B.white:"#333333",fontWeight:leagueId===l.id?"bold":"normal",display:"flex",alignItems:"center",gap:5}}>
                {l.name}
                <span style={{width:6,height:6,borderRadius:"50%",display:"inline-block",background:js==="APPROVED"?"#4ADE80":js==="PENDING"?B.yellow:"#F87171"}}/>
              </button>
            );
          })}
        </div>

        <div style={{display:"flex",alignItems:"center",gap:8,paddingBottom:10,fontSize:11}}>
          <span style={{padding:"2px 10px",borderRadius:10,fontSize:10,fontWeight:"bold",
            background:tappaInCorso2026?B.orangePale:canTrade()?"#D1FAE5":B.sandDeep,
            color:tappaInCorso2026?B.orange:canTrade()?"#065F46":B.gray,
            border:`1px solid ${tappaInCorso2026?B.orange:canTrade()?"#34D399":B.grayLight}`}}>
            {tappaInCorso2026
              ? "🔴 Tappa in corso"
              : isDeadlinePassed()
                ? "🔴 Mercato chiuso — deadline giovedì 23:00"
                : league.type==="classic"
                  ? tappaCompletata2026
                    ? "🟡 Formazione aperta · Mercato chiuso"
                    : "🟢 Formazione e mercato aperti"
                  : league.marketOpen ? "🟢 Mercato aperto" : "🔴 Mercato chiuso"}
          </span>
          {myJoin==="APPROVED"&&<span style={{color:B.gray,fontSize:10}}>{roster.length}/5 atleti · {lineup.length}/3 titolari{captain?" · ★ Cap":""}</span>}
        </div>

        {myJoin==="APPROVED"&&(
          <div style={{display:"flex",gap:5,paddingBottom:14,alignItems:"center"}}>
            {Array.from({length:5}).map((_,i)=>(
              <div key={i} style={{flex:1,height:3,borderRadius:2,background:i<roster.length?B.greenDark:B.sandDeep}}/>
            ))}
          </div>
        )}

        <div style={{display:"flex",background:B.sandDark,borderRadius:"10px 10px 0 0",padding:"4px 4px 0",marginLeft:-16,marginRight:-16,paddingLeft:10,paddingRight:10}}>
          {TABS.filter(t => t.id !== 4 || isAdmin).map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"7px 2px 10px",border:"none",cursor:"pointer",background:tab===t.id?B.white:"transparent",color:tab===t.id?B.greenDark:"#333333",borderRadius:"8px 8px 0 0",fontSize:9,fontFamily:"Georgia,serif",fontWeight:tab===t.id?"bold":"normal",transition:"all .15s",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <span style={{fontSize:16,lineHeight:1}}>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"14px 14px 60px"}}>

        {/* PAGINE NASCOSTE — da menu hamburger */}
        {hiddenPage&&(
          <div>
            {hiddenPage==="stats-atleti"&&isAdmin&&<StatsAtleti onBack={()=>setHiddenPage(null)} accessToken={accessToken} athletesData={athletes_data}/>}
            {hiddenPage==="stats-utenti"&&isAdmin&&<StatsUtenti onBack={()=>setHiddenPage(null)} accessToken={accessToken} athletesData={athletes_data}/>}
            {hiddenPage==="stats-awards"&&isAdmin&&<StatsAwards onBack={()=>setHiddenPage(null)} accessToken={accessToken} athletesData={athletes_data}/>}
            {hiddenPage==="profile"&&<PageProfilo authUser={authUser} isAdmin={isAdmin} joinStatus={joinStatus} teamNames={teamNames} accessToken={accessToken} leagueId={leagueId} onBack={()=>setHiddenPage(null)}/>}
            {hiddenPage==="prizes"&&<PagePremi onBack={()=>setHiddenPage(null)}/>}
            {hiddenPage==="rules"&&<PageRegole onBack={()=>setHiddenPage(null)}/>}
            {hiddenPage==="terms"&&<PageTermini onBack={()=>setHiddenPage(null)}/>}
            {hiddenPage==="history"&&<PageHistory authUser={authUser} accessToken={accessToken} leagueId={leagueId} leagues={leagues} events={events} coachesList={coachesList} athletesData={athletes_data} onBack={()=>setHiddenPage(null)}/>}         
            {hiddenPage==="formations"&&<PageLeagueFormations authUser={authUser} accessToken={accessToken} leagueId={leagueId} leagues={leagues} events={events} coachesList={coachesList} athletesData={athletes_data} onBack={()=>setHiddenPage(null)}/>}
            {hiddenPage==="risultati"&&<PageRisultati accessToken={accessToken} events={events} leagueId={leagueId} leagues={leagues} onBack={()=>setHiddenPage(null)}/>}
          </div>
    )}

        {!hiddenPage&&(<div>

        {/* TAB 0: MERCATO */}
        {tab===0&&(
          myJoin!=="APPROVED"?<JoinGate myJoin={myJoin} league={league} showJoinForm={showJoinForm} setShowJoinForm={setShowJoinForm} joinTeamName={joinTeamName} setJoinTeamName={setJoinTeamName} onJoinRequest={handleJoinRequest}/>:(
          <div>
            {/* Profilo atleta inline nel mercato */}
            {selectedAthlete?(
              <AthleteProfile a={selectedAthlete} onBack={()=>setSelectedAthlete(null)} isOwned={isOwned(selectedAthlete)} onBuy={()=>handleBuy(selectedAthlete)} onSell={()=>handleSell(selectedAthlete)} budget={budget} canTrade={canTrade()} accessToken={accessToken}/>
            ):(
            <div>
            {/* Market sub-tabs */}
            <div style={{display:"flex",gap:6,marginBottom:12}}>
              {[{id:"athletes",label:"🏐 Atleti"},{id:"coaches",label:"🧢 Coach"}].map(mt=>(
                <button key={mt.id} onClick={()=>setMarketTab(mt.id)} style={{flex:1,padding:"8px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"Georgia,serif",fontSize:13,fontWeight:marketTab===mt.id?"bold":"normal",background:marketTab===mt.id?B.greenDark:B.grayPale,color:marketTab===mt.id?B.white:B.gray}}>
                  {mt.label}
                </button>
              ))}
            </div>

            {!canTrade()&&(()=>{
              const activeTappa = events.find(e=>e.status==="In corso"&&(e.gender||"").toUpperCase()===league.gender);
              const msg = activeTappa
                ? `🔴 Mercato chiuso — ${activeTappa.name} in corso`
                : league.type==="classic"
                  ? "🔒 Classic: mercato chiuso per tutta la stagione"
                  : "🔒 Mercato chiuso — riapre lunedì 09:00";
              return <div style={{background:B.orangePale,border:`1px solid ${B.orange}44`,borderRadius:10,padding:"9px 12px",marginBottom:10,fontSize:12,color:B.orange,display:"flex",alignItems:"center",gap:8}}>{msg}</div>;
            })()}

            {marketTab==="athletes"&&(
              <div>
                <div style={{position:"relative",marginBottom:8}}>
                  <input placeholder="🔍 Cerca atleta..." value={search} onChange={e=>{setSearch(e.target.value);setVisibleCount(30);}}
                    style={{width:"100%",padding:"10px 36px 10px 14px",borderRadius:10,border:`1px solid ${B.grayLight}`,background:B.white,color:B.dark,fontSize:13,fontFamily:"Georgia,serif",outline:"none",boxSizing:"border-box"}}/>
                  {search&&(
                    <button onClick={()=>{setSearch("");setVisibleCount(30);}}
                      style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:B.gray,padding:"2px 6px",lineHeight:1}}>✕</button>
                  )}
                </div>

                <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:6,scrollbarWidth:"none",marginBottom:6}}>
                  {["Tutti",...CATEGORIES.map(c=>c.label)].map(label=>{
                    const cat=CATEGORIES.find(c=>c.label===label);
                    const active=catFilter===label;
                    return(<button key={label} onClick={()=>{setCatFilter(label);setVisibleCount(30);}} style={{flexShrink:0,padding:"5px 11px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,fontFamily:"Georgia,serif",fontWeight:active?"bold":"normal",background:active?(cat?cat.bg:B.greenDark):(cat?`${cat.bg}88`:B.grayPale),color:active?(cat?cat.text:B.white):(cat?cat.text:B.gray)}}>{label}</button>);
                  })}
                </div>

                <div style={{display:"flex",gap:5,marginBottom:12}}>
                  {PRICE_RANGES.map((pr,i)=>(
                    <button key={i} onClick={()=>{setPriceFilter(i);setVisibleCount(30);}} style={{flex:1,padding:"7px 4px",borderRadius:8,border:`1px solid ${priceFilter===i?pr.activeBg:B.creamDark}`,cursor:"pointer",fontSize:12,fontFamily:"Georgia,serif",background:priceFilter===i?pr.activeBg:pr.bg,color:priceFilter===i?pr.activeColor:pr.color,fontWeight:priceFilter===i?"bold":"normal",whiteSpace:"nowrap"}}>{pr.label}</button>
                  ))}
                </div>

                <div style={{fontSize:11,color:B.gray,marginBottom:8}}>{filtered.length} atleti{roster.length>0?` · ${roster.length} nel tuo roster`:""}</div>

                {/* Box atleti nel mio roster — sempre in cima */}
                {roster.length>0&&(
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:8}}>
                      🏖️ Nel mio roster ({roster.length}/5)
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:7}}>
                      {roster.map(a=>{
                        const cat=getCategory(a.ranking);
                        const diff=a.cost-a.prevCost;
                        return(
                          <div key={a.id} style={{background:B.greenPale,border:`1px solid ${B.greenDark}`,borderLeft:`3px solid ${B.greenDark}`,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>{setSelectedAthlete(a);setTab(0);}}>
                            <div style={{width:34,height:34,borderRadius:8,flexShrink:0,overflow:"hidden",background:B.greenDark,display:"flex",alignItems:"center",justifyContent:"center"}}>
                              {ATHLETE_PHOTOS[a.id]
                                ?<img src={ATHLETE_PHOTOS[a.id]} alt={a.name} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}}/>
                                :<span style={{color:B.white,fontWeight:"bold",fontSize:11}}>#{a.ranking}</span>
                              }
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{color:B.greenDark,fontWeight:"bold",fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div>
                              <div style={{display:"flex",gap:5,marginTop:3,alignItems:"center"}}>
                                <span style={{fontSize:10,padding:"1px 7px",borderRadius:8,background:cat.bg,color:cat.text,fontWeight:"bold"}}>{cat.label}</span>
                                {diff!==0&&<span style={{fontSize:10,color:diff>0?B.greenDark:B.orange,fontWeight:"bold"}}>{diff>0?"▲":"▼"}${Math.abs(diff)}</span>}
                                {isStarter(a)&&<span style={{fontSize:10,color:B.orange,fontWeight:"bold"}}>{isCaptain(a)?"★ Cap":"Titolare"}</span>}
                              </div>
                            </div>
                            <div style={{textAlign:"center",flexShrink:0,marginRight:4}}>
                              <div style={{color:B.orange,fontWeight:"bold",fontSize:17}}>${a.cost}</div>
                            </div>
                            <button onClick={e=>{e.stopPropagation();handleSell(a);}} style={{padding:"7px 11px",borderRadius:8,border:canTrade()?`1px solid ${B.orange}`:`1px solid ${B.grayLight}`,background:canTrade()?B.orangePale:B.grayPale,color:canTrade()?B.orange:B.gray,fontSize:11,fontWeight:"bold",cursor:"pointer",flexShrink:0,fontFamily:"Georgia,serif"}}>{canTrade()?"Vendi":"Bloccato"}</button>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{height:1,background:B.sandDeep,margin:"14px 0"}}/>
                  </div>
                )}

                <div style={{display:"flex",flexDirection:"column",gap:7}}>
                  {visibleAthletes.map(a=>{
                    const owned=isOwned(a);
                    const cat=getCategory(a.ranking);
                    const diff=a.cost-a.prevCost;
                    const canBuy=!owned&&budget>=a.cost&&roster.length<5&&canTrade();
                    return(
                      <div key={a.id} style={{background:B.white,border:`1px solid ${owned?B.greenDark:B.creamDark}`,borderLeft:`3px solid ${owned?B.greenDark:B.creamDark}`,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>{setSelectedAthlete(a);setTab(0);}}>
                        <div style={{width:34,height:34,borderRadius:8,flexShrink:0,overflow:"hidden",background:a.ranking<=3?B.yellow:a.ranking<=10?B.orange:B.greenPale,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {ATHLETE_PHOTOS[a.id]
                            ?<img src={ATHLETE_PHOTOS[a.id]} alt={a.name} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}}/>
                            :<span style={{color:a.ranking<=10?B.white:B.greenDark,fontWeight:"bold",fontSize:12}}>#{a.ranking}</span>
                          }
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:B.dark,fontWeight:"bold",fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div>
                          <div style={{display:"flex",gap:5,marginTop:3,alignItems:"center"}}>
                            <span style={{fontSize:10,padding:"1px 7px",borderRadius:8,background:cat.bg,color:cat.text,fontWeight:"bold"}}>{cat.label}</span>
                            {diff!==0&&<span style={{fontSize:10,color:diff>0?B.greenDark:B.orange,fontWeight:"bold"}}>{diff>0?"▲":"▼"}${Math.abs(diff)}</span>}
                            {a.rankDelta!==null&&a.rankDelta!==0&&<span style={{fontSize:10,color:a.rankDelta>0?B.greenDark:B.orange,fontWeight:"bold"}}>{a.rankDelta>0?"▲":"▼"}{Math.abs(a.rankDelta)} pos</span>}
                            {owned&&<span style={{fontSize:10,color:B.greenDark}}>● Roster</span>}
                          </div>
                        </div>
                        <div style={{textAlign:"center",flexShrink:0,marginRight:4}}>
                          <div style={{color:B.orange,fontWeight:"bold",fontSize:17}}>${a.cost}</div>
                        </div>
                        {owned?(
                          <button onClick={e=>{e.stopPropagation();handleSell(a);}} style={{padding:"7px 11px",borderRadius:8,border:canTrade()?`1px solid ${B.orange}`:`1px solid ${B.grayLight}`,background:canTrade()?B.orangePale:B.grayPale,color:canTrade()?B.orange:B.gray,fontSize:11,fontWeight:"bold",cursor:"pointer",flexShrink:0,fontFamily:"Georgia,serif"}}>{canTrade()?"Vendi":"Bloccato"}</button>
                        ):(
                          <button onClick={e=>{e.stopPropagation();handleBuy(a);}} style={{padding:"7px 11px",borderRadius:8,border:"none",background:canBuy?B.greenDark:B.grayPale,color:canBuy?B.white:B.gray,fontSize:11,fontWeight:"bold",cursor:"pointer",flexShrink:0,fontFamily:"Georgia,serif"}}>Acquista</button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {hasMore&&<button onClick={()=>setVisibleCount(v=>v+30)} style={{width:"100%",marginTop:12,padding:"11px",background:B.grayPale,border:`1px solid ${B.grayLight}`,borderRadius:10,color:B.gray,fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>Carica altri ({filtered.length-visibleCount})</button>}
              </div>
            )}

            {marketTab==="coaches"&&(
              <div>
                <div style={{background:B.greenPale,border:`1px solid ${B.greenDark}33`,borderRadius:10,padding:"10px 13px",marginBottom:12,fontSize:12,color:B.greenDark}}>
                  Il coach è opzionale. Se la sua coppia vince ottieni +0.5 pt per partita.
                </div>

                {currentCoach&&(
                  <div style={{background:B.yellowPale,border:`1px solid ${B.yellow}`,borderRadius:12,padding:"12px 14px",marginBottom:12}}>
                    <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:"#7A4F00",marginBottom:6}}>Il tuo Coach</div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:40,height:40,borderRadius:"50%",background:B.yellow,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🧢</div>
                      <div style={{flex:1}}>
                        <div style={{color:B.dark,fontWeight:"bold",fontSize:14}}>{currentCoach.name}</div>
                        <div style={{color:B.gray,fontSize:11}}>${currentCoach.cost} · +0.5 pt per vittoria</div>
                      </div>
                      {canSelectCoach()&&<button onClick={handleRemoveCoach} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${B.orange}`,background:B.orangePale,color:B.orange,fontSize:11,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif"}}>Rimuovi</button>}
                    </div>
                  </div>
                )}

                {/* Search coach */}
                <div style={{position:"relative",marginBottom:12}}>
                  <input placeholder="🔍 Cerca coach..." value={coachSearch} onChange={e=>setCoachSearch(e.target.value)}
                    style={{width:"100%",padding:"10px 36px 10px 14px",borderRadius:10,border:`1px solid ${B.grayLight}`,background:B.white,color:B.dark,fontSize:13,fontFamily:"Georgia,serif",outline:"none",boxSizing:"border-box"}}/>
                  {coachSearch&&(
                    <button onClick={()=>setCoachSearch("")}
                      style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:B.gray,padding:"2px 6px",lineHeight:1}}>✕</button>
                  )}
                </div>

                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {coachesList.filter(c => c.active !== false).filter(c => !coachSearch || c.name.toLowerCase().includes(coachSearch.toLowerCase())).map(c=>{
                    const isSelected = myCoach===c.id;
                    return(
                      <div key={c.id} style={{background:isSelected?B.greenPale:B.white,border:`1px solid ${isSelected?B.greenDark:B.creamDark}`,borderLeft:`3px solid ${isSelected?B.greenDark:B.creamDark}`,borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
                        <div style={{width:40,height:40,borderRadius:"50%",background:isSelected?B.greenDark:B.grayPale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🧢</div>
                        <div style={{flex:1}}>
                          <div style={{color:B.dark,fontWeight:"bold",fontSize:13}}>{c.name}</div>
                          <div style={{color:B.gray,fontSize:11,marginTop:2}}>+0.5 pt per vittoria</div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{color:B.orange,fontWeight:"bold",fontSize:16}}>${c.cost}</div>
                          {isSelected?(
                            <span style={{fontSize:10,color:B.greenDark,fontWeight:"bold"}}>✓ Scelto</span>
                          ):(
                            <button onClick={()=>handleBuyCoach(c)} style={{marginTop:4,padding:"5px 10px",borderRadius:8,border:"none",background:canSelectCoach()&&budget>=c.cost?B.greenDark:B.grayPale,color:canSelectCoach()&&budget>=c.cost?B.white:B.gray,fontSize:11,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif"}}>{canSelectCoach()?"Scegli":"Bloccato"}</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            </div>)} {/* fine !selectedAthlete */}
          </div>
          )
        )}

        {/* TAB 1: SQUADRA */}
        {tab===1&&(
          myJoin!=="APPROVED"?<JoinGate myJoin={myJoin} league={league} showJoinForm={showJoinForm} setShowJoinForm={setShowJoinForm} joinTeamName={joinTeamName} setJoinTeamName={setJoinTeamName} onJoinRequest={handleJoinRequest}/>:(
          <div>
            {/* Vista punti durante tappa in corso */}
            {(()=>{
              const activeEvent = events.find(e => e.status==="In corso" && (e.gender||"").toUpperCase()===league.gender);
              if (!activeEvent || roster.length===0) return null;

              // Carica i risultati da Supabase se non ancora caricati
              if (!matchResultsData[activeEvent.id]) {
                loadMatchResults(activeEvent.id);
                return null; // mostra niente finché non carica
              }

              const eventMatches = matchResultsData[activeEvent.id] || [];
              const et = EVENT_TYPE_META[activeEvent.type]||EVENT_TYPE_META.Silver;

              // Calcola partite di un atleta con punti per partita
              const calcPlayerMatches = (athlete) => {
                const playerMatches = eventMatches.filter(m => m.player_id === athlete.id);
                let grandTotal = 0;
                const matchResults = playerMatches.map(m => {
                  const codes = m.bonus_codes || [];
                  // Rimuovi coachWin/coachMalus dal calcolo atleta
                  // Il bonus coach viene calcolato separatamente
                  const coachWinPts = codes.includes("coachWin") ? 0.5 : 0;
                  const coachMalusPts = codes.includes("coachMalus") ? 1 : 0;
                  const totalPts = (m.base_pts || 0) + (m.bonus_pts || 0) - coachWinPts + coachMalusPts;
                  grandTotal += totalPts;
                  const baseCodes = ["win20","win21","loss12","loss02","bye","forfait","coachWin","coachMalus"];
                  const extraBonuses = codes.filter(c => !baseCodes.includes(c));
                  return {
                    phase: m.phase,
                    opponent: m.opponent || "—",
                    result: m.result || "—",
                    scoreA: m.score || "",
                    isBye: m.is_bye || false,
                    basePts: m.base_pts || 0,
                    extraBonuses,
                    extraPts: (m.bonus_pts || 0) - coachWinPts + coachMalusPts,
                    totalPts,
                  };
                });
                return { matchResults, grandTotal };
              };

              const coachOnField = coachInField[leagueId];

              return (
                <div>
                  {/* Header tappa — compatto, non ripetitivo */}
                  <div style={{background:B.greenDark,borderRadius:12,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10,color:B.white}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:"bold",fontSize:15}}>🔴 {activeEvent.name}</div>
                      <div style={{fontSize:10,color:"rgba(255,255,255,.7)",marginTop:2}}>Mercato bloccato durante la tappa</div>
                    </div>
                    <div style={{background:et.bg,color:et.color,padding:"4px 10px",borderRadius:8,fontSize:12,fontWeight:"bold"}}>×{et.weight}</div>
                  </div>

                  {/* Formazione schierata */}
                  <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:12}}>
                    <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:12}}>La tua formazione</div>
                    <div style={{display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap",marginBottom:14}}>
                      {starters.map(a=>(
                        <div key={a.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                          <AthleteAvatar athlete={a} size={64} isStarter={true} isCaptain={isCaptain(a)}/>
                          <div style={{fontSize:9,color:isCaptain(a)?B.orange:B.greenDark,fontWeight:"bold",textAlign:"center",maxWidth:64,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {isCaptain(a)&&"★ "}{a.name.split(" ")[0]}
                          </div>
                          <div style={{fontSize:8,color:B.gray}}>{getCategory(a.ranking).label}</div>
                        </div>
                      ))}
                      {/* Coach alla stessa altezza dei titolari se schierato */}
                      {currentCoach&&coachOnField&&(
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                          <div style={{width:64,height:64,borderRadius:"50%",background:B.yellowPale,border:`2px solid ${B.yellow}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🧢</div>
                          <div style={{fontSize:9,color:"#7A4F00",fontWeight:"bold",textAlign:"center",maxWidth:64,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{currentCoach.name.split(" ")[0]}</div>
                          <div style={{fontSize:8,color:B.greenDark,fontWeight:"bold"}}>Schierato</div>
                        </div>
                      )}
                      {!currentCoach&&(
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,opacity:0.4}}>
                          <div style={{width:64,height:64,borderRadius:"50%",background:B.grayPale,border:`2px dashed ${B.grayLight}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🧢</div>
                          <div style={{fontSize:8,color:B.gray}}>Nessun coach</div>
                        </div>
                      )}
                    </div>
                    {/* Panchina */}
                    {(bench.length>0||(currentCoach&&!coachOnField))&&(
                      <div>
                        <div style={{fontSize:9,color:B.gray,textAlign:"center",marginBottom:8,letterSpacing:1}}>— PANCHINA —</div>
                        <div style={{display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap"}}>
                          {bench.map(a=>(
                            <div key={a.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,opacity:0.6}}>
                              <AthleteAvatar athlete={a} size={48} isStarter={false} isCaptain={false}/>
                              <div style={{fontSize:9,color:B.gray,textAlign:"center",maxWidth:48,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name.split(" ")[0]}</div>
                            </div>
                          ))}
                          {currentCoach&&!coachOnField&&(
                            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,opacity:0.6}}>
                              <div style={{width:48,height:48,borderRadius:"50%",background:B.grayPale,border:`2px dashed ${B.grayLight}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🧢</div>
                              <div style={{fontSize:9,color:B.gray}}>{currentCoach.name.split(" ")[0]}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Legenda bonus */}
                  <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"10px 12px",marginBottom:12}}>
                    <div style={{fontSize:9,fontWeight:"bold",letterSpacing:1.5,textTransform:"uppercase",color:B.greenDark,marginBottom:6}}>Legenda bonus</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {Object.entries(BONUS_META)
                        .filter(([k]) => ["closeSet","captain","coachWin"].includes(k))
                        .map(([k,m])=>(
                          <span key={k} style={{display:"inline-flex",alignItems:"center",gap:3,background:m.bg,color:m.color,fontSize:9,padding:"2px 7px",borderRadius:20,border:`1px solid ${m.color}22`}}>
                            {m.icon} {m.pts!==undefined?(m.pts>0?`+${m.pts}`:`${m.pts}`):`×${m.mult}`} {m.label}
                          </span>
                        ))}
                    </div>
                  </div>

                  {/* Partite per atleta */}
                  {[...starters.map(a=>({...a,_isStart:true})),...bench.map(a=>({...a,_isStart:false}))].map((a,idx,arr)=>{
                    const isStart = a._isStart;
                    const showStarterLabel = isStart && idx===0;
                    const showBenchLabel = !isStart && (idx===0 || arr[idx-1]._isStart);
                    const {matchResults, grandTotal} = calcPlayerMatches(a);
                    const isCapt = isCaptain(a);
                    const totalTappa = (grandTotal * (et.weight||1) * (isCapt ? 1.3 : 1));
                    return (
                      <React.Fragment key={a.id}>
                        {showStarterLabel&&<div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:6}}>⚡ Titolari</div>}
                        {showBenchLabel&&<div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.gray,marginTop:10,marginBottom:6}}>⏸ Panchina</div>}
                        {matchResults.length===0
                          ? <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"10px 12px",marginBottom:8,opacity:0.5}}>
                              <div style={{fontSize:12,color:B.gray}}>{isCapt?"★ ":""}{a.name} — nessuna partita trovata</div>
                            </div>
                          : <div style={{background:B.white,border:`1px solid ${isStart?B.greenDark:B.creamDark}`,borderLeft:`3px solid ${isStart?B.greenDark:B.sandDeep}`,borderRadius:10,marginBottom:10,overflow:"hidden",opacity:isStart?1:0.75}}>
                              {/* Header atleta */}
                              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderBottom:`1px solid ${B.creamDark}`}}>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:13,fontWeight:"bold",color:B.dark}}>
                                    {isCapt&&<span style={{color:B.yellow,marginRight:4}}>★</span>}{a.name}
                                  </div>
                                  <div style={{fontSize:10,color:B.gray}}>#{a.ranking} · {getCategory(a.ranking).label}</div>
                                </div>
                                <div style={{textAlign:"right"}}>
                                  <div style={{fontSize:18,fontWeight:"bold",color:totalTappa>0?B.greenDark:totalTappa<0?B.orange:B.gray}}>
                                    {totalTappa>0?`+${totalTappa.toFixed(2)}`:totalTappa===0?"—":totalTappa.toFixed(2)} pt
                                  </div>
                                  {isCapt&&<div style={{fontSize:9,color:B.yellow}}>★ ×1.3 cap</div>}
                                </div>
                              </div>
                              {/* Righe partite */}
                              {matchResults.map((mr,j)=>(
                                <div key={j} style={{padding:"8px 12px",borderBottom:j<matchResults.length-1?`1px solid ${B.creamDark}`:"none"}}>
                                  {/* Riga principale: fase | risultato | avversario | punti */}
                                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                                    <div style={{fontSize:9,color:B.gray,flexShrink:0,minWidth:55}}>{mr.phase}</div>
                                    {mr.isBye
                                      ? <span style={{fontSize:12,fontWeight:"bold",color:B.greenDark,background:B.greenPale,padding:"1px 7px",borderRadius:5,flexShrink:0}}>BYE</span>
                                      : <span style={{fontSize:12,fontWeight:"bold",color:mr.result.startsWith("2")?"#065F46":"#DC2626",background:mr.result.startsWith("2")?"#D1FAE5":"#FEE2E2",padding:"1px 7px",borderRadius:5,flexShrink:0}}>{mr.result}</span>
                                    }
                                    <div style={{flex:1,fontSize:10,color:B.gray,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                      {mr.isBye?"—":mr.opponent||"—"}
                                    </div>
                                    <div style={{fontSize:13,fontWeight:"bold",color:mr.basePts>0?B.greenDark:mr.basePts===0?B.gray:B.orange,flexShrink:0,minWidth:24,textAlign:"right"}}>
                                      {mr.basePts>0?`+${mr.basePts}`:mr.basePts===0?"0":mr.basePts}
                                    </div>
                                    {mr.extraBonuses.length>0&&(
                                      <div style={{display:"flex",gap:2,flexShrink:0}}>
                                        {mr.extraBonuses.map((b,bi)=>(
                                          <span key={bi} title={`${BONUS_META[b]?.label} (${BONUS_META[b]?.pts>0?"+":""}${BONUS_META[b]?.pts})`} style={{fontSize:13}}>{BONUS_META[b]?.icon}</span>
                                        ))}
                                      </div>
                                    )}
                                    <div style={{fontSize:12,fontWeight:"bold",color:mr.totalPts>0?B.greenDark:mr.totalPts<0?B.orange:B.gray,flexShrink:0,minWidth:30,textAlign:"right",borderLeft:`1px solid ${B.creamDark}`,paddingLeft:7}}>
                                      {mr.totalPts>0?`+${mr.totalPts}`:mr.totalPts===0?"0":mr.totalPts}
                                    </div>
                                  </div>
                                  {/* Set score — grande, su riga separata */}
                                  {mr.scoreA&&!mr.isBye&&(
                                    <div style={{fontSize:14,fontWeight:"bold",color:B.dark,marginTop:4,marginLeft:62}}>{mr.scoreA}</div>
                                  )}
                                </div>
                              ))}
                              {/* Footer: totale partite → moltiplicatore → totale tappa */}
                              <div style={{background:B.sandDark,padding:"8px 12px"}}>
                                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:B.gray,marginBottom:2}}>
                                  <span>Totale partite</span>
                                  <span style={{color:B.dark,fontWeight:"bold"}}>{grandTotal>0?`+${grandTotal}`:grandTotal} pt</span>
                                </div>
                                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:B.gray,marginBottom:2}}>
                                  <span>{et.label} ×{et.weight}</span>
                                  <span style={{color:et.color,fontWeight:"bold"}}>{(grandTotal*(et.weight||1))>0?`+${(grandTotal*(et.weight||1)).toFixed(2)}`:(grandTotal*(et.weight||1)).toFixed(2)} pt</span>
                                </div>
                                {isCapt&&<div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:B.gray,marginBottom:2}}>
                                  <span>★ Capitano ×1.3</span>
                                  <span style={{color:B.yellow,fontWeight:"bold"}}>+{((grandTotal*(et.weight||1))*0.3).toFixed(2)} pt</span>
                                </div>}
                                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:"bold",paddingTop:6,borderTop:`1px solid ${B.sandDeep}`,marginTop:2}}>
                                  <span style={{color:B.dark}}>Totale tappa</span>
                                  <span style={{color:totalTappa>0?B.greenDark:totalTappa<0?B.orange:B.gray}}>
                                    {totalTappa>0?`+${totalTappa.toFixed(2)}`:totalTappa===0?"—":totalTappa.toFixed(2)} pt
                                  </span>
                                </div>
                              </div>
                            </div>
                        }
                      </React.Fragment>
                    );
                  })}

                  {/* Totale squadra */}
                  {(()=>{
                    let tot = 0;
                    starters.forEach(a => {
                      const {grandTotal} = calcPlayerMatches(a);
                      tot += grandTotal * (et.weight||1) * (isCaptain(a) ? 1.3 : 1);
                    });

                    // Punti coach — solo se schierato in campo
                    let coachPts = 0;
                    const coachBox = currentCoach ? (()=>{
                      const coachMatches = eventMatches.filter(m => m.coach_id === currentCoach.id);
                      const byMatch = {};
                      coachMatches.forEach(m => {
                        if (!byMatch[m.match_index]) byMatch[m.match_index] = m;
                      });
                      const uniqueMatches = Object.values(byMatch);
                      // Punti coach contano SOLO se schierato
                      if (coachOnField) {
                        coachPts = uniqueMatches.reduce((s, m) => {
                      if ((m.result || "").startsWith("2") || m.is_bye) return s + 0.5;
                      return s;
                        }, 0);
                       }
                      const isOnField = coachOnField;
                      return (
                        <div style={{
                          background: isOnField ? B.yellowPale : B.grayPale,
                          border: `1px solid ${isOnField ? B.yellow : B.grayLight}`,
                          borderRadius:12, overflow:"hidden", marginBottom:10,
                          opacity: isOnField ? 1 : 0.65,
                        }}>
                          <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10,
                            background: isOnField ? "rgba(245,166,35,0.15)" : "transparent"}}>
                            <span style={{fontSize:20}}>🧢</span>
                            <div style={{flex:1}}>
                              <div style={{fontSize:12,fontWeight:"bold",color:isOnField?"#7A4F00":B.gray}}>
                                {currentCoach.name}
                              </div>
                              <div style={{fontSize:10,color:isOnField?"#9A6700":B.gray}}>
                                {isOnField?"Schierato — punti conteggiati":"In panchina — punti non conteggiati"}
                              </div>
                            </div>
                            {isOnField&&<div style={{fontWeight:"bold",fontSize:16,color:coachPts>0?B.greenDark:coachPts<0?B.orange:"#7A4F00"}}>
                              {coachPts>0?`+${coachPts}`:coachPts} pt
                            </div>}
                          </div>
                          {uniqueMatches.map((m, i) => {
                            const win = (m.result || "").startsWith("2") || m.is_bye;
                            const oppParts = (m.opponent||"").split(" - ");
                            const opp1 = oppParts[0]?.split(" ").slice(0,-1).join(" ") || oppParts[0] || "—";
                            const opp2 = oppParts[1]?.split(" ").slice(0,-1).join(" ") || oppParts[1] || "";
                            return (
                              <div key={i} style={{padding:"7px 14px",borderTop:`1px solid ${isOnField?B.yellow+"44":B.grayLight}`,display:"flex",alignItems:"center",gap:8}}>
                                <span style={{fontSize:10,padding:"1px 6px",borderRadius:4,fontWeight:"bold",
                                  background:m.result?.startsWith("2")?B.greenDark:B.orange,
                                  color:B.white,flexShrink:0}}>{m.result||"—"}</span>
                                <div style={{flex:1,fontSize:11,color:B.gray}}>{m.phase} vs {opp1}{opp2?` - ${opp2}`:""}</div>
                                {isOnField&&<div style={{fontSize:11,fontWeight:"bold",
                                  color:win?B.greenDark:B.gray,flexShrink:0}}>
                                  {win?"+0.5":"0"} pt
                                </div>}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })() : null;

                    return (
                      <>
                        {/* Coach sempre PRIMA del totale */}
                        {coachBox}
                        <div style={{background:B.greenDark,borderRadius:10,padding:"14px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                          <div>
                            <div style={{color:"rgba(255,255,255,.9)",fontSize:14,fontWeight:"bold"}}>Punteggio totale</div>
                            <div style={{color:"rgba(255,255,255,.6)",fontSize:10}}>
                              Titolari · ×{et.weight} {et.label}{coachOnField&&coachPts!==0?` · Coach ${coachPts>0?"+":""}${coachPts}`:""}
                            </div>
                          </div>
                          <span style={{color:B.white,fontWeight:"bold",fontSize:24}}>
                            {(tot+coachPts)>0?`+${(tot+coachPts).toFixed(2)}`:(tot+coachPts).toFixed(2)} pt
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              );
            })()}

            <div style={{fontSize:11,color:B.gray,textAlign:"center",marginBottom:6}}>{league.name} · Deadline: giovedì 23:00</div>
            {!canTrade()&&events.find(e=>e.status==="In corso"&&(e.gender||"").toUpperCase()===league.gender)&&(
              <div style={{background:"#FEE2E2",border:"1px solid #DC262644",borderRadius:10,padding:"9px 12px",marginBottom:10,fontSize:12,color:"#DC2626",display:"flex",alignItems:"center",gap:8}}>
                <span>🔴</span><b>Tappa in corso — formazione bloccata</b>
              </div>
            )}
            <div style={{background:B.orangePale,border:`1px solid ${B.orange}44`,borderRadius:10,padding:"8px 12px",marginBottom:14,fontSize:12,color:B.orange,textAlign:"center"}}>
              Scegli 3 titolari + 1 capitano unico (×1.3 punti)
            </div>

            {roster.length===0?(
              <div style={{textAlign:"center",padding:"40px 20px",color:B.gray}}>
                <LogoIcon size={62}/>
                <div style={{marginTop:12,fontSize:15,fontWeight:"bold",color:B.greenDark}}>Roster vuoto</div>
                {canTrade()&&<button onClick={()=>setTab(0)} style={{marginTop:14,padding:"10px 24px",borderRadius:20,border:"none",background:B.greenDark,color:B.white,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif"}}>Vai al Mercato</button>}
              </div>
            ):(
              <div>
                {/* Tappa in corso → mostra punti tappa */}
                {events.some(e=>e.status==="In corso"&&(e.gender||"").toUpperCase()===league.gender)
                  ? null /* gestito dal blocco punti sopra */
                  : (
                  /* Formazione modificabile — sempre visibile se non c'è tappa in corso */
                <div>
                  {/* IN CAMPO */}
                  <div style={{marginBottom:18}}>
                  <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:12,textAlign:"center"}}>
                    ⚡ In Campo ({starters.length}/3) {captain&&"· ★ Cap: "+(roster.find(a=>a.id===captain)||{name:""}).name.split(" ")[0]}
                  </div>
                  <div style={{display:"flex",justifyContent:"center",gap:14,flexWrap:"wrap"}}>
                    {starters.map(a=>(
                      <div key={a.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                        <AthleteAvatar athlete={a} size={72} isStarter={true} isCaptain={isCaptain(a)}/>
                        <div style={{fontSize:9,color:B.gray,textAlign:"center",maxWidth:72,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name.split(" ").slice(-1)[0]}</div>
                        <div style={{display:"flex",gap:4}}>
                          <button onClick={()=>toggleStarter(a)} style={{padding:"2px 7px",borderRadius:7,border:`1px solid ${B.orange}`,background:B.orangePale,color:B.orange,fontSize:9,cursor:"pointer",fontFamily:"Georgia,serif"}}>↓</button>
                          <button onClick={()=>toggleCaptain(a)} style={{padding:"2px 7px",borderRadius:7,border:"none",cursor:"pointer",background:isCaptain(a)?B.orange:B.grayPale,color:isCaptain(a)?B.white:B.gray,fontSize:9,fontFamily:"Georgia,serif"}}>
                            {isCaptain(a)?"★ Cap":"Cap?"}
                          </button>
                        </div>
                      </div>
                    ))}
                    {Array.from({length:Math.max(0,3-starters.length)}).map((_,i)=>(
                      <div key={i} style={{width:72,height:72,borderRadius:"50%",border:`2px dashed ${B.grayLight}`,display:"flex",alignItems:"center",justifyContent:"center",color:B.grayLight,fontSize:24}}>+</div>
                    ))}
                  </div>
                  </div>

                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                  <div style={{flex:1,height:1,background:B.creamDark}}/>
                  <span style={{fontSize:10,color:B.gray,letterSpacing:1,textTransform:"uppercase"}}>Panchina</span>
                  <div style={{flex:1,height:1,background:B.creamDark}}/>
                </div>

                <div style={{display:"flex",justifyContent:"center",gap:14,flexWrap:"wrap",marginBottom:18}}>
                  {bench.map(a=>(
                    <div key={a.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                      <AthleteAvatar athlete={a} size={64} isStarter={false} isCaptain={false}/>
                      <div style={{fontSize:9,color:B.gray,textAlign:"center",maxWidth:64,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name.split(" ").slice(-1)[0]}</div>
                      <button onClick={()=>toggleStarter(a)} style={{padding:"2px 10px",borderRadius:7,border:"none",background:B.greenDark,color:B.white,fontSize:9,cursor:"pointer",fontFamily:"Georgia,serif"}}>▲ Titolare</button>
                    </div>
                  ))}
                </div>

                {/* Coach */}
                {currentCoach&&(
                  <div style={{background:B.yellowPale,border:`1px solid ${B.yellow}44`,borderRadius:10,padding:"10px 13px",marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:20}}>🧢</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:"bold",color:B.dark}}>Coach: {currentCoach.name}</div>
                        <div style={{fontSize:10,color:B.gray}}>+0.5 pt per ogni vittoria se schierato</div>
                      </div>
                      {/* Toggle schierato/panchina — sempre disponibile se non tappa In corso */}
                      <button onClick={async ()=>{
                        if (tappaInCorso2026 || isDeadlinePassed()) return;
                        const newVal = !coachInField[leagueId];
                        setCoachInField(cf=>({...cf,[leagueId]:newVal}));
                        try {
                          const db = await supabase.from("coach_selections", accessToken);
                          await db.update({in_field: newVal}, `user_id=eq.${authUser.id}&league_id=eq.${leagueId}`);
                        } catch(e) { console.warn("Errore salvataggio in_field:", e); }
                      }}
                        style={{padding:"5px 10px",borderRadius:8,border:"none",cursor:canTrade()?"pointer":"default",fontFamily:"Georgia,serif",fontSize:10,fontWeight:"bold",
                          background:coachInField[leagueId]?B.greenDark:B.grayPale,
                          color:coachInField[leagueId]?B.white:B.gray}}>
                        {coachInField[leagueId]?"✓ Schierato":"⏸ Panchina"}
                      </button>
                    </div>
                    {!coachInField[leagueId]&&(
                      <div style={{fontSize:10,color:B.orange,marginTop:6,paddingTop:6,borderTop:`1px solid ${B.yellow}44`}}>
                        ⚠️ Coach in panchina — nessun bonus, ma anche nessun malus se assente
                      </div>
                    )}
                  </div>
                )}

                <div style={{background:B.grayPale,borderRadius:10,padding:"11px 13px",fontSize:12,color:B.gray,lineHeight:1.7,marginBottom:12}}>
                  <b style={{color:B.dark}}>Come funziona:</b><br/>
                  Premi ▲ per portare un atleta in campo (max 3).<br/>
                  Premi ★ per nominarlo <b>capitano unico</b> (punti ×1.3).<br/>
                  Salva entro giovedì 23:00.
                </div>

                <button onClick={canSaveFormation()?handleSaveFormation:()=>showNotif("Tappa in corso — formazione bloccata","error")}
                  style={{width:"100%",padding:"13px",background:!canSaveFormation()?"#DC2626":roster.length===5&&lineup.length===3&&captain?B.greenDark:B.grayLight,border:"none",borderRadius:12,color:!canSaveFormation()||roster.length===5&&lineup.length===3&&captain?B.white:B.gray,fontWeight:"bold",fontSize:15,cursor:"pointer",fontFamily:"Georgia,serif"}}>
                  {!canSaveFormation()?"🔴 Tappa in corso":roster.length<5?`⚠️ Roster (${roster.length}/5)`:lineup.length<3?`Schiera titolari (${lineup.length}/3)`:!captain?"★ Nomina il capitano":"Salva Formazione ✓"}
                </button>
                </div>
                  )}
              </div>
            )}
          </div>
          )
        )}

        {/* TAB 2: CLASSIFICA */}
        {tab===2&&(
          <div>
            <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"12px 14px",marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:10}}>🏆 Premi {league.name}</div>
              {PRIZES.map((p,i)=>{
                const leagueCount = leagueUserCounts[league.id] || 0;
                const unlocked = leagueCount >= p.threshold;
                return(<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",opacity:unlocked?1:0.45,borderBottom:i<PRIZES.length-1?`1px solid ${B.creamDark}`:"none"}}>
                  <span style={{fontSize:20}}>{p.icon}</span>
                  <div style={{flex:1}}><div style={{fontSize:12,fontWeight:"bold",color:B.dark}}>{p.name}</div><div style={{fontSize:10,color:B.gray}}>{p.pos} posto · {p.threshold}+ utenti</div></div>
                  {unlocked?<span style={{fontSize:10,padding:"2px 8px",borderRadius:8,background:B.greenPale,color:B.greenDark,fontWeight:"bold"}}>✓</span>:<span style={{fontSize:10,color:B.gray}}>{leagueCount}/{p.threshold}</span>}
                </div>);
              })}
            </div>

            <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:10}}>Classifica {league.name}</div>
            <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:18}}>
              {standingsLoading ? (
                <div style={{textAlign:"center",padding:"20px",color:B.gray,fontSize:12}}>⏳ Caricamento classifica...</div>
              ) : leagueStandings.length === 0 ? (
                <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"20px",textAlign:"center"}}>
                  <div style={{fontSize:28,marginBottom:8}}>🏖️</div>
                  <div style={{fontSize:13,fontWeight:"bold",color:B.dark,marginBottom:4}}>Nessun risultato ancora</div>
                  <div style={{fontSize:11,color:B.gray}}>La classifica si aggiornerà dopo la prima tappa disputata.</div>
                </div>
              ) : leagueStandings.map(s=>{
                const myUsername = authUser?.user_metadata?.username || authUser?.email?.split("@")[0];
                const isMe = s.user === myUsername;
                return(
                  <div key={s.user_id} style={{background:isMe?B.greenPale:B.white,border:`1px solid ${isMe?B.greenDark:B.creamDark}`,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:30,height:30,borderRadius:8,flexShrink:0,background:s.rank===1?B.yellow:s.rank===2?B.grayLight:s.rank===3?"#CD7F32":B.grayPale,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold",fontSize:s.rank<=3?14:12}}>
                      {s.rank<=3?["🥇","🥈","🥉"][s.rank-1]:s.rank}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{color:isMe?B.greenDark:B.dark,fontWeight:"bold",fontSize:13}}>{s.team}{isMe&&" ⭐"}</div>
                      <div style={{color:B.gray,fontSize:11}}>@{s.user} · {s.budget}$ rimasti</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{color:s.rank===1?B.orange:B.dark,fontWeight:"bold",fontSize:20}}>{s.pts}</div>
                      <div style={{color:B.gray,fontSize:9}}>punti</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"12px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.orange}}>🔥 Combo</div>
                <span style={{fontSize:10,color:B.gray}}>{combo.length} giocatori</span>
              </div>
              {combo.length === 0 ? (
                <div style={{textAlign:"center",padding:"12px",color:B.gray,fontSize:11}}>Nessun giocatore iscritto a più leghe ancora.</div>
              ) : combo.map(s=>{
                const myUsername2=authUser?.user_metadata?.username||authUser?.email?.split("@")[0];
                const isMe=s.user===myUsername2;
                return(
                  <div key={s.user} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${B.creamDark}`}}>
                    <div style={{width:22,textAlign:"center",color:B.gray,fontWeight:"bold",fontSize:13}}>{s.rank}</div>
                    <div style={{flex:1}}>
                      <div style={{color:isMe?B.greenDark:B.dark,fontWeight:isMe?"bold":"normal",fontSize:13}}>@{s.user}{isMe&&" ⭐"}</div>
                      <div style={{color:B.gray,fontSize:10}}>{s.leagues} leghe</div>
                    </div>
                    <div style={{color:B.orange,fontWeight:"bold",fontSize:16}}>{s.pts}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: ATLETA */}
        {/* TAB 3: CALENDARIO */}
        {tab===3&&(
          <div>
            {selectedEvent?(
              <EventDetail
                event={selectedEvent}
                onBack={()=>setSelectedEvent(null)}
                myRoster={roster}
                matchResults={matchResultsData[selectedEvent.id]}
                onLoad={()=>loadMatchResults(selectedEvent.id)}
                athletes={athletes_data}/>
            ):(
              <div>
                {/* Filtro genere automatico dalla lega selezionata */}
                {(() => {
                  const leagueGender = league.gender; // "F" o "M"
                  const filteredEvents = events.filter(e => {
                    if ((e.anno || 2026) !== 2026) return false; // solo 2026
                    const eg = (e.gender||"").toUpperCase();
                    if (eg === "F" || eg === "FEMMINILE") return leagueGender === "F";
                    if (eg === "M" || eg === "MASCHILE")  return leagueGender === "M";
                    return true;
                  });
                  return (
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                        <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark}}>Stagione 2026</div>
                        <span style={{fontSize:10,padding:"2px 8px",borderRadius:8,background:leagueGender==="F"?B.orangePale:B.greenPale,color:leagueGender==="F"?B.orange:B.greenDark,fontWeight:"bold"}}>{leagueGender==="F"?"♀ Femminile":"♂ Maschile"}</span>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {filteredEvents.length===0
                          ? <div style={{textAlign:"center",padding:30,color:B.gray}}>
                              <div style={{fontSize:32,marginBottom:8}}>📅</div>
                              <div style={{fontSize:13,fontWeight:"bold",color:B.dark}}>Nessuna tappa disponibile</div>
                              <div style={{fontSize:11,color:B.gray,marginTop:4}}>Le tappe appariranno qui quando programmate.</div>
                            </div>
                          : filteredEvents.map(e=>{
                            const et = EVENT_TYPE_META[e.type]||EVENT_TYPE_META.Silver;
                            const isPlanned = e.status === "Planned";
                            const isClickable = !isPlanned; // solo Completato o In corso
                            return (
                              <div key={e.id}
                                onClick={isClickable
                                  ? ()=>{
                                      // Forza ricaricamento pulito ad ogni click
                                      setMatchResultsData(prev => {
                                        const next = {...prev};
                                        delete next[e.id];
                                        return next;
                                      });
                                      setSelectedEvent(e);
                                    }
                                  : ()=>setPopup({
                                      title:"Tappa non ancora disputata",
                                      msg:`${e.name} (${e.date}) non è ancora stata giocata. I risultati saranno disponibili dopo l'inserimento dei dati ufficiali.`,
                                      confirm:"Ok",
                                      onConfirm:()=>setPopup(null),
                                      onCancel:null,
                                    })
                                }
                                style={{background:B.cream,
                                  border:`1px solid ${e.status==="In corso"?B.orange:B.creamDark}`,
                                  borderLeft:`4px solid ${isPlanned?B.grayLight:et.color}`,
                                  borderRadius:10,padding:"12px 14px",
                                  cursor:isClickable?"pointer":"default",
                                  opacity:isPlanned?0.65:1,
                                  display:"flex",alignItems:"center",gap:12}}>
                                <div style={{width:52,height:52,borderRadius:10,flexShrink:0,
                                  background:isPlanned?B.sandDeep:et.bg,display:"flex",flexDirection:"column",
                                  alignItems:"center",justifyContent:"center",gap:1}}>
                                  <span style={{fontSize:9,fontWeight:"bold",color:isPlanned?B.gray:et.color,textAlign:"center",lineHeight:1.2}}>{et.label}</span>
                                  <span style={{fontSize:14,fontWeight:"900",color:isPlanned?B.gray:et.color}}>×{et.weight}</span>
                                </div>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{color:B.dark,fontWeight:"bold",fontSize:14}}>{e.name}</div>
                                  <div style={{color:B.gray,fontSize:11,marginTop:2}}>{e.date}{e.location?` · ${e.location}`:""}</div>
                                </div>
                                <span style={{fontSize:11,padding:"4px 10px",borderRadius:20,fontWeight:"bold",flexShrink:0,
                                  background:e.status==="Completato"?B.greenPale:e.status==="In corso"?B.orangePale:B.sandDeep,
                                  color:e.status==="Completato"?B.greenDark:e.status==="In corso"?B.orange:B.gray}}>
                                  {e.status==="In corso"?"🔴 In corso":e.status==="Completato"?"✓ Concluso":"📅 Pianificata"}
                                </span>
                              </div>
                            );
                          })
                        }
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ADMIN */}
        {tab===4&&isAdmin&&(
          <div>
            <div style={{background:B.orangePale,border:`1px solid ${B.orange}44`,borderRadius:10,padding:"9px 13px",marginBottom:14,fontSize:12,color:B.orange,textAlign:"center",fontWeight:"bold"}}>🔐 Pannello Admin</div>

            {/* Card statistiche reali */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"12px 10px",textAlign:"center"}}>
                <span style={{fontSize:20}}>👥</span>
                <div style={{color:B.orange,fontWeight:"bold",fontSize:22,marginTop:4}}>{totalUsers}</div>
                <div style={{color:B.gray,fontSize:11}}>Utenti</div>
              </div>
              <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"12px 10px",textAlign:"center"}}>
                <span style={{fontSize:20}}>🏖️</span>
                <div style={{color:B.orange,fontWeight:"bold",fontSize:22,marginTop:4}}>{totalSquads}</div>
                <div style={{color:B.gray,fontSize:11}}>Squadre create</div>
              </div>
              {/* Top 3 atlete F più comprate */}
              <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"12px 10px",gridColumn:"1/-1"}}>
                <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:8}}>♀ Atlete F più comprate</div>
                {topF.length===0?<div style={{color:B.gray,fontSize:11}}>Nessun dato</div>:topF.map((a,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderBottom:i<topF.length-1?`1px solid ${B.creamDark}`:"none"}}>
                    <span style={{color:B.orange,fontWeight:"bold",fontSize:13,width:16}}>{i+1}.</span>
                    <span style={{flex:1,fontSize:12,color:B.dark}}>{a.name}</span>
                    <span style={{fontSize:11,color:B.gray}}>{a.count} roster</span>
                  </div>
                ))}
              </div>
              {/* Top 3 atleti M più comprati */}
              <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"12px 10px",gridColumn:"1/-1"}}>
                <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:8}}>♂ Atleti M più comprati</div>
                {topM.length===0?<div style={{color:B.gray,fontSize:11}}>Nessun dato</div>:topM.map((a,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderBottom:i<topM.length-1?`1px solid ${B.creamDark}`:"none"}}>
                    <span style={{color:B.orange,fontWeight:"bold",fontSize:13,width:16}}>{i+1}.</span>
                    <span style={{flex:1,fontSize:12,color:B.dark}}>{a.name}</span>
                    <span style={{fontSize:11,color:B.gray}}>{a.count} roster</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Richieste iscrizione */}
            <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"12px 14px",marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:10}}>
                Richieste Iscrizione {pendingRequests.length>0&&<span style={{background:B.orange,color:B.white,borderRadius:20,padding:"1px 8px",fontSize:10,marginLeft:6}}>{pendingRequests.length}</span>}
              </div>
              {pendingRequests.length===0?(
                <div style={{color:B.gray,fontSize:12,textAlign:"center",padding:"10px 0"}}>Nessuna richiesta in attesa ✓</div>
              ):pendingRequests.map((req,i)=>(
                <div key={req.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:i<pendingRequests.length-1?`1px solid ${B.creamDark}`:"none"}}>
                  <div style={{flex:1}}>
                    <div style={{color:B.dark,fontWeight:"bold",fontSize:13}}>{req.team_name||"—"}</div>
                    <div style={{color:B.gray,fontSize:11}}>{req.username} · {req.league_id}</div>
                  </div>
                  <button onClick={async()=>{
                    try {
                      const db = await supabase.from("user_leagues",accessToken);
                      await db.update({status:"approved"},`id=eq.${req.id}`);
                      // Invia notifica all'utente approvato
                      try {
                        const ndb = await supabase.from("notifications", accessToken);
                        await ndb.insert({
                          user_id: req.user_id,
                          type: "approved",
                          message: `✅ Iscrizione alla lega ${{"L001-F":"Classic Femminile","L001-M":"Classic Maschile","L002-F":"Market Femminile","L002-M":"Market Maschile"}[req.league_id]||req.league_id} approvata! Puoi ora acquistare atleti.`,
                        });
                      } catch(e) { /* silenzioso */ }
                      setPendingRequests(r=>r.filter(x=>x.id!==req.id));
                      setTotalSquads(s=>s+1);
                      showNotif(`${req.username} approvato! ✓`);
                    } catch(e){ showNotif("Errore approvazione","error"); }
                  }} style={{padding:"6px 12px",borderRadius:8,border:"none",background:B.greenPale,color:B.greenDark,fontSize:12,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif"}}>✓ Ok</button>
                  <button onClick={async()=>{
                    try {
                      const db = await supabase.from("user_leagues",accessToken);
                      await db.update({status:"rejected"},`id=eq.${req.id}`);
                      // Notifica all'utente del rifiuto
                      try {
                        const ndb = await supabase.from("notifications", accessToken);
                        const lgName = {"L001-F":"Classic Femminile","L001-M":"Classic Maschile","L002-F":"Market Femminile","L002-M":"Market Maschile"}[req.league_id]||req.league_id;
                        await ndb.insert({
                          user_id: req.user_id,
                          type: "rejected",
                          message: `❌ La tua richiesta di iscrizione alla lega ${lgName} non è stata accettata. Contatta l'admin per info.`,
                        });
                      } catch(e) { /* silenzioso */ }
                      setPendingRequests(r=>r.filter(x=>x.id!==req.id));
                      showNotif(`${req.username} rifiutato`,"error");
                    } catch(e){ showNotif("Errore rifiuto","error"); }
                  }} style={{padding:"6px 12px",borderRadius:8,border:"none",background:B.orangePale,color:B.orange,fontSize:12,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif"}}>✗ No</button>
                </div>
              ))}
            </div>

            {/* Sblocco premi per lega */}
            <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"12px 14px",marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:12}}>Sblocco Premi per Lega</div>
              {[
                {id:"L001-F",label:"Classic F",threshold:25,combo:false},
                {id:"L001-M",label:"Classic M",threshold:25,combo:false},
                {id:"L002-F",label:"Market F", threshold:25,combo:false},
                {id:"L002-M",label:"Market M", threshold:25,combo:false},
                {id:"COMBO",  label:"Combo",    threshold:30,combo:true},
              ].map((lg,i)=>{
                const count = leagueUserCounts[lg.id]||0;
                const prizes = lg.combo
                  ? [{t:30,icon:"🎧",name:"Super Premio"}]
                  : [{t:10,icon:"🎒",name:"Borsone"},{t:18,icon:"👕",name:"Canotta"},{t:25,icon:"🎧",name:"AirPods"}];
                return(
                  <div key={lg.id} style={{marginBottom:i<4?14:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <span style={{fontSize:12,fontWeight:"bold",color:B.dark}}>{lg.label}</span>
                      <span style={{fontSize:11,color:B.gray}}>{count}/{lg.threshold} utenti</span>
                    </div>
                    <div style={{height:5,background:B.grayPale,borderRadius:3,marginBottom:5,position:"relative"}}>
                      <div style={{height:"100%",borderRadius:3,width:`${Math.min(100,(count/lg.threshold)*100)}%`,background:count>=lg.threshold?B.greenDark:B.orange,transition:"width .4s"}}/>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      {prizes.map((p,j)=>(
                        <div key={j} style={{flex:1,background:count>=p.t?B.greenPale:B.grayPale,borderRadius:8,padding:"5px 6px",textAlign:"center",border:`1px solid ${count>=p.t?B.greenDark+"44":B.creamDark}`}}>
                          <div style={{fontSize:14}}>{p.icon}</div>
                          <div style={{fontSize:9,color:count>=p.t?B.greenDark:B.gray,fontWeight:count>=p.t?"bold":"normal"}}>{p.t}+</div>
                          <div style={{fontSize:9,color:count>=p.t?B.greenDark:B.gray}}>{p.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>


            {/* Pulsanti azioni con stato dinamico */}
            {[
              {
                icon:"🏪",
                title:"Mercato Market",
                desc:`Compravendite — attualmente ${leagues.find(l=>l.id==="L002-F")?.marketOpen?"aperto":"chiuso"}`,
                isOpen: leagues.find(l=>l.id==="L002-F")?.marketOpen,
                action: async () => {
                  const newMarket = !leagues.find(l=>l.id==="L002-F")?.marketOpen;
                  setLeagues(ls=>ls.map(l=>l.type==="market"?{...l,marketOpen:newMarket}:l));
                  showNotif(`Mercato Market ${newMarket?"aperto":"chiuso"}!`);
                  try {
                    const db = await supabase.from("league_settings", accessToken);
                    for (const lid of ["L002-F","L002-M"]) {
                      await db.upsert({league_id:lid,market_open:newMarket,updated_at:new Date().toISOString()},"league_id");
                    }
                  } catch(e) { console.warn("Errore salvataggio settings:", e); }
                }
              },
              {
                icon:"🔄",
                title:"Ranking FIPAV",
                desc: syncLoading
                  ? "⏳ Sincronizzazione in corso..."
                  : `Ultimo aggiornamento: ${lastSyncFipav||"mai"} ${lastSyncFipavOk===true?"✓":lastSyncFipavOk===false?"✗ Errore":""}`,
                isOpen: null,
                action: async () => {
                  if (syncLoading) return;
                  setSyncLoading(true);
                  try {
                    const res = await fetch("/.netlify/functions/sync");
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    if (data.error) throw new Error(data.error);

                    const newWomen = data.women?.length > 0 ? data.women.map(enrichAthlete) : athletes_data.women;
                    const newMen   = data.men?.length   > 0 ? data.men.map(enrichAthlete)   : athletes_data.men;

                    // Salva in cache e aggiorna state
                    cacheAthletes(data.women || [], data.men || []);
                    setAthletesData({ women: newWomen, men: newMen });

                    // Aggiorna eventi e coach da Supabase senza reload
                    if (accessToken && authUser) {
                      try {
                        const [evRes, coachRes] = await Promise.all([
                          supabase.from("events", accessToken).then(db => db.select("*", "&order=anno.asc,id.asc")),
                          supabase.from("coaches", accessToken).then(db => db.select("*", "&active=eq.true&order=cost.desc,name.asc")),
                        ]);
                        if (Array.isArray(evRes) && evRes.length > 0) {
                          const newEvents = evRes.map(e => ({ ...e, date: e.date_start || "" }));
                          // Controlla se qualche tappa è passata a Completato
                          const justCompleted = newEvents.filter(e =>
                            e.status === "Completato" &&
                            events.find(old => old.id === e.id && old.status !== "Completato")
                          );
                          if (justCompleted.length > 0 && accessToken) {
                            try {
                              const ndb = await supabase.from("notifications", accessToken);
                              for (const ev of justCompleted) {
                                await ndb.insert({
                                  user_id: null,
                                  type: "scores_ready",
                                  message: `🏆 ${ev.name} completata! I punteggi sono ora disponibili in classifica.`,
                                });
                              }
                            } catch(e) { /* silenzioso */ }
                          }
                          setEvents(newEvents);
                        }
                        if (Array.isArray(coachRes) && coachRes.length > 0)
                          setCoachesList(coachRes.filter(c => c.active !== false).map(c => ({ ...c, athletes: [] })));
                      } catch(e) { console.warn("Refresh eventi/coach:", e.message); }
                    }

                    const now = new Date().toLocaleString("it-IT", {
                      day:"2-digit", month:"2-digit",
                      hour:"2-digit", minute:"2-digit"
                    });
                    setLastSyncFipav(now);
                    setLastSyncFipavOk(true);
                    showNotif(`✓ Ranking aggiornato! ${newWomen.length}F + ${newMen.length}M atleti`);
                  } catch(e) {
                    console.error("Sync error:", e);
                    setLastSyncFipavOk(false);
                    showNotif("Errore sincronizzazione: " + e.message, "error");
                  }
                  setSyncLoading(false);
                }
              },
              {
                icon:"🏆",
                title:"Risultati Tappa",
                desc: syncResultsLoading
                  ? "⏳ Calcolo punti in corso..."
                  : `Ultimo caricamento: ${lastSyncResults||"mai"} ${lastSyncResultsOk===true?"✓":lastSyncResultsOk===false?"✗ Errore":""}`,
                isOpen: null,
                action: async () => {
                  if (syncResultsLoading) return;
                  // Chiede quale evento sincronizzare
                  const eventsInCorso = events.filter(e => e.status === "In corso" || e.status === "Completato");
                  const eventId = window.prompt(
                    `Quale evento sincronizzare?\n\n` +
                    eventsInCorso.map(e => `${e.id} — ${e.name} (${e.status})`).join("\n") +
                    "\n\nScrivi l'Event ID (es. E0004) oppure lascia vuoto per tutti:"
                  );
                  if (eventId === null) return; // ha premuto Annulla
                  setSyncResultsLoading(true);
                  try {
                    const body = eventId.trim() ? { event_id: eventId.trim() } : {};
                    const res = await fetch("/.netlify/functions/sync-results", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(body),
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    if (data.error) throw new Error(data.error);

                    const now = new Date().toLocaleString("it-IT", {
                      day:"2-digit", month:"2-digit",
                      hour:"2-digit", minute:"2-digit"
                    });
                    setLastSyncResults(now);
                    setLastSyncResultsOk(true);

                    // Salva snapshot classifica per le frecce ▲▼
                    const eventIdSynced = body?.event_id;
                    if (eventIdSynced) {
                      try {
                        const snapDb = await supabase.from("", accessToken); // usa RPC
                        await fetch(`${SUPABASE_URL}/rest/v1/rpc/save_standings_snapshot`, {
                          method: "POST",
                          headers: {
                            "apikey": SUPABASE_ANON,
                            "Authorization": `Bearer ${accessToken}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({ p_event_id: eventIdSynced }),
                        });
                      } catch(e) { console.warn("Snapshot classifica fallito:", e.message); }
                    }
                    // Ricarica classifica (forza aggiornamento cache)
                    loadStandings(accessToken, true);
                    // Reset cache partite così si ricaricano al prossimo click
                    setMatchResultsData({});

                    const msg = `✓ ${data.resultsGenerated} risultati salvati (${data.matchesProcessed} partite)`;
                    showNotif(msg);
                    // Notifica globale punteggi disponibili
                    try {
                      const ndb = await supabase.from("notifications", accessToken);
                      await ndb.insert({
                        user_id: null, // globale per tutti
                        type: "scores_ready",
                        message: `🏆 Punteggi aggiornati! I risultati della tappa sono disponibili.`,
                      });
                    } catch(e) { /* silenzioso */ }
                    if (data.warnings && data.warnings.length > 0) {
                      console.warn("Sync warnings:", data.warnings);
                      setTimeout(() => showNotif(`⚠️ ${data.warnings.length} warning — vedi console`, "error"), 2000);
                    }
                  } catch(e) {
                    console.error("Sync results error:", e);
                    setLastSyncResultsOk(false);
                    showNotif("Errore sync risultati: " + e.message, "error");
                  }
                  setSyncResultsLoading(false);
                }
              }
            ].map((item,i)=>(
              <div key={i} style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"11px 13px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:22,flexShrink:0}}>{item.icon}</span>
                <div style={{flex:1}}>
                  <div style={{color:B.dark,fontWeight:"bold",fontSize:13}}>{item.title}</div>
                  <div style={{color:B.gray,fontSize:11,marginTop:1}}>{item.desc}</div>
                </div>
                {item.isOpen!==null?(
                  <button onClick={item.action} style={{padding:"7px 14px",borderRadius:8,border:"none",
                    background:item.isOpen?"#FEE2E2":"#D1FAE5",
                    color:item.isOpen?"#DC2626":"#065F46",
                    fontSize:11,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif",flexShrink:0,minWidth:64}}>
                    {item.isOpen?"Chiudi":"Apri"}
                  </button>
                ):(
                  <button onClick={item.action} disabled={item.title==="Ranking FIPAV"?syncLoading:item.title==="Risultati Tappa"?syncResultsLoading:false}
                    style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${B.grayLight}`,
                    background:B.greenPale,color:B.greenDark,
                    fontSize:11,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif",flexShrink:0}}>
                    {item.title==="Ranking FIPAV" && syncLoading ? "..." : item.title==="Risultati Tappa" && syncResultsLoading ? "..." : "Sync"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        </div>)} {/* fine !hiddenPage */}
      </div>


      {/* HAMBURGER MENU */}
      {showMenu&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex"}}>
          <div onClick={()=>{setShowMenu(false);setMenuSection(null);}} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)"}}/>
          <div style={{position:"relative",width:300,maxWidth:"85vw",height:"100%",background:B.cream,overflowY:"auto",display:"flex",flexDirection:"column"}}>
            <div style={{background:B.sandDark,padding:"20px 16px 14px",borderBottom:`1px solid ${B.sandDeep}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <LogoFull height={42}/>
                <button onClick={()=>{setShowMenu(false);setMenuSection(null);}} style={{width:30,height:30,borderRadius:"50%",border:`1px solid ${B.sandDeep}`,background:B.white,cursor:"pointer",fontSize:14,color:B.gray,fontFamily:"Georgia,serif"}}>x</button>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:42,height:42,borderRadius:"50%",background:B.greenDark,display:"flex",alignItems:"center",justifyContent:"center",color:B.white,fontWeight:"bold",fontSize:17}}>
                  {(authUser?.email||"?")[0].toUpperCase()}
                </div>
                <div>
                  <div style={{fontWeight:"bold",color:B.dark,fontSize:14}}>{authUser?.user_metadata?.username||authUser?.email?.split("@")[0]||"Utente"}</div>
                  <div style={{color:B.gray,fontSize:11}}>{isAdmin?"Admin 🔐":"Giocatore"} · {Object.values(joinStatus).filter(s=>s==="APPROVED").length} leghe</div>
                </div>
              </div>
            </div>

            <div style={{padding:"8px 0",flex:1}}>
                {[
                  {icon:"👤", label:"Il mio profilo",  sub:"Dati e squadre",          sec:"profile"},
                  {icon:"📊", label:"Storico Tappe", sub:"Punti per tappa e formazione", sec:"history"},
                 {icon:"👥", label:"Formazioni di Lega", sub:"Le formazioni di tutti, per tappa", sec:"formations"},
                  {icon:"🏟️", label:"Risultati Tappa", sub:"Partite reali del torneo", sec:"risultati"},
                  {icon:"🏆", label:"Premi",            sub:"Cosa vinci e scalatura",   sec:"prizes"},
                  {icon:"📋", label:"Regole di gioco",  sub:"Punti, bonus e malus",     sec:"rules"},
                  {icon:"📅", label:"Calendario",       sub:"9 tappe 2026",             sec:"cal"},
                  {icon:"📄", label:"Termini",          sub:"Regolamento ufficiale",    sec:"terms"},
                  ...(isAdmin?[
                    {icon:"🏐", label:"Stats Atleti",   sub:"Performance e ownership",  sec:"stats-atleti"},
                    {icon:"👥", label:"Stats Utenti",   sub:"Guru, Trader, Casinò",     sec:"stats-utenti"},
                    {icon:"🏅", label:"Awards",         sub:"Bandit, Scam, Gem...",     sec:"stats-awards"},
                  ]:[]),
                ].map((item,i)=>(
                  <button key={i} onClick={()=>{
                    if (item.sec==="cal") { setTab(3); setShowMenu(false); setHiddenPage(null); }
                    else { setHiddenPage(item.sec); setShowMenu(false); }
                  }}
                    style={{width:"100%",padding:"12px 16px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"Georgia,serif",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${B.sandDeep}`,textAlign:"left"}}>
                    <div style={{width:36,height:36,borderRadius:10,background:item.sec?.startsWith("stats")?"#FDF0EB":B.greenPale,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontSize:18}}>{item.icon}</span>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{color:item.sec?.startsWith("stats")?"#E8541A":B.dark,fontWeight:"bold",fontSize:13}}>{item.label}</div>
                      <div style={{color:B.gray,fontSize:11,marginTop:1}}>{item.sub}</div>
                    </div>
                    <span style={{color:B.grayLight,fontSize:12}}>›</span>
                  </button>
                ))}
                <button onClick={()=>{setShowMenu(false);onLogout();}}
                  style={{width:"100%",padding:"12px 16px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"Georgia,serif",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${B.sandDeep}`,textAlign:"left"}}>
                  <div style={{width:36,height:36,borderRadius:10,background:B.orangePale,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:18}}>🚪</span>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{color:B.orange,fontWeight:"bold",fontSize:13}}>Logout</div>
                    <div style={{color:B.gray,fontSize:11,marginTop:1}}>Esci dall'account</div>
                  </div>
                </button>
              </div>

          </div>
        </div>
      )}

      <style>{`*{box-sizing:border-box;}button,input,select{font-family:Georgia,serif;}input::placeholder{color:${B.grayLight};}::-webkit-scrollbar{display:none;}`}</style>
    </div>
  );
}

// ─── HELPER PAGINE MENU ───────────────────────────────────────
function MenuPage({ title, emoji, onBack, children }) {
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <button onClick={onBack} style={{background:B.grayPale,border:"none",color:B.gray,padding:"7px 14px",borderRadius:20,cursor:"pointer",fontSize:12,fontFamily:"Georgia,serif"}}>← Indietro</button>
        <span style={{fontSize:20}}>{emoji}</span>
        <div style={{fontWeight:"bold",fontSize:17,color:B.dark}}>{title}</div>
      </div>
      {children}
    </div>
  );
}

// ─── PAGINA PROFILO ───────────────────────────────────────────
function PageProfilo({ authUser, isAdmin, joinStatus, teamNames, accessToken, leagueId, onBack }) {
  const username = authUser?.user_metadata?.username || authUser?.email?.split("@")[0] || "—";
  const legheAttive = Object.values(joinStatus).filter(s=>s==="APPROVED").length;
  const [transfers, setTransfers] = React.useState(null);
  const [filterLeague, setFilterLeague] = React.useState(leagueId || "L001-F");

  useEffect(() => {
    if (!accessToken || !authUser?.id) return;
    setTransfers(null); // reset prima del caricamento
    const load = async () => {
      try {
        const db = await supabase.from("transfer_history", accessToken);
        const rows = await db.select("*",
          `&user_id=eq.${authUser.id}&league_id=eq.${filterLeague}&order=created_at.desc&limit=30`);
        setTransfers(Array.isArray(rows) ? rows : []);
      } catch(e) { setTransfers([]); }
    };
    load();
  }, [authUser?.id, filterLeague]);

  const LEGHE = [{id:"L001-F",name:"Classic F"},{id:"L001-M",name:"Classic M"},{id:"L002-F",name:"Market F"},{id:"L002-M",name:"Market M"}];

  return (
    <MenuPage title="Il mio profilo" emoji="👤" onBack={onBack}>
      {[
        {l:"Username",    v:username},
        {l:"Email",       v:authUser?.email||"—"},
        {l:"Ruolo",       v:isAdmin?"Admin 🔐":"Giocatore"},
        {l:"Leghe attive",v:String(legheAttive)},
      ].map((f,i)=>(
        <div key={i} style={{background:B.white,borderRadius:10,padding:"12px 14px",marginBottom:8,border:`1px solid ${B.creamDark}`}}>
          <div style={{fontSize:10,color:B.gray,textTransform:"uppercase",letterSpacing:1}}>{f.l}</div>
          <div style={{fontSize:14,fontWeight:"bold",color:B.dark,marginTop:3}}>{f.v}</div>
        </div>
      ))}

      {/* Leghe */}
      <div style={{background:B.greenPale,border:`1px solid ${B.greenDark}33`,borderRadius:12,padding:"14px",marginTop:8,marginBottom:14}}>
        <div style={{fontWeight:"bold",fontSize:13,color:B.greenDark,marginBottom:6}}>Le mie leghe</div>
        {LEGHE.map(l=>{
          const isActive = l.id === leagueId;
          return (
            <div key={l.id} style={{padding:"8px 0",borderBottom:`1px solid ${B.greenDark}22`,background:isActive?"rgba(45,92,79,0.05)":"transparent",borderRadius:isActive?6:0,paddingLeft:isActive?6:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,color:B.dark,fontWeight:isActive?"bold":"normal"}}>
                  {isActive&&"→ "}{l.name}
                </span>
                <span style={{fontSize:11,fontWeight:"bold",padding:"2px 10px",borderRadius:20,
                  background:joinStatus[l.id]==="APPROVED"?B.greenDark:joinStatus[l.id]==="PENDING"?B.yellowPale:B.grayPale,
                  color:joinStatus[l.id]==="APPROVED"?B.white:joinStatus[l.id]==="PENDING"?"#7A4F00":B.gray}}>
                  {joinStatus[l.id]==="APPROVED"?"✓ Iscritto":joinStatus[l.id]==="PENDING"?"⏳ In attesa":"Non iscritto"}
                </span>
              </div>
              {teamNames?.[l.id] && joinStatus[l.id]==="APPROVED" && (
                <div style={{fontSize:12,color:B.greenDark,marginTop:3,fontWeight:isActive?"bold":"normal"}}>
                  🏖️ {teamNames[l.id]}{isActive&&" ← lega attiva"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Storico trasferimenti filtrato per lega */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontWeight:"bold",fontSize:13,color:B.dark}}>📋 Storico Trasferimenti</div>
          <select value={filterLeague} onChange={e=>{setFilterLeague(e.target.value);setTransfers(null);}}
            style={{fontSize:11,border:`1px solid ${B.creamDark}`,borderRadius:8,padding:"3px 6px",background:B.white,color:B.dark,fontFamily:"Georgia,serif"}}>
            {LEGHE.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        {transfers === null
          ? <div style={{textAlign:"center",padding:"12px",color:B.gray,fontSize:11}}>⏳ Caricamento...</div>
          : transfers.length === 0
            ? <div style={{textAlign:"center",padding:"12px",color:B.gray,fontSize:11}}>Nessun trasferimento in {LEGHE.find(l=>l.id===filterLeague)?.name}</div>
            : transfers.map((t,i) => (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",
                borderBottom:i<transfers.length-1?`1px solid ${B.creamDark}`:"none"}}>
                <span style={{fontSize:18}}>{t.action==="buy"?"🟢":"🔴"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:"bold",color:B.dark,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {t.player_name||t.player_id}
                  </div>
                  <div style={{fontSize:10,color:B.gray}}>
                    {t.action==="buy"?"Acquistato":"Venduto"} · {t.created_at?new Date(t.created_at).toLocaleDateString("it-IT"):""}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:13,fontWeight:"bold",color:t.action==="buy"?B.orange:B.greenDark}}>
                    {t.action==="buy"?"-":"+"}${t.price||0}
                  </div>
                  <div style={{fontSize:9,color:B.gray}}>saldo: ${t.budget_after||0}</div>
                </div>
              </div>
            ))
        }
      </div>
    </MenuPage>
  );
}

// ─── PAGINA PREMI ─────────────────────────────────────────────
function PagePremi({ onBack }) {
  return (
    <MenuPage title="Premi" emoji="🏆" onBack={onBack}>
      <div style={{fontSize:12,color:B.gray,marginBottom:16,lineHeight:1.6,background:B.sandDark,borderRadius:10,padding:"10px 14px"}}>
        I premi si sbloccano per soglia di iscritti <b>per singola lega</b>. Le soglie non si sommano tra leghe diverse.
      </div>

      {[
        {pos:"1° posto",name:"AirPods 4",emoji:"🎧",threshold:25,color:B.orange,desc:"Il vincitore di ogni lega porta a casa le nuove AirPods 4."},
        {pos:"2° posto",name:"Canotta/Top Nazionale",emoji:"👕",threshold:18,color:B.greenDark,desc:"Canotta (leghe M) o Top (leghe F) firmata dagli atleti della Nazionale Italiana."},
        {pos:"3° posto",name:"Borsone Under Armour",emoji:"🎒",threshold:10,color:B.gray,desc:"Borsone griffato Under Armour per il terzo classificato di ogni lega."},
      ].map((p,i)=>(
        <div key={i} style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"16px",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:8}}>
            <div style={{fontSize:44,lineHeight:1}}>{p.emoji}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:B.gray,fontWeight:"bold",textTransform:"uppercase",letterSpacing:1}}>{p.pos}</div>
              <div style={{fontSize:15,fontWeight:"bold",color:B.dark,marginTop:2}}>{p.name}</div>
              <div style={{fontSize:11,color:p.color,fontWeight:"bold",marginTop:3}}>Si sblocca con {p.threshold}+ iscritti</div>
            </div>
          </div>
          <div style={{fontSize:12,color:B.gray,lineHeight:1.6}}>{p.desc}</div>
        </div>
      ))}

      <div style={{background:B.orangePale,border:`1px solid ${B.orange}44`,borderRadius:12,padding:"16px",marginBottom:10}}>
        <div style={{fontWeight:"bold",fontSize:15,color:B.orange,marginBottom:6}}>🔥 Super Premio Combo</div>
        <div style={{fontSize:12,color:B.dark,lineHeight:1.7,marginBottom:8}}>
          Chi è iscritto ad almeno 2 leghe partecipa alla classifica Combo (somma punti di tutte le leghe). Il vincitore con almeno 30 squadre multi-lega vince un super premio speciale.
        </div>
        <div style={{fontSize:11,color:B.orange,fontWeight:"bold"}}>Soglia: 30 squadre multi-lega</div>
      </div>

      <div style={{background:B.greenPale,border:`1px solid ${B.greenDark}33`,borderRadius:12,padding:"16px"}}>
        <div style={{fontWeight:"bold",fontSize:14,color:B.greenDark,marginBottom:10}}>📐 Regola Scalatura</div>
        <div style={{fontSize:12,color:B.dark,lineHeight:1.8,marginBottom:10}}>
          Se un utente vince sia una lega che la Combo, riceve <b>solo il premio Combo</b>. La classifica della lega vinta scorre verso l'alto:
        </div>
        {["2° posto → riceve il premio del 1°","3° posto → riceve il premio del 2°","4° posto → entra in podio e riceve il premio del 3°"].map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:i<2?`1px solid ${B.greenDark}22`:"none"}}>
            <span style={{color:B.greenDark,fontSize:14}}>→</span>
            <span style={{fontSize:12,color:B.dark}}>{s}</span>
          </div>
        ))}
        <div style={{marginTop:10,padding:"8px 10px",background:B.white,borderRadius:8,fontSize:11,color:B.gray,lineHeight:1.6}}>
          Esempio: Marco vince Market M e la Combo. Prende il super premio Combo. Il 2° di Market M riceve gli AirPods, il 3° la canotta, il 4° il borsone.
        </div>
      </div>
    </MenuPage>
  );
}

// ─── PAGINA REGOLE ────────────────────────────────────────────
function PageRegole({ onBack }) {
  const Row = ({label,value,color,bg}) => (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${B.creamDark}`}}>
      <span style={{fontSize:13,color:B.dark}}>{label}</span>
      <span style={{fontSize:13,fontWeight:"bold",padding:"2px 12px",borderRadius:8,background:bg,color:color}}>{value}</span>
    </div>
  );
  const Section = ({title,color}) => (
    <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:color||B.greenDark,marginTop:20,marginBottom:10}}>{title}</div>
  );
  const InfoBox = ({children,color,bg}) => (
    <div style={{background:bg||B.sandDark,border:`1px solid ${color||B.sandDeep}`,borderRadius:8,padding:"10px 12px",marginTop:8,fontSize:11,color:color?B.dark:B.gray,lineHeight:1.7}}>
      {children}
    </div>
  );

  return (
    <MenuPage title="Regole di Gioco" emoji="📋" onBack={onBack}>

      {/* Struttura torneo */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:12}}>
        <Section title="🏖️ Struttura torneo"/>
        <div style={{fontSize:12,color:B.dark,lineHeight:1.8}}>
          La stagione 2026 conta <b>9 tappe</b>. Ogni tappa si svolge nel fine settimana:
        </div>
        {[
          {giorno:"Venerdì",desc:"Qualifiche 1 e 2 — valgono punti fantasy"},
          {giorno:"Sabato",  desc:"Main Draw: Pool da 4 squadre"},
          {giorno:"Domenica",desc:"Ottavi → Quarti → Semifinali → Finali"},
        ].map((g,i)=>(
          <div key={i} style={{display:"flex",gap:10,padding:"6px 0",borderBottom:`1px solid ${B.creamDark}`}}>
            <span style={{fontSize:11,fontWeight:"bold",color:B.orange,width:60,flexShrink:0}}>{g.giorno}</span>
            <span style={{fontSize:12,color:B.dark}}>{g.desc}</span>
          </div>
        ))}
        <InfoBox>
          <b>Pool:</b> 1° classificato → BYE (accesso diretto ai quarti, vale come vittoria 2-0). 2° e 3° → ottavi. 4° → eliminato.
        </InfoBox>
      </div>

      {/* Punti base */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:12}}>
        <Section title="🏐 Punti base per partita"/>
        <Row label="Vittoria 2-0"    value="+4 pt" color={B.greenDark} bg={B.greenPale}/>
        <Row label="Vittoria 2-1"    value="+3 pt" color={B.greenDark} bg={B.greenPale}/>
        <Row label="Sconfitta 1-2"   value="+1 pt" color={B.orange}    bg={B.orangePale}/>
        <Row label="Sconfitta 0-2"   value="0 pt"  color={B.gray}      bg={B.grayPale}/>
        <Row label="BYE (tavolino)"  value="+4 pt" color={B.greenDark} bg={B.greenPale}/>
        <InfoBox>
          I punti vengono assegnati per ogni partita giocata. Un'atleta che gioca 5 partite accumula i punti di tutte e 5.
        </InfoBox>
      </div>

      {/* Bonus */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:12}}>
        <Section title="✨ Bonus"/>
        <Row label="🎯 Set perso di misura" value="+0.5 pt" color={"#7C3AED"} bg={"#F3E8FF"}/>
        <Row label="★ Capitano"             value="×1.3"   color={B.yellow}   bg={B.yellowPale}/>
        <Row label="🧢 Coach vittoria"       value="+0.5 pt" color={B.greenDark} bg={B.greenPale}/>
        <InfoBox>
          <b>Set perso di misura (+0.5 pt)</b><br/>
          Si guadagna +0.5 pt se si perde un set con esattamente 2 punti di scarto. Vale solo nei primi due set, non nel tie-break. Il bonus va alla coppia che ha perso quel set.<br/><br/>
          ✅ Perdi il 1° set 19-21 → <b>+0.5 pt</b> (scarto = 2)<br/>
          ✅ Perdi il 2° set 21-23 → <b>+0.5 pt</b> (scarto = 2)<br/>
          ✅ Perdi il 2° set 23-25 → <b>+0.5 pt</b> (scarto = 2)<br/>
          ❌ Perdi il 1° set 18-21 → <b>0 pt</b> (scarto = 3, non basta)<br/>
          ❌ Perdi il 1° set 15-21 → <b>0 pt</b> (scarto troppo grande)<br/>
          ❌ Vinci il set 21-19 → <b>0 pt</b> (vale solo per chi perde il set)<br/>
          ❌ Perdi il 3° set 13-15 → <b>0 pt</b> (tie-break, non vale mai)<br/><br/>
          <b>Capitano (×1.3):</b> moltiplicatore sul punteggio del capitano. Si cumula con il moltiplicatore tappa.<br/><br/>
          <b>Coach vittoria (+0.5 pt):</b> +0.5 pt per ogni partita vinta dalla coppia del tuo coach, solo se schierato.
        </InfoBox>
      </div>

      {/* Malus Coach rimosso — solo bonus */}

      {/* Moltiplicatori tappa */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:12}}>
        <Section title="⚡ Moltiplicatori tappa"/>
        <div style={{fontSize:12,color:B.gray,marginBottom:10}}>Il moltiplicatore si applica al <b>punteggio finale</b> del team per quella tappa, inclusi capitano e coach.</div>
        {[
          {tipo:"Silver",       mult:"×1.0", esempi:"Falconara, Marina di Ravenna, Caorle qualif.", color:B.greenDark, bg:B.greenPale},
          {tipo:"Gold",         mult:"×1.3", esempi:"Termoli, Marina di Modica",                    color:"#B8860B",  bg:"#FEF7E8"},
          {tipo:"Coppa Italia", mult:"×1.5", esempi:"Montesilvano",                                 color:B.orange,   bg:B.orangePale},
          {tipo:"Finale",       mult:"×1.7", esempi:"Caorle — tappa finale di stagione",            color:"#7C3AED",  bg:"#F3E8FF"},
        ].map((t,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<3?`1px solid ${B.creamDark}`:"none"}}>
            <span style={{fontSize:11,fontWeight:"bold",padding:"3px 10px",borderRadius:20,background:t.bg,color:t.color,flexShrink:0,minWidth:80,textAlign:"center"}}>{t.tipo}</span>
            <span style={{fontSize:18,fontWeight:"bold",color:t.color,flexShrink:0,width:36}}>{t.mult}</span>
            <span style={{fontSize:11,color:B.gray}}>{t.esempi}</span>
          </div>
        ))}
        <InfoBox>
          Esempio Gold: capitano vince 2-0 → 4 pt × 1.3 (Gold) × 1.3 (capitano) = 6.76 pt
        </InfoBox>
      </div>

      {/* Roster e formazione */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:12}}>
        <Section title="👕 Roster e formazione"/>
        {[
          {l:"Budget iniziale Classic",v:"450 crediti"},
          {l:"Budget iniziale Market", v:"400 crediti"},
          {l:"Atleti nel roster",v:"5 esatti"},
          {l:"Titolari",         v:"3 per tappa"},
          {l:"Capitano",         v:"1 tra i titolari"},
          {l:"Coach",            v:"Opzionale"},
          {l:"Deadline formazione",v:"Giovedì ore 23:00"},
        ].map((r,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${B.creamDark}`}}>
            <span style={{fontSize:12,color:B.gray}}>{r.l}</span>
            <span style={{fontSize:12,fontWeight:"bold",color:B.dark}}>{r.v}</span>
          </div>
        ))}
        <InfoBox>
          La formazione va rischierata ad ogni tappa: i titolari della tappa precedente non vengono riportati automaticamente. Se non schieri 3 titolari + capitano entro giovedì 23:00, per quella tappa non ottieni punti.
        </InfoBox>
      </div>

      {/* Capitano — già nella sezione Bonus sopra */}

      {/* Coach */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:12}}>
        <Section title="🧢 Coach"/>
        <div style={{fontSize:12,color:B.dark,lineHeight:1.7,marginBottom:6}}>
          Il coach è <b>opzionale</b>. Puoi sceglierlo dal mercato nella tab Coach.
        </div>
        {[
          {l:"Costo",          v:"5 crediti"},
          {l:"Bonus vittoria", v:"+0.5 pt per partita vinta"},
          {l:"Se in panchina", v:"Nessun bonus"},
        ].map((r,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${B.creamDark}`}}>
            <span style={{fontSize:12,color:B.gray}}>{r.l}</span>
            <span style={{fontSize:12,fontWeight:"bold",color:B.dark}}>{r.v}</span>
          </div>
        ))}
        <InfoBox>
          Il bonus coach (+0.5 pt per vittoria) è già incluso nella sezione Bonus qui sopra.
          Per attivarlo devi schierare il coach nella tab Squadra — il toggle "Panchina" non genera né bonus né malus.
        </InfoBox>
      </div>

      {/* Prezzi atleti */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:12}}>
        <Section title="💰 Prezzi atleti"/>
        <div style={{fontSize:12,color:B.dark,lineHeight:1.7,marginBottom:10}}>
          Il prezzo di ogni atleta è determinato dal ranking FIPAV ufficiale. Più alto il ranking, maggiore il costo.
        </div>
        {[
          {cat:"Top Player", range:"Ranking 1–5",   cost:"160–144 cr", color:"#7A4F00", bg:B.yellowPale},
          {cat:"Elite",      range:"Ranking 6–15",  cost:"140–108 cr", color:"#4C1D95", bg:"#F3E8FF"},
          {cat:"Solid Pick", range:"Ranking 16–30", cost:"105–72 cr",  color:B.greenDark,bg:B.greenPale},
          {cat:"Value Pick", range:"Ranking 31–50", cost:"70–32 cr",   color:B.orange,   bg:B.orangePale},
          {cat:"Outsider",   range:"Ranking 51–60", cost:"31–22 cr",   color:B.gray,     bg:B.creamDark},
          {cat:"Wild Card",  range:"Ranking 61+",   cost:"20 cr fissi",color:B.gray,     bg:B.grayPale},
        ].map((c,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:i<5?`1px solid ${B.creamDark}`:"none"}}>
            <span style={{fontSize:10,fontWeight:"bold",padding:"2px 8px",borderRadius:10,background:c.bg,color:c.color,flexShrink:0,minWidth:72,textAlign:"center"}}>{c.cat}</span>
            <span style={{flex:1,fontSize:11,color:B.gray}}>{c.range}</span>
            <span style={{fontSize:12,fontWeight:"bold",color:B.dark}}>{c.cost}</span>
          </div>
        ))}
      </div>

      {/* Leghe */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:12}}>
        <Section title="🏆 Le 4 leghe"/>
        {[
          {nome:"Classic F",  tipo:"Classic",desc:"Roster bloccato dopo chiusura iscrizioni. Nessun cambio per tutta la stagione."},
          {nome:"Classic M",  tipo:"Classic",desc:"Roster bloccato dopo chiusura iscrizioni. Nessun cambio per tutta la stagione."},
          {nome:"Market F",   tipo:"Market", desc:"Mercato attivo lun 09:00 – gio 23:00. Acquista e vendi liberamente durante la settimana."},
          {nome:"Market M",   tipo:"Market", desc:"Mercato attivo lun 09:00 – gio 23:00. Acquista e vendi liberamente durante la settimana."},
        ].map((l,i)=>(
          <div key={i} style={{padding:"10px 0",borderBottom:i<3?`1px solid ${B.creamDark}`:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <span style={{fontWeight:"bold",fontSize:13,color:B.dark}}>{l.nome}</span>
              <span style={{fontSize:10,padding:"1px 8px",borderRadius:10,background:l.tipo==="Market"?B.orangePale:B.greenPale,color:l.tipo==="Market"?B.orange:B.greenDark,fontWeight:"bold"}}>{l.tipo}</span>
            </div>
            <div style={{fontSize:12,color:B.gray,lineHeight:1.6}}>{l.desc}</div>
          </div>
        ))}
        <InfoBox>
          <b>Combo:</b> chi è iscritto ad almeno 2 leghe partecipa alla classifica Combo (somma punti di tutte le leghe). Super premio se 30+ squadre multi-lega.
        </InfoBox>
      </div>

    </MenuPage>
  );
}

// ─── PAGINA TERMINI ───────────────────────────────────────────
function PageTermini({ onBack }) {
  return (
    <MenuPage title="Termini e Condizioni" emoji="📄" onBack={onBack}>
      <div style={{fontSize:12,color:B.gray,marginBottom:16,lineHeight:1.6}}>
        Regolamento ufficiale FantaBeach 2026 — stagione FIPAV Beach Volley Italia.
      </div>
      {[
        {n:"1",t:"Natura del gioco",d:"FantaBeach è un gioco fantasy non ufficiale basato sui risultati reali del Campionato Italiano Assoluto di Beach Volley FIPAV 2026. Non ha alcun rapporto ufficiale con la FIPAV."},
        {n:"2",t:"Iscrizioni",d:"Le iscrizioni aprono il 18 maggio 2026 e chiudono il 25 maggio 2026 alle 23:59. Il costo è di 10€ per singola lega. Dopo la chiusura non è possibile iscriversi."},
        {n:"3",t:"Crediti fantasy",d:"I crediti fantasy ($450 per le leghe Classic, $400 per le leghe Market) non hanno alcun valore monetario reale. Sono un sistema interno di gioco e non possono essere convertiti in denaro."},
        {n:"4",t:"Premi fisici",d:"I premi fisici (AirPods, canotta, borsone) vengono consegnati solo se la lega raggiunge le soglie minime di iscritti previste dal regolamento. In assenza del numero minimo, il premio non viene assegnato."},
        {n:"5",t:"Correzioni punteggi",d:"L'admin può correggere errori nei punteggi entro 48 ore dalla pubblicazione ufficiale dei risultati FIPAV. Oltre questo termine, i punteggi sono definitivi."},
        {n:"6",t:"Casi particolari",d:"In caso di forfait, ritiro, infortuni o situazioni non previste dal regolamento, l'admin prende una decisione discrezionale ispirandosi allo spirito del gioco. La decisione è definitiva."},
        {n:"7",t:"Fair play",d:"È vietato creare account multipli, condividere credenziali o tentare di manipolare le classifiche. L'admin si riserva il diritto di escludere utenti che non rispettino le regole di fair play."},
        {n:"8",t:"Responsabilità",d:"FantaBeach è un progetto amatoriale creato per la community del beach volley italiano. Nessuna responsabilità per eventuali disservizi tecnici o variazioni del calendario FIPAV."},
      ].map((t,i)=>(
        <div key={i} style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"12px 14px",marginBottom:8}}>
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{fontSize:11,fontWeight:"bold",color:B.orange,background:B.orangePale,borderRadius:20,padding:"2px 8px",flexShrink:0}}>{t.n}</span>
            <div>
              <div style={{fontWeight:"bold",fontSize:13,color:B.dark,marginBottom:4}}>{t.t}</div>
              <div style={{fontSize:12,color:B.gray,lineHeight:1.7}}>{t.d}</div>
            </div>
          </div>
        </div>
      ))}
    </MenuPage>
  );
}
// MOCK_STATS rimosso — statistiche calcolate dinamicamente


// ─── HELPERS STATISTICHE ──────────────────────────────────────
const CAT_FILTERS = ["Tutti","Top Player","Elite","Solid Pick","Value Pick","Outsider","Wild Card"];

function StatPage({ title, emoji, onBack, children }) {
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{background:B.sandDark,padding:"16px",borderBottom:`1px solid ${B.sandDeep}`,flexShrink:0}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",color:B.gray,cursor:"pointer",fontSize:13,fontFamily:"Georgia,serif",marginBottom:8}}>← back</button>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:22}}>{emoji}</span>
          <div style={{fontWeight:"bold",fontSize:17,color:B.dark}}>{title}</div>
        </div>
        <div style={{fontSize:10,color:B.orange,marginTop:3,fontWeight:"bold"}}>🔐 Solo Admin · Dati simulati</div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
        {children}
      </div>
    </div>
  );
}

function CatFilter({ value, onChange }) {
  return (
    <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:8,scrollbarWidth:"none",marginBottom:12}}>
      {CAT_FILTERS.map(c=>{
        const cat = CATEGORIES.find(x=>x.label===c);
        const active = value===c;
        return (
          <button key={c} onClick={()=>onChange(c)}
            style={{flexShrink:0,padding:"4px 10px",borderRadius:20,border:"none",cursor:"pointer",
              fontSize:10,fontFamily:"Georgia,serif",fontWeight:active?"bold":"normal",
              background:active?(cat?cat.bg:B.greenDark):(cat?`${cat.bg}88`:B.grayPale),
              color:active?(cat?cat.text:B.white):(cat?cat.text:B.gray)}}>
            {c}
          </button>
        );
      })}
    </div>
  );
}

function StatCard({ emoji, title, subtitle, desc, items, renderRow }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"12px",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:open?8:10}}>
        <span style={{fontSize:18}}>{emoji}</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:"bold",fontSize:13,color:B.dark}}>{title}</div>
          {subtitle&&<div style={{fontSize:10,color:B.gray}}>{subtitle}</div>}
        </div>
        {desc&&(
          <button onClick={()=>setOpen(o=>!o)}
            style={{width:20,height:20,borderRadius:"50%",border:`1px solid ${B.grayLight}`,
              background:open?B.greenDark:B.white,color:open?B.white:B.gray,
              fontSize:11,fontWeight:"bold",cursor:"pointer",flexShrink:0,
              display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif"}}>
            ?
          </button>
        )}
      </div>
      {open&&desc&&(
        <div style={{background:B.greenPale,border:`1px solid ${B.greenDark}22`,borderRadius:8,
          padding:"8px 10px",marginBottom:10,fontSize:11,color:B.greenDark,lineHeight:1.6}}>
          {desc}
        </div>
      )}
      {items.map((item,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",
          borderBottom:i<items.length-1?`1px solid ${B.creamDark}`:"none"}}>
          <span style={{color:i===0?B.yellow:i===1?B.grayLight:i===2?"#CD7F32":B.gray,
            fontWeight:"bold",fontSize:13,width:18,flexShrink:0}}>{i+1}</span>
          {renderRow(item,i)}
        </div>
      ))}
    </div>
  );
}

function CatBadge({cat}) {
  const c = CATEGORIES.find(x=>x.label===cat);
  if (!c) return null;
  return <span style={{fontSize:9,padding:"1px 6px",borderRadius:6,background:c.bg,color:c.text,fontWeight:"bold",flexShrink:0}}>{cat}</span>;
}

// ─── STATO VUOTO STATISTICHE ──────────────────────────────────
function StatComingSoon({ emoji, title, desc, onBack }) {
  return (
    <StatPage title={title} emoji={emoji} onBack={onBack}>
      <div style={{textAlign:"center",padding:"40px 20px"}}>
        <div style={{fontSize:48,marginBottom:12}}>{emoji}</div>
        <div style={{fontSize:15,fontWeight:"bold",color:B.dark,marginBottom:8}}>{title}</div>
        <div style={{fontSize:12,color:B.gray,lineHeight:1.6,marginBottom:16}}>{desc}</div>
        <div style={{background:B.sandDark,borderRadius:12,padding:"12px 16px",display:"inline-block"}}>
          <div style={{fontSize:11,color:B.gray}}>📊 Dati disponibili dopo la prima tappa disputata</div>
        </div>
      </div>
    </StatPage>
  );
}

// ─── COSTANTI STATISTICHE ─────────────────────────────────────
const STATS_DAY0 = "2026-05-20"; // Giorno 0 stagione — modificabile
const STATS_LEAGUES = [
  { id: "L001-F", label: "Classic F", gender: "F" },
  { id: "L001-M", label: "Classic M", gender: "M" },
  { id: "L002-F", label: "Market F",  gender: "F" },
  { id: "L002-M", label: "Market M",  gender: "M" },
];

// Hook generico per caricare stats con cache
function useStatsData(loader, deps) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  useEffect(() => {
    setLoading(true);
    loader().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, deps || []);
  return { data, loading };
}

// Componente riga top5
function Top5Row({ rank, name, sub, value, unit, color, bg }) {
  const medals = ["🥇","🥈","🥉","4°","5°"];
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",
      borderBottom:`1px solid ${B.creamDark}`}}>
      <div style={{width:28,height:28,borderRadius:8,flexShrink:0,
        background:rank<=3?[B.yellow,B.grayLight,"#CD7F32"][rank-1]:B.grayPale,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:rank<=3?16:11,fontWeight:"bold",color:rank<=3?B.white:B.gray}}>
        {medals[rank-1]}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:"bold",color:B.dark,overflow:"hidden",
          textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</div>
        {sub&&<div style={{fontSize:10,color:B.gray,marginTop:1}}>{sub}</div>}
      </div>
      <div style={{flexShrink:0,background:bg||B.greenPale,color:color||B.greenDark,
        padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:"bold"}}>
        {value}{unit||""}
      </div>
    </div>
  );
}

// Componente sezione con tab Globale + 4 leghe
function StatsSection({ title, emoji, desc, loading, dataByLeague, renderRow, emptyMsg }) {
  const [tab, setTab] = React.useState("global");
  const tabs = [{id:"global",label:"🌍 Globale"}, ...STATS_LEAGUES.map(l=>({id:l.id,label:l.label}))];
  const rows = dataByLeague?.[tab] || [];
  return (
    <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,
      padding:"14px",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <span style={{fontSize:20}}>{emoji}</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:"bold",fontSize:14,color:B.dark}}>{title}</div>
          {desc&&<div style={{fontSize:10,color:B.gray,marginTop:1}}>{desc}</div>}
        </div>
      </div>
      {/* Tab leghe */}
      <div style={{display:"flex",gap:4,overflowX:"auto",scrollbarWidth:"none",
        marginBottom:10,paddingBottom:2}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flexShrink:0,padding:"4px 10px",borderRadius:20,border:"none",
              cursor:"pointer",fontSize:10,fontFamily:"Georgia,serif",
              fontWeight:tab===t.id?"bold":"normal",
              background:tab===t.id?B.greenDark:B.grayPale,
              color:tab===t.id?B.white:B.gray}}>
            {t.label}
          </button>
        ))}
      </div>
      {loading
        ? <div style={{textAlign:"center",padding:"20px",color:B.gray,fontSize:12}}>⏳ Caricamento...</div>
        : rows.length===0
          ? <div style={{textAlign:"center",padding:"16px",color:B.gray,fontSize:12}}>{emptyMsg||"Nessun dato disponibile"}</div>
          : rows.slice(0,5).map((row,i) => renderRow(row, i+1))
      }
    </div>
  );
}

// ─── PAGINA 1: STATS ATLETI ───────────────────────────────────
function StatsAtleti({ onBack, accessToken, athletesData }) {
  // Costruisce nameMap da athletes_data (fonte completa e affidabile)
  const allAthletesList = [...(athletesData?.women||[]), ...(athletesData?.men||[])];
  const globalNameMap = {};
  allAthletesList.forEach(a => { if (a.id && a.name) globalNameMap[a.id] = a.name; });
  const [allData, setAllData] = React.useState(null);
  const [ownerMap, setOwnerMap] = React.useState({});
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    if (!accessToken) return;
    loadAthleteStats(accessToken).then(d => {
      if (d) { setAllData(d.stats); setOwnerMap(d.ownerMap||{}); }
      setLoading(false);
    });
  }, []);

  async function loadAthleteStats(token) {
    try {
      // Carica match_results tappe completate 2026
      const db = await supabase.from("match_results", token);
      const results = await db.select(
        "player_id,player_name,total_pts,bonus_codes,event_id",
        "&order=player_id.asc&limit=5000"
      );

      // Carica roster per ownership (include anche venduti per nameMap)
      const rdb = await supabase.from("rosters", token);
      const rosters = await rdb.select("player_id,player_name,gender,league_id,price", "&sold_at=is.null");

      // Carica player_history per prezzi dal day0
      const pdb = await supabase.from("player_history", token);
      const history = await pdb.select(
        "player_id,player_name,ranking,cost,synced_at",
        `&synced_at=gte.${STATS_DAY0}T00:00:00Z&order=synced_at.asc&limit=5000`
      );

      // Carica tutti i roster (anche venduti) per nameMap completo
      const rdbAll = await supabase.from("rosters", token);
      const rostersAll = await rdbAll.select("player_id,player_name,gender", "");

      // Costruisce nameMap da tutte le fonti disponibili
      const nameMap = {};
      if (Array.isArray(rostersAll)) rostersAll.forEach(r => { if (r.player_name && !nameMap[r.player_id]) nameMap[r.player_id] = r.player_name; });
      if (Array.isArray(history)) history.forEach(r => { if (r.player_name && !nameMap[r.player_id]) nameMap[r.player_id] = r.player_name; });
      if (Array.isArray(results)) results.forEach(r => { if (r.player_name && !nameMap[r.player_id]) nameMap[r.player_id] = r.player_name; });

      // Carica eventi completati 2026 per filtrare per genere
      const edb = await supabase.from("events", token);
      const events = await edb.select("id,gender,weight,name", "&status=eq.Completato&anno=eq.2026");
      const evMap = {};
      if (Array.isArray(events)) events.forEach(e => { evMap[e.id] = e; });

      // Merge nameMap: priorità a globalNameMap (più completo) poi nameMap da DB
      const mergedNameMap = { ...nameMap, ...globalNameMap };
      return buildAthleteStats(results, rosters, history, evMap, mergedNameMap);
    } catch(e) { console.error("Stats atleti:", e); return null; }
  }

  function buildAthleteStats(results, rosters, history, evMap, nameMap={}) {
    if (!Array.isArray(results) || !Array.isArray(rosters)) return null;

    // Punti totali per atleta
    const ptsByPlayer = {};
    const ptsByPlayerByLeague = { "L001-F":{}, "L001-M":{}, "L002-F":{}, "L002-M":{} };

    results.forEach(r => {
      if (!r.player_id) return;
      const ev = evMap[r.event_id];
      if (!ev) return; // solo tappe completate
      const g = ev.gender?.toUpperCase();
      const leagues = g==="F" ? ["L001-F","L002-F"] : ["L001-M","L002-M"];

      if (!ptsByPlayer[r.player_id]) ptsByPlayer[r.player_id] = { id:r.player_id, name:nameMap[r.player_id]||r.player_name||r.player_id, pts:0, matches:0 };
      ptsByPlayer[r.player_id].pts += r.total_pts||0;
      ptsByPlayer[r.player_id].matches += 1;
      ptsByPlayer[r.player_id].gender = g;

      leagues.forEach(lid => {
        if (!ptsByPlayerByLeague[lid][r.player_id])
          ptsByPlayerByLeague[lid][r.player_id] = { id:r.player_id, name:nameMap[r.player_id]||r.player_name||r.player_id, pts:0, matches:0, gender:g };
        ptsByPlayerByLeague[lid][r.player_id].pts += r.total_pts||0;
        ptsByPlayerByLeague[lid][r.player_id].matches += 1;
      });
    });

    // Ownership per atleta
    const ownerByPlayer = {};
    const ownerByPlayerByLeague = { "L001-F":{}, "L001-M":{}, "L002-F":{}, "L002-M":{} };
    if (Array.isArray(rosters)) {
      rosters.forEach(r => {
        if (!ownerByPlayer[r.player_id]) ownerByPlayer[r.player_id] = { id:r.player_id, name:nameMap[r.player_id]||r.player_name||r.player_id, count:0, gender:r.gender, price:r.price };
        ownerByPlayer[r.player_id].count++;
        if (ownerByPlayerByLeague[r.league_id]) {
          if (!ownerByPlayerByLeague[r.league_id][r.player_id])
            ownerByPlayerByLeague[r.league_id][r.player_id] = { id:r.player_id, name:nameMap[r.player_id]||r.player_name||r.player_id, count:0, gender:r.gender, price:r.price };
          ownerByPlayerByLeague[r.league_id][r.player_id].count++;
        }
      });
    }

    // Storico prezzi per atleta: prima e ultima riga dal day0
    const priceFirst = {}, priceLast = {};
    if (Array.isArray(history)) {
      history.forEach(h => {
        if (!priceFirst[h.player_id]) priceFirst[h.player_id] = h;
        priceLast[h.player_id] = h;
      });
    }

    // Helper: top5 per metrica
    const top5 = (obj, scorer, filter) => {
      let arr = Object.values(obj);
      if (filter) arr = arr.filter(filter);
      return arr
        .map(a => ({ ...a, _score: scorer(a) }))
        .filter(a => a._score > 0 || a._score !== undefined)
        .sort((a,b) => b._score - a._score)
        .slice(0,5);
    };

    // Costruisce dataset per ogni sezione
    const build = (leagueId, genderFilter) => {
      const pmap = leagueId ? ptsByPlayerByLeague[leagueId] : ptsByPlayer;
      const omap = leagueId ? ownerByPlayerByLeague[leagueId] : ownerByPlayer;
      const gf = genderFilter ? (a => a.gender===genderFilter) : null;

      // TopScorer
      const topScorer = top5(pmap, a => Math.round(a.pts*10)/10, gf);

      // HiddenGem: punti / costo * 10
      const hiddenGem = top5(pmap, a => {
        const price = ownerByPlayer[a.id]?.price || priceFirst[a.id]?.cost || 20;
        return price > 0 ? Math.round((a.pts / price)*100)/100 : 0;
      }, gf);

      // Ownership
      const ownership = top5(omap, a => a.count, gf);

      // Differential: tanti punti, pochi owner
      const diff = top5(pmap, a => {
        const owners = omap[a.id]?.count || 1;
        return Math.round((a.pts / owners)*10)/10;
      }, a => (gf ? gf(a) : true) && (omap[a.id]?.count||0) <= 2 );

      // Rocket: più migliorato in ranking
      const rocket = Object.entries(priceFirst)
        .map(([id, first]) => {
          const last = priceLast[id];
          if (!last) return null;
          const delta = first.ranking - last.ranking; // positivo = salito
          const g = ownerByPlayer[id]?.gender;
          if (genderFilter && g !== genderFilter) return null;
          return { id, name: nameMap[id] || ownerByPlayer[id]?.name || id, _score: delta, delta, gender:g };
        })
        .filter(Boolean)
        .filter(a => a._score > 0)
        .sort((a,b) => b._score - a._score)
        .slice(0,5);

      // WallStreet: più variazione di prezzo
      const wallStreet = Object.entries(priceFirst)
        .map(([id, first]) => {
          const last = priceLast[id];
          if (!last || first.cost === last.cost) return null;
          const delta = last.cost - first.cost;
          const pct = Math.round(((last.cost - first.cost) / first.cost)*100);
          const g = ownerByPlayer[id]?.gender;
          if (genderFilter && g !== genderFilter) return null;
          return { id, name: nameMap[id] || ownerByPlayer[id]?.name || id, _score: Math.abs(delta), delta, pct, gender:g };
        })
        .filter(Boolean)
        .sort((a,b) => b._score - a._score)
        .slice(0,5);

      return { topScorer, hiddenGem, ownership, diff, rocket, wallStreet };
    };

    return {
      stats: {
        global: build(null, null),
        "L001-F": build("L001-F", "F"),
        "L001-M": build("L001-M", "M"),
        "L002-F": build("L002-F", "F"),
        "L002-M": build("L002-M", "M"),
      },
      ownerMap: ownerByPlayer,
    };
  }

  const sections = [
    { key:"topScorer",  emoji:"🏆", title:"Top Scorer",   desc:"Più punti totali nelle tappe completate",          unit:" pt",  color:B.orange,    bg:B.orangePale },
    { key:"hiddenGem",  emoji:"💎", title:"Hidden Gem",   desc:"Miglior rapporto punti/costo (rendimento)",         unit:"x",   color:"#7C3AED",   bg:"#F3E8FF"    },
    { key:"ownership",  emoji:"👑", title:"Più Acquistato",desc:"Atleta presente nel maggior numero di roster",     unit:" roster",color:B.greenDark,bg:B.greenPale },
    { key:"diff",       emoji:"🎯", title:"Differential", desc:"Tanti punti ma pochi owner (max 2 roster)",        unit:" pt",  color:B.greenDark, bg:B.greenPale  },
    { key:"rocket",     emoji:"🚀", title:"Rocket",       desc:"Più migliorato in ranking dal giorno 0",           unit:" pos", color:B.green,     bg:B.greenPale  },
    { key:"wallStreet", emoji:"📈", title:"Wall Street",  desc:"Maggiore variazione di prezzo dal giorno 0",       unit:"$",   color:"#B8860B",   bg:"#FEF7E8"    },
  ];

  return (
    <StatPage title="Stats Atleti" emoji="🏐" onBack={onBack}>
      {sections.map(sec => {
        const [leagueTab, setLeagueTab] = React.useState("global");
        const tabs = [{id:"global",label:"🌍 Globale"}, ...STATS_LEAGUES.map(l=>({id:l.id,label:l.label}))];
        const rows = allData?.[leagueTab]?.[sec.key] || [];
        return (
          <div key={sec.key} style={{background:B.white,border:`1px solid ${B.creamDark}`,
            borderRadius:12,padding:"14px",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:20}}>{sec.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:"bold",fontSize:14,color:B.dark}}>{sec.title}</div>
                <div style={{fontSize:10,color:B.gray,marginTop:1}}>{sec.desc}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:4,overflowX:"auto",scrollbarWidth:"none",marginBottom:10}}>
              {tabs.map(t=>(
                <button key={t.id} onClick={()=>setLeagueTab(t.id)}
                  style={{flexShrink:0,padding:"4px 10px",borderRadius:20,border:"none",
                    cursor:"pointer",fontSize:10,fontFamily:"Georgia,serif",
                    fontWeight:leagueTab===t.id?"bold":"normal",
                    background:leagueTab===t.id?B.greenDark:B.grayPale,
                    color:leagueTab===t.id?B.white:B.gray}}>
                  {t.label}
                </button>
              ))}
            </div>
            {loading
              ? <div style={{textAlign:"center",padding:"16px",color:B.gray,fontSize:12}}>⏳ Caricamento...</div>
              : !allData
                ? <div style={{textAlign:"center",padding:"16px",color:B.gray,fontSize:12}}>Nessun dato disponibile</div>
                : rows.length===0
                  ? <div style={{textAlign:"center",padding:"16px",color:B.gray,fontSize:12}}>Nessuna variazione rilevata ancora</div>
                  : rows.map((row,i) => (
                      <Top5Row key={row.id||i} rank={i+1}
                        name={row.name||row.id}
                        sub={row.delta!==undefined
                          ? (sec.key==="rocket"?`▲${row.delta} posizioni in ranking`
                            :sec.key==="wallStreet"?`${row.delta>0?"+":""}$${row.delta} (${row.pct>0?"+":""}${row.pct}% dal giorno 0)`
                            :null)
                          : row.matches?`${row.matches} partite`:null}
                        value={sec.key==="hiddenGem"
                          ? (row.pts/(ownerMap?.[row.id]?.price||20)).toFixed(2)
                          : sec.key==="rocket" ? row.delta
                          : sec.key==="wallStreet" ? (row.delta>0?"+":"")+(row.delta||0)
                          : sec.key==="ownership" ? row.count
                          : Math.round((row._score||0)*10)/10}
                        unit={sec.unit} color={sec.color} bg={sec.bg}/>
                    ))
            }
          </div>
        );
      })}
    </StatPage>
  );
}

// ─── PAGINA 2: STATS UTENTI ───────────────────────────────────
function StatsUtenti({ onBack, accessToken }) {
  const [allData, setAllData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    if (!accessToken) return;
    loadUserStats(accessToken).then(d => { setAllData(d); setLoading(false); });
  }, []);

  async function loadUserStats(token) {
    try {
      // Classifica per Guru
      const sdb = await supabase.from("user_league_scores", token);
      const scores = await sdb.select("user_id,league_id,team_name,total_pts,budget");

      // Profili per username
      const pdb = await supabase.from("profiles", token);
      const profiles = await pdb.select("id,username");
      const profMap = {};
      if (Array.isArray(profiles)) profiles.forEach(p => { profMap[p.id] = p.username; });

      // Trasferimenti per Casinò e Trader — solo 2026
      const tdb = await supabase.from("transfer_history", token);
      const transfers = await tdb.select("user_id,league_id,action,price,budget_after,created_at",
        "&created_at=gte.2026-01-01T00:00:00Z&limit=2000");

      return buildUserStats(scores, profMap, transfers);
    } catch(e) { console.error("Stats utenti:", e); return null; }
  }

  function buildUserStats(scores, profMap, transfers) {
    if (!Array.isArray(scores)) return null;

    // Guru: classifica per punti totali per lega
    const buildGuru = (leagueId) => {
      const filtered = leagueId ? scores.filter(s => s.league_id === leagueId) : scores;
      // Globale: somma per utente
      if (!leagueId) {
        const byUser = {};
        filtered.forEach(s => {
          if (!byUser[s.user_id]) byUser[s.user_id] = { id:s.user_id, name:profMap[s.user_id]||s.user_id, pts:0, leagues:0 };
          byUser[s.user_id].pts += s.total_pts||0;
          byUser[s.user_id].leagues++;
        });
        return Object.values(byUser).sort((a,b)=>b.pts-a.pts).slice(0,5)
          .map(u => ({ ...u, _score: Math.round(u.pts*10)/10 }));
      }
      return filtered.sort((a,b)=>(b.total_pts||0)-(a.total_pts||0)).slice(0,5)
        .map(s => ({ id:s.user_id, name:profMap[s.user_id]||s.user_id, team:s.team_name, _score:Math.round((s.total_pts||0)*10)/10 }));
    };

    // Casinò: più operazioni di mercato
    const buildCasino = (leagueId) => {
      const filtered = leagueId ? (Array.isArray(transfers)?transfers.filter(t=>t.league_id===leagueId):[]) : (transfers||[]);
      const byUser = {};
      if (Array.isArray(filtered)) {
        filtered.forEach(t => {
          if (!byUser[t.user_id]) byUser[t.user_id] = { id:t.user_id, name:profMap[t.user_id]||t.user_id, ops:0, buys:0, sells:0 };
          byUser[t.user_id].ops++;
          if (t.action==="buy") byUser[t.user_id].buys++;
          else byUser[t.user_id].sells++;
        });
      }
      return Object.values(byUser).sort((a,b)=>b.ops-a.ops).slice(0,5)
        .map(u => ({ ...u, _score: u.ops }));
    };

    // Trader: guadagno netto da vendite (vendita - acquisto originale)
    const buildTrader = (leagueId) => {
      const filtered = leagueId ? (Array.isArray(transfers)?transfers.filter(t=>t.league_id===leagueId):[]) : (transfers||[]);
      const byUser = {};
      if (Array.isArray(filtered)) {
        filtered.forEach(t => {
          if (!byUser[t.user_id]) byUser[t.user_id] = { id:t.user_id, name:profMap[t.user_id]||t.user_id, spent:0, earned:0 };
          if (t.action==="buy") byUser[t.user_id].spent += t.price||0;
          else byUser[t.user_id].earned += t.price||0;
        });
      }
      return Object.values(byUser)
        .filter(u => u.earned > 0) // almeno una vendita
        .map(u => ({ ...u, _score: u.earned - u.spent, net: u.earned - u.spent }))
        .sort((a,b)=>b._score-a._score)
        .slice(0,5);
    };

    const build = (leagueId) => ({
      guru: buildGuru(leagueId),
      casino: buildCasino(leagueId),
      trader: buildTrader(leagueId),
    });

    return {
      global:   build(null),
      "L001-F": build("L001-F"),
      "L001-M": build("L001-M"),
      "L002-F": build("L002-F"),
      "L002-M": build("L002-M"),
    };
  }

  const sections = [
    { key:"guru",   emoji:"🧠", title:"Guru",   desc:"Più punti in classifica — il miglior fantacalciatore",       unit:" pt",  color:B.orange,  bg:B.orangePale },
    { key:"casino", emoji:"🎰", title:"Casinò", desc:"Più operazioni di mercato effettuate (buy + sell)",          unit:" op",  color:"#7C3AED", bg:"#F3E8FF"    },
    { key:"trader", emoji:"💹", title:"Trader", desc:"Guadagno netto dalle operazioni di mercato (venduto - comprato)", unit:"$", color:B.greenDark, bg:B.greenPale },
  ];

  return (
    <StatPage title="Stats Utenti" emoji="👥" onBack={onBack}>
      {sections.map(sec => {
        const [leagueTab, setLeagueTab] = React.useState("global");
        const tabs = [{id:"global",label:"🌍 Globale"}, ...STATS_LEAGUES.map(l=>({id:l.id,label:l.label}))];
        const rows = allData?.[leagueTab]?.[sec.key] || [];
        return (
          <div key={sec.key} style={{background:B.white,border:`1px solid ${B.creamDark}`,
            borderRadius:12,padding:"14px",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:20}}>{sec.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:"bold",fontSize:14,color:B.dark}}>{sec.title}</div>
                <div style={{fontSize:10,color:B.gray,marginTop:1}}>{sec.desc}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:4,overflowX:"auto",scrollbarWidth:"none",marginBottom:10}}>
              {tabs.map(t=>(
                <button key={t.id} onClick={()=>setLeagueTab(t.id)}
                  style={{flexShrink:0,padding:"4px 10px",borderRadius:20,border:"none",
                    cursor:"pointer",fontSize:10,fontFamily:"Georgia,serif",
                    fontWeight:leagueTab===t.id?"bold":"normal",
                    background:leagueTab===t.id?B.greenDark:B.grayPale,
                    color:leagueTab===t.id?B.white:B.gray}}>
                  {t.label}
                </button>
              ))}
            </div>
            {loading
              ? <div style={{textAlign:"center",padding:"16px",color:B.gray,fontSize:12}}>⏳ Caricamento...</div>
              : !allData
                ? <div style={{textAlign:"center",padding:"16px",color:B.gray,fontSize:12}}>Nessun dato disponibile</div>
                : rows.length===0
                  ? <div style={{textAlign:"center",padding:"16px",color:B.gray,fontSize:12}}>Nessun dato per questa lega</div>
                  : rows.map((row,i) => (
                      <Top5Row key={row.id||i} rank={i+1}
                        name={row.name||row.id}
                        sub={sec.key==="casino"?`${row.buys||0} acquisti · ${row.sells||0} vendite`
                          :sec.key==="trader"?`Guadagnato $${row.earned||0} · Speso $${row.spent||0}`
                          :sec.key==="guru"&&row.leagues?`${row.leagues} leghe`:row.team||null}
                        value={sec.key==="trader"?(row.net>0?"+":"")+row.net : row._score}
                        unit={sec.unit} color={sec.color} bg={sec.bg}/>
                    ))
            }
          </div>
        );
      })}
    </StatPage>
  );
}

// ─── PAGINA 3: AWARDS ─────────────────────────────────────────
function StatsAwards({ onBack, accessToken, athletesData }) {
  const allAthletesList = [...(athletesData?.women||[]), ...(athletesData?.men||[])];
  const globalNameMap = {};
  allAthletesList.forEach(a => { if (a.id && a.name) globalNameMap[a.id] = a.name; });
  const [allData, setAllData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    if (!accessToken) return;
    loadAwards(accessToken).then(d => { setAllData(d); setLoading(false); });
  }, []);

  async function loadAwards(token) {
    try {
      // Match results — filtra per eventi 2026 tramite join lato app
      // Prima carica gli event_id 2026
      const evdb0 = await supabase.from("events", token);
      const evList0 = await evdb0.select("id", "&anno=eq.2026&status=eq.Completato");
      const ev2026ids = Array.isArray(evList0) ? evList0.map(e => `"${e.id}"`).join(",") : "";
      const db = await supabase.from("match_results", token);
      const results = ev2026ids
        ? await db.select("player_id,player_name,total_pts,event_id,bonus_codes", `&event_id=in.(${ev2026ids})&limit=5000`)
        : [];

      // Mappa nomi atleti da player_history (più affidabile di match_results.player_name)
      const phdb = await supabase.from("player_history", token);
      const phRows = await phdb.select("player_id,player_name", "&order=synced_at.desc&limit=2000");
      const nameMap = {};
      if (Array.isArray(phRows)) phRows.forEach(r => { if (r.player_name && !nameMap[r.player_id]) nameMap[r.player_id] = r.player_name; });

      // Roster (attivi + venduti per Traditore)
      const rdb = await supabase.from("rosters", token);
      const rostersAll = await rdb.select("user_id,player_id,player_name,price,league_id,acquired_at,sold_at");

      // Transfer history per Fedelissimi e Traditore
      const tdb = await supabase.from("transfer_history", token);
      const transfers = await tdb.select("user_id,player_id,player_name,action,league_id,created_at", "&limit=2000");

      // Profili
      const pdb = await supabase.from("profiles", token);
      const profiles = await pdb.select("id,username");
      const profMap = {};
      if (Array.isArray(profiles)) profiles.forEach(p => { profMap[p.id] = p.username; });

      // Roster attivi per ownership
      const rdbActive = await supabase.from("rosters", token);
      const rostersActive = await rdbActive.select("player_id,player_name,league_id", "&sold_at=is.null");

      // Carica events per nomi tappe
      const evdb2 = await supabase.from("events", token);
      const evList = await evdb2.select("id,name", "&anno=eq.2026");
      const evMap = {};
      if (Array.isArray(evList)) evList.forEach(e => { evMap[e.id] = e; });
      const mergedNameMap = { ...nameMap, ...globalNameMap };
      return buildAwards(results, rostersAll, rostersActive, transfers, profMap, mergedNameMap, evMap);
    } catch(e) { console.error("Awards:", e); return null; }
  }

  function buildAwards(results, rostersAll, rostersActive, transfers, profMap, nameMap={}, evMap={}) {
    if (!Array.isArray(results)) return null;

    // Punti per atleta per evento
    const ptsByPlayerEvent = {};
    const ptsByPlayer = {};
    results.forEach(r => {
      if (!r.player_id) return;
      const key = `${r.player_id}::${r.event_id}`;
      if (!ptsByPlayerEvent[key]) ptsByPlayerEvent[key] = { player_id:r.player_id, name:nameMap[r.player_id]||r.player_name||r.player_id, event_id:r.event_id, tappaName:evMap[r.event_id]?.name||r.event_id, pts:0 };
      ptsByPlayerEvent[key].pts += r.total_pts||0;
      if (!ptsByPlayer[r.player_id]) ptsByPlayer[r.player_id] = { id:r.player_id, name:nameMap[r.player_id]||r.player_name||r.player_id, pts:0 };
      ptsByPlayer[r.player_id].pts += r.total_pts||0;
    });

    // BANDIT: squadra con più punti in una singola tappa
    // Somma i punti per user/lega/evento dai match_results × lineup
    // Approssimazione: usa la classifica per tappa (già calcolata dalla vista)
    // Per semplicità mostriamo l'atleta con più punti in una singola tappa
    const bandit = Object.values(ptsByPlayerEvent)
      .sort((a,b) => b.pts - a.pts)
      .slice(0,5)
      .map(a => ({ ...a, _score: Math.round(a.pts*10)/10 }));

    // SCAM: atleta più comprato ma meno punti
    const ownerCount = {};
    if (Array.isArray(rostersActive)) {
      rostersActive.forEach(r => {
        if (!ownerCount[r.player_id]) ownerCount[r.player_id] = { id:r.player_id, name:r.player_name||r.player_id, count:0 };
        ownerCount[r.player_id].count++;
      });
    }
    const scam = Object.values(ownerCount)
      .filter(a => (a.count||0) >= 2)
      .map(a => {
        const pts = ptsByPlayer[a.id]?.pts || 0;
        return { ...a, pts, _score: a.count - pts/10 };
      })
      .sort((a,b) => b._score - a._score)
      .slice(0,5);

    // FEDELISSIMI: utenti che non hanno mai venduto
    const selledUsers = new Set();
    if (Array.isArray(transfers)) {
      transfers.filter(t => t.action==="sell").forEach(t => selledUsers.add(t.user_id));
    }
    const allUsers = new Set();
    if (Array.isArray(rostersAll)) rostersAll.forEach(r => allUsers.add(r.user_id));
    const fedelissimi = [...allUsers]
      .filter(uid => !selledUsers.has(uid))
      .map(uid => ({ id:uid, name:profMap[uid]||uid, _score:1 }))
      .slice(0,5);

    // TRADITORE: ha venduto un atleta che poi ha fatto molti punti
    const traditore = [];
    if (Array.isArray(transfers)) {
      const sells = transfers.filter(t => t.action==="sell");
      sells.forEach(t => {
        const pts = ptsByPlayer[t.player_id]?.pts || 0;
        if (pts > 10) {
          traditore.push({
            id: t.user_id,
            name: profMap[t.user_id]||t.user_id,
            player: nameMap[t.player_id] || ptsByPlayer[t.player_id]?.name || t.player_name || t.player_id,
            pts,
            _score: pts,
          });
        }
      });
    }
    traditore.sort((a,b) => b._score - a._score);
    const tradiUnique = [];
    const seen = new Set();
    traditore.forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); tradiUnique.push(t); } });

    return { bandit, scam, traditore: tradiUnique.slice(0,5) };
  }

  const awards = [
    {
      key:"bandit", emoji:"💣", title:"The Bandit",
      desc:"L'atleta con il punteggio più alto in una singola tappa",
      color:B.orange, bg:B.orangePale,
      renderRow:(row,i) => <Top5Row key={row.player_id||i} rank={i}
        name={row.name} sub={`${row.tappaName && row.tappaName !== row.event_id ? row.tappaName : ("Tappa " + (row.event_id||"").replace(/^E0*/,""))}`}
        value={row._score} unit=" pt" color={B.orange} bg={B.orangePale}/>
    },
    {
      key:"scam", emoji:"🙈", title:"The Scam",
      desc:"L'atleta più comprato ma con i punti più bassi — la fregatura del mercato",
      color:"#DC2626", bg:"#FEE2E2",
      renderRow:(row,i) => <Top5Row key={row.id||i} rank={i}
        name={row.name} sub={`${row.count} roster · ${Math.round(row.pts*10)/10} pt totali`}
        value={row.count} unit=" roster" color={"#DC2626"} bg={"#FEE2E2"}/>
    },
    {
      key:"traditore", emoji:"🗡️", title:"Il Traditore",
      desc:"Ha venduto un atleta che poi ha fatto molti punti",
      color:"#7C3AED", bg:"#F3E8FF",
      renderRow:(row,i) => <Top5Row key={row.id||i} rank={i}
        name={row.name} sub={`Ha venduto ${row.player} (${Math.round(row.pts*10)/10} pt dopo)`}
        value={Math.round(row.pts*10)/10} unit=" pt persi" color={"#7C3AED"} bg={"#F3E8FF"}/>
    },
  ];

  return (
    <StatPage title="Awards" emoji="🏅" onBack={onBack}>
      <div style={{background:B.yellowPale,border:`1px solid ${B.yellow}`,borderRadius:10,
        padding:"10px 13px",marginBottom:14,fontSize:12,color:"#7A4F00"}}>
        🏅 Gli Awards sono calcolati automaticamente dai dati reali della stagione.
        Aggiornati dopo ogni Sync Risultati.
      </div>
      {awards.map(award => (
        <div key={award.key} style={{background:B.white,border:`1px solid ${B.creamDark}`,
          borderRadius:12,padding:"14px",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <span style={{fontSize:22}}>{award.emoji}</span>
            <div>
              <div style={{fontWeight:"bold",fontSize:14,color:B.dark}}>{award.title}</div>
              <div style={{fontSize:10,color:B.gray,marginTop:1}}>{award.desc}</div>
            </div>
          </div>
          {loading
            ? <div style={{textAlign:"center",padding:"12px",color:B.gray,fontSize:12}}>⏳ Caricamento...</div>
            : !allData
              ? <div style={{textAlign:"center",padding:"12px",color:B.gray,fontSize:12}}>Nessun dato disponibile</div>
              : (allData[award.key]||[]).length===0
                ? <div style={{textAlign:"center",padding:"12px",color:B.gray,fontSize:12}}>Nessun dato ancora</div>
                : (allData[award.key]||[]).map((row,i) => award.renderRow(row, i+1))
          }
        </div>
      ))}
    </StatPage>
  );
}


function AthleteProfile({a,onBack,isOwned,onBuy,onSell,budget,canTrade,accessToken}) {
  const cat  = getCategory(a.ranking);
  const diff = a.cost - (a.prevCost || a.cost);
  const rankDelta = a.rankDelta || null;
  const photo = ATHLETE_PHOTOS[a.id];
  const [fullHistory, setFullHistory] = React.useState(null);

  // Carica storico prezzi: 1 punto per giorno, max 30 giorni
  useEffect(() => {
    if (!accessToken || !a.id) return;
    const load = async () => {
      try {
        const db = await supabase.from("player_history", accessToken);
        // Prende tutte le righe ordinate per data — poi deduplicha per giorno lato JS
        const rows = await db.select("cost,ranking,synced_at",
          `&player_id=eq.${a.id}&order=synced_at.asc&limit=500`);
        if (Array.isArray(rows) && rows.length > 0) {
          // Deduplica: tieni solo L'ULTIMA riga per ogni giorno
          const byDay = {};
          rows.forEach(r => {
            const day = (r.synced_at || "").slice(0, 10); // "2026-05-13"
            byDay[day] = r; // sovrascrive → tieni l'ultima del giorno
          });
          // Ordina per giorno e prendi max 30
          const deduplicated = Object.values(byDay)
            .sort((a, b) => a.synced_at.localeCompare(b.synced_at))
            .slice(-30);
          // Forza l'ultimo punto al valore corrente dell'atleta
          if (deduplicated.length > 0) {
            deduplicated[deduplicated.length - 1] = {
              ...deduplicated[deduplicated.length - 1],
              cost: a.cost, // valore corrente
              ranking: a.ranking,
            };
          }
          setFullHistory(deduplicated);
        }
      } catch(e) { /* silenzioso */ }
    };
    load();
  }, [a.id]);

  // Grafico storico prezzi
  const historyData = fullHistory
    ? fullHistory.map((r, i, arr) => ({
        cost: r.cost,
        label: new Date(r.synced_at).toLocaleDateString("it-IT", {day:"2-digit",month:"2-digit"}),
        isCurrent: i === arr.length - 1,
      }))
    : (a.costHistory || [a.cost]).map((c, i, arr) => ({
        cost: c,
        label: i === arr.length-1 ? "Ora" : `Sync ${i+1}`,
        isCurrent: i === arr.length - 1,
      }));

  const costs = historyData.map(h => h.cost);
  const minV = Math.min(...costs) * 0.88;
  const maxV = Math.max(...costs) * 1.08;
  const range = maxV - minV || 1;

  return (
    <div>
      <button onClick={onBack} style={{background:B.grayPale,border:"none",color:B.gray,padding:"7px 14px",borderRadius:20,cursor:"pointer",marginBottom:14,fontSize:12,fontFamily:"Georgia,serif"}}>← Indietro</button>

      {/* HEADER ATLETA */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:14,padding:"18px 16px",marginBottom:12,textAlign:"center"}}>
        <div style={{width:80,height:80,borderRadius:"50%",margin:"0 auto 10px",overflow:"hidden",background:photo?"#000":cat.bg,border:`2px solid ${cat.text}44`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {photo?<img src={photo} alt={a.name} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}}/>:<LogoIcon size={54}/>}
        </div>
        <div style={{color:B.dark,fontWeight:"bold",fontSize:19}}>{a.name}</div>
        <div style={{display:"flex",justifyContent:"center",gap:8,margin:"8px 0 12px"}}>
          <span style={{fontSize:11,padding:"2px 10px",borderRadius:8,background:cat.bg,color:cat.text,fontWeight:"bold"}}>{cat.label}</span>
          <span style={{fontSize:11,padding:"2px 10px",borderRadius:8,background:B.grayPale,color:B.gray}}>{a.gender==="F"?"♀ Femminile":"♂ Maschile"}</span>
        </div>

        {/* STATS: ranking, costo, delta */}
        <div style={{display:"flex",justifyContent:"center",borderTop:`1px solid ${B.creamDark}`,paddingTop:12}}>
          {[
            {
              label:"Ranking",
              value:`#${a.ranking}`,
              color:B.orange,
              sub: rankDelta !== null && rankDelta !== 0
                ? <span style={{fontSize:11,color:rankDelta>0?B.greenDark:B.orange,fontWeight:"bold"}}>{rankDelta>0?`▲${rankDelta}`:`▼${Math.abs(rankDelta)}`} pos</span>
                : <span style={{fontSize:11,color:B.grayLight}}>—</span>
            },
            {
              label:"Costo",
              value:`$${a.cost}`,
              color:B.greenDark,
              sub: diff !== 0
                ? <span style={{fontSize:11,color:diff>0?B.greenDark:B.orange,fontWeight:"bold"}}>{diff>0?`▲$${diff}`:`▼$${Math.abs(diff)}`}</span>
                : <span style={{fontSize:11,color:B.grayLight}}>stabile</span>
            },
            {
              label:"Variazione",
              value: diff===0 ? "—" : diff>0 ? `+$${diff}` : `-$${Math.abs(diff)}`,
              color: diff>0?B.greenDark:diff<0?B.orange:B.gray,
              sub: <span style={{fontSize:11,color:B.grayLight}}>{diff===0?"nessuna":"vs. tappa prec."}</span>
            },
          ].map((s,i)=>(
            <div key={i} style={{flex:1,padding:"8px 4px",borderRight:i<2?`1px solid ${B.creamDark}`:"none"}}>
              <div style={{color:s.color,fontWeight:"bold",fontSize:18}}>{s.value}</div>
              <div style={{color:B.gray,fontSize:10,marginBottom:2}}>{s.label}</div>
              {s.sub}
            </div>
          ))}
        </div>

        {/* BOTTONE ACQUISTA/VENDI */}
        <div style={{marginTop:14}}>
          {isOwned
            ? <button onClick={onSell} style={{padding:"10px 24px",borderRadius:10,border:`1px solid ${canTrade?B.orange:B.grayLight}`,background:canTrade?B.orangePale:B.grayPale,color:canTrade?B.orange:B.gray,fontWeight:"bold",fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>
                {canTrade?`Vendi ($${a.cost})`:"Vendita bloccata"}
              </button>
            : <button onClick={onBuy} style={{padding:"10px 24px",borderRadius:10,border:"none",background:budget>=a.cost&&canTrade?B.greenDark:B.grayPale,color:budget>=a.cost&&canTrade?B.white:B.gray,fontWeight:"bold",fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>
                {!canTrade?"Mercato chiuso":budget>=a.cost?`Acquista ($${a.cost})`:"Crediti insufficienti"}
              </button>
          }
        </div>
      </div>

      {/* GRAFICO STORICO PREZZI */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px 13px",marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:12}}>
          Andamento Prezzo {fullHistory===null&&<span style={{fontSize:9,color:B.gray,fontWeight:"normal"}}>⏳</span>}
        </div>
        {(() => {
          // Dimensioni responsive — usa viewBox largo, si scala al 100% del contenitore
          const W = 360, H = 120, PAD = 28;
          const innerW = W - PAD * 2;
          const n = historyData.length;
          const px = (i) => PAD + (i / Math.max(n - 1, 1)) * innerW;
          const py = (v) => H - 26 - ((v - minV) / range) * (H - 50);
          const pts = historyData.map((h,i) => `${px(i)},${py(h.cost)}`).join(" ");
          const area = `${PAD},${H-26} ${pts} ${px(n-1)},${H-26}`;

          // Mostra label solo primo, ultimo e punti con cambio valore
          const showLabel = (i) => {
            if (i === 0 || i === n-1) return true;
            return historyData[i].cost !== historyData[i-1].cost;
          };

          return (
            <>
              <svg width="100%" viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="xMidYMid meet"
                style={{display:"block",overflow:"visible"}}>
                <polygon points={area} fill={B.greenDark} fillOpacity="0.07"/>
                <polyline points={pts} fill="none" stroke={B.greenDark} strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
                {historyData.map((h,i)=>{
                  const isLast = i === n-1;
                  const changed = i > 0 && h.cost !== historyData[i-1].cost;
                  // Mostra cerchio su tutti i punti ma più piccolo sui punti invariati
                  const r = (isLast || changed) ? 5 : 2.5;
                  const fillColor = isLast ? B.orange : B.greenDark;
                  return (
                    <g key={i}>
                      <circle cx={px(i)} cy={py(h.cost)} r={r} fill={fillColor}/>
                      {/* Mostra etichetta $ solo su primo, ultimo e cambio */}
                      {(i===0 || isLast || changed) && (
                        <text x={px(i)} y={py(h.cost)-9}
                          textAnchor={i===0?"start":isLast?"end":"middle"}
                          fontSize="9" fill={isLast?B.orange:B.dark}
                          fontFamily="Georgia,serif" fontWeight="bold">
                          ${h.cost}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
              {/* Label date — solo primo e ultimo */}
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4,paddingLeft:PAD-4,paddingRight:PAD-4}}>
                <div style={{fontSize:10,color:B.gray}}>{historyData[0]?.label}</div>
                <div style={{fontSize:10,color:B.orange,fontWeight:"bold"}}>{historyData[n-1]?.label} (ora)</div>
              </div>
            </>
          );
        })()}
      </div>

      {/* ULTIMI RISULTATI — stato vuoto sicuro, nessun mock */}
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px 13px"}}>
        <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:10}}>Ultimi Risultati</div>
        <div style={{textAlign:"center",padding:"20px",color:B.gray,fontSize:12}}>
          <div style={{fontSize:24,marginBottom:6}}>🏐</div>
          Nessun risultato disponibile per questa atleta
        </div>
      </div>
    </div>
  );
}

// ─── BONUS/MALUS DEFINITIONS ────────────────────────────────
const BONUS_META = {
  win20:    { icon:"🏆", label:"Vittoria 2-0",        color:B.greenDark, bg:B.greenPale,    pts:+4    },
  win21:    { icon:"🏅", label:"Vittoria 2-1",        color:B.greenDark, bg:B.greenPale,    pts:+3    },
  loss12:   { icon:"💪", label:"Sconfitta 1-2",       color:B.orange,    bg:B.orangePale,   pts:+1    },
  loss02:   { icon:"😔", label:"Sconfitta 0-2",       color:B.gray,      bg:B.grayPale,     pts:0     },
  bye:      { icon:"⏭️", label:"BYE (tavolino)",      color:B.greenDark, bg:B.greenPale,    pts:+4    },
  closeSet: { icon:"🎯", label:"Set perso di misura", color:"#7C3AED",   bg:"#F3E8FF",      pts:+0.5  },
  captain:  { icon:"★",  label:"Capitano",            color:B.yellow,    bg:B.yellowPale,   mult:1.3  },
  coachWin: { icon:"🧢", label:"Coach presente+vittoria", color:B.greenDark, bg:B.greenPale, pts:+0.5 },
  coachAbs: { icon:"🚫", label:"Coach assente tappa", color:"#DC2626",   bg:"#FEE2E2",      pts:-2    },
  coachNoBench: { icon:"⚠️", label:"Coach non in panchina", color:B.orange, bg:B.orangePale, pts:-1  },
  forfait:  { icon:"🤕", label:"Forfait partita",     color:B.orange,    bg:B.orangePale,   pts:-1    },
  absEvent: { icon:"❌", label:"Assente alla tappa",  color:"#DC2626",   bg:"#FEE2E2",      pts:-3    },
};

// Mock matches arricchiti con bonus/malus

const PHASE_ORDER = [
  // Nomi usati nel DB (dalla sync-results)
  "QUALI 1","QUALI 2","POOL 1","POOL 2","POOL 3","BYE POOL",
  "ROUND OF 16","ROUND OF 12","ROUND OF 8",
  "QUARTI","SEMIFINALE","FINALE 3","FINALE 1",
  // Nomi alternativi (vecchio formato 2025)
  "Qualifiche 1","Qualifiche 2","Pool 1","Pool 2","Pool 3","BYE Pool",
  "Round of 12","Round of 8","Quarti","Semifinale",
  "Finale 3° posto","Finale 1° posto",
];

function EventDetail({event, onBack, myRoster, matchResults, onLoad, athletes}) {
  useEffect(() => {
    if (onLoad) onLoad();
  }, [event.id]);

  if (matchResults === undefined) return (
    <div>
      <button onClick={onBack} style={{background:B.grayPale,border:"none",color:B.gray,padding:"7px 14px",borderRadius:20,cursor:"pointer",marginBottom:14,fontSize:12,fontFamily:"Georgia,serif"}}>← Calendario</button>
      <div style={{textAlign:"center",padding:"60px 20px",color:B.gray}}>
        <div style={{fontSize:32,marginBottom:10}}>⏳</div>
        <div>Caricamento risultati...</div>
      </div>
    </div>
  );

  const et = EVENT_TYPE_META[event.type] || EVENT_TYPE_META.Silver;
  const myPlayerIds = new Set((myRoster || []).map(a => a.id));
  const allAthletes = [...(athletes?.women||[]), ...(athletes?.men||[])];

  // Cognome da player_id — usa surname (colonna Cognome dal PLAYER_MAPPING via sync)
  const getPlayerName = (playerId) => {
    const find = (list) => list?.find(x => x.id === playerId);
    const a = find(myRoster) || find(allAthletes);
    if (!a) return playerId;
    // Usa stessa logica di extractSurname: tutto tranne l'ultimo token
    // Federation Name = "COGNOME NOME" → "DI PRIMA VALENTINA" → "DI PRIMA"
    const tokens = a.name.trim().split(" ");
    if (tokens.length === 1) return tokens[0].toUpperCase();
    return tokens.slice(0, -1).join(" ").toUpperCase();
  };

  // Per teamB: opponent è "COGNOME1 NOME1 - COGNOME2 NOME2" (Federation Name format)
  // Prende tutto tranne l'ultimo token = cognome (funziona anche per DI PRIMA)
  const extractSurname = (fullName) => {
    if (!fullName) return "";
    const tokens = fullName.trim().split(" ");
    if (tokens.length === 1) return tokens[0].toUpperCase();
    // Formato COGNOME NOME → tutto tranne ultimo = cognome
    return tokens.slice(0, -1).join(" ").toUpperCase();
  };

  // Ricostruisce partite uniche raggruppando per match_index
  // Ogni partita ha 4 righe: 2 per coppia A e 2 per coppia B con opponent invertito
  const buildMatches = (rows) => {
    const byIndex = {};
    rows.forEach(r => {
      if (!byIndex[r.match_index]) byIndex[r.match_index] = [];
      byIndex[r.match_index].push(r);
    });

    return Object.values(byIndex).map(matchRows => {
      const first = matchRows[0];

      // BYE
      if (first.is_bye) {
        const teamANames = matchRows.slice(0,2)
          .map(r => getPlayerName(r.player_id)).filter(Boolean).join(" - ");
        return {
          phase: first.phase, result: "2-0", score: "21-0 21-0",
          isBye: true, teamA: teamANames || "—", teamB: "",
          winA: true, winB: false,
          myInMatch: matchRows.filter(r => myPlayerIds.has(r.player_id)),
          _rows: matchRows,
        };
      }

      // Partita normale: raggruppa per opponent
      const groups = {};
      matchRows.forEach(r => {
        const key = r.opponent || "";
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
      });

      const groupEntries = Object.entries(groups);

      if (groupEntries.length < 2) {
        const g = groupEntries[0]?.[1] || matchRows;
        const names = g.slice(0,2).map(r => getPlayerName(r.player_id)).filter(Boolean).join(" - ");
        const oppRaw = g[0]?.opponent || "";
        const oppNames = oppRaw ? oppRaw.split(" - ").map(n => extractSurname(n.trim())).join(" - ") : "—";
        return {
          phase: first.phase, result: g[0]?.result || "—",
          score: g[0]?.score || "", isBye: false,
          teamA: names, teamB: oppNames,
          winA: g[0]?.result?.startsWith("2") || false,
          winB: !(g[0]?.result?.startsWith("2") || false),
          myInMatch: matchRows.filter(r => myPlayerIds.has(r.player_id)),
          _rows: matchRows,
        };
      }

      // Coppia A = gruppo con player_id numericamente più basso
      // (la sync salva prima coppia A poi coppia B, W0013 < W0036 → ZANON è coppia A)
      const [key1, rows1] = groupEntries[0];
      const [key2, rows2] = groupEntries[1];
      const minId1 = Math.min(...rows1.map(r => parseInt(r.player_id.slice(1))));
      const minId2 = Math.min(...rows2.map(r => parseInt(r.player_id.slice(1))));
      const [rowsA, rowsB] = minId1 < minId2 ? [rows1, rows2] : [rows2, rows1];

      // Nome coppia A dai player_id (cognomi reali)
      const teamANames = rowsA.slice(0,2)
        .map(r => getPlayerName(r.player_id)).filter(Boolean).join(" - ");

      // Nome coppia B dall'opponent di coppia A
      const teamBRaw = rowsA[0]?.opponent || "";
      const teamBNames = teamBRaw
        ? teamBRaw.split(" - ").map(n => extractSurname(n.trim())).join(" - ")
        : "";

      // Risultato dalla prospettiva di coppia A (non riordinare mai)
      const resultA = rowsA[0]?.result || "—";
      const winA = resultA.startsWith("2");
      const winB = !winA;
      const myInMatch = matchRows.filter(r => myPlayerIds.has(r.player_id));

      return {
        phase: first.phase,
        result: rowsA[0]?.result || "—",
        score: rowsA[0]?.score || "",
        isBye: false,
        teamA: teamANames || "—",
        teamB: teamBNames || "—",
        winA, winB,
        myInMatch,
        _rows: matchRows,
      };
    }).sort((a,b) => a._rows[0].match_index - b._rows[0].match_index);
  };

  const builtMatches = (() => {
    try { return buildMatches(matchResults || []); }
    catch(e) { console.warn("buildMatches error:", e); return []; }
  })();

  const phasesPresent = [...new Set(builtMatches.map(m => m.phase))];
  const phases = [
    ...PHASE_ORDER.filter(p => phasesPresent.includes(p)),
    ...phasesPresent.filter(p => !PHASE_ORDER.includes(p)),
  ];

  return (
    <div>
      <button onClick={onBack} style={{background:B.grayPale,border:"none",color:B.gray,padding:"7px 14px",borderRadius:20,cursor:"pointer",marginBottom:14,fontSize:12,fontFamily:"Georgia,serif"}}>← Calendario</button>
      <div style={{background:B.greenDark,borderRadius:12,padding:"14px 16px",marginBottom:14,color:B.white}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontWeight:"bold",fontSize:17}}>{event.name}</div>
            <div style={{color:"rgba(255,255,255,.7)",fontSize:11,marginTop:2}}>{event.date_start||event.date}{event.location?` · ${event.location}`:""}</div>
          </div>
          <div style={{background:et.bg,color:et.color,padding:"3px 10px",borderRadius:8,fontSize:11,fontWeight:"bold"}}>{et.label} ×{et.weight}</div>
        </div>
      </div>

      {builtMatches.length === 0 ? (
        <div style={{textAlign:"center",padding:"40px 20px",color:B.gray}}>
          <div style={{fontSize:40,marginBottom:10}}>{event.status==="In corso"?"🔴":"📋"}</div>
          <div style={{fontSize:13,fontWeight:"bold",color:B.dark,marginBottom:6}}>
            {event.status==="In corso" ? "Tappa in corso — risultati non ancora inseriti" : "Nessun risultato disponibile"}
          </div>
          <div style={{fontSize:11,color:B.gray,lineHeight:1.5}}>
            {event.status==="In corso"
              ? "I risultati verranno caricati dall\u2019admin al termine di ogni giornata di gara."
              : "I risultati di questa tappa non sono ancora stati inseriti nel sistema."}
          </div>
        </div>
      ) : phases.map(phase => {
        const phaseMatches = builtMatches.filter(m => m.phase === phase);
        const isGrid = ["QUALI","QUALIF","POOL","ROUND","GROUP"].some(k => phase.toUpperCase().includes(k));
        return (
          <div key={phase} style={{marginBottom:18}}>
            <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1,height:1,background:B.creamDark}}/>{phase} ({phaseMatches.length})<div style={{flex:1,height:1,background:B.creamDark}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isGrid?"repeat(auto-fill,minmax(min(100%,300px),1fr))":"1fr",gap:6}}>
              {phaseMatches.map((m, i) => {
                const hasMyPlayer = m.myInMatch.length > 0;
                return (
                  <div key={i} style={{
                    background: hasMyPlayer ? B.greenPale : B.white,
                    border:`1px solid ${hasMyPlayer?B.greenDark:B.creamDark}`,
                    borderLeft:`3px solid ${hasMyPlayer?B.greenDark:B.creamDark}`,
                    borderRadius:8, padding:"10px",
                    textAlign:"center",
                  }}>
                    {/* Coppia A */}
                    <div style={{
                      fontSize:11,
                      fontWeight: m.winA||m.isBye ? "bold" : "normal",
                      color: m.winA||m.isBye ? B.dark : "#555",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                      marginBottom:4,
                    }}>
                      {m.teamA || "—"}
                    </div>

                    {/* Risultato + score */}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,margin:"4px 0"}}>
                      <span style={{
                        fontSize:11,fontWeight:"bold",
                        background: m.winA||m.isBye ? B.greenDark : B.orange,
                        color:B.white,
                        padding:"2px 8px",borderRadius:4,flexShrink:0,
                      }}>
                        {m.isBye?"2-0":m.result}
                      </span>
                      <span style={{fontSize:10,color:B.gray}}>
                        {m.isBye?"21-0 21-0":m.score}
                      </span>
                    </div>

                    {/* Coppia B o BYE */}
                    <div style={{
                      fontSize:11,
                      fontWeight: m.winB ? "bold" : "normal",
                      color: m.isBye ? B.grayLight : m.winB ? B.dark : "#555",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                      marginTop:4, fontStyle:m.isBye?"italic":"normal",
                    }}>
                      {m.isBye ? "BYE" : (m.teamB || "—")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
// ─── PAGINA STORICO TAPPE ─────────────────────────────────────
function PageHistory({ authUser, accessToken, leagueId, leagues, events, coachesList, athletesData, onBack }) {
  const [selectedLeague, setSelectedLeague] = React.useState(leagueId || "L001-F");
  const [selectedEventId, setSelectedEventId] = React.useState(null);
  const [historyData, setHistoryData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const league = leagues.find(l => l.id === selectedLeague);
  const completedEvents = events.filter(e =>
    e.status === "Completato" &&
    (e.anno || 2026) === 2026 &&
    (e.gender || "").toUpperCase() === (league?.gender || "F")
  );

  const loadHistory = async (eventId) => {
    if (!accessToken || !authUser?.id) return;
    setLoading(true);
    setHistoryData(null);
    try {
      const [matchRes, lineupRes, coachSelRes] = await Promise.all([
        supabase.from("match_results", accessToken).then(db =>
          db.select("*", `&event_id=eq.${eventId}&order=match_index.asc`)),
        supabase.from("lineup_history", accessToken).then(db =>
          db.select("*", `&user_id=eq.${authUser.id}&league_id=eq.${selectedLeague}&event_id=eq.${eventId}`)),
        supabase.from("coach_selections", accessToken).then(db =>
          db.select("*", `&user_id=eq.${authUser.id}&league_id=eq.${selectedLeague}`)),
      ]);

      const matches = Array.isArray(matchRes) ? matchRes : [];
      const lineup = Array.isArray(lineupRes) ? lineupRes : [];
      const coachSel = Array.isArray(coachSelRes) ? coachSelRes[0] : null;

      // Costruisce mappa player_id → role dalla lineup
      const roleMap = {};
      lineup.forEach(l => { roleMap[l.player_id] = l.role; });

      // Trova evento per moltiplicatore
      const event = events.find(e => e.id === eventId);
      const et = EVENT_TYPE_META[event?.type] || EVENT_TYPE_META.Silver;

      // Raggruppa match per player_id
      const byPlayer = {};
      matches.forEach(m => {
        if (!m.player_id) return;
        if (!byPlayer[m.player_id]) byPlayer[m.player_id] = { player_id: m.player_id, player_name: m.player_name, matches: [] };
        byPlayer[m.player_id].matches.push(m);
      });

      // Mappa atleti per genere lega → nome leggibile
      const athleteList = (league?.gender || "F").toUpperCase() === "F"
        ? (athletesData?.women || [])
        : (athletesData?.men || []);
      const athleteMap = Object.fromEntries(athleteList.map(a => [a.id, a]));

      // Calcola punti per ogni giocatore in lineup
      const players = lineup.map(l => {
        const playerData = byPlayer[l.player_id] || { player_id: l.player_id, player_name: l.player_id, matches: [] };
        const role = l.role;
        const isStarter = role === "titolare" || role === "capitano";
        const isCaptain = role === "capitano";

        let rawPts = 0;
        playerData.matches.forEach(m => {
          const codes = m.bonus_codes || [];
          const coachWinPts = codes.includes("coachWin") ? 0.5 : 0;
          rawPts += (m.base_pts || 0) + (m.bonus_pts || 0) - coachWinPts;
        });

        const withMult = rawPts * (et.weight || 1);
        const finalPts = withMult * (isCaptain ? 1.3 : 1);

        const playerName =
          playerData.player_name ||
          athleteMap[l.player_id]?.name ||
          l.player_id;

        return { ...playerData, player_name: playerName, role, isStarter, isCaptain, rawPts, finalPts: Math.round(finalPts * 100) / 100 };
      });

      // Coach — letto dalle colonne CONGELATE in lineup_history (non da coach_selections)
      let coachPts = 0;
      const frozenCoachRow = lineup.find(l => l.coach_id);
      const frozenCoachId = frozenCoachRow?.coach_id || null;
      const coachInField = frozenCoachRow?.coach_in_field || false;
      const coach = frozenCoachId ? coachesList.find(c => c.id === frozenCoachId) : null;
      if (coach && coachInField) {
        // +0.5 per ogni match in cui ALMENO una coppia del coach ha vinto (gestisce i derby)
        const wonByMatch = {};
        matches.filter(m => m.coach_id === frozenCoachId).forEach(m => {
          const won = (m.result || "").startsWith("2") || m.is_bye;
          if (won) wonByMatch[m.match_index] = true;
          else if (!(m.match_index in wonByMatch)) wonByMatch[m.match_index] = false;
        });
        coachPts = Object.values(wonByMatch).filter(Boolean).length * 0.5;
      }

      const starters = players.filter(p => p.isStarter);
      const bench = players.filter(p => !p.isStarter);
      const totalPts = starters.reduce((s, p) => s + p.finalPts, 0) + coachPts;

      setHistoryData({ players, starters, bench, coach, coachPts, coachInField, totalPts: Math.round(totalPts * 100) / 100, et, event });
    } catch(e) { console.error("Errore storico:", e); }
    setLoading(false);
  };

  React.useEffect(() => {
    setSelectedEventId(null);
    setHistoryData(null);
  }, [selectedLeague]);
const MatchRows = ({ matches }) => {
    if (!matches || matches.length === 0) return null;
    return (
      <div style={{marginTop:8,borderTop:`1px solid ${B.creamDark}`,paddingTop:6}}>
        {matches.map((m,i) => {
          const tot = (m.total_pts != null) ? m.total_pts : (m.base_pts||0) + (m.bonus_pts||0);
          const win = (m.result||"").startsWith("2");
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",borderBottom:i<matches.length-1?`1px solid ${B.creamDark}`:"none"}}>
              <div style={{fontSize:9,color:B.gray,minWidth:62,flexShrink:0}}>{m.phase||"—"}</div>
              <span style={{fontSize:10,fontWeight:"bold",flexShrink:0,padding:"1px 6px",borderRadius:4,
                background:m.is_bye?B.greenPale:win?"#D1FAE5":"#FEE2E2",
                color:m.is_bye?B.greenDark:win?"#065F46":"#DC2626"}}>
                {m.is_bye?"BYE":(m.result||"—")}
              </span>
              <div style={{flex:1,minWidth:0,fontSize:10,color:B.gray,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {m.is_bye?"—":(m.opponent||"—")}{m.score?` · ${m.score}`:""}
              </div>
              <div style={{fontSize:10,color:B.gray,flexShrink:0,minWidth:46,textAlign:"right"}}>
                {m.base_pts>0?`+${m.base_pts}`:(m.base_pts||0)}{m.bonus_pts?` ${m.bonus_pts>0?"+":""}${m.bonus_pts}`:""}
              </div>
              <div style={{fontSize:11,fontWeight:"bold",flexShrink:0,minWidth:28,textAlign:"right",
                color:tot>0?B.greenDark:tot<0?B.orange:B.gray}}>
                {tot>0?`+${tot}`:tot}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  return (
    <MenuPage title="Storico Tappe" emoji="📊" onBack={onBack}>

      {/* Selettore lega */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {leagues.map(l => (
          <button key={l.id} onClick={()=>setSelectedLeague(l.id)}
            style={{padding:"6px 12px",borderRadius:20,border:`1px solid ${selectedLeague===l.id?B.orange:B.creamDark}`,
              background:selectedLeague===l.id?B.orange:B.white,
              color:selectedLeague===l.id?B.white:B.dark,
              fontWeight:selectedLeague===l.id?"bold":"normal",
              fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif"}}>
            {l.name}
          </button>
        ))}
      </div>

      {/* Lista tappe completate */}
      {completedEvents.length === 0 ? (
        <div style={{textAlign:"center",padding:"40px 20px",color:B.gray}}>
          <div style={{fontSize:36,marginBottom:10}}>📅</div>
          <div style={{fontSize:13,color:B.dark,fontWeight:"bold"}}>Nessuna tappa completata ancora</div>
          <div style={{fontSize:11,color:B.gray,marginTop:4}}>I dati appariranno dopo la prima tappa disputata.</div>
        </div>
      ) : (
        <div>
          <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:16}}>
            {completedEvents.map(e => {
              const et = EVENT_TYPE_META[e.type] || EVENT_TYPE_META.Silver;
              const isSelected = selectedEventId === e.id;
              return (
                <button key={e.id}
                  onClick={()=>{ setSelectedEventId(e.id); loadHistory(e.id); }}
                  style={{background:isSelected?B.greenDark:B.white,
                    border:`1px solid ${isSelected?B.greenDark:B.creamDark}`,
                    borderLeft:`4px solid ${isSelected?B.white:et.color}`,
                    borderRadius:10,padding:"11px 14px",cursor:"pointer",fontFamily:"Georgia,serif",
                    display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:"bold",fontSize:13,color:isSelected?B.white:B.dark}}>{e.name}</div>
                    <div style={{fontSize:10,color:isSelected?"rgba(255,255,255,.7)":B.gray,marginTop:2}}>{e.date_start||e.date}</div>
                  </div>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:8,fontWeight:"bold",
                    background:isSelected?"rgba(255,255,255,.2)":et.bg,
                    color:isSelected?B.white:et.color}}>
                    ×{et.weight}
                  </span>
                  <span style={{color:isSelected?"rgba(255,255,255,.7)":B.grayLight,fontSize:12}}>›</span>
                </button>
              );
            })}
          </div>

          {/* Dettaglio tappa selezionata */}
          {loading && (
            <div style={{textAlign:"center",padding:"30px",color:B.gray,fontSize:12}}>⏳ Caricamento...</div>
          )}

          {historyData && !loading && (
            <div>
              <div style={{background:B.greenDark,borderRadius:12,padding:"12px 14px",marginBottom:14,color:B.white,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:"bold",fontSize:15}}>{historyData.event?.name}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.7)",marginTop:2}}>{historyData.et.label} ×{historyData.et.weight}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:24,fontWeight:"bold"}}>{historyData.totalPts}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,.7)"}}>punti totali</div>
                </div>
              </div>

              {/* Titolari */}
              <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:8}}>⚡ Titolari</div>
              {historyData.starters.length === 0
                ? <div style={{fontSize:12,color:B.gray,marginBottom:12}}>Nessuna formazione salvata per questa tappa.</div>
                : historyData.starters.map((p,i) => (
                  <div key={p.player_id} style={{background:B.white,border:`1px solid ${B.greenDark}`,borderLeft:`3px solid ${p.isCaptain?B.yellow:B.greenDark}`,borderRadius:10,padding:"10px 12px",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:"bold",color:B.dark}}>
                          {p.isCaptain&&<span style={{color:B.yellow,marginRight:4}}>★</span>}{p.player_name||p.player_id}
                        </div>
                        <div style={{fontSize:10,color:B.gray,marginTop:2}}>
                          {p.matches.length} {p.matches.length===1?"partita":"partite"}
                          {p.isCaptain&&<span style={{color:B.yellow,marginLeft:6}}>× 1.3 cap</span>}
                          {" · "}base {Math.round(p.rawPts * 100) / 100} pt × {historyData.et.weight}
                        </div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:18,fontWeight:"bold",color:p.finalPts>0?B.greenDark:B.gray}}>{p.finalPts>0?`+${p.finalPts}`:p.finalPts}</div>
                        <div style={{fontSize:9,color:B.gray}}>pt tappa</div>
                      </div>
                    </div>
                    <MatchRows matches={p.matches}/>
                  </div>
                ))
              }

              {/* Coach */}
              {historyData.coach && (
                <div style={{background:historyData.coachInField?B.yellowPale:B.grayPale,
                  border:`1px solid ${historyData.coachInField?B.yellow:B.grayLight}`,
                  borderRadius:10,padding:"10px 12px",marginBottom:14,display:"flex",alignItems:"center",gap:10,opacity:historyData.coachInField?1:0.65}}>
                  <span style={{fontSize:20}}>🧢</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:"bold",color:B.dark}}>{historyData.coach.name}</div>
                    <div style={{fontSize:10,color:B.gray}}>{historyData.coachInField?"Schierato":"In panchina — punti non conteggiati"}</div>
                  </div>
                  {historyData.coachInField&&(
                    <div style={{fontSize:18,fontWeight:"bold",color:historyData.coachPts>0?B.greenDark:B.gray}}>
                      {historyData.coachPts>0?`+${historyData.coachPts}`:historyData.coachPts}
                    </div>
                  )}
                </div>
              )}

              {/* Panchina */}
              {historyData.bench.length > 0 && (
                <div>
                  <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.gray,marginBottom:8}}>⏸ Panchina (non conteggiata)</div>
                 {historyData.bench.map(p => (
                    <div key={p.player_id} style={{background:B.grayPale,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"10px 12px",marginBottom:6,opacity:0.65}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,color:B.dark}}>{p.player_name||p.player_id}</div>
                          <div style={{fontSize:10,color:B.gray}}>{p.matches.length} partite · base {Math.round(p.rawPts*100)/100} pt</div>
                        </div>
                        <div style={{fontSize:13,color:B.gray}}>({p.finalPts} pt)</div>
                      </div>
                      <MatchRows matches={p.matches}/>
                    </div>
                  ))}
                </div>
              )}

              {/* Totale */}
              <div style={{background:B.greenDark,borderRadius:10,padding:"14px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
                <div style={{color:"rgba(255,255,255,.9)",fontSize:14,fontWeight:"bold"}}>Totale tappa</div>
                <span style={{color:B.white,fontWeight:"bold",fontSize:24}}>{historyData.totalPts>0?`+${historyData.totalPts}`:historyData.totalPts} pt</span>
              </div>
            </div>
          )}
        </div>
      )}
       </MenuPage>
  );
}
   // ─── PAGINA FORMAZIONI DI LEGA (per tappa) ───────────────────
// ─── PAGINA RISULTATI TAPPA (dati reali dall'API, tabelle fivb_*) ───
function PageRisultati({ accessToken, events, leagueId, leagues, onBack }) {
  const [map, setMap] = React.useState([]);
  const [sel, setSel] = React.useState(null);        // { location, vis }
  const [matches, setMatches] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [view, setView] = React.useState("lista");   // "lista" | "bracket"

  const A = { card:"#FFFFFF", line:"#ECECF0", text:"#1C1C1E", sub:"#8E8E93", soft:"#B0B0B8", accent:"#2D5C4F", track:"#EDEDF1" };
  const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

  const league = leagues ? leagues.find(l => l.id === leagueId) : null;
  const gender = (league?.gender || "M").toUpperCase();

  React.useEffect(() => {
    if (!accessToken) return;
    supabase.from("event_tournament_map", accessToken)
      .then(db => db.select("*", "&limit=200"))
      .then(rows => setMap(Array.isArray(rows) ? rows : []))
      .catch(() => setMap([]));
  }, [accessToken]);

  const visByEvent = Object.fromEntries(map.map(m => [m.event_id, m.vis_id]));
  const tappe = [];
  const seen = {};
  events
    .filter(e => (e.anno || 2026) === 2026 && (e.gender || "").toUpperCase() === gender && visByEvent[e.id])
    .forEach(e => {
      const key = e.location || e.name;
      if (!seen[key]) { seen[key] = { location: key, vis: visByEvent[e.id] }; tappe.push(seen[key]); }
    });

  const loadMatches = async (location, vis) => {
    setSel({ location, vis });
    setLoading(true); setMatches(null);
    try {
      const rows = await supabase.from("fivb_matches", accessToken)
        .then(db => db.select(
          "match_no,phase,pool,round,team_a_name,team_b_name,result,sets,status",
          `&tournament_vis_id=eq.${vis}&order=match_no.asc&limit=500`));
      setMatches(Array.isArray(rows) ? rows : []);
    } catch (e) { console.error("Errore risultati:", e); setMatches([]); }
    setLoading(false);
  };

  // etichetta + peso (ordine decrescente: finali in alto, qualifiche in fondo)
  const groupInfo = (phase, pool, round, realCount, byeCount) => {
    const r = round || "";
    if (phase === "main_draw") {
      if (/3°-4°|3-4/.test(r)) return { label: "Finale 3°/4° posto", w: 1 };
      if (/1°-2°|1-2/.test(r) || r === "Finale") return { label: "Finale", w: 0 };
      // squadre nel turno = partite vere × 2 + bye (chi passa diretto)
      const teams = realCount * 2 + byeCount;
      const byTeams = { 4:"Semifinali", 8:"Quarti di finale", 12:"Round of 12", 16:"Ottavi di finale", 24:"Round of 24", 32:"Sedicesimi di finale" };
      return { label: byTeams[teams] || r, w: teams };
    }
    if (phase === "pool") {
      const L = (pool || "?").toUpperCase();
      return { label: `Pool ${L}`, w: 1000 + (L.charCodeAt(0) - 65) };
    }
    // qualificazioni: un blocco per percorso, in ordine prima→sesta
    const po = { prima:1, seconda:2, terza:3, quarta:4, quinta:5, sesta:6, settima:7, ottava:8 };
    const mm = r.match(/percorso\s+(\w+)\s+coppia/i);
    const ord = mm ? (po[mm[1].toLowerCase()] || 99) : 99;
    return { label: r || "Qualificazioni", w: 2000 + ord };
  };

  const gmap = {};
  (matches || []).forEach(m => {
    let key;
    if (m.phase === "pool") key = `pool|${m.pool}`;
    else if (m.phase === "main_draw") key = `md|${m.round}`;
    else key = `qual|${m.round}`;
    if (!gmap[key]) gmap[key] = { phase: m.phase, pool: m.pool, round: m.round, rows: [] };
    gmap[key].rows.push(m);   // include i bye, servono per contare le squadre
  });
  const groups = Object.values(gmap)
    .map(g => {
      const real = g.rows.filter(m => m.status !== "bye");
      const byes = g.rows.length - real.length;
      return { ...g, rows: real, ...groupInfo(g.phase, g.pool, g.round, real.length, byes) };
    })
    .filter(g => g.rows.length > 0)
    .sort((a, b) => a.w - b.w);

  const setsTxt = (s) => Array.isArray(s) ? s.map(x => `${x[0]}\u2013${x[1]}`).join("   ") : "";

  return (
    <MenuPage title="Risultati Tappa" emoji="🏟️" onBack={onBack}>
      <div style={{fontFamily:SANS}}>
        <div style={{fontSize:12,color:A.sub,margin:"0 2px 12px"}}>
          {league ? `${league.name} · ${gender === "F" ? "Femminile" : "Maschile"}` : ""}
        </div>

        {/* selettore tappa */}
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4,marginBottom:16}}>
          {tappe.length === 0 && <div style={{color:A.sub,fontSize:13}}>Nessuna tappa mappata.</div>}
          {tappe.map(t => {
            const on = sel?.location === t.location;
            return (
              <button key={t.location} onClick={() => loadMatches(t.location, t.vis)}
                style={{flexShrink:0,padding:"7px 16px",borderRadius:980,border:"none",cursor:"pointer",fontFamily:SANS,fontSize:13,fontWeight:on?600:500,background:on?A.accent:A.track,color:on?"#FFFFFF":A.text}}>
                {t.location}
              </button>
            );
          })}
        </div>

        {/* toggle Lista / Bracket */}
        {sel && (
          <div style={{display:"flex",background:A.track,borderRadius:10,padding:3,marginBottom:20}}>
            {[["lista","Lista"],["bracket","Bracket"]].map(([v,lab]) => {
              const on = view === v;
              return (
                <button key={v} onClick={() => setView(v)}
                  style={{flex:1,padding:"7px 0",borderRadius:8,border:"none",cursor:"pointer",fontFamily:SANS,fontSize:13,fontWeight:on?600:500,
                    background:on?"#FFFFFF":"transparent",color:on?A.text:A.sub,boxShadow:on?"0 1px 3px rgba(0,0,0,0.10)":"none"}}>
                  {lab}
                </button>
              );
            })}
          </div>
        )}

        {!sel && <div style={{color:A.sub,fontSize:14,textAlign:"center",padding:"48px 0"}}>Scegli una tappa.</div>}
        {loading && <div style={{color:A.sub,fontSize:14,textAlign:"center",padding:"48px 0"}}>Caricamento…</div>}

        {/* BRACKET: predisposto, da disegnare */}
        {sel && !loading && view === "bracket" && (
          <div style={{textAlign:"center",padding:"56px 20px",color:A.sub}}>
            <div style={{fontSize:34,marginBottom:10}}>🗂️</div>
            <div style={{fontSize:15,fontWeight:600,color:A.text,marginBottom:6}}>Bracket in arrivo</div>
            <div style={{fontSize:13,lineHeight:1.5}}>La vista ad albero del tabellone è predisposta ma non ancora disegnata. Per ora usa la Lista.</div>
          </div>
        )}

        {/* LISTA */}
        {sel && !loading && view === "lista" && matches && matches.length === 0 && (
          <div style={{color:A.sub,fontSize:14,textAlign:"center",padding:"48px 0"}}>Nessuna partita disponibile per questa tappa.</div>
        )}
        {!loading && view === "lista" && groups.map((g, gi) => (
          <div key={gi} style={{marginBottom:20}}>
            <div style={{fontSize:14,fontWeight:700,color:A.text,margin:"0 2px 9px",letterSpacing:0.2}}>{g.label}</div>
            <div style={{background:A.card,borderRadius:14,border:`1px solid ${A.line}`,overflow:"hidden"}}>
              {g.rows.map((m, mi) => {
                const a = m.team_a_name || "—", b = m.team_b_name || "—";
                const parts = (m.result || "").split("-");
                const ra = parts[0] || "", rb = parts[1] || "";
                const sch = m.status === "scheduled" || !m.result;
                const aWin = !sch && ra > rb, bWin = !sch && rb > ra;
                return (
                  <div key={mi} style={{padding:"13px 15px",borderTop:mi>0?`1px solid ${A.line}`:"none"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                      <span style={{fontSize:14,color:A.text,fontWeight:aWin?600:400}}>{a}</span>
                      <span style={{fontSize:15,fontWeight:700,color:aWin?A.accent:A.soft,minWidth:16,textAlign:"right"}}>{sch?"":ra}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginTop:5}}>
                      <span style={{fontSize:14,color:A.text,fontWeight:bWin?600:400}}>{b}</span>
                      <span style={{fontSize:15,fontWeight:700,color:bWin?A.accent:A.soft,minWidth:16,textAlign:"right"}}>{sch?"":rb}</span>
                    </div>
                    {m.sets && <div style={{fontSize:12,color:A.soft,marginTop:7,fontVariantNumeric:"tabular-nums"}}>{setsTxt(m.sets)}</div>}
                    {sch && <div style={{fontSize:12,color:"#C7A23A",marginTop:7}}>Da giocare</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </MenuPage>
  );
}

function PageLeagueFormations({ authUser, accessToken, leagueId, leagues, events, coachesList, athletesData, onBack }) {
  const [selectedLeague, setSelectedLeague] = React.useState(leagueId || "L001-F");
  const [selectedEventId, setSelectedEventId] = React.useState(null);
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const league = leagues.find(l => l.id === selectedLeague);
  const frozenEvents = events.filter(e =>
    (e.status === "Completato" || e.status === "In corso") &&
    (e.anno || 2026) === 2026 &&
    (e.gender || "").toUpperCase() === (league?.gender || "F")
  );

  const loadAll = async (eventId) => {
    if (!accessToken) return;
    setLoading(true); setData(null);
    try {
      const [matchRes, lineupRes, profRes] = await Promise.all([
        supabase.from("match_results", accessToken).then(db => db.select("*", `&event_id=eq.${eventId}`)),
        supabase.from("lineup_history", accessToken).then(db => db.select("*", `&league_id=eq.${selectedLeague}&event_id=eq.${eventId}`)),
        supabase.from("profiles", accessToken).then(db => db.select("id,username", `&limit=1000`)),
      ]);
      const matches = Array.isArray(matchRes) ? matchRes : [];
      const lineup  = Array.isArray(lineupRes) ? lineupRes : [];
      const profs   = Array.isArray(profRes) ? profRes : [];
      const nameByUser = Object.fromEntries(profs.map(p => [p.id, p.username]));

      const event = events.find(e => e.id === eventId);
      const et = EVENT_TYPE_META[event?.type] || EVENT_TYPE_META.Silver;

      const byPlayer = {};
      matches.forEach(m => { if (m.player_id) (byPlayer[m.player_id] = byPlayer[m.player_id] || []).push(m); });

      const athleteList = (league?.gender || "F").toUpperCase() === "F" ? (athletesData?.women || []) : (athletesData?.men || []);
      const athleteMap = Object.fromEntries(athleteList.map(a => [a.id, a]));

      const byUser = {};
      lineup.forEach(l => { (byUser[l.user_id] = byUser[l.user_id] || []).push(l); });

      const users = Object.entries(byUser).map(([userId, rows]) => {
        const players = rows.map(l => {
          const isCaptain = l.role === "capitano";
          const isStarter = isCaptain || l.role === "titolare";
          let rawPts = 0;
          (byPlayer[l.player_id] || []).forEach(m => {
            const coachWinPts = (m.bonus_codes || []).includes("coachWin") ? 0.5 : 0;
            rawPts += (m.base_pts || 0) + (m.bonus_pts || 0) - coachWinPts;
          });
          const finalPts = rawPts * (et.weight || 1) * (isCaptain ? 1.3 : 1);
          const name = l.player_name || athleteMap[l.player_id]?.name || l.player_id;
          return { name, isStarter, isCaptain, finalPts };
        });
        let coachPts = 0;
        const frozenCoachRow = rows.find(l => l.coach_id);
        const frozenCoachId = frozenCoachRow?.coach_id || null;
        const coachInField = frozenCoachRow?.coach_in_field || false;
        const coach = frozenCoachId ? coachesList.find(c => c.id === frozenCoachId) : null;
        if (coach && coachInField) {
          const won = {};
          matches.filter(m => m.coach_id === frozenCoachId).forEach(m => {
            const w = (m.result || "").startsWith("2") || m.is_bye;
            if (w) won[m.match_index] = true;
            else if (!(m.match_index in won)) won[m.match_index] = false;
          });
          coachPts = Object.values(won).filter(Boolean).length * 0.5;
        }
        const starters = players.filter(p => p.isStarter);
        const total = Math.round((starters.reduce((s, p) => s + p.finalPts, 0) + coachPts) * 100) / 100;
        return { userId, username: nameByUser[userId] || "—", starters, coachName: (coach && coachInField) ? coach.name : null, total };
      }).sort((a, b) => b.total - a.total);

      setData({ users, event, et });
    } catch (e) { console.error("Errore formazioni lega:", e); }
    setLoading(false);
  };

  React.useEffect(() => { setSelectedEventId(null); setData(null); }, [selectedLeague]);

  return (
    <MenuPage title="Formazioni di Lega" emoji="👥" onBack={onBack}>
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {leagues.map(l => (
          <button key={l.id} onClick={()=>setSelectedLeague(l.id)}
            style={{padding:"6px 12px",borderRadius:20,border:`1px solid ${selectedLeague===l.id?B.orange:B.creamDark}`,
              background:selectedLeague===l.id?B.orange:B.white,color:selectedLeague===l.id?B.white:B.dark,
              fontWeight:selectedLeague===l.id?"bold":"normal",fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif"}}>
            {l.name}
          </button>
        ))}
      </div>

      {frozenEvents.length === 0 ? (
        <div style={{textAlign:"center",padding:"40px 20px",color:B.gray}}>
          <div style={{fontSize:36,marginBottom:10}}>📅</div>
          <div style={{fontSize:13,color:B.dark,fontWeight:"bold"}}>Nessuna tappa con formazioni congelate</div>
          <div style={{fontSize:11,color:B.gray,marginTop:4}}>Le formazioni appaiono dopo la chiusura del mercato della tappa.</div>
        </div>
      ) : (
        <>
          <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:16}}>
            {frozenEvents.map(e => {
              const et = EVENT_TYPE_META[e.type] || EVENT_TYPE_META.Silver;
              const sel = selectedEventId === e.id;
              return (
                <button key={e.id} onClick={()=>{ setSelectedEventId(e.id); loadAll(e.id); }}
                  style={{background:sel?B.greenDark:B.white,border:`1px solid ${sel?B.greenDark:B.creamDark}`,
                    borderLeft:`4px solid ${sel?B.white:et.color}`,borderRadius:10,padding:"11px 14px",cursor:"pointer",
                    fontFamily:"Georgia,serif",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:"bold",fontSize:13,color:sel?B.white:B.dark}}>{e.name}</div>
                    <div style={{fontSize:10,color:sel?"rgba(255,255,255,.7)":B.gray,marginTop:2}}>{e.date_start||e.date}{e.status==="In corso"?" · in corso":""}</div>
                  </div>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:8,fontWeight:"bold",background:sel?"rgba(255,255,255,.2)":et.bg,color:sel?B.white:et.color}}>×{et.weight}</span>
                </button>
              );
            })}
          </div>

          {loading && <div style={{textAlign:"center",padding:"30px",color:B.gray,fontSize:12}}>⏳ Caricamento...</div>}

          {data && !loading && (
            data.users.length === 0 ? (
              <div style={{textAlign:"center",padding:"20px",color:B.gray,fontSize:12}}>Nessuna formazione per questa tappa.</div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {data.users.map((u, i) => (
                  <div key={u.userId} style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"11px 13px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <span style={{fontSize:12,fontWeight:"bold",color:B.gray,minWidth:20}}>{i+1}°</span>
                      <div style={{flex:1,fontSize:13,fontWeight:"bold",color:B.dark}}>{u.username}</div>
                      <div style={{fontSize:18,fontWeight:"bold",color:u.total>0?B.greenDark:B.gray}}>{u.total>0?`+${u.total}`:u.total}</div>
                    </div>
                    <div style={{fontSize:11,color:B.gray,lineHeight:1.6}}>
                      {u.starters.map((p,j) => (
                        <span key={j}>{p.isCaptain&&<span style={{color:B.yellow}}>★</span>}{p.name}{j<u.starters.length-1?" · ":""}</span>
                      ))}
                      {u.coachName && <span> · 🧢 {u.coachName}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

    </MenuPage>
  );
}
function BonusItem({b}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{background:"#FFFFFF",border:"1px solid #EDE7DC",borderRadius:10,marginBottom:8,overflow:"hidden"}}>
      <button onClick={()=>setOpen(!open)}
        style={{width:"100%",padding:"11px 14px",border:"none",background:"transparent",
          cursor:"pointer",fontFamily:"Georgia,serif",display:"flex",alignItems:"center",
          gap:10,textAlign:"left"}}>
        <span style={{fontSize:20}}>{b.icon==="star"?"⭐":b.icon==="hat"?"🧢":"🔥"}</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:"bold",fontSize:13,color:"#1A2E28"}}>{b.label}</div>
          <div style={{fontSize:11,color:"#6B7B74"}}>{b.sub}</div>
        </div>
        <span style={{color:"#6B7B74",fontSize:14}}>{open?"▲":"▼"}</span>
      </button>
      {open&&(
        <div style={{padding:"10px 14px 12px",fontSize:12,color:"#6B7B74",
          lineHeight:1.7,borderTop:"1px solid #EDE7DC"}}>
          {b.detail}
        </div>
      )}
    </div>
  );
}
