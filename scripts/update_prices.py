#!/usr/bin/env python3
"""Fetch OMXS30 share prices from Yahoo Finance for frequent quote updates."""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, time as day_time, timedelta, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

SCRIPT_PATH = Path(__file__).resolve()
ROOT = SCRIPT_PATH.parents[1] if SCRIPT_PATH.parent.name == "scripts" else SCRIPT_PATH.parent
OUTPUT_PATH = ROOT / "data" / "prices.json"
STOCKHOLM_TZ = ZoneInfo("Europe/Stockholm")
PRICE_WINDOW_START = day_time(9, 0)
PRICE_WINDOW_END = day_time(17, 30)
PRICE_SLOT_TOLERANCE_MINUTES = 6
PRICE_UPDATE_SLOTS = [
    day_time(9, 1), day_time(9, 25), day_time(9, 49),
    day_time(10, 13), day_time(10, 37),
    day_time(11, 1), day_time(11, 25), day_time(11, 49),
    day_time(12, 13), day_time(12, 37),
    day_time(13, 1), day_time(13, 25), day_time(13, 49),
    day_time(14, 13), day_time(14, 37),
    day_time(15, 1), day_time(15, 25), day_time(15, 49),
    day_time(16, 13), day_time(16, 37),
]


def company_id(ticker: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in ticker).strip("-")


def load_omxs30_universe() -> list[tuple[str, str, str]]:
    """Use the checked-in price snapshot as the canonical 30-company universe."""
    payload = json.loads((ROOT / "data" / "prices.json").read_text(encoding="utf-8"))
    rows = payload.get("companies")
    if not isinstance(rows, list) or len(rows) != 30:
        raise RuntimeError("data/prices.json must contain the 30-company OMXS30 universe")
    return [(str(row["ticker"]), str(row["name"]), str(row["sector"])) for row in rows]


