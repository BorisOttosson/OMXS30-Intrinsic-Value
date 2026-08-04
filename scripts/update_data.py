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
BORSAPI_ID_CACHE_FILENAME = "borsapi-company-ids.json"
yf = None
FMP_BASE_URL = "https://financialmodelingprep.com/stable"
FMP_LEGACY_BASE_URL = "https://financialmodelingprep.com/api/v3"
EODHD_FUNDAMENTALS_URL = "https://eodhd.com/api/fundamentals"
BORSAPI_BASE_URL = "https://borsapi.se/api/v1"
# BörsAPI charges quota per returned report. The updater requests one exact
# record for each statement type instead of downloading mixed report history.
BORSAPI_REPORT_LIMIT = 1
# Balance sheets are fetched with a small buffer so a mislabelled or restated
# row cannot hide the genuinely latest quarter.
BORSAPI_BALANCE_REPORT_LIMIT = 2
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


FCF_CAGR_MAX_YEARS = 5


def fcf_cagr(values: list[float]) -> tuple[float | None, int | None]:
    """Historical free-cash-flow CAGR in percent from a newest-first series.

    Uses at most 5 years. If the oldest point in the window is <= 0 (or the
    history is shorter), the window is shortened until a valid positive
    start/end pair is found. Returns (None, None) instead of raising when no
    meaningful CAGR can be computed.
    """
    try:
        series = [value for value in (finite(v) for v in values) if value is not None]
    except Exception:
        return None, None
    if len(series) < 2:
        return None, None

    window = series[: FCF_CAGR_MAX_YEARS + 1]
    newest = window[0]
    while len(window) >= 2:
        oldest = window[-1]
        years = len(window) - 1
        if newest > 0 and oldest > 0 and years > 0:
            try:
                return ((newest / oldest) ** (1 / years) - 1) * 100, years
            except Exception:
                return None, None
        window = window[:-1]
    return None, None


def fcf_series_payload(values: list[float], exchange_rate: float | None = None) -> list[float] | None:
    """Newest-first FCF series (max 6 points) used to show the CAGR maths in the UI."""
    try:
        series = [value for value in (finite(v) for v in values) if value is not None]
    except Exception:
        return None
    if not series:
        return None
    window = series[: FCF_CAGR_MAX_YEARS + 1]
    out = []
    for value in window:
        converted = scaled(value, exchange_rate) if exchange_rate is not None else value
        out.append(converted if converted is not None else value)
    return out


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
    shares = finite(pick(info, ["sharesOutstanding"]))
    shares_source = "Yahoo Finance sharesOutstanding" if shares is not None else None
    if shares is None:
        shares = finite(fast_info_value(fast_info, "shares"))
        shares_source = "Yahoo Finance fast_info shares" if shares is not None else None
    if shares is None:
        shares = finite(pick(info, ["impliedSharesOutstanding"]))
        shares_source = "Yahoo Finance impliedSharesOutstanding" if shares is not None else None
    if shares is None and market_cap and market_price:
        shares = market_cap / market_price
        shares_source = "Derived from Yahoo market cap / price"
        errors.append("Outstanding shares: Yahoo did not report sharesOutstanding; derived from market cap / price")

    return {
        "marketCap": market_cap,
        "sharesOutstanding": shares,
        "sharesOutstandingSource": shares_source,
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


def consistent_eps(reported_eps: float | None, net_income: float | None, shares: float | None, exchange_rate: float) -> float | None:
    """EPS in quote currency; reject reported EPS that is off by >3x vs net income / shares."""
    computed = per_share(net_income, shares, exchange_rate)
    reported = scaled(finite(reported_eps), exchange_rate)
    if reported is None:
        return computed
    if computed is None or computed == 0:
        return reported
    ratio = abs(reported) / abs(computed)
    if ratio > 3 or ratio < (1 / 3):
        return computed
    return reported


def per_share(value: float | None, shares: float | None, exchange_rate: float) -> float | None:
    if value is None or not shares or shares <= 0:
        return None
    return (value * exchange_rate) / shares


def normalize_flow_unit(value: float | None, anchor: float | None) -> tuple[float | None, float]:
    """Normalize provider flow values that occasionally mix units in one report.

    BörsAPI normally returns absolute currency values, but a minority of rows
    contain values in thousands or millions alongside absolute values. Select
    the smallest power-of-1,000 adjustment that brings the flow into a broad,
    economically plausible range relative to revenue/assets.
    """
    number = finite(value)
    reference = abs(finite(anchor) or 0)
    if number is None or reference <= 0 or number == 0:
        return number, 1.0
    for factor in (1.0, 1_000.0, 1_000_000.0):
        ratio = abs(number * factor) / reference
        if 0.001 <= ratio <= 2.0:
            return number * factor, factor
    return number, 1.0


def normalize_balance_unit(value: float | None, assets: float | None) -> tuple[float | None, float]:
    """Correct obvious thousand-scale balance-sheet outliers against assets."""
    number = finite(value)
    reference = abs(finite(assets) or 0)
    if number is None or reference <= 0 or number == 0:
        return number, 1.0
    for factor in (1.0, 0.001, 1_000.0):
        ratio = abs(number * factor) / reference
        if 0.0001 <= ratio <= 3.0:
            return number * factor, factor
    return number, 1.0


def validate_company_fundamentals(company: dict[str, Any], now: datetime | None = None) -> dict[str, Any]:
    """Attach machine-readable quality results and quarantine unsafe outputs."""
    result = dict(company)
    result["errors"] = [
        message for message in (result.get("errors") or [])
        if not str(message).startswith("Data quality:")
    ]
    issues: list[str] = []
    critical: list[str] = []
    assets = finite(result.get("totalAssets"))
    equity = finite(result.get("bookEquity"))
    liabilities = finite(result.get("totalLiabilities"))
    debt = finite(result.get("totalDebt"))
    cash = finite(result.get("cash"))
    net_debt = finite(result.get("netDebt"))
    category = result.get("companyType") or company_type(str(result.get("ticker") or ""))

    if category not in ("bank", "investment"):
        if result.get("incomeStatementBasis") != "ttm":
            critical.append("Revenue and earnings are not based on four distinct TTM quarters")
        if result.get("cashFlowStatementBasis") != "ttm":
            critical.append("Cash flow is not based on four distinct TTM quarters")
    if result.get("balanceSheetBasis") != "quarter":
        critical.append("Balance sheet is not from the latest reported quarter")
    balance_date = result.get("balanceSheetDate")
    if balance_date and result.get("latestFiscalDate") and balance_date != result.get("latestFiscalDate"):
        critical.append("Balance-sheet date does not match the latest fiscal period")

    if assets and equity is not None and liabilities is not None:
        identity_error = abs(assets - equity - liabilities) / abs(assets)
        if identity_error > 0.10:
            critical.append(f"Balance-sheet identity differs by {identity_error:.0%}")
    if assets and debt is not None and abs(debt) > abs(assets) * 3:
        critical.append(f"Total debt is {abs(debt / assets):.1f}x total assets")
    if category not in ("bank", "investment") and debt is None and cash is not None and net_debt is not None:
        critical.append("Total debt is missing; net debt cannot be derived from cash alone")

    shares = finite(result.get("sharesOutstanding"))
    net_income = finite(result.get("netIncome"))
    eps = finite(result.get("eps"))
    computed_eps = net_income / shares if net_income is not None and shares and shares > 0 else None
    if eps is not None and computed_eps not in (None, 0):
        eps_ratio = abs(eps / computed_eps)
        if eps_ratio > 5 or eps_ratio < 0.2:
            critical.append(f"EPS differs from net income / shares by {eps_ratio:.0f}x")

    market_cap = finite(result.get("marketCap"))
    free_cashflow = finite(result.get("freeCashFlow"))
    if market_cap and free_cashflow is not None and free_cashflow != 0:
        fcf_yield = abs(free_cashflow / market_cap)
        if fcf_yield < 0.0001 or fcf_yield > 0.50:
            critical.append(f"Absolute FCF yield is {fcf_yield:.3%}")

    fiscal_date = parse_report_date(result.get("latestFiscalDate"))
    reference_now = (now or datetime.now(timezone.utc)).replace(tzinfo=None)
    if fiscal_date != datetime.min:
        age_days = (reference_now - fiscal_date).days
        result["fundamentalsAgeDays"] = age_days
        if age_days > 550:
            critical.append(f"Fundamentals are stale ({age_days} days)")
        elif age_days > 300:
            issues.append(f"Fundamentals are aging ({age_days} days)")

    for message in result.get("errors") or []:
        if "summed the last four quarters" not in str(message):
            continue
        quarters = re.findall(r"20\d{2}-Q[1-4]", str(message))
        if quarters and len(set(quarters)) != len(quarters):
            critical.append("Synthetic TTM contains duplicate accounting quarters")
            break

    if category == "bank":
        required = ("eps", "bookValuePerShare", "roe")
    elif category == "investment":
        required = ("bookValuePerShare",)
    else:
        required = ("fcfPerShare", "eps", "ebitdaPerShare")
    available = sum(finite(result.get(key)) is not None for key in required)
    if available == 0:
        critical.append("No category-relevant valuation fundamentals are available")
    elif category not in ("bank", "investment") and finite(result.get("netDebtPerShare")) is None:
        critical.append("Net debt per share is unavailable")

    verification = result.get("independentVerification")
    official_source = result.get("officialSource")
    official_period = official_source.get("period") if isinstance(official_source, dict) else None
    independently_verified = (
        isinstance(verification, dict)
        and verification.get("status") == "verified"
        and bool(verification.get("sourceUrl"))
        and bool(verification.get("period"))
        and verification.get("period") == result.get("latestFiscalDate")
        and (not official_period or verification.get("period") == official_period)
        and (category in ("bank", "investment") or verification.get("earningsBasis") == "TTM")
        and verification.get("balanceSheetBasis") == "latest-quarter"
    )
    if not critical and not independently_verified:
        issues.append("Not independently verified against an official company report")

    all_issues = [*critical, *issues]
    status = "rejected" if critical else ("unverified" if not independently_verified else ("warning" if issues else "ok"))
    result["dataQuality"] = {
        "status": status,
        "valuationReady": not critical and independently_verified,
        "issues": all_issues,
        "checkedAt": (now or datetime.now(timezone.utc)).isoformat(),
    }
    if critical:
        # Preserve raw values for diagnosis. The UI consumes valuationReady
        # and refuses to feed rejected values into any valuation model.
        result["errors"] = [*(result.get("errors") or []), *[f"Data quality: {item}" for item in critical]]
    return result


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


def normalize_borsapi_company_id(value: Any) -> str | None:
    if isinstance(value, str):
        cleaned = value.strip()
        return cleaned or None

    number = finite(value)
    if number is None:
        return None
    return str(int(number)) if number.is_integer() else str(number)


def extract_borsapi_ids(companies: Any) -> dict[str, str]:
    if not isinstance(companies, list):
        return {}

    ids = {}
    for company in companies:
        if not isinstance(company, dict):
            continue
        ticker = company.get("ticker")
        borsapi_id = normalize_borsapi_company_id(company.get("borsapiCompanyId"))
        if isinstance(ticker, str) and borsapi_id:
            ids[ticker.upper()] = borsapi_id
    return ids


def load_existing_borsapi_ids(path: Path) -> dict[str, str]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}

    return extract_borsapi_ids(payload.get("companies"))


