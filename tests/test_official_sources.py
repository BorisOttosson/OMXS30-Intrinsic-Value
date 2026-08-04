import unittest

from scripts.attach_official_sources import attach_sources


class OfficialSourceAttachmentTests(unittest.TestCase):
    def test_prefers_direct_report_without_marking_verification(self):
        payload = {"companies": [{"ticker": "TEST.ST"}]}
        catalogue = {
            "TEST.ST": {
                "sourceName": "Official reports",
                "sourceUrl": "https://example.com/investors",
                "period": "2026-06-30",
                "earningsBasis": "TTM",
            }
        }
        audit = {
            "TEST.ST": {
                "sourceName": "Q2 report",
                "sourceUrl": "https://example.com/investors",
                "directReportUrl": "https://example.com/q2-report.pdf",
                "status": "review-required",
                "checkedAt": "2026-08-05T00:00:00+00:00",
            }
        }

        missing = attach_sources(payload, catalogue, audit)
        company = payload["companies"][0]

        self.assertEqual(missing, [])
        self.assertEqual(company["officialSource"]["sourceUrl"], "https://example.com/q2-report.pdf")
        self.assertEqual(company["officialSource"]["auditStatus"], "review-required")
        self.assertNotIn("independentVerification", company)


if __name__ == "__main__":
    unittest.main()
