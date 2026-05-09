#!/usr/bin/env bash
# Wrapper around `maestro test` that handles the Android-specific bootstrap
# Maestro 1.41 doesn't do automatically:
#   1. ensures ANDROID_HOME / PATH are set so adb is callable
#   2. confirms an emulator is connected
#   3. installs the Maestro driver APK + test APK if missing (extracts
#      from ~/.maestro/maestro/lib/maestro-client-1.41.0.jar)
#   4. sets up `adb forward tcp:7001`
#   5. starts the driver instrumentation in the background if no driver
#      process is on the device yet
#   6. exec's `maestro test "$@"`
#
# Usage:
#   maestro/run.sh maestro/flows/00-launch.yaml
#   maestro/run.sh maestro/flows/                     # all flows
#   maestro/run.sh maestro/flows/00-launch.yaml --debug-output debug
#
# Once Maestro 2.x ships a working Android auto-bootstrap (or we drop to a
# version that already does), this wrapper collapses to
# `exec maestro test "$@"` and can be deleted.
#
# NOT included: keyboard helpers. Flows can't type on the Android
# emulator (Gboard stalls `inputText`). Auth uses the dev-only
# "Dev sign-in" button instead — see .claude/rules/e2e.md.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# 1. ANDROID_HOME — Maestro silently fails without adb on the path.
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$HOME/.maestro/bin"

if ! command -v adb >/dev/null 2>&1; then
  echo "::error::adb not found. Install Android SDK Platform Tools or set ANDROID_HOME." >&2
  exit 1
fi

if ! command -v maestro >/dev/null 2>&1; then
  echo "::error::maestro not found on PATH (looked in ~/.maestro/bin). Install via 'curl -Ls https://get.maestro.mobile.dev | bash'." >&2
  exit 1
fi

# 2. Emulator/device connected?
if ! adb devices | grep -qE '^(emulator|[0-9A-Za-z]+).*\sdevice$'; then
  echo "::error::No Android device or emulator detected via adb." >&2
  echo "Start one with: emulator -avd <AVD_NAME> -camera-back virtualscene" >&2
  exit 1
fi

# 3. Driver APKs installed?
need_install=0
adb shell pm list packages | grep -q '^package:dev.mobile.maestro$' || need_install=1
adb shell pm list packages | grep -q '^package:dev.mobile.maestro.test$' || need_install=1

if [[ $need_install -eq 1 ]]; then
  echo "[maestro/run] driver not installed; extracting from maestro-client.jar"
  jar="$HOME/.maestro/maestro/lib/maestro-client-1.41.0.jar"
  if [[ ! -f "$jar" ]]; then
    jar=$(find "$HOME/.maestro" -name 'maestro-client*.jar' 2>/dev/null | head -1)
  fi
  if [[ -z "${jar:-}" ]] || [[ ! -f "$jar" ]]; then
    echo "::error::Couldn't find maestro-client*.jar in ~/.maestro/" >&2
    exit 1
  fi
  tmp="$(mktemp -d)"
  unzip -o "$jar" 'maestro-app.apk' 'maestro-server.apk' -d "$tmp" >/dev/null
  adb install -r "$tmp/maestro-app.apk" >/dev/null
  adb install -r "$tmp/maestro-server.apk" >/dev/null
  rm -rf "$tmp"
  echo "[maestro/run] driver installed"
fi

# 4. Port forward (idempotent — adb replaces an existing forward of the
# same port).
adb forward tcp:7001 tcp:7001 >/dev/null

# 5. Instrumentation running? Check the device-side process — adb forward
# always makes localhost:7001 accept TCP even when no listener exists on
# the device, so a host-side TCP probe is a false positive.
if ! adb shell pidof dev.mobile.maestro >/dev/null 2>&1; then
  echo "[maestro/run] starting driver instrumentation"
  nohup adb shell am instrument -w -r \
    -e debug false \
    dev.mobile.maestro.test/androidx.test.runner.AndroidJUnitRunner \
    >/tmp/maestro-instrument.log 2>&1 &
  for _ in $(seq 1 20); do
    sleep 1
    if adb shell pidof dev.mobile.maestro >/dev/null 2>&1; then
      break
    fi
  done
  if ! adb shell pidof dev.mobile.maestro >/dev/null 2>&1; then
    echo "::error::driver process didn't come up in 20s" >&2
    echo "  see /tmp/maestro-instrument.log for details" >&2
    exit 1
  fi
  sleep 2
fi

exec maestro test "$@"
