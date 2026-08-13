import unittest

from scripts.update_prices import fetch_yahoo_quote


class FakeFastInfo(dict):
    pass


class FakeTicker:
    def __init__(self, info):
        self.fast_info = FakeFastInfo(lastPrice=200, regularMarketPreviousClose=195, currency="SEK")
        self.info = info


class FakeYfinance:
    def __init__(self, info):
        self.info = info

    def Ticker(self, _ticker):
        return FakeTicker(self.info)


class PricePeTests(unittest.TestCase):
    def test_calculates_trailing_pe_from_current_price_and_trailing_eps(self):
        quote = fetch_yahoo_quote(FakeYfinance({"trailingEps": 10, "trailingPE": 99}), "TEST.ST")
        self.assertEqual(quote["trailingPe"], 20)
        self.assertEqual(quote["peCalculation"], "Market price / Yahoo Finance trailing EPS")

    def test_negative_earnings_do_not_produce_a_pe(self):
        quote = fetch_yahoo_quote(FakeYfinance({"trailingEps": -2}), "LOSS.ST")
        self.assertIsNone(quote["trailingPe"])

    def test_uses_reported_yahoo_pe_when_trailing_eps_is_missing(self):
        quote = fetch_yahoo_quote(FakeYfinance({"trailingPE": 18.5}), "FALLBACK.ST")
        self.assertEqual(quote["trailingPe"], 18.5)


if __name__ == "__main__":
    unittest.main()
