import unittest

from scripts.remove_borsapi import scrub_company


class RemoveBorsapiTests(unittest.TestCase):
    def test_removes_provider_values_and_keeps_official_source(self):
        company = {
            "ticker": "ERIC-B.ST",
            "name": "Ericsson B",
            "source": "BörsAPI",
            "borsapiCompanyId": "legacy-id",
            "totalRevenue": 1,
            "bookEquity": 2,
            "marketCap": 3,
            "officialSource": {"period": "2026-06-30"},
        }
        audit = {
            "sourceName": "Ericsson Q2 report",
            "sourceUrl": "https://example.com/ericsson.pdf",
            "status": "review-required",
        }

        cleaned = scrub_company(company, audit, "2026-08-05T00:00:00+00:00")

        self.assertNotIn("borsapiCompanyId", cleaned)
        self.assertIsNone(cleaned["totalRevenue"])
        self.assertIsNone(cleaned["bookEquity"])
        self.assertEqual(cleaned["marketCap"], 3)
        self.assertEqual(cleaned["officialSource"]["sourceUrl"], "https://example.com/ericsson.pdf")
        self.assertEqual(cleaned["dataQuality"]["status"], "unverified")
        self.assertFalse(cleaned["dataQuality"]["valuationReady"])


if __name__ == "__main__":
    unittest.main()
