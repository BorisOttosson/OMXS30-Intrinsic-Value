#!/usr/bin/env python3
"""Attach the official IR source catalogue to the generated company rows."""

import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=Path("data/omxs30-data.json"))
    parser.add_argument("--sources", type=Path, default=Path("data/official-sources.json"))
    args = parser.parse_args()

    payload = json.loads(args.data.read_text())
    catalogue = json.loads(args.sources.read_text()).get("companies", {})
    missing = []
    for company in payload.get("companies", []):
        ticker = company.get("ticker")
        source = catalogue.get(ticker)
        if source:
            company["officialSource"] = source
        else:
            missing.append(ticker)

    if missing:
        raise SystemExit(f"Missing official sources for: {', '.join(missing)}")
    args.data.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    print(f"Attached official sources to {len(payload.get('companies', []))} companies")


if __name__ == "__main__":
    main()
