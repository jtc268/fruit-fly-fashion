#!/usr/bin/env python3
"""Download, verify, normalize, and compile the pinned MaleCNS graph."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOOMFLY = ROOT / "vendor" / "doomfly"
DATASET = "malecns_v1"


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(8 * 1024 * 1024):
            value.update(chunk)
    return value.hexdigest()


def main() -> None:
    registry = json.loads((DOOMFLY / "doom" / "datasets.json").read_text())["datasets"][DATASET]
    locked = json.loads((DOOMFLY / "data-provenance" / DATASET / "source.lock.json").read_text())
    target = DOOMFLY / "connectome_data" / DATASET
    target.mkdir(parents=True, exist_ok=True)
    for filename, url in registry["files"].items():
        path = target / filename
        if not path.exists():
            partial = path.with_suffix(path.suffix + ".download")
            urllib.request.urlretrieve(url, partial)
            partial.replace(path)
        found = digest(path)
        expected = locked[filename]["sha256"]
        if found != expected:
            raise SystemExit(f"checksum mismatch for {filename}: {found} != {expected}")
        print(f"verified {filename} {found}")
    (target / "source.lock.json").write_text(json.dumps(locked, indent=2) + "\n")
    commands = [
        [sys.executable, "-m", "doom.connectome", DATASET],
        [sys.executable, "-m", "doom.prepare"],
        [sys.executable, "-m", "doom.audit_data"],
        [sys.executable, "-m", "doom.build_kernel"],
    ]
    for command in commands:
        print("running", " ".join(command))
        subprocess.run(command, cwd=DOOMFLY, check=True)


if __name__ == "__main__":
    main()

