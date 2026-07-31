#!/usr/bin/env python3
"""Fetch 5-year growth estimates for OMXS30 from Yahoo Finance via yfinance.

Uses the same library as scripts/update_prices.py, which already works from
GitHub Actions runners (yfinance handles Yahoo's cookie/crumb session and
retries, which raw HTTP requests do not).

Priority per ticker:
  1. Yahoo analyst long-term consensus  (growth estimates, period "+5y")
  2. Geometric blend of the 0y / +1y consensus estimates
  3. Historical 5-year free-cash-flow CAGR from the cash-flow statement

Output: data/growth.json
"""

from __future__ import annotations

import json
import math
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yfinance as yf

try:
    from update_data import OMXS30  # type: ignore
except ImportError:
    ROOT_FOR_IMPORT = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(ROOT_FOR_IMPORT))
    try:
        from update_data import OMXS30  # type: ignore
    except ImportError:
        OMXS30 = None

SCRIPT_PATH = Path(__file__).resolve()
ROOT = SCRIPT_PATH.parents[1] if SCRIPT_PATH.parent.name == "scripts" else SCRIPT_PATH.parent
OUTPUT_PATH = ROOT / "data" / "growth.json"

FALLBACK_TICKERS = [
    "ABB.ST", "ALFA.ST", "ASSA-B.ST", "AZN.ST", "ATCO-A.ST", "ATCO-B.ST",
    "BOL.ST", "ELUX-B.ST", "ERIC-B.ST", "ESSITY-B.ST", "EVO.ST", "GETI-B.ST",
    "HM-B.ST", "HEXA-B.ST", "INVE-B.ST", "KINV-B.ST", "NDA-SE.ST", "NIBE-B.ST",
    "SAAB-B.ST", "SAND.ST", "SCA-B.ST", "SEB-A.ST", "SHB-A.ST", "SINCH.ST",
    "SKF-B.ST", "SWED-A.ST", "TEL2-B.ST", "TELIA.ST", "VOLV-B.ST", "SBB-B.ST",
]


def ticker_list() -> list[str]:
    """Reuse the project's canonical OMXS30 list when available."""
    if OMXS30 is None:
        return FALLBACK_TICKERS
    out: list[str] = []
    for entry in OMXS30:
        if isinstance(entry, str):
            out.append(entry)
        elif isinstance(entry, dict):
            symbol = entry.get("ticker") or entry.get("symbol") or entry.get("yahoo")
            if symbol:
                out.append(symbol)
        else:
            symbol = getattr(entry, "ticker", None) or getattr(entry, "symbol", None)
            if symbol:
                out.append(symbol)
    return out or FALLBACK_TICKERS


def finite(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number) or math.isinf(number):
        return None
    return number


def as_rate(value: Any) -> float | None:
    """Yahoo returns growth as a decimal (0.085). Some rows come back in %."""
    number = finite(value)
    if number is None:
        return None
    if abs(number) > 1.5:  # clearly a percentage figure
        number = number / 100.0
    return number if -0.95 < number < 1.5 else None


def growth_estimates(ticker: yf.Ticker) -> dict[str, float | None]:
    """Read the analyst growth table (index: 0q, +1q, 0y, +1y, +5y, -5y)."""
    out: dict[str, float | None] = {}
    try:
        table = ticker.growth_estimates
    except Exception:
        return out
    if table is None or getattr(table, "empty", True):
        return out

    column = None
    for candidate in ("stockTrend", "growth", "stock"):
        if candidate in table.columns:
            column = candidate
            break
    if column is None:
        column = table.columns[0]

    for period in ("0y", "+1y", "+5y", "-5y"):
        if period in table.index:
            out[period] = as_rate(table.loc[period, column])
    return out


def blended_short_term(estimates: dict[str, float | None]) -> float | None:
    parts = [v for k, v in estimates.items() if k in ("0y", "+1y") and v is not None]
    if not parts:
        return None
    compounded = 1.0
    for value in parts:
        compounded *= 1.0 + value
    return compounded ** (1.0 / len(parts)) - 1.0


def fcf_cagr(ticker: yf.Ticker) -> float | None:
    """5-year CAGR of free cash flow from the annual cash-flow statement."""
    try:
        statement = ticker.cashflow
    except Exception:
        return None
    if statement is None or getattr(statement, "empty", True):
        return None

    row = None
    for label in ("Free Cash Flow", "FreeCashFlow"):
        if label in statement.index:
            row = statement.loc[label]
            break
    if row is None:
        op = next((statement.loc[l] for l in ("Operating Cash Flow", "Total Cash From Operating Activities")
                   if l in statement.index), None)
        capex = next((statement.loc[l] for l in ("Capital Expenditure", "Capital Expenditures")
                      if l in statement.index), None)
        if op is None:
            return None
        row = op + capex if capex is not None else op

    # Columns are dated newest-first; oldest -> newest
    series = [finite(v) for v in reversed(list(row.values))]
    series = [v for v in series if v is not None]
    if len(series) < 2:
        return None

    first, last = series[0], series[-1]
    if first <= 0 or last <= 0:  # CAGR is meaningless across a sign change
        return None
    years = len(series) - 1
    rate = (last / first) ** (1.0 / years) - 1.0
    return rate if -0.95 < rate < 1.5 else None


def main() -> int:
    tickers = ticker_list()
    rows: list[dict[str, Any]] = []
    failures: list[dict[str, str]] = []

    for symbol in tickers:
        try:
            handle = yf.Ticker(symbol)
            est = growth_estimates(handle)

            used: float | None = est.get("+5y")
            source = "yahoo-consensus-5y" if used is not None else None

            if used is None:
                used = blended_short_term(est)
                if used is not None:
                    source = "yahoo-derived-from-0y-1y"

            historical = fcf_cagr(handle)
            if used is None and historical is not None:
                used = historical
                source = "historical-fcf-cagr"

            if used is None:
                failures.append({"symbol": symbol, "error": "no growth data on Yahoo"})
                print(f"x {symbol}: no growth data")
            else:
                rows.append({
                    "symbol": symbol,
                    "growth5y": est.get("+5y"),
                    "growthPast5y": est.get("-5y"),
                    "growthCurrentYear": est.get("0y"),
                    "growthNextYear": est.get("+1y"),
                    "historicalFcfCagr": historical,
                    "growth5yUsed": round(used, 6),
                    "growth5ySource": source,
                })
                print(f"v {symbol:<11} {used * 100:6.1f}%  ({source})")
        except Exception as exc:  # noqa: BLE001 - keep going, report at the end
            failures.append({"symbol": symbol, "error": str(exc)})
            print(f"x {symbol}: {exc}")

        time.sleep(1.0)  # be gentle with Yahoo

    payload = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "Yahoo Finance via yfinance (growth estimates + cash-flow statement)",
        "count": len(rows),
        "failures": failures,
        "tickers": rows,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"\nWrote {OUTPUT_PATH} ({len(rows)} ok, {len(failures)} failed)")

    return 0 if rows else 1


if __name__ == "__main__":
    raise SystemExit(main())
