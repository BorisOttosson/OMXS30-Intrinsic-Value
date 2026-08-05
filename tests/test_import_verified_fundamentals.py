import json
import unittest
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

    def test_import_enables_only_verified_entries(self):
        output = import_manifest(
            self.payload,
            self.manifest,
            checked_at="2026-08-05T10:00:00+00:00",
        )
        by_ticker = {company["ticker"]: company for company in output["companies"]}
        self.assertTrue(by_ticker["ASSA-B.ST"]["dataQuality"]["valuationReady"])
        self.assertTrue(by_ticker["EPI-A.ST"]["dataQuality"]["valuationReady"])
        self.assertFalse(by_ticker["ABB.ST"]["dataQuality"]["valuationReady"])
        self.assertEqual(output["verificationSummary"]["verified"], 2)
        self.assertEqual(output["verificationSummary"]["pending"], 28)

    def test_missing_ebitda_remains_missing_when_report_does_not_present_amount(self):
        output = import_manifest(self.payload, self.manifest, checked_at="2026-08-05T10:00:00+00:00")
        epiroc = next(company for company in output["companies"] if company["ticker"] == "EPI-A.ST")
        self.assertIsNone(epiroc["ebitda"])
        self.assertIsNone(epiroc["ebitdaPerShare"])
        self.assertFalse(epiroc["independentVerification"]["ebitdaPresented"])

    def test_document_checks_ignore_pdf_spacing_and_punctuation(self):
        self.assertEqual(normalize_document_text("Total assets 85 891"), "totalassets85891")
        self.assertEqual(normalize_document_text("TOTAL ASSETS: 85,891"), "totalassets85891")


if __name__ == "__main__":
    unittest.main()
