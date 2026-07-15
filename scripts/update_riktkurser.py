#!/usr/bin/env python3
"""Fetch OMXS30 riktkurser from Borskollen pages."""

from __future__ import annotations

import argparse
import html.parser
import json
import math
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from scripts.update_data import OMXS30, company_id, normalize_ticker
except (ImportError, ModuleNotFoundError):
    from update_data import OMXS30, company_id, normalize_ticker

SCRIPT_PATH = Path(__file__).resolve()
ROOT = SCRIPT_PATH.parents[1] if SCRIPT_PATH.parent.name == "scripts" else SCRIPT_PATH.parent
OUTPUT_PATH = ROOT / "data" / "riktkurser.json"
BORSKOLLEN_BASE_URL = "https://www.borskollen.se/aktie"
MAX_TARGET_PRICE_ROWS = 20

SLUG_CANDIDATES = {
    "ABB.ST": ["abb"],
    "ADDT-B.ST": ["addtech"],
    "ALFA.ST": ["alfa-laval"],
    "ASSA-B.ST": ["assa-abloy"],
    "AZN.ST": ["astrazeneca"],
    "ATCO-A.ST": ["atlas-copco", "atlas-copco-a"],
    "BOL.ST": ["boliden"],
    "EPI-A.ST": ["epiroc"],
    "EQT.ST": ["eqt"],
    "ERIC-B.ST": ["ericsson"],
    "ESSITY-B.ST": ["essity"],
    "EVO.ST": ["evolution"],
    "SHB-A.ST": ["svenska-handelsbanken", "handelsbanken"],
    "HM-B.ST": ["hm", "hennes-mauritz", "hennes-mauritz-b"],
    "HEXA-B.ST": ["hexagon"],
    "INDU-C.ST": ["industrivarden", "industrivarden-c"],
    "INVE-B.ST": ["investor", "investor-b"],
    "LIFCO-B.ST": ["lifco"],
    "NIBE-B.ST": ["nibe"],
    "NDA-SE.ST": ["nordea", "nordea-bank"],
    "SAAB-B.ST": ["saab"],
    "SAND.ST": ["sandvik"],
    "SCA-B.ST": ["sca"],
    "SEB-A.ST": ["seb"],
    "SKA-B.ST": ["skanska"],
    "SKF-B.ST": ["skf"],
    "SWED-A.ST": ["swedbank"],
    "TEL2-B.ST": ["tele2"],
    "TELIA.ST": ["telia", "telia-company"],
    "VOLV-B.ST": ["volvo", "volvo-b"],
}

ROW_PATTERN = re.compile(
    r"(?P<date>\d{2}\s+[a-zåäö]{3})\s+"
    r"(?P<body>.+?)\s+"
    r"(?:(?P<previous>\d+(?:[,.]\d+)?)\s*→\s*)?"
    r"(?P<target>\d+(?:[,.]\d+)?)\s*kronor\s*"
    r"(?P<upside>[+-]?\d+(?:[,.]\d+)?)%",
    re.IGNORECASE,
)
DATE_PATTERN = re.compile(r"^(?:idag|igår|\d{2}\s+[a-zåäö]{3})$", re.IGNORECASE)


class TextExtractor(html.parser.HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        text = re.sub(r"\s+", " ", data).strip()
        if text:
            self.parts.append(text)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_number(value: Any) -> float | None:
    if value is None:
        return None

    text = str(value).replace("\xa0", " ").strip()
    number_text = re.sub(r"[^0-9,.\-]", "", text)
    if not number_text or number_text in {"-", ".", ","}:
        return None

    if "," in number_text and "." in number_text:
        if number_text.rfind(",") > number_text.rfind("."):
            number_text = number_text.replace(".", "").replace(",", ".")
        else:
            number_text = number_text.replace(",", "")
    else:
        number_text = number_text.replace(",", ".")

    try:
        number = float(number_text)
    except ValueError:
        return None

    if math.isnan(number) or math.isinf(number):
        return None
    return number


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")
    slug = re.sub(r"-(a|b|c)$", "", slug)
    return slug


def slug_candidates(ticker: str, name: str) -> list[str]:
    candidates = list(SLUG_CANDIDATES.get(ticker, []))
    candidates.extend([
        slugify(name),
        slugify(name.replace(" Abp", "").replace(" Ltd", "")),
        slugify(ticker.replace(".ST", "")),
    ])

    unique: list[str] = []
    for candidate in candidates:
        if candidate and candidate not in unique:
            unique.append(candidate)
    return unique


def fetch_html(slug: str, timeout: float) -> str:
    url = f"{BORSKOLLEN_BASE_URL}/{urllib.parse.quote(slug)}/riktkurs"
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; OMXS30IntrinsicValue/1.0)",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.6",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", "replace")


def extract_lines(html: str) -> list[str]:
    parser = TextExtractor()
    parser.feed(html)
    return parser.parts


