Run the Hoot verification protocol after a code change.

## Steps
1. Check the server is running: `systemctl --user status hoot-server`
2. If server is down, start it and wait 10s for model load
3. Check GPU: `nvidia-smi` (verify CUDA is available)
4. Check mic is unmuted: `pactl get-source-mute @DEFAULT_SOURCE@`
5. Show recent log entries: `tail -20 ~/voice-to-text/logs/$(date +%Y-%m-%d).log`
6. If server code was changed, remind user to restart: `systemctl --user restart hoot-server`
7. Report status summary — ready to test or what needs fixing

Do NOT run `~/bin/hoot` directly — the user triggers that manually with Ctrl+Space.
