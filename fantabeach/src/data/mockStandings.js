// MOCK — Sostituire con calcolo reale da Google Sheets + Supabase
// TODO: calcolare da FANTA_TEAM_POINTS_EVENT + USER_LEAGUES

const STANDINGS = {
  "L001-F":[
    {rank:1,prev:2,user:"SandQueen",   team:"Le Regine",   pts:342,budget:28},
    {rank:2,prev:1,user:"BeachKing99", team:"Onde Alte",   pts:318,budget:45},
    {rank:3,prev:3,user:"Zio_Emanuele",team:"Fanta Crew F",pts:301,budget:12},
    {rank:4,prev:6,user:"VolleyPro",   team:"Spike Force", pts:287,budget:33},
    {rank:5,prev:4,user:"CoastLine",   team:"Sunset Team", pts:265,budget:67},
  ],
  "L001-M":[
    {rank:1,prev:1,user:"MarcoBeach",  team:"I Dominatori",pts:388,budget:15},
    {rank:2,prev:3,user:"Zio_Emanuele",team:"Fanta Crew M",pts:355,budget:42},
    {rank:3,prev:2,user:"VolleyMaster",team:"Beach Boys",  pts:340,budget:58},
  ],
  "L002-F":[
    {rank:1,prev:2,user:"Zio_Emanuele",team:"Market Queens",pts:412,budget:55},
    {rank:2,prev:1,user:"WaveRider",   team:"Le Imbattibili",pts:398,budget:30},
    {rank:3,prev:4,user:"SandQueen",   team:"Golden Girls",pts:375,budget:88},
  ],
  "L002-M":[
    {rank:1,prev:1,user:"BeachKing99", team:"I Fenomeni",  pts:445,budget:22},
    {rank:2,prev:3,user:"Zio_Emanuele",team:"Market Kings",pts:421,budget:67},
    {rank:3,prev:2,user:"SpikeMaster", team:"Spike & Win", pts:399,budget:44},
  ],
};

export { STANDINGS };
