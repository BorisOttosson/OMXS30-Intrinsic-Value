#!/usr/bin/env python3
"""Scrape MarketScreener FCF and EPS history and analyst forecasts for OMXS30.

MarketScreener's /finances/ page carries reported annual FCF and EPS plus the
analyst consensus for the next three fiscal years.
The site sits behind Akamai bot protection, so plain requests from a datacenter
IP get a 403; the fetch therefore goes through Firecrawl.

Auth (either mode works, auto-detected from the key prefix):
  * Direct Firecrawl key  -> FIRECRAWL_API_KEY=fc-...
  * Lovable gateway key   -> FIRECRAWL_API_KEY=lovc-... plus LOVABLE_API_KEY

Output: data/marketscreener-fcf.json
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCRIPT_PATH = Path(__file__).resolve()
ROOT = SCRIPT_PATH.parents[1] if SCRIPT_PATH.parent.name == "scripts" else SCRIPT_PATH.parent
OUTPUT_PATH = ROOT / "data" / "marketscreener-fcf.json"
OFFICIAL_FUNDAMENTALS_PATH = ROOT / "data" / "official-fundamentals.json"

FIRECRAWL_DIRECT_URL = "https://api.firecrawl.dev/v2/scrape"
FIRECRAWL_GATEWAY_URL = "https://connector-gateway.lovable.dev/firecrawl/v2/scrape"

# Stockholm listing on MarketScreener for every OMXS30 constituent.
MARKETSCREENER_URLS: dict[str, str] = {
    "ABB.ST": "https://www.marketscreener.com/quote/stock/ABB-LTD-8943400/",
    "ADDT-B.ST": "https://www.marketscreener.com/quote/stock/ADDTECH-AB-15223809/",
    "ALFA.ST": "https://www.marketscreener.com/quote/stock/ALFA-LAVAL-AB-6494532/",
    "ASSA-B.ST": "https://www.marketscreener.com/quote/stock/ASSA-ABLOY-AB-22363198/",
    "AZN.ST": "https://www.marketscreener.com/quote/stock/ASTRAZENECA-PLC-9065830/",
    "ATCO-A.ST": "https://www.marketscreener.com/quote/stock/ATLAS-COPCO-AB-43306890/",
    "BOL.ST": "https://www.marketscreener.com/quote/stock/BOLIDEN-AB-58808448/",
    "EPI-A.ST": "https://www.marketscreener.com/quote/stock/EPIROC-AB-44292455/",
    "EQT.ST": "https://www.marketscreener.com/quote/stock/EQT-AB-66480635/",
    "ERIC-B.ST": "https://www.marketscreener.com/quote/stock/ERICSSON-6494918/",
    "ESSITY-B.ST": "https://www.marketscreener.com/quote/stock/ESSITY-AB-35897701/",
    "EVO.ST": "https://www.marketscreener.com/quote/stock/EVOLUTION-AB-58808466/",
    "SHB-A.ST": "https://www.marketscreener.com/quote/stock/SVENSKA-HANDELSBANKEN-AB-22252916/",
    "HM-B.ST": "https://www.marketscreener.com/quote/stock/HENNES-MAURITZ-AB-6491104/",
    "HEXA-B.ST": "https://www.marketscreener.com/quote/stock/HEXAGON-AB-6491358/",
    "INDU-C.ST": "https://www.marketscreener.com/quote/stock/INDUSTRIVARDEN-AB-30049542/",
    "INVE-B.ST": "https://www.marketscreener.com/quote/stock/INVESTOR-AB-6491105/",
    "LIFCO-B.ST": "https://www.marketscreener.com/quote/stock/LIFCO-AB-20957320/",
    "NIBE-B.ST": "https://www.marketscreener.com/quote/stock/NIBE-INDUSTRIER-AB-27811937/",
    "NDA-SE.ST": "https://www.marketscreener.com/quote/stock/NORDEA-BANK-ABP-46475558/",
    "SAAB-B.ST": "https://www.marketscreener.com/quote/stock/SAAB-AB-6491624/",
    "SAND.ST": "https://www.marketscreener.com/quote/stock/SANDVIK-AB-6491091/",
    "SCA-B.ST": "https://www.marketscreener.com/quote/stock/SVENSKA-CELLULOSA-AKTIEBO-6491109/",
    "SEB-A.ST": "https://www.marketscreener.com/quote/stock/ENSKILDA-BANKEN-6491107/",
    "SKA-B.ST": "https://www.marketscreener.com/quote/stock/SKANSKA-AB-6491108/",
    "SKF-B.ST": "https://www.marketscreener.com/quote/stock/SKF-AB-6493347/",
    "SWED-A.ST": "https://www.marketscreener.com/quote/stock/SWEDBANK-AB-6496651/",
    "TEL2-B.ST": "https://www.marketscreener.com/quote/stock/TELE2-AB-13247047/",
    "TELIA.ST": "https://www.marketscreener.com/quote/stock/TELIA-COMPANY-AB-6491092/",
    "VOLV-B.ST": "https://www.marketscreener.com/quote/stock/AB-VOLVO-6492152/",
}


def company_id(ticker: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in ticker).strip("-")


def finances_url(base: str) -> str:
    return base.rstrip("/") + "/finances/"


# --------------------------------------------------------------------------- fetch


def firecrawl_scrape(url: str, timeout: int = 180) -> str:
    key = os.environ.get("FIRECRAWL_API_KEY", "").strip()
    if not key:
        raise RuntimeError("FIRECRAWL_API_KEY is not set")

    payload = json.dumps({
        "url": url,
        "formats": ["markdown"],
        "onlyMainContent": True,
    }).encode("utf-8")

    if key.startswith("fc-"):
        endpoint = FIRECRAWL_DIRECT_URL
        headers = {"Authorization": f"Bearer {key}"}
    else:
        lovable_key = os.environ.get("LOVABLE_API_KEY", "").strip()
        if not lovable_key:
            raise RuntimeError("LOVABLE_API_KEY is required for gateway-backed Firecrawl keys")
        endpoint = FIRECRAWL_GATEWAY_URL
        headers = {"Authorization": f"Bearer {lovable_key}", "X-Connection-Api-Key": key}

    headers["Content-Type"] = "application/json"

    # Firecrawl's free tier allows ~10 scrapes/minute; back off instead of failing.
    attempts = 5
    body: dict[str, Any] | None = None
    for attempt in range(1, attempts + 1):
        request = urllib.request.Request(endpoint, data=payload, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                body = json.loads(response.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")[:300]
            retryable = exc.code == 429 or exc.code >= 500
            if not retryable or attempt == attempts:
                raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc
            wait = 20.0
            match = re.search(r"retry after (\d+)", detail, re.I)
            if match:
                wait = float(match.group(1)) + 3.0
            wait *= attempt
            print(f"  rate limited, retrying in {wait:.0f}s ({attempt}/{attempts - 1})")
            time.sleep(wait)

    if body is None:
        raise RuntimeError("no response from Firecrawl")

    data = body.get("data") if isinstance(body.get("data"), dict) else body
    markdown = data.get("markdown")
    if not markdown:
        raise RuntimeError(f"no markdown in response: {str(body)[:200]}")
    return markdown



# --------------------------------------------------------------------------- parse

NUMBER_RE = re.compile(r"^-?[\d,.\s]+$")


def clean_cell(cell: str) -> str:
    cell = re.sub(r"<[^>]+>", " ", cell)
    cell = re.sub(r"\[[^\]]*\]\([^)]*\)", " ", cell)
    return re.sub(r"\s+", " ", cell).strip()


def split_row(line: str) -> list[str]:
    return [clean_cell(c) for c in line.strip().strip("|").split("|")]


def parse_number(cell: str) -> float | None:
    text = cell.replace("\u202f", "").replace("\xa0", "").replace(" ", "").replace(",", "")
    if not text or text in {"-", "--"}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def parse_finances(markdown: str) -> dict[str, Any]:
    """Pull annual FCF and EPS rows with their own fiscal-year headers."""
    lines = markdown.split("\n")
    current_years: list[str] = []
    fcf_years: list[str] = []
    eps_years: list[str] = []
    fcf_row: list[str] | None = None
    eps_row: list[str] | None = None
    fcf_currency: str | None = None
    eps_currency: str | None = None
    unit: str | None = None
    fcf_line_index: int | None = None
    eps_line_index: int | None = None

    for line_index, line in enumerate(lines):
        if not line.lstrip().startswith("|"):
            continue

        cells = split_row(line)
        if not cells:
            continue
        label = cells[0]

        if "Fiscal Period" in label:
            candidate = [c for c in cells[1:] if re.fullmatch(r"(19|20)\d{2}", c)]
            if len(candidate) >= 4:  # annual header, not the quarterly one
                current_years = candidate
            continue

        if re.match(r"^Free Cash Flow", label, re.I) and current_years:
            values = [c for c in cells[1:] if c not in {"", "1"}]
            if len(values) >= len(current_years):
                fcf_years = list(current_years)
                fcf_row = values[: len(current_years)]
                fcf_line_index = line_index

        if re.match(r"^EPS(?:\s|\^|$)", label, re.I) and current_years:
            values = [c for c in cells[1:] if c not in {"", "1"}]
            if len(values) >= len(current_years):
                eps_years = list(current_years)
                eps_row = values[: len(current_years)]
                eps_line_index = line_index

    if not fcf_row and not eps_row:
        raise RuntimeError("neither free cash flow nor EPS row was found")

    # MarketScreener puts the unit footnote immediately below the relevant
    # table. Search locally around the FCF row so an unrelated page currency
    # cannot be mistaken for the cash-flow reporting currency.
    if fcf_line_index is not None:
        nearby = "\n".join(lines[max(0, fcf_line_index - 3): fcf_line_index + 18])
        match = re.search(
            r"\b(SEK|EUR|USD|GBP|DKK|NOK|CHF)\s+in\s+(Million|Billion|Thousand)",
            nearby,
            re.I,
        )
        if match:
            fcf_currency = match.group(1).upper()
            unit = match.group(2).lower()

    # EPS is a per-share figure and has its own nearby currency footnote, such
    # as "1 USD". Do not infer that currency from the FCF table.
    if eps_line_index is not None:
        nearby = "\n".join(lines[eps_line_index: eps_line_index + 10])
        match = re.search(r"\b(SEK|EUR|USD|GBP|DKK|NOK|CHF)\b", nearby, re.I)
        if match:
            eps_currency = match.group(1).upper()

    series = [
        {"year": int(year), "fcf": parse_number(cell)}
        for year, cell in zip(fcf_years, fcf_row or [])
    ]
    eps_series = [
        {"year": int(year), "eps": parse_number(cell)}
        for year, cell in zip(eps_years, eps_row or [])
    ]

    return {
        "currency": fcf_currency,
        "epsCurrency": eps_currency,
        "unit": unit or "million",
        "series": series,
        "epsSeries": eps_series,
    }


def split_actual_forecast(series: list[dict[str, Any]], announcements: int | None = None) -> tuple[list, list]:
    """Reported years come first; MarketScreener appends 3 forecast years."""
    known = [row for row in series if row["fcf"] is not None]
    if len(known) <= 3:
        return known, []
    return known[:-3], known[-3:]


def split_eps_actual_forecast(series: list[dict[str, Any]]) -> tuple[list, list]:
    """Reported EPS years come first; MarketScreener appends 3 estimates."""
    known = [row for row in series if row["eps"] is not None]
    if len(known) <= 3:
        return known, []
    return known[:-3], known[-3:]


def cagr(first: float, last: float, years: int) -> float | None:
    if years <= 0 or first is None or last is None or first <= 0 or last <= 0:
        return None
    rate = (last / first) ** (1.0 / years) - 1.0
    return round(rate, 6) if -0.95 < rate < 2.0 else None


def yoy(series: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out = []
    for previous, current in zip(series, series[1:]):
        a, b = previous["fcf"], current["fcf"]
        growth = round(b / a - 1.0, 6) if a and b and a > 0 else None
        out.append({"year": current["year"], "fcf": b, "growth": growth})
    return out


# --------------------------------------------------------------------------- main


def load_reporting_currency_evidence() -> dict[str, dict[str, str]]:
    manifest = json.loads(OFFICIAL_FUNDAMENTALS_PATH.read_text(encoding="utf-8"))
    return {
        ticker: {
            "currency": str(entry["currency"]).upper(),
            "sourceName": entry["sourceName"],
            "sourceUrl": entry["sourceUrl"],
        }
        for ticker, entry in manifest.get("companies", {}).items()
    }


def apply_currency_evidence(
    payload: dict[str, Any],
    evidence: dict[str, dict[str, str]],
) -> dict[str, Any]:
    """Attach verified reporting currency metadata to every stored row."""
    for row in payload.get("companies", {}).values():
        ticker = row.get("ticker")
        official = evidence.get(ticker)
        if not official:
            raise ValueError(f"{ticker}: official reporting-currency evidence is missing")
        row["currency"] = official["currency"]
        row["reportedCurrency"] = official["currency"]
        row["displayCurrency"] = "SEK"
        existing_evidence = row.get("currencyEvidence", {})
        row["currencyEvidence"] = {
            "method": "Official company report currency cross-check",
            "sourceName": official["sourceName"],
            "sourceUrl": official["sourceUrl"],
            "marketScreenerDetectedCurrency": existing_evidence.get(
                "marketScreenerDetectedCurrency"
            ),
            "marketScreenerDetectedEpsCurrency": existing_evidence.get(
                "marketScreenerDetectedEpsCurrency"
            ),
        }
    payload["currencyPolicy"] = (
        "FCF and EPS values stay in the company's official reporting currency; "
        "the dashboard converts SEK display equivalents with a dated Sveriges Riksbank rate"
    )
    return payload


def build_record(
    ticker: str,
    base_url: str,
    reporting_currency_evidence: dict[str, str],
) -> dict[str, Any]:
    url = finances_url(base_url)
    markdown = firecrawl_scrape(url)
    parsed = parse_finances(markdown)
    reporting_currency = reporting_currency_evidence["currency"]
    if parsed["currency"] and parsed["currency"] != reporting_currency:
        raise RuntimeError(
            f"MarketScreener FCF currency {parsed['currency']} conflicts with "
            f"official-report currency {reporting_currency}"
        )
    if parsed["epsCurrency"] and parsed["epsCurrency"] != reporting_currency:
        raise RuntimeError(
            f"MarketScreener EPS currency {parsed['epsCurrency']} conflicts with "
            f"official-report currency {reporting_currency}"
        )
    actual, forecast = split_actual_forecast(parsed["series"])
    eps_actual, eps_forecast = split_eps_actual_forecast(parsed["epsSeries"])
    if not actual and not forecast and not eps_actual and not eps_forecast:
        raise RuntimeError("no FCF or EPS values published for this company")



    history_cagr = None
    if len(actual) >= 2:
        history_cagr = cagr(actual[0]["fcf"], actual[-1]["fcf"], len(actual) - 1)

    forecast_cagr = None
    if len(forecast) >= 2:
        forecast_cagr = cagr(
            forecast[0]["fcf"],
            forecast[-1]["fcf"],
            len(forecast) - 1,
        )

    forecast_eps_cagr = None
    if len(eps_forecast) >= 2:
        forecast_eps_cagr = cagr(
            eps_forecast[0]["eps"],
            eps_forecast[-1]["eps"],
            len(eps_forecast) - 1,
        )

    return {
        "ticker": ticker,
        "id": company_id(ticker),
        "sourceUrl": url,
        "retrievedAt": datetime.now(timezone.utc).isoformat(),
        # The figures below remain in MarketScreener's source/reporting
        # currency. SEK equivalents are calculated separately from a dated
        # Sveriges Riksbank reference rate; never relabel raw values as SEK.
        "currency": reporting_currency,
        "reportedCurrency": reporting_currency,
        "displayCurrency": "SEK",
        "currencyEvidence": {
            "method": "Official company report currency cross-check",
            "sourceName": reporting_currency_evidence["sourceName"],
            "sourceUrl": reporting_currency_evidence["sourceUrl"],
            "marketScreenerDetectedCurrency": parsed["currency"],
            "marketScreenerDetectedEpsCurrency": parsed["epsCurrency"],
        },
        "unit": parsed["unit"],
        "fcfHistory": actual,
        "fcfForecast": forecast,
        "historyYoy": yoy(actual),
        "forecastYoy": yoy(actual[-1:] + forecast) if actual and forecast else [],
        "historicalFcfCagr": history_cagr,
        "historicalFcfCagrYears": max(len(actual) - 1, 0),
        "consensusFcfCagr": forecast_cagr,
        "consensusYears": [row["year"] for row in forecast],
        "epsHistory": eps_actual,
        "epsForecast": eps_forecast,
        "consensusEpsCagr": forecast_eps_cagr,
        "consensusEpsYears": [row["year"] for row in eps_forecast],
    }


def main() -> int:
    only = {t.upper() for t in sys.argv[1:]} if len(sys.argv) > 1 else None
    rows: list[dict[str, Any]] = []
    failures: list[dict[str, str]] = []
    currency_evidence = load_reporting_currency_evidence()

    for ticker, base_url in MARKETSCREENER_URLS.items():
        if only and ticker not in only:
            continue
        try:
            if ticker not in currency_evidence:
                raise RuntimeError("official reporting-currency evidence is missing")
            record = build_record(ticker, base_url, currency_evidence[ticker])
            rows.append(record)
            hist = record["historicalFcfCagr"]
            cons = record["consensusFcfCagr"]
            eps_cons = record["consensusEpsCagr"]
            print(
                f"v {ticker:<12} history {'n/a' if hist is None else f'{hist * 100:6.1f}%'}"
                f"  consensus {'n/a' if cons is None else f'{cons * 100:6.1f}%'}"
                f"  EPS {'n/a' if eps_cons is None else f'{eps_cons * 100:6.1f}%'}"
                f"  ({len(record['fcfHistory'])}y + {len(record['fcfForecast'])} FCF; "
                f"{len(record['epsForecast'])} EPS estimates)"
            )
        except Exception as exc:  # noqa: BLE001 - collect and continue
            failures.append({"ticker": ticker, "error": str(exc)})
            print(f"x {ticker}: {exc}")
        time.sleep(7.0)  # stay under Firecrawl's per-minute scrape limit

    payload = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "MarketScreener (financials page) via Firecrawl",
        "currencyPolicy": (
            "FCF and EPS values stay in the company's official reporting currency; "
            "the dashboard converts SEK display equivalents with a dated Sveriges Riksbank rate"
        ),
        "consensusFcfCagrPolicy": (
            "CAGR from the first forecast FCF to the third forecast FCF over two fiscal-year intervals"
        ),
        "consensusEpsPolicy": (
            "Three published annual EPS estimates in official reporting currency per share; "
            "their CAGR may extend years four and five in the P/E model"
        ),
        "count": len(rows),
        "failures": failures,
        "companies": {row["id"]: row for row in rows},
    }

    if only and OUTPUT_PATH.exists():  # partial run: merge into the existing file
        existing = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
        merged = existing.get("companies", {})
        merged.update(payload["companies"])
        payload["companies"] = merged
        payload["count"] = len(merged)

    payload = apply_currency_evidence(payload, currency_evidence)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"\nWrote {OUTPUT_PATH} ({len(rows)} ok, {len(failures)} failed)")
    return 0 if rows else 1


if __name__ == "__main__":
    raise SystemExit(main())
