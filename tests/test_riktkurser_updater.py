import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.omxs30_universe import company_id, load_omxs30_universe, normalize_ticker
from scripts import update_riktkurser


ROOT = Path(__file__).resolve().parents[1]


class Omxs30UniverseTests(unittest.TestCase):
    def test_checked_in_universe_has_30_unique_companies(self):
        universe = load_omxs30_universe()
        tickers = [ticker for ticker, _name, _sector in universe]

        self.assertEqual(len(universe), 30)
        self.assertEqual(len(set(tickers)), 30)
        self.assertTrue(all(ticker.endswith(".ST") for ticker in tickers))

    def test_ticker_helpers_are_independent_of_removed_fundamentals_updater(self):
        self.assertEqual(normalize_ticker(" seb-a "), "SEB-A.ST")
        self.assertEqual(company_id("SEB-A.ST"), "seb-a-st")
        self.assertNotIn("update_data", (ROOT / "scripts" / "update_riktkurser.py").read_text(encoding="utf-8"))

    def test_current_borskollen_slugs_are_tried_first(self):
        expected = {
            "EVO.ST": ("Evolution", "evolution-gaming-gr"),
            "HM-B.ST": ("Hennes & Mauritz B", "hennes-mauritz"),
            "NIBE-B.ST": ("Nibe Industrier B", "nibe-industrier"),
            "TELIA.ST": ("Telia Company", "telia-company"),
        }
        for ticker, (name, slug) in expected.items():
            with self.subTest(ticker=ticker):
                self.assertEqual(update_riktkurser.slug_candidates(ticker, name)[0], slug)

    def test_legacy_workflow_command_imports_successfully(self):
        result = subprocess.run(
            [sys.executable, "scripts/scrape_riktkurser.py", "--help"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Fetch Borskollen riktkurser", result.stdout)


class PriceTargetUpdateTests(unittest.TestCase):
    def test_single_ticker_update_retains_all_companies_and_mirrors_output(self):
        existing_path = ROOT / "data" / "riktkurser.json"
        existing_payload = json.loads(existing_path.read_text(encoding="utf-8"))

        with tempfile.TemporaryDirectory() as directory:
            output_path = Path(directory) / "riktkurser.json"
            output_path.write_text(json.dumps(existing_payload), encoding="utf-8")

            fetched = {
                "id": "abb-st",
                "ticker": "ABB.ST",
                "name": "ABB Ltd",
                "provider": "Börskollen riktkurser",
                "source": "Börskollen",
                "sourceUrl": "https://www.borskollen.se/aktie/abb/riktkurs",
                "targetPrice": 999.0,
                "upsidePercent": 1.0,
                "consensus": "Buy",
                "targetCount": 1,
                "latest": [],
                "dataUpdatedAt": "2026-09-07T00:00:00+00:00",
                "errors": [],
            }

            with patch.object(update_riktkurser, "fetch_company", return_value=fetched):
                result = update_riktkurser.main([
                    "--output", str(output_path),
                    "--ticker", "ABB.ST",
                    "--delay", "0",
                ])

            primary = json.loads(output_path.read_text(encoding="utf-8"))
            mirror = json.loads((output_path.parent / "price_targets.json").read_text(encoding="utf-8"))

        self.assertEqual(result, 0)
        self.assertEqual(len(primary["companies"]), 30)
        self.assertEqual(primary, mirror)
        self.assertEqual(primary["companies"][0]["targetPrice"], 999.0)
        self.assertEqual(primary["companies"][1], existing_payload["companies"][1])

    def test_only_one_scheduled_price_target_workflow_remains(self):
        workflow = (ROOT / ".github" / "workflows" / "update-price-targets.yml").read_text(encoding="utf-8")

        self.assertFalse((ROOT / ".github" / "workflows" / "update-riktkurser.yml").exists())
        self.assertIn("python scripts/update_riktkurser.py", workflow)
        self.assertIn("git add data/riktkurser.json data/price_targets.json", workflow)
        self.assertIn("group: omxs30-data-writes", workflow)


if __name__ == "__main__":
    unittest.main()
