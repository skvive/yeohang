#!/usr/bin/env bash
set -euo pipefail
artifacts=android-app/artifacts
mkdir -p "$artifacts"
test -s "$artifacts/process.txt"
test -s "$artifacts/emulator-home.png"
test -s "$artifacts/logcat.txt"
if grep -q 'NAV_MAP_SURFACE_READY' "$artifacts/logcat.txt"; then
  printf '%s\n' 'map_surface_rendered' > "$artifacts/web-gate.txt"
  printf '%s\n' 'Android WebView rendered the first-party map controls' >> "$GITHUB_STEP_SUMMARY"
elif grep -Eq 'NAV_PAGE_FAILED|NAV_HTTP_ERROR|NAV_TLS_ERROR' "$artifacts/logcat.txt"; then
  printf '%s\n' 'network_or_http_blocked' > "$artifacts/web-gate.txt"
  printf '%s\n' 'Android app installed and native retry UI loaded; live map content blocked by DNS/network/HTTP in emulator' >> "$GITHUB_STEP_SUMMARY"
  exit 22
else
  printf '%s\n' 'map_surface_unverified' > "$artifacts/web-gate.txt"
  printf '%s\n' 'Android process alive but map HTML controls were not proven rendered' >> "$GITHUB_STEP_SUMMARY"
  exit 23
fi
