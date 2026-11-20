# 여행갈지도 공식 카카오내비 운영·검증 기준 (2026-11-20)

## 범위 구분 (기능과 검증 사실을 혼동하지 말 것)

| 동작 | 구현 | 실제 검증 게이트 |
| --- | --- | --- |
| Web GPS 차량 중심/진행 방향 표시 | `public/map-multipin.js` (Leaflet, OSM 탐색 지도) | Chrome GPS 모의 이동·방향, 390px/1440px, 권한 거부 |
| Web 목적지 검색 및 좌표 확인 | `public/app.js`의 숙소/카카오 장소 검색 및 확인 | 동명이소·미검색·SDK 누락 테스트 |
| Kakao Mobility 경로 **미리보기** | `app/api/navigation/route/route.ts` (서버 REST, `summary=true`) | 좌표 검증, 실키 API 200/실패 검사, ETA 원천 표시 |
| Android 웹에서 네이티브 화면 이동 | `yeohangnav://navigate?name=...&lat=...&lng=...` | WebView first-party 허용 목록 + Android 에뮬레이터 |
| Android **실제 인앱 주행 안내** | 기존 KNSDK Android `KakaoNavigationActivity` 재사용 | Kakao 등록·KNSDK 실제 인증·GPS·경로·음성·재탐색 실기기 |
| 일반 모바일 Web 카카오내비 실행 | Kakao JavaScript SDK `Kakao.Navi.start` | 공식 JS 키/SDK 도메인, 앱 설치·미설치 Android/iOS 기기 |
| PC 또는 SDK 미설정 | 카카오맵 웹 경로 확인 | 링크 목적지/좌표 유지, 카카오내비 동작으로 오표시 금지 |

카카오 JavaScript SDK는 **웹 안에서 턴바이턴 길안내를 제공하지 않고** 네이티브 카카오내비 앱을 호출한다. 웹 지도의 임의 차량 움직임·주행 시연은 공식 경로가 아니며 ETA/음성/재탐색 근거로 사용하면 안 된다.

공식 문서:
- https://developers.kakao.com/docs/ko/kakaonavi/js
- https://developers.kakao.com/docs/ko/javascript/getting-started
- https://developers.kakaomobility.com/guide/navi-api/directions
- https://developers.kakaomobility.com/guide/android/start.html

## 기존 원본 재사용 (삭제·덮어쓰기 금지)

- 웹: `public/app.js`, `public/geo.js`, `public/map-multipin.js`, `tests/map-mobile.e2e.mjs` 보존·추가 구현
- Android: `chatgpt/nav-fullscreen-drawer-20261108`의 기존 `android-app/` 원본 12개 파일 및 필요한 번들 웹 자산을 Git blob SHA로 복원
- Android KNSDK 의존성: `com.kakaomobility.knsdk:knsdk_ui:1.12.8-hotfix05`
- 내부 자료: Drive `ChatGPT_Library`, `렉시드개발자료/공통개발스킬`, `YEOHAENG_내비` 폴더 권한 및 파일 확인
- 주의: 과거 Android QA 성공은 **지금 운영용 Kakao 앱키·서명키 해시 인증**을 입증하지 않는다. 과거 인증 오류 `C103 INVALID_TOKEN` 기록 존재.

## 현재 인증 적용 환경 확인

Vercel `yeohang`에서 2026-11-20 기준 변수명과 대상 환경만 확인 (실제 비밀 키 값은 공개하지 않음):

- `NEXT_PUBLIC_KAKAO_MAP_JS_KEY`: Preview 등록, Production 미등록
- `KAKAO_REST_API_KEY`: Preview 등록, Production 미등록
- `KAKAO_MOBILITY_APP_KEY`: Android 빌드용; CI secret의 존재/유효성 및 카카오 등록 상태 별도 확인 필요

Production에 임의 키를 복사하지 않는다. 우선 카카오디벨로퍼스의 등록 앱, JS SDK 승인 도메인 `https://yeohang.lexid.site`, Android `site.lexid.yeohangnav` 패키지와 서명 키 해시, 요금/쿼터/약관을 확인해야 한다.

## REST 경로 미리보기 계약

`GET /api/navigation/route?origin=<lng,lat>&destination=<lng,lat>&priority=RECOMMEND|TIME|DISTANCE`

- 대한민국 범위 내 유효 WGS84 좌표만 허용; 동일 출발/도착 거부
- 서버에서만 `KAKAO_REST_API_KEY` 사용, KakaoAK Authorization 전달
- 공식 Kakao Mobility Directions `/v1/directions` 사용; `summary=true`와 `alternatives=true`
- 경로 정보는 서버 응답의 거리(m), 소요 시간(s), 통행료(원), 조회 시간만 표시
- **실제 주행시간·재탐색·음성·차량 지도 타일과 혼동 금지**
- 민감한 좌표/응답 원문/키를 로그·DB·캐시에 저장하지 않는다
- 요청 실패: 잘못된 좌표 400, 동일 좌표 400, 미설정 키 503, 공급자 인증 503, 제공자 장애 502/504, 남용 제한 429, 경로 없음 422
- 서버리스 인스턴스별 12회/분 기본 보호만 있으므로 상용 유료 API 활성화 전 **Vercel WAF/공유 rate-limit** 별도 운영 설정 필수

## 출시 자격 기준 (실제 단계를 분리하여 보고)

1. `npm run build` — 데이터베이스 migrate/seed 없음
2. GitHub Actions `Map Mobile Browser E2E` — 목적지 확인, GPS 이동, 카카오 공식 경로 모의 응답, 구글/카카오 전환
3. GitHub Actions `Native Kakao Navigation Fullscreen Drawer QA` — Debug APK 빌드, 에뮬레이터 시작, 지도·서랍 UI 증거
4. Android release signing gate — Native Kakao App Key 없거나 고정 릴리스 서명이 없으면 배포용 APK 생성 금지
5. Preview Vercel `READY` + API 실제 키 응답 확인 (키/도메인 설정이 있을 때만)
6. 실기기 Android/iOS에서 설치/미설치, 주소/좌표 선택, 실제 GPS 이동 및 음성 재탐색 확인
7. Kakao 개발자 등록·경로 API 쿼터·지도 타일/경로 데이터 이용약관 확인

6~7이 미완료이면 **실제 도로에서 완성형 작동이 검증됐다**고 주장하지 않는다.

## 장애 복구

- 사용자: 목적지 좌표 미확정 → 검색 결과 재선택; 위치 권한 거부 → 직접 기기 설정에서 허용; 공식 경로 API 불가 → 공식 카카오내비 또는 카카오맵 앱으로 안내
- 운영자: 배포 SHA와 Actions 로그 비교; 키 설정 여부/허용 도메인/패키지/서명 해시 확인; Vercel Preview에서 재현 후 안정 버전으로 롤백
- API 응답이 없으면 **숫자를 만들어 보여주지 않음**
- DB 스키마 및 원본 스토리지는 별도 승인 없이 변경하지 않음
