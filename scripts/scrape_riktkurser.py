# scripts/scrape_riktkurser.py
import requests, json, time
from bs4 import BeautifulSoup
from pathlib import Path

OMXS30_SLUGS = {
    "INVE-B": "investor",
    "VOLV-B": "volvo",
    "ATCO-A": "atlas-copco-a",
    # ... resten byggs från din befintliga OMXS30-lista i repot
}

def scrape_one(slug: str) -> dict:
    url = f"https://www.borskollen.se/aktie/{slug}/riktkurs"
    resp = requests.get(url, headers={"User-Agent": "OMXS30-IntrinsicValue-project (personligt/skola)"})
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    rows = []
    table = soup.find("table")
    for tr in (table.find_all("tr")[1:] if table else []):
        cells = [td.get_text(strip=True) for td in tr.find_all("td")]
        if len(cells) >= 6:
            rows.append({
                "day": cells[0], "bank": cells[1], "direction": cells[2],
                "rating": cells[4], "target": cells[5],
                "upside": cells[6] if len(cells) > 6 else None
            })
    return {"slug": slug, "targets": rows}

def main():
    result = {}
    for ticker, slug in OMXS30_SLUGS.items():
        result[ticker] = scrape_one(slug)
        time.sleep(1.5)

    out_path = Path("data/price_targets.json")
    out_path.parent.mkdir(exist_ok=True)
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

if __name__ == "__main__":
    main()
