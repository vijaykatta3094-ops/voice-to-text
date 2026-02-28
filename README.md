# Voice-to-Text for Linux (GNOME Wayland)

Push-to-talk voice transcription. Press a keyboard shortcut to start recording, press again to stop — transcribed text is automatically pasted into the active window.

## Quick Start

1. Press **Ctrl+Space** to start recording (notification confirms)
2. Speak naturally
3. Press **Ctrl+Space** again to stop
4. Text is transcribed, copied to clipboard, and auto-pasted (Ctrl+Shift+V)

**After reboot/laptop reopen**: Everything works automatically — no manual steps needed. The GNOME keybinding persists, and the model server auto-starts on login via systemd. First transcription after boot may take ~10-15s (model loading); all subsequent ones are instant (~0.2s).

## File Structure

```
~/bin/
  voice-to-text              # Main toggle script (bash) — bound to Ctrl+Space
  voice-recorder-daemon      # Audio recorder daemon (python) — captures mic audio
  voice-transcribe-engine    # Transcription client (python) — talks to server or falls back to direct
  voice-transcribe-server    # Persistent model server (python) — keeps Parakeet loaded on GPU
  transcribe                 # CLI tool for transcribing audio files

~/.config/systemd/user/
  voice-transcribe-server.service  # Auto-starts model server on login

~/faster-whisper-env/        # Python virtual environment with all dependencies

/tmp/
  voice-to-text.pid          # PID of running recorder (exists only while recording)
  voice-to-text.log          # Debug log (timestamps, transcription results)
  voice-to-text-recording.wav     # Current recording (deleted after transcription)
  voice-to-text-last.wav     # Last recording kept for debugging
  voice-transcribe.sock      # Unix socket for server communication
  voice-transcribe-server.pid    # Server PID
  voice-transcribe-server.log    # Server log
```

## How It Works

### Recording Flow
```
Ctrl+Space (start)
  → voice-to-text (bash) launches voice-recorder-daemon via nohup
  → voice-recorder-daemon records mic using sounddevice (Python, zero-loss)
  → Audio written to WAV in 50ms blocks via callback queue

Ctrl+Space (stop)
  → voice-to-text sends SIGTERM to recorder daemon
  → Daemon stops stream, drains audio queue, closes WAV file cleanly
  → voice-transcribe-engine sends audio path to voice-transcribe-server via Unix socket
  → Server transcribes instantly (~0.3s) — model already loaded on GPU
  → Text copied to clipboard via wl-copy
  → Text pasted via ydotool Ctrl+Shift+V (works in terminals AND regular apps)
  → Notification shows result
```

### Persistent Model Server
```
voice-transcribe-server (runs continuously via systemd)
  → Loads Parakeet model once (~10s on first start, cached after)
  → Keeps model in GPU memory (VRAM)
  → Listens on Unix socket /tmp/voice-transcribe.sock
  → Transcribes in ~0.3s per request (vs ~11s without server)
  → Auto-starts on login via systemd user service
  → If server is down, voice-transcribe-engine auto-starts it (or falls back to direct load)
```

### Key Design Decisions

| Problem | Solution |
|---------|----------|
| GNOME strips env vars from keybinding commands | Script explicitly sets HOME, DISPLAY, WAYLAND_DISPLAY, etc. |
| ffmpeg/parecord lose buffered audio on stop | sounddevice records directly in-process with callback — zero loss |
| wtype doesn't work on GNOME Wayland | ydotool uses /dev/uinput (kernel-level), bypasses Wayland |
| xdotool targets notification window | Replaced with ydotool |
| Whisper hallucinating on silence | VAD filter enabled (silero-vad via faster-whisper) |
| Paste doesn't work in terminals | Uses Ctrl+Shift+V (works in terminals and as "paste without formatting" in most apps) |
| cuBLAS GPU error with faster-whisper | Whisper uses CPU int8; Parakeet uses GPU natively |
| setsid breaks PulseAudio | Using nohup + disown instead |
| NeMo + PyTorch nightly CUDA graph incompatibility | Disabled use_cuda_graph_decoder for Parakeet |
| lhotse + Python 3.12 incompatibility | Patched CutSampler.__init__ in lhotse source |
| Parakeet takes ~11s per transcription (model reload) | Persistent server keeps model in GPU memory → 0.3s |
| NeMo Logger API changed (setLevel needs instance) | Call `Logger()` (singleton instance) not `Logger` (class) |

## Configuration

Environment variables (set in `~/.bashrc`):

| Variable | Default | Description |
|----------|---------|-------------|
| `VOICE_ENGINE` | `parakeet` | Engine: `parakeet` (GPU, fastest) or `whisper` (CPU) |
| `VOICE_MODEL` | `base` | Whisper model (only used when engine=whisper) |
| `VOICE_LANG` | `en` | Language code (only used when engine=whisper) |

