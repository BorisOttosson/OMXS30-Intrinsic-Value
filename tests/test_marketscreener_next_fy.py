import json
import unittest
from pathlib import Path


DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "marketscreener-fcf.json"


class MarketScreenerNextFyGrowthTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = json.loads(DATA_PATH.read_text(encoding="utf-8"))["companies"]

    def test_alfa_laval_next_fy_growth_is_6_59_percent(self):
        row = self.rows["alfa-st"]
        latest_actual = max(row["fcfHistory"], key=lambda item: item["year"])
        next_forecast = min(row["fcfForecast"], key=lambda item: item["year"])

        self.assertEqual((latest_actual["year"], next_forecast["year"]), (2025, 2026))
        self.assertAlmostEqual(next_forecast["fcf"] / latest_actual["fcf"] - 1, 0.065939, places=6)

    def test_stored_next_fy_rates_reconcile_to_displayed_fcf_values(self):
        checked = 0
        for company_id, row in self.rows.items():
            history = row.get("fcfHistory") or []
            forecast = row.get("fcfForecast") or []
            if not history or not forecast:
                continue
            latest_actual = max(history, key=lambda item: item["year"])
            next_forecast = min(forecast, key=lambda item: item["year"])
            stored = next(
                (item for item in row.get("forecastYoy", []) if item["year"] == next_forecast["year"]),
                None,
            )
            self.assertIsNotNone(stored, company_id)
            self.assertEqual(next_forecast["year"], latest_actual["year"] + 1, company_id)
            if latest_actual["fcf"] <= 0 or next_forecast["fcf"] <= 0:
                self.assertIsNone(stored["growth"], company_id)
                continue
            calculated = next_forecast["fcf"] / latest_actual["fcf"] - 1
            self.assertAlmostEqual(stored["growth"], calculated, places=5, msg=company_id)
            checked += 1

        self.assertGreaterEqual(checked, 20)


if __name__ == "__main__":
    unittest.main()
