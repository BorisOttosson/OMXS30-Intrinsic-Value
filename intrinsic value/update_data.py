#!/usr/bin/env python3
"""Run the fundamentals updater from the repository root."""

from __future__ import annotations

import sys

from scripts.update_data import OMXS30, company_id, main


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
