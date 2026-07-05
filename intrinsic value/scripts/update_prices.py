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

try:
    from update_data import OMXS30, company_id
except ImportError:
    ROOT_FOR_IMPORT = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(ROOT_FOR_IMPORT))
    from update_data import OMXS30, company_id

SCRIPT_PATH = Path(__file__).resolve()
ROOT = SCRIPT_PATH.parents[1] if SCRIPT_PATH.parent.name == "scripts" else SCRIPT_PATH.parent
OUTPUT_PATH = ROOT / "data" / "prices.json"
STOCKHOLM_TZ = ZoneInfo("Europe/Stockholm")
PRICE_WINDOW_START = day_time(9, 1)
PRICE_WINDOW_END = day_time(17, 1)
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


def fetch_yahoo_quote(yf: Any, ticker: str) -> dict[str, Any]:
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

    return {
        "quoteTicker": ticker,
        "marketPrice": price,
        "previousClose": previous_close,
        "currency": currency,
        "priceUpdatedAt": datetime.now(timezone.utc).isoformat(),
    }


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Update OMXS30 prices from Yahoo Finance via yfinance.")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH, help="JSON output path")
    parser.add_argument("--delay", type=float, default=0.08, help="Delay between quote requests in seconds")
    parser.add_argument("--enforce-market-window", action="store_true", help="Only run from 09:01 to 17:01 Europe/Stockholm on weekdays")
    parser.add_argument("--enforce-price-slots", action="store_true", help="Only run on the 20 planned Stockholm trading-day price slots")
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

    companies = []
    for ticker, name, sector in OMXS30:
        print(f"Fetching Yahoo price for {ticker}...", flush=True)
        try:
            quote = fetch_yahoo_quote(yf, ticker)
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
            companies.append({
                "id": company_id(ticker),
                "ticker": ticker,
                "name": name,
                "sector": sector,
                "source": "Yahoo Finance",
                "errors": [str(exc)],
            })
        time.sleep(args.delay)

    payload = {
        "version": 1,
        "provider": "Yahoo Finance via yfinance prices",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "market": "Nasdaq Stockholm",
        "priceWindow": "20 planned slots from 09:01 to 16:37 Europe/Stockholm weekdays",
        "companies": [{key: clean(value) for key, value in company.items()} for company in companies],
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
