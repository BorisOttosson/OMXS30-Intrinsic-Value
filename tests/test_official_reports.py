import unittest

from scripts.update_official_reports import (
    Link,
    collect_evidence,
    embedded_document_links,
    evidence_summary,
    ranked_links,
    selected_tickers,
)


class ReportDiscoveryTests(unittest.TestCase):
    def test_prefers_current_quarter_report_over_presentation_and_old_report(self):
        links = [
            Link("https://example.com/q2-2026-presentation.pdf", "Q2 2026 presentation"),
            Link("https://example.com/q1-2026-report.pdf", "Q1 2026 interim report"),
            Link("https://example.com/q2-2026-report.pdf", "Q2 2026 interim report"),
        ]
        ranked = ranked_links(links, "2026-06-30")
        self.assertEqual(ranked[0].url, "https://example.com/q2-2026-report.pdf")

    def test_ignores_social_share_links_that_repeat_the_report_title(self):
        links = [
            Link(
                "https://www.linkedin.com/shareArticle?url=https://example.com/q2-2026-report",
                "Share Q2 2026 report",
            ),
            Link("https://example.com/q2-2026-report.pdf", "Q2 2026 report"),
        ]
        ranked = ranked_links(links, "2026-06-30")
        self.assertEqual(ranked[0].url, "https://example.com/q2-2026-report.pdf")

    def test_batch_selection_is_stable_and_sorted(self):
        companies = {"C.ST": {}, "A.ST": {}, "B.ST": {}}
        self.assertEqual(selected_tickers(companies, None, 2, 2), ["C.ST"])
        self.assertEqual(selected_tickers(companies, "b.st", None, 10), ["B.ST"])

    def test_discovers_report_urls_embedded_in_script_state(self):
        content = br'{"report":"https:\/\/cdn.example.com\/Q2-2026-report.pdf"}'
        links = embedded_document_links(content, "https://example.com/investors")
        self.assertEqual(links[0].url, "https://cdn.example.com/Q2-2026-report.pdf")


class EvidenceTests(unittest.TestCase):
    def test_finds_ttm_flows_and_latest_quarter_balance_sheet(self):
        text = """
        Rolling 12 months ended 30 June 2026 SEK m
        Net sales 120,000 115,000
        EBITDA 20,000 18,000
        Earnings per share 12.50 11.20
        Statement of financial position 30 June 2026
        Total assets 200,000 190,000
        Total equity 80,000 76,000
        Total liabilities 120,000 114,000
        Cash and cash equivalents 15,000 13,000
        """
        evidence = collect_evidence(text, "2026-06-30")
        summary = evidence_summary(evidence)
        self.assertIn("revenue", summary["ttmCandidates"])
        self.assertIn("ebitda", summary["ttmCandidates"])
        self.assertIn("totalAssets", summary["latestQuarterCandidates"])
        self.assertIn("bookEquity", summary["latestQuarterCandidates"])

    def test_ytd_revenue_is_not_mislabeled_as_ttm(self):
        text = """
        January-June 2026
        Net sales 60,000 55,000
        """
        evidence = collect_evidence(text, "2026-06-30")
        summary = evidence_summary(evidence)
        self.assertNotIn("revenue", summary["ttmCandidates"])
        self.assertEqual(evidence["revenue"]["matches"][0]["basisDetected"], "ytd")

    def test_balance_field_from_period_matched_report_is_only_a_candidate(self):
        evidence = collect_evidence(
            "Consolidated statement of financial position\nTotal assets 200,000 190,000",
            "2026-06-30",
            document_period_confirmed=True,
        )
        match = evidence["totalAssets"]["matches"][0]
        self.assertEqual(match["basisDetected"], "latest-quarter-candidate")


if __name__ == "__main__":
    unittest.main()
