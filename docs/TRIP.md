# 트립닷컴 제휴

스크래핑이 아니라 Trip.com Affiliate Program 공식 링크만 사용합니다.

## 가입

1. https://www.trip.com/partners/ 에서 Join us
2. 이메일 또는 Google 로그인
3. 프로필·정산 계좌 입력 후 Activate
4. Account → Manage My Sites 에서 AID(allianceid), SID 확인
5. `TRIP_ALLIANCE_ID`, `TRIP_SID` 를 `.env.local` / Vercel env 에만 넣습니다. 저장소에 넣지 않습니다.

## 추적

| 항목 | 값 |
|------|-----|
| 쿠키 | 웹 30일, 앱 7일 |
| 수수료 | 기본 최대 7% (상품·프로모션에 따라 다름) |
| 최소 정산 | 미화 200달러 / 홍콩달러 1,500 |
| 딥링크 | `https://kr.trip.com/hotels/detail/?hotelId={id}&allianceid={AID}&sid={SID}` |
| 검색 링크 | `https://kr.trip.com/hotels/list?locale=ko-KR&curr=KRW&keyword={숙소명}` |

아고다 호텔 ID와 트립닷컴 호텔 ID는 다릅니다. ID 매핑 전에는 숙소명+도시 검색 링크로 넘깁니다. 화면의 「트립닷컴최저가」는 트립닷컴에서 실시간 요금을 보라는 뜻이며, 여행갈지도가 두 제휴사 요금을 미리 비교 계산하지는 않습니다.
