(() => {
  const CAST = [
    { id: 'goblin', name: '쿠폰도깨비', job: '5,000원 쿠폰을 발행하고 만료 시계를 지킵니다.', img: '/assets/mascot-coupon-goblin.webp' },
    { id: 'gilbyeoli', name: '길별이', job: '카카오 채널에서 숙소 링크로 안내합니다.', img: '/assets/mascot-gilbyeoli.webp' },
    { id: 'jido', name: '지도도령', job: '숙소를 연 시각부터 18시간을 셉니다.', img: '/assets/mascot-jido.webp' },
    { id: 'meomuri', name: '머무리', job: '아고다 결제까지 끝내지 않으면 쿠폰을 닫습니다.', img: '/assets/mascot-meomuri.webp' },
    { id: 'on', name: '여행온', job: '예약이 잡히면 출발 전 한 편을 건넵니다.', img: '/assets/mascot-yeohaengon.webp' },
  ];

  const COPIES = [
    {
      id: 'welcome',
      title: '채널 환영 메시지',
      text: `안녕, 나는 쿠폰도깨비야.
숙소를 보고 18시간 안에 예약·결제하면
여행갈지도가 제휴 마진 안에서 5,000원을 돌려줄게.

아고다는 하루가 지나면 추적을 끊는 경우가 있어.
그래서 우리는 18시간 타임딜로 보호해.

아래 숙소를 열고 [18시간 타임딜 받기]를 눌러줘.
조회만 하고 창을 닫으면 쿠폰은 사라질게.`,
    },
    {
      id: 'coupon',
      title: '쿠폰형 메시지',
      text: `🎫 쿠폰도깨비 타임딜
5,000원 · 여행갈지도 리베이트

유효: 숙소 조회 후 18시간 이내 아고다 결제 완료
최소 결제 예상: 150,000원 (수수료 4% 기준)
아고다 표시 가격은 그대로예요.
할인액은 여행갈지도가 정산 후 지급합니다.

만료되면 버튼이 꺼지고 혜택은 다시 쓸 수 없어요.`,
    },
    {
      id: 'remind',
      title: '6시간 리마인드',
      text: `지도도령이 시계를 보여줬어.
타임딜이 12시간 남았어.

지금 아고다에서 결제까지 끝내야
5,000원 리베이트가 살아 있어.
창만 열어 두고 내일로 미루면
아고다 24시간 추적 밖에서 수수료가 사라질 수 있어.`,
    },
    {
      id: 'expire',
      title: '만료 안내',
      text: `머무리가 쿠폰을 접었어.
18시간이 지나 이번 타임딜은 끝났어.

아고다에서 숙소를 예약할 수는 있지만
여행갈지도 5,000원 혜택은 적용되지 않아.
다시 받으려면 숙소 페이지에서 새 타임딜을 열어야 해.`,
    },
  ];

  function h(v) {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function kakaoPageHtml(opts) {
    const stays = Array.isArray(opts?.stays) ? opts.stays : [];
    const stayCards = stays.length
      ? stays
          .map(
            (p) =>
              `<a href="/stay/${h(p.id)}?deal=kakao"><small>${h(p.city || '')}</small><strong>${h(p.name)}</strong><span>18시간 타임딜 열기 ↗</span></a>`,
          )
          .join('')
      : `<a href="/#discover"><strong>숙소 찾아 타임딜 열기</strong><span>탐색에서 숙소를 고른 뒤 쿠폰을 받으세요.</span></a>`;

    return `<section class="kakao-hero"><div class="wrap kakao-hero-grid">
      <div>
        <span class="eyebrow">카카오톡 채널 · 캐릭터 쿠폰</span>
        <h1>쿠폰도깨비가<br>18시간만 열어주는<br>5,000원 톡.</h1>
        <p>채널에서 캐릭터가 숙소 링크를 보냅니다. 숙소를 연 뒤 18시간 안에 아고다 결제까지 끝내야 쿠폰이 살아 있습니다. 아고다 24시간 추적 만료 전에 결제를 끝내는 보호 장치입니다.</p>
        <div class="kakao-hero-actions">
          <a class="kakao-add" id="kakaoAddBtn" href="#kakao-copy">채널 메시지 초안 보기</a>
          <a class="ghost" href="/#discover">숙소 고르고 타임딜 받기</a>
        </div>
      </div>
      <div class="kakao-phone" aria-label="카카오톡 채널 시안">
        <div class="kakao-phone-bar"><span></span></div>
        <div class="kakao-chat">
          <div class="kakao-chat-head">
            <img src="/assets/mascot-gilbyeoli.webp" alt="">
            <div><strong>여행갈지도</strong><small>채널 · 쿠폰도깨비</small></div>
          </div>
          <div class="kakao-bubbles">
            <div class="kakao-row"><img src="/assets/mascot-coupon-goblin.webp" alt=""><div class="kakao-bubble">숙소 보고 18시간 안에 결제하면 5,000원을 돌려줄게. 아고다 가격은 그대로야.</div></div>
            <div class="kakao-coupon-card"><small>쿠폰도깨비 타임딜</small><b>₩5,000</b><small>숙소 조회 후 18시간 · 아고다 결제 완료 시</small><span class="kakao-timepill">TIME DEAL 18:00:00</span></div>
            <div class="kakao-row"><img src="/assets/mascot-jido.webp" alt=""><div class="kakao-bubble">지도도령이 시계를 켰어. 24시간이 되기 전에 끝내자.</div></div>
            <div class="kakao-row"><img src="/assets/mascot-meomuri.webp" alt=""><div class="kakao-bubble">시간 지나면 내가 쿠폰을 접을게. 조회만으로는 안 돼.</div></div>
          </div>
        </div>
      </div>
    </div></section>
    <section class="kakao-section"><div class="wrap">
      <span class="eyebrow">캐릭터 역할</span>
      <h2>누가 무엇을 보내나</h2>
      <div class="kakao-cast">${CAST.map((c) => `<article><img src="${c.img}" alt="${h(c.name)}"><h3>${h(c.name)}</h3><p>${h(c.job)}</p></article>`).join('')}</div>
    </div></section>
    <section class="kakao-section" id="kakao-copy" style="background:#fffaf0"><div class="wrap">
      <span class="eyebrow">운영 초안</span>
      <h2>카카오 채널에 붙여 넣을 문장</h2>
      <p>카카오는 외부에서 쿠폰을 원격 발행하는 API가 없습니다. 채널 메시지·쿠폰형 카드에 아래 문구와 숙소 링크를 넣습니다.</p>
      <div class="kakao-grid">${COPIES.map((c) => `<article class="kakao-card"><h3>${h(c.title)}</h3><pre class="kakao-copybox" id="copy-${c.id}">${h(c.text)}</pre><button type="button" class="kakao-copy-btn" data-copy="copy-${c.id}">문구 복사</button></article>`).join('')}</div>
    </div></section>
    <section class="kakao-section"><div class="wrap">
      <span class="eyebrow">지금 쓸 링크</span>
      <h2>채널에서 보낼 숙소</h2>
      <p>링크 끝에 <code>?deal=kakao</code>를 붙이면 숙소 페이지가 18시간 타임딜을 바로 시작합니다.</p>
      <div class="kakao-stays">${stayCards}</div>
    </div></section>
    <section class="kakao-section" style="background:#f4f1ea"><div class="wrap kakao-grid">
      <div>
        <span class="eyebrow">채널 만드는 순서</span>
        <h2>카카오톡 채널 운영</h2>
        <ol class="kakao-ops">
          <li>카카오 비즈니스에서 채널명 <strong>여행갈지도</strong>, 프로필은 길별이 이미지로 개설합니다.</li>
          <li>웰컴 메시지에 쿠폰도깨비 환영 초안을 넣고, 메뉴 버튼을 <strong>18시간 타임딜</strong>로 둡니다.</li>
          <li>쿠폰형 메시지 랜딩 URL은 <code>/stay/{숙소ID}?deal=kakao</code> 입니다.</li>
          <li>채널 공개 주소를 받으면 <code>NEXT_PUBLIC_KAKAO_CHANNEL_URL</code>에만 넣고, 토큰은 저장소에 두지 않습니다.</li>
          <li>주 1회 월요일 드롭은 쿠폰도깨비, 평일 리마인드는 지도도령, 만료 안내는 머무리가 보냅니다.</li>
        </ol>
      </div>
      <div>
        <span class="eyebrow">왜 18시간인가</span>
        <h2>아고다 추적 보호</h2>
        <p class="kakao-note">아고다 제휴는 예약 동기화가 약 24시간 주기이고, 라스트클릭 쿠키도 하루 단위로 만료되는 사례가 있습니다. 숙소를 열어 두고 다음 날 결제하면 우리 링크가 지워져 수수료가 사라질 수 있습니다. 쿠폰 효력을 조회 후 18시간·결제 완료까지로 못 박아, 추적 창 안에서만 5,000원 리베이트가 살도록 했습니다. 5,000원은 수수료 4% 기준 약 15만 원 이상 결제에서만 마진이 남습니다. 아고다 요금 자체를 깎는 코드가 아닙니다.</p>
      </div>
    </div></section>`;
  }

  function bindKakaoPage() {
    document.querySelectorAll('[data-copy]').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', async () => {
        const node = document.getElementById(btn.getAttribute('data-copy') || '');
        try {
          await navigator.clipboard.writeText(node?.textContent || '');
          btn.textContent = '복사했습니다';
        } catch {
          btn.textContent = '직접 드래그해 복사';
        }
      });
    });
    fetch('/api/deals', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const add = document.getElementById('kakaoAddBtn');
        if (add && data.channel_url) {
          add.href = data.channel_url;
          add.textContent = '카카오 채널 추가';
          add.target = '_blank';
          add.rel = 'noopener noreferrer';
        }
      })
      .catch(() => {});
  }

  window.travelKakaoPageHtml = kakaoPageHtml;
  window.travelKakaoBind = bindKakaoPage;
})();