def looks_like_riktkurs_page(lines: list[str]) -> bool:
    text = " ".join(lines).lower()
    return "riktkurs" in text and "kronor" in text


def parse_body(body: str) -> tuple[str | None, str | None, str | None]:
    normalized = re.sub(r"\s+", " ", body).strip()
    action_match = re.search(r"\b(höjer|sänker|upprepar|inleder|återupptar|justerar)\b", normalized, re.IGNORECASE)
    if not action_match:
        return normalized or None, None, None

    analyst = normalized[:action_match.start()].strip(" -|") or None
    action = action_match.group(1).lower()
    rating = normalized[action_match.end():].strip(" -|") or None
    return analyst, action, rating


def parse_latest_rows(text: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for match in ROW_PATTERN.finditer(text):
        analyst, action, rating = parse_body(match.group("body"))
        rows.append({
            "date": match.group("date"),
            "analyst": analyst,
            "action": action,
            "rating": rating,
            "previousTargetPrice": parse_number(match.group("previous")),
            "targetPrice": parse_number(match.group("target")),
            "upsidePercent": parse_number(match.group("upside")),
            "raw": re.sub(r"\s+", " ", match.group(0)).strip(),
        })
        if len(rows) >= MAX_TARGET_PRICE_ROWS:
            break
    return rows


def parse_latest_rows_from_lines(lines: list[str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    try:
        start = next(
            index + 7
            for index in range(len(lines) - 6)
            if lines[index:index + 7] == ["Dag", "Analytiker", "Typ", "Bolag", "Gradering", "Riktkurs", "Uppsida*"]
        )
    except StopIteration:
        return rows

    index = start
    while index + 5 < len(lines) and len(rows) < MAX_TARGET_PRICE_ROWS:
        date, analyst, action, company, rating, target_text = lines[index:index + 6]
        upside_text = lines[index + 6] if index + 6 < len(lines) else ""
        if not DATE_PATTERN.match(date):
            break

        index += 7
        if "kronor" not in target_text.lower():
            continue

        if "→" in target_text:
            target_parts = target_text.split("→")
            previous_target = parse_number(target_parts[0])
            target_price = parse_number(target_parts[-1])
        else:
            previous_target = None
            target_price = parse_number(target_text)

        rows.append({
            "date": date,
            "analyst": analyst or None,
            "action": action.lower() if action else None,
            "rating": f"{company} {rating}".strip() if company or rating else None,
            "previousTargetPrice": previous_target,
            "targetPrice": target_price,
            "upsidePercent": parse_number(upside_text),
            "raw": re.sub(" +", " ", f"{date} {analyst} {action} {company} {rating} {target_text} {upside_text}").strip(),
        })

    return rows


def average(values: list[float]) -> float | None:
    clean = [value for value in values if value is not None and math.isfinite(value)]
    if not clean:
        return None
    return sum(clean) / len(clean)


def parse_target_page(html: str, ticker: str, name: str, slug: str) -> dict[str, Any]:
    lines = extract_lines(html)
    full_text = " ".join(lines)
    compact_text = re.sub(r"\s+", " ", full_text)

    target_match = re.search(
        r"Riktkurs\s+snitt\s+4\s+mån\s+([-+]?\d+(?:[,.]\d+)?)\s*kronor",
        compact_text,
        re.IGNORECASE,
    )
    target_price = parse_number(target_match.group(1)) if target_match else None

    upside_match = re.search(
        r"([-+]?\d+(?:[,.]\d+)?)%\s*(uppsida|nedsida)",
        compact_text,
        re.IGNORECASE,
    )
    upside = parse_number(upside_match.group(1)) if upside_match else None
    if upside is not None and upside_match and upside_match.group(2).lower() == "nedsida" and upside > 0:
        upside = -upside

    consensus_match = re.search(
        r"Analytiker\s+konsensus:\s*([A-Za-zÅÄÖåäö ]+?)\s*(?:\*|Baserat|Riktkurssentiment|Senaste|\d+\s+st|$)",
        compact_text,
        re.IGNORECASE,
    )
    consensus = consensus_match.group(1).strip() if consensus_match else None
    if consensus is None:
        for index, line in enumerate(lines):
            normalized = line.strip().lower()
            if normalized == "analytiker konsensus:" and index + 1 < len(lines):
                consensus = lines[index + 1].strip()
                break
            if normalized == "analytiker konsensus" and index + 2 < len(lines):
                consensus = lines[index + 2].strip()
                break

    count_match = re.search(r"(\d+)\s+st\s+riktkurser", compact_text, re.IGNORECASE)
    target_count = int(count_match.group(1)) if count_match else None

    latest = parse_latest_rows_from_lines(lines) or parse_latest_rows(compact_text)
    if target_price is None:
        target_price = average([
            row["targetPrice"]
            for row in latest
            if isinstance(row.get("targetPrice"), (int, float))
        ])

    if upside is None:
        upside = average([
            row["upsidePercent"]
            for row in latest
            if isinstance(row.get("upsidePercent"), (int, float))
        ])

    return {
        "id": company_id(ticker),
        "ticker": ticker,
        "name": name,
        "provider": "Börskollen riktkurser",
        "source": "Börskollen",
        "sourceUrl": f"{BORSKOLLEN_BASE_URL}/{slug}/riktkurs",
        "slug": slug,
        "targetPrice": target_price,
        "upsidePercent": upside,
        "consensus": consensus,
        "targetCount": target_count,
        "latest": latest,
        "dataUpdatedAt": now_iso(),
        "errors": [],
    }


def load_existing(path: Path) -> dict[str, dict[str, Any]]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}

    companies = payload.get("companies")
    if not isinstance(companies, list):
        return {}

    existing: dict[str, dict[str, Any]] = {}
    for company in companies:
        if not isinstance(company, dict):
            continue
        cid = company.get("id")
        if isinstance(cid, str):
            existing[cid] = company
    return existing


def fetch_company(ticker: str, name: str, timeout: float) -> dict[str, Any]:
    errors: list[str] = []
    for slug in slug_candidates(ticker, name):
        try:
            html = fetch_html(slug, timeout)
            lines = extract_lines(html)
            if not looks_like_riktkurs_page(lines):
                errors.append(f"{slug}: no riktkurs content")
                continue
            parsed = parse_target_page(html, ticker, name, slug)
            if parsed.get("targetPrice") is None and not parsed.get("latest"):
                errors.append(f"{slug}: no target price found")
                continue
            parsed["errors"] = errors
            return parsed
        except urllib.error.HTTPError as exc:
            errors.append(f"{slug}: HTTP {exc.code}")
        except Exception as exc:
            errors.append(f"{slug}: {exc}")

    return {
        "id": company_id(ticker),
        "ticker": ticker,
        "name": name,
        "provider": "Börskollen riktkurser",
        "source": "Börskollen",
        "sourceUrl": None,
        "targetPrice": None,
        "upsidePercent": None,
        "consensus": None,
        "targetCount": None,
        "latest": [],
        "dataUpdatedAt": now_iso(),
        "errors": errors,
    }


def merge_with_existing(fetched: dict[str, Any], existing: dict[str, Any] | None) -> dict[str, Any]:
    if fetched.get("targetPrice") is not None or not existing:
        return fetched

    merged = dict(existing)
    errors = []
    if isinstance(existing.get("errors"), list):
        errors.extend(existing["errors"])
    if isinstance(fetched.get("errors"), list):
        errors.extend(fetched["errors"])
    merged["errors"] = errors
    merged["dataUpdatedAt"] = existing.get("dataUpdatedAt") or fetched.get("dataUpdatedAt")
    return merged


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Fetch Borskollen riktkurser for the OMXS30 universe.")
    parser.add_argument("--output", default=str(OUTPUT_PATH), help="Where to write data/riktkurser.json")
    parser.add_argument("--ticker", default="", help="Optional ticker to update first or alone, e.g. SEB-A.ST")
    parser.add_argument("--max-companies", type=int, default=0, help="Optional limit while testing")
    parser.add_argument("--delay", type=float, default=0.65, help="Delay between page requests")
    parser.add_argument("--timeout", type=float, default=20.0, help="HTTP timeout in seconds")
    args = parser.parse_args(argv)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    existing = load_existing(output_path)

    universe = list(OMXS30)
    if args.ticker:
        wanted = normalize_ticker(args.ticker)
        universe = [row for row in universe if row[0] == wanted]
        if not universe:
            raise SystemExit(f"Unknown OMXS30 ticker: {args.ticker}")
    elif args.max_companies and args.max_companies > 0:
        universe = universe[:args.max_companies]

    companies: list[dict[str, Any]] = []
    for index, (ticker, name, _sector) in enumerate(universe, start=1):
        print(f"[{index}/{len(universe)}] Fetching {ticker} {name}")
        fetched = fetch_company(ticker, name, args.timeout)
        companies.append(merge_with_existing(fetched, existing.get(company_id(ticker))))
        if index < len(universe) and args.delay > 0:
            time.sleep(args.delay)

    payload = {
        "provider": "Börskollen riktkurser",
        "source": "https://www.borskollen.se",
        "generatedAt": now_iso(),
        "universe": "OMXS30",
        "companies": companies,
    }
    output_text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    output_path.write_text(output_text, encoding="utf-8")

    mirror_name = None
    if output_path.name == "riktkurser.json":
        mirror_name = "price_targets.json"
    elif output_path.name == "price_targets.json":
        mirror_name = "riktkurser.json"

    if mirror_name:
        mirror_path = output_path.with_name(mirror_name)
        mirror_path.write_text(output_text, encoding="utf-8")
        print(f"Wrote {mirror_path}")

    loaded = sum(1 for company in companies if company.get("targetPrice") is not None)
    print(f"Wrote {output_path}")
    print(f"Companies with target price: {loaded}/{len(companies)}")
    return 0 if loaded else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
