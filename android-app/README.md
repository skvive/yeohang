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


## V11 QA branch — native full-screen Kakao navigation

- Branch: `chatgpt/nav-fullscreen-drawer-20261108` (main untouched)
- Native launcher: `KakaoNavigationActivity` (no destination required to launch).
- Real SDK map: `KNMapView` inside a `FrameLayout`, width and height both `MATCH_PARENT`. **It is not Google Maps.** No screenshot or proprietary tile imitation is bundled.
- Guidance: a floating top route-turn notice and small bottom arrival/remaining-route summary. The large top branding header and permanently visible split-pane buttons are removed.
- Sidebar: closed by default, opens from the accessible hamburger control, slides from the left and dims the map. Actions: destination search, nearby lodging, attractions/restaurants, voice mute, close. The travel catalog stays inside existing `MainActivity` and opens only when requested.
- Authentication: the shell is visible before SDK initialization; when the official SDK fails, the UI shows the actual failure rather than presenting a fake interactive map. SDK map binding is requested **only after** successful authentication.
- Privacy: foreground GPS is requested **only after a destination is selected**. No background location, no promotional alerts while driving.
- Navigation: the existing KNSDK route, position updates and voice callback implementation remains intact. It is **not** a Play-ready product until Kakao key+registered package/signing certificate, actual road routing, and device testing succeed.
- Android CI: `.github/workflows/native-nav-fullscreen-qa.yml` compiles APK, installs it on Android 35, captures native home + sidebar, and checks the drawer's visibility and map layout.
- Known unresolved gate from the previous V10 emulator run: `C103: SDK Certification Failed - INVALID_TOKEN`; verify Kakao Native app key, app package `site.lexid.yeohangnav`, and the actual signed APK's key hash in Kakao Developers. Do not claim SDK authentication success from an APK build alone.



## V12 — 한국어 음성 명령 / 여행갈지도 AI 세션 (개발 브랜치)

