#!/usr/bin/env python3
"""Verify the latest proof bundle without loading the neural runtime."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {"saber-sync", "raw-signal", "hell-protocol", "market-maker", "wall-contact", "flytok"}


def sha256(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(8 * 1024 * 1024):
            value.update(chunk)
    return value.hexdigest()


def duration(path: Path) -> float:
    output = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", str(path)
    ], text=True)
    return float(output.strip())


def main() -> None:
    run = json.loads((ROOT / "outputs" / "latest-run.json").read_text())
    if {item["slug"] for item in run["products"]} != EXPECTED:
        raise SystemExit("proof bundle does not contain the exact six products")
    for item in run["products"]:
        slug = item["slug"]
        if len(item["passes"]) != 6 or any(entry["spikes"] <= 0 for entry in item["passes"]):
            raise SystemExit(f"invalid neural pass record: {slug}")
        art = ROOT / item["print_file"]
        video = ROOT / item["video"]
        if sha256(art) != item["final_art_sha256"]:
            raise SystemExit(f"print hash mismatch: {slug}")
        if duration(video) < 13.9:
            raise SystemExit(f"proof video too short: {slug}")
        manifest = json.loads((ROOT / "outputs" / "manifests" / f"{slug}.json").read_text())
        if manifest["products"][0]["response_chain_sha256"] != item["response_chain_sha256"]:
            raise SystemExit(f"manifest mismatch: {slug}")
    print(json.dumps({
        "verified": True,
        "products": len(run["products"]),
        "neural_passes": sum(len(item["passes"]) for item in run["products"]),
        "spikes": sum(sum(entry["spikes"] for entry in item["passes"]) for item in run["products"]),
    }))


if __name__ == "__main__":
    main()
