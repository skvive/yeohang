#!/usr/bin/env bash
set -euo pipefail
DIR=android-app/artifacts/navigation-ten-state
mkdir -p "$DIR"
PKG=site.lexid.yeohangnav
APK=android-app/app/build/outputs/apk/debug/app-debug.apk
test -s "$APK"
adb wait-for-device
adb install -r "$APK"
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
adb logcat -c
for n in $(seq 1 10); do
  i=$(printf '%02d' "$n")
  case "$n" in
    1) name=map-standby;;
    2) name=navigation-drawer;;
    3) name=destination-search;;
    4) name=nearby-lodging;;
    5) name=attractions-restaurants;;
    6) name=destination-detail;;
    7) name=route-preview;;
    8) name=guidance-turn;;
    9) name=reroute-alert;;
    10) name=voice-muted;;
  esac
  file="$DIR/$i-$name.png"
  echo "::group::Scenario $i $name"
  adb shell am force-stop "$PKG" || true
  adb shell am start -W -n "$PKG/.KakaoNavigationActivity" --ei nav_qa_screen "$n"
  sleep 4
  timeout 40s adb shell uiautomator dump /sdcard/qa-ten-state.xml >/dev/null
  adb pull /sdcard/qa-ten-state.xml "$DIR/$i.xml" >/dev/null
  if grep -Eiq 'isn.t responding|is not responding|system ui is not responding' "$DIR/$i.xml"; then
     echo "FAILED: emulator ANR in scenario $i" >&2
     exit 41
  fi
  if ! grep -q 'QA 장면' "$DIR/$i.xml"; then
     echo "FAILED: missing QA marker in scenario $i" >&2
     sed -n '1,8p' "$DIR/$i.xml" >&2
     exit 42
  fi
  adb exec-out screencap -p > "$file"
  test "$(wc -c < "$file")" -gt 10000
  echo "::endgroup::"
done
adb logcat -d > "$DIR/logcat.txt"
adb shell dumpsys package "$PKG" | grep -E 'versionName|versionCode' > "$DIR/android-version.txt" || true
python3 - <<'PY'
import pathlib,struct,hashlib,json
p=pathlib.Path('android-app/artifacts/navigation-ten-state')
files=sorted(p.glob('[0-9][0-9]-*.png'))
assert len(files)==10, f'expected 10 got {len(files)}'
shas={}
for f in files:
    data=f.read_bytes()
    assert data[:8]==b'\x89PNG\r\n\x1a\n', f
    w,h=struct.unpack('>II',data[16:24])
    assert w>=300 and h>=550, (f,w,h)
    shas[f.name]=hashlib.sha256(data).hexdigest()
assert len(set(shas.values()))==10, 'screenshots must be distinct captures'
report={'mode':'DEBUG_ONLY_SIMULATED_NAVIGATION','sdk_auth_verified':False,'sdk_route_verified':False,'emulator_screenshots':len(files),'unique_files':10,'sha256':shas,'contracts':['production KNMapView full-screen structure','shared native drawer and guidance fields','destination selection to detail action','local illustrative route, not Kakao map data']}
(p/'qa-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('TEN_DISTINCT_REAL_EMULATOR_CAPTURES_PASS')
PY
gradle --no-daemon -p android-app :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=site.lexid.yeohangnav.NavigationQaTenStatesTest
