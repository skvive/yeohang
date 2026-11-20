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

# Read the *actual accessible bounds*, rather than guessing screen coordinates.
# A hardcoded tap landed above the menu on Android 35 and falsely failed QA.
menu_coords="$(python3 - "$OUT/current-ui.xml" <<'PY'
import re, sys, xml.etree.ElementTree as ET
root = ET.parse(sys.argv[1]).getroot()
for node in root.iter('node'):
    if node.attrib.get('content-desc') != '메뉴 열기': continue
    if node.attrib.get('clickable') != 'true': continue
    match = re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', node.attrib.get('bounds',''))
    if not match: continue
    left, top, right, bottom = map(int, match.groups())
    if right <= left or bottom <= top: continue
    print((left + right)//2, (top + bottom)//2)
    break
else:
    sys.exit('ACCESSIBLE_MENU_NOT_FOUND: cannot safely simulate a tap')
PY
)"
read -r menu_x menu_y <<< "$menu_coords"
adb shell input tap "$menu_x" "$menu_y"
sleep 4
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
