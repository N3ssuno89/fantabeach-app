// ─────────────────────────────────────────────────────────────
// UTILS — Funzioni di utilità riusabili
// ─────────────────────────────────────────────────────────────
import { CATEGORIES, PRICE_TABLE } from '@/config/constants';

/**
 * Restituisce la categoria di un atleta in base al ranking
 */
export function getCategory(ranking) {
  return CATEGORIES.find(c => ranking >= c.range[0] && ranking <= c.range[1]) || CATEGORIES[5];
}

/**
 * Calcola il prezzo di un atleta da ranking FIPAV
 */
export function priceFromRanking(ranking) {
  return PRICE_TABLE[Math.min(ranking - 1, PRICE_TABLE.length - 1)];
}

/**
 * Calcola i punti fantasy per un risultato partita
 * @param {string} result - "2-0" | "2-1" | "1-2" | "0-2" | "BYE"
 * @param {number} weight - Moltiplicatore tappa (1.0 / 1.3 / 1.5 / 1.7)
 * @param {boolean} isCaptain - Se l'atleta è capitano (×1.3)
 * @returns {number} Punti totali arrotondati a 1 decimale
 */
export function calcPoints(result, weight = 1.0, isCaptain = false) {
  const base = { "2-0": 4, "2-1": 3, "1-2": 1, "0-2": 0, "BYE": 4 };
  const pts = (base[result] ?? 0) * weight * (isCaptain ? 1.3 : 1);
  return Math.round(pts * 10) / 10;
}

/**
 * Controlla se il mercato è attualmente aperto
 * Lun 09:00 – Gio 23:00
 */
export function isMarketOpen() {
  const now = new Date();
  const day = now.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mer, 4=Gio
  const hour = now.getHours();
  if (day === 1 && hour >= 9) return true;
  if (day === 2 || day === 3) return true;
  if (day === 4 && hour < 23) return true;
  return false;
}

/**
 * Formatta un numero come credito: "$140"
 */
export function formatCredits(n) {
  return `$${n}`;
}

/**
 * Restituisce la variazione di prezzo rispetto al costo precedente
 */
export function priceDiff(cost, prevCost) {
  return cost - prevCost;
}
