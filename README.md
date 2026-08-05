# Intrinsic Value - OMXS30

A local personal finance research app for valuing the OMXS30 universe with:

- Category-fit intrinsic value models
- Operating company DCF, reverse DCF, P/E, and EV/EBITDA
- Bank P/B, ROE spread, and P/E
- Investment company NAV discount/premium and P/E where useful
- Cyclical normalized FCF, P/E, and EV/EBITDA
- Industry, company, and leadership scorecard
- Direct official-report evidence collector and Yahoo/yfinance prices
- Top 12 synthetic portfolio ranking
- Separate companies into model buckets: operating, banks, investment companies, and cyclicals
- Local persistence, JSON export, and JSON import

The company universe is seeded from the OMXS30 composition listed as of 2025-07-01. Fundamentals must come from official company reports; Yahoo/yfinance is used only for share prices and quote-related reference fields.

## Run

Open `index.html` directly in a browser, or serve the folder locally:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

## Update Market Data

Install the Python dependency:

```bash
python3 -m pip install -r requirements.txt
```

Fetch the latest share prices:

```bash
python3 scripts/update_prices.py
```

That writes:

```text
data/prices.json
```

Reload the browser app after the file is generated. The app keeps manual assumptions such as WACC, terminal growth, notes, portfolio weight, normalized FCF per share, valuation multiples, and qualitative scores editable. Unverified fundamentals remain blank and cannot enter a valuation model.

### Fundamentals quality gates

Every generated company row now includes a `dataQuality` object. The updater
rejects rows with implausible balance-sheet identities, extreme debt/assets or
FCF-yield ratios, EPS that conflicts with net income per share, duplicate
quarters in a synthetic TTM statement, missing net debt, or stale reporting.
Rejected raw values remain visible for troubleshooting, but the website marks
the company as **Model needed** and does not use them in valuation rankings.
Rows that only pass automated checks remain **unverified** and are also blocked.
A valuation is enabled only when the row includes an `independentVerification`
record with an official company-report URL and matching reporting period.

The reusable quality gates are in `scripts/validate_fundamentals.py`.

## Company Logos

The app uses local transparent PNG wordmarks from:

```text
assets/logos/
```

Logo file names must match the company id, for example:

```text
assets/logos/addt-b-st.png
assets/logos/inve-b-st.png
assets/logos/abb-st.png
```

If a PNG is missing, the app shows a quiet logo placeholder instead of pulling a messy favicon from the internet.

## Automatic Updates On GitHub

The repository includes GitHub Actions workflows for official reports and prices:

```text
.github/workflows/update-official-reports.yml
.github/workflows/update-prices.yml
```

The **Collect official report evidence** workflow does not use a financial-data
API. It visits every company's official investor-relations page, discovers the
newest interim report or workbook, extracts auditable snippets for TTM revenue,
TTM earnings/EBITDA when presented, and latest-quarter balance-sheet fields, and
writes:

```text
data/official-report-audit.json
```

Every row keeps a clickable official source page and, when discovered, a direct
report link. Because column headings and reporting formats differ between
companies, extracted snippets are candidates for review—not automatic proof.
The collector never marks a valuation as independently verified and never
silently replaces valuation inputs. A missing TTM basis or ambiguous balance-
sheet date is recorded as `review-required`. It runs weekly and can also be run
manually for `ALL`, one ticker, or batches of ten companies.

The Yahoo/yfinance price workflow updates share prices 20 times during each Stockholm trading day, from 09:01 to 16:37 Europe/Stockholm on weekdays. It writes:

```text
data/prices.json
```

No financial-fundamentals API key is required. GitHub Pages serves the official-report audit, the official-only fundamentals file, and the separate Yahoo/yfinance price file.

## Model Formulas

### Operating Companies

DCF uses five annual FCF/share projections, discounted by WACC, plus a Gordon growth terminal value:

```text
Intrinsic value = PV(FCF years 1-5) + PV(terminal value) - net debt/share
Terminal value = year 5 FCF x (1 + terminal growth) / (WACC - terminal growth)
```

Reverse DCF solves for the 5 year FCF CAGR required for the DCF value to match the market price.

P/E value uses:

```text
P/E value = EPS x target P/E
```

EV/EBITDA value uses:

```text
EV/EBITDA value = EBITDA/share x target EV/EBITDA - net debt/share
```

The blended value weights DCF at 45%, P/E at 25%, and EV/EBITDA at 30% when those values are available.

### Banks

Banks use a justified P/B model:

```text
Justified P/B = (ROE - long-term growth) / (cost of equity - long-term growth)
P/B value = book value/share x justified P/B
```

The bank blended value weights P/B at 65% and P/E at 35%.

### Investment Companies

Investment companies use NAV discount/premium as the main anchor:

```text
NAV discount = (NAV/share - market price) / NAV/share
```

The blended value weights NAV at 80% and P/E at 20% when P/E is useful.

### Asset-heavy Cyclicals

Cyclicals use normalized FCF and EV/EBITDA rather than one-year FCF alone:

```text
Normalized FCF value = normalized FCF/share x normalized FCF multiple - net debt/share
EV/EBITDA value = normalized EBITDA/share x target EV/EBITDA - net debt/share
```

The cyclical blended value weights normalized FCF at 50%, EV/EBITDA at 30%, and P/E at 20%.

## Company Categories

The app separates the OMXS30 universe into:

- Operating companies: DCF, reverse DCF, P/E, and EV/EBITDA.
- Banks: P/B, ROE versus cost of equity, and P/E.
- Investment companies: NAV discount/premium, plus P/E where useful.
- Asset-heavy cyclicals: normalized FCF and EV/EBITDA instead of one-year FCF alone.

The current bank bucket includes Handelsbanken, Nordea, SEB, and Swedbank. The investment company bucket includes Investor, Industrivarden, and EQT. The cyclical bucket includes Boliden, SCA, Skanska, SKF, Sandvik, and Volvo.
