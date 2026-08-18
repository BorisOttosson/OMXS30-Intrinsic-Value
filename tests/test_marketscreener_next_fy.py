import json
import unittest
from pathlib import Path


DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "marketscreener-fcf.json"


class MarketScreenerForecastCagrTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = json.loads(DATA_PATH.read_text(encoding="utf-8"))["companies"]

    def test_saab_uses_the_cagr_across_2026e_to_2028e(self):
        row = self.rows["saab-b-st"]
        forecast = row["fcfForecast"]

        self.assertEqual([item["year"] for item in forecast], [2026, 2027, 2028])
        calculated = (4776.0 / 2855.0) ** (1 / 2) - 1
        self.assertAlmostEqual(row["consensusFcfCagr"], calculated, places=5)
        self.assertAlmostEqual(row["consensusFcfCagr"], 0.293389, places=6)

    def test_stored_forecast_cagrs_reconcile_to_three_estimates(self):
        checked = 0
        for company_id, row in self.rows.items():
            forecast = row.get("fcfForecast") or []
            if len(forecast) < 3:
                continue
            first, middle, last = forecast[:3]
            self.assertEqual(middle["year"], first["year"] + 1, company_id)
            self.assertEqual(last["year"], middle["year"] + 1, company_id)
            self.assertGreater(min(item["fcf"] for item in (first, middle, last)), 0, company_id)
            calculated = (last["fcf"] / first["fcf"]) ** (1 / 2) - 1
            self.assertAlmostEqual(row["consensusFcfCagr"], calculated, places=5, msg=company_id)
            checked += 1

        self.assertGreaterEqual(checked, 20)

    def test_years_four_and_five_extend_the_final_estimate_at_the_cagr(self):
        row = self.rows["saab-b-st"]
        rate = row["consensusFcfCagr"]
        year_three = row["fcfForecast"][-1]["fcf"]
        year_four = year_three * (1 + rate)
        year_five = year_four * (1 + rate)

        self.assertAlmostEqual(year_four, 6177.23, places=1)
        self.assertAlmostEqual(year_five, 7989.56, places=1)


if __name__ == "__main__":
    unittest.main()
