# Intrinsic Value - OMXS30

A local personal finance research app for valuing the OMXS30 universe with:

- Discounted cash flow value per share
- Reverse DCF implied 5 year FCF growth
- P/E fair value
- Industry, company, and leadership scorecard
- Yahoo Finance/yfinance refresh pipeline for prices and fundamentals
- Top 12 synthetic portfolio ranking
- Local persistence, JSON export, and JSON import

The company universe is seeded from the OMXS30 composition listed as of 2025-07-01. The app starts with sample inputs, then can load a locally generated Yahoo Finance data file.

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

Fetch the latest Yahoo Finance data:

```bash
python3 scripts/update_data.py
```

That writes:

```text
data/omxs30-data.json
```

Reload the browser app after the file is generated. The app keeps manual assumptions such as WACC, terminal growth, notes, portfolio weight, and qualitative scores editable, while market price, EPS, free cash flow per share, net debt per share, growth estimates, P/E inputs, equity, liabilities, debt, cash, revenue, market cap, and shares come from the latest generated data file where Yahoo has coverage.

Yahoo Finance access is handled through `yfinance`, which is an unofficial open-source wrapper around Yahoo's publicly available data. Treat it as a personal research feed, not as guaranteed production market data.

## Formulas

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

The blended value is the average of valid DCF and P/E values.
