#!/usr/bin/env python3
"""Run the EODHD price updater from the repository root."""

from __future__ import annotations

import sys

from scripts.update_prices import main


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
