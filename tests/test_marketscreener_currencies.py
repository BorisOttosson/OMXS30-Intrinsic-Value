import json
import unittest
from datetime import datetime
from pathlib import Path

from scripts.update_marketscreener_fcf import parse_finances


ROOT = Path(__file__).resolve().parents[1]


class MarketScreenerCurrencyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.market = json.loads((ROOT / "data" / "marketscreener-fcf.json").read_text())
        cls.manifest = json.loads((ROOT / "data" / "official-fundamentals.json").read_text())
        cls.fx = json.loads((ROOT / "data" / "fx-rates.json").read_text())

    def test_every_market_screener_row_uses_official_reporting_currency(self):
        official = self.manifest["companies"]
        for company_id, row in self.market["companies"].items():
            expected = official[row["ticker"]]["currency"]
            self.assertEqual(row["reportedCurrency"], expected, company_id)
            self.assertEqual(row["currency"], expected, company_id)
            self.assertEqual(row["displayCurrency"], "SEK", company_id)
            self.assertTrue(row["currencyEvidence"]["sourceUrl"].startswith("https://"))

    def test_abb_values_remain_usd_and_use_traceable_riksbank_rate(self):
        abb = self.market["companies"]["abb-st"]
        self.assertEqual(abb["reportedCurrency"], "USD")
        self.assertEqual(abb["fcfHistory"][-1], {"year": 2025, "fcf": 4566.0})
        usd = self.fx["rates"]["USD"]
        self.assertGreater(usd["rateToSek"], 0)
        self.assertEqual(usd["seriesId"], "sekusdpmi")
        self.assertEqual(
            usd["apiUrl"],
            "https://api.riksbank.se/swea/v1/Observations/Latest/sekusdpmi",
        )

    def test_fx_snapshot_is_traceable_and_fresh_when_written(self):
        updated = datetime.fromisoformat(self.fx["updatedAt"]).date()
        self.assertEqual(self.fx["sourceName"], "Sveriges Riksbank")
        self.assertTrue(self.fx["sourceUrl"].startswith("https://www.riksbank.se/"))
        for currency in ("USD", "EUR"):
            row = self.fx["rates"][currency]
            rate_date = datetime.fromisoformat(row["date"]).date()
            self.assertGreater(row["rateToSek"], 0)
            self.assertGreaterEqual((updated - rate_date).days, 0)
            self.assertLessEqual((updated - rate_date).days, 7)
            self.assertTrue(row["apiUrl"].startswith("https://api.riksbank.se/"))

    def test_parser_never_silently_defaults_missing_currency_to_sek(self):
        markdown = """
| Fiscal Period: December | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 | 2027 | 2028 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Free Cash Flow (FCF) | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 |
"""
        self.assertIsNone(parse_finances(markdown)["currency"])

    def test_parser_reads_currency_from_the_fcf_table_footnote(self):
        markdown = """
| Fiscal Period: December | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 | 2027 | 2028 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Free Cash Flow (FCF) | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 |
1 USD in Million
"""
        parsed = parse_finances(markdown)
        self.assertEqual(parsed["currency"], "USD")
        self.assertEqual(parsed["unit"], "million")


if __name__ == "__main__":
    unittest.main()
