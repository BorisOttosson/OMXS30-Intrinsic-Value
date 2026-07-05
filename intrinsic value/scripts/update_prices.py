#!/usr/bin/env python3
"""Fetch OMXS30 share prices from EODHD for frequent quote updates."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, time as day_time, timezone
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


def eodhd_symbol(ticker: str) -> str:
    return ticker


def parse_price_timestamp(payload: dict[str, Any]) -> str:
    timestamp = finite(payload.get("timestamp"))
    if timestamp is None:
        return datetime.now(timezone.utc).isoformat()
    return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()


def fetch_quote(api_token: str, ticker: str, timeout: float) -> dict[str, Any]:
    symbol = eodhd_symbol(ticker)
    params = urllib.parse.urlencode({
        "api_token": api_token,
        "fmt": "json",
    })
    url = f"https://eodhd.com/api/real-time/{urllib.parse.quote(symbol)}?{params}"

    with urllib.request.urlopen(url, timeout=timeout) as response:
        payload = json.loads(response.read().decode("utf-8"))

    if isinstance(payload, list):
        payload = payload[0] if payload else {}
    if not isinstance(payload, dict):
        raise ValueError("Unexpected EODHD response")

    price = (
        finite(payload.get("close"))
        or finite(payload.get("price"))
        or finite(payload.get("last"))
        or finite(payload.get("last_price"))
    )
    if price is None:
        raise ValueError(f"No price returned for {ticker}")

    return {
        "quoteTicker": symbol,
        "marketPrice": price,
        "previousClose": finite(payload.get("previousClose")),
        "currency": payload.get("currency") or "SEK",
        "priceUpdatedAt": parse_price_timestamp(payload),
        "rawCode": payload.get("code"),
    }


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Update OMXS30 prices from EODHD.")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH, help="JSON output path")
    parser.add_argument("--delay", type=float, default=0.12, help="Delay between quote requests in seconds")
    parser.add_argument("--timeout", type=float, default=20, help="HTTP timeout per quote request")
    parser.add_argument("--enforce-market-window", action="store_true", help="Only run from 09:01 to 17:01 Europe/Stockholm on weekdays")
    args = parser.parse_args(argv)

    now = datetime.now(timezone.utc)
    if args.enforce_market_window and not should_run_price_update(now):
        local = now.astimezone(STOCKHOLM_TZ)
        print(f"Skipping price update outside Stockholm market window: {local.isoformat()}")
        return 0

    api_token = os.environ.get("EODHD_API_TOKEN")
    if not api_token:
        raise SystemExit("Missing EODHD_API_TOKEN. Add it as a GitHub repository secret.")

    companies = []
    for ticker, name, sector in OMXS30:
        print(f"Fetching price for {ticker}...", flush=True)
        try:
            quote = fetch_quote(api_token, ticker, args.timeout)
            companies.append({
                "id": company_id(ticker),
                "ticker": ticker,
                "name": name,
                "sector": sector,
                "source": "EODHD",
                "errors": [],
                **quote,
            })
        except Exception as exc:
            companies.append({
                "id": company_id(ticker),
                "ticker": ticker,
                "name": name,
                "sector": sector,
                "source": "EODHD",
                "errors": [str(exc)],
            })
        time.sleep(args.delay)

    payload = {
        "version": 1,
        "provider": "EODHD live/delayed quotes",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "market": "Nasdaq Stockholm",
        "priceWindow": "09:01-17:01 Europe/Stockholm weekdays",
        "companies": [{key: clean(value) for key, value in company.items()} for company in companies],
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
