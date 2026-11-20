#!/usr/bin/env bash
set -euo pipefail
OUT=android-app/artifacts/fullscreen
mkdir -p "$OUT"
adb install -r android-app/app/build/outputs/apk/debug/app-debug.apk
adb shell pm grant site.lexid.yeohangnav android.permission.ACCESS_FINE_LOCATION
adb shell settings put secure location_mode 3
adb emu geo fix 127.0276 37.4979
adb logcat -c
adb shell am start -W -n site.lexid.yeohangnav/.KakaoNavigationActivity
sleep 13

# Protect the QA from reporting a green build when Android shows a system ANR dialog.
capture_ui() {
  timeout 35 adb shell uiautomator dump /sdcard/nav_current.xml >/dev/null
  adb pull /sdcard/nav_current.xml "$OUT/current-ui.xml" >/dev/null
}
capture_ui
if grep -Eiq "Pixel Launcher isn.t responding|isn.t responding|is not responding" "$OUT/current-ui.xml"; then
  # The emulator's launcher dialog can occur during a heavy first boot. Retry once.
  adb shell input tap 290 1330
  sleep 4
  adb shell am start -W -n site.lexid.yeohangnav/.KakaoNavigationActivity
  sleep 5
  capture_ui
fi
if grep -Eiq "Pixel Launcher isn.t responding|isn.t responding|is not responding" "$OUT/current-ui.xml"; then
  echo 'EMULATOR_SYSTEM_ANR: aborting screenshot QA instead of false PASS' >&2
  exit 41
fi
adb exec-out screencap -p > "$OUT/01-native-navigation-home.png"
test -s "$OUT/01-native-navigation-home.png"

# Pixel 7 @1080px: top-left menu button after status-bar insets.
adb shell input tap 90 175
sleep 3
capture_ui
if grep -Eiq "Pixel Launcher isn.t responding|isn.t responding|is not responding" "$OUT/current-ui.xml"; then
  echo 'EMULATOR_SYSTEM_ANR_WHILE_DRAWER_OPEN' >&2
  exit 42
fi
if ! grep -q '메뉴 닫기' "$OUT/current-ui.xml"; then
  echo 'DRAWER_NOT_VISIBLE_IN_UI_AUTOMATOR' >&2
  exit 43
fi
adb exec-out screencap -p > "$OUT/02-slide-out-drawer.png"
test -s "$OUT/02-slide-out-drawer.png"
adb shell pidof site.lexid.yeohangnav > "$OUT/process.txt"
adb logcat -d > "$OUT/logcat.txt"
gradle --no-daemon -p android-app :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=site.lexid.yeohangnav.KakaoNavigationSmokeTest#defaultScreenFillsWithKakaoMapAndOpensDrawer
echo 'NATIVE_FULLSCREEN_AND_DRAWER_CAPTURED_WITHOUT_SYSTEM_ANR'
