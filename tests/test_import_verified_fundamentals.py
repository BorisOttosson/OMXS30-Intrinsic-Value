import json
import unittest
from copy import deepcopy
from pathlib import Path

from scripts.import_verified_fundamentals import (
    check_manifest_entry,
    import_manifest,
    normalize_document_text,
)


ROOT = Path(__file__).resolve().parents[1]


class OfficialFundamentalsImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((ROOT / "data" / "official-fundamentals.json").read_text())
        cls.payload = json.loads((ROOT / "data" / "omxs30-data.json").read_text())

    def test_every_manifest_entry_passes_arithmetic_and_balance_checks(self):
        for ticker, entry in self.manifest["companies"].items():
            check_manifest_entry(ticker, entry)
            self.assertTrue(entry.get("documentChecks"), f"{ticker} has no official-document evidence checks")

    def test_import_enables_only_verified_entries(self):
        output = import_manifest(
            self.payload,
            self.manifest,
            checked_at="2026-08-05T10:00:00+00:00",
        )
        by_ticker = {company["ticker"]: company for company in output["companies"]}
        self.assertTrue(by_ticker["ASSA-B.ST"]["dataQuality"]["valuationReady"])
        self.assertTrue(by_ticker["EPI-A.ST"]["dataQuality"]["valuationReady"])
        self.assertTrue(by_ticker["LIFCO-B.ST"]["dataQuality"]["valuationReady"])
        self.assertTrue(by_ticker["SHB-A.ST"]["dataQuality"]["valuationReady"])
        self.assertTrue(by_ticker["SKF-B.ST"]["dataQuality"]["valuationReady"])
        self.assertTrue(by_ticker["TELIA.ST"]["dataQuality"]["valuationReady"])
        self.assertTrue(by_ticker["ABB.ST"]["dataQuality"]["valuationReady"])
        self.assertTrue(all(company["dataQuality"]["valuationReady"] for company in output["companies"]))
        self.assertEqual(output["verificationSummary"]["verified"], 30)
        self.assertEqual(output["verificationSummary"]["pending"], 0)

    def test_foreign_report_values_are_converted_to_the_stock_quote_currency(self):
        output = import_manifest(self.payload, self.manifest, checked_at="2026-08-05T10:00:00+00:00")
        abb = next(company for company in output["companies"] if company["ticker"] == "ABB.ST")
        self.assertAlmostEqual(abb["eps"], 2.77 * 9.7367, places=4)
        self.assertAlmostEqual(abb["bookValuePerShare"], 8.7603 * 9.7367, places=4)
        self.assertEqual(abb["reportedCurrency"], "USD")

    def test_bank_roe_is_imported_from_the_official_report(self):
        output = import_manifest(self.payload, self.manifest, checked_at="2026-08-05T10:00:00+00:00")
        swedbank = next(company for company in output["companies"] if company["ticker"] == "SWED-A.ST")
        self.assertEqual(swedbank["roe"], 14.2)

    def test_missing_ebitda_remains_missing_when_report_does_not_present_amount(self):
        output = import_manifest(self.payload, self.manifest, checked_at="2026-08-05T10:00:00+00:00")
        epiroc = next(company for company in output["companies"] if company["ticker"] == "EPI-A.ST")
        self.assertIsNone(epiroc["ebitda"])
        self.assertIsNone(epiroc["ebitdaPerShare"])
        self.assertFalse(epiroc["independentVerification"]["ebitdaPresented"])

    def test_document_checks_ignore_pdf_spacing_and_punctuation(self):
        self.assertEqual(normalize_document_text("Total assets 85 891"), "totalassets85891")
        self.assertEqual(normalize_document_text("TOTAL ASSETS: 85,891"), "totalassets85891")

    def test_bank_can_leave_net_debt_unpopulated(self):
        output = import_manifest(self.payload, self.manifest, checked_at="2026-08-05T10:00:00+00:00")
        handelsbanken = next(company for company in output["companies"] if company["ticker"] == "SHB-A.ST")
        self.assertIsNone(handelsbanken["netDebt"])
        self.assertIsNone(handelsbanken["netDebtPerShare"])

    def test_reported_free_cash_flow_is_calculated_per_share(self):
        output = import_manifest(self.payload, self.manifest, checked_at="2026-08-05T10:00:00+00:00")
        telia = next(company for company in output["companies"] if company["ticker"] == "TELIA.ST")
        self.assertAlmostEqual(telia["fcfPerShare"], 2.387526, places=5)

    def test_official_annual_fcf_history_calculates_cagr_from_displayed_values(self):
        manifest = deepcopy(self.manifest)
        entry = manifest["companies"]["ABB.ST"]
        entry["fcfHistory"] = [
            {
                "year": 2021,
                "freeCashFlow": 100,
                "documentChecks": ["Free cash flow 100"],
            },
            {
                "year": 2022,
                "operatingCashFlow": 145,
                "capitalExpenditures": 25,
                "documentChecks": ["Operating cash flow 145", "Capital expenditures 25"],
            },
            {
                "year": 2023,
                "freeCashFlow": 144,
                "documentChecks": ["Free cash flow 144"],
            },
        ]
        output = import_manifest(
            self.payload,
            manifest,
            tickers={"ABB.ST"},
            checked_at="2026-08-13T10:00:00+00:00",
        )
        abb = next(company for company in output["companies"] if company["ticker"] == "ABB.ST")
        expected = ((144 / 100) ** (1 / 2) - 1) * 100
        self.assertAlmostEqual(abb["growth5y"], expected)
        self.assertEqual(abb["growth5yYears"], 2)
        self.assertEqual([row["year"] for row in abb["fcfHistory"]], [2021, 2022, 2023])
        self.assertEqual(abb["fcfHistory"][1]["calculation"], "operating cash flow minus capital expenditures")
        self.assertIn("Official company annual reports", abb["growth5ySource"])

    def test_official_fcf_history_rejects_missing_years(self):
        entry = deepcopy(self.manifest["companies"]["ABB.ST"])
        entry["fcfHistory"] = [
            {"year": 2021, "freeCashFlow": 100, "documentChecks": ["FCF 100"]},
            {"year": 2023, "freeCashFlow": 120, "documentChecks": ["FCF 120"]},
        ]
        with self.assertRaisesRegex(ValueError, "consecutive fiscal years"):
            check_manifest_entry("ABB.ST", entry)

    def test_derived_fcf_must_reconcile_to_reported_fcf(self):
        entry = deepcopy(self.manifest["companies"]["ABB.ST"])
        entry["fcfHistory"] = [
            {"year": 2022, "freeCashFlow": 100, "documentChecks": ["FCF 100"]},
            {
                "year": 2023,
                "freeCashFlow": 130,
                "operatingCashFlow": 160,
                "capitalExpenditures": 20,
                "documentChecks": ["FCF 130"],
            },
        ]
        with self.assertRaisesRegex(ValueError, "does not reconcile"):
            check_manifest_entry("ABB.ST", entry)


if __name__ == "__main__":
    unittest.main()
