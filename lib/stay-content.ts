import type { Property } from '@/lib/domain';
import { buildItinerary, buildTransit, nearbyPois, type StayItinerary, type StayPoi, type StayTransit } from '@/lib/stay-pois';

export type StayHighlight = { title: string; body: string; icon: string };
export type StayFact = { label: string; value: string };
export type StayFaq = { q: string; a: string };
export type StayTrust = { icon: string; title: string; sub: string };
export type StayAmenityItem = { label: string; icon: string };
export type StayContentKind = 'thin' | 'template' | 'unique';

export type StayProfile = {
  lead: string;
  paragraphs: string[];
  story: string[];
  originalOverview: string[];
  contentKind: StayContentKind;
  highlights: StayHighlight[];
  amenities: string[];
  amenityItems: StayAmenityItem[];
  facts: StayFact[];
  faqs: StayFaq[];
  fits: string[];
  pois: StayPoi[];
  itinerary: StayItinerary[];
  transit: StayTransit[];
  stars: number | null;
  starsLabel: string;
  starsMarks: string;
  score: number | null;
  scoreWord: string;
  reviewLabel: string;
  reviewCount: number | null;
  neighborhood: string;
  trust: StayTrust[];
  galleryScoreTitle: string;
  galleryScoreBody: string;
  galleryMetaTitle: string;
  galleryMetaBody: string;
};

const AMENITY_RULES: { re: RegExp; label: string; icon: string; title: string }[] = [
  { re: /Wi-?Fi|와이파이|무선.?인터넷/i, label: '무료 와이파이', icon: '📶', title: '무료 와이파이' },
  { re: /주차/, label: '주차', icon: '🅿', title: '주차 가능' },
  { re: /피트니스|헬스장/, label: '피트니스', icon: '🏋', title: '피트니스 센터' },
  { re: /금연/, label: '금연 숙소', icon: '🚭', title: '금연 숙소' },
  { re: /룸서비스/, label: '룸서비스', icon: '🍽', title: '룸서비스' },
  { re: /세탁/, label: '세탁 서비스', icon: '🧺', title: '세탁 서비스' },
  { re: /컨시어지/, label: '컨시어지', icon: '🛎️', title: '컨시어지' },
  { re: /라운지/, label: '라운지', icon: '✦', title: '라운지' },
  { re: /커피숍|카페/, label: '커피숍', icon: '☕', title: '커피숍' },
  { re: /식당|레스토랑/, label: '레스토랑', icon: '🍴', title: '레스토랑' },
  { re: /에어컨/, label: '에어컨', icon: '❄', title: '에어컨' },
  { re: /발코니|테라스/, label: '발코니·테라스', icon: '🌿', title: '발코니·테라스' },
  { re: /스트리밍|일간 신문|\bTV\b/, label: '객실 엔터테인먼트', icon: '📺', title: '객실 엔터테인먼트' },
  { re: /커피나 차|티.?메이커/, label: '커피·티 메이커', icon: '🍵', title: '커피·티 메이커' },
  { re: /수영장|풀장/, label: '수영장', icon: '🏊', title: '수영장' },
  { re: /스파|사우나/, label: '스파', icon: '♨', title: '스파' },
  { re: /조식|아침.?식사/, label: '조식', icon: '🥐', title: '조식' },
];

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function formatCount(n: number) {
  if (n >= 10000) {
    const man = n / 10000;
    const text = man >= 10 ? String(Math.round(man)) : man.toFixed(1).replace(/\.0$/, '');
    return `${text}만`;
  }
  return n.toLocaleString('ko-KR');
}

export function scoreWord(score: number) {
  if (score >= 9) return '최고';
  if (score >= 8) return '우수';
  if (score >= 7) return '좋음';
  if (score >= 6) return '만족';
  return '보통';
}

