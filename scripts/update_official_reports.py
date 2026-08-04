#!/usr/bin/env python3
"""Collect auditable evidence directly from official company reports.

This collector deliberately does not use a financial-data API and does not
write values into the valuation model. It discovers the newest official report
from each company's investor-relations page and records field-level evidence
for later verification. Ambiguous extraction remains review-required.
"""

from __future__ import annotations

import argparse
import html
import io
import json
import re
import shutil
import subprocess
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree


DEFAULT_USER_AGENT = (
    "OMXS30-Intrinsic-Value/1.0 official-report research collector "
    "(https://github.com/BorisOttosson/OMXS30-Intrinsic-Value)"
)

FLOW_FIELDS = {
    "revenue": ("net sales", "revenue", "revenues", "sales"),
    "ebitda": ("ebitda", "earnings before interest, tax, depreciation"),
    "netIncome": ("net income", "profit for the period", "profit for the year"),
    "eps": ("earnings per share", "eps"),
    "freeCashFlow": ("free cash flow", "free operating cash flow"),
}

BALANCE_FIELDS = {
    "totalAssets": ("total assets",),
    "bookEquity": (
        "total equity",
        "shareholders' equity",
        "shareholders’ equity",
        "equity attributable to owners",
    ),
    "totalLiabilities": ("total liabilities",),
    "totalDebt": (
        "total debt",
        "interest-bearing liabilities",
        "interest bearing liabilities",
        "loans and borrowings",
        "borrowings",
    ),
    "cash": (
        "cash and cash equivalents",
        "cash & cash equivalents",
        "cash and bank balances",
    ),
}

REPORT_WORDS = (
    "interim report",
    "quarterly report",
    "financial report",
    "half-year report",
    "half year report",
    "six-month report",
    "six month report",
    "results report",
    "results",
    "report",
)

NEGATIVE_LINK_WORDS = (
    "presentation",
    "webcast",
    "transcript",
    "invitation",
    "calendar",
    "press image",
    "remuneration",
    "sustainability",
)


@dataclass(frozen=True)
class Link:
    url: str
    text: str


class PageParser(HTMLParser):
    """Extract readable text and links from one HTML page."""

    def __init__(self, base_url: str) -> None:
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.links: list[Link] = []
        self.text_parts: list[str] = []
        self._hidden_depth = 0
        self._link_url: str | None = None
        self._link_text: list[str] = []
        self._row_link_start: int | None = None
        self._row_text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = dict(attrs)
        if tag in {"script", "style", "svg", "noscript"}:
            self._hidden_depth += 1
        if tag == "tr" and self._hidden_depth == 0:
            self._row_link_start = len(self.links)
            self._row_text = []
        if tag == "a" and self._hidden_depth == 0:
            href = attrs_dict.get("href")
            self._link_url = urllib.parse.urljoin(self.base_url, href) if href else None
            self._link_text = []
        if tag in {"p", "div", "li", "tr", "br", "h1", "h2", "h3", "h4"}:
            self.text_parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._link_url:
            label = " ".join("".join(self._link_text).split())
            self.links.append(Link(self._link_url, label))
            self._link_url = None
            self._link_text = []
        if tag == "tr" and self._row_link_start is not None:
            row_context = " ".join("".join(self._row_text).split())
            for index in range(self._row_link_start, len(self.links)):
                link = self.links[index]
                self.links[index] = Link(link.url, f"{link.text} {row_context}".strip())
            self._row_link_start = None
            self._row_text = []
        if tag in {"script", "style", "svg", "noscript"} and self._hidden_depth:
            self._hidden_depth -= 1
        if tag in {"p", "div", "li", "tr", "h1", "h2", "h3", "h4"}:
            self.text_parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self._hidden_depth:
            return
        self.text_parts.append(data)
        if self._row_link_start is not None:
            self._row_text.append(data)
        if self._link_url:
            self._link_text.append(data)

    @property
    def text(self) -> str:
        return normalize_document_text("".join(self.text_parts))