def load_borsapi_id_cache(path: Path) -> dict[str, str]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}

    mapping = payload.get("ids") if isinstance(payload, dict) else None
    if not isinstance(mapping, dict):
        mapping = payload if isinstance(payload, dict) else {}

    ids = {}
    for ticker, borsapi_id in mapping.items():
        normalized_id = normalize_borsapi_company_id(borsapi_id)
        if isinstance(ticker, str) and normalized_id:
            ids[ticker.upper()] = normalized_id
    return ids


def write_borsapi_id_cache(path: Path, companies: list[dict[str, Any]]) -> None:
    ids = extract_borsapi_ids(companies)
    if not ids:
        return

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "ids": dict(sorted(ids.items())),
        "provider": "BörsAPI",
        "version": 1,
    }
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


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
    # Keep the audit trail across provider refreshes. Validation below only
    # accepts it while its period still matches latestFiscalDate.
    "independentVerification",
    "officialSource",
}


def is_blank(value: Any) -> bool:
    return value in (None, "", [], {})

CORE_DATA_KEYS = (
    "price",
    "sharesOutstanding",
    "totalRevenue",
    "ebitda",
    "freeCashFlow",
    "netDebt",
    "totalAssets",
    "bookEquity",
    "totalLiabilities",
    "growth5y",
)


def missing_core_field_count(existing: dict[str, Any] | None) -> int:
    """How many core fundamentals are missing for a company row."""
    if not isinstance(existing, dict):
        return len(CORE_DATA_KEYS) + 1
    missing = sum(1 for key in CORE_DATA_KEYS if is_blank(existing.get(key)))
    if existing.get("dataUpdatedAt") in (None, ""):
        missing += 1
    if existing.get("source") in (None, "", "Manual placeholder"):
        missing += 1
    errors = existing.get("errors")
    if isinstance(errors, list) and errors:
        missing += 1
    return missing


def prioritize_incomplete(
    universe: list[tuple[str, str, str]],
    existing_companies: dict[str, dict[str, Any]],
) -> list[tuple[str, str, str]]:
    """Fetch companies with missing data first, e.g. Epiroc, then the rest."""
    order = {ticker: index for index, (ticker, _, _) in enumerate(universe)}
    return sorted(
        universe,
        key=lambda item: (
            -missing_core_field_count(existing_companies.get(company_id(item[0]))),
            order[item[0]],
        ),
    )




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


