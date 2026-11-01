"use client";

import { useMemo, useState } from "react";
import "./invest.css";

const formatKRW = (value: number) => Math.round(value).toLocaleString("ko-KR");
const photo = (id: string, width = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=82`;

const models = [
  { num:"01", title:"숙소 예약",icon:"🛏",tag:"객실 예약 수수료",image:"/assets/listing-1.webp",fallback:"/assets/listing-3.webp",description:"호텔·리조트·펜션·독채 숙소의 검색, 비교, 예약 연결" },
  { num:"02", title:"맛집 · 로컬 푸드",icon:"🍴",tag:"주문·예약 제휴",image:photo("photo-1555939594-58d7cb561ad1"),fallback:"/assets/listing-2.webp",description:"여행 경로에서 지역 음식점 탐색, 추천, 예약과 주문" },
  { num:"03", title:"관광지 · 체험 티켓",icon:"🎫",tag:"티켓 판매 수수료",image:photo("photo-1493246507139-91e8fad9978e"),fallback:"/assets/hero.webp",description:"입장권·현장 체험·투어·액티비티 예약 상품" },
  { num:"04", title:"지역 광고 · 쿠폰",icon:"🎟",tag:"캠페인·프로모션",image:photo("photo-1517248135467-4c7edcad34c4"),fallback:"/assets/listing-4.webp",description:"지역 매장의 발견형 광고, 위치 기반 프로모션" },
  { num:"05", title:"지역 상품 · 굿즈",icon:"🎁",tag:"유통 마진·IP",image:photo("photo-1542838132-92c53300491e"),fallback:"/assets/listing-5.webp",description:"지역 특산품과 김별·길별이 브랜드 굿즈 커머스" },
  { num:"06", title:"매장 태블릿 SaaS",icon:"▤",tag:"가맹점 구독료",image:photo("photo-1556742044-3c52d6e88c62"),fallback:"/assets/listing-6.webp",description:"매장 주문·쿠폰·상품관리·정산 도구를 구독형으로" },
  { num:"07", title:"결제·정산 제휴",icon:"💳",tag:"계약상 순수수료",image:photo("photo-1556742049-0cfed4f6a45d"),fallback:"/assets/listing-7.webp",description:"인가된 결제사업자와 온·오프라인 거래 연결" },
] as const;
const galleries = [
  { title:"호텔 · 리조트",image:photo("photo-1566073771259-6a8506099945"),fallback:"/assets/listing-8.webp" },
  { title:"로컬 미식",image:photo("photo-1555939594-58d7cb561ad1"),fallback:"/assets/listing-2.webp" },
  { title:"관광 · 자연",image:photo("photo-1469474968028-56623f02e42e"),fallback:"/assets/hero.webp" },
  { title:"가맹점 결제",image:photo("photo-1556742044-3c52d6e88c62"),fallback:"/assets/listing-6.webp" },
] as const;

function SafePhoto({src, fallback, alt, loading="lazy"}:{src:string;fallback:string;alt:string;loading?:"eager"|"lazy"}) {
  return <img src={src} alt={alt} loading={loading} onError={event => {
    const element=event.currentTarget;
    if(element.dataset.fallbackApplied==="yes") return;
    element.dataset.fallbackApplied="yes";
    element.src=fallback;
  }}/>;
}

export default function InvestorPage() {
  const [users,setUsers]=useState(100000);
  const [shops,setShops]=useState(600);
  const [conversion,setConversion]=useState(8);
  const [scenario,setScenario]=useState("기준");
  const result=useMemo(()=>{
    const orders=users*conversion/100;
    const rows=[
      { name:"숙박 예약",amount:orders*.25*150000*.08,formula:"주문 25% × 15만원 × 8%" },
      { name:"식당 · 로컬 푸드",amount:orders*.4*30000*.06,formula:"주문 40% × 3만원 × 6%" },
      { name:"관광 티켓",amount:orders*.2*50000*.10,formula:"주문 20% × 5만원 × 10%" },
      { name:"지역 상품 · 굿즈",amount:orders*.15*40000*.12,formula:"주문 15% × 4만원 × 12%" },
      { name:"지역 광고 · 쿠폰",amount:users*150,formula:"이용자당 월 150원" },
      { name:"태블릿 SaaS",amount:shops*29000,formula:"매장당 월 29,000원" },
      { name:"결제 제휴",amount:shops*10000000*.0015,formula:"매장당 거래액 1천만원 × 순수수료 0.15%" },
    ];
    const month=rows.reduce((sum,row)=>sum+row.amount,0);
    return {orders,rows,month,year:month*12,max:Math.max(...rows.map(row=>row.amount))};
  },[users,shops,conversion]);
  const choose=(which:string)=>{
    setScenario(which);
    if(which==="보수"){setUsers(30000);setShops(100);setConversion(4);}
    else if(which==="확장"){setUsers(300000);setShops(1800);setConversion(11);}
    else{setUsers(100000);setShops(600);setConversion(8);}
  };
  const partnershipMail="mailto:sk@terrabridge.us?subject="+encodeURIComponent("[여행갈지도] 투자·전략적 파트너십 문의");

  return <div id="travel-ir-v2">
    <header className="ir-header">
      <div className="ir-wrap ir-top">
        <a href="/" className="ir-logo" aria-label="여행갈지도 공식 서비스 홈">
          <img src="/assets/brand-symbol-source.webp" alt=""/>
          <span>여행갈지도</span><small>INVESTOR RELATIONS</small>
        </a>
        <nav className="ir-nav" aria-label="페이지 바로가기">
          <a href="#business">사업모델</a><a href="#economics">수익 시뮬레이션</a><a href="#roadmap">로드맵</a>
          <a href={partnershipMail} className="ir-pill-btn">파트너십 제안 ↗</a>
        </nav>
      </div>
    </header>

    <main>
      <section className="ir-hero" aria-labelledby="ir-main-title">
        <div className="ir-wrap ir-hero-grid">
          <div className="ir-hero-content">
            <div className="ir-overline">INVESTMENT PROPOSAL · 2026</div>
            <h1 id="ir-main-title">여행의 길 위에,<br/><span>새로운 시장</span>을<br/>만들다.</h1>
            <p className="ir-hero-lead">길을 찾는 내비게이션에서 여행을 소비하는 플랫폼으로.<br/>김별과 길별이가 안내하는 숙소·맛집·관광 티켓·쿠폰·매장 결제의 연결.</p>
            <div className="ir-hero-badges">
              <span>✈ AI 여행 내비게이션</span><span>⌂ 지역 관광 커머스</span><span>★ 캐릭터 IP</span><span>▤ 가맹점 SaaS</span>
            </div>
            <div className="ir-hero-actions">
              <a href="#economics" className="ir-button-main">▥ 매출 시뮬레이션 보기 ↗</a>
              <a href="/" className="ir-button-light">▶ 실제 서비스 살펴보기 ↗</a>
            </div>
          </div>
          <div className="ir-hero-art" aria-label="숙박, 음식, 여행 풍경과 여행갈지도 브랜드 이미지">
            <div className="ir-shot ir-shot--hotel"><SafePhoto src={photo("photo-1566073771259-6a8506099945",720)} fallback="/assets/listing-1.webp" alt="호텔·리조트 여행 이미지" loading="eager"/></div>
            <div className="ir-shot ir-shot--food"><SafePhoto src={photo("photo-1555939594-58d7cb561ad1",720)} fallback="/assets/listing-2.webp" alt="식음료·맛집 여행 이미지" loading="eager"/></div>
            <div className="ir-shot ir-shot--coast"><SafePhoto src={photo("photo-1493246507139-91e8fad9978e",720)} fallback="/assets/hero.webp" alt="자연 여행 관광 이미지" loading="eager"/></div>
            <img className="ir-hero-brand" src="/assets/mascot-jido.webp" alt="여행갈지도 브랜드 탐험가 캐릭터"/>
            <span className="ir-photo-chip ir-photo-chip--one">⌂ 숙박</span>
            <span className="ir-photo-chip ir-photo-chip--two">♨ 맛집</span>
            <span className="ir-photo-chip ir-photo-chip--three">✦ 관광·체험</span>
          </div>
        </div>
      </section>

      <div className="ir-strip">
        <div className="ir-wrap">
          <div className="ir-strip-item"><span>⌖</span> 여행 내비게이션</div>
          <div className="ir-strip-item"><span>⌂</span> 숙소·식당 예약</div>
          <div className="ir-strip-item"><span>🎟</span> 관광·쿠폰 커머스</div>
          <div className="ir-strip-item"><span>▤</span> 오프라인 매장 연동</div>
        </div>
      </div>

      <section className="ir-section ir-models" id="business">
        <div className="ir-wrap">
          <div className="ir-section-head">
            <p className="ir-kicker">01 · BUSINESS & REVENUE</p>
            <h2>여행의 모든 순간을 잇는<br/>통합 여행 비즈니스</h2>
            <p className="ir-description">여행 계획부터 예약, 현지 경험, 매장 결제까지. 이미지와 실제 사용 맥락을 연결한 7개의 확장 수익모델을 제안합니다.</p>
          </div>
          <div className="ir-photo-grid">
            {models.map(model=><a href="#economics" key={model.num} className="ir-photo-card" aria-label={model.title+"의 매출 시뮬레이션 보기"}>
              <div className="ir-photo-card-media">
                <SafePhoto src={model.image} fallback={model.fallback} alt={model.title+" 사업 영역을 보여 주는 예시 사진"} />
                <span>{model.icon} {model.tag}</span>
              </div>
              <div className="ir-photo-card-body">
                <strong>{model.title}</strong><p>{model.description}</p><small>수익 구조 확인 ↗</small>
              </div>
            </a>)}
          </div>
          <p className="ir-description" style={{fontSize:12,marginTop:25}}>사진은 사업 분야를 설명하기 위한 예시 이미지입니다. 해당 장소·제품·가맹점과 실제 계약이 체결되었다는 의미가 아닙니다.</p>
        </div>
      </section>

      <section className="ir-section" id="brand">
        <div className="ir-wrap ir-double">
          <div>
            <p className="ir-kicker">02 · BRAND EXPERIENCE</p>
            <h2>김별과 길별이,<br/>여행이 끝난 뒤에도<br/>기억되는 브랜드</h2>
            <p className="ir-description">탐험가 김별과 별 동행자 길별이를 중심으로 여행 안내, 지역 축제, 호텔 웰컴 키트, 카페·도시락, 쿠폰 및 굿즈까지 이어지는 캐릭터 기반 마케팅 자산을 기획합니다.</p>
            <ul className="ir-ip-list">
              <li>✦ 관광지·동선·쿠폰을 연결하는 마스코트 경험</li>
              <li>✦ 굿즈·기념품·지역 특산품 협업 콘셉트</li>
              <li>✦ 여행지별 캠페인 및 브랜드 라이선싱 확장</li>
            </ul>
            <p className="ir-description" style={{fontSize:12}}>실제 상용화 전 저작권, 상표 및 원천 이미지의 권리 검증이 선행되어야 합니다.</p>
          </div>
          <div className="ir-ip-visual">
            <img src="/assets/brand-hero.webp" alt="여행갈지도 브랜드 캐릭터 소개 이미지"/>
          </div>
        </div>
      </section>

      <section className="ir-section ir-calc" id="economics">
        <div className="ir-wrap">
          <div className="ir-section-head">
            <p className="ir-kicker">03 · REVENUE SIMULATOR</p>
            <h2>예상 매출을<br/>직접 계산해 보세요.</h2>
            <p className="ir-description">보수·기준·확장 시나리오를 선택하거나 이용자 수, 월 전환율, 가맹점 수를 직접 조정해 7개 수익원의 합계를 확인할 수 있습니다.</p>
          </div>
          <div className="ir-calculator-grid">
            <div className="ir-controls">
              <div className="ir-scenarios" role="group" aria-label="사업 전망 시나리오">
                {["보수","기준","확장"].map(item=><button type="button" key={item} aria-pressed={scenario===item} onClick={()=>choose(item)}>{item} 시나리오</button>)}
              </div>
              <div className="ir-field"><label htmlFor="ir-users">월 활성 이용자 <output htmlFor="ir-users">{formatKRW(users)}명</output></label><input id="ir-users" type="range" min="10000" max="500000" step="10000" value={users} onChange={event=>{setUsers(Number(event.target.value));setScenario("직접");}}/></div>
              <div className="ir-field"><label htmlFor="ir-shops">태블릿 연동 가맹점 <output htmlFor="ir-shops">{formatKRW(shops)}곳</output></label><input id="ir-shops" type="range" min="0" max="3000" step="50" value={shops} onChange={event=>{setShops(Number(event.target.value));setScenario("직접");}}/></div>
              <div className="ir-field"><label htmlFor="ir-rate">월 예약·주문 전환율 <output htmlFor="ir-rate">{conversion}%</output></label><input id="ir-rate" type="range" min="1" max="20" step="1" value={conversion} onChange={event=>{setConversion(Number(event.target.value));setScenario("직접");}}/></div>
              <p className="ir-muted-note">가정: 각 주문을 숙박 25%, 식당 40%, 티켓 20%, 상품 15%로 배분. 별도 광고·구독·결제 제휴는 독립 가정입니다. 실제 검증 실적이 아닙니다.</p>
            </div>
            <div className="ir-results" aria-live="polite">
              <div className="ir-results-label">예상 월 플랫폼 수익 · 비용 차감 전</div>
              <div className="ir-results-amount">{formatKRW(result.month)}원</div>
              <span className="ir-results-year">연간 단순 환산 {formatKRW(result.year)}원</span>
              <div className="ir-result-rows">
                {result.rows.map(row=><div className="ir-result-row" key={row.name} title={row.formula}>
                  <div className="ir-result-row-header"><strong>{row.name}</strong><span>{formatKRW(row.amount)}원</span></div>
                  <div className="ir-result-track"><span style={{width:(100*row.amount/result.max).toFixed(1)+"%"}}/></div>
                </div>)}
              </div>
              <p className="ir-disclaimer">모든 값은 가상의 사업 가정이며 확정 매출·이익·투자 수익률이 아닙니다. 운영비, 인건비, 광고비, 세금, 환불, 결제 원가 및 계절성 미반영. 결제 취급액 전체를 매출로 계상하지 않고 제휴 계약상 순수수료 0.15%만 가정했습니다. 실 PG 계약 및 관련 규정 검토가 필요합니다.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="ir-section" id="partners">
        <div className="ir-wrap">
          <div className="ir-section-head">
            <p className="ir-kicker">04 · PARTNER NETWORK</p>
            <h2>여행갈지도와 함께<br/>지역의 가치를 키웁니다.</h2>
            <p className="ir-description">관광객이 발견하는 여행지부터 숙박, 로컬 미식, 가맹점 결제까지. 각각의 경험을 하나의 여행 흐름으로 연결합니다.</p>
          </div>
          <div className="ir-gallery">
            {galleries.map(item=><div className="ir-gallery-item" key={item.title}>
              <SafePhoto src={item.image} fallback={item.fallback} alt={item.title+" 협업 분야 예시"}/>
              <span>{item.title} ↗</span>
            </div>)}
          </div>
          <p className="ir-description" style={{fontSize:12,marginTop:18}}>위 사례는 제휴 제안 대상 업종을 시각화한 예시이며 실제 제휴사 또는 실적 사례가 아닙니다.</p>
        </div>
      </section>

      <section className="ir-section ir-roadmap" id="roadmap">
        <div className="ir-wrap">
          <div className="ir-section-head">
            <p className="ir-kicker">05 · EXECUTION ROADMAP</p>
            <h2>실제 검증을 통과하며<br/>지역별로 확장합니다.</h2>
            <p className="ir-description">핵심 제품 성능과 제휴 수익성을 먼저 검증한 뒤, 필요한 계약·인허가·정산 체계를 완성하고 점진적으로 확대합니다.</p>
          </div>
          <div className="ir-phase-grid">
            <article className="ir-phase"><span className="ir-phase-id">PHASE 01 · TEST</span><h3>여행 탐색·내비 검증</h3><p>웹·안드로이드 내비 기능 안정화, 여행 콘텐츠 품질 검증, 초기 가맹점 실증과 사용성 데이터 확보.</p></article>
            <article className="ir-phase"><span className="ir-phase-id">PHASE 02 · COMMERCE</span><h3>예약·쿠폰·결제 연결</h3><p>숙박·체험·음식점 제휴계약, 태블릿 운영, PG 파트너십과 정산·반품·보안 절차 검증.</p></article>
            <article className="ir-phase"><span className="ir-phase-id">PHASE 03 · SCALE</span><h3>지역 확장·브랜드 IP</h3><p>관광 지역 확대, 가맹점 구독 모델 고도화, 캐릭터 상품·지역 협업·여행 캠페인 확장.</p></article>
          </div>
          <div className="ir-caution"><strong>투자 검토 안내</strong> — 본 페이지는 사업계획 및 수익 시나리오 소개 자료입니다. 투자 청약 또는 수익 보장이 아니며, 예상 전환율·가맹점 수·수수료는 실제 계약이나 운영 실적과 다를 수 있습니다. 공식 투자 제안에 앞서 재무·법률·개인정보·위치정보·상표·정산 및 계약 실사가 필요합니다.</div>
        </div>
      </section>

      <section className="ir-contact" id="contact">
        <div className="ir-wrap">
          <p className="ir-kicker">MAKE THE NEXT JOURNEY TOGETHER</p>
          <h2>여행의 새로운 시장을<br/>함께 만들 파트너를 찾습니다.</h2>
          <p>전략적 투자, 숙박·맛집·관광지 제휴, 태블릿 결제·유통·지역 행사 협력을 제안해 주세요.</p>
          <div className="ir-hero-actions">
            <a className="ir-button-main" href={partnershipMail}>✉ 파트너십 제안 이메일 ↗</a>
            <a className="ir-button-light" href="/">⌂ 여행갈지도 서비스 ↗</a>
          </div>
        </div>
      </section>
    </main>
    <footer className="ir-footer"><div className="ir-wrap"><span>© 2026 여행갈지도 · Investor Presentation</span><span>사업구상·디자인 시안 · 공식 투자 청약 문서 아님</span><a href="#ir-main-title">맨 위로 ↑</a></div></footer>
  </div>;
}
