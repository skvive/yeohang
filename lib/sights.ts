export type Sight = { name: string; area: string; why: string };

const SIGHTS: Record<string, Sight[]> = {
  서울: [
    { name: '경복궁', area: '종로', why: '조선 왕궁과 한복 산책이 한 동선에 모입니다.' },
    { name: '북촌한옥마을', area: '종로', why: '골목 한옥과 카페 골목을 천천히 걷기 좋습니다.' },
    { name: '남산서울타워', area: '용산', why: '야경 포인트로 숙소에서 해 질 녘 일정을 잡기 쉽습니다.' },
    { name: '광장시장', area: '종로', why: '빈대떡·마약김밥으로 저녁 공백을 메울 수 있습니다.' },
    { name: '한강공원', area: '여의도', why: '자전거·피크닉으로 도심 숙소의 여유를 더합니다.' },
  ],
  부산: [
    { name: '광안리해수욕장', area: '수영', why: '광안대교 야경과 오션뷰 숙소가 바로 이어집니다.' },
    { name: '해운대해수욕장', area: '해운대', why: '해변 산책과 카페 거리가 숙소 반경 안에 있습니다.' },
    { name: '감천문화마을', area: '사하', why: '알록달록 골목 사진 동선이 분명합니다.' },
    { name: '자갈치시장', area: '중구', why: '신선한 해산물로 저녁 일정을 채울 수 있습니다.' },
    { name: '태종대', area: '영도', why: '절벽 산책로가 하루 일정을 여유 있게 만듭니다.' },
  ],
  제주: [
    { name: '성산일출봉', area: '서귀포', why: '일출과 해안 산책이 동선으로 묶입니다.' },
    { name: '우도', area: '제주', why: '하루 배편으로 섬 일주가 가능합니다.' },
    { name: '함덕해수욕장', area: '제주시', why: '에메랄드 해변과 카페가 가깝습니다.' },
    { name: '한라산 어리목', area: '제주시', why: '가벼운 등산으로 제주의 고도를 느낄 수 있습니다.' },
    { name: '동문시장', area: '제주시', why: '오메기떡과 흑돼지로 저녁을 해결합니다.' },
  ],
  경주: [
    { name: '불국사', area: '경주', why: '석굴암과 묶는 대표 문화 일정입니다.' },
    { name: '동궁과월지', area: '경주', why: '야간 조명이 한옥·풀빌라 숙소와 잘 맞습니다.' },
    { name: '첨성대', area: '경주', why: '대릉원 산책과 이어서 걷기 좋습니다.' },
    { name: '황리단길', area: '경주', why: '카페와 한옥 골목이 밀집해 있습니다.' },
    { name: '문무대왕릉', area: '경주', why: '바다와 역사를 하루에 볼 수 있습니다.' },
  ],
  전주: [
    { name: '전주한옥마을', area: '완산', why: '한복·한옥 숙소와 동선이 겹칩니다.' },
    { name: '전동성당', area: '완산', why: '한옥마을 초입의 사진 포인트입니다.' },
    { name: '남부시장 청년몰', area: '완산', why: '야시장과 먹거리가 가깝습니다.' },
    { name: '경기전', area: '완산', why: '태조 어진을 짧은 코스로 볼 수 있습니다.' },
    { name: '오목대', area: '완산', why: '한옥마을 전경을 한눈에 담습니다.' },
  ],
  가평: [
    { name: '남이섬', area: '가평', why: '배편 하루 일정과 펜션 숙박이 잘 맞습니다.' },
    { name: '아침고요수목원', area: '가평', why: '사계절 정원 산책이 가능합니다.' },
    { name: '쁘띠프랑스', area: '가평', why: '테마마을로 가족 일정에 넣기 쉽습니다.' },
    { name: '가평레일바이크', area: '가평', why: '북한강 풍경을 활동으로 채웁니다.' },
    { name: '청평호', area: '가평', why: '수상레저와 펜션 뷰가 이어집니다.' },
  ],
  속초: [
    { name: '속초해수욕장', area: '속초', why: '해변 숙소에서 바로 걸어갈 수 있습니다.' },
    { name: '설악산 울산바위', area: '속초', why: '케이블카·짧은 등산으로 나눠 잡기 좋습니다.' },
    { name: '아바이마을', area: '속초', why: '갯배와 실향민 음식이 남아 있습니다.' },
    { name: '속초관광수산시장', area: '속초', why: '닭강정·순대로 저녁을 해결합니다.' },
    { name: '영금정', area: '속초', why: '일출 포인트로 숙소와 가깝습니다.' },
  ],
  강릉: [
    { name: '경포해변', area: '강릉', why: '바다 숙소와 카페 거리가 붙어 있습니다.' },
    { name: '안목커피거리', area: '강릉', why: '해변 커피 한 잔이 일정 공백을 메웁니다.' },
    { name: '정동진', area: '강릉', why: '해돋이 기차·일출 포인트입니다.' },
    { name: '오죽헌', area: '강릉', why: '신사임당 유적과 시내 동선이 짧습니다.' },
    { name: '정동심곡바다부채길', area: '강릉', why: '해안 절벽 산책로가 인상적입니다.' },
  ],
  평창: [
    { name: '대관령양떼목장', area: '평창', why: '아이와 함께 걷기 좋은 초원입니다.' },
    { name: '월정사 전나무숲', area: '평창', why: '오대산 입구의 고요한 산책로입니다.' },
    { name: '알펜시아', area: '평창', why: '스키·산책 모두 숙소와 가깝습니다.' },
    { name: '발왕산 케이블카', area: '평창', why: '정상 뷰로 하루를 채울 수 있습니다.' },
    { name: '오대산', area: '평창', why: '가을 단풍과 템플스테이 동선입니다.' },
  ],
  고성: [
    { name: '통일전망대', area: '고성', why: '동해 최북단 전망이 분명합니다.' },
    { name: '화진포', area: '고성', why: '호수와 바다가 한 화면에 모입니다.' },
    { name: '송지호해수욕장', area: '고성', why: '한적한 해변 숙소와 맞습니다.' },
    { name: 'DMZ 박물관', area: '고성', why: '역사 일정을 짧게 넣을 수 있습니다.' },
    { name: '아야진해변', area: '고성', why: '자갈 해변의 한적한 풍경입니다.' },
  ],
};

export function sightsFor(city: string, extra: Sight[] = []): Sight[] {
  const key = Object.keys(SIGHTS).find((c) => city.includes(c) || c.includes(city)) || '';
  const base = key ? SIGHTS[key] : [];
  const merged = [...extra.filter((s) => s.name), ...base];
  const seen = new Set<string>();
  const out: Sight[] = [];
  for (const s of merged) {
    const id = s.name.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ name: s.name.slice(0, 40), area: (s.area || city || '한국').slice(0, 30), why: (s.why || '여행갈지도 숙소 인근 명소').slice(0, 80) });
    if (out.length >= 5) break;
  }
  return out;
}
