export const DEAL_HOURS = 18;
export const DEAL_AMOUNT_KRW = 5000;
export const DEAL_MIN_SPEND_KRW = 150000;
export const DEAL_ACP = 0.04;
export const DEAL_COOKIE = 'yeohang-deal';

export const DEAL_CHARACTERS = {
  goblin: { id: 'goblin', name: '쿠폰도깨비', role: '쿠폰 발행', img: '/assets/mascot-coupon-goblin.webp' },
  gilbyeoli: { id: 'gilbyeoli', name: '길별이', role: '채널 길잡이', img: '/assets/mascot-gilbyeoli.webp' },
  jido: { id: 'jido', name: '지도도령', role: '18시간 시계', img: '/assets/mascot-jido.webp' },
  meomuri: { id: 'meomuri', name: '머무리', role: '결제 지키미', img: '/assets/mascot-meomuri.webp' },
  on: { id: 'on', name: '여행온', role: '출발 응원', img: '/assets/mascot-yeohaengon.webp' },
} as const;

export type DealCharacterId = keyof typeof DEAL_CHARACTERS;

const TERMS = [
  '할인 5,000원은 아고다 결제창에 꽂히는 프로모션 코드가 아닙니다. 아고다 표시 요금은 아고다가 정하고, 여행갈지도는 제휴 수수료(마진) 범위 안에서 리베이트를 지급합니다.',
  '효력 조건: 이 숙소 상세를 연 시각부터 18시간 안에 아고다에서 예약 결제까지 완료해야 합니다. 조회만 하고 결제를 미루면 쿠폰은 자동 만료됩니다.',
  '18시간 제한은 아고다가 약 24시간 단위로 제휴 추적을 동기화·만료시키는 관행 안에서, 우리 링크의 라스트클릭이 끊기기 전에 결제를 끝내기 위한 보호 장치입니다.',
  '최소 결제 예상액 150,000원(수수료 4% 기준 마진 약 6,000원) 미만이면 5,000원 지급 재원이 부족해 리베이트가 거절될 수 있습니다.',
  '예약 취소·노쇼·미체크아웃이면 수수료가 발생하지 않으므로 리베이트도 무효입니다. 지급 시점은 아고다 예약 확정 및 수수료 정산 이후입니다.',
  '만료된 타임딜 버튼은 사용할 수 없습니다. 아고다 자체 예약은 가능하지만 여행갈지도 5,000원 혜택은 적용되지 않습니다.',
  '카카오톡 채널은 캐릭터 안내와 숙소 링크만 보냅니다. 카카오 쿠폰 API로 할인 코드를 발급하지 않습니다.',
] as const;

export function dealPolicy() {
  return {
    hours: DEAL_HOURS,
    amount_krw: DEAL_AMOUNT_KRW,
    min_spend_krw: DEAL_MIN_SPEND_KRW,
    acp_rate: DEAL_ACP,
    rebate_model: 'yeohang_margin' as const,
    cookie_protection_hours: 24,
    characters: DEAL_CHARACTERS,
    terms: [...TERMS],
    notice:
      '아고다 제휴 수수료가 들어온 뒤에만 5,000원을 돌려드립니다. 지금은 18시간 만료·추적 보호가 먼저 동작합니다.',
  };
}

export function characterForSource(source: string): DealCharacterId {
  if (source === 'stay') return 'meomuri';
  if (source === 'weekly') return 'on';
  return 'goblin';
}

export function dealExpiresAt(from = new Date()) {
  return new Date(from.getTime() + DEAL_HOURS * 3600 * 1000);
}

export function readCookie(req: Request, name: string) {
  const raw = req.headers.get('cookie') || '';
  const hit = raw.split(';').map((p) => p.trim()).find((p) => p.startsWith(name + '='));
  if (!hit) return '';
  return decodeURIComponent(hit.slice(name.length + 1));
}

export function dealCookieHeader(token: string, expiresAt: Date) {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  const secure = String(process.env.SITE_URL || '').startsWith('https') ? '; Secure' : '';
  return `${DEAL_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly${secure}`;
}

export function publicDeal(row: Record<string, unknown>) {
  const expires = new Date(String(row.expires_at)).getTime();
  const now = Date.now();
  const expired = String(row.status) === 'expired' || now >= expires;
  const status = expired ? 'expired' : String(row.status);
  const charId = (String(row.character_id || 'goblin') in DEAL_CHARACTERS ? String(row.character_id) : 'goblin') as DealCharacterId;
  return {
    stay_id: String(row.stay_id),
    stay_name: String(row.stay_name || ''),
    amount_krw: Number(row.amount_krw || DEAL_AMOUNT_KRW),
    min_spend_krw: Number(row.min_spend_krw || DEAL_MIN_SPEND_KRW),
    hours: DEAL_HOURS,
    started_at: row.started_at,
    expires_at: row.expires_at,
    remaining_ms: Math.max(0, expires - now),
    status,
    source: String(row.source || 'site'),
    character: DEAL_CHARACTERS[charId],
    token_hint: String(row.token || '').slice(0, 6),
  };
}
