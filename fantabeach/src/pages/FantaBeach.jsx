// ─────────────────────────────────────────────────────────────
// FantaBeach — Main App Page
// 
// STATO DATI:
//   - Atleti, eventi, classifica: MOCK (da sostituire con Sheets API)
//   - Roster, formazioni, iscrizioni: in useState locale (da portare su Supabase)
//   - Auth: STUB (da implementare con Supabase)
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from "react";
import { B } from "@/config/colors";
import { TABS, EVENT_TYPE_META, CATEGORIES, PRICE_RANGES, BUDGET_INITIAL } from "@/config/constants";
import { WOMEN_ATHLETES, MEN_ATHLETES, ATHLETE_PHOTOS } from "@/data/mockAthletes";
import { LEAGUES_INIT, INIT_JOIN } from "@/data/mockLeagues";
import { EVENTS, MOCK_MATCHES } from "@/data/mockEvents";
import { STANDINGS } from "@/data/mockStandings";
import { COACHES } from "@/data/mockCoaches";
import { LogoBall, LogoFull } from "@/components/ui/Logo";
import { AthleteAvatar } from "@/components/ui/AthleteAvatar";
import { BonusItem } from "@/components/ui/BonusItem";
import { AthleteProfile } from "@/components/market/AthleteProfile";
import { EventDetail } from "@/components/calendar/EventDetail";
import { getCategory } from "@/utils/scoring";


// Premi per lega (soglie di sblocco)
const PRIZES = [
  {threshold:10, pos:"3°", name:"Borsone Under Armour",         icon:"🎒"},
  {threshold:18, pos:"2°", name:"Canotta/Top firmata Nazionale", icon:"👕"},
  {threshold:25, pos:"1°", name:"AirPods 4",                    icon:"🎧"},
];

