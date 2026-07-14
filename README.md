# Intrinsic Value - OMXS30

A local personal finance research app for valuing the OMXS30 universe with:

- Category-fit intrinsic value models
- Operating company DCF, reverse DCF, P/E, and EV/EBITDA
- Bank P/B, ROE spread, and P/E
- Investment company NAV discount/premium and P/E where useful
- Cyclical normalized FCF, P/E, and EV/EBITDA
- Industry, company, and leadership scorecard
- BörsAPI fundamentals pipeline and Yahoo/yfinance price pipeline
- Top 12 synthetic portfolio ranking
- Separate companies into model buckets: operating, banks, investment companies, and cyclicals
- Local persistence, JSON export, and JSON import

The company universe is seeded from the OMXS30 composition listed as of 2025-07-01. The app starts with sample inputs, then can load generated BörsAPI fundamentals and Yahoo/yfinance price files.

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

Fetch the latest fundamentals data with BörsAPI:

```bash
BORSAPI_API_KEY=your_token_here python3 scripts/update_data.py --provider borsapi --ticker ERIC-B.ST
```

That writes:

```text
data/omxs30-data.json
```

Because the free BörsAPI plan has a small total request budget, test one ticker first. Leave out `--ticker ERIC-B.ST` only when you intentionally want to refresh the whole OMXS30 universe.

Fetch the latest share prices:

```bash
python3 scripts/update_prices.py
```

That writes:

```text
data/prices.json
```

Reload the browser app after the file is generated. The app keeps manual assumptions such as WACC, terminal growth, notes, portfolio weight, book/NAV per share, normalized FCF per share, EV/EBITDA multiple, and qualitative scores editable, while EPS, EBITDA, free cash flow per share, net debt per share, ROE, growth estimates, P/E inputs, assets, equity, liabilities, debt, cash, revenue, market cap, enterprise value, EV/EBITDA, and shares come from the latest generated fundamentals file where BörsAPI has coverage.

The fundamentals updater can use `BORSAPI_API_KEY`, `FMP_API_KEY`, `EODHD_API_TOKEN`, or `yfinance`, but the GitHub workflow now defaults to BörsAPI. Treat all feeds as personal research inputs, not guaranteed production market data.

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

The repository includes two GitHub Actions workflows:

```text
.github/workflows/update-market-data.yml
.github/workflows/update-prices.yml
```

The fundamentals workflow is manual, so it does not quietly spend BörsAPI requests. It writes:

```text
data/omxs30-data.json
```

The Yahoo/yfinance price workflow updates share prices 20 times during each Stockholm trading day, from 09:01 to 16:37 Europe/Stockholm on weekdays. It writes:

```text
data/prices.json
```

Add a `BORSAPI_API_KEY` repository secret for fundamentals. Start with one ticker in the workflow input, for example `ERIC-B.ST`; leave the ticker field empty only for a full OMXS30 refresh. The Yahoo/yfinance price workflow does not need an API key. GitHub Pages then serves both data files with the website.

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
