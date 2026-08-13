import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class CashFlowAnalysisUiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.javascript = (ROOT / "app.js").read_text(encoding="utf-8")

    def test_all_existing_model_choices_are_available(self):
        for model in ("dcf", "reverse-dcf", "pe"):
            self.assertIn(f'data-model-view="{model}"', self.html)

    def test_scenario_explanations_match_model_adjustments(self):
        self.assertRegex(
            self.javascript,
            re.compile(r'bear:\s*\{[^}]*growth:\s*-2\.0[^}]*wacc:\s*1\.0[^}]*targetPe:\s*-2\.0'),
        )
        self.assertRegex(
            self.javascript,
            re.compile(r'bull:\s*\{[^}]*growth:\s*2\.0[^}]*wacc:\s*-0\.7[^}]*targetPe:\s*2\.0'),
        )
        self.assertIn("FCF growth +2.0 pp, WACC −0.7 pp and target P/E +2.0x", self.html)
        self.assertIn("FCF growth −2.0 pp, WACC +1.0 pp and target P/E −2.0x", self.html)

    def test_analysis_keeps_existing_dcf_pe_and_reverse_calculations(self):
        self.assertIn("calculateDcf(company, scenario)", self.javascript)
        self.assertIn("calculatePeValue(company, scenario)", self.javascript)
        self.assertIn("calculateReverseDcf(company, scenario)", self.javascript)
        self.assertIn("Projected free cash flow / share", self.html)


if __name__ == "__main__":
    unittest.main()
