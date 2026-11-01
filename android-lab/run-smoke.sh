#!/usr/bin/env bash
set -euo pipefail
out="test-results/android-emulator"
mkdir -p "$out"
adb devices -l | tee "$out/devices.txt"
test "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1
adb shell getprop ro.build.version.release | tee "$out/os-version.txt"
adb shell getprop ro.build.version.sdk | tee "$out/api-level.txt"
adb shell wm size | tee "$out/display.txt"
adb shell input keyevent KEYCODE_HOME
sleep 2
adb exec-out screencap -p > "$out/boot-screen.png"
test -s "$out/boot-screen.png"
target=""
package=""
activity=""
if [ -f android-app/app/build/outputs/apk/mapsLink/debug/app-mapsLink-debug.apk ]; then
  target="android-app/app/build/outputs/apk/mapsLink/debug/app-mapsLink-debug.apk"
  package="site.lexid.yeohangnav"
  activity="site.lexid.yeohangnav/.MainActivity"
  echo "REAL_V8_APPLICATION" | tee "$out/build-identity.txt"
elif [ -f android-lab/smoke/app/build/outputs/apk/debug/app-debug.apk ]; then
  target="android-lab/smoke/app/build/outputs/apk/debug/app-debug.apk"
  package="site.lexid.yeohanglab"
  activity="site.lexid.yeohanglab/.MainActivity"
  echo "ENVIRONMENT_SMOKE_ONLY_NOT_V8" | tee "$out/build-identity.txt"
else
  echo "NO_APK_AVAILABLE" | tee "$out/build-identity.txt"
  exit 2
fi
adb install -r "$target" | tee "$out/adb-install.txt"
adb shell pm path "$package" | tee "$out/package-installed.txt"
adb shell am start -n "$activity" | tee "$out/launch.txt"
sleep 5
adb exec-out screencap -p > "$out/app-screen.png"
test -s "$out/app-screen.png"
adb shell pidof "$package" | tee "$out/process-id.txt"
adb logcat -d -s AndroidRuntime:E > "$out/android-runtime-errors.txt"
if grep -q 'FATAL EXCEPTION' "$out/android-runtime-errors.txt"; then
  echo "AndroidRuntime fatal exception detected"
  exit 1
fi
echo "EMULATOR_BOOT_OK APK_INSTALL_OK APP_LAUNCH_OK SCREENSHOT_OK" | tee "$out/status.txt"
