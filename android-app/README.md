# 여행갈지도 Navigation V10 (Android WebView + Kakao Navi preview)

- Package: `site.lexid.yeohangnav` (V8 manifest와 동일)
- App version: `10.0-kakao-navigation-preview`; target SDK 35, minimum 26
- Web app: `https://yeohang.lexid.site/#map`
- Components: branded Android WebView shell, 5km stay search, Kakao Mobility in-app route guidance screen with a 여행갈지도 title bar
- The web page sends a selected stay's WGS84 destination to the native Activity using the app-only `yeohangnav:` scheme. The native screen obtains a fresh foreground location, converts both points to KATEC with KNSDK, requests a route, then starts guidance.
- **Important**: the app opens the production domain. APK bundles the V9 visual shell (CSS, JS) and injects it only into the allowlisted first-party site even before V9 web deploy. Full V9 map search/filter uses updated server JS after web deployment. In native mode, selecting a stay starts the in-app navigation Activity; outside the APK, the web app keeps its Kakao Maps route link.
- Build: `cd android-app && gradle :app:assembleDebug`
- Kakao Mobility SDK: `com.kakaomobility.knsdk:knsdk_ui:1.12.8-hotfix05` from the official Maven repository. The published artifact supplies the modular `KNSDK`, `KNMapView`, and `KNGuidance` APIs used here; the app does not render `KNNaviView`.
- Set `kakaoMobilityAppKey=<Native app key>` in the ignored `android-app/local.properties`, or use `KAKAO_MOBILITY_APP_KEY` in the build environment. Do not commit the key. Register Android package `site.lexid.yeohangnav` and the debug/release signing key hashes in the matching Kakao Developers app before SDK authentication.
- Debug APK: `android-app/app/build/outputs/apk/debug/app-debug.apk`.
- V8 debug APK can only be upgraded in place with the identical signing certificate. New CI debug keys differ; uninstall V8 first or sign with the original key to upgrade. Never commit signing keys.
- This preview relies on internet. SDK authentication, native key-hash registration, APK build, emulator GPS, and real-device road guidance are separate verification gates. No standalone offline maps or proprietary Kakao assets bundled.
- The navigation screen composes Kakao's `KNMapView` with app-owned 여행갈지도 header, turn card, remaining route/ETA summary, and controls. `KNSDK` calculates routes and `KNGuidance` supplies guidance callbacks; voice data is played by the app. No promotional overlay or ad interaction appears during guidance. After arrival or an explicit stop, the native benefits screen links to tourism, lodging, and restaurant discovery and fetches only currently valid, partner-approved accommodation coupons from `/api/coupons`; unavailable coupons are stated as unavailable. Restaurant discovery opens Kakao Map. Kakao's official Android setup documents the `knsdk_ui` Maven artifact and separately exposes the lower-level map and guidance APIs ([setup](https://developers.kakaomobility.com/guide/android/start.html), [KNMapView](https://developers.kakaomobility.com/reference/android-ref-kotlin/class-KNMapView.html), [KNGuidance](https://developers.kakaomobility.com/reference/android-ref-kotlin/class-KNGuidance.html)). SDK authentication, live GPS, voice playback, and road guidance still require device verification. Known security choices: no JavaScript interface, HTTPS first-party mainframe, no file/content access, third-party geolocation denial; route requests use only the internal app scheme.

## V9 network resilience and validation
- The Java WebView must not display its built-in DNS error page. A first-party native Korean offline/retry view is displayed, using the bundled Kakao-independent travel mascot.
- `NAV_PAGE_READY` means first-party HTML loaded. `NAV_MAP_SURFACE_READY` means the expected map DOM rendered. Neither proves active road navigation, real GPS or map tile completeness.
- A Github Actions APK build may succeed while the emulator's live-web gate fails because of DNS/HTTP/network restrictions. Inspect `web-gate.txt` and `emulator-home.png` in the CI evidence artifact.
- User-initiated retry does not grant background GPS permission. Default location remains Garak Market Station until a foreground GPS grant.
- App-to-app Kakao Maps links do not confer a license to copy proprietary Kakao map UI, tiles or trademarks. The native SDK uses Kakao's supplied guidance view; the app brands its own header around it.