def borsapi_report_basis(report: dict[str, Any]) -> str | None:
    explicit = str(
        report.get("period_type")
        or report.get("periodType")
        or ""
    ).strip().lower()
    if any(token in explicit for token in ("ttm", "trailing", "rolling")):
        return "ttm"
    if any(token in explicit for token in ("quarter", "quarterly", "kvartal")):
        return "quarter"
    if any(token in explicit for token in ("year", "annual", "helar", "helår", "fy")):
        return "year"

    period = str(report.get("period") or "").strip().upper()
    if "TTM" in period or "TRAILING" in period or "ROLLING 12" in period:
        return "ttm"
    if re.search(r"\b(FY|FULL\s*YEAR|ANNUAL|HEL[AÅ]R)\b", period):
        return "year"
    if re.fullmatch(r"(19|20)\d{2}", period):
        return "year"
    return None


def borsapi_select_report(
    reports: list[dict[str, Any]],
    report_type: str,
    expected_basis: str,
) -> dict[str, Any]:
    expected_type = report_type.upper()
    candidates = []
    for report in reports:
        actual_type = str(
            report.get("report_type")
            or report.get("reportType")
            or ""
        ).upper()
        if actual_type and actual_type != expected_type:
            continue
        candidates.append(report)

    matching = sorted(
        [report for report in candidates if borsapi_report_basis(report) == expected_basis],
        key=report_sort_key,
        reverse=True,
    )
    if matching:
        return matching[0]

    # The reports endpoint is already filtered by period_type. Some responses
    # omit that field, so an unlabelled row is still valid for this request.
    unlabelled = sorted(
        [report for report in candidates if borsapi_report_basis(report) is None],
        key=report_sort_key,
        reverse=True,
    )
    return unlabelled[0] if unlabelled else {}


