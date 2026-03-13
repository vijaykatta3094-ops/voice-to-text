Check Hoot logs for errors or patterns.

## Steps
1. Show today's persistent log: `tail -50 ~/voice-to-text/logs/$(date +%Y-%m-%d).log`
2. Show server log: `tail -30 /tmp/hoot-server.log`
3. Check systemd service status: `systemctl --user status hoot-server`
4. Look for ERROR, WARNING, traceback, or timeout patterns
5. Cross-reference any issues with `~/voice-to-text/BUGS.md` — check if it's a known bug
6. Summarize: healthy or what's wrong
