#!/usr/bin/env python3
"""Fetch OMXS30 fundamentals, using Yahoo Finance unless a paid provider is selected."""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
import time
import urllib.parse
import urllib.error
import urllib.request
from datetime import datetime, time as day_time, timezone
from pathlib import Path
from statistics import median
from typing import Any
from zoneinfo import ZoneInfo

SCRIPT_PATH = Path(__file__).resolve()
ROOT = SCRIPT_PATH.parents[1] if SCRIPT_PATH.parent.name == "scripts" else SCRIPT_PATH.parent
OUTPUT_PATH = ROOT / "data" / "omxs30-data.json"
yf = None
FMP_BASE_URL = "https://financialmodelingprep.com/stable"
FMP_LEGACY_BASE_URL = "https://financialmodelingprep.com/api/v3"
EODHD_FUNDAMENTALS_URL = "https://eodhd.com/api/fundamentals"
BORSAPI_BASE_URL = "https://borsapi.se/api/v1"
STOCKHOLM_TZ = ZoneInfo("Europe/Stockholm")
FUNDAMENTALS_WINDOW_START = day_time(9, 10)
FUNDAMENTALS_WINDOW_END = day_time(9, 45)
CATEGORY_TICKERS = {
    "bank": {"SHB-A.ST", "NDA-SE.ST", "SEB-A.ST", "SWED-A.ST"},
    "investment": {"EQT.ST", "INDU-C.ST", "INVE-B.ST"},
    "cyclical": {"BOL.ST", "SCA-B.ST", "SKA-B.ST", "SKF-B.ST", "SAND.ST", "VOLV-B.ST"},
}

OMXS30 = [
    ("ABB.ST", "ABB Ltd", "Industrials"),
    ("ADDT-B.ST", "Addtech B", "Industrials"),
    ("ALFA.ST", "Alfa Laval", "Industrials"),
    ("ASSA-B.ST", "Assa Abloy B", "Industrials"),
    ("AZN.ST", "AstraZeneca", "Health Care"),
    ("ATCO-A.ST", "Atlas Copco A", "Industrials"),
    ("BOL.ST", "Boliden", "Materials"),
    ("EPI-A.ST", "Epiroc A", "Industrials"),
    ("EQT.ST", "EQT", "Financials"),
    ("ERIC-B.ST", "Ericsson B", "Information Technology"),
    ("ESSITY-B.ST", "Essity B", "Consumer Staples"),
    ("EVO.ST", "Evolution", "Consumer Discretionary"),
    ("SHB-A.ST", "Handelsbanken A", "Financials"),
    ("HM-B.ST", "Hennes & Mauritz B", "Consumer Discretionary"),
    ("HEXA-B.ST", "Hexagon B", "Information Technology"),
    ("INDU-C.ST", "Industrivarden C", "Financials"),
    ("INVE-B.ST", "Investor B", "Financials"),
    ("LIFCO-B.ST", "Lifco B", "Industrials"),
    ("NIBE-B.ST", "Nibe Industrier B", "Industrials"),
    ("NDA-SE.ST", "Nordea Bank Abp", "Financials"),
    ("SAAB-B.ST", "Saab B", "Industrials"),
    ("SAND.ST", "Sandvik", "Industrials"),
    ("SCA-B.ST", "SCA B", "Materials"),
    ("SEB-A.ST", "SEB A", "Financials"),
    ("SKA-B.ST", "Skanska B", "Industrials"),
    ("SKF-B.ST", "SKF B", "Industrials"),
    ("SWED-A.ST", "Swedbank A", "Financials"),
    ("TEL2-B.ST", "Tele2 B", "Communication Services"),
    ("TELIA.ST", "Telia Company", "Communication Services"),
    ("VOLV-B.ST", "Volvo B", "Industrials"),
]


def company_id(ticker: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in ticker).strip("-")


def normalize_ticker(value: str) -> str:
    ticker = value.strip().upper()
    return ticker if ticker.endswith(".ST") else f"{ticker}.ST"


def should_run_fundamentals_update(now: datetime) -> bool:
    local = now.astimezone(STOCKHOLM_TZ)
    local_time = local.time().replace(second=0, microsecond=0)
    return local.weekday() < 5 and FUNDAMENTALS_WINDOW_START <= local_time <= FUNDAMENTALS_WINDOW_END


def company_type(ticker: str) -> str:
    for category, tickers in CATEGORY_TICKERS.items():
        if ticker in tickers:
            return category
    return "operating"


def finite(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number) or math.isinf(number):
        return None
    return number


def clean(value: Any) -> Any:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return finite(value)
    if value is None:
        return None
    if isinstance(value, list):
        return [clean(item) for item in value]
    if isinstance(value, dict):
        return {str(key): clean(item) for key, item in value.items()}
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def pick(mapping: dict[str, Any], keys: list[str]) -> Any:
    for key in keys:
        value = mapping.get(key)
        if value not in (None, "", [], {}):
            return value
    return None


def latest_from_statement(statement: Any, rows: list[str]) -> float | None:
    if statement is None or getattr(statement, "empty", True):
        return None
    for row in rows:
        if row not in statement.index:
            continue
        series = statement.loc[row]
        for value in series:
            number = finite(value)
            if number is not None:
                return number
    return None


def statement_series(statement: Any, rows: list[str]) -> list[float]:
    if statement is None or getattr(statement, "empty", True):
        return []
    for row in rows:
        if row not in statement.index:
            continue
        values = []
        for value in statement.loc[row]:
            number = finite(value)
            if number is not None:
                values.append(number)
        return values
    return []


def pct(value: Any) -> float | None:
    number = finite(value)
    if number is None:
        return None
    if abs(number) <= 1:
        return number * 100
    return number


def historical_cagr(values: list[float]) -> float | None:
    positives = [value for value in values if value > 0]
    if len(positives) < 2:
        return None
    newest = positives[0]
    oldest = positives[-1]
    years = len(positives) - 1
    if oldest <= 0 or years <= 0:
        return None
    return ((newest / oldest) ** (1 / years) - 1) * 100


def fast_info_value(fast_info: Any, key: str) -> Any:
    try:
        return fast_info.get(key)
    except Exception:
        try:
            return getattr(fast_info, key)
        except Exception:
            return None


def ensure_yfinance() -> bool:
    global yf
    if yf is not None:
        return True
    try:
        import yfinance as yfinance_module
    except ImportError:
        return False
    yf = yfinance_module
    return True


def yahoo_reference_fields(ticker: str) -> tuple[dict[str, Any], list[str]]:
    errors: list[str] = []
    if not ensure_yfinance():
        return {}, ["Yahoo reference fields: yfinance is not installed"]

    ticker_obj = yf.Ticker(ticker)
    try:
        fast_info = ticker_obj.fast_info
    except Exception as exc:
        fast_info = {}
        errors.append(f"Yahoo reference fast_info: {exc}")

    try:
        info = ticker_obj.info or {}
    except Exception as exc:
        info = {}
        errors.append(f"Yahoo reference info: {exc}")

    market_price = finite(fast_info_value(fast_info, "lastPrice")) or finite(pick(info, ["currentPrice", "regularMarketPrice"]))
    market_cap = finite(fast_info_value(fast_info, "marketCap")) or finite(pick(info, ["marketCap"]))
    shares = (
        finite(fast_info_value(fast_info, "shares"))
        or finite(pick(info, ["sharesOutstanding", "impliedSharesOutstanding"]))
        or (market_cap / market_price if market_cap and market_price else None)
    )

    return {
        "marketCap": market_cap,
        "sharesOutstanding": shares,
    }, errors


def get_exchange_rate(from_currency: str | None, to_currency: str | None, cache: dict[tuple[str, str], float]) -> float:
    if not from_currency or not to_currency or from_currency == to_currency:
        return 1.0

    pair = (from_currency.upper(), to_currency.upper())
    if pair in cache:
        return cache[pair]

    if not ensure_yfinance():
        cache[pair] = 1.0
        return 1.0

    direct_symbol = f"{pair[0]}{pair[1]}=X"
    inverse_symbol = f"{pair[1]}{pair[0]}=X"

    for symbol, inverse in ((direct_symbol, False), (inverse_symbol, True)):
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.fast_info
            rate = finite(fast_info_value(info, "lastPrice")) or finite(fast_info_value(info, "regularMarketPreviousClose"))
            if rate and rate > 0:
                cache[pair] = 1 / rate if inverse else rate
                return cache[pair]
        except Exception:
            continue

    cache[pair] = 1.0
    return 1.0


def scaled(value: float | None, exchange_rate: float) -> float | None:
    if value is None:
        return None
    return value * exchange_rate


