# fruit-fly-fashion

The 166,700-neuron MaleCNS connectome art-directed a six-shirt drop.

This repository is the proof, not a vibes-only attribution. It downloads the official MaleCNS v1.0 release, verifies all three source hashes, runs the complete retained graph through DOOMFLY's audited LIF proxy, and uses the resulting spike vectors to control the final color, rotation, placement, scale, and neural-color echo of each print file.

## Reproduce it

```sh
git clone --recurse-submodules https://github.com/jtc268/fruit-fly-fashion.git
cd fruit-fly-fashion
python3.11 -m venv .venv
.venv/bin/pip install -r vendor/doomfly/requirements-neural.txt -r vendor/doomfly/doom/requirements.txt --build-constraint vendor/doomfly/neural-build-constraints.txt
.venv/bin/pip install -r requirements.txt
.venv/bin/python scripts/bootstrap.py
.venv/bin/python scripts/run_atelier.py --input-dir inputs --blank-tee inputs/blank-tee.png
```

The official graph download is about 1.1 GB. Normalized graph files, local environments, and full-resolution print assets stay out of Git. Proof videos, previews, and signed manifests are committed.

## Honest label

This is an engineered connectome-in-the-loop art system. The fly controls the final visual mutations through its modeled whole-graph response to the seed art. The dynamics and retina are explicit models, not a resurrected biological fly. Read [PROTOCOL.md](PROTOCOL.md) before tweeting something weird about consciousness.

## Sources

- MaleCNS v1.0: https://male-cns.janelia.org/
- Google Research release: https://research.google/blog/a-connectomics-milestone-mapping-the-complete-male-fruit-fly-brain/
- DOOMFLY: https://github.com/nftechie/doomfly

MaleCNS data retains its upstream license. DOOMFLY is MIT. Original code in this repository is MIT, © 2026 Adore LLC.

