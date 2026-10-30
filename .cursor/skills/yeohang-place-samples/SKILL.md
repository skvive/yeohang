---
name: yeohang-place-samples
description: Generate YEOHANG regional Korea attraction sample pages and official-source curation (TourAPI, YouTube Data API, Blogger). Use when adding 국내 명소, 관광지 상세, 쇼츠/브이로그 큐레이션, VisitKorea, or place samples.
disable-model-invocation: true
---

# YEOHANG 명소 샘플 생성

무단 크롤링 금지. 공식 API·공개 검색 링크만 사용.

## Sources

| 용도 | 공식 | 금지 |
|------|------|------|
| 소개·좌표·이미지 | TourAPI 4.0 `KorService2` (`DATA_GO_KR_SERVICE_KEY` / `TOUR_API_KEY`) | visitkorea.or.kr HTML 스크래핑 |
| 쇼츠·브이로그 | YouTube Data API v3 | 유튜브 페이지 파싱, 비공개 영상 |
| 블로그 | Blogger API v3 | 블로그 HTML 스크래핑 |
| 지도 | Google Maps embed / search URL | 비공식 타일 |

## New sample checklist

1. `lib/places-catalog.ts`에 `PlaceSample` 1건 추가 (id=`sample-{slug}`, 원문 2~4문장, 저작권 문장 복사 금지).
2. `scripts/seed-places.mjs` 동일 행 추가.
3. `npm run db:seed-places`
4. `/place/{id}` 상세가 소개·지도·관광공사 링크·쇼츠/브이로그 슬롯·근처 숙소를 갖는지 확인.
5. 지역 칩(`/places?city=`)에 도시가 없으면 `PLACE_CITIES`에 추가.

## Commands

```
npm run db:migrate          # sql/009_places.sql
npm run db:seed-places      # 샘플 24곳
npm run db:import-places    # TourAPI 실데이터
npm run db:import-place-media  # 유튜브 쇼츠+브이로그
```

## Detail page contract

`/place/[id]` must include:

- 지역 / 유형 / 주소
- 2~4문장 소개 (TourAPI overview 또는 샘플 원문)
- VisitKorea 검색 링크 (`visitkoreaSearch`)
- Google Maps
- 쇼츠 슬롯, 브이로그 슬롯 (API 없으면 유튜브 검색 링크)
- 구글 블로그 슬롯 (없으면 안내 문구)
- 같은 도시 숙소 4곳 (`/stay/{id}`)
- 출처 disclosure

## Copy rules

- 관광공사 문장을 그대로 붙여넣지 말 것. TourAPI `overview`만 저장.
- 샘플 이미지는 `/assets/listing-N.webp` + “콘셉트 이미지” 배지.
- TourAPI `firstimage`는 “한국관광공사 제공 이미지”.
- 유튜버는 `TRAVEL_CREATORS` 핸들만. 채널 ID는 API로 해석.
