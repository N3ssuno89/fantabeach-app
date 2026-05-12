// MOCK — Sostituire con lettura da Supabase user_leagues
// TODO: fetch da Supabase: select * from user_leagues where user_id = auth.uid()

const LEAGUES_INIT = [
  { id:"L001-F", name:"Classic F", type:"classic", gender:"F", status:"OPEN",   marketOpen:false },
  { id:"L001-M", name:"Classic M", type:"classic", gender:"M", status:"OPEN",   marketOpen:false },
  { id:"L002-F", name:"Market F",  type:"market",  gender:"F", status:"LOCKED", marketOpen:true  },
  { id:"L002-M", name:"Market M",  type:"market",  gender:"M", status:"LOCKED", marketOpen:false },
];

// Stato iscrizione utente per lega (mock - verra da Supabase)
// TODO: fetch da Supabase
const INIT_JOIN = {"L001-F":"APPROVED","L001-M":null,"L002-F":"PENDING","L002-M":null};

export { LEAGUES_INIT, INIT_JOIN };
