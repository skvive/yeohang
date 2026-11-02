# 여행갈지도 카카오 연동 상태 (2026-11-02)

## 연결 대상
- 카카오 운영 앱: 1634160 (파트너스 사회적협동조합)
- 카카오 테스트 앱: 1634163
- GitHub 작업 브랜치: `chatgpt/navigation-v9-map-brand-20261102`
- Vercel 프로젝트: `yeohang` (Production은 변경하지 않음)

## 현재 코드
- 웹 지도: `public/map-kakao-provider.js`에서 카카오맵 JS SDK를 조건부로 사용; 키 없으면 기본 Leaflet 지도 유지
- 여행자 카카오 로그인: `/api/kakao/oauth/start`, `callback`, `session`, `logout`; 서버측 인가 코드 교환; state CSRF 확인; HttpOnly 보안 쿠키
- 기존 Neon 구글/이메일 로그인과 별도이며, 카카오 여행자 세션은 관리자/파트너 권한을 갖지 않음
- 로그인 화면: `/auth/sign-in`에서 환경변수가 실제로 갖춰졌을 때만 카카오 로그인 버튼 활성화
- 기본 카카오 REST API 키는 클라이언트 시크릿 필수 (공식 정책)
- 내비 기능은 외부 카카오맵 연결이며, 앱 내 턴바이턴은 구현·검증되지 않음

## 카카오 테스트 앱 관리 페이지에서 해야 할 설정 (사용자 로그인 필요)
1. [카카오디벨로퍼스](https://developers.kakao.com/console/app)에서 테스트 앱 `1634163` 선택
2. 카카오 로그인 > 사용 설정 ON
3. 앱 > 플랫폼 키 > REST API 키 > Redirect URI에 **정확히** 등록:
`https://yeohang-git-chatgpt-navigatio-aa4d0e-shinkang888-codes-projects.vercel.app/api/kakao/oauth/callback`
4. REST API 키와 클라이언트 시크릿 값은 안전하게 Vercel 환경변수에 직접 등록; 채팅/저장소에 값 기재 금지
5. 지도 서비스 사용 설정과 JavaScript 키의 웹 도메인에 위 테스트 Preview 호스트 등록

## Vercel 설정
Preview에 등록된 기본 환경변수:
- `KAKAO_OAUTH_ORIGIN`: 안정적인 V9 테스트 브랜치 호스트 (키가 아닌 공개 origin)
- `KAKAO_SESSION_SECRET`: 자동 생성된 암호화 저장 세션 서명 키 (값 비공개)

추가로 Preview에 **직접 입력이 필요한 비밀값**:
- `KAKAO_REST_API_KEY` (테스트 앱 1634163 REST API 키)
- `KAKAO_CLIENT_SECRET` (테스트 앱 클라이언트 시크릿; REST API 기본 필수)
- `NEXT_PUBLIC_KAKAO_MAP_JS_KEY` (테스트 앱 카카오맵 JavaScript 키; 공개 키이지만 도메인 제한 필수)

주의: 현 Vercel 프로젝트는 Git 저장소 연결 정보가 없어 Preview의 Git 브랜치 전용 변수 등록이 실패했습니다. 두 기본 변수는 **전체 Preview에 적용**되므로 다른 Preview 호스트는 인증 콜백이 작동하지 않을 수 있습니다. 운영(Production) 환경은 변경하지 않았습니다.

## 검증 게이트
- `npm run build`: Next.js 컴파일 및 타입 검사
- `node --test tests/navigation-v9.test.mjs`: 소스 구조 보안 회귀 테스트
- `/api/kakao/oauth/config`: 비밀값 누출 없이 `enabled: true|false` 확인
- 카카오 실제 로그인은 테스트 앱 설정 및 키 등록 뒤, 사용자 본인 동의 화면 통과가 필요
- REST API 토큰 / 비밀번호는 채팅·로그·HTML에 출력하지 않음
- 관리자·파트너 권한은 Neon 계정만 허용; 카카오 여행자 세션은 구분

## ChatGPT MCP 연동 범위
현재 `/mnt/data/kakao-agent-cli`은 로컬 설치·테스트 완료. ChatGPT 계정 자체에 이 MCP가 원격 연결되거나 카카오 개발자센터 관리 권한이 부여된 상태는 **아님**. 로컬 MCP 데모와 사이트 카카오 로그인은 별개의 통합 작업.
