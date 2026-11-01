# 여행갈지도 Navigation V9 (Android WebView preview)

- Package: `site.lexid.yeohangnav` (V8 manifest와 동일)
- App version: `9.0-map-brand-preview`; target SDK 35, minimum 26
- Web app: `https://yeohang.lexid.site/#map`
- Components: bundled brand character navigation overlay (Android WebView + web), OSM/Leaflet current map, 5km place filters, Garak Market Station default, Kakao Maps external directions
- **Not yet implemented**: Kakao Maps native SDK tile rendering, Kakao Mobility in-app turn-by-turn, live traffic or voice route guidance
- **Important**: the app opens the production domain. APK bundles the V9 visual shell (CSS, JS) and injects it only into the allowlisted first-party site even before V9 web deploy. Full V9 map search/filter uses updated server JS after preview/prod deployment; the embedded fallback provides list-only keyword filtering and Kakao place/route links using the old site.
- Build: `cd android-app && gradle :app:assembleDebug`
- Debug APK: `android-app/app/build/outputs/apk/debug/app-debug.apk`.
- V8 debug APK can only be upgraded in place with the identical signing certificate. New CI debug keys differ; uninstall V8 first or sign with the original key to upgrade. Never commit signing keys.
- This preview relies on internet. Native emulated GPS tests are a separate gate. No standalone offline maps or proprietary Kakao assets bundled.
- Known security choices: no JS interface, HTTPS web mainframe, no file/content access, third-party geolocation denial, external map links opened by Android Intent.

## V9 network resilience and validation
- The Java WebView must not display its built-in DNS error page. A first-party native Korean offline/retry view is displayed, using the bundled Kakao-independent travel mascot.
- `NAV_PAGE_READY` means first-party HTML loaded. `NAV_MAP_SURFACE_READY` means the expected map DOM rendered. Neither proves active road navigation, real GPS or map tile completeness.
- A Github Actions APK build may succeed while the emulator's live-web gate fails because of DNS/HTTP/network restrictions. Inspect `web-gate.txt` and `emulator-home.png` in the CI evidence artifact.
- User-initiated retry does not grant background GPS permission. Default location remains Garak Market Station until a foreground GPS grant.
- App-to-app Kakao Maps links do not confer a license to copy the proprietary Kakao map UI, tiles or trademarks; native SDK integration is deferred until approved API keys and domain registration are available.
