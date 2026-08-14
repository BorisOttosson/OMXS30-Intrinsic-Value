#!/usr/bin/env python3
"""Fetch latest indicative exchange rates against SEK from Sveriges Riksbank."""

from __future__ import annotations

import json
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "data" / "fx-rates.json"
API_BASE = "https://api.riksbank.se/swea/v1/Observations/Latest"
SOURCE_URL = (
    "https://www.riksbank.se/en-gb/statistics/interest-rates-and-exchange-rates/"
)
SERIES = {
    "USD": "sekusdpmi",
    "EUR": "sekeurpmi",
}


def fetch_latest_rate(currency: str, series_id: str) -> dict[str, Any]:
    api_url = f"{API_BASE}/{series_id}"
    request = urllib.request.Request(
        api_url,
        headers={"User-Agent": "OMXS30-Intrinsic-Value/1.0"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:  # noqa: S310 - fixed official endpoints
        payload = json.loads(response.read().decode("utf-8"))
    rate = float(payload["value"])
    rate_date = date.fromisoformat(payload["date"])
    if rate <= 0:
        raise ValueError(f"{currency}: Riksbank returned a non-positive rate")
    age_days = (datetime.now(timezone.utc).date() - rate_date).days
    if age_days < 0 or age_days > 7:
        raise ValueError(f"{currency}: latest Riksbank rate is stale ({age_days} days)")
    return {
        "rateToSek": rate,
        "date": rate_date.isoformat(),
        "seriesId": series_id,
        "apiUrl": api_url,
    }


def build_payload() -> dict[str, Any]:
    return {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "baseCurrency": "SEK",
        "sourceName": "Sveriges Riksbank",
        "sourceUrl": SOURCE_URL,
        "rateMeaning": "SEK required for one unit of the foreign currency",
        "usage": "Indicative reference rates for dashboard translation, not transaction pricing",
        "rates": {
            currency: fetch_latest_rate(currency, series_id)
            for currency, series_id in SERIES.items()
        },
    }


def main() -> None:
    payload = build_payload()
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    for currency, row in payload["rates"].items():
        print(f"1 {currency} = {row['rateToSek']} SEK ({row['date']})")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
