import unittest
from datetime import datetime, timezone

from scripts.update_data import (
    normalize_balance_unit,
    normalize_flow_unit,
    validate_company_fundamentals,
)


class UnitNormalizationTests(unittest.TestCase):
    def test_assa_scale_cashflow_is_promoted_from_thousands(self):
        value, factor = normalize_flow_unit(7_466_000, 189_546_000_000)
        self.assertEqual(factor, 1_000)
        self.assertEqual(value, 7_466_000_000)

    def test_hexagon_scale_debt_is_reduced_from_thousand_outlier(self):
        value, factor = normalize_balance_unit(34_348_110_962_104.8, 197_951_357_445.1)
        self.assertEqual(factor, 0.001)
        self.assertAlmostEqual(value, 34_348_110_962.1, places=1)


class DataQualityTests(unittest.TestCase):
    def test_rejects_eps_unit_mismatch_and_quarantines_valuation(self):
        row = {
            "ticker": "EQT.ST",
            "companyType": "investment",
            "latestFiscalDate": "2025-12-31",
            "netIncome": 8_029_664_696,
            "sharesOutstanding": 1_169_938_099,
            "eps": 6_829.3,
            "bookValuePerShare": 70.86,
        }
        checked = validate_company_fundamentals(row, datetime(2026, 8, 4, tzinfo=timezone.utc))
        self.assertEqual(checked["dataQuality"]["status"], "rejected")
        self.assertFalse(checked["dataQuality"]["valuationReady"])
        self.assertEqual(checked["eps"], 6_829.3)

    def test_rejects_stale_fundamentals(self):
        row = {
            "ticker": "TEL2-B.ST",
            "companyType": "operating",
            "latestFiscalDate": "2023-12-31",
            "fcfPerShare": 8.7,
            "netDebtPerShare": 30,
        }
        checked = validate_company_fundamentals(row, datetime(2026, 8, 4, tzinfo=timezone.utc))
        self.assertEqual(checked["dataQuality"]["status"], "rejected")
        self.assertTrue(any("stale" in issue.lower() for issue in checked["dataQuality"]["issues"]))

    def test_rejects_duplicate_quarters_in_synthetic_ttm(self):
        row = {
            "ticker": "VOLV-B.ST",
            "companyType": "cyclical",
            "latestFiscalDate": "2026-07-17",
            "fcfPerShare": 4.8,
            "netDebtPerShare": 2,
            "errors": [
                "BörsAPI: summed the last four quarters (2026-Q2, 2026-Q2, 2026-Q2, 2026-Q1)"
            ],
        }
        checked = validate_company_fundamentals(row, datetime(2026, 8, 4, tzinfo=timezone.utc))
        self.assertEqual(checked["dataQuality"]["status"], "rejected")
        self.assertTrue(any("duplicate" in issue.lower() for issue in checked["dataQuality"]["issues"]))


if __name__ == "__main__":
    unittest.main()
