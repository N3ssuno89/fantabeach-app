// App-wide constants
// Usage: import { TABS, PRICE_RANGES, EVENT_TYPE_META } from '@/config/constants'

export const TABS = [
  { id:0, emoji:"🏪", label:"Mercato"    },
  { id:1, emoji:"👕", label:"Squadra"    },
  { id:2, emoji:"🏆", label:"Classifica" },
  { id:3, emoji:"🏐", label:"Atleta"     },
  { id:4, emoji:"📅", label:"Calendario" },
  { id:5, emoji:"⚙️", label:"Admin"      },
];

export const EVENT_TYPE_META = {
  Silver:      { label:"Silver",       weight:1.0, color:"#3D7A69", bg:"#EAF3EF" },
  Gold:        { label:"Gold",         weight:1.3, color:"#B8860B", bg:"#FEF7E8" },
  CoppaItalia: { label:"Coppa Italia", weight:1.5, color:"#D94F1E", bg:"#FDF0EB" },
  Finale:      { label:"Finale",       weight:1.7, color:"#7C3AED", bg:"#F3E8FF" },
};

export const PRICE_RANGES = [
  { label:"Tutti",    filter:()=>true         },
  { label:">$100",   filter:a=>a.cost>100     },
  { label:"$50–99",  filter:a=>a.cost>=50&&a.cost<=99 },
  { label:"<$50",    filter:a=>a.cost<50      },
];

export const CATEGORIES = [
  { label:"Top Player",  range:[1,5],    color:"#7A4F00", bg:"#FEF7E8" },
  { label:"Elite",       range:[6,15],   color:"#5B21B6", bg:"#EDE9FE" },
  { label:"Solid Pick",  range:[16,30],  color:"#065F46", bg:"#D1FAE5" },
  { label:"Value Pick",  range:[31,50],  color:"#9A3412", bg:"#FED7AA" },
  { label:"Outsider",    range:[51,70],  color:"#374151", bg:"#F3F4F6" },
  { label:"Wild Card",   range:[71,9999],color:"#6B7280", bg:"#F9FAFB" },
];

export const PRICE_TABLE = [
  140,135,130,125,120,117,114,112,111,109,
  107,105,103,101,99,97,94,91,88,85,
  82,79,76,73,70,68,66,64,62,60,
  58,56,54,52,50,48,46,44,42,40,
  38,36,34,32,30,28,26,24,22,20,
  19,18,17,16,15,14,13,12,11,10,
  9,8,7,6,5,4,3,2,1,1,
];

export const BUDGET_INITIAL = 400;
export const ROSTER_MAX = 5;
export const STARTERS_MAX = 3;
export const MARKET_OPEN_DAY = 1;  // Monday (0=Sun)
export const MARKET_CLOSE_DAY = 4; // Thursday (0=Sun)
export const MARKET_CLOSE_HOUR = 23;
