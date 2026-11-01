#!/usr/bin/env bash
set -euo pipefail
PKG=site.lexid.yeohangnav
APK=qa/android-v8-screenshots/app-mapsLink-debug.apk
mkdir -p home-diagnostic
adb wait-for-device
adb install -r "$APK" | tee home-diagnostic/install.txt
adb shell am force-stop "$PKG" || true
adb shell am start -W -n "$PKG/.MainActivity" | tee home-diagnostic/launch.txt
for T in 15 35 55; do
  if [ "$T" -eq 15 ];then sleep 15;else sleep 20;fi
  adb exec-out screencap -p > "home-diagnostic/home-${T}s.png"
  adb shell uiautomator dump /sdcard/home-dump.xml >/dev/null 2>&1 || true
  adb shell cat /sdcard/home-dump.xml > "home-diagnostic/home-${T}s-ui.xml" || true
  adb shell dumpsys activity top | tail -100 > "home-diagnostic/home-${T}s-activity.txt" || true
done
adb logcat -d -t 10000 > home-diagnostic/logcat.txt
adb shell pidof "$PKG" > home-diagnostic/process.txt || true
test -s home-diagnostic/home-55s.png
