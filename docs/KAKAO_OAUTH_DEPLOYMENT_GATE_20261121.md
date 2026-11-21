# 여행갈지도 카카오 계정·모빌리티 인증 인계 및 운영 게이트 (2026-11-21)

## 확인된 공식 앱 / 기존 자산
- 운영 카카오 앱 ID: `1634160` (파트너스 사회적협동조합)
- 테스트 카카오 앱 ID: `1634163`
- 기존 OAuth 구현 소스: 브랜치 `chatgpt/navigation-v9-map-brand-20261102`에서 재사용.
- 기존 Android KNSDK 구현: `android-app/`; 패키지 `site.lexid.yeohangnav`.
- Drive: `YEOHAENG_KAKAO_AGENT_CLI_MCP_20261102`에 로컬 read-only CLI, 테스트 코드, 환경변수 예시가 있음. CLI는 카카오 개발자센터 앱 관리 API를 제공하지 않으며 로컬 테스트 성공이 ChatGPT 원격 인증 완료를 의미하지 않음.

## 절대 혼동하지 말 것
1. Kakao 개인 계정 OAuth 승인 (여행자 로그인).
2. Kakao Developers 운영/테스트 앱의 관리 계정 로그인 (개발자 콘솔).
3. Kakao Maps JavaScript SDK 앱키와 허용 도메인.
4. Kakao Mobility 자동차 길찾기 Directions REST API 허용 권한 및 키.
5. Kakao KNSDK Android 네이티브 앱키 + 패키지 + 릴리스 인증서 키 해시.

위 5가지는 다른 승인 범위다. 개인 카카오톡 계정 로그인만으로 자동차 길찾기 API/KNSDK 권한을 가질 수 없다.

## 기존 OAuth 서버 통합
- `/api/kakao/oauth/config`: 비밀값을 반환하지 않고 `enabled`만 노출. 요청 Origin과 서버에 등록된 `KAKAO_OAUTH_ORIGIN` 불일치 시 false.
- `/api/kakao/oauth/start`: 인가 코드 + CSRF 랜덤 state, HttpOnly Secure SameSite Lax 호스트 쿠키.
- `/api/kakao/oauth/callback`: state 검증 뒤 서버에서 토큰 교환, 사용자 ID만 서명 세션에 저장.
- `/api/kakao/oauth/session`: 여행자 본인 세션 여부만 조회, Neon 파트너/관리자 권한은 부여하지 않음.
- `/api/kakao/oauth/logout`: 여행갈지도 로컬 여행자 세션만 종료.
- 로그인 UI는 설정이 없거나 Preview 호스트가 미승인 시 카카오 버튼을 비활성화.
- 기존 구글/이메일 Neon 로그인, 파트너·관리자 권한과 DB 구조 변경 없음.

## 운영 전 카카오 개발자센터 작업 (실제 로그인 세션에서 검증)
1. `https://developers.kakao.com/console/app`에서 운영 `1634160`, 테스트 `1634163`의 관리자 권한 확인.
2. 운영 앱 Kakao Login 사용 설정 및 필요한 동의 항목 승인. REST API 플랫폼에 정확한 Redirect URI `https://yeohang.lexid.site/api/kakao/oauth/callback` 등록.
3. 운영 웹 플랫폼 및 Kakao Maps JavaScript 허용 도메인 `https://yeohang.lexid.site` 등록.
4. 운영 앱의 Kakao Mobility Directions API 사용 가능 여부, 실제 유효 REST 키, 요금/쿼터 확인.
5. Android 패키지 `site.lexid.yeohangnav`와 **실제 릴리스 인증서** 키 해시를 카카오 앱 설정에 등록. KNSDK App Key 인증 성공 및 GPS·음성·재탐색 실기기 검증.
6. 운영 Vercel Production에 실제 승인된 키만 안전하게 등록: `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`, `KAKAO_SESSION_SECRET` (32자 이상), `KAKAO_OAUTH_ORIGIN=https://yeohang.lexid.site`. 지도 JS 키는 `NEXT_PUBLIC_KAKAO_MAP_JS_KEY`에 별도 등록.
7. 배포 및 실제 사용자 로그인 동의 → OAuth 세션 → 로그아웃, 차량 길찾기 200 응답, Android 실주행을 각각 확인.

**중요:** 기존 Preview 키는 공식 Directions API 요청에 `KAKAO_CREDENTIALS`를 반환했다. 이를 유효한 운영 키라고 가정하고 Production에 복사하지 말 것.

## 자동 QA
- `node --test tests/kakao-oauth.test.mjs`
- Next.js 타입 검사/빌드 (`npm run build`)
- 키 미설정 CI에서 `/api/kakao/oauth/config` → `enabled:false`, `/api/kakao/oauth/start` → 503.
- 상용 인증/경로 200 성공 판정은 실제 사용자 승인·Kakao 앱 권한을 검증한 뒤에만 기록한다.

## 접근 및 배포 안전
- 브라우저가 Work 모드에 연결되어 있지 않으면 카카오 개발자 콘솔 로그인, 사용자 동의, 개발자 앱 권한 확인을 완료했다고 기록하지 않는다.
- Drive 원본, 등록 앱, Neon DB, 운영 비밀키를 자동 변경하지 않는다.
- 비밀키/사용자 토큰/실제 위치는 채팅·Git·HTML·로그에 출력하지 않는다.
