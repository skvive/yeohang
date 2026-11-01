/**
 * 내 주변 숙소의 사용자 표시용 정규화 타입.
 *
 * 과거 아고다 수집본 중 motel / homestay 정보가 펜션·풀빌라에 합쳐진 데이터가 있으므로
 * 원본 category와 시설 이름을 함께 판별한다. 정밀 분류에는 원본 subtype 보존이 필요하다.
 * 입력한 유형은 반드시 허용 목록 확인 및 SQL 바인딩 변수로 전달한다.
 */
export const MAP_STAY_CATEGORIES = {
  all: '전체',
  hotel: '호텔',
  motel: '모텔',
  pension: '펜션·풀빌라',
  private: '프라이빗 하우스',
  resort: '리조트',
  guesthouse: '게스트하우스',
  hanok: '한옥',
  camping: '캠핑·글램핑',
  other: '기타 숙박',
} as const;

export type MapStayCategory = keyof typeof MAP_STAY_CATEGORIES;

export function isMapStayCategory(value: string): value is MapStayCategory {
  return Object.prototype.hasOwnProperty.call(MAP_STAY_CATEGORIES, value);
}

/** 필터와 표시 라벨에서 같은 CASE 식을 사용한다. */
export const MAP_STAY_TYPE_SQL = [
  'CASE',
  "  WHEN lower(coalesce(category,'')) ~ '(모텔|motel)' OR lower(coalesce(name,'')) ~ '(모텔|motel)' THEN 'motel'",
  "  WHEN lower(coalesce(category,'')) ~ '(프라이빗[[:space:]]*하우스|독채|단독주택|private[[:space:]]*house|entire[[:space:]]*home|homestay|holiday[[:space:]]*home|vacation[[:space:]]*home)'",
  "    OR lower(coalesce(name,'')) ~ '(프라이빗[[:space:]]*하우스|독채|단독[[:space:]]*(주택|숙소)|private[[:space:]]*house|entire[[:space:]]*home|homestay)' THEN 'private'",
  "  WHEN lower(coalesce(category,'')) ~ '(캠핑|글램핑|camp|glamp)' OR lower(coalesce(name,'')) ~ '(캠핑|글램핑|glamping|camping)' THEN 'camping'",
  "  WHEN lower(coalesce(category,'')) ~ '(리조트|resort)' OR lower(coalesce(name,'')) ~ '(리조트|resort)' THEN 'resort'",
  "  WHEN lower(coalesce(category,'')) ~ '(한옥|hanok)' OR lower(coalesce(name,'')) ~ '(한옥|hanok)' THEN 'hanok'",
  "  WHEN lower(coalesce(category,'')) ~ '(게스트|호스텔|guest|hostel)' OR lower(coalesce(name,'')) ~ '(게스트하우스|호스텔|guesthouse|hostel)' THEN 'guesthouse'",
  "  WHEN lower(coalesce(category,'')) ~ '(펜션|풀빌라|pension|villa)' THEN 'pension'",
  "  WHEN lower(coalesce(category,'')) ~ '(호텔|hotel)' OR lower(coalesce(name,'')) ~ '(호텔|hotel)' THEN 'hotel'",
  "  ELSE 'other'",
  'END',
].join('\n');