def per_share(value: float | None, shares: float | None, exchange_rate: float) -> float | None:
    if value is None or not shares or shares <= 0:
        return None
    return (value * exchange_rate) / shares


def median_per_share(values: list[float], shares: float | None, exchange_rate: float) -> float | None:
    if not shares or shares <= 0:
        return None
    per_share_values = [(value * exchange_rate) / shares for value in values if finite(value) is not None]
    positives = [value for value in per_share_values if value > 0]
    sample = positives or per_share_values
    return median(sample) if sample else None


def has_balance_sheet_data(company: dict[str, Any]) -> bool:
    return any(company.get(key) is not None for key in ("totalAssets", "bookEquity", "totalLiabilities"))


def fmp_symbol(ticker: str) -> str:
    return ticker


def fmp_error_message(endpoint: str, exc: urllib.error.HTTPError) -> str:
    try:
        body = exc.read().decode("utf-8", "replace").strip()
    except Exception:
        body = ""
    detail = body[:500] if body else exc.reason
    return f"FMP {endpoint} HTTP {exc.code}: {detail}"


def parse_fmp_payload(endpoint: str, payload: Any) -> Any:
    if isinstance(payload, dict):
        for key in ("Error Message", "error", "message"):
            message = payload.get(key)
            if isinstance(message, str) and message:
                raise ValueError(f"FMP {endpoint}: {message}")
    return payload


def fetch_fmp_json(endpoint: str, api_key: str, timeout: float, **params: Any) -> Any:
    query = {
        **params,
        "apikey": api_key,
    }
    url = f"{FMP_BASE_URL}/{endpoint}?{urllib.parse.urlencode(query)}"

    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise ValueError(fmp_error_message(endpoint, exc)) from exc

    return parse_fmp_payload(endpoint, payload)


def fetch_fmp_legacy_json(endpoint: str, api_key: str, symbol: str, timeout: float, **params: Any) -> Any:
    query = {
        **params,
        "apikey": api_key,
    }
    quoted_symbol = urllib.parse.quote(symbol, safe="")
    url = f"{FMP_LEGACY_BASE_URL}/{endpoint}/{quoted_symbol}?{urllib.parse.urlencode(query)}"

    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise ValueError(fmp_error_message(f"api/v3/{endpoint}", exc)) from exc

    return parse_fmp_payload(f"api/v3/{endpoint}", payload)


def normalize_fmp_rows(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        rows = [row for row in payload if isinstance(row, dict)]
    elif isinstance(payload, dict):
        rows = [payload] if payload else []
    else:
        rows = []
    return sorted(rows, key=lambda row: parse_report_date(row.get("date") or row.get("calendarYear")), reverse=True)


def fmp_rows(endpoint: str, api_key: str, symbol: str, timeout: float, limit: int = 5) -> tuple[list[dict[str, Any]], list[str]]:
    errors: list[str] = []
    attempts = (
        ("legacy", lambda: fetch_fmp_legacy_json(endpoint, api_key, symbol, timeout, period="annual", limit=limit)),
        ("stable", lambda: fetch_fmp_json(endpoint, api_key, timeout, symbol=symbol, limit=limit)),
    )

    for label, request in attempts:
        try:
            rows = normalize_fmp_rows(request())
        except Exception as exc:
            errors.append(f"{endpoint} {label}: {exc}")
            continue
        if rows:
            return rows, errors

        errors.append(f"{endpoint} {label}: no rows returned")

    return [], errors


def normalize_fmp_profile(payload: Any) -> dict[str, Any]:
    if isinstance(payload, list):
        return next((row for row in payload if isinstance(row, dict)), {})
    if isinstance(payload, dict):
        return payload
    return {}


def fmp_profile(api_key: str, symbol: str, timeout: float) -> tuple[dict[str, Any], list[str]]:
    errors: list[str] = []
    attempts = (
        ("stable", lambda: fetch_fmp_json("profile", api_key, timeout, symbol=symbol)),
        ("legacy", lambda: fetch_fmp_legacy_json("profile", api_key, symbol, timeout)),
    )

    for label, request in attempts:
        try:
            profile = normalize_fmp_profile(request())
        except Exception as exc:
            errors.append(f"profile {label}: {exc}")
            continue
        if profile:
            return profile, errors
        errors.append(f"profile {label}: no rows returned")

    return {}, errors


def eodhd_symbol(ticker: str) -> str:
    return ticker


def fetch_eodhd_json(path: str, api_token: str, timeout: float) -> dict[str, Any]:
    params = urllib.parse.urlencode({
        "api_token": api_token,
        "fmt": "json",
    })
    url = f"{EODHD_FUNDAMENTALS_URL}/{urllib.parse.quote(path)}?{params}"

    with urllib.request.urlopen(url, timeout=timeout) as response:
        payload = json.loads(response.read().decode("utf-8"))

    if not isinstance(payload, dict):
        raise ValueError("Unexpected EODHD fundamentals response")
    if payload.get("Error"):
        raise ValueError(str(payload["Error"]))
    return payload


def borsapi_symbol(ticker: str) -> str:
    return ticker.upper().removesuffix(".ST")


def borsapi_error_message(path: str, exc: urllib.error.HTTPError) -> str:
    try:
        body = exc.read().decode("utf-8", "replace").strip()
    except Exception:
        body = ""
    detail = body[:500] if body else exc.reason
    return f"BörsAPI {path} HTTP {exc.code}: {detail}"


def fetch_borsapi_json(path: str, api_key: str, timeout: float, **params: Any) -> dict[str, Any]:
    query = urllib.parse.urlencode({key: value for key, value in params.items() if value is not None})
    url = f"{BORSAPI_BASE_URL}/{path.lstrip('/')}"
    if query:
        url = f"{url}?{query}"

    request = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise ValueError(borsapi_error_message(path, exc)) from exc

    if not isinstance(payload, dict):
        raise ValueError(f"BörsAPI {path}: unexpected response")
    if payload.get("error"):
        raise ValueError(f"BörsAPI {path}: {payload.get('error')}")
    return payload


def load_existing_borsapi_ids(path: Path) -> dict[str, str]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}

    companies = payload.get("companies")
    if not isinstance(companies, list):
        return {}

    ids = {}
    for company in companies:
        if not isinstance(company, dict):
            continue
        ticker = company.get("ticker")
        borsapi_id = company.get("borsapiCompanyId")
        if isinstance(ticker, str) and isinstance(borsapi_id, str) and borsapi_id:
            ids[ticker.upper()] = borsapi_id
    return ids


def load_existing_companies(path: Path) -> dict[str, dict[str, Any]]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}

    companies = payload.get("companies")
    if not isinstance(companies, list):
        return {}

    by_id = {}
    for company in companies:
        if not isinstance(company, dict):
            continue
        cid = company.get("id")
        if isinstance(cid, str) and cid:
            by_id[cid] = company
    return by_id


PRESERVE_IF_PROVIDER_BLANK_KEYS = {
    "marketCap",
    "sharesOutstanding",
}


def is_blank(value: Any) -> bool:
    return value in (None, "", [], {})


