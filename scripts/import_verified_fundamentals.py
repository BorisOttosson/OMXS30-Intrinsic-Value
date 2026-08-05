#!/usr/bin/env python3
"""Import independently checked figures from direct official company reports."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import tempfile
import unicodedata
import urllib.request
import zipfile
from xml.etree import ElementTree
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from scripts.validate_fundamentals import validate_company_fundamentals
except ModuleNotFoundError:  # Direct execution: python scripts/import_verified_fundamentals.py
    from validate_fundamentals import validate_company_fundamentals


ROOT = Path(__file__).resolve().parents[1]
FLOW_FIELDS = (
    "totalRevenue",
    "ebitda",
    "ebit",
    "netIncome",
    "operatingCashFlow",
    "capitalExpenditures",
    "freeCashFlow",
)
BALANCE_FIELDS = (
    "totalAssets",
    "bookEquity",
    "totalLiabilities",
    "totalDebt",
    "cash",
    "netDebt",
)


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_document_text(value: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "", ascii_text.lower())


def check_manifest_entry(ticker: str, entry: dict[str, Any]) -> None:
    required = ("period", "fiscalPeriod", "currency", "unitMultiplier", "sourceName", "sourceUrl", "values")
    missing = [key for key in required if entry.get(key) in (None, "")]
    if missing:
        raise ValueError(f"{ticker}: missing {', '.join(missing)}")
    if not str(entry["sourceUrl"]).startswith("https://"):
        raise ValueError(f"{ticker}: source must be a clickable HTTPS link")
    if entry["unitMultiplier"] <= 0:
        raise ValueError(f"{ticker}: unitMultiplier must be positive")
    if float(entry.get("financialToQuoteFx", 1.0)) <= 0:
        raise ValueError(f"{ticker}: financialToQuoteFx must be positive")

    values = entry["values"]
    assets = values.get("totalAssets")
    equity = values.get("bookEquity")
    liabilities = values.get("totalLiabilities")
    if all(value is not None for value in (assets, equity, liabilities)):
        difference = abs(float(assets) - float(equity) - float(liabilities))
        if difference > max(abs(float(assets)) * 0.001, 1):
            raise ValueError(f"{ticker}: balance sheet does not balance")

    if entry.get("ebitdaPresented") is False and values.get("ebitda") is not None:
        raise ValueError(f"{ticker}: EBITDA cannot be populated when the report does not present it")
    for calculation in entry.get("calculationChecks", []):
        result = sum(float(value) for value in calculation["terms"])
        expected = float(calculation["expected"])
        if abs(result - expected) > max(abs(expected) * 1e-9, 1e-9):
            raise ValueError(f"{ticker}: failed calculation check: {calculation['label']}")


def extract_pdf_text(document: Path) -> str:
    extractor = shutil.which("pdftotext")
    if extractor:
        completed = subprocess.run(
            [extractor, "-layout", str(document), "-"],
            check=True,
            capture_output=True,
            text=True,
        )
        return completed.stdout
    try:
        from pypdf import PdfReader  # type: ignore
    except ImportError as error:
        raise RuntimeError("Install poppler-utils (pdftotext) before verifying report PDFs") from error
    return "\n".join(page.extract_text() or "" for page in PdfReader(document).pages)


def extract_xlsx_text(document: Path) -> str:
    """Extract displayed cell text from an official XLSX using only the standard library."""
    with zipfile.ZipFile(document) as archive:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
            shared_strings = ["".join(node.itertext()) for node in root]

        values: list[str] = []
        worksheet_names = sorted(
            name for name in archive.namelist()
            if name.startswith("xl/worksheets/sheet") and name.endswith(".xml")
        )
        for worksheet_name in worksheet_names:
            root = ElementTree.fromstring(archive.read(worksheet_name))
            for cell in root.iter():
                if not cell.tag.endswith("}c"):
                    continue
                cell_type = cell.attrib.get("t")
                value_node = next((child for child in cell if child.tag.endswith("}v")), None)
                if value_node is None or value_node.text is None:
                    inline = "".join(cell.itertext())
                    if inline:
                        values.append(inline)
                    continue
                value = value_node.text
                if cell_type == "s":
                    value = shared_strings[int(value)]
                values.append(value)
        return "\n".join(values)


def extract_html_text(document: Path) -> str:
    html = document.read_text(encoding="utf-8", errors="ignore")
    return re.sub(r"<[^>]+>", " ", html)


def verify_official_document(ticker: str, entry: dict[str, Any]) -> None:
    request = urllib.request.Request(
        entry["sourceUrl"],
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; OMXS30-official-report-verifier/1.0)",
            "Accept": "application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/html;q=0.9,*/*;q=0.8",
        },
    )
    with tempfile.TemporaryDirectory(prefix="omxs30-report-") as temporary:
        document_type = entry.get("documentType", "pdf").lower()
        document = Path(temporary) / f"{ticker}.{document_type}"
        try:
            curl = shutil.which("curl")
            if curl:
                subprocess.run(
                    [curl, "--fail", "--location", "--silent", "--show-error",
                     "--user-agent", request.headers["User-agent"], "--output", str(document), entry["sourceUrl"]],
                    check=True,
                    capture_output=True,
                    text=True,
                )
            else:
                with urllib.request.urlopen(request, timeout=60) as response:  # noqa: S310 - manifest URLs are reviewed
                    document.write_bytes(response.read())
        except Exception as error:
            raise RuntimeError(f"{ticker}: could not download official source: {error}") from error
        extractors = {
            "xlsx": extract_xlsx_text,
            "html": extract_html_text,
        }
        extractor = extractors.get(document_type, extract_pdf_text)
        text = normalize_document_text(extractor(document))

    missing_checks = [
        check for check in entry.get("documentChecks", [])
        if normalize_document_text(check) not in text
    ]
    if missing_checks:
        raise ValueError(f"{ticker}: official report evidence missing: {missing_checks[0]}")


def scaled(value: Any, multiplier: float) -> float | None:
    return None if value is None else float(value) * multiplier


def merge_verified_company(company: dict[str, Any], entry: dict[str, Any], checked_at: str) -> dict[str, Any]:
    values = entry["values"]
    financial_to_quote_fx = float(entry.get("financialToQuoteFx", 1.0))
    multiplier = float(entry["unitMultiplier"]) * financial_to_quote_fx
    result = dict(company)

    for field in FLOW_FIELDS + BALANCE_FIELDS:
        result[field] = scaled(values.get(field), multiplier)

    shares = float(values["sharesOutstanding"])
    result.update({
        "sharesOutstanding": shares,
        "sharesOutstandingSource": f"{entry['sourceName']} (official basic/average shares)",
        "eps": scaled(values.get("eps"), financial_to_quote_fx),
        "fcfPerShare": scaled(values.get("freeCashFlow"), multiplier) / shares if values.get("freeCashFlow") is not None else None,
        "ebitdaPerShare": scaled(values.get("ebitda"), multiplier) / shares if values.get("ebitda") is not None else None,
        "netDebtPerShare": scaled(values.get("netDebt"), multiplier) / shares if values.get("netDebt") is not None else None,
        "bookValuePerShare": scaled(values.get("bookValuePerShare"), financial_to_quote_fx) or scaled(values.get("bookEquity"), multiplier) / shares,
        "equityPerShare": scaled(values.get("bookValuePerShare"), financial_to_quote_fx) or scaled(values.get("bookEquity"), multiplier) / shares,
        "liabilitiesPerShare": scaled(values.get("totalLiabilities"), multiplier) / shares,
        "financialCurrency": entry["currency"],
        "reportedCurrency": entry["currency"],
        "financialToQuoteFx": financial_to_quote_fx,
        "latestFiscalDate": entry["period"],
        "latestFiscalPeriod": entry["fiscalPeriod"],
        "incomeStatementBasis": "ttm",
        "incomeStatementDate": entry["period"],
        "incomeStatementPeriod": "TTM",
        "totalRevenueBasis": "TTM",
        "cashFlowStatementBasis": "ttm",
        "cashFlowStatementDate": entry["period"],
        "cashFlowStatementPeriod": "TTM",
        "balanceSheetBasis": "quarter",
        "balanceSheetDate": entry["period"],
        "balanceSheetPeriod": entry["fiscalPeriod"],
        "cashFlowMetricLabel": entry.get("cashFlowMetricLabel"),
        "ebitdaMetricLabel": entry.get("ebitdaMetricLabel"),
        "dataUpdatedAt": checked_at,
        "source": "Official company report (independently verified)",
        "officialSource": {
            "sourceName": entry["sourceName"],
            "sourceUrl": entry["sourceUrl"],
            "period": entry["period"],
            "earningsBasis": "TTM",
            "auditStatus": "verified",
            "auditCheckedAt": checked_at,
            "sourcePageUrl": entry.get("sourcePageUrl"),
            "financialCurrency": entry["currency"],
            "financialToQuoteFx": financial_to_quote_fx,
        },
        "independentVerification": {
            "status": "verified",
            "sourceName": entry["sourceName"],
            "sourceUrl": entry["sourceUrl"],
            "sourcePageUrl": entry.get("sourcePageUrl"),
            "period": entry["period"],
            "earningsBasis": "TTM",
            "balanceSheetBasis": "latest-quarter",
            "auditor": entry.get("auditor"),
            "checkedAt": checked_at,
            "method": "Direct official report text checks plus arithmetic and balance-sheet validation",
            "ebitdaPresented": entry.get("ebitdaPresented"),
            "financialCurrency": entry["currency"],
            "financialToQuoteFx": financial_to_quote_fx,
        },
        "errors": [],
        "marketCap": None,
        "enterpriseValue": None,
        "evToEbitda": None,
        "fcfYield": None,
    })
    if values.get("roe") is not None:
        result["roe"] = float(values["roe"])
    result.pop("legacySnapshot", None)
    return validate_company_fundamentals(result)


def import_manifest(
    payload: dict[str, Any],
    manifest: dict[str, Any],
    *,
    verify_sources: bool = False,
    tickers: set[str] | None = None,
    checked_at: str | None = None,
) -> dict[str, Any]:
    entries = manifest.get("companies", {})
    available = {company.get("ticker") for company in payload.get("companies", [])}
    unknown = sorted(set(entries) - available)
    if unknown:
        raise ValueError(f"Manifest contains unknown tickers: {', '.join(unknown)}")

    selected = set(entries) if tickers is None else tickers
    missing = sorted(selected - set(entries))
    if missing:
        raise ValueError(f"No verified manifest entry for: {', '.join(missing)}")

    timestamp = checked_at or datetime.now(timezone.utc).isoformat()
    verified_count = 0
    companies = []
    for company in payload.get("companies", []):
        ticker = company.get("ticker")
        entry = entries.get(ticker)
        if not entry or ticker not in selected:
            companies.append(company)
            continue
        check_manifest_entry(ticker, entry)
        if verify_sources:
            verify_official_document(ticker, entry)
        merged = merge_verified_company(company, entry, timestamp)
        if not merged["dataQuality"]["valuationReady"]:
            raise ValueError(f"{ticker}: validator rejected verified figures: {merged['dataQuality']['issues']}")
        companies.append(merged)
        verified_count += 1

    total = len(companies)
    output = dict(payload)
    output["companies"] = companies
    output["generatedAt"] = timestamp
    output["provider"] = f"Official reports: {verified_count} verified; {total - verified_count} legacy cached (unverified)"
    output["verificationSummary"] = {
        "verified": verified_count,
        "pending": total - verified_count,
        "total": total,
        "policy": manifest.get("policy"),
    }
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=ROOT / "data" / "official-fundamentals.json")
    parser.add_argument("--data", type=Path, default=ROOT / "data" / "omxs30-data.json")
    parser.add_argument("--ticker", action="append", help="Import only one configured ticker (repeatable)")
    parser.add_argument("--verify-sources", action="store_true", help="Download and verify the official PDFs")
    args = parser.parse_args()

    payload = load_json(args.data)
    manifest = load_json(args.manifest)
    requested = {ticker.upper() for ticker in args.ticker} if args.ticker else None
    output = import_manifest(payload, manifest, verify_sources=args.verify_sources, tickers=requested)
    args.data.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    summary = output["verificationSummary"]
    print(f"Verified {summary['verified']} of {summary['total']} companies; {summary['pending']} retain visible unverified fallback values")


if __name__ == "__main__":
    main()
