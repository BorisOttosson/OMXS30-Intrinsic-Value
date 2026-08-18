/**
 * Browser-side loader for the MarketScreener FCF dataset.
 *
 *   import { loadMarketScreener, getFcf } from "./scripts/marketscreener-client.js";
 *   const ms = await loadMarketScreener();
 *   const row = getFcf(ms, "ATCO-A.ST");
 *   row.historicalFcfCagr  // 0.0744  -> 7.4 %/yr reported 5y CAGR
 *   row.consensusFcfCagr   // 0.1213  -> 12.1 %/yr CAGR across the three forecast years
 *   row.sourceUrl          // citation link back to MarketScreener
 */
const DATA_URL = new URL("../data/marketscreener-fcf.json", import.meta.url).href;

let cache = null;

export function companyId(ticker) {
  return String(ticker)
    .split("")
    .map((ch) => (/[a-z0-9]/i.test(ch) ? ch.toLowerCase() : "-"))
    .join("")
    .replace(/^-+|-+$/g, "");
}

export async function loadMarketScreener(url = DATA_URL) {
  if (cache) return cache;
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load MarketScreener data: HTTP ${res.status}`);
  cache = await res.json();
  return cache;
}

export function getFcf(data, ticker) {
  return data?.companies?.[companyId(ticker)] ?? null;
}

/** Reported 5-year FCF CAGR as a decimal. */
export function getHistoricalCagr(data, ticker, fallback = null) {
  const v = getFcf(data, ticker)?.historicalFcfCagr;
  return typeof v === "number" ? v : fallback;
}

/** Consensus FCF CAGR (first forecast year -> final forecast year). */
export function getConsensusCagr(data, ticker, fallback = null) {
  const v = getFcf(data, ticker)?.consensusFcfCagr;
  return typeof v === "number" ? v : fallback;
}

export function formatPercent(value, digits = 1) {
  return typeof value === "number" ? `${(value * 100).toFixed(digits)} %` : "n/a";
}

/** Combined actual + forecast series, tagged so the UI can style them apart. */
export function fcfSeries(data, ticker) {
  const row = getFcf(data, ticker);
  if (!row) return [];
  return [
    ...(row.fcfHistory ?? []).map((r) => ({ ...r, kind: "actual" })),
    ...(row.fcfForecast ?? []).map((r) => ({ ...r, kind: "forecast" })),
  ];
}
