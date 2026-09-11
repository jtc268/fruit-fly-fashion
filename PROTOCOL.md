# Connectome Atelier protocol

## What the fly controls

Each shirt begins with a human-made seed composition. The script presents that composition to the MaleCNS retinal projection in six passes. Each pass advances the complete 166,700-node, 25,582,938-edge graph through DOOMFLY's fixed-step leaky-integrate-and-fire proxy.

The full spike-count vector is hashed after every pass. That response determines hue rotation, rotation, scale, x/y placement, and cyan/magenta echo geometry. The mutated image becomes the next retinal stimulus. After six passes, the pipeline writes the exact 300 DPI print file and its SHA-256 hash.

## What this does not claim

This is an engineered connectome-in-the-loop art system. A wiring diagram does not contain a complete living brain state, and the dynamics, retinal projection, and art-direction mapping are explicit engineering choices. The fly is not sentient, it is not a validated biological emulation, and it did not invent the original visual briefs.

## Proof

Every product emits:

- an MP4 encoded while its six-pass run executes;
- a JSON manifest with source-data hashes, upstream commit, run ID, pass metrics, response hashes, chosen transforms, and final print-file hash;
- a reproducible final preview and mockup.

The official MaleCNS v1.0 source files are verified against DOOMFLY's pinned SHA-256 lock before any run.

