# Hoot — Voice-to-Text for Linux

## Project Overview
Toggle-based voice transcription: Ctrl+Space starts/stops recording, transcribes via GPU, pastes into active window.

## Architecture
- `~/bin/hoot` — Main toggle script (bash), entry point
- `~/bin/hoot-recorder` — Audio recorder (Python, sounddevice callback)
- `~/bin/hoot-engine` — Thin client, talks to server via Unix socket
- `~/bin/hoot-server` — Persistent model server, keeps Parakeet on GPU
- `~/bin/hoot-transcribe` — CLI tool for transcribing audio files
- Source of truth: `~/voice-to-text/src/` — copy to `~/bin/` after changes
- Python venv: `~/faster-whisper-env/`
- Service: `~/.config/systemd/user/hoot-server.service`

## Known Gotchas — FOLLOW THESE
- **NeMo Logger**: Use `Logger()` (singleton instance), NOT `Logger` (class) for setLevel
- **CUDA graphs**: Always set `use_cuda_graph_decoder=False` — PyTorch nightly incompatibility with RTX 5090
- **Recording**: Use `sounddevice` callback — ffmpeg/parec lose audio on stop
- **Paste method**: `ydotool key ctrl+shift+v` — wtype/xdotool don't work on GNOME Wayland
- **Ctrl+Shift+V**: Works in both terminals and regular apps, don't change to Ctrl+V
- **lhotse patch**: `~/faster-whisper-env/lib/python3.12/site-packages/lhotse/dataset/sampling/base.py` line 77 — patched for Python 3.12
- **BT SCO keepalive**: `cat /dev/zero | pacat --playback` to BT HFP sink during recording — prevents SCO link dropout
- **BT dropout**: 30 consecutive zero-blocks (1.5s) after speech → writes `/tmp/voice-to-text.dropout` and self-stops
- **VAD filter**: Required on Whisper engine to prevent hallucinations on silence
- **ydotool**: v0.1.8, no separate daemon needed, "backend unavailable" warning is harmless

## Testing Protocol
After every change, run TWO tests:
1. Continuous speech (5+ seconds uninterrupted)
2. Spaced speech with pauses (speak... pause 2s... speak again)

Then verify:
- `/tmp/voice-to-text-last.wav` exists and has audio
- Transcription text was pasted correctly
- Check `~/voice-to-text/logs/$(date +%Y-%m-%d).log` for errors

## Engines
- **Parakeet TDT 0.6B v3** (default): GPU, ~0.2s transcription
- **Whisper** (faster-whisper): CPU int8, fallback, multilingual
- Switch: `VOICE_ENGINE=parakeet|whisper`

## File Locations
- Persistent logs: `~/voice-to-text/logs/YYYY-MM-DD.log`
- Ephemeral log: `/tmp/hoot.log`
- Server log: `/tmp/hoot-server.log`
- Server socket: `/tmp/hoot-server.sock`
- Last recording: `/tmp/voice-to-text-last.wav`
- Bug history: `~/voice-to-text/BUGS.md` — read before debugging
- Roadmap: `~/voice-to-text/ROADMAP.md`

## When Making Changes
1. Edit files in `~/voice-to-text/src/`, NOT directly in `~/bin/`
2. Copy to `~/bin/` and `chmod +x` after changes
3. If server code changed: `systemctl --user restart hoot-server`
4. Run the two-test protocol
5. Update BUGS.md if fixing a bug, CHANGELOG.md for features
