(() => {
  'use strict';
  const root = document.getElementById('timeDealRoot');
  if (!root) return;

  const stayId = root.getAttribute('data-stay-id') || '';
  const source = root.getAttribute('data-source') || 'stay';
  const clock = document.getElementById('dealClock');
  const startBtn = document.getElementById('dealStartBtn');
  const bookBtn = document.getElementById('dealBookBtn');
  const statusEl = document.getElementById('dealStatus');
  const toast = document.getElementById('detailToast');
  let deal = null;
  let timer = 0;

  function notify(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2600);
  }

  function fmt(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return h + ':' + m + ':' + sec;
  }

  function paint() {
    if (!deal) {
      if (clock) clock.textContent = '18:00:00';
      if (startBtn) startBtn.hidden = false;
      if (bookBtn) bookBtn.hidden = true;
      return;
    }
    const dead = deal.status === 'expired' || deal.remaining_ms <= 0;
    if (clock) {
      clock.textContent = dead ? '만료' : fmt(deal.remaining_ms);
      clock.classList.toggle('deal-dead', dead);
    }
    if (startBtn) startBtn.hidden = !dead;
    if (bookBtn) {
      bookBtn.hidden = dead;
      bookBtn.disabled = dead;
    }
    if (statusEl) {
      statusEl.textContent = dead
        ? '18시간이 지나 쿠폰이 꺼졌습니다. 아고다 추적이 끊기기 전에 결제하지 않으면 수수료가 정산되지 않습니다.'
        : '남은 시간 안에 아고다에서 예약 결제까지 완료하세요. 조회만으로는 효력이 없습니다.';
    }
  }

  function tick() {
    if (!deal || deal.status === 'expired') return;
    deal.remaining_ms = Math.max(0, deal.remaining_ms - 1000);
    if (deal.remaining_ms <= 0) deal.status = 'expired';
    paint();
  }

  async function api(path, body) {
    const opt = body
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) }
      : { credentials: 'include' };
    const res = await fetch(path, opt);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || '요청에 실패했습니다.');
    return data;
  }

  async function refresh() {
    const data = await api('/api/deals?stay_id=' + encodeURIComponent(stayId));
    deal = data.current || null;
    paint();
    return data;
  }

  async function startDeal() {
    const data = await api('/api/deals/start', { stay_id: stayId, source: /deal=kakao|src=kakao/.test(location.search) ? 'kakao' : source });
    deal = data.deal;
    paint();
    notify('18시간 타임딜이 시작됐습니다.');
  }

  async function bookDeal(event) {
    if (event) event.preventDefault();
    try {
      const data = await api('/api/deals/click', { stay_id: stayId });
      deal = data.deal;
      paint();
      const popup = window.open(data.book_url, 'agodaBooking', 'width=1280,height=860,menubar=yes,toolbar=yes,scrollbars=yes,resizable=yes');
      if (popup) try { popup.opener = null; } catch {}
    } catch (err) {
      notify(err instanceof Error ? err.message : '만료된 쿠폰입니다.');
      refresh().catch(() => {});
    }
  }

  startBtn?.addEventListener('click', () => startDeal().catch((err) => notify(err.message)));
  bookBtn?.addEventListener('click', bookDeal);

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-agoda-book], .js-agoda-book');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
    if (!deal || deal.status === 'expired' || deal.remaining_ms <= 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    bookDeal();
  }, true);

  refresh()
    .then((data) => {
      const auto = /[?&](deal|src)=kakao/.test(location.search);
      if (auto && !data.current) return startDeal();
    })
    .catch(() => {
      if (statusEl) statusEl.textContent = '타임딜 서버를 아직 연결하지 못했습니다. 마이그레이션 후 다시 시도해 주세요.';
    });
  timer = window.setInterval(tick, 1000);
})();
