# System Requirements

## Minimum Requirements

| Component | Requirement |
|-----------|------------|
| OS | Linux with PipeWire audio (Ubuntu 22.04+, Fedora 38+) |
| Desktop | GNOME Wayland (tested), KDE Wayland (untested) |
| Python | 3.10+ (3.12 tested) |
| RAM | 4GB system RAM |
| GPU | NVIDIA with CUDA (for Parakeet engine) OR CPU-only (Whisper fallback) |

## GPU Requirements by Engine

### Parakeet TDT 0.6B v3 (default, fastest)
- NVIDIA GPU required
- 2GB+ VRAM (model uses ~1.7GB loaded)
- CUDA 12.x

**RTX 5090 (Blackwell/sm_120) specific:**
- Requires PyTorch nightly cu128 (standard PyTorch doesn't support sm_120 yet)
- Must disable CUDA graph decoder: `use_cuda_graph_decoder=False`
- See `docs/SETUP_RTX5090.md` for instructions

**Other NVIDIA GPUs (Ampere/Ada/Hopper — RTX 3000/4000/H100 etc.):**
- Standard `pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124`
- No special flags needed

### Whisper (CPU fallback)
- No GPU required
- CPU-only, int8 quantized
- ~5-15s per transcription (vs ~0.2s with Parakeet GPU)
- Works on any x86_64 or ARM64 machine

## Audio Requirements

### Microphone
- Any PipeWire-compatible microphone
- Built-in laptop mic: works, reliable
- Bluetooth headset (HFP/mSBC): works, has known BT reliability issues (see BUGS.md BUG-005)
- USB mic: works, most reliable option

### Audio System
- PipeWire (recommended) — Ubuntu 22.04+, Fedora 35+ default
- PulseAudio: untested but likely works with minor changes
- ALSA-only: not supported

## Software Dependencies

### System packages
```
ydotool       # synthetic keyboard input (paste) — requires /dev/uinput access
wl-clipboard  # clipboard (wl-copy / wl-paste)
pactl         # audio control (part of pulseaudio-utils)
notify-send   # desktop notifications (part of libnotify-bin)
```

### Python packages (in venv)
```
sounddevice   # audio capture
nemo-toolkit  # Parakeet ASR model
faster-whisper # Whisper fallback
torch         # CUDA or CPU
```

## Disk Space
- Python venv + models: ~8GB
  - Parakeet TDT 0.6B v3: ~2.5GB
  - faster-whisper base: ~150MB
  - PyTorch + CUDA libraries: ~4GB

## Known Unsupported Configurations
- X11 (xorg): paste mechanism needs change (use `xdotool key ctrl+v` instead of ydotool)
- macOS: not supported (PipeWire-specific, GNOME-specific)
- Windows: not supported
- ARM/Apple Silicon: untested
