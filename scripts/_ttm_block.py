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


