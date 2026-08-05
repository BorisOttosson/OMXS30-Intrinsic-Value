#!/usr/bin/env python3
"""Quality gates for manually verified official-report fundamentals."""

from __future__ import annotations

import math
import re
from datetime import datetime, timezone
from typing import Any


CATEGORY_TICKERS = {
    "bank": {"SHB-A.ST", "NDA-SE.ST", "SEB-A.ST", "SWED-A.ST"},
    "investment": {"EQT.ST", "INDU-C.ST", "INVE-B.ST"},
    "cyclical": {"BOL.ST", "SCA-B.ST", "SKA-B.ST", "SKF-B.ST", "SAND.ST", "VOLV-B.ST"},
}


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
    return None if math.isnan(number) or math.isinf(number) else number


def parse_report_date(value: Any) -> datetime:
    if not value:
        return datetime.min
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return datetime.min


def normalize_flow_unit(value: float | None, anchor: float | None) -> tuple[float | None, float]:
    """Normalize a flow against a broad revenue/assets anchor."""
    number = finite(value)
    reference = abs(finite(anchor) or 0)
    if number is None or reference <= 0 or number == 0:
        return number, 1.0
    for factor in (1.0, 1_000.0, 1_000_000.0):
        if 0.001 <= abs(number * factor) / reference <= 2.0:
            return number * factor, factor
    return number, 1.0


def normalize_balance_unit(value: float | None, assets: float | None) -> tuple[float | None, float]:
    """Correct obvious thousand-scale balance-sheet outliers against assets."""
    number = finite(value)
    reference = abs(finite(assets) or 0)
    if number is None or reference <= 0 or number == 0:
        return number, 1.0
    for factor in (1.0, 0.001, 1_000.0):
        if 0.0001 <= abs(number * factor) / reference <= 3.0:
            return number * factor, factor
    return number, 1.0


def validate_company_fundamentals(company: dict[str, Any], now: datetime | None = None) -> dict[str, Any]:
    """Enable valuation only for complete values verified to the latest official report."""
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
    if market_cap and free_cashflow not in (None, 0):
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

    required = (
        ("eps", "bookValuePerShare", "roe") if category == "bank"
        else ("bookValuePerShare",) if category == "investment"
        else ("fcfPerShare", "eps", "ebitdaPerShare")
    )
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
        result["errors"] = [*(result.get("errors") or []), *[f"Data quality: {item}" for item in critical]]
    return result
