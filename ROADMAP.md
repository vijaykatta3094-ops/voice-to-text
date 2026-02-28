# Roadmap

This file tracks short-term bug fixes, medium-term improvements, and long-term plans
for making this tool broadly available on Linux.

---

## Status: Alpha (personal use, single machine)

The tool works well day-to-day but has reliability issues (see BUGS.md) that make
it not yet ready for broader distribution.

---

## Short Term — Stability (current focus)

- [x] BT HFP SCO keepalive to prevent audio dropout (BUG-005)
- [x] BT dropout detection in recorder daemon (BUG-004 / BUG-005)
- [ ] Confirm BUG-005 fix works across multiple sessions/days
- [ ] Test genuinely long recordings (4+ min) to confirm SUSPECTED-001
- [ ] Improve notification UX: show partial transcription on BT dropout
- [ ] Add daily persistent log (survives reboots) for pattern analysis
- [ ] Write test script that records 30s and analyzes audio quality automatically

---

## Medium Term — Robustness & UX

- [ ] **Auto-fallback to built-in mic** when BT drops mid-recording (currently: warns + transcribes partial)
- [ ] **Retry mechanism**: if "no speech detected" and recording was > 10s, auto-retry with whisper engine
- [ ] **Mic level indicator**: show dB level in notification so user knows mic is working before speaking
- [ ] **Language support**: easy toggle for non-English (Parakeet is English-only, switch to Whisper)
- [ ] **Hotword cancel**: press Escape to cancel recording without transcribing
- [ ] **Systemd log rotation**: `/tmp/` logs are lost on reboot; persistent daily logs
- [ ] **Server health check**: if server crashes, auto-restart before next transcription attempt
- [ ] **lhotse patch automation**: script to re-apply the Python 3.12 fix after venv upgrades

---

## Long Term — Public Release (Linux)

### Goal
Make this available as a proper open-source tool any Linux desktop user can install.

### System Requirements to Document
- **OS**: Linux with PipeWire audio (Ubuntu 22.04+, Fedora 38+)
- **Desktop**: GNOME Wayland (tested), KDE Wayland (untested), X11 (untested — different paste mechanism)
- **GPU (Parakeet engine)**: NVIDIA GPU with CUDA support, 2GB+ VRAM; RTX 5090 tested (sm_120)
  - RTX 5090 specifically requires: PyTorch nightly cu128 + `use_cuda_graph_decoder=False`
  - Other NVIDIA GPUs (Ampere/Ada/Hopper): standard PyTorch cu121/cu124 should work
  - Without GPU: falls back to Whisper CPU (slower: 5-15s per transcription)
- **RAM**: 4GB minimum (Parakeet loads ~1.7GB GPU VRAM + system RAM)
- **Python**: 3.10+ (3.12 tested, requires lhotse patch)
- **Bluetooth (optional)**: Any BT headset with HFP/mSBC profile for mic

### Packaging Plan
- [ ] Create proper `install.sh` with dependency detection and guided setup
- [ ] Detect GPU and auto-select engine (parakeet vs whisper)
- [ ] Detect desktop environment (GNOME/KDE/X11) and configure paste method
- [ ] Support non-BT mic (built-in laptop mic) as first-class option
- [ ] Create `.deb` package or AUR PKGBUILD
- [ ] Add GitHub Actions CI: lint + dry-run install test
- [ ] Write proper user docs: setup, troubleshooting, FAQ

### Architecture for Multi-User
Currently the model server is a personal systemd user service. For a proper release:
- [ ] Package as `~/.local/` install (no root required)
- [ ] Support multiple engines without hardcoded paths
- [ ] Consider model download automation (currently manual NeMo model download)
- [ ] GNOME extension for nicer UX (optional, not blocking)

### Alternative Engine Support
- [ ] **Faster-Whisper** (current CPU fallback): already works
- [ ] **WhisperX**: better word-level timestamps
- [ ] **Moonshine** (Useful Sensors): fast, small, offline
- [ ] **Parakeet-CTC** (smaller): lower VRAM requirement

---

## GitHub / Project Maintenance

- [ ] Set up GitHub repo (vijay-katta/voice-to-text or similar)
- [ ] Enable GitHub Issues for bug tracking (link from BUGS.md)
- [ ] Tag releases once stable
- [ ] Write CONTRIBUTING.md once accepting external contributions

---

## Claude Context Notes

For AI-assisted debugging sessions, always check:
1. `BUGS.md` — has all known root causes; avoid re-debugging closed issues
2. `logs/` — daily persistent logs showing patterns over time
3. `/tmp/voice-to-text.log` — current session real-time log
4. `/tmp/voice-to-text-last.wav` — last recording for audio analysis
5. `systemctl --user status voice-transcribe-server` — server health
