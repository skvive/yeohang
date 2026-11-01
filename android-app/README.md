# 여행갈지도 Navigation V9 (Android WebView preview)

- Package: `site.lexid.yeohangnav` (V8 manifest와 동일)
- App version: `9.0-map-brand-preview`; target SDK 35, minimum 26
- Web app: `https://yeohang.lexid.site/#map`
- Components: brand character navigation UI (web), OSM/Leaflet current map, 5km place filters, Garak Market Station default, Kakao Maps external directions
- **Not yet implemented**: Kakao Maps native SDK tile rendering, Kakao Mobility in-app turn-by-turn, live traffic or voice route guidance
- **Important**: the app opens the production domain. The branch's V9 web design must first be preview-tested and deployed to that domain before the V9 design appears in the APK. Until then, the app shows production's existing UI.
- Build: `cd android-app && gradle :app:assembleDebug`
- Debug APK: `android-app/app/build/outputs/apk/debug/app-debug.apk`.
- V8 debug APK can only be upgraded in place with the identical signing certificate. New CI debug keys differ; uninstall V8 first or sign with the original key to upgrade. Never commit signing keys.
- This preview relies on internet. Native emulated GPS tests are a separate gate. No standalone offline maps or proprietary Kakao assets bundled.
- Known security choices: no JS interface, HTTPS web mainframe, no file/content access, third-party geolocation denial, external map links opened by Android Intent.
