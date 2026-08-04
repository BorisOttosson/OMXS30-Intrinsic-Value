#!/usr/bin/env python3
"""Attach the official IR source catalogue to the generated company rows."""

import argparse
import json
from pathlib import Path


def attach_sources(payload: dict, catalogue: dict, audit_rows: dict) -> list[str]:
    missing = []
    for company in payload.get("companies", []):
        ticker = company.get("ticker")
        source = catalogue.get(ticker)
        if not source:
            missing.append(ticker)
            continue

        attached = dict(source)
        audit = audit_rows.get(ticker)
        if audit:
            attached["sourceUrl"] = audit.get("directReportUrl") or audit.get("sourceUrl") or attached["sourceUrl"]
            attached["sourceName"] = audit.get("sourceName") or attached["sourceName"]
            attached["auditStatus"] = audit.get("status")
            attached["auditCheckedAt"] = audit.get("checkedAt")
        company["officialSource"] = attached
    return missing


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=Path("data/omxs30-data.json"))
    parser.add_argument("--sources", type=Path, default=Path("data/official-sources.json"))
    parser.add_argument("--audit", type=Path, default=Path("data/official-report-audit.json"))
    args = parser.parse_args()

    payload = json.loads(args.data.read_text())
    catalogue = json.loads(args.sources.read_text()).get("companies", {})
    audit_rows = {}
    if args.audit.exists():
        audit_payload = json.loads(args.audit.read_text())
        audit_rows = {
            row["ticker"]: row
            for row in audit_payload.get("companies", [])
            if row.get("ticker")
        }
    missing = attach_sources(payload, catalogue, audit_rows)

    if missing:
        raise SystemExit(f"Missing official sources for: {', '.join(missing)}")
    args.data.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    print(f"Attached official sources to {len(payload.get('companies', []))} companies")


if __name__ == "__main__":
    main()
