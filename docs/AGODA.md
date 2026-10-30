# 아고다 제휴로 한국 숙소 DB 채우기

스크래핑이 아니라 Agoda Affiliate Partner Center의 공식 피드/API만 사용합니다.

## 돈 버는 구조

| 항목 | 값 |
|------|-----|
| 상품 | 호텔만 (항공/렌터카 제휴 없음) |
| 수수료 | 월 체크아웃 완료 1–50건 4%, 51–300건 4.5%, 301건+ 5% |
| 산식 | (결제액 − 세금/수수료) × 수수료율 |
| 지급 | 월 단위 USD, 최소 $200. 체크아웃 후 약 1개월(호텔 현장결제 2개월) |
| 추적 | 도메인 인증 + 링크의 `cid`(Site ID) |

예약·결제는 아고다가 하고, 여행갈지도는 CID 딥링크로 트래픽을 넘긴 뒤 완료 건 수수료만 받습니다.

## 한국 숙소를 “전부” 넣는 공식 경로

1. https://partners.agoda.com 에서 Affiliate 가입
2. 이메일 인증 → 프로필 → `yeohang.lexid.site` 도메인 인증(메타태그/HTML)
3. 은행 정보 등록(영문)
4. Partner Center → Tools → **Hotel Data File** CSV 다운로드 (매일 갱신)
5. Lite API 키 발급 (`siteid:apikey`)
6. 로컬/서버에서 한국만 필터해 Neon에 upsert

```powershell
npm run db:migrate
npm run db:import-agoda -- path\to\Agoda_Hotels_EN.csv
```

CSV는 git에 넣지 않습니다. 전 세계 100만 행 규모이며 한국만 잘라 DB에 넣습니다.

## 런타임

- 카탈로그: `properties.source='agoda' AND country_code='KR'`
- 예약 CTA: `https://www.agoda.com/partners/partnersearch.aspx?cid={CID}&hid={hotelId}&currency=KRW&locale=ko-kr`
- 실시간 요금(선택): Affiliate Lite Search `https://affiliateapi7643.agoda.com/affiliateservice/lt_v1` — city/hotel 검색, city는 최대 30건이라 전체 카탈로그 용도가 아님
- 교차검증 패턴: [nexus-gateway Agoda notes](https://github.com/yx-laguna/nexus-gateway/blob/main/NOTES-agoda-hosting.md) — Hotel Data File SQLite + Lite API

## 환경 변수

```
AGODA_CID=
AGODA_SITE_ID=
AGODA_API_KEY=
AGODA_VERIFY_META=
```

시크릿은 `.env.local` / Vercel env만 사용합니다.