def borsapi_statement_period(report: dict[str, Any], basis: str) -> str:
    raw_period = str(pick(report, ["period"]) or "").strip()
    if basis == "ttm":
        if re.search(r"\b(TTM|TRAILING|ROLLING\s*12)\b", raw_period, re.IGNORECASE):
            return raw_period or "TTM"
        return f"TTM through {raw_period}" if raw_period else "TTM"

    if raw_period:
        return raw_period

    report_date = parse_report_date(pick(report, ["report_date", "date"]))
    if report_date != datetime.min:
        quarter = ((report_date.month - 1) // 3) + 1
        return f"Q{quarter} {report_date.year}"
    return "Latest quarter"


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

BORSAPI_REVENUE_KEYS = (
    "revenue",
    "total_revenue",
    "net_revenue",
    "net_sales",
    "sales",
    "omsattning",
    "omsättning",
    "nettoomsattning",
    "nettoomsättning",
    "rorelseintakter",
    "rörelseintäkter",
)
BORSAPI_EBITDA_KEYS = (
    "ebitda",
    "operating_profit_before_depreciation",
    "rorelseresultat_fore_avskrivningar",
    "rörelseresultat_före_avskrivningar",
)
BORSAPI_DEPRECIATION_KEYS = (
    "depreciation_and_amortization",
    "depreciation_amortization_and_impairment",
    "depreciation",
    "amortization",
    "depreciation_amortization",
)
BORSAPI_EBIT_KEYS = (
    "operating_income",
    "operating_profit",
    "adjusted_operating_income",
    "rorelseresultat",
    "rörelseresultat",
    "ebit",
)
BORSAPI_NET_INCOME_KEYS = (
    "net_income",
    "profit_for_period",
    "profit_after_tax",
    "periodens_resultat",
    "net_profit",
)
BORSAPI_EPS_KEYS = ("eps", "earnings_per_share")
BORSAPI_SHARES_KEYS = ("shares_outstanding", "number_of_shares", "shares")
BORSAPI_OPERATING_CASHFLOW_KEYS = (
    "operating_cash_flow",
    "cash_flow_from_operating_activities",
    "cashflow_from_operations",
    "kassaflode_fran_lopande_verksamheten",
    "kassaflöde_från_löpande_verksamheten",
)
BORSAPI_CAPEX_KEYS = (
    "capex",
    "capital_expenditure",
    "capital_expenditures",
    "investments_in_property_plant_and_equipment",
    "investeringar_i_materiella_anlaggningstillgangar",
    "investeringar_i_materiella_anläggningstillgångar",
)
BORSAPI_FCF_KEYS = ("free_cash_flow", "free_cashflow", "free_cash_flow_to_firm", "fcf")
BORSAPI_ASSETS_KEYS = ("total_assets", "assets", "summa_tillgangar", "summa_tillgångar")
BORSAPI_LIABILITIES_KEYS = (
    "total_liabilities",
    "liabilities",
    "summa_skulder",
)
BORSAPI_EQUITY_KEYS = (
    "total_equity",
    "book_equity",
    "equity",
    "shareholders_equity",
    "stockholders_equity",
    "eget_kapital",
)
BORSAPI_CASH_KEYS = (
    "cash_and_equivalents",
    "cash_and_cash_equivalents",
    "cash",
    "likvida_medel",
)
BORSAPI_SHORT_DEBT_KEYS = ("short_term_debt", "current_debt", "short_term_borrowings")
BORSAPI_LONG_DEBT_KEYS = ("long_term_debt", "non_current_debt", "long_term_borrowings")
BORSAPI_TOTAL_DEBT_KEYS = (
    "total_debt",
    "interest_bearing_liabilities",
    "interest_bearing_debt",
    "borrowings",
    "debt",
    "rantebarande_skulder",
    "räntebärande_skulder",
)
BORSAPI_NET_DEBT_KEYS = ("net_debt", "net_interest_bearing_debt", "nettoskuld")


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


def borsapi_debt_values(report: dict[str, Any], cash: float | None) -> tuple[float | None, float | None]:
    total_debt = borsapi_positive(report, BORSAPI_BALANCE_CONTAINERS, BORSAPI_TOTAL_DEBT_KEYS)
    if total_debt is None:
        short_debt = borsapi_number(report, BORSAPI_BALANCE_CONTAINERS, BORSAPI_SHORT_DEBT_KEYS)
        long_debt = borsapi_number(report, BORSAPI_BALANCE_CONTAINERS, BORSAPI_LONG_DEBT_KEYS)
        if short_debt is not None or long_debt is not None:
            total_debt = abs((short_debt or 0) + (long_debt or 0))

    net_debt = borsapi_number(report, BORSAPI_BALANCE_CONTAINERS, BORSAPI_NET_DEBT_KEYS)
    if total_debt is None and net_debt is not None and cash is not None:
        total_debt = max(net_debt + cash, 0)
    if net_debt is None and total_debt is not None and cash is not None:
        net_debt = total_debt - cash
    return total_debt, net_debt


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


# Flow items may be summed across quarters to rebuild a trailing-twelve-month
# figure. Balance-sheet items are stocks, not flows, and must never be summed.
BORSAPI_FLOW_FIELDS = (
    "revenue",
    "net_sales",
    "cogs",
    "gross_profit",
    "operating_income",
    "adjusted_operating_income",
    "items_affecting_comparability",
    "financial_items",
    "pre_tax_income",
    "tax",
    "net_income",
    "net_income_non_controlling_interests",
    "result_from_discontinued_operations",
    "ebitda",
    "depreciation_and_amortization",
    "selling_expenses",
    "administrative_expenses",
    "rd_expenses",
    "personnel_expenses",
    "other_operating_items",
    "other_operating_income",
    "other_operating_expenses",
    "interest_income",
    "interest_expense",
    "finance_income",
    "finance_costs",
    "eps",
    "operating_cash_flow",
    "investing_cash_flow",
    "financing_cash_flow",
    "net_cash_flow",
    "ka_depreciation_amortization",
    "ka_non_cash_adjustments",
    "change_in_inventory",
    "change_in_receivables",
    "change_in_payables",
    "capex",
    "intangible_asset_investments",
    "acquisition_of_subsidiaries",
    "financial_asset_investments",
    "sale_of_assets",
    "lease_payments",
    "share_issue_buyback",
    "debt_issuance",
    "debt_repayment",
    "dividends_paid",
    "paid_income_tax",
    "interest_paid_cf",
    "interest_received_cf",
    "free_cash_flow",
)


def borsapi_is_single_quarter(report: dict[str, Any]) -> bool:
    """Only true single-quarter rows can be summed into a TTM figure."""
    if report.get("source_is_ytd") is True:
        return False
    months = finite(report.get("period_months"))
    if months is not None and int(months) != 3:
        return False
    basis = borsapi_report_basis(report)
    if basis == "quarter":
        return True
    if basis is None:
        # An unlabelled row is only a quarter if its period looks like one.
        period = str(report.get("period") or "").upper()
        if re.search(r"Q[1-4]\s*(19|20)\d{2}|(19|20)\d{2}\s*-?\s*Q[1-4]", period):
            return True
    return False


def borsapi_report_age_days(report: dict[str, Any] | None) -> int | None:
    """Days since the report_date of a BörsAPI report."""
    if not report:
        return None
    report_date = parse_report_date(report.get("report_date") or report.get("date"))
    if report_date == datetime.min:
        return None
    return (datetime.now(timezone.utc).replace(tzinfo=None) - report_date).days


def borsapi_newest_report(reports: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Return the newest report by report_date/period sort key."""
    if not reports:
        return None
    return sorted(reports, key=report_sort_key, reverse=True)[0]


BORSAPI_PERIOD_END_KEYS = (
    "period_end",
    "period_end_date",
    "period_to",
    "end_date",
    "fiscal_period_end",
    "periodEnd",
)


def borsapi_quarter_key_from_date(value: Any) -> str | None:
    """'YYYY-QN' for a period-END date, or None if it is not parseable."""
    parsed = parse_report_date(value)
    if parsed == datetime.min:
        return None
    return f"{parsed.year}-Q{((parsed.month - 1) // 3) + 1}"


def borsapi_quarter_key_from_label(value: Any) -> str | None:
    """'YYYY-QN' parsed out of a free-form period label."""
    text = str(value or "").strip().upper()
    if not text:
        return None
    match = re.search(r"(?P<year>(19|20)\d{2})\s*-?\s*Q(?P<q>[1-4])", text)
    if match:
        return f"{match.group('year')}-Q{match.group('q')}"
    match = re.search(r"Q(?P<q>[1-4])\s*[-/ ]?\s*(?P<year>(19|20)\d{2})", text)
    if match:
        return f"{match.group('year')}-Q{match.group('q')}"
    # A bare period-end date such as '2025-12-31'.
    return borsapi_quarter_key_from_date(text)


def borsapi_normalize_quarter_key(report: dict[str, Any]) -> str | None:
    """Return a stable 'YYYY-QN' key for a single-quarter report.

    The key MUST come from the accounting period, never from the publication
    date: BörsAPI's `report_date` is when the report was released, so Q3, Q4
    and Q1 rows can all fall inside the same calendar quarter and collapse
    onto one key (that is what produced TTM sums like
    '2026-Q1, 2026-Q1, 2026-Q1, 2025-Q1'). If no period information is
    available we return None so the row is skipped instead of merged into an
    arbitrary bucket.
    """
    for key in BORSAPI_PERIOD_END_KEYS:
        quarter_key = borsapi_quarter_key_from_date(report.get(key))
        if quarter_key:
            return quarter_key

    quarter_key = borsapi_quarter_key_from_label(report.get("period"))
    if quarter_key:
        return quarter_key

    # `date` is a period end for some BörsAPI rows, but only trust it when it
    # actually lands on a quarter end.
    parsed = parse_report_date(report.get("date"))
    if parsed != datetime.min and parsed.month in (3, 6, 9, 12) and parsed.day >= 28:
        return f"{parsed.year}-Q{((parsed.month - 1) // 3) + 1}"

    return None


def borsapi_quarter_key_sort_date(quarter_key: str) -> datetime:
    """Sortable period-end date for a 'YYYY-QN' key."""
    match = re.match(r"(?P<year>\d{4})-Q(?P<q>[1-4])$", quarter_key)
    if not match:
        return datetime.min
    return datetime(int(match.group("year")), int(match.group("q")) * 3, 28)


def borsapi_previous_quarter_key(quarter_key: str) -> str | None:
    """The quarter key immediately preceding `quarter_key`."""
    match = re.match(r"(?P<year>\d{4})-Q(?P<q>[1-4])$", quarter_key)
    if not match:
        return None
    year = int(match.group("year"))
    quarter = int(match.group("q"))
    return f"{year - 1}-Q4" if quarter == 1 else f"{year}-Q{quarter - 1}"


def borsapi_synthesize_ttm(reports: list[dict[str, Any]], report_type: str) -> dict[str, Any]:
    """Build a trailing-twelve-month statement by summing the last four quarters.

    BörsAPI stores a pre-computed TTM row only for part of its coverage, and it
    returns reports as flat objects where the income-statement and cash-flow
    fields can sit on any report_type row (ABB publishes everything on its BR
    rows). So the sum reads flat fields plus any nested statement containers,
    and ignores balance-sheet stocks.

    Every row is bucketed by its normalized accounting quarter, so the same
    quarter can never be added twice, and the result is rejected outright
    unless the four buckets form four consecutive quarters.
    """
    merged_by_period: dict[str, dict[str, Any]] = {}
    for report in reports:
        if not borsapi_is_single_quarter(report):
            continue
        # BörsAPI returns one row per report_type (RR/BR/KA) for the same
        # period; merge them so a quarter is counted once with all its fields.
        period_key = borsapi_normalize_quarter_key(report)
        if not period_key:
            continue
        target = merged_by_period.setdefault(period_key, {})
        for key, value in report.items():
            if value not in (None, "", [], {}) and target.get(key) in (None, "", [], {}):
                target[key] = value
        # Force the normalized period onto the merged row so two different raw
        # labels for one quarter cannot show up as two entries downstream.
        target["period"] = period_key
        target["quarter_key"] = period_key
        report_date = parse_report_date(report.get("report_date") or report.get("date"))
        if report_date != datetime.min:
            existing_date = parse_report_date(target.get("report_date") or target.get("date"))
            if existing_date == datetime.min or report_date > existing_date:
                target["report_date"] = report_date.isoformat()

    # Sort by accounting quarter (not publication date) so the newest four
    # quarters are picked deterministically.
    quarter_keys = sorted(merged_by_period, key=borsapi_quarter_key_sort_date, reverse=True)[:4]
    if len(quarter_keys) < 4:
        return {}

    # The four buckets are distinct by construction; also require that they are
    # consecutive, so a coverage gap never yields a bogus twelve-month figure.
    expected = quarter_keys[0]
    for quarter_key in quarter_keys:
        if quarter_key != expected:
            return {}
        expected = borsapi_previous_quarter_key(expected) or ""

    quarters = [merged_by_period[key] for key in quarter_keys]

    totals: dict[str, float] = {}
    nested_containers = (*BORSAPI_INCOME_CONTAINERS, *BORSAPI_CASHFLOW_CONTAINERS)
    for report in quarters:
        for source in (report, *(
            report[container]
            for container in nested_containers
            if isinstance(report.get(container), dict)
        )):
            for field in BORSAPI_FLOW_FIELDS:
                number = finite(source.get(field))
                if number is not None:
                    totals[field] = totals.get(field, 0.0) + number

    if not totals:
        return {}

    latest = quarters[0]

    return {
        "report_type": report_type.upper(),
        "period": f"TTM through {quarter_keys[0]}",
        "period_type": "ttm",
        "report_date": latest.get("report_date") or latest.get("date"),
        "currency": latest.get("currency"),
        "synthesized_from_quarters": quarter_keys,
        **totals,
    }


BORSAPI_CASHFLOW_DEPRECIATION_KEYS = (
    "ka_depreciation_amortization",
    "depreciation_and_amortization",
    "depreciation_amortization",
    "depreciation",
)


def borsapi_ebitda(
    report: dict[str, Any],
    cashflow_report: dict[str, Any] | None = None,
) -> float | None:
    """EBITDA from the income statement, or EBIT + D&A as a fallback.

    Several BörsAPI issuers (Telia, SKF, Lifco, Industrivarden) never publish an
    explicit EBITDA line, and some report depreciation only in the cash-flow
    statement (KA) rather than the income statement (RR). Look in both.
    """
    ebitda = borsapi_number(report, BORSAPI_INCOME_CONTAINERS, BORSAPI_EBITDA_KEYS)
    if ebitda is not None:
        return ebitda

    ebit = borsapi_number(report, BORSAPI_INCOME_CONTAINERS, BORSAPI_EBIT_KEYS)
    if ebit is None:
        return None

    depreciation = borsapi_number(report, BORSAPI_INCOME_CONTAINERS, BORSAPI_DEPRECIATION_KEYS)
    if depreciation is None and cashflow_report:
        depreciation = borsapi_number(
            cashflow_report, BORSAPI_CASHFLOW_CONTAINERS, BORSAPI_CASHFLOW_DEPRECIATION_KEYS
        )
    if depreciation is None:
        return None

    # D&A is stored as a negative charge in RR and a positive add-back in KA.
    return ebit - depreciation if depreciation < 0 else ebit + depreciation



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
    fcf_growth, fcf_growth_years = fcf_cagr(fcf_values)
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
        "financialCurrency": quote_currency,
        "reportedCurrency": financial_currency,
        "financialToQuoteFx": exchange_rate,
        "marketPrice": price,
        "marketCap": market_cap,
        "sharesOutstanding": shares,
        "sharesOutstandingSource": shares_source,
        "totalRevenue": scaled(revenue, exchange_rate),
        "totalRevenueBasis": "TTM",
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
        "growth5y": fcf_growth,
        "growth5yYears": fcf_growth_years,
        "fcfSeries": fcf_series_payload(fcf_values, exchange_rate),
        "growth5ySource": "FMP (historical FCF CAGR)" if fcf_growth is not None else None,
        "growth5yUpdatedAt": datetime.now(timezone.utc).isoformat(),
        "consensusGrowth": None,
        "consensusGrowthSource": None,
        "consensusGrowthAsOf": None,
        "targetPe": target_pe,
        "trailingPe": trailing_pe,
        "forwardPe": None,
        "analystTargetMeanPrice": None,
        "recommendationMean": None,
        "latestFiscalDate": pick(latest_income, ["date"]),
        "incomeStatementDate": pick(latest_income, ["date"]),
        "incomeStatementPeriod": pick(latest_income, ["period", "calendarYear"]),
        "balanceSheetDate": pick(latest_balance, ["date"]),
        "balanceSheetPeriod": pick(latest_balance, ["period", "calendarYear"]),
        "cashFlowStatementDate": pick(latest_cashflow, ["date"]),
        "cashFlowStatementPeriod": pick(latest_cashflow, ["period", "calendarYear"]),
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
    fcf_growth, fcf_growth_years = fcf_cagr(fcf_values)
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
        "financialCurrency": quote_currency,
        "reportedCurrency": financial_currency,
        "financialToQuoteFx": exchange_rate,
        "marketPrice": price,
        "marketCap": market_cap,
        "sharesOutstanding": shares,
        "sharesOutstandingSource": shares_source,
        "totalRevenue": scaled(revenue, exchange_rate),
        "totalRevenueBasis": "TTM",
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
        "growth5y": fcf_growth,
        "growth5yYears": fcf_growth_years,
        "fcfSeries": fcf_series_payload(fcf_values, exchange_rate),
        "growth5ySource": "EODHD (historical FCF CAGR)" if fcf_growth is not None else None,
        "growth5yUpdatedAt": datetime.now(timezone.utc).isoformat(),
        "consensusGrowth": None,
        "consensusGrowthSource": None,
        "consensusGrowthAsOf": None,
        "targetPe": target_pe,
        "trailingPe": finite(pick(valuation, ["TrailingPE"])) or finite(pick(highlights, ["PERatio"])),
        "forwardPe": finite(pick(valuation, ["ForwardPE"])),
        "analystTargetMeanPrice": finite(pick(highlights, ["WallStreetTargetPrice"])),
        "recommendationMean": None,
        "latestFiscalDate": pick(latest_income, ["date"]),
        "incomeStatementDate": pick(latest_income, ["date", "filing_date"]),
        "incomeStatementPeriod": pick(latest_income, ["period", "quarter", "date"]),
        "balanceSheetDate": pick(latest_balance, ["date", "filing_date"]),
        "balanceSheetPeriod": pick(latest_balance, ["period", "quarter", "date"]),
        "cashFlowStatementDate": pick(latest_cashflow, ["date", "filing_date"]),
        "cashFlowStatementPeriod": pick(latest_cashflow, ["period", "quarter", "date"]),
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

    report_path = f"companies/{company_key}/reports"
    common_report_params = {
        "limit": BORSAPI_REPORT_LIMIT,
        "sort": "report_date",
        "order": "desc",
        "entity_type": "CONSOLIDATED",
    }
    income_payload = fetch_borsapi_json(
        report_path,
        api_key,
        timeout,
        report_type="RR",
        period_type="ttm",
        **common_report_params,
    )
    balance_params = {**common_report_params, "limit": BORSAPI_BALANCE_REPORT_LIMIT}
    balance_payload = fetch_borsapi_json(
        report_path,
        api_key,
        timeout,
        report_type="BR",
        period_type="quarter",
        **balance_params,
    )
    cashflow_payload = fetch_borsapi_json(
        report_path,
        api_key,
        timeout,
        report_type="KA",
        period_type="ttm",
        **common_report_params,
    )

    income_reports = borsapi_reports(income_payload)
    balance_reports = borsapi_reports(balance_payload)
    cashflow_reports = borsapi_reports(cashflow_payload)
    reports = [*income_reports, *balance_reports, *cashflow_reports]
    if not reports:
        raise ValueError(f"BörsAPI reports: no reports returned for {ticker}")

    latest_income = borsapi_select_report(income_reports, "RR", "ttm")
    latest_balance = borsapi_select_report(balance_reports, "BR", "quarter")
    latest_cashflow = borsapi_select_report(cashflow_reports, "KA", "ttm")

    # BörsAPI does not store a pre-computed TTM row for every company; rebuild it
    # from the four most recent single quarters when the ttm request is empty.
    # Also rebuild when the stored TTM is stale (older than ~one quarter) and
    # newer quarterly reports are available.
    BORSAPI_TTM_STALENESS_DAYS = 95
    income_stale = (
        latest_income is not None
        and borsapi_report_age_days(latest_income) is not None
        and borsapi_report_age_days(latest_income) > BORSAPI_TTM_STALENESS_DAYS
    )
    cashflow_stale = (
        latest_cashflow is not None
        and borsapi_report_age_days(latest_cashflow) is not None
        and borsapi_report_age_days(latest_cashflow) > BORSAPI_TTM_STALENESS_DAYS
    )

    if not latest_income or not latest_cashflow or income_stale or cashflow_stale:
        quarter_payload = fetch_borsapi_json(
            report_path,
            api_key,
            timeout,
            period_type="quarter",
            **{**common_report_params, "limit": 24},
        )
        quarter_reports = borsapi_reports(quarter_payload)
        newest_quarter = borsapi_newest_report(quarter_reports)

        if not latest_income or income_stale:
            synthetic = borsapi_synthesize_ttm(quarter_reports, "RR")
            if synthetic:
                synthetic_newer = (
                    newest_quarter
                    and report_sort_key(synthetic) > report_sort_key(latest_income)
                    if latest_income
                    else True
                )
                if synthetic_newer:
                    latest_income = synthetic
                    income_reports = [synthetic, *income_reports]
                    errors.append(
                        "BörsAPI: replaced stale stored TTM income statement with the sum of "
                        f"the last four quarters ({', '.join(synthetic.get('synthesized_from_quarters', []))})"
                        if income_stale
                        else "BörsAPI: no stored TTM income statement; summed the last four quarters "
                        f"({', '.join(synthetic.get('synthesized_from_quarters', []))})"
                    )
        if not latest_cashflow or cashflow_stale:
            synthetic = borsapi_synthesize_ttm(quarter_reports, "KA")
            if synthetic:
                synthetic_newer = (
                    newest_quarter
                    and report_sort_key(synthetic) > report_sort_key(latest_cashflow)
                    if latest_cashflow
                    else True
                )
                if synthetic_newer:
                    latest_cashflow = synthetic
                    cashflow_reports = [synthetic, *cashflow_reports]
                    errors.append(
                        "BörsAPI: replaced stale stored TTM cash-flow statement with the sum of "
                        f"the last four quarters ({', '.join(synthetic.get('synthesized_from_quarters', []))})"
                        if cashflow_stale
                        else "BörsAPI: no stored TTM cash-flow statement; summed the last four quarters "
                        f"({', '.join(synthetic.get('synthesized_from_quarters', []))})"
                    )
    reports = [*income_reports, *balance_reports, *cashflow_reports]

    if not latest_income:
        errors.append("BörsAPI: TTM income statement is missing or has the wrong period type")
    if not latest_balance:
        errors.append("BörsAPI: latest quarterly balance sheet is missing or has the wrong period type")
    if not latest_cashflow:
        errors.append("BörsAPI: TTM cash-flow statement is missing or has the wrong period type")

    income_basis = borsapi_report_basis(latest_income) if latest_income else None
    balance_basis = borsapi_report_basis(latest_balance) if latest_balance else None
    cashflow_basis = borsapi_report_basis(latest_cashflow) if latest_cashflow else None
    if latest_income and income_basis not in (None, "ttm"):
        errors.append(f"BörsAPI: income statement is {income_basis}, not TTM; revenue may be wrong")
    if latest_balance and balance_basis not in (None, "quarter"):
        errors.append(f"BörsAPI: balance sheet is {balance_basis}, not the latest quarter")

    balance_report_date = parse_report_date(pick(latest_balance, ["report_date", "date"]))
    if latest_balance and balance_report_date != datetime.min:
        age_days = (datetime.now(timezone.utc).replace(tzinfo=None) - balance_report_date).days
        if age_days > 200:
            errors.append(
                f"BörsAPI: latest quarterly balance sheet is {age_days} days old ({balance_report_date.date()})"
            )

    debug_ticker = os.environ.get("BORSAPI_DEBUG_RAW_TICKER", "").strip().upper()
    if debug_ticker and debug_ticker in {
        ticker.upper(),
        str(company.get("ticker", "")).upper(),
        company_id(ticker).upper(),
    }:
        diagnostic = {
            "ticker": ticker,
            "income_ttm": income_payload,
            "balance_quarter": balance_payload,
            "cashflow_ttm": cashflow_payload,
        }
        print(
            f"BORSAPI RAW DIAGNOSTIC {ticker}: "
            f"{json.dumps(diagnostic, ensure_ascii=False, default=str)}",
            file=sys.stderr,
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
    ebitda = borsapi_ebitda(latest_income, latest_cashflow)

    ebit = borsapi_number(latest_income, BORSAPI_INCOME_CONTAINERS, BORSAPI_EBIT_KEYS)
    net_income = borsapi_number(latest_income, BORSAPI_INCOME_CONTAINERS, BORSAPI_NET_INCOME_KEYS)
    operating_cashflow = borsapi_number(latest_cashflow, BORSAPI_CASHFLOW_CONTAINERS, BORSAPI_OPERATING_CASHFLOW_KEYS)
    capital_expenditure = borsapi_number(latest_cashflow, BORSAPI_CASHFLOW_CONTAINERS, BORSAPI_CAPEX_KEYS)
    free_cashflow = borsapi_number(latest_cashflow, BORSAPI_CASHFLOW_CONTAINERS, BORSAPI_FCF_KEYS)
    derive_free_cashflow = free_cashflow is None

    total_assets = borsapi_positive(latest_balance, BORSAPI_BALANCE_CONTAINERS, BORSAPI_ASSETS_KEYS)
    liabilities = borsapi_positive(latest_balance, BORSAPI_BALANCE_CONTAINERS, BORSAPI_LIABILITIES_KEYS)
    equity = borsapi_number(latest_balance, BORSAPI_BALANCE_CONTAINERS, BORSAPI_EQUITY_KEYS)
    cash = borsapi_positive(latest_balance, BORSAPI_BALANCE_CONTAINERS, BORSAPI_CASH_KEYS)
    total_debt, net_debt = borsapi_debt_values(latest_balance, cash)

    flow_anchor = revenue or total_assets
    operating_cashflow, operating_cashflow_factor = normalize_flow_unit(operating_cashflow, flow_anchor)
    capital_expenditure, capex_factor = normalize_flow_unit(capital_expenditure, flow_anchor)
    free_cashflow, free_cashflow_factor = normalize_flow_unit(free_cashflow, flow_anchor)
    if derive_free_cashflow and operating_cashflow is not None and capital_expenditure is not None:
        free_cashflow = operating_cashflow + capital_expenditure
    total_debt, debt_factor = normalize_balance_unit(total_debt, total_assets)
    cash, cash_factor = normalize_balance_unit(cash, total_assets)
    if total_debt is not None and cash is not None:
        net_debt = total_debt - cash
    else:
        net_debt, net_debt_factor = normalize_balance_unit(net_debt, total_assets)
        if net_debt_factor != 1:
            errors.append(f"BörsAPI: normalized net debt unit by {net_debt_factor:g}x")
    for label, factor in (
        ("operating cash flow", operating_cashflow_factor),
        ("capital expenditure", capex_factor),
        ("free cash flow", free_cashflow_factor),
        ("total debt", debt_factor),
        ("cash", cash_factor),
    ):
        if factor != 1:
            errors.append(f"BörsAPI: normalized {label} unit by {factor:g}x")

    if revenue is None:
        errors.append("BörsAPI: revenue is missing from the TTM income statement")
    if ebitda is None:
        errors.append("BörsAPI: EBITDA is missing from the TTM income statement")
    if free_cashflow is None:
        errors.append("BörsAPI: free cash flow cannot be derived from the TTM cash-flow statement")
    if total_debt is None:
        errors.append("BörsAPI: total debt is missing from the latest quarterly balance sheet")

    reference_fields, reference_errors = yahoo_reference_fields(ticker)
    errors.extend(reference_errors)
    market_cap = finite(reference_fields.get("marketCap"))
    shares = finite(reference_fields.get("sharesOutstanding"))
    shares_source = reference_fields.get("sharesOutstandingSource")
    if shares is None:
        errors.append("Outstanding shares: Yahoo returned no share count; per-share values are unavailable")

    fcf_values = [normalize_flow_unit(value, flow_anchor)[0] for value in borsapi_cashflow_values(reports)]
    fcf_values = [value for value in fcf_values if value is not None]
    ebitda_values = [
        value
        for value in (borsapi_ebitda(report) for report in reports if str(report.get("report_type", "")).upper() == "RR")
        if value is not None
    ]
    revenue_values = borsapi_statement_values(reports, "RR", BORSAPI_INCOME_CONTAINERS, BORSAPI_REVENUE_KEYS)

    eps_per_share = consistent_eps(
        borsapi_number(latest_income, BORSAPI_INCOME_CONTAINERS, BORSAPI_EPS_KEYS),
        net_income,
        shares,
        exchange_rate,
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
    fcf_growth, fcf_growth_years = fcf_cagr(fcf_values)
    enterprise_value = market_cap + scaled_net_debt if market_cap is not None and scaled_net_debt is not None else None
    ev_to_ebitda = (
        enterprise_value / scaled_ebitda
        if enterprise_value is not None and scaled_ebitda and scaled_ebitda > 0
        else None
    )
    target_ev_to_ebitda = min(max(ev_to_ebitda, 4), 25) if ev_to_ebitda is not None else None
    if ev_to_ebitda is not None and ev_to_ebitda > 50:
        errors.append(
            f"Sanity check: EV/EBITDA is {ev_to_ebitda:.1f}x; verify TTM EBITDA and quarterly debt"
        )
    scaled_free_cashflow = scaled(free_cashflow, exchange_rate)
    fcf_yield = (
        (scaled_free_cashflow / market_cap) * 100
        if scaled_free_cashflow is not None and market_cap and market_cap > 0
        else None
    )
    target_pe = None
    latest_fiscal_date = (
        pick(latest_balance, ["report_date", "date"])
        or pick(latest_income, ["report_date", "date"])
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
        "financialCurrency": quote_currency,
        "reportedCurrency": financial_currency,
        "financialToQuoteFx": exchange_rate,
        "marketPrice": None,
        "previousClose": None,
        "marketCap": market_cap,
        "sharesOutstanding": shares,
        "sharesOutstandingSource": shares_source,
        "totalRevenue": scaled(revenue, exchange_rate),
        "totalRevenueBasis": "TTM",
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
        "growth5y": fcf_growth,
        "growth5yYears": fcf_growth_years,
        "fcfSeries": fcf_series_payload(fcf_values, exchange_rate),
        "growth5ySource": "BorsAPI (historical FCF CAGR)" if fcf_growth is not None else None,
        "growth5yUpdatedAt": datetime.now(timezone.utc).isoformat(),
        "consensusGrowth": None,
        "consensusGrowthSource": None,
        "consensusGrowthAsOf": None,
        "targetPe": target_pe,
        "trailingPe": None,
        "forwardPe": None,
        "analystTargetMeanPrice": None,
        "recommendationMean": None,
        "latestFiscalDate": latest_fiscal_date,
        "latestFiscalPeriod": pick(latest_balance, ["period"]) or pick(latest_income, ["period"]),
        "incomeStatementDate": pick(latest_income, ["report_date", "date"]),
        "incomeStatementPeriod": borsapi_statement_period(latest_income, "ttm"),
        "incomeStatementBasis": income_basis or "ttm",
        "balanceSheetDate": pick(latest_balance, ["report_date", "date"]),
        "balanceSheetPeriod": borsapi_statement_period(latest_balance, "quarter"),
        "balanceSheetBasis": balance_basis or "quarter",
        "cashFlowStatementDate": pick(latest_cashflow, ["report_date", "date"]),
        "cashFlowStatementPeriod": borsapi_statement_period(latest_cashflow, "ttm"),
        "cashFlowStatementBasis": cashflow_basis or "ttm",
        "errors": errors,
    }

    return {key: clean(value) for key, value in validate_company_fundamentals(output).items()}


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

    fcf_growth, fcf_growth_years = fcf_cagr(fcf_values)
    fallback_growth = (
        growth
        or pct(pick(info, ["earningsGrowth", "revenueGrowth"]))
        or historical_cagr(fcf_values)
    )

    target_pe = finite(pick(info, ["forwardPE", "trailingPE"]))
    if target_pe is not None:
        target_pe = min(max(target_pe, 5), 35)

    eps_per_share = consistent_eps(diluted_eps, net_income, shares, exchange_rate) or finite(
        pick(info, ["trailingEps", "forwardEps"])
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
        "financialCurrency": quote_currency,
        "reportedCurrency": financial_currency,
        "financialToQuoteFx": exchange_rate,
        "marketPrice": price,
        "previousClose": previous_close,
        "marketCap": market_cap,
        "sharesOutstanding": shares,
        "sharesOutstandingSource": shares_source,
        "totalRevenue": scaled(revenue, exchange_rate),
        "totalRevenueBasis": "TTM",
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
        "growth5y": fcf_growth,
        "growth5yYears": fcf_growth_years,
        "fcfSeries": fcf_series_payload(fcf_values, exchange_rate),
        "growth5ySource": "Yahoo Finance (historical FCF CAGR)" if fcf_growth is not None else None,
        "growth5yUpdatedAt": datetime.now(timezone.utc).isoformat(),
        "consensusGrowth": growth,
        "consensusGrowthSource": "Yahoo analyst consensus (+5y)" if growth is not None else None,
        "consensusGrowthAsOf": datetime.now(timezone.utc).date().isoformat() if growth is not None else None,
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
    parser.add_argument(
        "--batch",
        type=int,
        default=None,
        help="Run one batch of the OMXS30 universe: 1 = companies 1-10, 2 = 11-20, 3 = 21-30.",
    )
    parser.add_argument("--batch-size", type=int, default=10, help="Companies per batch (default 10).")
    parser.add_argument("--max-companies", type=int, default=None, help="Limit how many companies to update for testing.")
    parser.add_argument("--validate-only", action="store_true", help="Validate and quarantine the existing output without calling a provider")
    parser.add_argument("--enforce-fundamentals-window", action="store_true", help="Only run around 09:10 Europe/Stockholm on weekdays")
    parser.add_argument(
        "--provider",
        choices=("auto", "yahoo", "fmp", "eodhd", "borsapi"),
        default=os.environ.get("FUNDAMENTALS_PROVIDER", "yahoo").strip().lower() or "yahoo",
        help="Fundamentals provider. Default: yahoo. Use borsapi/fmp/eodhd only with a plan that includes statements.",
    )
    args = parser.parse_args(argv)

    now = datetime.now(timezone.utc)
    if args.validate_only:
        payload = json.loads(args.output.read_text(encoding="utf-8"))
        rows = payload.get("companies")
        if not isinstance(rows, list):
            raise SystemExit("Existing output has no companies array")
        payload["companies"] = [validate_company_fundamentals(row, now) for row in rows]
        payload["qualityCheckedAt"] = now.isoformat()
        args.output.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
        print(f"Validated {len(rows)} companies in {args.output}")
        return 0

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

    if args.batch is not None:
        size = max(args.batch_size, 1)
        total_batches = max(1, -(-len(selected_universe) // size))
        if args.batch < 1 or args.batch > total_batches:
            raise SystemExit(f"--batch must be between 1 and {total_batches} for {len(selected_universe)} companies")
        start = (args.batch - 1) * size
        selected_universe = selected_universe[start:start + size]
        print(f"Batch {args.batch} of {total_batches} ({len(selected_universe)} companies)", flush=True)

    if args.max_companies is not None:
        selected_universe = selected_universe[:max(args.max_companies, 0)]

    selected_tickers = ", ".join(ticker for ticker, _, _ in selected_universe)
    print(f"Selected fundamentals tickers: {selected_tickers}", flush=True)

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
    selected_universe = prioritize_incomplete(selected_universe, existing_companies)
    incomplete_first = [
        ticker
        for ticker, _, _ in selected_universe
        if missing_core_field_count(existing_companies.get(company_id(ticker))) > 0
    ]
    if incomplete_first:
        print(f"Prioritizing companies with missing data: {', '.join(incomplete_first)}", flush=True)
    borsapi_id_cache_path = args.output.parent / BORSAPI_ID_CACHE_FILENAME

    if provider_choice == "borsapi":
        borsapi_ids = load_borsapi_id_cache(borsapi_id_cache_path)
        borsapi_ids.update(load_existing_borsapi_ids(args.output))
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
                # Do not pretend stale existing data was just refreshed. Keep the
                # original timestamp so the UI can show how old the numbers are.
                if existing and existing.get("dataUpdatedAt"):
                    fallback["dataUpdatedAt"] = existing["dataUpdatedAt"]
                    fallback["fetchAttemptedAt"] = datetime.now(timezone.utc).isoformat()
                else:
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

    canonical_order = {company_id(ticker): index for index, (ticker, _, _) in enumerate(OMXS30)}
    companies.sort(key=lambda company: canonical_order.get(company.get("id"), len(canonical_order)))

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

    # Validate every emitted row, including preserved rows from partial or
    # rate-limited updates, so a fresh file timestamp never disguises stale or
    # internally inconsistent company data.
    quality_checked_at = datetime.now(timezone.utc)
    companies = [validate_company_fundamentals(company, quality_checked_at) for company in companies]

    payload = {
        "version": 1,
        "provider": provider,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "universe": "OMXS30",
        "universeAsOf": "2025-07-01",
        "companies": companies,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    if provider_choice == "borsapi":
        write_borsapi_id_cache(borsapi_id_cache_path, companies)
        print(f"Wrote {borsapi_id_cache_path}")
    args.output.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")

    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
