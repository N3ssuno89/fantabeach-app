// MOCK — Sostituire con lettura da Google Sheets COACHES_DB
// TODO: fetch da /api/sheets?range=COACHES_DB

const COACHES = [
  { id:"C001", name:"Ettore Marcovecchio", athletes:["W0001","W0002"], cost:1 },
  { id:"C002", name:"Alessandro Martino",  athletes:["W0003","W0004"], cost:1 },
  { id:"C003", name:"Marco Solustri",      athletes:["W0005","W0006"], cost:1 },
  { id:"C004", name:"Andrea Lupo",         athletes:["M0001","M0002"], cost:1 },
  { id:"C005", name:"Roberto Damiani",     athletes:["M0003","M0004"], cost:1 },
];

export { COACHES };
