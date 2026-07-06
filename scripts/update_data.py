#!/usr/bin/env python3
"""Fetch OMXS30 fundamentals from FMP/EODHD, with Yahoo Finance as a fallback."""

from __future__ import annotations

import argparse
import json
import math
import os
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
        ("stable", lambda: fetch_fmp_json(endpoint, api_key, timeout, symbol=symbol, limit=limit)),
        ("legacy", lambda: fetch_fmp_legacy_json(endpoint, api_key, symbol, timeout, period="annual", limit=limit)),
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


def mapping_get(mapping: dict[str, Any] | None, key: str) -> Any:
    return mapping.get(key) if isinstance(mapping, dict) else None


def parse_report_date(value: Any) -> datetime:
    if not value:
        return datetime.min
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return datetime.min


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

    fcf_values = statement_series(cashflow, ["Free Cash Flow"])
    if not fcf_values:
        operating_values = statement_series(cashflow, ["Operating Cash Flow", "Total Cash From Operating Activities"])
        capex_values = statement_series(cashflow, ["Capital Expenditure", "Capital Expenditures"])
        fcf_values = [op + capex for op, capex in zip(operating_values, capex_values)]

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
    net_debt_per_share = per_share((total_debt or 0) - (cash or 0), shares, exchange_rate)
    book_value_per_share = per_share(equity, shares, exchange_rate)
    roe = (net_income / equity * 100) if net_income is not None and equity and equity > 0 else None
    normalized_fcf_per_share = median_per_share(fcf_values, shares, exchange_rate)

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
        "netIncome": scaled(net_income, exchange_rate),
        "operatingCashFlow": scaled(operating_cashflow, exchange_rate),
        "capitalExpenditures": scaled(capital_expenditure, exchange_rate),
        "freeCashFlow": scaled(free_cashflow, exchange_rate),
        "totalAssets": scaled(total_assets, exchange_rate),
        "totalLiabilities": scaled(liabilities, exchange_rate),
        "bookEquity": scaled(equity, exchange_rate),
        "totalDebt": scaled(total_debt, exchange_rate),
        "cash": scaled(cash, exchange_rate),
        "marketPriceDate": clean(fast_info_value(fast_info, "lastTradeDate")),
        "fcfPerShare": fcf_per_share,
        "eps": eps_per_share,
        "netDebtPerShare": net_debt_per_share,
        "bookValuePerShare": book_value_per_share,
        "equityPerShare": book_value_per_share,
        "liabilitiesPerShare": per_share(liabilities, shares, exchange_rate),
        "roe": roe,
        "normalizedFcfPerShare": normalized_fcf_per_share,
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
    parser = argparse.ArgumentParser(description="Update OMXS30 fundamentals from FMP/EODHD, with Yahoo Finance as a fallback.")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH, help="JSON output path")
    parser.add_argument("--delay", type=float, default=0.25, help="Delay between tickers in seconds")
    parser.add_argument("--enforce-fundamentals-window", action="store_true", help="Only run around 09:10 Europe/Stockholm on weekdays")
    args = parser.parse_args(argv)

    now = datetime.now(timezone.utc)
    if args.enforce_fundamentals_window and not should_run_fundamentals_update(now):
        local = now.astimezone(STOCKHOLM_TZ)
        print(f"Skipping fundamentals update outside Stockholm morning window: {local.isoformat()}")
        return 0

    fmp_api_key = os.environ.get("FMP_API_KEY")
    eodhd_api_token = os.environ.get("EODHD_API_TOKEN")
    fx_cache: dict[tuple[str, str], float] = {}
    companies = []
    provider = (
        "Financial Modeling Prep fundamentals"
        if fmp_api_key
        else "EODHD fundamentals"
        if eodhd_api_token
        else "Yahoo Finance via yfinance"
    )

    if fmp_api_key:
        for ticker, name, sector in OMXS30:
            print(f"Fetching FMP fundamentals for {ticker}...", flush=True)
            try:
                companies.append(fetch_fmp_company(fmp_api_key, ticker, name, sector, fx_cache, timeout=30))
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
    elif eodhd_api_token:
        for ticker, name, sector in OMXS30:
            print(f"Fetching EODHD fundamentals for {ticker}...", flush=True)
            try:
                companies.append(fetch_eodhd_company(eodhd_api_token, ticker, name, sector, fx_cache, timeout=30))
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

        for ticker, name, sector in OMXS30:
            print(f"Fetching Yahoo Finance data for {ticker}...", flush=True)
            try:
                companies.append(fetch_company(ticker, name, sector, fx_cache))
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
