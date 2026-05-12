// MOCK — Sostituire con lettura da Google Sheets EVENTS_DB
// TODO: fetch da /api/sheets?range=EVENTS_DB

const EVENTS = [
  { id:"E0001",name:"Falconara F",type:"Silver",weight:1.0,date:"12-14 giu",gender:"F",status:"Completato" },
  { id:"E0002",name:"Falconara M",type:"Silver",weight:1.0,date:"12-14 giu",gender:"M",status:"Completato" },
  { id:"E0003",name:"Termoli F",  type:"Gold",  weight:1.3,date:"19-21 giu",gender:"F",status:"In corso"   },
  { id:"E0004",name:"Termoli M",  type:"Gold",  weight:1.3,date:"19-21 giu",gender:"M",status:"Planned"    },
  { id:"E0005",name:"Marina di Ravenna F",type:"Silver",weight:1.0,date:"3-5 lug",gender:"F",status:"Planned"},
  { id:"E0006",name:"Marina di Ravenna M",type:"Silver",weight:1.0,date:"3-5 lug",gender:"M",status:"Planned"},
  { id:"E0007",name:"Marina di Modica M", type:"Gold",  weight:1.5,date:"10-12 lug",gender:"M",status:"Planned"},
];

const MOCK_MATCHES = {
  "E0001":[
    {phase:"Qualifiche 1",teamA:"Gottardi V. - Orsi Toth R.",teamB:"Rastelli G. - Tamagnone G.",scoreA:"21-9 21-5",result:"2-0",ptsA:4,ptsB:0},
    {phase:"Qualifiche 1",teamA:"Scampoli C. - Massi V.",teamB:"Panfili L. - D\'Arrigo C.",scoreA:"21-12 21-5",result:"2-0",ptsA:4,ptsB:0},
    {phase:"Pool 1",teamA:"Gottardi V. - Orsi Toth R.",teamB:"Bertozzi N. - Mazzotti B.",scoreA:"21-10 21-15",result:"2-0",ptsA:4,ptsB:0},
    {phase:"Pool 1",teamA:"Bianchi G. - Scampoli C.",teamB:"Barboni A. - Cicola L.",scoreA:"15-21 21-16 12-15",result:"1-2",ptsA:1,ptsB:3},
    {phase:"BYE Pool",teamA:"Gottardi V. - Orsi Toth R.",teamB:"—",scoreA:"21-0 21-0",result:"2-0",ptsA:4,ptsB:0},
    {phase:"Quarti",teamA:"Gottardi V. - Orsi Toth R.",teamB:"Mattavelli A. - Tega M.",scoreA:"21-14 17-21 16-14",result:"2-1",ptsA:3,ptsB:1},
    {phase:"Semifinale",teamA:"Gradini A. - Frasca F.",teamB:"Bianchi G. - Scampoli C.",scoreA:"21-19 23-21",result:"2-0",ptsA:4,ptsB:0},
    {phase:"Semifinale",teamA:"Gottardi V. - Orsi Toth R.",teamB:"Barboni A. - Cicola L.",scoreA:"21-9 21-17",result:"2-0",ptsA:4,ptsB:0},
    {phase:"Finale 1°",teamA:"Gottardi V. - Orsi Toth R.",teamB:"Gradini A. - Frasca F.",scoreA:"21-17 21-15",result:"2-0",ptsA:4,ptsB:0},
  ],
};

export { EVENTS, MOCK_MATCHES };
