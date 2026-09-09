#!/usr/bin/env python3
"""Shared helpers for the checked-in OMXS30 company universe."""

from __future__ import annotations

import json
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve()
ROOT = SCRIPT_PATH.parents[1] if SCRIPT_PATH.parent.name == "scripts" else SCRIPT_PATH.parent
DEFAULT_UNIVERSE_PATH = ROOT / "data" / "prices.json"


def company_id(ticker: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in ticker).strip("-")


def normalize_ticker(value: str) -> str:
    ticker = value.strip().upper()
    return ticker if ticker.endswith(".ST") else f"{ticker}.ST"


def load_omxs30_universe(path: Path = DEFAULT_UNIVERSE_PATH) -> list[tuple[str, str, str]]:
    """Load and validate the canonical 30-company universe from the price snapshot."""
    payload = json.loads(path.read_text(encoding="utf-8"))
    rows = payload.get("companies")
    if not isinstance(rows, list) or len(rows) != 30:
        raise RuntimeError(f"{path} must contain the 30-company OMXS30 universe")

    universe: list[tuple[str, str, str]] = []
    seen: set[str] = set()
    for index, row in enumerate(rows, start=1):
        if not isinstance(row, dict):
            raise RuntimeError(f"Company row {index} in {path} must be an object")

        ticker = normalize_ticker(str(row.get("ticker") or ""))
        name = str(row.get("name") or "").strip()
        sector = str(row.get("sector") or "").strip()
        if ticker == ".ST" or not name or not sector:
            raise RuntimeError(f"Company row {index} in {path} is missing ticker, name, or sector")
        if ticker in seen:
            raise RuntimeError(f"Duplicate ticker {ticker} in {path}")

        seen.add(ticker)
        universe.append((ticker, name, sector))

    return universe
