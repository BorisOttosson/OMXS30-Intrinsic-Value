import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class LegacySnapshotTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.payload = json.loads((ROOT / "data" / "omxs30-data.json").read_text())

    def test_reference_values_are_visible_for_every_company(self):
        fields = (
            "totalRevenue",
            "ebitda",
            "freeCashFlow",
            "totalAssets",
            "bookEquity",
            "totalLiabilities",
            "totalDebt",
            "cash",
        )
        for company in self.payload["companies"]:
            self.assertTrue(
                any(company.get(field) is not None for field in fields),
                company["ticker"],
            )

    def test_legacy_values_never_enable_valuation(self):
        for company in self.payload["companies"]:
            self.assertEqual(company["dataQuality"]["status"], "unverified")
            self.assertFalse(company["dataQuality"]["valuationReady"])
            self.assertEqual(company["legacySnapshot"]["status"], "unverified")

    def test_every_company_keeps_an_official_report_link(self):
        for company in self.payload["companies"]:
            self.assertTrue(company["officialSource"]["sourceUrl"], company["ticker"])


if __name__ == "__main__":
    unittest.main()