- 브랜치: \`feature/nav-voice-ai-session-20261108\` — 운영 \`main\`은 변경하지 않습니다.
- 네이티브 전체 화면 카카오 SDK 지도, 목적지 검색, 안내/재탐색 UI를 보존하고 오른쪽 플로팅 마이크 및 메뉴의 AI 음성 항목을 추가했습니다.
- Android \`SpeechRecognizer\`: 기기 내 한국어 인식 우선, 지원하지 않으면 외부 음성 인식 서비스 이용 동의 후 사용. 마이크 권한은 명시적 탭 후 요청하며 종료/백그라운드에서는 중지합니다. **앱 자체는 녹음된 원본 음성 파일을 저장하지 않습니다.**
- 인식 결과는 입력창에서 편집할 수 있습니다. 자동 실행하지 않고 사용자가 **명령 실행** 또는 **ChatGPT AI 질문 보내기**를 눌러야 처리합니다.
- 기기 내부 명령: 메뉴 열기/닫기, 숙소, 관광지, 목적지 검색, 음성 켜기/끄기, 안내 종료(확인 대화상자). 목적지 검색은 미확인 좌표로 길안내를 강행하지 않고 사용자의 결과 선택 단계로 이동합니다.
- **ChatGPT 연동의 범위:** OpenAI **Responses API**로 구동되는 여행갈지도 전용 AI 대화 세션입니다. ChatGPT.com / ChatGPT 앱에서 작성한 기존 개인 대화 세션을 직접 읽거나 병합하지 않습니다.
- 기존 Neon Auth 로그인 쿠키로 인증한 \`/api/nav/ai\` 서버를 통해 텍스트만 전송. API 키는 반드시 서버 환경변수 \`OPENAI_API_KEY\`에만 설정합니다. \`NAV_AI_MODEL\` 선택 가능. 단말기에는 API 키를 두지 않습니다.
- 세션 \`UUID\`를 앱 전용 로컬 설정에 보존하며, 서버는 로그인 이메일 + 세션 ID로 OpenAI \`previous_response_id\`를 보존합니다. **연결된 AI 세션 불러오기** 기능으로 동일 계정의 기존 세션을 이어받을 수 있습니다.
- 마이크 오디오/실시간 GPS 좌표는 AI 서버에 보내지 않습니다. 텍스트 질문은 사용자가 **AI 질문 보내기**를 눌렀을 때만 전송합니다. 로컬 기록은 최근 24개 텍스트 턴을 \`MODE_PRIVATE\`로 보관하며 사용자 조작으로 삭제·새 세션이 가능합니다.
- 저장소의 \`sql/010_nav_ai_sessions.sql\`을 배포 DB에 마이그레이션하고 웹 서버에 OpenAI API 키를 설정해야 실제 AI 세션 송수신이 됩니다. Android 빌드 통과만으로 AI API 사용 가능 여부를 보증하지 않습니다.
- 제한: 로그인 전 또는 서버 미배포/키 미설정 시 텍스트 기반 기기 로컬 명령은 계속 동작하지만 클라우드 답변은 동작하지 않습니다. 데모 모드 화면은 실제 카카오 지도나 길안내의 성공을 의미하지 않습니다.
- 계측 QA: \`NavVoiceCommandEngineTest\`가 한국어 10개 명령 패턴과 Android UI 진입·메뉴 열기 전환을 검사합니다.
- 음성 인식은 Android 기본 제공 기능으로 실제 기기별 인식 서비스 지원 여부와 네트워크 동의가 다를 수 있습니다.


## V12 출시 인증 게이트 (2026-11-08)

현재 확인된 증빙:
- Android 35 Pixel 7 에뮬레이터에서 음성/내비 UI 계측 테스트 2개 통과, 10화면 사전 SDK 연결 QA 통과.
- Vercel \`yeohang\` Preview에서 \`/api/nav/ai\` 서버 함수가 포함된 빌드 READY.
- 기존 Neon \`yeohang\` 프로젝트에 \`nav_ai_sessions\`, \`nav_ai_daily_usage\` 스키마 적용, 운영 데이터 삭제 없음.
- **외부 키/실기기/릴리스 서명 인증은 미검증**. CI 디버그 APK나 UI 모의 캡처는 출시 인증서가 아닙니다.

### 카카오내비 SDK C103 (INVALID_TOKEN)
1. [Kakao Developers 앱 콘솔](https://developers.kakao.com/console/app)에서 여행갈지도 앱을 선택하고, **앱 → 플랫폼 키 → 네이티브 앱 키**의 활성 상태를 확인합니다.
2. 동일한 키에 Android 패키지 **\`site.lexid.yeohangnav\`**를 등록하고, 이번 설치 APK를 서명한 인증서의 **Base64(SHA1(DER 인증서))** 값을 등록합니다. V10 CI 디버그 키는 실행마다 변경될 수 있으므로 테스트 기기별 키 해시를 안정적으로 관리하세요.
3. Play App Signing 사용 시, Play Console의 *앱 서명 인증서*로 생성한 키 해시를 별도로 등록합니다(업로드용 keystore 인증서 해시와 다를 수 있음).
4. GitHub 저장소 Secrets에 동일한 네이티브 앱 키 **\`KAKAO_MOBILITY_APP_KEY\`**를 등록해야 KNSDK 릴리스 후보에 포함됩니다. *웹 JavaScript / REST API 키를 대용하지 마세요.*
5. KNSDK 초기화 로그의 \`KNError.code\`와 \`KNError.msg\`를 실기기에서 검사합니다. \`C103 - INVALID_TOKEN\`이 남으면 앱 키/패키지/실제 서명 해시를 재확인하고 Kakao Mobility SDK 기술 지원에 앱 등록 상태를 문의합니다. 키 값은 GitHub Issue/로그에 공개하지 않습니다.
6. \`KNMapView\` 실지도, 출발지/도착지 경로 요청, 경로 재탐색, 주행 안내 음성, GPS 포그라운드 권한을 실제 스마트폰에서 검증한 뒤 출시 승인합니다.

공식 문서: https://developers.kakaomobility.com/guide/android-ui/start.html · https://developers.kakaomobility.com/guide/android-ui/solution.html

### Android 안정적인 서명 및 CI 출시 후보
GitHub Secrets에 다음 항목을 생성합니다.
- \`KAKAO_MOBILITY_APP_KEY\`: 위에서 검증한 **동일 네이티브 앱 키**
- \`NAV_RELEASE_KEYSTORE_BASE64\`: 기존 고정된 릴리스 keystore의 Base64 인코딩 문자열(프로젝트에 체크인 금지)
- \`NAV_RELEASE_STORE_PASSWORD\`: keystore 비밀번호
- \`NAV_RELEASE_KEY_ALIAS\`: 서명 키 alias
- \`NAV_RELEASE_KEY_PASSWORD\`: alias 키 비밀번호

그다음 GitHub Actions → **NAV AI Voice Command Android + Web Contracts** → **Run workflow** → \`release_candidate=true\`를 실행합니다. 출력에는 비밀키를 기록하지 않고 \`apksigner verify\`와 공개 인증서 키 해시만 표시합니다. 고정 서명 키가 없거나 네이티브 앱 키가 없으면 \`RELEASE_BLOCKED\`로 **실패 처리**됩니다. Android \`versionCode=12\`이며, 서명이 다른 이전 Debug APK와 인플레이스 업데이트할 수 없습니다.

### OpenAI Responses API / 세션 인증
- [OpenAI API Keys](https://platform.openai.com/api-keys)에서 프로젝트용 키를 발급합니다. 키는 **서버 전용**입니다.
- [Vercel \`yeohang\` 환경변수](https://vercel.com/shinkang888-codes-projects/yeohang/settings/environment-variables)에 \`OPENAI_API_KEY\`를 Preview/Production 범위에 등록한 후 **재배포**합니다. 릴리스용 앱에 API 키를 넣지 않습니다.
- Neon Auth 로그인을 완료한 뒤, 인증 없는 \`GET /api/nav/ai\`와 \`POST /api/nav/ai\`는 401이어야 합니다. 유효한 사용자 로그인으로 세션 생성·다시 불러오기·다른 사용자 세션 접근 거부를 실제 호출로 테스트합니다.
- 로그인 계정의 **여행갈지도 전용** AI 세션을 연결합니다. 사용자의 ChatGPT 앱 기존 개인 대화를 API로 열람·합치는 기능은 제공하지 않습니다.
- \`previous_response_id\` 기반 응답 연결은 무기한 보존이 아닙니다. 오래된 응답을 잇는 경우 서버 측 갱신/기록 보존 정책 검토가 필요합니다.

### 실기기 출고 검수
실제 Android 휴대폰에서 마이크 on-device 인식 지원 여부, 온라인 서비스 동의/취소, 접근성, 마이크 OFF 상태, 네트워크 종료, 백그라운드 중지, GPS on/off, 실제 차량 목적지 안내, 잠금 화면 및 차 내 음성을 차례로 검증합니다. 담당자 확인 없는 실차 주행 테스트·인증 없이 Play Store 제출을 자동으로 완료로 판단하지 않습니다.