def finite(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number == number and abs(number) != float("inf") else None


def clean(value: Any) -> Any:
    if isinstance(value, float):
        return round(value, 6)
    return value


def should_run_price_update(now: datetime) -> bool:
    local = now.astimezone(STOCKHOLM_TZ)
    local_time = local.time().replace(second=0, microsecond=0)
    return local.weekday() < 5 and PRICE_WINDOW_START <= local_time <= PRICE_WINDOW_END


def should_run_price_slot(now: datetime) -> bool:
    if not should_run_price_update(now):
        return False

    local = now.astimezone(STOCKHOLM_TZ)
    local_minute = local.replace(second=0, microsecond=0)
    tolerance = timedelta(minutes=PRICE_SLOT_TOLERANCE_MINUTES)

    for slot in PRICE_UPDATE_SLOTS:
        slot_time = local_minute.replace(hour=slot.hour, minute=slot.minute)
        if abs(local_minute - slot_time) <= tolerance:
            return True
    return False


def fast_info_value(fast_info: Any, key: str) -> Any:
    try:
        return fast_info.get(key)
    except Exception:
        try:
            return getattr(fast_info, key)
        except Exception:
            return None


def fetch_yahoo_quote(
    yf: Any,
    ticker: str,
    *,
    include_pe: bool = True,
    existing_quote: dict[str, Any] | None = None,
) -> dict[str, Any]:
    ticker_obj = yf.Ticker(ticker)
    fast_info = ticker_obj.fast_info

    price = (
        finite(fast_info_value(fast_info, "lastPrice"))
        or finite(fast_info_value(fast_info, "last_price"))
        or finite(fast_info_value(fast_info, "regularMarketPrice"))
    )
    previous_close = (
        finite(fast_info_value(fast_info, "regularMarketPreviousClose"))
        or finite(fast_info_value(fast_info, "previousClose"))
        or finite(fast_info_value(fast_info, "previous_close"))
    )
    currency = fast_info_value(fast_info, "currency") or "SEK"

    if price is None:
        history = ticker_obj.history(period="5d", interval="1d", auto_adjust=False)
        if history is None or getattr(history, "empty", True):
            raise ValueError(f"No Yahoo price returned for {ticker}")
        closes = [finite(value) for value in history["Close"].tolist()]
        closes = [value for value in closes if value is not None]
        if not closes:
            raise ValueError(f"No Yahoo close price returned for {ticker}")
        price = closes[-1]
        if previous_close is None and len(closes) > 1:
            previous_close = closes[-2]

    existing_quote = existing_quote or {}
    trailing_eps = finite(existing_quote.get("trailingEps"))
    yahoo_trailing_pe = finite(existing_quote.get("trailingPe"))
    pe_error = None
    if include_pe:
        try:
            info = ticker_obj.info or {}
            trailing_eps = finite(info.get("trailingEps"))
            yahoo_trailing_pe = finite(info.get("trailingPE"))
        except Exception as exc:  # Keep the current price usable if this endpoint fails.
            pe_error = str(exc)

    trailing_pe = price / trailing_eps if trailing_eps is not None and trailing_eps > 0 else None
    pe_calculation = "Market price / Yahoo Finance trailing EPS" if trailing_pe is not None else None
    pe_source = "Calculated from Yahoo Finance price and trailing EPS" if trailing_pe is not None else None
    if trailing_pe is None and yahoo_trailing_pe is not None and yahoo_trailing_pe > 0:
        trailing_pe = yahoo_trailing_pe
        pe_source = existing_quote.get("peSource") or "Yahoo Finance reported trailing P/E"
    pe_updated_at = (
        datetime.now(timezone.utc).isoformat()
        if trailing_pe is not None and (include_pe or trailing_eps is not None)
        else existing_quote.get("peUpdatedAt")
    )

    return {
        "quoteTicker": ticker,
        "marketPrice": price,
        "previousClose": previous_close,
        "currency": currency,
        "priceUpdatedAt": datetime.now(timezone.utc).isoformat(),
        "trailingEps": trailing_eps,
        "trailingPe": trailing_pe,
        "peCalculation": pe_calculation,
        "peSource": pe_source,
        "peUpdatedAt": pe_updated_at,
        "peError": pe_error,
    }


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Update OMXS30 prices from Yahoo Finance via yfinance.")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH, help="JSON output path")
    parser.add_argument("--delay", type=float, default=0.08, help="Delay between quote requests in seconds")
    parser.add_argument("--enforce-market-window", action="store_true", help="Only run from 09:00 to 17:30 Europe/Stockholm on weekdays")
    parser.add_argument("--enforce-price-slots", action="store_true", help="Only run on the 20 planned Stockholm trading-day price slots")
    parser.add_argument(
        "--prices-only",
        action="store_true",
        help="Refresh prices quickly and reuse the last trailing EPS instead of calling the slower Yahoo profile endpoint",
    )
    args = parser.parse_args(argv)

    now = datetime.now(timezone.utc)
    if args.enforce_price_slots and not should_run_price_slot(now):
        local = now.astimezone(STOCKHOLM_TZ)
        print(f"Skipping price update outside planned Stockholm price slots: {local.isoformat()}")
        return 0
    if args.enforce_market_window and not should_run_price_update(now):
        local = now.astimezone(STOCKHOLM_TZ)
        print(f"Skipping price update outside Stockholm market window: {local.isoformat()}")
        return 0

    try:
        import yfinance as yf
    except ImportError as exc:
        raise SystemExit("Missing dependency: yfinance. Run `python3 -m pip install -r requirements.txt` first.") from exc

    existing_payload = json.loads(args.output.read_text(encoding="utf-8")) if args.output.exists() else {}
    existing_by_ticker = {
        str(row.get("ticker")): row
        for row in existing_payload.get("companies", [])
        if isinstance(row, dict) and row.get("ticker")
    }

    companies = []
    for ticker, name, sector in load_omxs30_universe():
        print(f"Fetching Yahoo price for {ticker}...", flush=True)
        try:
            quote = fetch_yahoo_quote(
                yf,
                ticker,
                include_pe=not args.prices_only,
                existing_quote=existing_by_ticker.get(ticker),
            )
            companies.append({
                "id": company_id(ticker),
                "ticker": ticker,
                "name": name,
                "sector": sector,
                "source": "Yahoo Finance",
                "errors": [],
                **quote,
            })
        except Exception as exc:
            previous = existing_by_ticker.get(ticker, {})
            companies.append({
                **previous,
                "id": company_id(ticker),
                "ticker": ticker,
                "name": name,
                "sector": sector,
                "source": "Yahoo Finance",
                "errors": [str(exc)],
            })
        time.sleep(args.delay)

    payload = {
        "version": 2,
        "provider": "Yahoo Finance via yfinance prices",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "market": "Nasdaq Stockholm",
        "priceWindow": "Every 10 minutes from 09:00 to 17:30 Europe/Stockholm on weekdays",
        "companies": [{key: clean(value) for key, value in company.items()} for company in companies],
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
