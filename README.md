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

## Watch the fly work

Each public recording captures the connectome state, pass number, modeled spikes, active-neuron count, and the evolving shirt art from the same run committed here.

- [SABER SYNC, run 01](https://youtu.be/kaau4EFe_fs)
- [RAW SIGNAL, run 02](https://youtu.be/nE11CKId1rw)
- [HELL PROTOCOL, run 03](https://youtu.be/_Y4ATRcFTyU)
- [MARKET MAKER, run 04](https://youtu.be/u1YOD1ANK7I)
- [WALL CONTACT, run 05](https://youtu.be/5jYuav0oCQs)
- [THE FEED, run 06](https://youtu.be/txIp9AfX0nc)

Live drop: https://fruitfly.fashion/

## FLY PAINT

The live store also exposes a custom paint booth below the six fixed shirts. A brief, meme lane, seed, and intensity drive six deterministic mutations derived from the verified MaleCNS run lineage. The same inputs reproduce the same artwork and run manifest.

The browser receives a lightweight projection so a customer can watch the passes finish in real time. The checkout signs that exact run server-side, renders the same design as a transparent 3703 x 4200 print asset, and sends it to the same Comfort Colors 1717 Printify workflow after Stripe confirms payment.

The production core is published at [`web/fly-paint-core.mjs`](web/fly-paint-core.mjs). It does not pretend to rerun the entire 25,582,938-edge graph in a browser; its ancestry hashes and spike baselines come from the full verified runs in this repository.

## Honest label

This is an engineered connectome-in-the-loop art system. The fly controls the final visual mutations through its modeled whole-graph response to the seed art. The dynamics and retina are explicit models, not a resurrected biological fly. Read [PROTOCOL.md](PROTOCOL.md) before tweeting something weird about consciousness.

## Sources

- MaleCNS v1.0: https://male-cns.janelia.org/
- Google Research release: https://research.google/blog/a-connectomics-milestone-mapping-the-complete-male-fruit-fly-brain/
- DOOMFLY: https://github.com/nftechie/doomfly

MaleCNS data retains its upstream license. DOOMFLY is MIT. Original code in this repository is MIT, © 2026 Adore LLC.
