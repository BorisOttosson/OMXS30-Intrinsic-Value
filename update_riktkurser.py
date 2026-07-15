#!/usr/bin/env python3
"""Run the Borskollen riktkurs updater from the repository root."""

from __future__ import annotations

import sys

from scripts.update_riktkurser import main


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
