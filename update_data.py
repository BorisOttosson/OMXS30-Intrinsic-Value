#!/usr/bin/env python3
"""Fetch OMXS30 market data from Yahoo Finance through yfinance."""

from __future__ import annotations

import argparse
import json
import math
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from statistics import median
from typing import Any

SCRIPT_PATH = Path(__file__).resolve()
ROOT = SCRIPT_PATH.parents[1] if SCRIPT_PATH.parent.name == "scripts" else SCRIPT_PATH.parent
OUTPUT_PATH = ROOT / "data" / "omxs30-data.json"
yf = None
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
    number = finite(value)
    if number is not None:
        return number
    if value is None:
        return None
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


def get_exchange_rate(from_currency: str | None, to_currency: str | None, cache: dict[tuple[str, str], float]) -> float:
    if not from_currency or not to_currency or from_currency == to_currency:
        return 1.0

    pair = (from_currency.upper(), to_currency.upper())
    if pair in cache:
        return cache[pair]

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
    parser = argparse.ArgumentParser(description="Update OMXS30 data from Yahoo Finance.")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH, help="JSON output path")
    parser.add_argument("--delay", type=float, default=0.25, help="Delay between tickers in seconds")
    args = parser.parse_args(argv)

    try:
        import yfinance as yfinance_module
    except ImportError as exc:  # pragma: no cover - user-facing dependency guard
        raise SystemExit(
            "Missing dependency: yfinance. Run `python3 -m pip install -r requirements.txt` first."
        ) from exc

    yf = yfinance_module
    fx_cache: dict[tuple[str, str], float] = {}
    companies = []
    for ticker, name, sector in OMXS30:
        print(f"Fetching {ticker}...", flush=True)
        try:
            companies.append(fetch_company(ticker, name, sector, fx_cache))
        except Exception as exc:  # keep the run useful even if one ticker breaks
            companies.append({
                "id": company_id(ticker),
                "ticker": ticker,
                "name": name,
                "sector": sector,
                "source": "Yahoo Finance",
                "dataUpdatedAt": datetime.now(timezone.utc).isoformat(),
                "errors": [str(exc)],
            })
        time.sleep(args.delay)

    payload = {
        "version": 1,
        "provider": "Yahoo Finance via yfinance",
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