export function splitOverview(text: string) {
  let t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  t = t.replace(/([다요음까])\.(?=[가-힣A-Za-z])/g, '$1. ');
  t = t.replace(/([?？])(?=[가-힣A-Za-z])/g, '$1 ');
  return t
    .split(/(?<=(?:습니다|세요|입니다|됩니다|합니까|까요)[.!]?)(?:\s+|$)|(?<=[?？])\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 10);
}

function unique(items: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function extractAmenities(text: string, category?: string) {
  const found: string[] = [];
  for (const rule of AMENITY_RULES) {
    if (rule.re.test(text)) found.push(rule.label);
  }
  return unique(found.filter((a) => a !== category));
}

function amenityItemsOf(labels: string[]): StayAmenityItem[] {
  return labels.map((label) => {
    const rule = AMENITY_RULES.find((r) => r.label === label);
    return { label, icon: rule?.icon || '✦' };
  });
}

const TEMPLATE_RE =
  /최고의 서비스와 편의|투숙객이 편안함|걱정 없이 온라인|쾌적한 숙박 경험|호화로운 편의|우리 모두 아침에/;

function contentKindOf(desc: string, paragraphs: string[], name: string): StayContentKind {
  const joined = paragraphs.join('');
  if (!desc || joined.length < 80) return 'thin';
  const mentionsName = name.length >= 4 && desc.includes(name.slice(0, 6));
  if (TEMPLATE_RE.test(desc) && !mentionsName) return 'template';
  if (paragraphs.length >= 8 && TEMPLATE_RE.test(desc)) return 'template';
  return 'unique';
}

function buildStory(input: {
  city: string;
  neighborhood: string;
  category: string;
  stars: number | null;
  score: number | null;
  reviewCount: number | null;
  address: string;
  amenities: string[];
  pois: StayPoi[];
  kind: StayContentKind;
  uniqueLead?: string;
}) {
  const { city, neighborhood, category, stars, score, reviewCount, address, amenities, pois, kind, uniqueLead } = input;
  const zone = neighborhood && neighborhood !== city ? `${city} ${neighborhood}` : city;
  const first = pois[0];
  const second = pois[1];
  const lines = [
    kind === 'unique' && uniqueLead
      ? uniqueLead
      : `${zone}에 있는 ${stars ? `${stars}성급 ` : ''}${category}입니다.`,
    score && reviewCount
      ? `아고다 후기 ${formatCount(reviewCount)} 건, 평점 ${score.toFixed(1)}점(${scoreWord(score)})입니다.`
      : '상세 시설과 실시간 요금은 아고다 예약 페이지에서 확인할 수 있습니다.',
    first
      ? `${first.name}까지 ${first.travel}입니다.${second ? ` ${second.name}과도 이어서 움직이기 좋습니다.` : ''}`
      : address
        ? `위치는 ${address}입니다.`
        : '',
    amenities.length
      ? `소개 문구에서 확인한 시설은 ${amenities.slice(0, 5).join(', ')}입니다.`
      : '아고다 숙소 파일에는 유형만 있어, 객실·시설 상세는 예약 페이지에서 확인합니다.',
  ].filter(Boolean);
  return unique(lines).slice(0, 4);
}

function highlightsFrom(text: string, paragraphs: string[], extras: StayHighlight[]) {
  const out: StayHighlight[] = [];
  for (const rule of AMENITY_RULES) {
    if (!rule.re.test(text)) continue;
    const body = paragraphs.find((p) => rule.re.test(p)) || `${rule.title}이 안내되어 있습니다.`;
    out.push({ title: rule.title, body, icon: rule.icon });
    if (out.length >= 4) break;
  }
  for (const extra of extras) {
    if (out.length >= 4) break;
    if (out.some((h) => h.title === extra.title)) continue;
    out.push(extra);
  }
  return out.slice(0, 4);
}

function neighborhoodOf(p: Property) {
  const blob = `${p.name} ${p.address || ''} ${p.area || ''} ${p.city || ''}`;
  if (/홍대|합정|상수|연남/.test(blob)) return '홍대·합정';
  if (/명동|충무로|을지로/.test(blob)) return '명동·을지로';
  if (/강남|역삼|삼성|선릉/.test(blob)) return '강남';
  if (/마포/.test(blob)) return '마포';
  if (/해운대/.test(blob)) return '해운대';
  if (p.area && p.area !== p.city) return p.area;
  return p.city;
}

function starMarks(stars: number) {
  const n = Math.max(0, Math.min(5, Math.round(stars)));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

export function buildStayProfile(p: Property): StayProfile {
  const category = String(p.category || '숙소');
  const city = String(p.city || '');
  const area = String(p.area || city);
  const address = String(p.address || '');
  const desc = String(p.description || '').trim();
  const stars = num(p.star_rating);
  const score = num(p.review_score);
  const reviewCount = num(p.review_count);
  const neighborhood = neighborhoodOf(p);
  const storedAmenities = ((p.amenities as string[]) || []).filter((a) => a && a !== category);
  const extracted = extractAmenities(desc, category);
  const amenities = unique([...extracted, ...storedAmenities]);
  const originalOverview = splitOverview(desc);
  const kind = contentKindOf(desc, originalOverview, String(p.name || ''));
  const pois = nearbyPois({ city, lat: p.lat as number | null, lng: p.lng as number | null }, 5);
  const uniqueLead = originalOverview.find((para) => para.length > 24 && !TEMPLATE_RE.test(para) && /호텔|숙소|위치|마포|해운대|제주/.test(para));
  const story = buildStory({
    city,
    neighborhood,
    category,
    stars,
    score,
    reviewCount,
    address,
    amenities,
    pois,
    kind,
    uniqueLead,
  });
  let paragraphs = originalOverview;
  const thin = kind === 'thin';

  if (thin) {
    paragraphs = story;
  }

  const fallbackHighlights: StayHighlight[] = [
    neighborhood
      ? { title: `${neighborhood} 위치`, body: address ? `${address}에 있습니다.` : `${city} ${neighborhood} 권역입니다.`, icon: '⌖' }
      : { title: '위치 안내', body: address || `${city}에 있습니다.`, icon: '⌖' },
    score && reviewCount
      ? {
          title: `후기 ${score.toFixed(1)}점`,
          body: `아고다 후기 ${formatCount(reviewCount)} 건 기준 ${scoreWord(score)} 평가입니다.`,
          icon: '★',
        }
      : { title: '아고다 제휴', body: '요금·객실 재고 확인과 결제는 아고다에서 진행됩니다.', icon: '✦' },
    stars
      ? { title: `${stars}성급 ${category}`, body: `${city}의 ${stars}성급 ${category}로 안내됩니다.`, icon: '🏙' }
      : { title: category, body: `${city} ${category}입니다.`, icon: '🏙' },
  ];

  const highlights = highlightsFrom(desc, paragraphs, fallbackHighlights);
  const word = score ? scoreWord(score) : '';
  const reviewLabel = reviewCount ? `후기 ${formatCount(reviewCount)} 건` : '후기 집계 전';
  const starsLabel = stars ? `${stars}성급` : category;
  const lead =
    thin || kind === 'template'
      ? [neighborhood && neighborhood !== city ? neighborhood : city, starsLabel, category].filter((v, i, arr) => v && arr.indexOf(v) === i).join(' · ')
      : String(p.tagline || [city, category].filter(Boolean).join(' · '));

  const fits = unique(
    [
      /홍대|합정|마포/.test(`${p.name} ${address} ${neighborhood}`) ? '홍대·합정 접근' : '',
      /명동|을지로/.test(`${p.name} ${address}`) ? '도심 관광' : '',
      category === '호텔' ? '출장·시내 숙박' : '',
      amenities.includes('금연 숙소') ? '금연 숙소' : '',
      amenities.includes('피트니스') ? '운동 가능한 숙소' : '',
      amenities.includes('주차') ? '주차 필요 여행' : '',
      amenities.includes('무료 와이파이') && /장기/.test(desc) ? '업무·장기 체류' : '',
    ].filter(Boolean),
  ).slice(0, 4);

  const facts: StayFact[] = [
    { label: '숙박 유형', value: category },
    { label: '성급', value: stars ? `${stars}성급` : '미표기' },
    { label: '후기', value: score && reviewCount ? `${score.toFixed(1)} · ${formatCount(reviewCount)} 건` : '집계 전' },
    { label: '지역', value: [city, neighborhood !== city ? neighborhood : area].filter(Boolean).join(' · ') },
    { label: '주소', value: address || '주소 확인 필요' },
    { label: '예약', value: p.source === 'agoda' ? '아고다에서 결제' : '제휴 예약 전' },
  ];

  const faqs: StayFaq[] = [
    {
      q: '예약과 결제는 어디서 하나요?',
      a: p.source === 'agoda'
        ? '요금·객실 재고 확인과 결제는 아고다 새 창에서 진행됩니다. 여행갈지도는 숙소 안내와 위치 확인을 제공합니다.'
        : '이 숙소는 아직 아고다 제휴 예약이 연결되어 있지 않습니다.',
    },
    {
      q: '숙소는 어디에 있나요?',
      a: address
        ? `${address}입니다. 페이지의 구글 지도에서 위치를 확인하고, 내 위치를 허용하면 가는 길을 안내합니다.`
        : '상세 주소는 아고다 페이지에서 확인해 주세요.',
    },
    {
      q: '후기는 어떤가요?',
      a: score && reviewCount
        ? `아고다 후기 ${formatCount(reviewCount)} 건 기준 평점 ${score.toFixed(1)}점, ${word} 평가입니다.`
        : '이 숙소는 아직 아고다 후기 점수가 집계되지 않았습니다.',
    },
    {
      q: '시설 정보는 얼마나 정확한가요?',
      a: amenities.length
        ? `숙소 소개 문구에서 ${amenities.slice(0, 6).join(', ')} 등을 확인했습니다. 실시간 객실·요금은 아고다에서 재확인하세요.`
        : '현재 아고다 숙소 파일에는 유형만 들어 있습니다. 상세 시설은 아고다 예약 페이지에서 확인할 수 있습니다.',
    },
  ];

  const trust: StayTrust[] = [
    {
      icon: '✦',
      title: p.source === 'agoda' ? '아고다 제휴 숙소' : '공개 숙소 정보',
      sub: p.source === 'agoda' ? '예약·결제는 아고다' : '제휴 예약 전',
    },
    { icon: '★', title: stars ? `${stars}성급 ${category}` : category, sub: neighborhood || city },
    {
      icon: '◎',
      title: score ? `${score.toFixed(1)} ${word}` : '후기 집계 전',
      sub: reviewCount ? `${formatCount(reviewCount)} 건` : '아고다 후기',
    },
    { icon: '⌖', title: '구글 지도 위치', sub: p.lat != null ? '좌표 확인' : '주소 검색' },
  ];

  return {
    lead,
    paragraphs: kind === 'template' ? story : paragraphs,
    story,
    originalOverview,
    contentKind: kind,
    highlights,
    amenities,
    amenityItems: amenityItemsOf(amenities),
    facts,
    faqs,
    fits,
    pois,
    itinerary: buildItinerary(neighborhood, city, pois),
    transit: buildTransit(pois, neighborhood, city),
    stars,
    starsLabel,
    starsMarks: stars ? starMarks(stars) : '',
    score,
    scoreWord: word,
    reviewLabel,
    reviewCount,
    neighborhood,
    trust,
    galleryScoreTitle: score ? score.toFixed(1) : starsLabel,
    galleryScoreBody: score ? `${word} · ${reviewLabel}` : '아고다 제휴 숙소',
    galleryMetaTitle: stars ? `${stars}성급` : category,
    galleryMetaBody: [neighborhood || city, category].filter(Boolean).join(' · '),
  };
}
