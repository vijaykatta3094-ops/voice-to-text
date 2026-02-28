# Bug History

This file tracks every significant bug found, diagnosed, and fixed in this project.
It is updated every debugging session so we maintain a clear history and don't
re-debug the same root causes.

---

## BUG-005 — BT HFP SCO link drops mid-recording (audio cuts to zeros)
**Date**: 2026-02-28
**Status**: Fixed
**Symptom**: Voice transcription truncates mid-sentence. Sometimes long recordings (4+ min) return "No speech detected". Transcription shows only first 2-4 seconds of speech.
**Root Cause**: BT headsets maintain the HFP SCO audio link only as long as bidirectional audio is flowing. When nothing plays back to the earpiece (we were recording-only), the headset assumes the "call" ended and drops the SCO link. `sounddevice` via ALSA/PipeWire bridge silently records exact zeros after dropout — no error, no warning.
**Diagnosis**: Analyzed `/tmp/voice-to-text-last.wav` in 250ms chunks. Found exact zero frames from 3.5s onwards despite a 13s recording. Not silence noise — all zero bytes, confirming source disconnection not low signal.
**Fix**:
- `voice-to-text`: Added `start_sco_keepalive()` — plays `cat /dev/zero | pacat` to the BT HFP sink in background during recording. Keeps bidirectional SCO alive. Killed cleanly before profile restore.
- `voice-recorder-daemon`: Added dropout detection — if 30 consecutive zero-only 50ms blocks arrive after speech has started, writes `/tmp/voice-to-text.dropout` and self-stops (rather than recording minutes of silence).
- `voice-to-text`: Toggle logic now handles "dead daemon + PID file" case: transcribes partial audio instead of starting a new recording.
**Files Changed**: `bin/voice-to-text`, `bin/voice-recorder-daemon`

---

## BUG-004 — sounddevice callback status errors silently ignored
**Date**: 2026-02-28
**Status**: Fixed
**Symptom**: Audio overflows/underflows (e.g. buffer too slow) produce no log output — impossible to distinguish from clean recordings.
**Fix**: Added status error logging in `voice-recorder-daemon` callback. Writes to `/tmp/voice-to-text.log` when `status != 0`.
**Files Changed**: `bin/voice-recorder-daemon`

---

## BUG-003 — CUDA graphs incompatible with PyTorch nightly (RTX 5090)
**Date**: ~2026-01 (session before this)
**Status**: Fixed (workaround)
**Symptom**: `model.transcribe()` crashes or hangs with CUDA graph errors on RTX 5090 with PyTorch nightly cu128.
**Root Cause**: `use_cuda_graph_decoder=True` (Parakeet default) requires stable CUDA graph capture which PyTorch nightly breaks on sm_120 (Blackwell).
**Fix**: Disabled cuda graph decoder in both server and engine:
```python
with open_dict(model.cfg):
    model.cfg.decoding.greedy.use_cuda_graph_decoder = False
model.change_decoding_strategy(model.cfg.decoding)
```
**Files Changed**: `bin/voice-transcribe-server`, `bin/voice-transcribe-engine`

---

## BUG-002 — lhotse incompatible with Python 3.12
**Date**: ~2026-01
**Status**: Fixed (patch)
**Symptom**: ImportError or runtime error in lhotse dataset sampling at startup.
**Root Cause**: lhotse uses `collections.Callable` removed in Python 3.10+; code path hits this on Python 3.12.
**Fix**: Patched file directly:
`~/faster-whisper-env/lib/python3.12/site-packages/lhotse/dataset/sampling/base.py` line 77
(Changed `collections.Callable` → `collections.abc.Callable`)
**Note**: This patch is lost if you `pip install --upgrade lhotse`. Re-apply after upgrades.
**Files Changed**: (venv internal patch, not in repo)

---

## BUG-001 — Paste fails in GNOME Wayland terminals and apps
**Date**: ~2025-12 (initial setup)
**Status**: Fixed (wontfix for wtype/xdotool)
**Symptom**: Transcribed text was not pasted into the active window. Various paste tools tried and failed.
**Root Cause**: GNOME Wayland security model blocks synthetic input from most tools. `wtype` and `xdotool` don't work under Wayland compositors.
**Fix**: Use `ydotool` (kernel-level uinput device) with Ctrl+Shift+V. Works in both terminals and regular GTK/Qt apps. Requires `/dev/uinput` ACL for user (set with uaccess rule or `setfacl`).
**Attempted non-solutions**: `wtype` (Wayland only, blocked by GNOME), `xdotool` (X11 only), `xdg-open` clipboard tricks.
**Files Changed**: `bin/voice-to-text`

---

## Open / Suspected Issues

### SUSPECTED-001 — Long audio (4+ min) may produce empty Parakeet transcription
**Status**: Unconfirmed (may have been the BUG-005 dropout)
**Symptom**: 8.5MB recording (~4.5 min) returned empty transcription. Server log showed `2.33it/s` (slower than usual).
**Hypothesis**: Either (a) the entire recording was silence due to BUG-005 SCO dropout, or (b) Parakeet TDT has degraded accuracy on very long single-utterance files. Will confirm once BUG-005 fix is in production.
**Next Step**: After BUG-005 fix, test a genuine 4+ minute recording.

### SUSPECTED-002 — WirePlumber suspends BT node after 5s idle
**Status**: Unconfirmed
**Symptom**: WirePlumber's `suspend-node.lua` suspends idle nodes after 5 seconds. If the PipeWire-ALSA bridge does not properly mark the BT input node as "running", it could be suspended mid-recording, producing zeros.
**Note**: BUG-005 SCO keepalive fix may also resolve this indirectly — if silence is playing to the HFP sink, both input and output nodes stay active.
