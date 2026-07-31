#!/usr/bin/env node
/**
 * Fetches Yahoo Finance `earningsTrend` for every OMXS30 ticker and writes
 * the 5-year consensus growth rate (period "+5y") to data/growth.json.
 *
 * Run locally:   node scripts/fetch-growth.mjs
 * Run in CI:     see .github/workflows/update-growth.yml
 *
 * No API key required. Yahoo needs a crumb + cookie for quoteSummary, so we
 * bootstrap a session first.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { OMXS30 } from "./omxs30-tickers.mjs";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const MAX_RETRIES = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Get a Yahoo cookie + crumb pair (required by query2 quoteSummary). */
async function getSession() {
  const res = await fetch("https://fc.yahoo.com", { headers: { "User-Agent": UA } });
  const cookie = (res.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(";")[0])
    .join("; ");
  const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    headers: { "User-Agent": UA, cookie },
  });
  const crumb = (await crumbRes.text()).trim();
  if (!crumb) throw new Error("Could not obtain Yahoo crumb");
  return { cookie, crumb };
}

async function fetchEarningsTrend(symbol, sessionRef, attempt = 0) {
  const host = attempt % 2 === 0 ? "query2" : "query1";
  const url =
    `https://${host}.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}` +
    `?modules=earningsTrend&crumb=${encodeURIComponent(sessionRef.current.crumb)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, cookie: sessionRef.current.cookie, accept: "application/json" },
  });

  // 429/401 usually means the cookie+crumb pair went stale — mint a new one and retry.
  if ((res.status === 429 || res.status === 401 || res.status >= 500) && attempt < MAX_RETRIES) {
    const wait = Math.round(1500 * Math.pow(2, attempt) + Math.random() * 500);
    console.warn(`  ↻ ${symbol}: HTTP ${res.status}, refreshing session, retrying in ${wait}ms`);
    await sleep(wait);
    try {
      sessionRef.current = await getSession();
    } catch {
      /* keep the old session and try again anyway */
    }
    return fetchEarningsTrend(symbol, sessionRef, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${symbol}`);

  const json = await res.json();
  const err = json?.quoteSummary?.error;
  if (err) throw new Error(`${symbol}: ${err.description ?? "unknown error"}`);
  return json?.quoteSummary?.result?.[0]?.earningsTrend?.trend ?? [];
}

const raw = (v) => (typeof v?.raw === "number" ? v.raw : null);

/** Map Yahoo's trend array into the growth figures we care about. */
function extractGrowth(trend) {
  const byPeriod = Object.fromEntries(trend.map((t) => [t.period, t]));
  const g = (p) => raw(byPeriod[p]?.growth);
  const analysts = (p) =>
    raw(byPeriod[p]?.earningsEstimate?.numberOfAnalysts) ??
    raw(byPeriod[p]?.revenueEstimate?.numberOfAnalysts) ??
    null;

  return {
    // Long-term consensus: next 5 years, per annum
    growth5y: g("+5y"),
    growthPast5y: g("-5y"),
    growthCurrentYear: g("0y"),
    growthNextYear: g("+1y"),
    analystsNextYear: analysts("+1y"),
  };
}

/** Fallback when Yahoo has no "+5y": geometric blend of 0y/+1y estimates. */
function fallbackGrowth(x) {
  const parts = [x.growthCurrentYear, x.growthNextYear].filter(
    (v) => typeof v === "number" && v > -0.95 && v < 2,
  );
  if (!parts.length) return null;
  const compounded = parts.reduce((acc, v) => acc * (1 + v), 1);
  return Math.pow(compounded, 1 / parts.length) - 1;
}

async function main() {
  const sessionRef = { current: await getSession() };
  const tickers = [];
  const failures = [];

  for (const { symbol, name } of OMXS30) {
    try {
      const trend = await fetchEarningsTrend(symbol, sessionRef);
      const g = extractGrowth(trend);
      const estimated = g.growth5y == null;
      tickers.push({
        symbol,
        name,
        ...g,
        // Value the model should use, as a decimal (0.085 = 8.5 %/yr)
        growth5yUsed: g.growth5y ?? fallbackGrowth(g),
        growth5ySource: estimated ? "derived-from-0y-1y" : "yahoo-consensus",
      });
      console.log(
        `✓ ${symbol.padEnd(11)} 5y=${g.growth5y != null ? (g.growth5y * 100).toFixed(1) + "%" : "n/a"}`,
      );
    } catch (e) {
      failures.push({ symbol, error: String(e.message ?? e) });
      console.warn(`✗ ${symbol}: ${e.message ?? e}`);
    }
    await sleep(400); // be polite / avoid rate limiting
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    source: "Yahoo Finance quoteSummary/earningsTrend",
    count: tickers.length,
    failures,
    tickers,
  };

  await mkdir("data", { recursive: true });
  await writeFile("data/growth.json", JSON.stringify(payload, null, 2) + "\n");
  console.log(`\nWrote data/growth.json (${tickers.length} ok, ${failures.length} failed)`);

  if (!tickers.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
