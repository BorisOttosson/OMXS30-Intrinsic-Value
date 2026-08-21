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
        self.assertIn("Growth +2.0 pp; for Market consensus this adjusts only the years 4–5 CAGR extension", self.html)
        self.assertIn("Growth −2.0 pp; for Market consensus this adjusts only the years 4–5 CAGR extension", self.html)

    def test_analysis_keeps_existing_dcf_pe_and_reverse_calculations(self):
        self.assertIn("calculateDcf(company, scenario)", self.javascript)
        self.assertIn("calculatePeValue(company, scenario)", self.javascript)
        self.assertIn("calculateReverseDcf(company, scenario)", self.javascript)
        self.assertIn("Projected free cash flow / share", self.html)

    def test_intrinsic_value_explains_model_weights_and_sek_contributions(self):
        self.assertIn("function buildValuationBlend", self.javascript)
        self.assertIn("effectiveWeight = item.weight / totalWeight", self.javascript)
        self.assertIn("contribution: item.value * effectiveWeight", self.javascript)
        self.assertIn("function describeValuationBlend", self.javascript)
        self.assertIn("excluded because no usable value is available", self.javascript)
        self.assertIn("Remaining weights are rebalanced from", self.javascript)
        self.assertIn("0% cross-checks; they do not change the intrinsic value", self.javascript)
        self.assertIn('{ label: "DCF", value: dcf.value, weight: 0.45 }', self.javascript)
        self.assertIn('{ label: "P/E", value: peValue, weight: 0.25 }', self.javascript)
        self.assertIn('{ label: "EV/EBITDA", value: ebitdaValue, weight: 0.3 }', self.javascript)

    def test_equity_fcf_dcf_does_not_subtract_net_debt_twice(self):
        dcf_function = self.javascript.split("function calculateDcf", 1)[1].split("function calculatePeValue", 1)[0]
        ebitda_function = self.javascript.split("function calculateEbitdaValue", 1)[1].split("function averageValid", 1)[0]
        self.assertNotIn("netDebt", dcf_function)
        self.assertIn("presentValue + discountedTerminal", dcf_function)
        self.assertIn("- netDebt", ebitda_function)
        self.assertIn("Net debt is not subtracted again", self.javascript)

    def test_fundamental_calculation_audits_are_visible_and_traceable(self):
        self.assertIn("How EBITDA is calculated", self.html)
        self.assertIn("How equity FCF is calculated", self.html)
        self.assertIn("function renderMetricAudit", self.javascript)
        self.assertIn("Currency conversion:", self.javascript)
        self.assertIn("Company-defined fallback", self.javascript)

    def test_page_level_growth_assumption_controls_the_dcf(self):
        self.assertIn('data-field="growth5y" type="number" step="0.1" readonly', self.html)
        self.assertIn('data-growth-assumption="cagr"', self.html)
        self.assertIn('data-growth-assumption="consensus"', self.html)
        self.assertIn('<span>Growth forecast</span>', self.html)
        self.assertIn('>Market consensus</button>', self.html)
        self.assertEqual(self.html.count('data-growth-assumption="cagr"'), 2)
        self.assertEqual(self.html.count('data-growth-assumption="consensus"'), 2)
        self.assertIn('aria-label="Growth forecast in financial analysis"', self.html)
        self.assertNotIn('id="selectedGrowthInput"', self.html)
        self.assertLess(self.html.index('<span>View</span>'), self.html.index('<span>Growth forecast</span>'))
        dcf_function = self.javascript.split("function calculateDcf", 1)[1].split("function calculatePeValue", 1)[0]
        self.assertIn("getSelectedGrowthAssumption(company)", dcf_function)
        self.assertNotIn("company.dcfGrowth", dcf_function)
        self.assertIn('growthAssumption: loadGrowthAssumptionPreference()', self.javascript)
        self.assertIn('state.growthAssumption = button.dataset.growthAssumption', self.javascript)
        self.assertIn("drives the DCF only when CAGR is selected", self.javascript)
        self.assertIn("function buildMarketConsensusDcfFlows", self.javascript)
        self.assertIn('source: "Analyst consensus"', self.javascript)
        self.assertIn('source: "Forecast CAGR extension"', self.javascript)
        self.assertIn('forecastMethod: usesMarketConsensusPath ? "published-consensus-plus-cagr-extension"', self.javascript)
        self.assertIn("Years 1–3 use the three published analyst-consensus FCF estimates", self.javascript)
        self.assertIn("Years 4–5 extend the final estimate", self.javascript)

    def test_historical_cagr_is_recomputed_from_traceable_annual_fcf(self):
        self.assertIn("function validateHistoricalFcfSeries", self.javascript)
        self.assertIn("(latest.fcf / oldest.fcf) ** (1 / years) - 1", self.javascript)
        self.assertIn("The annual FCF history has a missing fiscal year", self.javascript)
        self.assertIn("Official company reports (independently verified)", self.javascript)
        self.assertIn("MarketScreener reported FCF history (fallback)", self.javascript)
        self.assertIn("Temporary third-party fallback", self.javascript)
        self.assertIn("FCF<sub>${audit.latest.year}</sub>", self.javascript)
        self.assertIn("${audit.rows.length} observations", self.javascript)
        self.assertIn("CFO</th><th>Capex</th><th>FCF", self.javascript)
        self.assertIn("CAGR: N/A", self.javascript)
        self.assertIn("A company-defined row is never presented as statutory CFO − capex", self.javascript)
        self.assertNotIn("shrink until both ends are positive", self.javascript)

    def test_outlook_panel_is_removed_without_leaving_a_desktop_gap(self):
        self.assertNotIn('aria-label="Outlook scorecard"', self.html)
        self.assertNotIn("function renderOutlook", self.javascript)
        styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        self.assertIn(".model-panel { grid-column: 1 / -1; }", styles)
        self.assertIn(".target-price-panel { grid-column: 1 / -1; }", styles)

    def test_market_screener_currency_and_fx_are_shown_transparently(self):
        self.assertIn("FX_DATA_URL", self.javascript)
        self.assertIn("function getFxAudit", self.javascript)
        self.assertIn("MarketScreener values are reported in", self.javascript)
        self.assertIn("1 ${escapeHtml(currency)} = ${audit.fx.rateToSek.toFixed(5)} SEK", self.javascript)
        self.assertIn("The growth percentage is calculated from the source-currency values", self.javascript)

    def test_target_pe_is_anchored_to_current_pe(self):
        self.assertIn("function getCurrentPeRatio", self.javascript)
        self.assertIn("const currentPe = getCurrentPeRatio(company);", self.javascript)
        self.assertIn("Equal to current P/E", self.javascript)
        self.assertRegex(
            self.html,
            re.compile(r'<input[^>]*data-field="targetPe"[^>]*readonly[^>]*>')
        )
        self.assertIn("Automatically equals the current trailing P/E shown next to the share price", self.html)

    def test_analysis_section_has_financial_title_without_dynamic_subtitle(self):
        self.assertIn("<h3>Financial Analysis</h3>", self.html)
        self.assertNotIn('id="valuationSubtitle"', self.html)
        self.assertNotIn("elements.valuationSubtitle", self.javascript)

    def test_cyclical_model_uses_full_cycle_history_without_silent_fallbacks(self):
        self.assertIn("function getCyclicalHistoryNormalization", self.javascript)
        self.assertIn("At least five consecutive official-report cash-flow years are required", self.javascript)
        self.assertIn("const normalizedCashFlow = median(rows.map((row) => row.cashFlow))", self.javascript)
        self.assertIn('String(row.sourceUrl).includes("marketscreener.com")', self.javascript)
        self.assertIn("mismatchedCurrencyRow", self.javascript)
        self.assertIn("normalizedFcfPerShare: fundamentalInput(market.normalizedFcfPerShare)", self.javascript)
        self.assertIn("normalizedEbitdaPerShare: fundamentalInput(market.normalizedEbitdaPerShare)", self.javascript)
        self.assertNotIn("numberOrNull(company.normalizedFcfPerShare) ?? numberOrNull(company.fcfPerShare)", self.javascript)
        self.assertNotIn("numberOrNull(company.normalizedEbitdaPerShare) ?? numberOrNull(company.ebitdaPerShare)", self.javascript)

    def test_cyclical_dcf_fades_to_mid_cycle_and_treats_debt_once(self):
        cyclical_dcf = self.javascript.split("function calculateCyclicalDcf", 1)[1].split("function calculateCyclicalPeCrossCheck", 1)[0]
        cyclical_flows = self.javascript.split("function buildCyclicalDcfFlows", 1)[1].split("function calculateCyclicalDcf", 1)[0]
        cyclical_model = self.javascript.split("function calculateCyclicalModel", 1)[1].split("function calculateCategoryModel", 1)[0]
        self.assertIn('source: "50% fade to mid-cycle"', cyclical_flows)
        self.assertIn('source: "Normalized mid-cycle"', cyclical_flows)
        self.assertIn('normalization.basis === "fcff" ? -asNumber(company.netDebtPerShare) : 0', cyclical_dcf)
        self.assertIn("presentValue + discountedTerminal + netDebtAdjustment", cyclical_dcf)
        self.assertIn('{ label: "mid-cycle DCF", value: dcf.value, weight: 1 }', cyclical_model)
        self.assertIn("blendedValue: valuationBlend.value", cyclical_model)
        self.assertNotIn("weightedAverage", cyclical_model)
        self.assertNotIn("currentPe) * 0.85", cyclical_model)

    def test_cyclical_calculation_is_explained_in_the_interface(self):
        for element_id in (
            "cyclicalAudit",
            "cyclicalHistoryRows",
            "cyclicalNormalizationFormula",
            "cyclicalForecastRows",
            "cyclicalValueBridge",
            "cyclicalEbitdaCheck",
            "cyclicalPeCheck",
            "cyclicalSubtypeNote",
        ):
            self.assertIn(f'id="{element_id}"', self.html)
        self.assertIn("How the cyclical valuation works", self.html)
        self.assertIn("Every year remains in the calculation; peak and trough years are not manually removed", self.javascript)
        self.assertIn("current EBITDA is not substituted", self.javascript)
        self.assertIn("current EPS is not substituted", self.javascript)
        self.assertRegex(self.html, re.compile(r'data-field="normalizedFcfPerShare"[^>]*readonly'))
        self.assertIn("normalization.valid ? normalization.perShare : null", self.javascript)
        self.assertIn("renderCyclicalAudit(company)", self.javascript)


if __name__ == "__main__":
    unittest.main()