def normalize_document_text(value: str) -> str:
    value = html.unescape(value).replace("\xa0", " ").replace("\u00ad", "")
    lines = []
    for line in value.splitlines():
        clean = " ".join(line.split())
        if clean:
            lines.append(clean)
    return "\n".join(lines)


def request_bytes(url: str, timeout: int, user_agent: str) -> tuple[bytes, str, str]:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": user_agent,
            "Accept": "text/html,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*;q=0.8",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        content = response.read()
        content_type = response.headers.get_content_type()
        final_url = response.geturl()
    return content, content_type, final_url


def document_kind(url: str, content_type: str) -> str:
    path = urllib.parse.urlparse(url).path.lower()
    if content_type == "application/pdf" or path.endswith(".pdf"):
        return "pdf"
    if "spreadsheet" in content_type or path.endswith((".xlsx", ".xlsm")):
        return "xlsx"
    if content_type in {"text/html", "application/xhtml+xml"} or not Path(path).suffix:
        return "html"
    return "other"


def extract_pdf_text(content: bytes) -> str:
    executable = shutil.which("pdftotext")
    if not executable:
        raise RuntimeError("pdftotext is unavailable; install poppler-utils")
    with tempfile.TemporaryDirectory(prefix="official-report-") as directory:
        pdf_path = Path(directory) / "report.pdf"
        text_path = Path(directory) / "report.txt"
        pdf_path.write_bytes(content)
        completed = subprocess.run(
            [executable, "-layout", str(pdf_path), str(text_path)],
            check=False,
            capture_output=True,
            text=True,
            timeout=90,
        )
        if completed.returncode:
            raise RuntimeError(completed.stderr.strip() or "pdftotext failed")
        return normalize_document_text(text_path.read_text(errors="replace"))


def _xlsx_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    try:
        root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    namespace = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    return ["".join(node.itertext()) for node in root.findall("x:si", namespace)]


