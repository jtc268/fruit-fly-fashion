#!/usr/bin/env python3
"""Run six deterministic MaleCNS-in-the-loop art-direction sessions.

The human supplies one seed composition per shirt. Each composition is shown to
the MaleCNS retinal projection across six visual passes. Activity from the full
166,700-neuron graph is hashed into the next visual mutation, so every pass
changes what the connectome sees next. The script emits final print files,
tamper-evident manifests, previews, and an MP4 encoded while the run executes.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
DOOMFLY = ROOT / "vendor" / "doomfly"
GRAPH = DOOMFLY / "outputs" / "doom" / "malecns_v1" / "graph.npz"
UPSTREAM_COMMIT = "71ecf53d78eaffaf1a57ed7b0ccf5d458abc9f33"
SLUGS = ["saber-sync", "raw-signal", "hell-protocol", "market-maker", "wall-contact", "flytok"]
PASSES = ["silhouette", "mirror", "contrast", "cyan", "magenta", "final"]
PALETTE = [(35, 229, 255), (255, 43, 214), (184, 255, 92), (247, 242, 231)]


def sha256(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(8 * 1024 * 1024):
            value.update(chunk)
    return value.hexdigest()


def font(size: int, mono: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/SFNSMono.ttf" if mono else "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Monaco.ttf" if mono else "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            try:
                return ImageFont.truetype(candidate, size=size)
            except OSError:
                pass
    return ImageFont.load_default()


def reset_brain(brain, initial: dict[str, np.ndarray]) -> None:
    for name, value in initial.items():
        getattr(brain, name)[:] = value
    brain.cursor = 0
    brain.sim_ms = 0
    brain.total_spikes = 0


def visual_pass(image: Image.Image, name: str) -> Image.Image:
    base = image.convert("RGBA")
    if name == "mirror":
        base = ImageOps.mirror(base)
    elif name == "contrast":
        base = ImageEnhance.Contrast(base).enhance(1.7)
    elif name in {"cyan", "magenta"}:
        alpha = base.getchannel("A")
        gray = ImageOps.grayscale(base.convert("RGB"))
        color = (35, 229, 255) if name == "cyan" else (255, 43, 214)
        base = ImageOps.colorize(gray, black=(0, 0, 0), white=color).convert("RGBA")
        base.putalpha(alpha)
    elif name == "silhouette":
        alpha = base.getchannel("A")
        base = Image.new("RGBA", base.size, (247, 242, 231, 0))
        base.putalpha(alpha)
    return base


def stimulus(image: Image.Image) -> np.ndarray:
    art = image.copy()
    art.thumbnail((270, 270), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (320, 320), (2, 2, 4))
    rgba = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    rgba.alpha_composite(art, ((320 - art.width) // 2, (320 - art.height) // 2))
    canvas.paste(rgba.convert("RGB"), mask=rgba.getchannel("A"))
    return np.asarray(canvas, dtype=np.uint8)


def parameters(digest: bytes) -> dict[str, float | int]:
    return {
        "hue_degrees": round(-22 + 44 * digest[0] / 255, 3),
        "rotation_degrees": round(-3.5 + 7 * digest[1] / 255, 3),
        "scale": round(0.92 + 0.10 * digest[2] / 255, 5),
        "x_shift_px": int(round(-90 + 180 * digest[3] / 255)),
        "y_shift_px": int(round(-110 + 220 * digest[4] / 255)),
        "echo_px": int(12 + 34 * digest[5] / 255),
        "echo_alpha": int(18 + 34 * digest[6] / 255),
    }


def hue_shift(image: Image.Image, degrees: float) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = np.asarray(rgba.getchannel("A"), dtype=np.uint8)
    hsv = np.asarray(rgba.convert("RGB").convert("HSV"), dtype=np.uint8).copy()
    hsv[..., 0] = (hsv[..., 0].astype(np.int16) + round(degrees / 360 * 255)) % 256
    shifted = Image.fromarray(hsv).convert("RGBA")
    shifted.putalpha(Image.fromarray(alpha))
    return shifted


def mutate(base: Image.Image, spec: dict[str, float | int]) -> Image.Image:
    width, height = base.size
    main = hue_shift(base, float(spec["hue_degrees"]))
    scaled = main.resize(
        (max(1, round(width * float(spec["scale"]))), max(1, round(height * float(spec["scale"])))),
        Image.Resampling.LANCZOS,
    )
    rotated = scaled.rotate(float(spec["rotation_degrees"]), Image.Resampling.BICUBIC, expand=True)
    x = (width - rotated.width) // 2 + int(spec["x_shift_px"])
    y = (height - rotated.height) // 2 + int(spec["y_shift_px"])
    out = Image.new("RGBA", base.size, (0, 0, 0, 0))
    alpha = rotated.getchannel("A")
    echo = int(spec["echo_px"])
    strength = int(spec["echo_alpha"])
    cyan = Image.new("RGBA", rotated.size, (35, 229, 255, 0)); cyan.putalpha(alpha.point(lambda v: v * strength // 255))
    magenta = Image.new("RGBA", rotated.size, (255, 43, 214, 0)); magenta.putalpha(alpha.point(lambda v: v * strength // 255))
    out.alpha_composite(cyan, (x - echo, y + echo // 2))
    out.alpha_composite(magenta, (x + echo, y - echo // 2))
    out.alpha_composite(rotated, (x, y))
    return out


def french_fly(draw: ImageDraw.ImageDraw, x: int, y: int, phase: int) -> None:
    wing = (230, 240, 245, 90)
    draw.ellipse((x - 42, y - 20, x - 4, y + 35), fill=wing, outline=(90, 110, 130, 180), width=2)
    draw.ellipse((x + 4, y - 20, x + 42, y + 35), fill=wing, outline=(90, 110, 130, 180), width=2)
    draw.ellipse((x - 16, y - 15, x + 16, y + 48), fill=PALETTE[phase % 3], outline=(245, 245, 245), width=2)
    draw.ellipse((x - 22, y - 30, x + 22, y + 5), fill=(25, 25, 27), outline=(245, 245, 245), width=2)
    draw.pieslice((x - 31, y - 48, x + 31, y - 8), 180, 360, fill=(7, 7, 8))
    draw.arc((x - 14, y - 12, x, y + 12), 5, 160, fill=(7, 7, 8), width=3)
    draw.arc((x, y - 12, x + 14, y + 12), 20, 175, fill=(7, 7, 8), width=3)


def neuron_points(ids: np.ndarray, counts: np.ndarray, bounds: tuple[int, int, int, int]) -> list[tuple[int, int, int, tuple[int, int, int]]]:
    nonzero = np.flatnonzero(counts)
    if not len(nonzero):
        return []
    chosen = nonzero[np.argsort(counts[nonzero])[-360:]]
    x0, y0, x1, y1 = bounds
    points = []
    peak = max(1, int(counts[chosen].max()))
    for index in chosen:
        value = int(ids[index])
        x = x0 + ((value * 2654435761) & 0xFFFFFFFF) % max(1, x1 - x0)
        y = y0 + ((value * 2246822519 + value // 97) & 0xFFFFFFFF) % max(1, y1 - y0)
        radius = 1 + min(6, math.ceil(5 * int(counts[index]) / peak))
        points.append((int(x), int(y), radius, PALETTE[value % 3]))
    return points


class VideoWriter:
    def __init__(self, path: Path, fps: int = 24):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.fps = fps
        command = [
            "ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
            "-s", "1280x720", "-r", str(fps), "-i", "-", "-an", "-c:v", "libx264",
            "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(path),
        ]
        self.process = subprocess.Popen(command, stdin=subprocess.PIPE)

    def write(self, frame: Image.Image, seconds: float) -> None:
        data = np.asarray(frame.convert("RGB"), dtype=np.uint8).tobytes()
        assert self.process.stdin is not None
        for _ in range(round(seconds * self.fps)):
            self.process.stdin.write(data)

    def close(self) -> None:
        assert self.process.stdin is not None
        self.process.stdin.close()
        if self.process.wait() != 0:
            raise RuntimeError("ffmpeg failed")


def proof_frame(slug: str, run_id: str, pass_name: str, phase: int, ids: np.ndarray, counts: np.ndarray,
                current: Image.Image, metrics: dict, final: bool = False) -> Image.Image:
    frame = Image.new("RGB", (1280, 720), (7, 7, 8))
    draw = ImageDraw.Draw(frame, "RGBA")
    for n in range(28):
        px = int((n * 173 + phase * 71) % 1280)
        py = int((n * 97 + phase * 43) % 720)
        color = PALETTE[n % 3]
        draw.ellipse((px - 38, py - 38, px + 38, py + 38), fill=(*color, 12))
    draw.text((48, 34), "CONNECTOME ATELIER / LIVE RUN", font=font(22, True), fill=(184, 255, 92))
    draw.text((48, 76), slug.upper().replace("-", " "), font=font(52), fill=(247, 242, 231))
    draw.text((48, 139), f"MaleCNS v1.0   166,700 neurons   25,582,938 edges", font=font(18, True), fill=(140, 145, 150))
    draw.rounded_rectangle((48, 190, 760, 654), radius=24, fill=(12, 12, 15, 245), outline=(40, 42, 46), width=2)
    draw.text((74, 214), f"PASS {phase + 1}/6  {pass_name.upper()}", font=font(18, True), fill=PALETTE[phase % 3])
    for x, y, radius, color in neuron_points(ids, counts, (80, 265, 728, 540)):
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(*color, 170))
    draw.line((80, 561, 728, 561), fill=(60, 64, 68), width=1)
    draw.text((80, 581), f"SPIKES {metrics['spikes']:,}", font=font(18, True), fill=(247, 242, 231))
    draw.text((300, 581), f"ACTIVE {metrics['active']:,}", font=font(18, True), fill=(247, 242, 231))
    draw.text((520, 581), f"SIM {metrics['sim_ms']:.0f} ms", font=font(18, True), fill=(247, 242, 231))
    draw.rounded_rectangle((800, 190, 1232, 654), radius=24, fill=(12, 12, 15, 245), outline=(*PALETTE[phase % 3], 130), width=2)
    preview = current.copy(); preview.thumbnail((370, 370), Image.Resampling.LANCZOS)
    preview_bg = Image.new("RGBA", (390, 390), (4, 4, 6, 255))
    preview_bg.alpha_composite(preview, ((390 - preview.width) // 2, (390 - preview.height) // 2))
    frame.paste(preview_bg.convert("RGB"), (821, 222))
    if final:
        draw.rounded_rectangle((918, 604, 1117, 638), radius=17, fill=(184, 255, 92))
        draw.text((944, 611), "PRINT LOCKED", font=font(15, True), fill=(7, 7, 8))
    french_fly(draw, 1184, 111, phase)
    draw.text((48, 681), f"RUN {run_id}", font=font(14, True), fill=(100, 103, 108))
    draw.text((1000, 681), "ENGINEERED LIF PROXY", font=font(14, True), fill=(100, 103, 108))
    return frame


def make_mockup(blank_path: Path, design: Image.Image, output: Path) -> None:
    blank = Image.open(blank_path).convert("RGBA").resize((1200, 1200), Image.Resampling.LANCZOS)
    art = design.copy(); art.thumbnail((380, 510), Image.Resampling.LANCZOS)
    layer = Image.new("RGBA", blank.size, (0, 0, 0, 0))
    layer.alpha_composite(art, (410 + (380 - art.width) // 2, 390 + (510 - art.height) // 2))
    merged = Image.blend(blank, Image.alpha_composite(blank, layer), 0.92)
    output.parent.mkdir(parents=True, exist_ok=True)
    merged.convert("RGB").save(output, "WEBP", quality=92, method=6)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--blank-tee", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, default=ROOT / "outputs")
    args = parser.parse_args()
    if not GRAPH.exists():
        raise SystemExit("graph missing; run scripts/bootstrap.py first")
    sys.path.insert(0, str(DOOMFLY))
    from doom.game import retinal_samples
    from doom.native import NativeBrain

    brain = NativeBrain(GRAPH)
    initial = {name: getattr(brain, name).copy() for name in [
        "v", "g", "drive", "refractory", "queue", "queue_count", "counts", "luminance",
        "active", "active_flag", "nactive", "previous_drive", "last",
    ]}
    lock = json.loads((DOOMFLY / "data-provenance" / "malecns_v1" / "source.lock.json").read_text())
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    session = {"run_started_utc": timestamp, "upstream_commit": UPSTREAM_COMMIT, "dataset": lock, "products": []}
    for product_index, slug in enumerate(SLUGS):
        source = args.input_dir / f"{slug}.png"
        if not source.exists():
            raise SystemExit(f"missing seed art: {source}")
        reset_brain(brain, initial)
        base = Image.open(source).convert("RGBA")
        current = base.copy()
        source_hash = sha256(source)
        hasher = hashlib.sha256(bytes.fromhex(source_hash))
        run_id = f"{timestamp}-{product_index + 1:02d}-{slug}"
        video_path = args.output_dir / "proof" / f"{slug}.mp4"
        writer = VideoWriter(video_path)
        intro_counts = np.zeros(brain.n, dtype=np.int32)
        intro = proof_frame(slug, run_id, "initializing", 0, brain.ids, intro_counts, current,
                            {"spikes": 0, "active": 0, "sim_ms": 0})
        writer.write(intro, 1.5)
        pass_records = []
        cumulative_ms = 0.0
        for phase, pass_name in enumerate(PASSES):
            frame_rgb = stimulus(visual_pass(current, pass_name))
            light = retinal_samples(frame_rgb, brain.uv)
            counts, wall = brain.step(light, 150)
            cumulative_ms += 150
            hasher.update(pass_name.encode()); hasher.update(counts.tobytes())
            response = hasher.digest()
            spec = parameters(response)
            current = mutate(base, spec)
            metrics = {
                "pass": pass_name,
                "spikes": int(counts.sum()),
                "active": int(np.count_nonzero(counts)),
                "sim_ms": cumulative_ms,
                "wall_seconds": round(float(wall), 6),
                "response_sha256": hashlib.sha256(counts.tobytes()).hexdigest(),
                "parameters": spec,
            }
            pass_records.append(metrics)
            writer.write(proof_frame(slug, run_id, pass_name, phase, brain.ids, counts, current, metrics), 1.6)
        print_dir = args.output_dir / "print"; print_dir.mkdir(parents=True, exist_ok=True)
        final_path = print_dir / f"{slug}.png"
        current.save(final_path, "PNG", compress_level=9, dpi=(300, 300))
        output_hash = sha256(final_path)
        final_metrics = pass_records[-1]
        final_frame = proof_frame(slug, run_id, "final", 5, brain.ids, counts, current, final_metrics, final=True)
        writer.write(final_frame, 3.0); writer.close()
        preview_path = args.output_dir / "previews" / f"{slug}.webp"
        preview_path.parent.mkdir(parents=True, exist_ok=True)
        preview = current.copy(); preview.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
        preview.save(preview_path, "WEBP", quality=92, method=6)
        mockup_path = args.output_dir / "mockups" / f"{slug}.webp"
        make_mockup(args.blank_tee, current, mockup_path)
        product = {
            "slug": slug,
            "run_id": run_id,
            "seed_art_sha256": source_hash,
            "final_art_sha256": output_hash,
            "response_chain_sha256": hasher.hexdigest(),
            "final_parameters": pass_records[-1]["parameters"],
            "passes": pass_records,
            "video": str(video_path.relative_to(ROOT)),
            "print_file": str(final_path.relative_to(ROOT)),
        }
        manifest_path = args.output_dir / "manifests" / f"{slug}.json"
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(json.dumps({**session, "products": [product]}, indent=2) + "\n")
        session["products"].append(product)
        print(json.dumps({"slug": slug, "run_id": run_id, "spikes": sum(p["spikes"] for p in pass_records), "final_art_sha256": output_hash}))
    session_path = args.output_dir / "runs" / f"{timestamp}.json"
    session_path.parent.mkdir(parents=True, exist_ok=True)
    session_path.write_text(json.dumps(session, indent=2) + "\n")
    (args.output_dir / "latest-run.json").write_text(json.dumps(session, indent=2) + "\n")
    print(f"complete {session_path}")


if __name__ == "__main__":
    main()
