#!/usr/bin/env python3
"""Compatibility wrapper for the older GitHub Actions price-target command."""

from pathlib import Path
import shutil
import sys

from update_riktkurser import main


def output_path_from_args(args: list[str]) -> Path:
    for index, arg in enumerate(args):
        if arg == "--output" and index + 1 < len(args):
            return Path(args[index + 1])
        if arg.startswith("--output="):
            return Path(arg.split("=", 1)[1])
    return Path("data/riktkurser.json")


def mirror_price_target_file(output_path: Path) -> None:
    if output_path.name == "price_targets.json":
        mirror_path = output_path.with_name("riktkurser.json")
    else:
        mirror_path = output_path.with_name("price_targets.json")

    if output_path.exists():
        mirror_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(output_path, mirror_path)
        print(f"Wrote compatibility copy {mirror_path}")


if __name__ == "__main__":
    exit_code = main(sys.argv[1:])
    if exit_code == 0:
        mirror_price_target_file(output_path_from_args(sys.argv[1:]))
    raise SystemExit(exit_code)