def extract_xlsx_text(content: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        shared = _xlsx_shared_strings(archive)
        namespace = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
        rows: list[str] = []
        sheet_names = sorted(
            name
            for name in archive.namelist()
            if name.startswith("xl/worksheets/sheet") and name.endswith(".xml")
        )
        for sheet_name in sheet_names:
            root = ElementTree.fromstring(archive.read(sheet_name))
            for row in root.findall(".//x:row", namespace):
                values: list[str] = []
                for cell in row.findall("x:c", namespace):
                    cell_type = cell.get("t")
                    value_node = cell.find("x:v", namespace)
                    if value_node is None or value_node.text is None:
                        inline = cell.find("x:is", namespace)
                        value = "" if inline is None else "".join(inline.itertext())
                    elif cell_type == "s":
                        index = int(value_node.text)
                        value = shared[index] if index < len(shared) else value_node.text
                    else:
                        value = value_node.text
                    if value.strip():
                        values.append(value.strip())
                if values:
                    rows.append(" | ".join(values))
    return normalize_document_text("\n".join(rows))


def parse_html(content: bytes, base_url: str) -> PageParser:
    parser = PageParser(base_url)
    parser.feed(content.decode("utf-8", errors="replace"))
    return parser


def quarter_terms(period: str) -> tuple[str, ...]:
    month = int(period[5:7])
    if month <= 3:
        return ("q1", "first quarter", "january-march", "january march")
    if month <= 6:
        return (
            "q2",
            "second quarter",
            "april-june",
            "april june",
            "half-year",
            "half year",
            "six-month",
            "six month",
            "january-june",
            "january june",
        )
    if month <= 9:
        return ("q3", "third quarter", "july-september", "july september", "nine-month")
    return ("q4", "fourth quarter", "full-year", "full year", "annual report")


def score_link(link: Link, period: str) -> int:
    parsed = urllib.parse.urlparse(link.url)
    combined = urllib.parse.unquote(f"{link.text} {parsed.path} {parsed.query}").lower()
    score = 0
    if parsed.scheme not in {"http", "https"}:
        return -10_000
    if parsed.path.lower().endswith((".pdf", ".xlsx", ".xlsm")):
        score += 35
    year = period[:4]
    if year in combined:
        score += 25
    elif re.search(r"20\d{2}", combined):
        score -= 60
    if any(term in combined for term in quarter_terms(period)):
        score += 30
    if any(term in combined for term in REPORT_WORDS):
        score += 22
    if any(term in combined for term in NEGATIVE_LINK_WORDS):
        score -= 50
    if any(term in parsed.netloc.lower() for term in ("stream.", "event.")):
        score -= 70
    if link.text.strip().lower().startswith("xlsx"):
        score += 20
    elif link.text.strip().lower().startswith("pdf"):
        score += 10
    if parsed.path.lower().endswith((".jpg", ".jpeg", ".png", ".svg", ".zip")):
        score -= 100
    return score


def ranked_links(links: Iterable[Link], period: str) -> list[Link]:
    unique: dict[str, Link] = {}
    for link in links:
        url = link.url.split("#", 1)[0]
        if not url:
            continue
        candidate = Link(url, link.text)
        previous = unique.get(url)
        if previous is None or score_link(candidate, period) > score_link(previous, period):
            unique[url] = candidate
    return sorted(unique.values(), key=lambda item: score_link(item, period), reverse=True)


NUMBER_PATTERN = re.compile(
    r"(?<![A-Za-z])(?:[-−–]?\s*)?(?:\d{1,3}(?:[ ,.\u00a0]\d{3})+|\d+)(?:[.,]\d+)?(?:\s*%)?"
)


def detect_basis(context: str, field_group: str, period: str) -> str:
    lowered = context.lower()
    if field_group == "balance":
        year = period[:4]
        month = int(period[5:7])
        month_names = (
            "march" if month <= 3 else "june" if month <= 6 else "september" if month <= 9 else "december"
        )
        if year in lowered and (month_names in lowered or period in lowered):
            return "latest-quarter"
        return "unknown"
    if re.search(r"\b(ttm|l t m|last twelve months|rolling 12 months|rolling twelve months)\b", lowered):
        return "ttm"
    if re.search(r"\b(12 months|twelve months)\b", lowered):
        return "ttm-candidate"
    if any(term in lowered for term in ("six months", "half-year", "half year", "january-june", "jan-jun")):
        return "ytd"
    if any(term in lowered for term in ("three months", "quarter", "april-june", "apr-jun")):
        return "quarter"
    if any(term in lowered for term in ("full year", "annual", "january-december", "jan-dec")):
        return "annual"
    return "unknown"


def extract_field_evidence(text: str, labels: tuple[str, ...], group: str, period: str) -> list[dict]:
    lines = text.splitlines()
    matches: list[dict] = []
    seen: set[str] = set()
    for index, line in enumerate(lines):
        lowered = line.lower()
        matched_label = next((label for label in labels if label in lowered), None)
        if not matched_label:
            continue
        start = max(0, index - 2)
        end = min(len(lines), index + 3)
        snippet = " | ".join(lines[start:end])[:700]
        signature = snippet.lower()
        if signature in seen:
            continue
        seen.add(signature)
        matches.append(
            {
                "label": matched_label,
                "basisDetected": detect_basis(snippet, group, period),
                "numbers": NUMBER_PATTERN.findall(snippet)[:12],
                "snippet": snippet,
            }
        )
        if len(matches) == 4:
            break
    return matches


def collect_evidence(text: str, period: str) -> dict:
    evidence = {}
    for field, labels in FLOW_FIELDS.items():
        evidence[field] = {
            "requiredBasis": "ttm" if field != "ebitda" else "ttm-if-presented",
            "matches": extract_field_evidence(text, labels, "flow", period),
        }
    for field, labels in BALANCE_FIELDS.items():
        evidence[field] = {
            "requiredBasis": "latest-quarter",
            "matches": extract_field_evidence(text, labels, "balance", period),
        }
    return evidence


def evidence_summary(evidence: dict) -> dict:
    fields_found = [field for field, value in evidence.items() if value["matches"]]
    ttm_candidates = [
        field
        for field in FLOW_FIELDS
        if any(
            match["basisDetected"] in {"ttm", "ttm-candidate"}
            for match in evidence[field]["matches"]
        )
    ]
    latest_quarter_candidates = [
        field
        for field in BALANCE_FIELDS
        if any(match["basisDetected"] == "latest-quarter" for match in evidence[field]["matches"])
    ]
    return {
        "fieldsFound": fields_found,
        "ttmCandidates": ttm_candidates,
        "latestQuarterCandidates": latest_quarter_candidates,
    }


def readable_document(content: bytes, content_type: str, url: str) -> tuple[str, str, list[Link]]:
    kind = document_kind(url, content_type)
    if kind == "pdf":
        return extract_pdf_text(content), kind, []
    if kind == "xlsx":
        return extract_xlsx_text(content), kind, []
    if kind == "html":
        page = parse_html(content, url)
        return page.text, kind, page.links
    raise RuntimeError(f"Unsupported document type: {content_type or 'unknown'}")


def report_relevance(text: str, period: str) -> int:
    lowered = text[:120_000].lower()
    score = 0
    if period[:4] in lowered:
        score += 15
    if any(term in lowered for term in quarter_terms(period)):
        score += 20
    if any(label in lowered for labels in FLOW_FIELDS.values() for label in labels):
        score += 15
    if "total assets" in lowered or "balance sheet" in lowered or "financial position" in lowered:
        score += 20
    return score


def collect_company(
    ticker: str,
    source: dict,
    timeout: int,
    user_agent: str,
    max_candidates: int,
) -> dict:
    source_url = source["sourceUrl"]
    result = {
        "ticker": ticker,
        "sourceName": source["sourceName"],
        "sourceUrl": source_url,
        "expectedPeriod": source["period"],
        "earningsBasisRequired": source.get("earningsBasis", "TTM"),
        "directReportUrl": None,
        "documentType": None,
        "status": "source-only",
        "autoVerificationEligible": False,
        "evidence": {},
        "summary": {"fieldsFound": [], "ttmCandidates": [], "latestQuarterCandidates": []},
        "errors": [],
    }
    period = source["period"]
    try:
        content, content_type, final_url = request_bytes(source_url, timeout, user_agent)
        source_text, source_kind, source_links = readable_document(content, content_type, final_url)
    except Exception as error:  # network and parser errors must become audit output
        result["status"] = "download-error"
        result["errors"].append(f"Official source page: {type(error).__name__}: {error}")
        return result

    documents: list[tuple[int, str, str, str]] = []
    if source_kind != "html" or report_relevance(source_text, period) >= 35:
        documents.append((report_relevance(source_text, period), final_url, source_kind, source_text))

    candidates = [link for link in ranked_links(source_links, period) if score_link(link, period) > 0]
    visited = {final_url.split("#", 1)[0]}
    for link in candidates[:max_candidates]:
        if link.url in visited:
            continue
        visited.add(link.url)
        try:
            item_content, item_type, item_final_url = request_bytes(link.url, timeout, user_agent)
            item_text, item_kind, child_links = readable_document(item_content, item_type, item_final_url)
            relevance = report_relevance(item_text, period) + score_link(link, period)
            if len(item_text) >= 400:
                documents.append((relevance, item_final_url, item_kind, item_text))
            # Some official pages link to a report landing page, which then links to the PDF/XLSX.
            if item_kind == "html":
                for child in ranked_links(child_links, period)[:3]:
                    if child.url in visited or score_link(child, period) < 40:
                        continue
                    visited.add(child.url)
                    try:
                        child_content, child_type, child_final_url = request_bytes(child.url, timeout, user_agent)
                        child_text, child_kind, _ = readable_document(child_content, child_type, child_final_url)
                        child_relevance = report_relevance(child_text, period) + score_link(child, period)
                        if len(child_text) >= 400:
                            documents.append((child_relevance, child_final_url, child_kind, child_text))
                    except Exception as error:
                        result["errors"].append(
                            f"Candidate {child.url}: {type(error).__name__}: {error}"
                        )
        except Exception as error:
            result["errors"].append(f"Candidate {link.url}: {type(error).__name__}: {error}")

    if not documents:
        result["errors"].append("No readable report document was discovered from the official source page")
        return result

    documents.sort(key=lambda item: item[0], reverse=True)
    _, report_url, report_kind, report_text = documents[0]
    evidence = collect_evidence(report_text, period)
    summary = evidence_summary(evidence)
    result.update(
        {
            "directReportUrl": report_url,
            "documentType": report_kind,
            "status": "evidence-found" if summary["fieldsFound"] else "review-required",
            "evidence": evidence,
            "summary": summary,
        }
    )
    if "revenue" not in summary["ttmCandidates"]:
        result["status"] = "review-required"
        result["errors"].append("TTM revenue was not unambiguously identified")
    if len(summary["latestQuarterCandidates"]) < 2:
        result["status"] = "review-required"
        result["errors"].append("Fewer than two latest-quarter balance-sheet fields were identified")
    return result


def selected_tickers(companies: dict, ticker: str | None, batch: int | None, batch_size: int) -> list[str]:
    tickers = sorted(companies)
    if ticker:
        normalized = ticker.upper()
        if normalized not in companies:
            raise SystemExit(f"Unknown ticker: {ticker}")
        return [normalized]
    if batch:
        start = (batch - 1) * batch_size
        selected = tickers[start : start + batch_size]
        if not selected:
            raise SystemExit(f"Batch {batch} is outside the {len(tickers)}-company catalogue")
        return selected
    return tickers


def load_existing_rows(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text())
        return {row["ticker"]: row for row in payload.get("companies", []) if row.get("ticker")}
    except (json.JSONDecodeError, KeyError, TypeError):
        return {}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalogue", type=Path, default=Path("data/official-sources.json"))
    parser.add_argument("--output", type=Path, default=Path("data/official-report-audit.json"))
    parser.add_argument("--ticker")
    parser.add_argument("--batch", type=int)
    parser.add_argument("--batch-size", type=int, default=10)
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument("--max-candidates", type=int, default=6)
    args = parser.parse_args()
    if args.ticker and args.batch:
        parser.error("Use either --ticker or --batch, not both")

    catalogue_payload = json.loads(args.catalogue.read_text())
    companies = catalogue_payload.get("companies", {})
    if not companies:
        raise SystemExit("Official source catalogue is empty")

    tickers = selected_tickers(companies, args.ticker, args.batch, args.batch_size)
    existing = load_existing_rows(args.output)
    checked_at = datetime.now(timezone.utc).isoformat()
    for position, ticker in enumerate(tickers, 1):
        print(f"[{position}/{len(tickers)}] {ticker}: checking official report", flush=True)
        row = collect_company(
            ticker,
            companies[ticker],
            args.timeout,
            DEFAULT_USER_AGENT,
            args.max_candidates,
        )
        row["checkedAt"] = checked_at
        existing[ticker] = row
        print(
            f"  {row['status']}: {row.get('directReportUrl') or row['sourceUrl']} "
            f"({len(row['summary']['fieldsFound'])} fields)",
            flush=True,
        )

    payload = {
        "generatedAt": checked_at,
        "method": "Direct retrieval from official company investor-relations pages; no financial-data API",
        "verificationPolicy": (
            "Extracted snippets are candidates for human or independent-source verification. "
            "This file never makes a company valuation-ready by itself."
        ),
        "companies": [existing[ticker] for ticker in sorted(existing)],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {len(payload['companies'])} audit rows to {args.output}")


if __name__ == "__main__":
    main()