### Switching Engines

```bash
# Use Parakeet (default) — fastest, best accuracy, requires GPU
export VOICE_ENGINE=parakeet

# Use Whisper — lighter, works on CPU, multilingual
export VOICE_ENGINE=whisper
export VOICE_MODEL=base       # or: tiny, small, medium, large-v3, distil-large-v3.5
export VOICE_LANG=en          # or: es, fr, de, zh, ja, ko, hi, etc.
```

### Engine Comparison

| Engine | Model | Speed | WER | GPU | Best For |
|--------|-------|-------|-----|-----|----------|
| **parakeet** | TDT 0.6B v3 | **0.3s** | **~7%** | Yes (RTX 5090) | Daily use (default) |
| whisper | base | 0.45s | ~15% | No (CPU) | Quick, lightweight |
| whisper | small | 1.2s | ~10% | No (CPU) | Better accuracy |
| whisper | distil-large-v3.5 | 3.4s | ~8% | No (CPU) | Best whisper accuracy |

### Whisper Model Sizes

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| tiny | 39M | Fastest | Basic |
| base | 74M | Fast | Good |
| small | 244M | Medium | Better |
| distil-small.en | 166M | Medium | Better (English only) |
| distil-medium.en | 400M | Slower | Great (English only) |
| distil-large-v3.5 | 756M | Slow | Excellent |
| large-v3 | 1.5G | Slowest | Best |

## CLI Transcription Tool

For transcribing audio files directly:

```bash
transcribe recording.mp3              # English, large-v3 model
transcribe meeting.wav en medium      # English, medium model
transcribe interview.m4a es           # Spanish
```

## Dependencies

Installed in `~/faster-whisper-env/`:
- **faster-whisper** 1.2.1 — CTranslate2-based Whisper (CPU inference)
- **nemo-toolkit** 2.6.2 — NVIDIA NeMo for Parakeet (GPU inference)
- **sounddevice** — Direct audio capture via callback (zero-loss recording)
- **PyTorch nightly** (cu128) — Required for RTX 5090 (Blackwell/sm_120)

System packages:
- `wl-copy` — Wayland clipboard
- `ydotool` — Kernel-level input simulation (/dev/uinput)
- `notify-send` — Desktop notifications
- `ffmpeg` — Audio format support

## Troubleshooting

### Check the log
```bash
cat /tmp/voice-to-text.log
```

### Mic not recording (all zeros)
- Check mic isn't muted: `pactl get-source-mute @DEFAULT_SOURCE@`
- Check volume: `pactl get-source-volume @DEFAULT_SOURCE@`
- Boost volume: `pactl set-source-volume @DEFAULT_SOURCE@ 100%`
- Bluetooth headsets: YouTube/music may switch to A2DP (no mic):
  `pactl list cards | grep "Active Profile"`

### "No speech detected" on valid speech
- Whisper's VAD filter may be too aggressive for very quiet mics
- Check `/tmp/voice-to-text-last.wav` to verify audio was captured
- Parakeet doesn't use VAD — if audio has content, it will transcribe

### Paste not working
- **Regular apps**: Ctrl+Shift+V acts as "paste without formatting"
- **If nothing pastes**: text is always in clipboard, manually Ctrl+V or Ctrl+Shift+V
- ydotool needs `/dev/uinput` write access: `getfacl /dev/uinput`
- "ydotoold backend unavailable" warning is harmless (v0.1.8)

### Parakeet errors
- CUDA graph errors: Already disabled via `use_cuda_graph_decoder=False`
- lhotse errors: Patched in `~/faster-whisper-env/lib/python3.12/site-packages/lhotse/dataset/sampling/base.py`
- NeMo verbose output goes to `/tmp/voice-to-text.log`, not stdout

### Model server
```bash
# Check server status
systemctl --user status voice-transcribe-server

# Restart server (e.g., after updating model)
systemctl --user restart voice-transcribe-server

# View server log
cat /tmp/voice-transcribe-server.log

# Manual start (if systemd not available)
nohup ~/bin/voice-transcribe-server > /tmp/voice-transcribe-server.log 2>&1 &
```

### Stale recording state
```bash
pkill -f voice-recorder-daemon
rm -f /tmp/voice-to-text.pid /tmp/voice-to-text-recording.wav
```

## GNOME Keybinding Setup

```bash
# View current binding
gsettings get org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/ binding

# Change shortcut (example: Super+V)
gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/ binding '<Super>v'
```

## Hardware

Tested on:
- Ubuntu, GNOME Wayland, PipeWire
- NVIDIA GeForce RTX 5090 (31.3GB VRAM, Blackwell/sm_120)
- Bluetooth headset "Poggers" (HFP/mSBC profile)
