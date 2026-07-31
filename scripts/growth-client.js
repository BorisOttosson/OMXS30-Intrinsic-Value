/**
 * Browser-side loader for the generated consensus growth data.
 * Drop into your GitHub Pages site and import it (or include with <script type="module">).
 *
 *   import { loadGrowth, getGrowth5y } from "./scripts/growth-client.js";
 *   const data = await loadGrowth();
 *   const g = getGrowth5y(data, "VOLV-B.ST"); // 0.062 => 6.2 %/yr
 */
const DATA_URL = new URL("../data/growth.json", import.meta.url).href;

let cache = null;

export async function loadGrowth(url = DATA_URL) {
  if (cache) return cache;
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load growth data: HTTP ${res.status}`);
  cache = await res.json();
  return cache;
}

export function getTicker(data, symbol) {
  return data?.tickers?.find((t) => t.symbol === symbol) ?? null;
}

/** 5-year consensus growth as a decimal, or `fallback` if unavailable. */
export function getGrowth5y(data, symbol, fallback = null) {
  const t = getTicker(data, symbol);
  const v = t?.growth5yUsed;
  return typeof v === "number" ? v : fallback;
}

/** Same value formatted as a percentage string, e.g. "6.2 %". */
export function formatGrowth5y(data, symbol) {
  const v = getGrowth5y(data, symbol);
  return v == null ? "n/a" : `${(v * 100).toFixed(1)} %`;
}
