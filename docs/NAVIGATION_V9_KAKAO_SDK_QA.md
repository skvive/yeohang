# 여행갈지도 Navigation V10: 카카오내비 인앱 길안내 게이트

## 확정된 사실
- 현재 기본 지도: Leaflet + OpenStreetMap (운영 타일 사용 조건은 별도 확인)
- V9 선택형 엔진: `public/map-kakao-provider.js`, `public/map-kakao-provider.css`
- 조건: `NEXT_PUBLIC_KAKAO_MAP_JS_KEY` (유효한 키 형식), 카카오 개발자 앱 등록, JavaScript SDK 도메인 등록
- 지도 표시 방식: 카카오 지도 SDK를 불러올 수 있으면 배경 지도와 핀 표시, SDK 로딩이 불가능하면 기존 Leaflet
- 공식 카카오맵 UI/브랜드의 화면 캡처·에셋·소스를 복사하거나 내장하지 않음. 기존 여행갈지도 김별/길별이/머무리 브랜드 디자인 유지
- 현재 카카오맵 JS 키 없음(2026-11-02 Vercel 변수명 조회 기준). 따라서 카카오 SDK 실제 지도 노출은 **미검증**.

## 설정
1. Kakao Developers에서 애플리케이션을 생성하고 JavaScript 키 발급.
2. 앱 설정에서 웹 플랫폼 도메인 `https://yeohang.lexid.site` 등록. 미리보기 도메인도 사용할 경우 해당 도메인 등록.
3. Vercel 프로젝트 `yeohang` 환경변수에 `NEXT_PUBLIC_KAKAO_MAP_JS_KEY` 설정 (키는 웹에 노출되는 공개용 JavaScript 키, 서버 비밀키를 넣지 말 것).
4. 개발 브랜치 Preview를 배포하고 지도 · 숙소 필터 · 5km · 가락시장역 대체 위치 · GPS 권한 · 모바일 팝업을 테스트.
5. 지도 공급자 라이선스/서비스 약관/쿼터 검토 후 운영 전환. 운영 DB 마이그레이션·시딩은 UI 배포와 분리.
6. 서버 검색 API `/api/map`은 그대로 사용하므로 해당 API 데이터가 잘못되거나 비어 있으면 지도 SDK가 떠도 핀이 없을 수 있음.

## Android 인앱 길안내
- 앱은 `site.lexid.yeohangnav` WebView를 유지하고, 선택 숙소의 이름·WGS84 좌표를 전용 `yeohangnav:` scheme으로 네이티브 Activity에 전달한다.
- 네이티브 Activity가 전경 위치 권한을 확인하고 새 GPS 위치를 받아 KNSDK로 양쪽 좌표를 KATEC으로 변환한 뒤 경로 요청과 음성 안내를 시작한다. 임의 기본 출발지는 사용하지 않는다.
- SDK는 `knsdk_ui:1.12.8-hotfix05`; 화면 상단 여행갈지도 브랜드 바를 두고 SDK 길안내 뷰를 내장한다. Kakao SDK 내부 구성 요소 전체를 임의 재브랜딩하는 구현은 아니다.
- 네이티브 앱 키는 `android-app/local.properties`의 `kakaoMobilityAppKey` 또는 빌드 환경변수 `KAKAO_MOBILITY_APP_KEY`로만 주입하며 git에 포함하지 않는다.
- SDK 실인증은 Kakao Developers 앱에 Android package `site.lexid.yeohangnav`와 해당 서명 키 해시가 등록된 뒤 검증한다. 현재 키/해시 등록 상태는 아직 확인하지 않았다.

## QA 판정
- `built`: `gradle :app:assembleDebug` 성공
- `installed-on-emulator`: APK 설치, Activity/프로세스 실제 시작
- `web-view-loaded`: `NAV_PAGE_READY`
- `map-ui-loaded`: `NAV_MAP_SURFACE_READY`
- `sdk-kakao-loaded`: 네이티브 앱 키와 패키지·키 해시를 확인한 SDK 인증 성공 후 검증
- `live-route-test`: GPS·음성·재탐색은 에뮬레이터와 실기기에서 각각 검증 필요
- `signed-release` / `play-store-submitted`: 진행하지 않음

## 근거
- https://apis.map.kakao.com/web/guide/
- https://apis.map.kakao.com/web/sample/markerWithCustomOverlay/
- https://developers.kakaomobility.com/product/navisdk.html

운영 `main`은 독립된 QA 브랜치의 검수 완료 전까지 보호한다.