def fill_missing_from_existing(company: dict[str, Any], existing: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(existing, dict):
        return company

    merged = dict(company)
    for key in PRESERVE_IF_PROVIDER_BLANK_KEYS:
        if is_blank(merged.get(key)) and not is_blank(existing.get(key)):
            merged[key] = existing[key]
    return merged


def borsapi_company_lookup(api_key: str, ticker: str, name: str, sector: str, timeout: float, cached_id: str | None) -> tuple[dict[str, Any], list[str]]:
    symbol = borsapi_symbol(ticker)
    if cached_id:
        return {
            "id": cached_id,
            "ticker": symbol,
            "name": name,
            "sector": sector,
        }, []

    payload = fetch_borsapi_json("companies", api_key, timeout, ticker=symbol, limit=5)
    rows = payload.get("data")
    if not isinstance(rows, list):
        rows = []

    exact = next(
        (
            row for row in rows
            if isinstance(row, dict) and str(row.get("ticker", "")).upper() == symbol
        ),
        None,
    )
    company = exact or next((row for row in rows if isinstance(row, dict)), None)
    if not company:
        raise ValueError(f"BörsAPI companies: no match for {symbol}")

    warnings = []
    if str(company.get("ticker", "")).upper() != symbol:
        warnings.append(f"BörsAPI ticker lookup used {company.get('ticker')} for {symbol}")
    return company, warnings


def borsapi_reports(payload: dict[str, Any]) -> list[dict[str, Any]]:
    rows = payload.get("data")
    if not isinstance(rows, list):
        return []
    return sorted(
        [row for row in rows if isinstance(row, dict)],
        key=report_sort_key,
        reverse=True,
    )


def borsapi_latest_report(
    reports: list[dict[str, Any]],
    report_type: str,
    *,
    prefer_ttm: bool = False,
    avoid_ttm: bool = False,
) -> dict[str, Any]:
    candidates = [
        report for report in reports
        if str(report.get("report_type", "")).upper() == report_type.upper()
    ]
    if prefer_ttm:
        ttm_rows = [report for report in candidates if "TTM" in str(report.get("period", "")).upper()]
        if ttm_rows:
            return ttm_rows[0]
    if avoid_ttm:
        non_ttm_rows = [report for report in candidates if "TTM" not in str(report.get("period", "")).upper()]
        if non_ttm_rows:
            return non_ttm_rows[0]
    return candidates[0] if candidates else {}


BORSAPI_INCOME_CONTAINERS = ("income_statement", "incomeStatement", "income")
BORSAPI_BALANCE_CONTAINERS = ("balance_sheet", "balanceSheet", "balance")
BORSAPI_CASHFLOW_CONTAINERS = ("cash_flow_statement", "cashFlowStatement", "cash_flow", "cashflow")

BORSAPI_REVENUE_KEYS = ("revenue", "total_revenue", "net_sales", "sales", "omsattning", "omsättning")
BORSAPI_EBITDA_KEYS = ("ebitda",)
BORSAPI_DEPRECIATION_KEYS = ("depreciation_and_amortization", "depreciation", "depreciation_amortization")
BORSAPI_EBIT_KEYS = ("operating_income", "adjusted_operating_income", "ebit")
BORSAPI_NET_INCOME_KEYS = ("net_income", "profit_for_period", "net_profit")
BORSAPI_EPS_KEYS = ("eps", "earnings_per_share")
BORSAPI_SHARES_KEYS = ("shares_outstanding", "number_of_shares", "shares")
BORSAPI_OPERATING_CASHFLOW_KEYS = (
    "operating_cash_flow",
    "cash_flow_from_operating_activities",
    "cashflow_from_operations",
)
BORSAPI_CAPEX_KEYS = ("capex", "capital_expenditure", "capital_expenditures")
BORSAPI_FCF_KEYS = ("free_cash_flow", "free_cashflow", "fcf")
BORSAPI_ASSETS_KEYS = ("total_assets", "assets")
BORSAPI_LIABILITIES_KEYS = ("total_liabilities", "liabilities")
BORSAPI_EQUITY_KEYS = ("total_equity", "book_equity", "equity", "shareholders_equity", "stockholders_equity")
BORSAPI_CASH_KEYS = ("cash_and_equivalents", "cash_and_cash_equivalents", "cash")
BORSAPI_SHORT_DEBT_KEYS = ("short_term_debt", "current_debt", "short_term_borrowings")
BORSAPI_LONG_DEBT_KEYS = ("long_term_debt", "non_current_debt", "long_term_borrowings")
BORSAPI_TOTAL_DEBT_KEYS = ("total_debt", "interest_bearing_liabilities", "borrowings", "debt")


def normalize_borsapi_key(key: Any) -> str:
    return re.sub(r"[^a-z0-9]", "", str(key).lower())


def borsapi_statement_sources(report: dict[str, Any], containers: tuple[str, ...]) -> list[dict[str, Any]]:
    sources = [report]
    for container in containers:
        nested = report.get(container)
        if isinstance(nested, dict):
            sources.append(nested)
    return sources


def borsapi_pick(report: dict[str, Any], containers: tuple[str, ...], keys: tuple[str, ...]) -> Any:
    for source in borsapi_statement_sources(report, containers):
        value = pick(source, list(keys))
        if value not in (None, "", [], {}):
            return value

        normalized = {
            normalize_borsapi_key(key): value
            for key, value in source.items()
        }
        for key in keys:
            value = normalized.get(normalize_borsapi_key(key))
            if value not in (None, "", [], {}):
                return value
    return None


def borsapi_number(report: dict[str, Any], containers: tuple[str, ...], keys: tuple[str, ...]) -> float | None:
    return finite(borsapi_pick(report, containers, keys))


def borsapi_positive(report: dict[str, Any], containers: tuple[str, ...], keys: tuple[str, ...]) -> float | None:
    number = borsapi_number(report, containers, keys)
    return abs(number) if number is not None else None


def borsapi_report_has_any(report: dict[str, Any], containers: tuple[str, ...], keys: tuple[str, ...]) -> bool:
    return any(borsapi_number(report, containers, (key,)) is not None for key in keys)


def borsapi_latest_report_with_any(
    reports: list[dict[str, Any]],
    report_type: str,
    containers: tuple[str, ...],
    keys: tuple[str, ...],
    *,
    prefer_ttm: bool = False,
    avoid_ttm: bool = False,
) -> dict[str, Any]:
    candidates = [
        report for report in reports
        if str(report.get("report_type", "")).upper() == report_type.upper()
    ]
    if prefer_ttm:
        ttm_rows = [report for report in candidates if "TTM" in str(report.get("period", "")).upper()]
        non_ttm_rows = [report for report in candidates if "TTM" not in str(report.get("period", "")).upper()]
        ordered = [*ttm_rows, *non_ttm_rows]
    elif avoid_ttm:
        non_ttm_rows = [report for report in candidates if "TTM" not in str(report.get("period", "")).upper()]
        ttm_rows = [report for report in candidates if "TTM" in str(report.get("period", "")).upper()]
        ordered = [*non_ttm_rows, *ttm_rows]
    else:
        ordered = candidates

    for report in ordered:
        if borsapi_report_has_any(report, containers, keys):
            return report
    return borsapi_latest_report(reports, report_type, prefer_ttm=prefer_ttm, avoid_ttm=avoid_ttm)


def borsapi_statement_values(
    reports: list[dict[str, Any]],
    report_type: str,
    containers: tuple[str, ...],
    keys: tuple[str, ...],
) -> list[float]:
    values = []
    for report in reports:
        if str(report.get("report_type", "")).upper() != report_type.upper():
            continue
        number = borsapi_number(report, containers, keys)
        if number is not None:
            values.append(number)
    return values


def borsapi_cashflow_values(reports: list[dict[str, Any]]) -> list[float]:
    values = []
    for report in reports:
        if str(report.get("report_type", "")).upper() != "KA":
            continue
        free_cashflow = borsapi_number(report, BORSAPI_CASHFLOW_CONTAINERS, BORSAPI_FCF_KEYS)
        if free_cashflow is None:
            operating_cashflow = borsapi_number(report, BORSAPI_CASHFLOW_CONTAINERS, BORSAPI_OPERATING_CASHFLOW_KEYS)
            capex = borsapi_number(report, BORSAPI_CASHFLOW_CONTAINERS, BORSAPI_CAPEX_KEYS)
            if operating_cashflow is not None and capex is not None:
                free_cashflow = operating_cashflow + capex
        if free_cashflow is not None:
            values.append(free_cashflow)
    return values


def borsapi_ebitda(report: dict[str, Any]) -> float | None:
    ebitda = borsapi_number(report, BORSAPI_INCOME_CONTAINERS, BORSAPI_EBITDA_KEYS)
    if ebitda is not None:
        return ebitda

    ebit = borsapi_number(report, BORSAPI_INCOME_CONTAINERS, BORSAPI_EBIT_KEYS)
    depreciation = borsapi_number(report, BORSAPI_INCOME_CONTAINERS, BORSAPI_DEPRECIATION_KEYS)
    if ebit is not None and depreciation is not None:
        return ebit - depreciation if depreciation < 0 else ebit + depreciation
    return None


def positive(value: Any) -> float | None:
    number = finite(value)
    return abs(number) if number is not None else None


def mapping_get(mapping: dict[str, Any] | None, key: str) -> Any:
    return mapping.get(key) if isinstance(mapping, dict) else None


def parse_report_date(value: Any) -> datetime:
    if not value:
        return datetime.min
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return datetime.min


def parse_period_sort_date(value: Any) -> datetime:
    if not value:
        return datetime.min

    text = str(value).upper().replace(" TTM", "")
    match = re.search(r"(?P<year>\d{4})(?:-Q(?P<quarter>[1-4]))?", text)
    if not match:
        return datetime.min

    year = int(match.group("year"))
    quarter = int(match.group("quarter") or 4)
    month = quarter * 3
    return datetime(year, month, 28)


def report_sort_key(report: dict[str, Any]) -> datetime:
    report_date = parse_report_date(report.get("report_date") or report.get("date"))
    if report_date != datetime.min:
        return report_date
    return parse_period_sort_date(report.get("period"))


def eodhd_reports(payload: dict[str, Any], statement: str, period: str = "yearly") -> list[dict[str, Any]]:
    statement_payload = mapping_get(payload.get("Financials"), statement)
    rows = mapping_get(statement_payload, period)
    if isinstance(rows, dict):
        reports = [row for row in rows.values() if isinstance(row, dict)]
    elif isinstance(rows, list):
        reports = [row for row in rows if isinstance(row, dict)]
    else:
        reports = []
    return sorted(reports, key=lambda row: parse_report_date(row.get("date") or row.get("filing_date")), reverse=True)


def eodhd_latest_report(payload: dict[str, Any], statement: str, period: str = "yearly") -> dict[str, Any]:
    reports = eodhd_reports(payload, statement, period)
    return reports[0] if reports else {}


def eodhd_statement_values(payload: dict[str, Any], statement: str, keys: list[str], period: str = "yearly") -> list[float]:
    values = []
    for report in eodhd_reports(payload, statement, period):
        value = pick(report, keys)
        number = finite(value)
        if number is not None:
            values.append(number)
    return values


def eodhd_outstanding_shares(payload: dict[str, Any]) -> float | None:
    shares_stats = payload.get("SharesStats") if isinstance(payload.get("SharesStats"), dict) else {}
    shares = finite(shares_stats.get("SharesOutstanding"))
    if shares:
        return shares

    outstanding = payload.get("outstandingShares") if isinstance(payload.get("outstandingShares"), dict) else {}
    for period in ("quarterly", "annual"):
        rows = outstanding.get(period)
        if not isinstance(rows, dict):
            continue
        reports = sorted(
            [row for row in rows.values() if isinstance(row, dict)],
            key=lambda row: parse_report_date(row.get("dateFormatted") or row.get("date")),
            reverse=True
        )
        for report in reports:
            shares = finite(report.get("shares"))
            if shares:
                return shares
    return None


def fetch_fmp_company(
    api_key: str,
    ticker: str,
    name: str,
    sector: str,
    fx_cache: dict[tuple[str, str], float],
    timeout: float
) -> dict[str, Any]:
    errors: list[str] = []
    symbol = fmp_symbol(ticker)
    profile, profile_errors = fmp_profile(api_key, symbol, timeout)
    income_rows, income_errors = fmp_rows("income-statement", api_key, symbol, timeout)
    balance_rows, balance_errors = fmp_rows("balance-sheet-statement", api_key, symbol, timeout)
    cashflow_rows, cashflow_errors = fmp_rows("cash-flow-statement", api_key, symbol, timeout)
    errors.extend(profile_errors)
    errors.extend(income_errors)
    errors.extend(balance_errors)
    errors.extend(cashflow_errors)

    latest_income = income_rows[0] if income_rows else {}
    latest_balance = balance_rows[0] if balance_rows else {}
    latest_cashflow = cashflow_rows[0] if cashflow_rows else {}

    quote_currency = pick(profile, ["currency"]) or "SEK"
    financial_currency = (
        pick(latest_income, ["reportedCurrency"])
        or pick(latest_balance, ["reportedCurrency"])
        or pick(latest_cashflow, ["reportedCurrency"])
        or quote_currency
    )
    exchange_rate = get_exchange_rate(str(financial_currency), str(quote_currency), fx_cache)

    price = finite(pick(profile, ["price"]))
    market_cap = finite(pick(profile, ["mktCap", "marketCap"]))
    shares = (
        finite(pick(latest_income, ["weightedAverageShsOutDil", "weightedAverageShsOut"]))
        or (market_cap / price if market_cap and price else None)
    )

    revenue = finite(pick(latest_income, ["revenue", "totalRevenue"]))
    ebitda = finite(pick(latest_income, ["ebitda"]))
    ebit = finite(pick(latest_income, ["operatingIncome", "ebit"]))
    net_income = finite(pick(latest_income, ["netIncome"]))
    operating_cashflow = finite(pick(latest_cashflow, ["operatingCashFlow", "netCashProvidedByOperatingActivities"]))
    capital_expenditure = finite(pick(latest_cashflow, ["capitalExpenditure", "capitalExpenditures"]))
    free_cashflow = finite(pick(latest_cashflow, ["freeCashFlow"]))
    if free_cashflow is None and operating_cashflow is not None and capital_expenditure is not None:
        free_cashflow = operating_cashflow + capital_expenditure

    total_assets = finite(pick(latest_balance, ["totalAssets"]))
    liabilities = finite(pick(latest_balance, ["totalLiabilities"]))
    equity = finite(pick(latest_balance, ["totalStockholdersEquity", "totalEquity"]))
    total_debt = finite(pick(latest_balance, ["totalDebt"]))
    cash = finite(pick(latest_balance, ["cashAndCashEquivalents", "cashAndShortTermInvestments"]))
    net_debt = finite(pick(latest_balance, ["netDebt"]))
    if net_debt is None and (total_debt is not None or cash is not None):
        net_debt = (total_debt or 0) - (cash or 0)

    fcf_values = [value for value in (finite(row.get("freeCashFlow")) for row in cashflow_rows) if value is not None]
    ebitda_values = [value for value in (finite(row.get("ebitda")) for row in income_rows) if value is not None]
    revenue_values = [value for value in (finite(row.get("revenue")) for row in income_rows) if value is not None]

    eps_per_share = scaled(
        finite(pick(latest_income, ["epsdiluted", "eps"])),
        exchange_rate
    ) or per_share(net_income, shares, exchange_rate)
    book_value_per_share = per_share(equity, shares, exchange_rate)
    ebitda_per_share = per_share(ebitda, shares, exchange_rate)
    fcf_per_share = per_share(free_cashflow, shares, exchange_rate)
    normalized_fcf_per_share = median_per_share(fcf_values, shares, exchange_rate)
    normalized_ebitda_per_share = median_per_share(ebitda_values, shares, exchange_rate)
    net_debt_per_share = per_share(net_debt, shares, exchange_rate)
    roe = (net_income / equity) * 100 if net_income is not None and equity and equity > 0 else None

    growth = historical_cagr(revenue_values) or historical_cagr(fcf_values)
    trailing_pe = (price / eps_per_share) if price and eps_per_share and eps_per_share > 0 else None
    target_pe = trailing_pe
    if target_pe is not None:
        target_pe = min(max(target_pe, 5), 35)

    enterprise_value = (market_cap + scaled(net_debt, exchange_rate)) if market_cap is not None and net_debt is not None else None
    scaled_ebitda = scaled(ebitda, exchange_rate)
    ev_to_ebitda = (enterprise_value / scaled_ebitda) if enterprise_value is not None and scaled_ebitda and scaled_ebitda > 0 else None
    target_ev_to_ebitda = min(max(ev_to_ebitda, 4), 25) if ev_to_ebitda is not None else None

    output = {
        "id": company_id(ticker),
        "ticker": ticker,
        "fmpSymbol": symbol,
        "name": pick(profile, ["companyName", "companyNameLong"]) or name,
        "sector": pick(profile, ["sector"]) or sector,
        "companyType": company_type(ticker),
        "source": "Financial Modeling Prep",
        "dataUpdatedAt": datetime.now(timezone.utc).isoformat(),
        "currency": quote_currency,
        "financialCurrency": financial_currency,
        "financialToQuoteFx": exchange_rate,
        "marketPrice": price,
        "marketCap": market_cap,
        "sharesOutstanding": shares,
        "totalRevenue": scaled(revenue, exchange_rate),
        "ebitda": scaled(ebitda, exchange_rate),
        "ebit": scaled(ebit, exchange_rate),
        "netIncome": scaled(net_income, exchange_rate),
        "operatingCashFlow": scaled(operating_cashflow, exchange_rate),
        "capitalExpenditures": scaled(capital_expenditure, exchange_rate),
        "freeCashFlow": scaled(free_cashflow, exchange_rate),
        "totalAssets": scaled(total_assets, exchange_rate),
        "totalLiabilities": scaled(liabilities, exchange_rate),
        "bookEquity": scaled(equity, exchange_rate),
        "totalDebt": scaled(total_debt, exchange_rate),
        "cash": scaled(cash, exchange_rate),
        "netDebt": scaled(net_debt, exchange_rate),
        "enterpriseValue": enterprise_value,
        "evToEbitda": ev_to_ebitda,
        "targetEvToEbitda": target_ev_to_ebitda,
        "fcfPerShare": fcf_per_share,
        "ebitdaPerShare": ebitda_per_share,
        "normalizedFcfPerShare": normalized_fcf_per_share,
        "normalizedEbitdaPerShare": normalized_ebitda_per_share,
        "eps": eps_per_share,
        "netDebtPerShare": net_debt_per_share,
        "bookValuePerShare": book_value_per_share,
        "equityPerShare": book_value_per_share,
        "liabilitiesPerShare": per_share(liabilities, shares, exchange_rate),
        "roe": roe,
        "growth5y": growth,
        "consensusGrowth": growth,
        "targetPe": target_pe,
        "trailingPe": trailing_pe,
        "forwardPe": None,
        "analystTargetMeanPrice": None,
        "recommendationMean": None,
        "latestFiscalDate": pick(latest_income, ["date"]),
        "errors": errors,
    }

    return {key: clean(value) for key, value in output.items()}


def fetch_eodhd_company(
    api_token: str,
    ticker: str,
    name: str,
    sector: str,
    fx_cache: dict[tuple[str, str], float],
    timeout: float
) -> dict[str, Any]:
    errors: list[str] = []
    payload = fetch_eodhd_json(eodhd_symbol(ticker), api_token, timeout)

    general = payload.get("General") if isinstance(payload.get("General"), dict) else {}
    highlights = payload.get("Highlights") if isinstance(payload.get("Highlights"), dict) else {}
    valuation = payload.get("Valuation") if isinstance(payload.get("Valuation"), dict) else {}
    latest_income = eodhd_latest_report(payload, "Income_Statement")
    latest_balance = eodhd_latest_report(payload, "Balance_Sheet")
    latest_cashflow = eodhd_latest_report(payload, "Cash_Flow")

    quote_currency = pick(general, ["CurrencyCode"]) or pick(highlights, ["Currency"]) or "SEK"
    financial_currency = (
        pick(latest_income, ["currency_symbol"])
        or pick(latest_balance, ["currency_symbol"])
        or pick(latest_cashflow, ["currency_symbol"])
        or quote_currency
    )
    exchange_rate = get_exchange_rate(str(financial_currency), str(quote_currency), fx_cache)

    shares = eodhd_outstanding_shares(payload)
    market_cap = finite(pick(highlights, ["MarketCapitalization"])) or finite(pick(highlights, ["MarketCapitalizationMln"]))
    if market_cap and market_cap < 10_000_000:
        market_cap *= 1_000_000

    price = (market_cap / shares) if market_cap and shares else None

    revenue = (
        finite(pick(latest_income, ["totalRevenue"]))
        or finite(pick(highlights, ["RevenueTTM"]))
    )
    ebitda = (
        finite(pick(latest_income, ["ebitda"]))
        or finite(pick(highlights, ["EBITDA"]))
    )
    ebit = finite(pick(latest_income, ["ebit", "operatingIncome"]))
    net_income = finite(pick(latest_income, ["netIncome", "netIncomeApplicableToCommonShares"]))
    operating_cashflow = finite(pick(latest_cashflow, ["totalCashFromOperatingActivities"]))
    capital_expenditure = finite(pick(latest_cashflow, ["capitalExpenditures"]))
    free_cashflow = finite(pick(latest_cashflow, ["freeCashFlow"]))
    if free_cashflow is None and operating_cashflow is not None and capital_expenditure is not None:
        free_cashflow = operating_cashflow + capital_expenditure

    total_assets = finite(pick(latest_balance, ["totalAssets"]))
    liabilities = finite(pick(latest_balance, ["totalLiab", "totalLiabilities"]))
    equity = finite(pick(latest_balance, ["totalStockholderEquity", "totalEquity"]))
    total_debt = finite(pick(latest_balance, ["shortLongTermDebtTotal", "totalDebt", "longTermDebtTotal"]))
    cash = finite(pick(latest_balance, ["cashAndEquivalents", "cash", "cashAndShortTermInvestments"]))
    net_debt = finite(pick(latest_balance, ["netDebt"]))
    if net_debt is None and (total_debt is not None or cash is not None):
        net_debt = (total_debt or 0) - (cash or 0)

    fcf_values = eodhd_statement_values(payload, "Cash_Flow", ["freeCashFlow"])
    ebitda_values = eodhd_statement_values(payload, "Income_Statement", ["ebitda"])
    revenue_values = eodhd_statement_values(payload, "Income_Statement", ["totalRevenue"])

    eps_per_share = (
        per_share(net_income, shares, exchange_rate)
        or finite(pick(highlights, ["DilutedEpsTTM", "EarningsShare"]))
    )
    book_value_per_share = (
        per_share(equity, shares, exchange_rate)
        or finite(pick(highlights, ["BookValue"]))
    )
    ebitda_per_share = per_share(ebitda, shares, exchange_rate)
    fcf_per_share = per_share(free_cashflow, shares, exchange_rate)
    normalized_fcf_per_share = median_per_share(fcf_values, shares, exchange_rate)
    normalized_ebitda_per_share = median_per_share(ebitda_values, shares, exchange_rate)
    net_debt_per_share = per_share(net_debt, shares, exchange_rate)
    roe = pct(pick(highlights, ["ReturnOnEquityTTM"]))
    if roe is None and net_income is not None and equity and equity > 0:
        roe = (net_income / equity) * 100

    growth = (
        pct(pick(highlights, ["QuarterlyRevenueGrowthYOY", "QuarterlyEarningsGrowthYOY"]))
        or historical_cagr(revenue_values)
        or historical_cagr(fcf_values)
    )
    target_pe = finite(pick(valuation, ["ForwardPE", "TrailingPE"])) or finite(pick(highlights, ["PERatio"]))
    if target_pe is not None:
        target_pe = min(max(target_pe, 5), 35)

    ev_to_ebitda = finite(pick(valuation, ["EnterpriseValueEbitda"]))
    target_ev_to_ebitda = min(max(ev_to_ebitda, 4), 25) if ev_to_ebitda is not None else None

    output = {
        "id": company_id(ticker),
        "ticker": ticker,
        "name": pick(general, ["Name"]) or name,
        "sector": pick(general, ["Sector"]) or sector,
        "companyType": company_type(ticker),
        "source": "EODHD",
        "dataUpdatedAt": datetime.now(timezone.utc).isoformat(),
        "currency": quote_currency,
        "financialCurrency": financial_currency,
        "financialToQuoteFx": exchange_rate,
        "marketPrice": price,
        "marketCap": market_cap,
        "sharesOutstanding": shares,
        "totalRevenue": scaled(revenue, exchange_rate),
        "ebitda": scaled(ebitda, exchange_rate),
        "ebit": scaled(ebit, exchange_rate),
        "netIncome": scaled(net_income, exchange_rate),
        "operatingCashFlow": scaled(operating_cashflow, exchange_rate),
        "capitalExpenditures": scaled(capital_expenditure, exchange_rate),
        "freeCashFlow": scaled(free_cashflow, exchange_rate),
        "totalAssets": scaled(total_assets, exchange_rate),
        "totalLiabilities": scaled(liabilities, exchange_rate),
        "bookEquity": scaled(equity, exchange_rate),
        "totalDebt": scaled(total_debt, exchange_rate),
        "cash": scaled(cash, exchange_rate),
        "netDebt": scaled(net_debt, exchange_rate),
        "enterpriseValue": finite(pick(valuation, ["EnterpriseValue"])),
        "evToEbitda": ev_to_ebitda,
        "targetEvToEbitda": target_ev_to_ebitda,
        "fcfPerShare": fcf_per_share,
        "ebitdaPerShare": ebitda_per_share,
        "normalizedFcfPerShare": normalized_fcf_per_share,
        "normalizedEbitdaPerShare": normalized_ebitda_per_share,
        "eps": eps_per_share,
        "netDebtPerShare": net_debt_per_share,
        "bookValuePerShare": book_value_per_share,
        "equityPerShare": book_value_per_share,
        "liabilitiesPerShare": per_share(liabilities, shares, exchange_rate),
        "roe": roe,
        "growth5y": growth,
        "consensusGrowth": growth,
        "targetPe": target_pe,
        "trailingPe": finite(pick(valuation, ["TrailingPE"])) or finite(pick(highlights, ["PERatio"])),
        "forwardPe": finite(pick(valuation, ["ForwardPE"])),
        "analystTargetMeanPrice": finite(pick(highlights, ["WallStreetTargetPrice"])),
        "recommendationMean": None,
        "latestFiscalDate": pick(latest_income, ["date"]),
        "errors": errors,
    }

    return {key: clean(value) for key, value in output.items()}


def fetch_borsapi_company(
    api_key: str,
    ticker: str,
    name: str,
    sector: str,
    fx_cache: dict[tuple[str, str], float],
    timeout: float,
    cached_id: str | None = None,
) -> dict[str, Any]:
    errors: list[str] = []
    company, lookup_warnings = borsapi_company_lookup(api_key, ticker, name, sector, timeout, cached_id)
    errors.extend(lookup_warnings)

    company_key = company.get("id") or company.get("isin")
    if not company_key:
        raise ValueError(f"BörsAPI companies: missing id/isin for {ticker}")

    reports_payload = fetch_borsapi_json(
        f"companies/{company_key}/reports",
        api_key,
        timeout,
        period_type="all",
        limit=80,
        sort="report_date",
        order="desc",
        entity_type="CONSOLIDATED",
    )
    reports = borsapi_reports(reports_payload)
    if not reports:
        raise ValueError(f"BörsAPI reports: no reports returned for {ticker}")

    latest_income = borsapi_latest_report_with_any(
        reports,
        "RR",
        BORSAPI_INCOME_CONTAINERS,
        (*BORSAPI_REVENUE_KEYS, *BORSAPI_EBITDA_KEYS, *BORSAPI_NET_INCOME_KEYS),
        prefer_ttm=True,
    )
    latest_income_raw = borsapi_latest_report_with_any(
        reports,
        "RR",
        BORSAPI_INCOME_CONTAINERS,
        (*BORSAPI_REVENUE_KEYS, *BORSAPI_EBITDA_KEYS, *BORSAPI_NET_INCOME_KEYS),
        avoid_ttm=True,
    )
    latest_balance = borsapi_latest_report_with_any(
        reports,
        "BR",
        BORSAPI_BALANCE_CONTAINERS,
        (
            *BORSAPI_ASSETS_KEYS,
            *BORSAPI_LIABILITIES_KEYS,
            *BORSAPI_EQUITY_KEYS,
            *BORSAPI_CASH_KEYS,
            *BORSAPI_TOTAL_DEBT_KEYS,
        ),
        avoid_ttm=True,
    )
    latest_cashflow = borsapi_latest_report_with_any(
        reports,
        "KA",
        BORSAPI_CASHFLOW_CONTAINERS,
        (*BORSAPI_FCF_KEYS, *BORSAPI_OPERATING_CASHFLOW_KEYS, *BORSAPI_CAPEX_KEYS),
        prefer_ttm=True,
    )

    quote_currency = pick(company, ["currency"]) or "SEK"
    financial_currency = (
        pick(latest_income, ["currency"])
        or pick(latest_balance, ["currency"])
        or pick(latest_cashflow, ["currency"])
        or quote_currency
    )
    exchange_rate = get_exchange_rate(str(financial_currency), str(quote_currency), fx_cache)

    revenue = borsapi_number(latest_income, BORSAPI_INCOME_CONTAINERS, BORSAPI_REVENUE_KEYS)
    ebitda = borsapi_ebitda(latest_income)
    ebit = borsapi_number(latest_income, BORSAPI_INCOME_CONTAINERS, BORSAPI_EBIT_KEYS)
    net_income = borsapi_number(latest_income, BORSAPI_INCOME_CONTAINERS, BORSAPI_NET_INCOME_KEYS)
    operating_cashflow = borsapi_number(latest_cashflow, BORSAPI_CASHFLOW_CONTAINERS, BORSAPI_OPERATING_CASHFLOW_KEYS)
    capital_expenditure = borsapi_number(latest_cashflow, BORSAPI_CASHFLOW_CONTAINERS, BORSAPI_CAPEX_KEYS)
    free_cashflow = borsapi_number(latest_cashflow, BORSAPI_CASHFLOW_CONTAINERS, BORSAPI_FCF_KEYS)
    if free_cashflow is None and operating_cashflow is not None and capital_expenditure is not None:
        free_cashflow = operating_cashflow + capital_expenditure

    total_assets = borsapi_positive(latest_balance, BORSAPI_BALANCE_CONTAINERS, BORSAPI_ASSETS_KEYS)
    liabilities = borsapi_positive(latest_balance, BORSAPI_BALANCE_CONTAINERS, BORSAPI_LIABILITIES_KEYS)
    equity = borsapi_number(latest_balance, BORSAPI_BALANCE_CONTAINERS, BORSAPI_EQUITY_KEYS)
    cash = borsapi_positive(latest_balance, BORSAPI_BALANCE_CONTAINERS, BORSAPI_CASH_KEYS)
    total_debt = borsapi_positive(latest_balance, BORSAPI_BALANCE_CONTAINERS, BORSAPI_TOTAL_DEBT_KEYS)
    if total_debt is None:
        short_debt = borsapi_number(latest_balance, BORSAPI_BALANCE_CONTAINERS, BORSAPI_SHORT_DEBT_KEYS)
        long_debt = borsapi_number(latest_balance, BORSAPI_BALANCE_CONTAINERS, BORSAPI_LONG_DEBT_KEYS)
        if short_debt is not None or long_debt is not None:
            total_debt = abs((short_debt or 0) + (long_debt or 0))
    net_debt = (total_debt or 0) - (cash or 0) if total_debt is not None or cash is not None else None

    reference_fields, reference_errors = yahoo_reference_fields(ticker)
    errors.extend(reference_errors)
    market_cap = finite(reference_fields.get("marketCap"))
    shares = finite(reference_fields.get("sharesOutstanding"))

    fcf_values = borsapi_cashflow_values(reports)
    ebitda_values = [
        value
        for value in (borsapi_ebitda(report) for report in reports if str(report.get("report_type", "")).upper() == "RR")
        if value is not None
    ]
    revenue_values = borsapi_statement_values(reports, "RR", BORSAPI_INCOME_CONTAINERS, BORSAPI_REVENUE_KEYS)

    eps_per_share = (
        scaled(borsapi_number(latest_income, BORSAPI_INCOME_CONTAINERS, BORSAPI_EPS_KEYS), exchange_rate)
        or per_share(net_income, shares, exchange_rate)
    )
    book_value_per_share = per_share(equity, shares, exchange_rate)
    ebitda_per_share = per_share(ebitda, shares, exchange_rate)
    fcf_per_share = per_share(free_cashflow, shares, exchange_rate)
    normalized_fcf_per_share = median_per_share(fcf_values, shares, exchange_rate)
    normalized_ebitda_per_share = median_per_share(ebitda_values, shares, exchange_rate)
    scaled_net_debt = scaled(net_debt, exchange_rate)
    scaled_ebitda = scaled(ebitda, exchange_rate)
    net_debt_per_share = per_share(net_debt, shares, exchange_rate)
    roe = (net_income / equity * 100) if net_income is not None and equity and equity > 0 else None
    growth = historical_cagr(revenue_values) or historical_cagr(fcf_values)
    enterprise_value = market_cap + scaled_net_debt if market_cap is not None and scaled_net_debt is not None else None
    ev_to_ebitda = (
        enterprise_value / scaled_ebitda
        if enterprise_value is not None and scaled_ebitda and scaled_ebitda > 0
        else None
    )
    target_ev_to_ebitda = min(max(ev_to_ebitda, 4), 25) if ev_to_ebitda is not None else None
    scaled_free_cashflow = scaled(free_cashflow, exchange_rate)
    fcf_yield = (
        (scaled_free_cashflow / market_cap) * 100
        if scaled_free_cashflow is not None and market_cap and market_cap > 0
        else None
    )
    target_pe = None
    latest_fiscal_date = (
        pick(latest_balance, ["report_date", "date"])
        or pick(latest_income_raw, ["report_date", "date"])
        or pick(latest_cashflow, ["report_date", "date"])
    )

    output = {
        "id": company_id(ticker),
        "ticker": ticker,
        "borsapiCompanyId": company.get("id"),
        "borsapiIsin": company.get("isin"),
        "name": pick(company, ["name"]) or name,
        "sector": pick(company, ["sector"]) or sector,
        "companyType": company_type(ticker),
        "source": "BörsAPI",
        "dataUpdatedAt": datetime.now(timezone.utc).isoformat(),
        "currency": quote_currency,
        "financialCurrency": financial_currency,
        "financialToQuoteFx": exchange_rate,
        "marketPrice": None,
        "previousClose": None,
        "marketCap": market_cap,
        "sharesOutstanding": shares,
        "totalRevenue": scaled(revenue, exchange_rate),
        "ebitda": scaled_ebitda,
        "ebit": scaled(ebit, exchange_rate),
        "netIncome": scaled(net_income, exchange_rate),
        "operatingCashFlow": scaled(operating_cashflow, exchange_rate),
        "capitalExpenditures": scaled(capital_expenditure, exchange_rate),
        "freeCashFlow": scaled(free_cashflow, exchange_rate),
        "totalAssets": scaled(total_assets, exchange_rate),
        "totalLiabilities": scaled(liabilities, exchange_rate),
        "bookEquity": scaled(equity, exchange_rate),
        "totalDebt": scaled(total_debt, exchange_rate),
        "cash": scaled(cash, exchange_rate),
        "netDebt": scaled_net_debt,
        "enterpriseValue": enterprise_value,
        "evToEbitda": ev_to_ebitda,
        "targetEvToEbitda": target_ev_to_ebitda,
        "fcfYield": fcf_yield,
        "marketPriceDate": None,
        "fcfPerShare": fcf_per_share,
        "ebitdaPerShare": ebitda_per_share,
        "normalizedFcfPerShare": normalized_fcf_per_share,
        "normalizedEbitdaPerShare": normalized_ebitda_per_share,
        "eps": eps_per_share,
        "netDebtPerShare": net_debt_per_share,
        "bookValuePerShare": book_value_per_share,
        "equityPerShare": book_value_per_share,
        "liabilitiesPerShare": per_share(liabilities, shares, exchange_rate),
        "roe": roe,
        "growth5y": growth,
        "consensusGrowth": growth,
        "targetPe": target_pe,
        "trailingPe": None,
        "forwardPe": None,
        "analystTargetMeanPrice": None,
        "recommendationMean": None,
        "latestFiscalDate": latest_fiscal_date,
        "latestFiscalPeriod": pick(latest_balance, ["period"]) or pick(latest_income_raw, ["period"]),
        "errors": errors,
    }

    return {key: clean(value) for key, value in output.items()}


def fetch_company(ticker: str, name: str, sector: str, fx_cache: dict[tuple[str, str], float]) -> dict[str, Any]:
    errors: list[str] = []
    ticker_obj = yf.Ticker(ticker)

    try:
        fast_info = ticker_obj.fast_info
    except Exception as exc:
        fast_info = {}
        errors.append(f"fast_info: {exc}")

    try:
        info = ticker_obj.info or {}
    except Exception as exc:
        info = {}
        errors.append(f"info: {exc}")

    def get_statement(method_name: str) -> Any:
        try:
            return getattr(ticker_obj, method_name)(freq="yearly")
        except Exception as exc:
            errors.append(f"{method_name}: {exc}")
            return None

    income = get_statement("get_income_stmt")
    balance = get_statement("get_balance_sheet")
    cashflow = get_statement("get_cashflow")

    quote_currency = pick(info, ["currency"]) or clean(fast_info_value(fast_info, "currency")) or "SEK"
    financial_currency = pick(info, ["financialCurrency"]) or quote_currency
    exchange_rate = get_exchange_rate(str(financial_currency), str(quote_currency), fx_cache)

    price = finite(fast_info_value(fast_info, "lastPrice")) or finite(pick(info, ["currentPrice", "regularMarketPrice"]))
    previous_close = finite(fast_info_value(fast_info, "regularMarketPreviousClose")) or finite(pick(info, ["regularMarketPreviousClose", "previousClose"]))
    market_cap = finite(fast_info_value(fast_info, "marketCap")) or finite(pick(info, ["marketCap"]))
    shares = (
        finite(fast_info_value(fast_info, "shares"))
        or finite(pick(info, ["sharesOutstanding", "impliedSharesOutstanding"]))
        or (market_cap / price if market_cap and price else None)
    )

    revenue = latest_from_statement(income, ["Total Revenue", "Operating Revenue"])
    ebitda = latest_from_statement(income, ["EBITDA", "Normalized EBITDA"]) or finite(pick(info, ["ebitda"]))
    ebit = latest_from_statement(income, ["EBIT", "Operating Income"])
    net_income = latest_from_statement(income, ["Net Income", "Net Income Common Stockholders"])
    diluted_eps = latest_from_statement(income, ["Diluted EPS", "Basic EPS"])
    operating_cashflow = latest_from_statement(cashflow, ["Operating Cash Flow", "Total Cash From Operating Activities"])
    capital_expenditure = latest_from_statement(cashflow, ["Capital Expenditure", "Capital Expenditures"])
    free_cashflow = latest_from_statement(cashflow, ["Free Cash Flow"])
    if free_cashflow is None and operating_cashflow is not None and capital_expenditure is not None:
        free_cashflow = operating_cashflow + capital_expenditure

    total_assets = latest_from_statement(balance, ["Total Assets"])
    liabilities = latest_from_statement(balance, ["Total Liabilities Net Minority Interest", "Total Liabilities"])
    equity = latest_from_statement(balance, ["Stockholders Equity", "Total Equity Gross Minority Interest", "Common Stock Equity"])
    total_debt = latest_from_statement(balance, ["Total Debt"])
    cash = latest_from_statement(balance, ["Cash And Cash Equivalents", "Cash Cash Equivalents And Short Term Investments"])
    net_debt = (total_debt or 0) - (cash or 0) if total_debt is not None or cash is not None else None

    fcf_values = statement_series(cashflow, ["Free Cash Flow"])
    if not fcf_values:
        operating_values = statement_series(cashflow, ["Operating Cash Flow", "Total Cash From Operating Activities"])
        capex_values = statement_series(cashflow, ["Capital Expenditure", "Capital Expenditures"])
        fcf_values = [op + capex for op, capex in zip(operating_values, capex_values)]
    ebitda_values = statement_series(income, ["EBITDA", "Normalized EBITDA"])

    growth = None
    try:
        growth_estimates = ticker_obj.get_growth_estimates(as_dict=False)
        if growth_estimates is not None and not growth_estimates.empty and "+5y" in growth_estimates.index:
            growth = pct(growth_estimates.loc["+5y"].get("stock"))
    except Exception as exc:
        errors.append(f"growth_estimates: {exc}")

    fallback_growth = (
        growth
        or pct(pick(info, ["earningsGrowth", "revenueGrowth"]))
        or historical_cagr(fcf_values)
    )

    target_pe = finite(pick(info, ["forwardPE", "trailingPE"]))
    if target_pe is not None:
        target_pe = min(max(target_pe, 5), 35)

    eps_per_share = (
        scaled(diluted_eps, exchange_rate)
        or per_share(net_income, shares, exchange_rate)
        or finite(pick(info, ["trailingEps", "forwardEps"]))
    )

    fcf_per_share = per_share(free_cashflow, shares, exchange_rate)
    ebitda_per_share = per_share(ebitda, shares, exchange_rate)
    net_debt_per_share = per_share(net_debt, shares, exchange_rate)
    book_value_per_share = per_share(equity, shares, exchange_rate)
    roe = (net_income / equity * 100) if net_income is not None and equity and equity > 0 else None
    normalized_fcf_per_share = median_per_share(fcf_values, shares, exchange_rate)
    normalized_ebitda_per_share = median_per_share(ebitda_values, shares, exchange_rate)
    scaled_net_debt = scaled(net_debt, exchange_rate)
    scaled_ebitda = scaled(ebitda, exchange_rate)
    enterprise_value = (
        market_cap + scaled_net_debt
        if market_cap is not None and scaled_net_debt is not None
        else finite(pick(info, ["enterpriseValue"]))
    )
    ev_to_ebitda = (
        enterprise_value / scaled_ebitda
        if enterprise_value is not None and scaled_ebitda and scaled_ebitda > 0
        else None
    )
    target_ev_to_ebitda = min(max(ev_to_ebitda, 4), 25) if ev_to_ebitda is not None else None

    output = {
        "id": company_id(ticker),
        "ticker": ticker,
        "name": name,
        "sector": sector,
        "companyType": company_type(ticker),
        "source": "Yahoo Finance",
        "dataUpdatedAt": datetime.now(timezone.utc).isoformat(),
        "currency": quote_currency,
        "financialCurrency": financial_currency,
        "financialToQuoteFx": exchange_rate,
        "marketPrice": price,
        "previousClose": previous_close,
        "marketCap": market_cap,
        "sharesOutstanding": shares,
        "totalRevenue": scaled(revenue, exchange_rate),
        "ebitda": scaled_ebitda,
        "ebit": scaled(ebit, exchange_rate),
        "netIncome": scaled(net_income, exchange_rate),
        "operatingCashFlow": scaled(operating_cashflow, exchange_rate),
        "capitalExpenditures": scaled(capital_expenditure, exchange_rate),
        "freeCashFlow": scaled(free_cashflow, exchange_rate),
        "totalAssets": scaled(total_assets, exchange_rate),
        "totalLiabilities": scaled(liabilities, exchange_rate),
        "bookEquity": scaled(equity, exchange_rate),
        "totalDebt": scaled(total_debt, exchange_rate),
        "cash": scaled(cash, exchange_rate),
        "netDebt": scaled_net_debt,
        "enterpriseValue": enterprise_value,
        "evToEbitda": ev_to_ebitda,
        "targetEvToEbitda": target_ev_to_ebitda,
        "marketPriceDate": clean(fast_info_value(fast_info, "lastTradeDate")),
        "fcfPerShare": fcf_per_share,
        "ebitdaPerShare": ebitda_per_share,
        "eps": eps_per_share,
        "netDebtPerShare": net_debt_per_share,
        "bookValuePerShare": book_value_per_share,
        "equityPerShare": book_value_per_share,
        "liabilitiesPerShare": per_share(liabilities, shares, exchange_rate),
        "roe": roe,
        "normalizedFcfPerShare": normalized_fcf_per_share,
        "normalizedEbitdaPerShare": normalized_ebitda_per_share,
        "growth5y": fallback_growth,
        "consensusGrowth": growth or pct(pick(info, ["earningsGrowth", "revenueGrowth"])),
        "targetPe": target_pe,
        "trailingPe": finite(pick(info, ["trailingPE"])),
        "forwardPe": finite(pick(info, ["forwardPE"])),
        "analystTargetMeanPrice": finite(pick(info, ["targetMeanPrice"])),
        "recommendationMean": finite(pick(info, ["recommendationMean"])),
        "errors": errors,
    }

    return {key: clean(value) for key, value in output.items()}


def main(argv: list[str]) -> int:
    global yf
    parser = argparse.ArgumentParser(description="Update OMXS30 fundamentals.")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH, help="JSON output path")
    parser.add_argument("--delay", type=float, default=0.25, help="Delay between tickers in seconds")
    parser.add_argument("--ticker", action="append", help="Only update one ticker, for example ERIC-B.ST. Can be used more than once.")
    parser.add_argument("--max-companies", type=int, default=None, help="Limit how many companies to update for testing.")
    parser.add_argument("--enforce-fundamentals-window", action="store_true", help="Only run around 09:10 Europe/Stockholm on weekdays")
    parser.add_argument(
        "--provider",
        choices=("auto", "yahoo", "fmp", "eodhd", "borsapi"),
        default=os.environ.get("FUNDAMENTALS_PROVIDER", "yahoo").strip().lower() or "yahoo",
        help="Fundamentals provider. Default: yahoo. Use borsapi/fmp/eodhd only with a plan that includes statements.",
    )
    args = parser.parse_args(argv)

    now = datetime.now(timezone.utc)
    if args.enforce_fundamentals_window and not should_run_fundamentals_update(now):
        local = now.astimezone(STOCKHOLM_TZ)
        print(f"Skipping fundamentals update outside Stockholm morning window: {local.isoformat()}")
        return 0

    fmp_api_key = os.environ.get("FMP_API_KEY")
    eodhd_api_token = os.environ.get("EODHD_API_TOKEN")
    borsapi_api_key = os.environ.get("BORSAPI_API_KEY") or os.environ.get("BORSAPI_TOKEN")
    fx_cache: dict[tuple[str, str], float] = {}
    companies = []
    selected_universe = OMXS30
    if args.ticker:
        requested = {normalize_ticker(ticker) for ticker in args.ticker}
        selected_universe = [company for company in selected_universe if company[0].upper() in requested]
        missing = sorted(requested - {company[0].upper() for company in selected_universe})
        if missing:
            raise SystemExit(f"Unknown OMXS30 ticker(s): {', '.join(missing)}")

    if args.max_companies is not None:
        selected_universe = selected_universe[:max(args.max_companies, 0)]

    provider_choice = args.provider
    if provider_choice == "auto":
        provider_choice = "borsapi" if borsapi_api_key else "fmp" if fmp_api_key else "eodhd" if eodhd_api_token else "yahoo"

    if provider_choice == "borsapi" and not borsapi_api_key:
        raise SystemExit("FUNDAMENTALS_PROVIDER is borsapi, but BORSAPI_API_KEY is missing.")
    if provider_choice == "fmp" and not fmp_api_key:
        raise SystemExit("FUNDAMENTALS_PROVIDER is fmp, but FMP_API_KEY is missing.")
    if provider_choice == "eodhd" and not eodhd_api_token:
        raise SystemExit("FUNDAMENTALS_PROVIDER is eodhd, but EODHD_API_TOKEN is missing.")

    provider = {
        "borsapi": "BörsAPI fundamentals",
        "fmp": "Financial Modeling Prep fundamentals",
        "eodhd": "EODHD fundamentals",
        "yahoo": "Yahoo Finance via yfinance statements",
    }[provider_choice]
    existing_companies = load_existing_companies(args.output)

    if provider_choice == "borsapi":
        borsapi_ids = load_existing_borsapi_ids(args.output)
        for ticker, name, sector in selected_universe:
            print(f"Fetching BörsAPI fundamentals for {ticker}...", flush=True)
            try:
                company = fetch_borsapi_company(
                    borsapi_api_key,
                    ticker,
                    name,
                    sector,
                    fx_cache,
                    timeout=30,
                    cached_id=borsapi_ids.get(ticker.upper()),
                )
                companies.append(fill_missing_from_existing(company, existing_companies.get(company_id(ticker))))
            except Exception as exc:
                existing = existing_companies.get(company_id(ticker))
                fallback = dict(existing) if existing else {
                    "id": company_id(ticker),
                    "ticker": ticker,
                    "name": name,
                    "sector": sector,
                    "companyType": company_type(ticker),
                    "source": "BörsAPI",
                    "dataUpdatedAt": datetime.now(timezone.utc).isoformat(),
                }
                errors = fallback.get("errors") if isinstance(fallback.get("errors"), list) else []
                fallback["errors"] = [*errors, str(exc)]
                fallback["dataUpdatedAt"] = datetime.now(timezone.utc).isoformat()
                companies.append(fallback)
            time.sleep(args.delay)
    elif provider_choice == "fmp":
        for ticker, name, sector in selected_universe:
            print(f"Fetching FMP fundamentals for {ticker}...", flush=True)
            try:
                company = fetch_fmp_company(fmp_api_key, ticker, name, sector, fx_cache, timeout=30)
                companies.append(fill_missing_from_existing(company, existing_companies.get(company_id(ticker))))
            except Exception as exc:
                companies.append({
                    "id": company_id(ticker),
                    "ticker": ticker,
                    "name": name,
                    "sector": sector,
                    "companyType": company_type(ticker),
                    "source": "Financial Modeling Prep",
                    "dataUpdatedAt": datetime.now(timezone.utc).isoformat(),
                    "errors": [str(exc)],
                })
            time.sleep(args.delay)
    elif provider_choice == "eodhd":
        for ticker, name, sector in selected_universe:
            print(f"Fetching EODHD fundamentals for {ticker}...", flush=True)
            try:
                company = fetch_eodhd_company(eodhd_api_token, ticker, name, sector, fx_cache, timeout=30)
                companies.append(fill_missing_from_existing(company, existing_companies.get(company_id(ticker))))
            except Exception as exc:
                companies.append({
                    "id": company_id(ticker),
                    "ticker": ticker,
                    "name": name,
                    "sector": sector,
                    "companyType": company_type(ticker),
                    "source": "EODHD",
                    "dataUpdatedAt": datetime.now(timezone.utc).isoformat(),
                    "errors": [str(exc)],
                })
            time.sleep(args.delay)
    else:
        if not ensure_yfinance():
            raise SystemExit(
                "Missing dependency: yfinance. Run `python3 -m pip install -r requirements.txt` first."
            )

        for ticker, name, sector in selected_universe:
            print(f"Fetching Yahoo Finance data for {ticker}...", flush=True)
            try:
                company = fetch_company(ticker, name, sector, fx_cache)
                companies.append(fill_missing_from_existing(company, existing_companies.get(company_id(ticker))))
            except Exception as exc:  # keep the run useful even if one ticker breaks
                companies.append({
                    "id": company_id(ticker),
                    "ticker": ticker,
                    "name": name,
                    "sector": sector,
                    "companyType": company_type(ticker),
                    "source": "Yahoo Finance",
                    "dataUpdatedAt": datetime.now(timezone.utc).isoformat(),
                    "errors": [str(exc)],
                })
            time.sleep(args.delay)

    selected_ids = {company_id(ticker) for ticker, _, _ in selected_universe}
    full_universe_ids = {company_id(ticker) for ticker, _, _ in OMXS30}
    if selected_ids != full_universe_ids:
        updated_companies = {company.get("id"): company for company in companies if isinstance(company.get("id"), str)}
        merged_companies = []
        for ticker, name, sector in OMXS30:
            cid = company_id(ticker)
            if cid in updated_companies:
                merged_companies.append(updated_companies[cid])
            elif cid in existing_companies:
                merged_companies.append(existing_companies[cid])
            else:
                merged_companies.append({
                    "id": cid,
                    "ticker": ticker,
                    "name": name,
                    "sector": sector,
                    "companyType": company_type(ticker),
                    "source": "Manual placeholder",
                    "dataUpdatedAt": None,
                    "errors": ["No existing fundamentals row yet."],
                })
        companies = merged_companies

    payload = {
        "version": 1,
        "provider": provider,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "universe": "OMXS30",
        "universeAsOf": "2025-07-01",
        "companies": companies,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")

    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
