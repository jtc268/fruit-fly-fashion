# Errors

Command failures and integration errors.

---

## [ERR-20260911-002] ffmpeg-contact-sheet

**Logged**: 2026-09-11T19:55:00Z
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
The local ffmpeg build could not encode the mockup contact sheet as WebP.

### Error
```
Requested output format 'webp' is not available
```

### Context
- The sheet was only needed for visual QA of the six rebuilt mockups.

### Suggested Fix
Use PNG for QA contact sheets on this host.

### Metadata
- Reproducible: yes
- Related Files: outputs/mockups/

### Resolution
- **Resolved**: 2026-09-11T19:55:00Z
- **Notes**: Regenerated the contact sheet as PNG and completed the visual review.

---

## [ERR-20260911-001] run_atelier

**Logged**: 2026-09-11T19:50:00Z
**Priority**: medium
**Status**: resolved
**Area**: config

### Summary
The atelier rerun used system Python instead of the project venv.

### Error
```
ModuleNotFoundError: No module named 'vizdoom'
```

### Context
- Command attempted: `python3 scripts/run_atelier.py --input-dir inputs --blank-tee inputs/blank-tee.png`
- The repository already contains a working `.venv` with the pinned runtime dependencies.

### Suggested Fix
Run the atelier through `.venv/bin/python`.

### Metadata
- Reproducible: yes
- Related Files: scripts/run_atelier.py

### Resolution
- **Resolved**: 2026-09-11T19:50:00Z
- **Notes**: Confirmed that `.venv/bin/python` imports vizdoom, numpy, and PIL.

---
