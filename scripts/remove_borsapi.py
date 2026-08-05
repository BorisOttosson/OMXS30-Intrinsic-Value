#!/usr/bin/env python3
"""Remove legacy BörsAPI values while retaining official report links and quote data."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


FUNDAMENTAL_FIELDS = {
    "balanceSheetBasis", "balanceSheetDate", "balanceSheetPeriod", "bookEquity",
    "bookValuePerShare", "capitalExpenditures", "cash", "cashFlowStatementBasis",
    "cashFlowStatementDate", "cashFlowStatementPeriod", "ebit", "ebitda",
    "ebitdaPerShare", "enterpriseValue", "eps", "equityPerShare", "evToEbitda",
    "fcfPerShare", "fcfSeries", "fcfYield", "financialCurrency", "financialToQuoteFx",
    "freeCashFlow", "fundamentalsAgeDays", "growth5y", "growth5ySource",
    "growth5yUpdatedAt", "growth5yYears", "incomeStatementBasis", "incomeStatementDate",
    "incomeStatementPeriod", "latestFiscalDate", "latestFiscalPeriod",
    "liabilitiesPerShare", "netDebt", "netDebtPerShare", "netIncome",
    "normalizedEbitdaPerShare", "normalizedFcfPerShare", "operatingCashFlow",
    "reportedCurrency", "roe", "targetEvToEbitda", "targetPe", "totalAssets",
    "totalDebt", "totalLiabilities", "totalRevenue", "totalRevenueBasis",
}


def scrub_company(company: dict, audit: dict | None, checked_at: str) -> dict:
    cleaned = {
        key: value
        for key, value in company.items()
        if key not in FUNDAMENTAL_FIELDS
        and key not in {"borsapiCompanyId", "borsapiIsin", "fetchAttemptedAt"}
    }
    for key in FUNDAMENTAL_FIELDS:
        cleaned[key] = None

    official_source = dict(cleaned.get("officialSource") or {})
    if audit:
        official_source.update({
            "sourceName": audit.get("sourceName") or official_source.get("sourceName"),
            "sourceUrl": audit.get("directReportUrl") or audit.get("sourceUrl") or official_source.get("sourceUrl"),
            "period": audit.get("expectedPeriod") or official_source.get("period"),
            "earningsBasis": audit.get("earningsBasisRequired") or official_source.get("earningsBasis"),
            "auditStatus": audit.get("status"),
            "auditCheckedAt": audit.get("checkedAt"),
        })
    cleaned["officialSource"] = official_source
    cleaned["source"] = "Official company report evidence"
    cleaned["dataUpdatedAt"] = checked_at
    cleaned["independentVerification"] = None
    issue = "Structured fundamentals are unavailable until official-report values are independently verified"
    cleaned["dataQuality"] = {
        "status": "unverified",
        "valuationReady": False,
        "issues": [issue],
        "checkedAt": checked_at,
    }
    cleaned["errors"] = [issue]
    return cleaned


def scrub_payload(payload: dict, audit_payload: dict, checked_at: str) -> dict:
    audits = {
        row.get("ticker"): row
        for row in audit_payload.get("companies", [])
        if row.get("ticker")
    }
    cleaned = dict(payload)
    cleaned["provider"] = "Official company reports"
    cleaned["generatedAt"] = checked_at
    cleaned["companies"] = [
        scrub_company(company, audits.get(company.get("ticker")), checked_at)
        for company in payload.get("companies", [])
    ]
    return cleaned


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=Path("data/omxs30-data.json"))
    parser.add_argument("--audit", type=Path, default=Path("data/official-report-audit.json"))
    args = parser.parse_args()

    payload = json.loads(args.data.read_text(encoding="utf-8"))
    audit_payload = json.loads(args.audit.read_text(encoding="utf-8"))
    checked_at = datetime.now(timezone.utc).isoformat()
    cleaned = scrub_payload(payload, audit_payload, checked_at)
    args.data.write_text(json.dumps(cleaned, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"Removed BörsAPI fields from {len(cleaned.get('companies', []))} companies")


if __name__ == "__main__":
    main()