export default function FantaBeach() {
  const [tab, setTab]             = useState(0);
  const [leagueId, setLeagueId]   = useState("L001-F");
  const [budgets, setBudgets]     = useState({"L001-F":400,"L001-M":400,"L002-F":400,"L002-M":400});
  const [rosters, setRosters]     = useState({"L001-F":[],"L001-M":[],"L002-F":[],"L002-M":[]});
  const [lineups, setLineups]     = useState({"L001-F":[],"L001-M":[],"L002-F":[],"L002-M":[]});
  const [captains, setCaptains]   = useState({"L001-F":null,"L001-M":null,"L002-F":null,"L002-M":null});
  const [coaches, setCoaches]     = useState({"L001-F":null,"L001-M":null,"L002-F":null,"L002-M":null});
  const [joinStatus, setJoinStatus] = useState(INIT_JOIN);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinTeamName, setJoinTeamName] = useState("");
  const [notif, setNotif]         = useState(null);
  const [popup, setPopup]         = useState(null);
  const [search, setSearch]       = useState("");
  const [catFilter, setCatFilter] = useState("Tutti");
  const [priceFilter, setPriceFilter] = useState(0);
  const [visibleCount, setVisibleCount] = useState(30);
  const [marketTab, setMarketTab] = useState("athletes"); // "athletes" | "coaches"
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mockUsers]               = useState(14);
  const [showMenu, setShowMenu]     = useState(false);
  const [menuSection, setMenuSection] = useState(null);
  const [leagues, setLeagues]     = useState(LEAGUES_INIT);

  const league   = leagues.find(l => l.id === leagueId);
  const athletes = league.gender === "F" ? WOMEN_ATHLETES : MEN_ATHLETES;
  const budget   = budgets[leagueId];
  const roster   = rosters[leagueId];
  const lineup   = lineups[leagueId];
  const captain  = captains[leagueId];
  const myCoach  = coaches[leagueId];
  const myJoin   = joinStatus[leagueId];

  const showNotif = (msg, type="success") => { setNotif({msg,type}); setTimeout(()=>setNotif(null),2800); };
  const canTrade = () => league.type==="classic" ? league.status==="OPEN" : league.marketOpen;
  const isOwned   = (a) => !!roster.find(r=>r.id===a.id);
  const isStarter = (a) => lineup.includes(a.id);
  const isCaptain = (a) => captain===a.id;

  const handleBuy = (a) => {
    if (myJoin!=="APPROVED") return showNotif("Non sei ancora approvato!","error");
    if (!canTrade()) return showNotif(league.type==="classic"?"Iscrizioni chiuse!":"Mercato chiuso! Lun 09:00 - Gio 23:00","error");
    if (roster.length>=5) return showNotif("Hai già 5 atleti nel roster!","error");
    if (budget<a.cost)    return showNotif("Crediti insufficienti!","error");
    if (isOwned(a))       return showNotif("Atleta già nel roster!","error");
    setRosters(r=>({...r,[leagueId]:[...r[leagueId],{...a}]}));
    setBudgets(b=>({...b,[leagueId]:b[leagueId]-a.cost}));
    showNotif(`${a.name} aggiunto! 🏐`);
  };

  const handleSell = (a) => {
    if (!canTrade()) return showNotif(league.type==="classic"?"Iscrizioni chiuse!":"Mercato chiuso!","error");
    setRosters(r=>({...r,[leagueId]:r[leagueId].filter(x=>x.id!==a.id)}));
    setLineups(l=>({...l,[leagueId]:l[leagueId].filter(id=>id!==a.id)}));
    if (captain===a.id) setCaptains(c=>({...c,[leagueId]:null}));
    setBudgets(b=>({...b,[leagueId]:b[leagueId]+a.cost}));
    showNotif(`Venduto per $${a.cost}`);
  };

  const handleBuyCoach = (c) => {
    if (!canTrade()) return showNotif("Mercato chiuso!","error");
    if (myCoach===c.id) return showNotif("Coach già selezionato!","error");
    const prev = COACHES.find(x=>x.id===myCoach);
    const prevCost = prev ? prev.cost : 0;
    if (budget - prevCost + (myCoach?prev.cost:0) < c.cost) return showNotif("Crediti insufficienti!","error");
    if (myCoach) setBudgets(b=>({...b,[leagueId]:b[leagueId]+1}));
    setCoaches(ch=>({...ch,[leagueId]:c.id}));
    setBudgets(b=>({...b,[leagueId]:b[leagueId]-c.cost}));
    showNotif(`Coach ${c.name} selezionato!`);
  };

  const handleRemoveCoach = () => {
    if (!myCoach) return;
    const c = COACHES.find(x=>x.id===myCoach);
    setBudgets(b=>({...b,[leagueId]:b[leagueId]+c.cost}));
    setCoaches(ch=>({...ch,[leagueId]:null}));
    showNotif("Coach rimosso");
  };

  const toggleStarter = (a) => {
    if (isStarter(a)) {
      setLineups(l=>({...l,[leagueId]:l[leagueId].filter(id=>id!==a.id)}));
      if (captain===a.id) setCaptains(c=>({...c,[leagueId]:null}));
    } else {
      if (lineup.length>=3) return showNotif("Max 3 titolari!","error");
      setLineups(l=>({...l,[leagueId]:[...l[leagueId],a.id]}));
    }
  };

  const toggleCaptain = (a) => {
    if (!isStarter(a)) return showNotif("Il capitano deve essere titolare!","error");
    setCaptains(c=>({...c,[leagueId]:c[leagueId]===a.id?null:a.id}));
  };

  const handleSaveFormation = () => {
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
  };

  const handleJoinRequest = () => {
    if (!joinTeamName.trim()) return showNotif("Inserisci il nome della squadra!","error");
    setJoinStatus(j=>({...j,[leagueId]:"PENDING"}));
    setShowJoinForm(false); setJoinTeamName("");
    showNotif("Richiesta inviata! Attendi l'approvazione.");
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
  const standings = STANDINGS[leagueId]||[];
  const currentCoach = COACHES.find(c=>c.id===myCoach);

  const JoinGate = () => (
    <div style={{textAlign:"center",padding:"30px 16px"}}>
      <LogoBall size={56}/>
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
          <input placeholder="Es. Beach Warriors..." value={joinTeamName} onChange={e=>setJoinTeamName(e.target.value)}
            style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${B.grayLight}`,background:B.white,color:B.dark,fontSize:14,fontFamily:"Georgia,serif",outline:"none",boxSizing:"border-box",marginBottom:10}}/>
          <div style={{fontSize:11,color:B.gray,marginBottom:14}}>{league.type==="classic"?"⚠️ Classic: puoi modificare finché l'admin non chiude le iscrizioni.":"ℹ️ Market: compravendite lun 09:00 - gio 23:00."}</div>
          <button onClick={handleJoinRequest} style={{width:"100%",padding:"12px",background:B.greenDark,border:"none",borderRadius:10,color:B.white,fontWeight:"bold",fontSize:14,cursor:"pointer",fontFamily:"Georgia,serif",marginBottom:8}}>Invia Richiesta</button>
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
      <div style={{background:B.sandDark,padding:"16px 16px 0",color:B.dark,borderBottom:`2px solid ${B.sandDeep}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <button onClick={()=>setShowMenu(true)} style={{width:36,height:36,borderRadius:10,border:`1px solid ${B.sandDeep}`,background:B.white,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,flexShrink:0}}>
            <div style={{width:16,height:2,borderRadius:1,background:B.dark}}/>
            <div style={{width:16,height:2,borderRadius:1,background:B.dark}}/>
            <div style={{width:12,height:2,borderRadius:1,background:B.dark}}/>
          </button>
          <LogoFull/>
          <div style={{background:B.white,border:`1px solid ${B.sandDeep}`,borderRadius:30,padding:"6px 14px",textAlign:"center"}}>
            <div style={{color:B.yellow,fontWeight:"bold",fontSize:18,lineHeight:1}}>${budget}</div>
            <div style={{color:"rgba(255,255,255,.5)",fontSize:10}}>crediti</div>
          </div>
        </div>

        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:10,scrollbarWidth:"none"}}>
          {leagues.map(l=>{
            const js=joinStatus[l.id];
            return(
              <button key={l.id} onClick={()=>{setLeagueId(l.id);setVisibleCount(30);}} style={{flexShrink:0,padding:"6px 12px",borderRadius:20,border:`1px solid ${leagueId===l.id?B.orange:B.creamDark}`,cursor:"pointer",fontSize:11,fontFamily:"Georgia,serif",background:leagueId===l.id?B.orange:B.white,color:leagueId===l.id?B.white:"#333333",fontWeight:leagueId===l.id?"bold":"normal",display:"flex",alignItems:"center",gap:5}}>
                {l.name}
                <span style={{width:6,height:6,borderRadius:"50%",display:"inline-block",background:js==="APPROVED"?"#4ADE80":js==="PENDING"?B.yellow:"#F87171"}}/>
              </button>
            );
          })}
        </div>

        <div style={{display:"flex",alignItems:"center",gap:8,paddingBottom:10,fontSize:11}}>
          <span style={{padding:"2px 10px",borderRadius:10,fontSize:10,fontWeight:"bold",background:league.status==="OPEN"?"#D1FAE5":B.orangePale,color:league.status==="OPEN"?"#065F46":B.orange,border:`1px solid ${league.status==="OPEN"?"#34D399":B.orange}`}}>
            {league.type==="classic"?league.status==="OPEN"?"🟢 Iscrizioni aperte":"🔴 Iscrizioni chiuse":league.marketOpen?"🟢 Mercato aperto":"🔴 Mercato chiuso"}
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
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"7px 2px 10px",border:"none",cursor:"pointer",background:tab===t.id?B.white:"transparent",color:tab===t.id?B.greenDark:"#333333",borderRadius:"8px 8px 0 0",fontSize:9,fontFamily:"Georgia,serif",fontWeight:tab===t.id?"bold":"normal",transition:"all .15s",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <span style={{fontSize:16,lineHeight:1}}>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"14px 14px 60px"}}>

        {/* TAB 0: MERCATO */}
        {tab===0&&(
          myJoin!=="APPROVED"?<JoinGate/>:(
          <div>
            {/* Market sub-tabs */}
            <div style={{display:"flex",gap:6,marginBottom:12}}>
              {[{id:"athletes",label:"🏐 Atleti"},{id:"coaches",label:"🧢 Coach"}].map(mt=>(
                <button key={mt.id} onClick={()=>setMarketTab(mt.id)} style={{flex:1,padding:"8px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"Georgia,serif",fontSize:13,fontWeight:marketTab===mt.id?"bold":"normal",background:marketTab===mt.id?B.greenDark:B.grayPale,color:marketTab===mt.id?B.white:B.gray}}>
                  {mt.label}
                </button>
              ))}
            </div>

            {!canTrade()&&<div style={{background:B.orangePale,border:`1px solid ${B.orange}44`,borderRadius:10,padding:"9px 12px",marginBottom:10,fontSize:12,color:B.orange,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>🔒</span>{league.type==="classic"?"Iscrizioni chiuse":"Mercato chiuso — riapre lunedì 09:00"}</div>}

            {marketTab==="athletes"&&(
              <div>
                <input placeholder="🔍 Cerca atleta..." value={search} onChange={e=>{setSearch(e.target.value);setVisibleCount(30);}} style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${B.grayLight}`,background:B.white,color:B.dark,fontSize:13,fontFamily:"Georgia,serif",outline:"none",boxSizing:"border-box",marginBottom:8}}/>

                <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:6,scrollbarWidth:"none",marginBottom:6}}>
                  {["Tutti",...CATEGORIES.map(c=>c.label)].map(label=>{
                    const cat=CATEGORIES.find(c=>c.label===label);
                    const active=catFilter===label;
                    return(<button key={label} onClick={()=>{setCatFilter(label);setVisibleCount(30);}} style={{flexShrink:0,padding:"5px 11px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,fontFamily:"Georgia,serif",fontWeight:active?"bold":"normal",background:active?(cat?cat.bg:B.greenDark):(cat?`${cat.bg}88`:B.grayPale),color:active?(cat?cat.text:B.white):(cat?cat.text:B.gray)}}>{label}</button>);
                  })}
                </div>

                <div style={{display:"flex",gap:5,marginBottom:12}}>
                  {PRICE_RANGES.map((pr,i)=>(
                    <button key={i} onClick={()=>{setPriceFilter(i);setVisibleCount(30);}} style={{flex:1,padding:"5px 6px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontFamily:"Georgia,serif",background:priceFilter===i?B.greenDark:B.grayPale,color:priceFilter===i?B.white:B.gray,fontWeight:priceFilter===i?"bold":"normal"}}>{pr.label}</button>
                  ))}
                </div>

                <div style={{fontSize:11,color:B.gray,marginBottom:8}}>{filtered.length} atleti</div>

                <div style={{display:"flex",flexDirection:"column",gap:7}}>
                  {visibleAthletes.map(a=>{
                    const owned=isOwned(a);
                    const cat=getCategory(a.ranking);
                    const diff=a.cost-a.prevCost;
                    const canBuy=!owned&&budget>=a.cost&&roster.length<5&&canTrade();
                    return(
                      <div key={a.id} style={{background:B.white,border:`1px solid ${owned?B.greenDark:B.creamDark}`,borderLeft:`3px solid ${owned?B.greenDark:B.creamDark}`,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>{setSelectedAthlete(a);setTab(3);}}>
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
                            {diff!==0&&<span style={{fontSize:10,color:diff>0?B.greenDark:B.orange,fontWeight:"bold"}}>{diff>0?"▲":"▼"}{Math.abs(diff)}</span>}
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
                  Il coach è opzionale (${1} credito). Se la sua coppia vince ottieni +0.5 pt per partita.
                </div>

                {currentCoach&&(
                  <div style={{background:B.yellowPale,border:`1px solid ${B.yellow}`,borderRadius:12,padding:"12px 14px",marginBottom:12}}>
                    <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:"#7A4F00",marginBottom:6}}>Il tuo Coach</div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:40,height:40,borderRadius:"50%",background:B.yellow,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🧢</div>
                      <div style={{flex:1}}>
                        <div style={{color:B.dark,fontWeight:"bold",fontSize:14}}>{currentCoach.name}</div>
                        <div style={{color:B.gray,fontSize:11}}>${currentCoach.cost} · {currentCoach.athletes.length} atleti seguiti</div>
                      </div>
                      <button onClick={handleRemoveCoach} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${B.orange}`,background:B.orangePale,color:B.orange,fontSize:11,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif"}}>Rimuovi</button>
                    </div>
                  </div>
                )}

                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {COACHES.filter(c=>league.gender==="F"?c.id.startsWith("C00"):true).map(c=>{
                    const isSelected = myCoach===c.id;
                    return(
                      <div key={c.id} style={{background:isSelected?B.greenPale:B.white,border:`1px solid ${isSelected?B.greenDark:B.creamDark}`,borderLeft:`3px solid ${isSelected?B.greenDark:B.creamDark}`,borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
                        <div style={{width:40,height:40,borderRadius:"50%",background:isSelected?B.greenDark:B.grayPale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🧢</div>
                        <div style={{flex:1}}>
                          <div style={{color:B.dark,fontWeight:"bold",fontSize:13}}>{c.name}</div>
                          <div style={{color:B.gray,fontSize:11,marginTop:2}}>{c.athletes.length} atleti · +0.5 pt/vittoria</div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{color:B.orange,fontWeight:"bold",fontSize:16}}>${c.cost}</div>
                          {isSelected?(
                            <span style={{fontSize:10,color:B.greenDark,fontWeight:"bold"}}>✓ Scelto</span>
                          ):(
                            <button onClick={()=>handleBuyCoach(c)} style={{marginTop:4,padding:"5px 10px",borderRadius:8,border:"none",background:canTrade()&&budget>=c.cost?B.greenDark:B.grayPale,color:canTrade()&&budget>=c.cost?B.white:B.gray,fontSize:11,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif"}}>Scegli</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          )
        )}

        {/* TAB 1: SQUADRA */}
        {tab===1&&(
          myJoin!=="APPROVED"?<JoinGate/>:(
          <div>
            <div style={{fontSize:11,color:B.gray,textAlign:"center",marginBottom:6}}>{league.name} · Deadline: giovedì 23:00</div>
            <div style={{background:B.orangePale,border:`1px solid ${B.orange}44`,borderRadius:10,padding:"8px 12px",marginBottom:14,fontSize:12,color:B.orange,textAlign:"center"}}>
              Scegli 3 titolari + 1 capitano unico (×1.3 punti)
            </div>

            {roster.length===0?(
              <div style={{textAlign:"center",padding:"40px 20px",color:B.gray}}>
                <LogoBall size={52}/>
                <div style={{marginTop:12,fontSize:15,fontWeight:"bold",color:B.greenDark}}>Roster vuoto</div>
                {canTrade()&&<button onClick={()=>setTab(0)} style={{marginTop:14,padding:"10px 24px",borderRadius:20,border:"none",background:B.greenDark,color:B.white,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif"}}>Vai al Mercato</button>}
              </div>
            ):(
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
                  <div style={{background:B.yellowPale,border:`1px solid ${B.yellow}44`,borderRadius:10,padding:"10px 13px",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:20}}>🧢</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:"bold",color:B.dark}}>Coach: {currentCoach.name}</div>
                      <div style={{fontSize:10,color:B.gray}}>+0.5 pt per ogni vittoria della sua coppia</div>
                    </div>
                  </div>
                )}

                <div style={{background:B.grayPale,borderRadius:10,padding:"11px 13px",fontSize:12,color:B.gray,lineHeight:1.7,marginBottom:12}}>
                  <b style={{color:B.dark}}>Come funziona:</b><br/>
                  Premi ▲ per portare un atleta in campo (max 3).<br/>
                  Premi ★ per nominarlo <b>capitano unico</b> (punti ×1.3).<br/>
                  Salva entro giovedì 23:00.
                </div>

                <button onClick={handleSaveFormation} style={{width:"100%",padding:"13px",background:roster.length===5&&lineup.length===3&&captain?B.greenDark:B.grayLight,border:"none",borderRadius:12,color:roster.length===5&&lineup.length===3&&captain?B.white:B.gray,fontWeight:"bold",fontSize:15,cursor:"pointer",fontFamily:"Georgia,serif"}}>
                  {roster.length<5?`⚠️ Roster (${roster.length}/5)`:lineup.length<3?`Schiera titolari (${lineup.length}/3)`:!captain?"★ Nomina il capitano":"Salva Formazione ✓"}
                </button>
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
                const unlocked=mockUsers>=p.threshold;
                return(<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",opacity:unlocked?1:0.45,borderBottom:i<PRIZES.length-1?`1px solid ${B.creamDark}`:"none"}}>
                  <span style={{fontSize:20}}>{p.icon}</span>
                  <div style={{flex:1}}><div style={{fontSize:12,fontWeight:"bold",color:B.dark}}>{p.name}</div><div style={{fontSize:10,color:B.gray}}>{p.pos} posto · {p.threshold}+ utenti</div></div>
                  {unlocked?<span style={{fontSize:10,padding:"2px 8px",borderRadius:8,background:B.greenPale,color:B.greenDark,fontWeight:"bold"}}>✓</span>:<span style={{fontSize:10,color:B.gray}}>{mockUsers}/{p.threshold}</span>}
                </div>);
              })}
            </div>

            <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:10}}>Classifica {league.name}</div>
            <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:18}}>
              {standings.map(s=>{
                const moved=s.prev-s.rank; const isMe=s.user==="Zio_Emanuele";
                return(<div key={s.user} style={{background:isMe?B.greenPale:B.white,border:`1px solid ${isMe?B.greenDark:B.creamDark}`,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:30,height:30,borderRadius:8,flexShrink:0,background:s.rank===1?B.yellow:s.rank===2?B.grayLight:s.rank===3?"#CD7F32":B.grayPale,display:"flex",alignItems:"center",justifyContent:"center",color:s.rank<=3?B.dark:B.gray,fontWeight:"bold",fontSize:s.rank<=3?14:12}}>{s.rank<=3?["🥇","🥈","🥉"][s.rank-1]:s.rank}</div>
                  <div style={{flex:1,minWidth:0}}><div style={{color:isMe?B.greenDark:B.dark,fontWeight:"bold",fontSize:13}}>{s.team} {isMe&&"⭐"}</div><div style={{color:B.gray,fontSize:11}}>{s.user} · ${s.budget}</div></div>
                  <div style={{flexShrink:0,textAlign:"center",marginRight:4}}>{moved>0&&<div style={{color:B.greenDark,fontSize:11,fontWeight:"bold"}}>▲{moved}</div>}{moved<0&&<div style={{color:B.orange,fontSize:11,fontWeight:"bold"}}>▼{Math.abs(moved)}</div>}{moved===0&&<div style={{color:B.grayLight,fontSize:11}}>—</div>}</div>
                  <div style={{textAlign:"right",flexShrink:0}}><div style={{color:s.rank===1?B.orange:B.dark,fontWeight:"bold",fontSize:20}}>{s.pts}</div><div style={{color:B.gray,fontSize:9}}>punti</div></div>
                </div>);
              })}
            </div>

            <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"12px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.orange}}>🔥 Combo</div>
                <span style={{fontSize:10,color:B.gray}}>{COMBO.length}/30</span>
              </div>
              {COMBO.map(s=>{const moved=s.prev-s.rank;const isMe=s.user==="Zio_Emanuele";return(<div key={s.user} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${B.creamDark}`}}>
                <div style={{width:22,textAlign:"center",color:B.gray,fontWeight:"bold",fontSize:13}}>{s.rank}</div>
                <div style={{flex:1}}><div style={{color:isMe?B.greenDark:B.dark,fontWeight:isMe?"bold":"normal",fontSize:13}}>{s.user} {isMe&&"⭐"}</div><div style={{color:B.gray,fontSize:10}}>{s.leagues} leghe</div></div>
                <div style={{fontSize:10,color:moved>0?B.greenDark:moved<0?B.orange:B.grayLight,fontWeight:"bold",marginRight:6}}>{moved>0?`▲${moved}`:moved<0?`▼${Math.abs(moved)}`:"—"}</div>
                <div style={{color:B.orange,fontWeight:"bold",fontSize:16}}>{s.pts}</div>
              </div>);})}
            </div>
          </div>
        )}

        {/* TAB 3: ATLETA */}
        {tab===3&&(
          <div>
            {!selectedAthlete?(
              <div>
                <div style={{color:B.gray,fontSize:12,textAlign:"center",marginBottom:12}}>Cerca un atleta o selezionalo dal Mercato</div>
                <input placeholder="Cerca atleta..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${B.grayLight}`,background:B.white,color:B.dark,fontSize:13,fontFamily:"Georgia,serif",outline:"none",boxSizing:"border-box",marginBottom:10}}/>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {[...WOMEN_ATHLETES,...MEN_ATHLETES].filter(a=>a.name.toLowerCase().includes(search.toLowerCase())).slice(0,25).map(a=>(
                    <div key={a.id} onClick={()=>setSelectedAthlete(a)} style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"10px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:36,height:36,borderRadius:"50%",overflow:"hidden",flexShrink:0,background:B.grayPale}}>{ATHLETE_PHOTOS[a.id]?<img src={ATHLETE_PHOTOS[a.id]} alt={a.name} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}}/>:<LogoBall size={36}/>}</div>
                      <div style={{flex:1,color:B.dark,fontSize:13,fontWeight:"bold"}}>{a.name}</div>
                      <div style={{color:B.gray,fontSize:11}}>#{a.ranking}</div>
                      <div style={{color:B.orange,fontWeight:"bold"}}>${a.cost}</div>
                    </div>
                  ))}
                </div>
              </div>
            ):(
              <AthleteProfile a={selectedAthlete} onBack={()=>setSelectedAthlete(null)} isOwned={isOwned(selectedAthlete)} onBuy={()=>handleBuy(selectedAthlete)} onSell={()=>handleSell(selectedAthlete)} budget={budget} canTrade={canTrade()}/>
            )}
          </div>
        )}

        {/* TAB 4: CALENDARIO */}
        {tab===4&&(
          <div>
            {selectedEvent?(
              <EventDetail event={selectedEvent} onBack={()=>setSelectedEvent(null)}/>
            ):(
              <div>
                <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:12}}>Stagione 2026 — 9 Tappe</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {EVENTS.map(e=>{
                    const et = EVENT_TYPE_META[e.type]||EVENT_TYPE_META.Silver;
                    return (
                      <div key={e.id} onClick={()=>setSelectedEvent(e)}
                        style={{background:B.cream,borderLeft:`4px solid ${et.color}`,
                          border:`1px solid ${e.status==="In corso"?B.orange:B.creamDark}`,
                          borderRadius:10,padding:"12px 14px",cursor:"pointer",
                          display:"flex",alignItems:"center",gap:12}}>
                        <div style={{width:52,height:52,borderRadius:10,flexShrink:0,
                          background:et.bg,display:"flex",flexDirection:"column",
                          alignItems:"center",justifyContent:"center",gap:1}}>
                          <span style={{fontSize:9,fontWeight:"bold",color:et.color,textAlign:"center",lineHeight:1.2}}>{et.label}</span>
                          <span style={{fontSize:14,fontWeight:"900",color:et.color}}>x{et.weight}</span>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:B.dark,fontWeight:"bold",fontSize:14}}>{e.name}</div>
                          <div style={{color:B.gray,fontSize:11,marginTop:2}}>{e.date}</div>
                        </div>
                        <span style={{fontSize:11,padding:"4px 10px",borderRadius:20,fontWeight:"bold",flexShrink:0,
                          background:e.status==="Completato"?B.greenPale:e.status==="In corso"?B.orangePale:B.sandDeep,
                          color:e.status==="Completato"?B.greenDark:e.status==="In corso"?B.orange:B.gray}}>
                          {e.status==="In corso"?"In corso":e.status==="Completato"?"Concluso":"Pianificato"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ADMIN */}
        {tab===5&&(
          <div>
            <div style={{background:B.orangePale,border:`1px solid ${B.orange}44`,borderRadius:10,padding:"9px 13px",marginBottom:14,fontSize:12,color:B.orange,textAlign:"center",fontWeight:"bold"}}>🔐 Pannello Admin — solo Zio Emanuele</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              {[{label:"Utenti",value:"14",icon:"ti-users"},{label:"Leghe",value:"4",icon:"ti-trophy"},{label:"Atlete F",value:"100",icon:"ti-gender-female"},{label:"Atleti M",value:"100",icon:"ti-gender-male"}].map((s,i)=>(
                <div key={i} style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"12px 10px",textAlign:"center"}}>
                  <span style={{fontSize:20}}>{s.icon==="ti-users"?"👥":s.icon==="ti-trophy"?"🏆":s.icon==="ti-gender-female"?"♀":"♂"}</span>
                  <div style={{color:B.orange,fontWeight:"bold",fontSize:22,marginTop:4}}>{s.value}</div>
                  <div style={{color:B.gray,fontSize:11}}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"12px 14px",marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:10}}>Richieste Iscrizione</div>
              {[{user:"WaveRider",team:"The Waves",league:"Market F"},{user:"SandStorm",team:"Sabbia&Vento",league:"Classic M"}].map((req,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i===0?`1px solid ${B.creamDark}`:"none"}}>
                  <div style={{flex:1}}><div style={{color:B.dark,fontWeight:"bold",fontSize:13}}>{req.team}</div><div style={{color:B.gray,fontSize:11}}>{req.user} · {req.league}</div></div>
                  <button onClick={()=>showNotif(`${req.user} approvato!`)} style={{padding:"6px 12px",borderRadius:8,border:"none",background:B.greenPale,color:B.greenDark,fontSize:12,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif"}}>✓ Ok</button>
                  <button onClick={()=>showNotif(`${req.user} rifiutato`,"error")} style={{padding:"6px 12px",borderRadius:8,border:"none",background:B.orangePale,color:B.orange,fontSize:12,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif"}}>✗ No</button>
                </div>
              ))}
            </div>

            <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"12px 14px",marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:"bold",color:B.greenDark,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Sblocco Premi — {mockUsers} utenti</div>
              <div style={{height:6,background:B.grayPale,borderRadius:3,marginBottom:6}}><div style={{height:"100%",borderRadius:3,width:`${Math.min(100,(mockUsers/25)*100)}%`,background:B.orange}}/></div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:B.gray}}><span>10→Borsone</span><span>18→Canotta</span><span>25→AirPods</span></div>
            </div>

            {[
              {icon:"ti-door-enter",title:"Apri/Chiudi Iscrizioni Classic",desc:"Blocca roster Classic",color:B.greenDark,action:()=>{setLeagues(ls=>ls.map(l=>l.type==="classic"?{...l,status:l.status==="OPEN"?"LOCKED":"OPEN"}:l));showNotif("Classic aggiornata!");}},
              {icon:"ti-building-store",title:"Apri/Chiudi Mercato Market",desc:"Attiva finestra compravendite",color:B.orange,action:()=>{setLeagues(ls=>ls.map(l=>l.type==="market"?{...l,marketOpen:!l.marketOpen}:l));showNotif("Market aggiornato!");}},
              {icon:"ti-refresh",title:"Aggiorna Ranking FIPAV",desc:"Sincronizza prezzi",color:B.yellow,action:()=>showNotif("Ranking aggiornato!")},
              {icon:"ti-trophy",title:"Carica Risultati Tappa",desc:"Inserisci match e punti",color:B.greenDark,action:()=>showNotif("In sviluppo!")},
            ].map((item,i)=>(
              <div key={i} style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"11px 13px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:22,flexShrink:0}}>{item.icon==="ti-door-enter"?"🚪":item.icon==="ti-building-store"?"🏪":item.icon==="ti-refresh"?"🔄":item.icon==="ti-trophy"?"🏆":"👥"}</span>
                <div style={{flex:1}}><div style={{color:B.dark,fontWeight:"bold",fontSize:13}}>{item.title}</div><div style={{color:B.gray,fontSize:11,marginTop:1}}>{item.desc}</div></div>
                <button onClick={item.action} style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${item.color}`,background:`${item.color}15`,color:item.color,fontSize:11,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif",flexShrink:0}}>Apri</button>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* HAMBURGER MENU */}
      {showMenu&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex"}}>
          <div onClick={()=>{setShowMenu(false);setMenuSection(null);}} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)"}}/>
          <div style={{position:"relative",width:300,maxWidth:"85vw",height:"100%",background:B.cream,overflowY:"auto",display:"flex",flexDirection:"column"}}>
            <div style={{background:B.sandDark,padding:"20px 16px 14px",borderBottom:`1px solid ${B.sandDeep}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <LogoFull/>
                <button onClick={()=>{setShowMenu(false);setMenuSection(null);}} style={{width:30,height:30,borderRadius:"50%",border:`1px solid ${B.sandDeep}`,background:B.white,cursor:"pointer",fontSize:14,color:B.gray,fontFamily:"Georgia,serif"}}>x</button>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:42,height:42,borderRadius:"50%",background:B.greenDark,display:"flex",alignItems:"center",justifyContent:"center",color:B.white,fontWeight:"bold",fontSize:17}}>Z</div>
                <div>
                  <div style={{fontWeight:"bold",color:B.dark,fontSize:14}}>Zio Emanuele</div>
                  <div style={{color:B.gray,fontSize:11}}>Admin · 4 leghe</div>
                </div>
              </div>
            </div>

            {!menuSection&&(
              <div style={{padding:"8px 0",flex:1}}>
                {[
                  {icon:"ti-user",     label:"Il mio profilo",    sub:"Dati e squadre",        sec:"profile"},
                  {icon:"ti-trophy",   label:"Premi",             sub:"Cosa vinci e scalatura", sec:"prizes"},
                  {icon:"ti-book",     label:"Regole di gioco",   sub:"Punti, bonus e malus",   sec:"rules"},
                  {icon:"ti-calendar", label:"Calendario",        sub:"9 tappe 2026",            sec:"cal"},
                  {icon:"ti-file-text",label:"Termini",           sub:"Regolamento ufficiale",  sec:"terms"},
                ].map((item,i)=>(
                  <button key={i} onClick={()=>item.sec==="cal"?setTab(4)||setShowMenu(false):setMenuSection(item.sec)}
                    style={{width:"100%",padding:"12px 16px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"Georgia,serif",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${B.sandDeep}`,textAlign:"left"}}>
                    <div style={{width:36,height:36,borderRadius:10,background:B.greenPale,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontSize:18}}>{item.icon==="ti-user"?"👤":item.icon==="ti-trophy"?"🏆":item.icon==="ti-book"?"📋":item.icon==="ti-calendar"?"📅":"📄"}</span>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{color:B.dark,fontWeight:"bold",fontSize:13}}>{item.label}</div>
                      <div style={{color:B.gray,fontSize:11,marginTop:1}}>{item.sub}</div>
                    </div>
                    <span style={{color:B.grayLight,fontSize:12}}>›</span>
                  </button>
                ))}
                <button onClick={()=>showNotif("Logout: in sviluppo!")}
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
            )}

            {menuSection==="rules"&&(
              <div style={{padding:"16px",flex:1}}>
                <button onClick={()=>setMenuSection(null)} style={{background:"transparent",border:"none",color:B.gray,cursor:"pointer",fontSize:13,fontFamily:"Georgia,serif",marginBottom:14}}>back</button>
                <div style={{fontWeight:"bold",fontSize:17,color:B.dark,marginBottom:14}}>Regole di Gioco</div>
                <div style={{background:B.white,borderRadius:12,padding:"14px",marginBottom:12,border:`1px solid ${B.creamDark}`}}>
                  <div style={{fontWeight:"bold",fontSize:13,color:B.greenDark,marginBottom:10}}>Punti Base per Partita</div>
                  {[
                    {r:"Vittoria 2-0",p:"+4",c:B.greenDark,bg:B.greenPale},
                    {r:"Vittoria 2-1",p:"+3",c:B.greenDark,bg:B.greenPale},
                    {r:"Sconfitta 1-2",p:"+1",c:B.orange,bg:B.orangePale},
                    {r:"Sconfitta 0-2",p:"0",c:B.gray,bg:B.grayPale},
                  ].map((x,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:i<3?`1px solid ${B.creamDark}`:"none"}}>
                      <span style={{fontSize:13,color:B.dark}}>{x.r}</span>
                      <span style={{fontSize:14,fontWeight:"bold",padding:"2px 10px",borderRadius:8,background:x.bg,color:x.c}}>{x.p} pt</span>
                    </div>
                  ))}
                  <div style={{marginTop:10,padding:"8px 10px",background:B.sandDark,borderRadius:8,fontSize:11,color:B.gray,lineHeight:1.6}}>
                    I punti vengono moltiplicati per il peso tappa: Silver x1.0, Gold x1.3, Coppa Italia x1.5, Finale x1.7
                  </div>
                </div>
                <div style={{fontWeight:"bold",fontSize:13,color:B.dark,marginBottom:8}}>Bonus</div>
                {[
                  {icon:"star",label:"Capitano",sub:"x1.3 ai punti",detail:"1 solo capitano tra i 3 titolari. Punti x1.3. Forfait in una partita: -1 pt. Assente alla tappa: -3 pt."},
                  {icon:"hat",label:"Coach",sub:"Opzionale - $1",detail:"Se il coach e presente e la sua coppia vince: +0.5 pt a partita. Assente al match: -1. Assente alla tappa: -2."},
                  {icon:"fire",label:"Combo",sub:"2+ leghe",detail:"Se sei in almeno 2 leghe partecipi alla Combo. La somma dei punti di tutte le leghe. Super premio se 30+ squadre multi-lega."},
                ].map((b,i)=>(
                  <BonusItem key={i} b={b}/>
                ))}
              </div>
            )}

            {menuSection==="prizes"&&(
              <div style={{padding:"16px",flex:1}}>
                <button onClick={()=>setMenuSection(null)} style={{background:"transparent",border:"none",color:B.gray,cursor:"pointer",fontSize:13,fontFamily:"Georgia,serif",marginBottom:14}}>back</button>
                <div style={{fontWeight:"bold",fontSize:17,color:B.dark,marginBottom:6}}>Premi</div>
                <div style={{fontSize:12,color:B.gray,marginBottom:14,lineHeight:1.6}}>Si sbloccano al raggiungimento del numero minimo di iscritti per lega.</div>
                {[
                  {pos:"1 posto",name:"AirPods 4",icon:"headphones",threshold:25,emoji:"🎧"},
                  {pos:"2 posto",name:"Canotta/Top Nazionale",icon:"shirt",threshold:18,emoji:"👕"},
                  {pos:"3 posto",name:"Borsone Under Armour",icon:"bag",threshold:10,emoji:"🎒"},
                ].map((p,i)=>(
                  <div key={i} style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"14px",marginBottom:10,display:"flex",alignItems:"center",gap:14}}>
                    <div style={{fontSize:42,lineHeight:1}}>{p.emoji}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,color:B.gray,fontWeight:"bold"}}>{p.pos}</div>
                      <div style={{fontSize:14,fontWeight:"bold",color:B.dark,marginTop:2}}>{p.name}</div>
                      <div style={{fontSize:11,color:B.gray,marginTop:4}}>{p.threshold}+ utenti per sbloccare</div>
                    </div>
                  </div>
                ))}
                <div style={{background:B.orangePale,border:`1px solid ${B.orange}44`,borderRadius:12,padding:"14px",marginBottom:10}}>
                  <div style={{fontWeight:"bold",fontSize:14,color:B.orange,marginBottom:6}}>Super Premio Combo</div>
                  <div style={{fontSize:12,color:B.dark,lineHeight:1.7}}>Il vincitore della classifica Combo (min. 30 squadre multi-lega) vince un super premio speciale.</div>
                </div>
                <div style={{background:B.greenPale,border:`1px solid ${B.greenDark}33`,borderRadius:12,padding:"14px"}}>
                  <div style={{fontWeight:"bold",fontSize:13,color:B.greenDark,marginBottom:8}}>Regola Scalatura</div>
                  <div style={{fontSize:12,color:B.dark,lineHeight:1.8}}>
                    Se un utente vince sia una lega che la Combo, riceve solo il premio Combo. La sua posizione nella lega viene scalata: il 2 diventa 1, il 3 diventa 2, il 4 entra in podio.
                  </div>
                  <div style={{marginTop:10,padding:"8px 10px",background:B.white,borderRadius:8,fontSize:11,color:B.gray}}>
                    Es: Marco vince Market M e la Combo: prende il super premio Combo. Il 2 di Market M prende gli AirPods, il 3 prende la canotta, il 4 prende il borsone.
                  </div>
                </div>
              </div>
            )}

            {menuSection==="profile"&&(
              <div style={{padding:"16px",flex:1}}>
                <button onClick={()=>setMenuSection(null)} style={{background:"transparent",border:"none",color:B.gray,cursor:"pointer",fontSize:13,fontFamily:"Georgia,serif",marginBottom:14}}>back</button>
                <div style={{fontWeight:"bold",fontSize:17,color:B.dark,marginBottom:16}}>Il mio profilo</div>
                {[{l:"Username",v:"Zio_Emanuele"},{l:"Email",v:"zio@fantabeach.it"},{l:"Leghe attive",v:"4"},{l:"Squadre",v:"4"}].map((f,i)=>(
                  <div key={i} style={{background:B.white,borderRadius:10,padding:"12px 14px",marginBottom:8,border:`1px solid ${B.creamDark}`}}>
                    <div style={{fontSize:10,color:B.gray,textTransform:"uppercase",letterSpacing:1}}>{f.l}</div>
                    <div style={{fontSize:14,fontWeight:"bold",color:B.dark,marginTop:3}}>{f.v}</div>
                  </div>
                ))}
              </div>
            )}

            {menuSection==="terms"&&(
              <div style={{padding:"16px",flex:1}}>
                <button onClick={()=>setMenuSection(null)} style={{background:"transparent",border:"none",color:B.gray,cursor:"pointer",fontSize:13,fontFamily:"Georgia,serif",marginBottom:14}}>back</button>
                <div style={{fontWeight:"bold",fontSize:17,color:B.dark,marginBottom:16}}>Termini e Condizioni</div>
                {["Il FantaBeach e un gioco fantasy basato sui risultati reali del circuito FIPAV Beach Volley 2026.","La partecipazione e gratuita. I premi fisici vengono consegnati solo se le soglie vengono raggiunte.","I crediti fantasy non hanno valore monetario reale.","L'admin puo correggere errori nei punteggi entro 48h dalla pubblicazione dei risultati.","In caso di dispute, la decisione dell'admin e definitiva."].map((t,i)=>(
                  <div key={i} style={{padding:"10px 0",borderBottom:`1px solid ${B.creamDark}`,fontSize:12,color:B.dark,lineHeight:1.7}}>{i+1}. {t}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`*{box-sizing:border-box;}button,input,select{font-family:Georgia,serif;}input::placeholder{color:${B.grayLight};}::-webkit-scrollbar{display:none;}`}</style>
    </div>
  );
}