Deploy Hoot changes from source to live binaries.

## Steps
1. Show diff between `~/voice-to-text/src/` and `~/bin/` for each hoot file (hoot, hoot-recorder, hoot-engine, hoot-server, hoot-transcribe)
2. Ask user to confirm deployment
3. Copy changed files: `cp ~/voice-to-text/src/<file> ~/bin/<file> && chmod +x ~/bin/<file>`
4. If hoot-server was changed: `systemctl --user restart hoot-server` and wait for it to come up
5. Run `/test-hoot` to verify everything is healthy
6. Update CHANGELOG.md if appropriate
