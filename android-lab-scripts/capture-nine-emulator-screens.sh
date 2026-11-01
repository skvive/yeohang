set -euo pipefail
mkdir -p android-lab-results
APK=android-app/app/build/outputs/apk/mapsLink/debug/app-mapsLink-debug.apk
PKG=site.lexid.yeohangnav
adb install -r "$APK" | tee android-lab-results/install.txt
adb shell pm path "$PKG" | tee android-lab-results/package_path.txt
adb shell am start -W -n "$PKG/.MainActivity" | tee android-lab-results/home_launch.txt
sleep 9
adb exec-out screencap -p > android-lab-results/01-home.png
for entry in 'all:02-all-stays' 'hotel:03-hotels-only' 'motel:04-motels-only' 'private:05-private-houses-only' 'pension:06-pension-only' 'guesthouse:07-guesthouses-only' 'camping:08-camping-only'; do
  CAT="${entry%%:*}"
  NAME="${entry#*:}"
  adb shell am force-stop "$PKG"
  adb shell am start -W -n "$PKG/.NearbyMapActivity" --es category "$CAT" | tee "android-lab-results/${NAME}-launch.txt"
  sleep 8
  adb exec-out screencap -p > "android-lab-results/${NAME}.png"
  test -s "android-lab-results/${NAME}.png"
done
adb shell pm grant "$PKG" android.permission.ACCESS_FINE_LOCATION
adb emu geo fix 127.118060 37.493060 || true
adb shell am force-stop "$PKG"
adb shell am start -W -n "$PKG/.NearbyMapActivity" --es category motel --ez gpsApproved true --ed lat 37.493060 --ed lng 127.118060 | tee android-lab-results/09-gps-launch.txt
sleep 9
adb exec-out screencap -p > android-lab-results/09-gps-motels.png
adb shell pidof "$PKG" | tee android-lab-results/process.txt
adb logcat -d -t 2000 > android-lab-results/logcat.txt
if grep -A 8 'FATAL EXCEPTION' android-lab-results/logcat.txt | grep -q "$PKG"; then
  echo 'FATAL EXCEPTION found'; exit 1
fi
test "$(find android-lab-results -maxdepth 1 -name '*.png' | wc -l)" -ge 9
file android-lab-results/*.png
