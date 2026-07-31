#!/usr/bin/env node
/**
 * Builds data/growth.json with a 5-year growth rate per OMXS30 ticker.
 *
 * Sources, in order:
 *   1. Finnhub  /stock/metric  (epsGrowth5Y, focfCagr5Y, revenueGrowth5Y)
 *      -> works from GitHub Actions runners. Needs FINNHUB_API_KEY (free tier).
 *   2. Yahoo    quoteSummary/earningsTrend  ("+5y" consensus)
 *      -> best data, but Yahoo rate-limits datacenter IPs (HTTP 429),
 *         so it usually only succeeds when run locally.
 *
 * Run locally:   node scripts/fetch-growth.mjs
 * Run in CI:     see .github/workflows/update-growth.yml
 */
import { writeFile, mkdir } from "node:fs/promises";
import { OMXS30 } from "./omxs30-tickers.mjs";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const FINNHUB_KEY = process.env.FINNHUB_API_KEY ?? "";
const MAX_RETRIES = 3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Finnhub                                                             */
/* ------------------------------------------------------------------ */

/** Yahoo uses "VOLV-B.ST", Finnhub uses "VOLV_B.ST". */
const toFinnhub = (symbol) => symbol.replace(/-/g, "_");

const pct = (v) => (typeof v === "number" && Number.isFinite(v) ? v / 100 : null);

async function fetchFinnhub(symbol) {
  const url =
    `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(toFinnhub(symbol))}` +
    `&metric=all&token=${encodeURIComponent(FINNHUB_KEY)}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (res.status === 429) {
    await sleep(2000);
    return fetchFinnhub(symbol);
  }
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
  const m = (await res.json())?.metric ?? {};

  // Prefer free-cash-flow CAGR (matches a DCF model), then EPS, then revenue.
  const focf = pct(m.focfCagr5Y);
  const eps = pct(m.epsGrowth5Y);
  const rev = pct(m.revenueGrowth5Y);
  const chosen = [focf, eps, rev].find((v) => v != null && v > -0.95 && v < 1.5) ?? null;

  return {
    growth5y: chosen,
    source:
      chosen == null
        ? null
        : chosen === focf
          ? "finnhub-focf-cagr-5y"
          : chosen === eps
            ? "finnhub-eps-growth-5y"
            : "finnhub-revenue-growth-5y",
    detail: { focfCagr5y: focf, epsGrowth5y: eps, revenueGrowth5y: rev },
  };
}

/* ------------------------------------------------------------------ */
/* Yahoo                                                               */
/* ------------------------------------------------------------------ */

async function getSession() {
  const res = await fetch("https://fc.yahoo.com", { headers: { "User-Agent": UA } });
  const cookie = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
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

  if ((res.status === 429 || res.status === 401 || res.status >= 500) && attempt < MAX_RETRIES) {
    await sleep(Math.round(1200 * Math.pow(2, attempt) + Math.random() * 400));
    try {
      sessionRef.current = await getSession();
    } catch {
      /* keep old session */
    }
    return fetchEarningsTrend(symbol, sessionRef, attempt + 1);
  }
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);

  const json = await res.json();
  if (json?.quoteSummary?.error) throw new Error(json.quoteSummary.error.description ?? "error");
  return json?.quoteSummary?.result?.[0]?.earningsTrend?.trend ?? [];
}

const raw = (v) => (typeof v?.raw === "number" ? v.raw : null);

function extractYahoo(trend) {
  const byPeriod = Object.fromEntries(trend.map((t) => [t.period, t]));
  const g = (p) => raw(byPeriod[p]?.growth);
  return {
    growth5y: g("+5y"),
    growthPast5y: g("-5y"),
    growthCurrentYear: g("0y"),
    growthNextYear: g("+1y"),
    analystsNextYear:
      raw(byPeriod["+1y"]?.earningsEstimate?.numberOfAnalysts) ??
      raw(byPeriod["+1y"]?.revenueEstimate?.numberOfAnalysts) ??
      null,
  };
}

/** Geometric blend of the 0y/+1y estimates when no long-term figure exists. */
function fallbackGrowth(x) {
  const parts = [x.growthCurrentYear, x.growthNextYear].filter(
    (v) => typeof v === "number" && v > -0.95 && v < 2,
  );
  if (!parts.length) return null;
  const compounded = parts.reduce((acc, v) => acc * (1 + v), 1);
  return Math.pow(compounded, 1 / parts.length) - 1;
}

/* ------------------------------------------------------------------ */

async function main() {
  const tickers = [];
  const failures = [];

  let sessionRef = null;
  const yahooEnabled = process.env.SKIP_YAHOO !== "1";
  if (yahooEnabled) {
    try {
      sessionRef = { current: await getSession() };
    } catch (e) {
      console.warn(`Yahoo session unavailable: ${e.message ?? e}`);
    }
  }
  if (!FINNHUB_KEY) {
    console.warn("FINNHUB_API_KEY is not set — Finnhub source disabled.");
  }

  for (const { symbol, name } of OMXS30) {
    const row = { symbol, name };
    const errors = [];

    // 1) Yahoo consensus (best, but often blocked in CI)
    if (sessionRef) {
      try {
        const y = extractYahoo(await fetchEarningsTrend(symbol, sessionRef));
        Object.assign(row, y);
        if (y.growth5y != null) {
          row.growth5yUsed = y.growth5y;
          row.growth5ySource = "yahoo-consensus";
        } else {
          const fb = fallbackGrowth(y);
          if (fb != null) {
            row.growth5yUsed = fb;
            row.growth5ySource = "yahoo-derived-from-0y-1y";
          }
        }
      } catch (e) {
        errors.push(`yahoo: ${e.message ?? e}`);
      }
    }

    // 2) Finnhub fallback
    if (row.growth5yUsed == null && FINNHUB_KEY) {
      try {
        const f = await fetchFinnhub(symbol);
        row.finnhub = f.detail;
        if (f.growth5y != null) {
          row.growth5yUsed = f.growth5y;
          row.growth5ySource = f.source;
        }
      } catch (e) {
        errors.push(`finnhub: ${e.message ?? e}`);
      }
      await sleep(1100); // free tier: 60 calls/min
    }

    if (row.growth5yUsed == null) {
      failures.push({ symbol, error: errors.join(" | ") || "no growth data from any source" });
      console.warn(`✗ ${symbol}: ${errors.join(" | ") || "no data"}`);
    } else {
      tickers.push(row);
      console.log(
        `✓ ${symbol.padEnd(11)} ${(row.growth5yUsed * 100).toFixed(1)}%  (${row.growth5ySource})`,
      );
    }
    if (sessionRef) await sleep(300);
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    sources: ["Yahoo Finance quoteSummary/earningsTrend", "Finnhub stock/metric"],
    count: tickers.length,
    failures,
    tickers,
  };

  await mkdir("data", { recursive: true });
  await writeFile("data/growth.json", JSON.stringify(payload, null, 2) + "\n");
  console.log(`\nWrote data/growth.json (${tickers.length} ok, ${failures.length} failed)`);

  if (!tickers.length) {
    console.error(
      "No data from any source. Set the FINNHUB_API_KEY repository secret (free key at finnhub.io), " +
        "or run this script locally where Yahoo is not rate-limited.",
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
