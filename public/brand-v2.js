/* Stable non-visual brand metadata: preserves all existing application interactions. */
(()=>{const routeNames={home:'홈',discover:'숙소 탐색',map:'내 주변',images:'숙소 사진',journal:'여행 저널',shorts:'여행 영상',events:'숙박 할인 행사',weekly:'주간 여행',coupons:'쿠폰',compare:'숙소 비교',saved:'저장 숙소',pricing:'광고 요금',merchant:'파트너 콘솔',about:'서비스 안내',privacy:'개인정보 안내'};
 function sync(){const route=(location.hash.slice(1).split('?')[0]||'home');document.title=`${routeNames[route]||'여행갈지도'} | 여행갈지도`;document.querySelectorAll('.mobile-nav a').forEach(el=>{const active=el.hash==='#'+route;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')})}
 document.addEventListener('DOMContentLoaded',sync);window.addEventListener('hashchange',sync);})();
