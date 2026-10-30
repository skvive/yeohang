/* YEOHAENG GALJIDO verified-terms promotion UX. No invented live discounts. */
(()=>{
 const $=s=>document.querySelector(s);
 const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
 const won=n=>Number(n).toLocaleString('ko-KR')+'원';
 const theme={weekly:['✦','매주 여행','/assets/mascot-coupon-goblin.webp'],welcome:['✦','첫 여행','/assets/listing-1.webp'],weekday:['☀','평일 여행','/assets/listing-2.webp'],region:['⌖','로컬 여행','/assets/listing-3.webp'],referral:['♡','친구 초대','/assets/listing-4.webp'],longstay:['☾','연박 여행','/assets/listing-6.webp'],partner:['✧','파트너 혜택','/assets/listing-7.webp']};
 const card=c=>{
   const t=theme[c.campaign_type]||theme.partner;
   const rate=c.discount_kind==='fixed'?won(c.discount_value):c.discount_value+'%';
   const proof=c.verified_benefit?'운영 승인 행사':'체험 전용 · 실제 할인 불가';
   const button=c.campaign_type==='referral'?'<button class="promo-btn promo-btn-muted" data-promo-referral type="button">초대 프로그램 안내</button>':`<button class="promo-btn" data-promo-claim="${esc(c.id)}" ${c.claimable?'':'disabled'}> ${c.demo_only?'체험 쿠폰 받기':'할인권 받기'} <span aria-hidden="true">↗</span></button>`;
   return `<article class="promo-card" aria-label="${esc(c.title)}"><div class="promo-card-photo" style="background-image:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.28)),url('${esc(t[2])}')"><span class="promo-card-tag">${esc(t[0])} ${esc(t[1])}</span><span class="promo-img-trust">인공지능 콘셉트 · 실제 숙소 사진 아님</span></div><div class="promo-card-content"><span class="promo-state ${c.verified_benefit?'active':''}">${esc(proof)}</span><h3>${esc(c.title)}</h3><p>${esc(c.subtitle)}</p><div class="promo-amount">${rate}<small> ${c.discount_kind==='percent'&&c.cap_krw?'최대 '+won(c.cap_krw):'제안 혜택'}</small></div><dl class="promo-rule"><div><dt>최소 예시 숙박금액</dt><dd>${won(c.min_spend)}</dd></div><div><dt>최소 숙박</dt><dd>${c.min_nights}박</dd></div><div><dt>대상 지역</dt><dd>${esc(c.city||'전국 제안')}</dd></div><div><dt>발급 기간</dt><dd>${esc(c.valid_from)} ~ ${esc(c.valid_until)}</dd></div></dl><div class="promo-actions">${button}<button class="promo-ghost" data-promo-preview="${esc(c.id)}" type="button">조건 계산</button></div>${c.verified_benefit&&c.terms_url?`<a class="promo-terms" href="${esc(c.terms_url)}" target="_blank" rel="noopener noreferrer">공식 행사 이용 조건 ↗</a>`:'<p class="promo-terms">숙소·할인 재원 승인 전 · 실제 결제 불가</p>'}</div></article>`;
 };
 async function request(path,body,adminKey=''){
  const auth=await fetch('/api/auth/status',{credentials:'same-origin'}).then(x=>x.json()).catch(()=>({}));
  const opts={method:body?'POST':'GET',credentials:'same-origin',headers:{}};
  if(body){opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(body);if(auth.csrf)opts.headers['X-CSRF-Token']=auth.csrf;}
  if(adminKey)opts.headers['X-Admin-Token']=adminKey;
  const r=await fetch(path,opts);let j={};try{j=await r.json()}catch{};if(!r.ok)throw new Error(j.error||'요청을 처리할 수 없습니다.');return j;
 }
 const info=(html,kind='normal')=>{const box=$('#promoResult');if(box){box.className='promo-result '+kind;box.innerHTML=html;box.scrollIntoView({behavior:'smooth',block:'nearest'})}};
 let campaigns=[];
 window.meomulPromoLoad=async()=>{
   const slot=$('#promoCards');if(!slot)return;
   try{
     const d=await request('/api/promos');campaigns=d.campaigns;
     slot.innerHTML=campaigns.length?campaigns.map(card).join(''):'<div class="promo-empty">현재 승인된 행사가 없습니다. 새로운 숙소 혜택을 준비하고 있습니다.</div>';
     if(d.demo_mode){const elem=$('#promoDemoNotice');if(elem)elem.hidden=false;}
   }catch(e){slot.innerHTML='<div class="promo-empty">'+esc(e.message)+'</div>'}
 };
 const getCampaign=id=>campaigns.find(x=>x.id===id);
 const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'});
 const inputOpen=(title,markup)=>{
   const b=$('#promoModal');if(!b)return;
   b.querySelector('.promo-modal-content').innerHTML='<h2>'+esc(title)+'</h2>'+markup;
   b.hidden=false;document.body.classList.add('promo-modal-active');b.querySelector('input,button,select')?.focus();
 };
 const close=()=>{const b=$('#promoModal');if(b){b.hidden=true;document.body.classList.remove('promo-modal-active')}};
 document.addEventListener('click',e=>{
   const b=e.target.closest('[data-promo-claim]');if(b){
      const c=getCampaign(b.dataset.promoClaim);if(!c)return;
      inputOpen('여행 할인권 발급',`<p class="promo-modal-lead"><strong>${esc(c.title)}</strong> · ${c.demo_only?'체험용 코드가 발급되며 실제 숙박 할인에는 적용되지 않습니다.':'구글 로그인으로 확인한 계정에 발급됩니다.'}</p><form id="promoClaimForm" data-campaign="${esc(c.id)}"><label>이메일 주소<input type="email" required name="email" autocomplete="email" placeholder="이메일 주소" maxlength="180"></label><label class="promo-consent"><input type="checkbox" name="privacy_consent" required><span>쿠폰 발급 및 중복 확인을 위한 이메일 처리에 동의합니다. 해시 처리된 이메일로 발급 이력을 관리하며, 마케팅 수신 동의는 포함되지 않습니다.</span></label><button class="promo-btn" type="submit">${c.demo_only?'체험 코드 발급':'이용 조건 확인 후 발급'}</button></form><p class="promo-terms">본인 인증과 업소별 조건 확인이 필요합니다. 코드는 타인에게 전달하지 마세요.</p>`);return;
   }
   const calc=e.target.closest('[data-promo-preview]');if(calc){const c=getCampaign(calc.dataset.promoPreview);if(!c)return;inputOpen('예상 혜택 계산',`<p class="promo-modal-lead">${esc(c.title)} · 아래 금액은 실제 숙박요금이 아닌 계산용 가상 금액입니다.</p><form id="promoCalcForm" data-campaign="${esc(c.id)}"><label>예시 총 숙박금액(원)<input required type="number" name="sample_amount" value="220000" min="0" max="30000000" step="1000"></label><label>숙박일수<select name="nights"><option value="1">1박</option><option value="2">2박</option><option value="3">3박</option><option value="4">4박</option></select></label><label>여행 지역<select name="city">${['서울','부산','제주','전주','경주','강릉','가평'].map(t=>`<option value="${t}" ${c.city===t?'selected':''}>${t}</option>`).join('')}</select></label><label>체크인 날짜<input type="date" name="checkin" value="${today()}"></label><button class="promo-btn" type="submit">할인 예시 계산</button></form><div id="promoCalcResult" aria-live="polite" class="promo-calculated"></div>`);return}
   if(e.target.closest('[data-promo-referral]')){inputOpen('친구 초대 혜택 안내','<p class="promo-modal-lead">초대한 사람과 초대받은 사람이 각각 혜택을 받는 프로그램을 기획 중입니다. 가입 및 실제 예약 확인, 부정 사용 차단이 완료되기 전에는 쿠폰을 발급하지 않습니다.</p><button class="promo-btn" id="promoShare" type="button">행사 페이지 공유하기</button>');return}
   if(e.target.closest('#promoShare')){const url=location.origin+'/#events';if(navigator.share)navigator.share({title:'여행갈지도 숙박 혜택',url}).catch(()=>{});else navigator.clipboard?.writeText(url).then(()=>alert('행사 페이지 링크를 복사했습니다.'));return}
   if(e.target.closest('[data-promo-close]')){close();return}
   if(e.target.closest('#promoAdminLoad')){const pass=$('#promoAdminKey')?.value||'';request('/api/promos/admin',undefined,pass).then(r=>{
    window.__promoAdminToken=pass;$('#promoAdminResult').innerHTML=`<div class="promo-admin-grid">${r.campaigns.map(c=>`<div class="promo-admin-item"><strong>${esc(c.title)}</strong><span>${esc(c.status)} · ${c.claimed_count}건 발급</span><button data-promo-admin-action="pause" data-promo-admin-id="${esc(c.id)}" type="button">일시정지</button><button data-promo-admin-action="activate" data-promo-admin-id="${esc(c.id)}" type="button">승인 조건 확인 후 활성화</button></div>`).join('')}</div><div class="promo-admin-forms"><form id="promoAdminCreate"><h3>신규 숙소 캠페인 신청</h3><p>숙소 인증이 확인된 계정만 등록할 수 있으며 초안 상태로 저장됩니다.</p><input name="property_id" required placeholder="숙소 ID"><input name="title" required placeholder="행사 제목"><input name="subtitle" required placeholder="혜택 설명"><select name="campaign_type"><option value="weekly">이번 주 혜택</option><option value="weekday">평일특가</option><option value="region">지역 여행</option><option value="longstay">연박 혜택</option><option value="partner">제휴 단독딜</option><option value="welcome">웰컴딜</option></select><select name="discount_kind"><option value="fixed">금액 할인(원)</option><option value="percent">할인율(%)</option></select><input name="discount_value" type="number" required min="1" value="10000" placeholder="할인 금액·비율"><input name="cap_krw" type="number" min="0" value="0" placeholder="최대 할인금액"><input name="min_spend" type="number" min="0" value="120000" placeholder="최소 예약금액"><input name="min_nights" type="number" min="1" value="1" placeholder="최소 숙박일"><input name="total_claims" type="number" min="1" value="100" placeholder="발급 수량"><label>발급 시작일<input required name="valid_from" type="date"></label><label>발급 종료일<input required name="valid_until" type="date"></label><button class="promo-btn" type="submit">행사 초안 제출</button></form><form id="promoAdminApprove"><h3>할인 재원 및 약관 확인</h3><p>승인 근거를 확보한 후 초안 캠페인만 승인할 수 있습니다.</p><input name="id" required placeholder="신규 캠페인 ID"><input name="funded_by" required placeholder="할인 재원 부담자"><input name="terms_url" type="url" required placeholder="https://... 행사 약관"><label class="promo-consent"><input type="checkbox" required name="funding_approved">할인 재원과 행사 운영에 대한 서면 동의를 확인했습니다.</label><button class="promo-btn" type="submit">승인 정보 저장</button></form></div>`;
   }).catch(err=>alert(err.message));return}
   const a=e.target.closest('[data-promo-admin-action]');if(a){if(!confirm('행사 상태를 변경하시겠습니까?'))return;request('/api/promos/admin/save',{id:a.dataset.promoAdminId,action:a.dataset.promoAdminAction},window.__promoAdminToken||'').then(()=>{$('#promoAdminLoad').click();window.meomulPromoLoad()}).catch(err=>alert(err.message));return}
 });
 document.addEventListener('submit',async e=>{
   if(!['promoClaimForm','promoCalcForm','promoAdminCreate','promoAdminApprove'].includes(e.target.id))return;
   e.preventDefault();const f=e.target;const form=new FormData(f);const id=f.dataset.campaign;
   const button=f.querySelector('button[type="submit"]');button.disabled=true;
   try{
     if(f.id==='promoAdminCreate'){
       const b=Object.fromEntries(form.entries());for(const k of ['discount_value','cap_krw','min_spend','min_nights','total_claims'])b[k]=Number(b[k]);
       const result=await request('/api/promos/admin/create',b,window.__promoAdminToken||'');alert('초안 등록: '+result.campaign_id+' · 승인 전에는 고객에게 노출되지 않습니다.');f.reset();$('#promoAdminLoad')?.click();
     }else if(f.id==='promoAdminApprove'){
       const b=Object.fromEntries(form.entries());b.funding_approved=form.has('funding_approved');
       await request('/api/promos/admin/configure',b,window.__promoAdminToken||'');alert('승인 근거를 등록했습니다. 별도로 활성화해야 노출됩니다.');$('#promoAdminLoad')?.click();
     }else if(f.id==='promoClaimForm'){
       const result=await request('/api/promos/claim',{campaign_id:id,email:String(form.get('email')||''),privacy_consent:form.has('privacy_consent')});
       f.replaceWith(document.createRange().createContextualFragment(`<div class="promo-success" role="status"><span>✓ 발급 완료</span><h3>${esc(result.title)}</h3><div class="promo-code" id="promoCodeValue">${esc(result.code)}</div><p>${esc(result.notice)}</p><p>기간: ${esc(result.valid_until)}까지</p><button type="button" class="promo-ghost" id="promoCopyCode">코드 복사</button><a href="/#discover" class="promo-btn promo-link-btn">숙소 둘러보기 ↗</a></div>`));
     }else{
       const data=await request('/api/promos/preview',{campaign_id:id,sample_amount:Number(form.get('sample_amount')),nights:Number(form.get('nights')),city:String(form.get('city')||''),checkin:String(form.get('checkin')||'')});
       const target=$('#promoCalcResult');target.innerHTML=data.eligible?`<strong>예시 할인금액 ${won(data.discount_krw)}</strong><p>가상 적용 후 금액 ${won(data.amount_after)}</p><small>${esc(data.notice)}</small>`:`<p class="promo-calc-error">조건 미충족: ${esc(data.reason)}</p><small>${esc(data.notice)}</small>`;
     }
   }catch(err){alert(err.message)}finally{button.disabled=false;}
 });
 document.addEventListener('click',e=>{if(e.target.closest('#promoCopyCode')){const code=$('#promoCodeValue')?.textContent||'';navigator.clipboard?.writeText(code).then(()=>alert('코드를 복사했습니다.'))}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#promoModal')&&!$('#promoModal').hidden)close()});
})();
