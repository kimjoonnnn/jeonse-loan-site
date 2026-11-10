document.documentElement.classList.add('js');

/* ───────── 카카오톡 채널 ─────────
   채널을 만든 뒤 아래 한 줄만 바꾸면 사이트의 모든 카톡 버튼이 연결됩니다.
   채널 관리자센터 > 채널 URL 이 https://pf.kakao.com/_AbCdE 라면 '_AbCdE' 를 넣으세요. */
const KAKAO_CHANNEL = '_XXXXXX';
const KAKAO_READY = !/X{4,}/.test(KAKAO_CHANNEL);
const kakaoUrl = (kind) => `https://pf.kakao.com/${KAKAO_CHANNEL}/${kind}`;
document.querySelectorAll('[data-kakao]').forEach((a) => { a.href = kakaoUrl(a.dataset.kakao); });

/* ───────── 진단기 ─────────
   규정 수치는 research 자료(2026-11-09 기준)에서 가져옴. 규정이 바뀌면 RESULTS만 고치면 됨. */
const Q = {
  start: { q: '어떤 돈이 필요하세요?', opts: [
    { t: '세입자에게 돌려줄 보증금', s: '집주인 · 전세퇴거자금', go: 'owner', set: { who: '집주인' } },
    { t: '내가 들어갈 집 전세자금', s: '집이 있는 세입자 · 전세대출', go: 't_count', set: { who: '세입자' } },
  ]},
  owner: { q: '집 명의는 누구인가요?', opts: [
    { t: '개인', go: 'l_region', set: { name: '개인' } },
    { t: '임대사업자 또는 법인', s: '등록 임대사업자(개인) 포함', go: 'b_region', set: { name: '임대사업자·법인' } },
  ]},
  l_region: { q: '보증금을 돌려줄 집은 어디에 있나요?', opts: [
    { t: '서울', go: 'l_count', set: { region: '서울' } },
    { t: '경기 · 인천', go: 'l_count', set: { region: '경기·인천' } },
    { t: '그 외 지역', go: 'R_local', set: { region: '지방' } },
  ]},
  l_count: { q: '서울·경기·인천에 집이 몇 채인가요?', hint: '부부 합산, 이 집 포함', opts: [
    { t: '1채', go: 'l_lease', set: { count: '1채' } },
    { t: '2채 이상', go: 'R_multi', set: { count: '2채 이상' } },
  ]},
  l_lease: { q: '지금 세입자와 계약한 날은 언제인가요?', hint: '계약갱신청구권으로 갱신했다면 처음 계약일 기준', opts: [
    { t: '2023년 7월 3일 이전', go: 'l_owner', set: { lease: '2023.7.3 이전' } },
    { t: '2023년 7월 4일 ~ 2025년 6월 27일', go: 'l_owner', set: { lease: '2023.7.4–2025.6.27' } },
    { t: '2025년 6월 28일 이후', go: 'R_cap', set: { lease: '2025.6.28 이후' } },
  ]},
  l_owner: { q: '그 계약 중간에 집을 사셨나요?', hint: '세입자가 사는 상태로 매수했는지', opts: [
    { t: '아니요, 계약 전부터 내 집', go: 'R_over', set: { changed: '아니요' } },
    { t: '네, 계약 중에 샀습니다', go: 'R_cap', set: { changed: '예' } },
  ]},
  b_region: { q: '그 집은 어디에 있나요?', opts: [
    { t: '서울', go: 'R_biz', set: { region: '서울' } },
    { t: '경기 · 인천', go: 'R_biz', set: { region: '경기·인천' } },
    { t: '그 외 지역', go: 'R_biz', set: { region: '지방' } },
  ]},
  t_count: { q: '부부 합산으로 집이 몇 채인가요?', opts: [
    { t: '없음', go: 'R_t_none', set: { count: '무주택' } },
    { t: '1채', go: 't_region', set: { count: '1채' } },
    { t: '2채 이상', go: 'R_t_multi', set: { count: '2채 이상' } },
  ]},
  t_region: { q: '가진 집은 어디에 있나요?', opts: [
    { t: '서울 · 경기 · 인천', go: 't_type', set: { region: '수도권' } },
    { t: '그 외 지역', go: 'R_t_local', set: { region: '지방' } },
  ]},
  t_type: { q: '그 집은 아파트인가요?', opts: [
    { t: '아파트', go: 't_lived', set: { type: '아파트' } },
    { t: '빌라 · 오피스텔 · 단독 등', go: 'R_t_metro', set: { type: '아파트 외' } },
  ]},
  t_lived: { q: '부부 중 한 명이라도 그 집에 살아 본 적이 있나요?', opts: [
    { t: '있습니다', go: 'R_t_metro', set: { lived: '있음' } },
    { t: '없습니다', s: '처음부터 세를 줬음', go: 'R_t_2027', set: { lived: '없음' } },
  ]},
};

const RESULTS = {
  R_local: () => ({ v: 'go', label: '진행 검토 가능', title: '1억 상한 없이 담보와 소득으로 한도가 나옵니다',
    rows: [['상한 없음', '수도권·규제지역이 아니면 한도는 금융사가 정합니다'], ['DSR 50%', '2금융권 기준 (은행 40%)'], ['3.6억', '주택 6억 이하·부부 소득 7천만 원 이하라면 보금자리론 반환 용도도 가능']] }),
  R_multi: () => ({ v: 'no', label: '원칙상 어려움', title: '수도권 2주택 이상은 반환 목적 주담대가 막혀 있습니다',
    rows: [['불가', '수도권·규제지역 2주택 이상 생활안정자금 주담대 (2025.6.28 시행)'], ['확인', '분양권·상속·인구감소지역 주택처럼 주택 수에서 빠지는 집이 있는지'], ['확인', '지방에 있는 주택을 담보로 쓸 수 있는지']],
    cta: '카톡으로 대안 묻기' }),
  R_cap: (a) => ({ v: 'maybe', label: '1억까지 가능', title: '수도권 1주택은 1억이 상한입니다',
    rows: [['1억', '기존 생활안정자금 대출과 합산한 금액'], ['LTV 40%', '서울 등 규제지역 기준 · 경기·인천 비규제지역은 금융사 확인'], ['함께 검토', '주택금융공사 반환자금보증, 보금자리론 반환 용도(주택 6억 이하)']],
    note: a.changed === '예' ? '계약 중에 집주인이 바뀌면 6·27 이전 계약 예외를 인정받지 못한다는 해석이 있습니다. 금융사 확인이 필요합니다.' : '' }),
  R_over: (a) => ({ v: 'go', label: '1억 초과 검토 대상', title: '6·27 이전 계약이라 1억을 넘겨 심사받을 수 있습니다',
    rows: [['5개 요건', '자력 반환 불가, 반환에만 사용, 입주 시 1개월 내 전입·2년 거주 등'], ['LTV · DSR', '담보가치와 소득 중 낮은 쪽이 한도']]
      .concat(a.lease === '2023.7.3 이전' ? [['DTI 60%', '2023.7.3 이전 계약이라 DSR 대신 적용 가능 (은행권 특례, 특례전세지킴보증 가입)']] : []),
    note: '요건을 어기면 대출을 바로 갚아야 할 수 있습니다.' }),
  R_biz: (a) => ({ v: 'maybe', label: '반환 목적 예외 대상', title: '임대사업자·법인도 기존 세입자 반환 목적이면 가능합니다',
    rows: [[a.region === '서울' ? 'LTV 30%' : a.region === '지방' ? 'LTV 60%' : '30% / 60%', a.region === '경기·인천' ? '규제지역이면 30%, 아니면 60%' : '반환 목적 예외 한도'],
      ['RTI 1.25배', '연 임대소득이 대출 이자의 1.25배 이상 (주택 기준)'],
      ['주의', '수도권·규제지역 아파트는 만기연장 불가 (2026.4.17 시행), 의무임대기간 종료일까지는 예외']] }),
  R_t_none: () => ({ v: 'go', label: '일반 전세대출 대상', title: '무주택이면 유주택자 규제가 적용되지 않습니다',
    rows: [['80%', '전세보증금의 최대 80% 이내 (전세금담보대출 기준)'], ['확인', '소득과 신용(NICE 800점 이상)으로 실제 한도가 정해집니다']] }),
  R_t_multi: () => ({ v: 'no', label: '원칙상 불가', title: '부부 합산 2주택 이상은 전세보증이 나오지 않습니다',
    rows: [['불가', '주택금융공사·주택도시보증공사·서울보증 모두 원칙상 불가'], ['재진단', '한 채를 처분해 1주택이 되면 다시 가능 · 제휴 금융사 취급 여부는 상담에서 확인'], ['다른 길', '세놓은 집의 보증금 반환대출이 필요하다면 집주인으로 진단']],
    cta: '카톡으로 처분 계획 묻기', alt: { t: '집주인으로 다시 진단', go: 'owner', set: { who: '집주인' } } }),
  R_t_local: () => ({ v: 'go', label: '가능', title: '지방에 집 1채면 2억까지 검토합니다',
    rows: [['2억', '1주택자 전세금담보대출 한도 (DSR 반영)'], ['80%', '전세보증금의 80% 이내'], ['확인', '소득과 신용으로 실제 한도 결정']] }),
  R_t_metro: () => ({ v: 'maybe', label: '가능, 한도 제한', title: '수도권 1주택자는 2억까지, 이자가 DSR에 들어갑니다',
    rows: [['2억', '1주택자 전세금담보대출 한도 (DSR 반영)'], ['이자 반영', '전세대출 이자를 DSR에 포함 (2025.10.29 시행)'], ['제한', '규제지역 3억 초과 아파트를 취득했다면 취급 제한']] }),
  R_t_2027: () => ({ v: 'maybe', label: '올해 안에 진행해야 합니다', title: '세놓은 수도권 아파트에 산 적이 없으면 2027년부터 막힙니다',
    rows: [['12.31', '2026년 12월 31일까지 계약·계약금 납부 또는 대출 신청한 건은 종전 규정'], ['2억', '지금 기준 1주택자 한도 (DSR 반영)'], ['예외', '세입자가 부모·자녀인 경우, 실거주 의무가 예정된 경우 등']] }),
};

const body = document.getElementById('quizBody');
const foot = document.getElementById('quizFoot');
const back = document.getElementById('quizBack');
const title = document.getElementById('quizTitle');
const STEPS = 6;
let path = [];      // [{node, ans}]
let answers = {};
let lastResult = null;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function bar(n) {
  foot.innerHTML = Array.from({ length: STEPS }, (_, i) => `<span class="${i < n ? 'on' : ''}"></span>`).join('');
}

function show(id) {
  back.hidden = path.length === 0;
  if (id.startsWith('R_')) return showResult(id);
  const n = Q[id];
  title.textContent = '가능 여부 진단';
  body.innerHTML = `<p class="quiz__q">${n.q}</p>${n.hint ? `<p class="quiz__hint">${n.hint}</p>` : ''}
    <div class="opts">${n.opts.map((o, i) => `<button type="button" class="opt" data-i="${i}">${o.t}${o.s ? `<small>${o.s}</small>` : ''}</button>`).join('')}</div>`;
  body.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => {
    const o = n.opts[+b.dataset.i];
    path.push({ node: id, set: o.set });
    Object.assign(answers, o.set);
    show(o.go);
  }));
  bar(path.length + 1);
  current = id;
}

function summary() {
  const a = answers;
  return [a.who, a.name, a.region, a.count && `${a.count}`, a.type, a.lease && `계약 ${a.lease}`, a.changed === '예' && '계약 중 매수', a.lived && `실거주 ${a.lived}`]
    .filter(Boolean).join(' · ');
}

function showResult(id) {
  const r = RESULTS[id](answers);
  lastResult = { id, ...r };
  title.textContent = '진단 결과';
  body.innerHTML = `<span class="verdict verdict--${r.v}">${r.label}</span>
    <p class="res__title">${r.title}</p>
    <ul class="res__rows">${r.rows.map(([b, t]) => `<li><b>${b}</b><span>${t}</span></li>`).join('')}</ul>
    <div class="res__cta"><a class="btn btn--kakao" data-kakao="chat" data-copy href="${kakaoUrl('chat')}" target="_blank" rel="noopener">${r.cta || '카카오톡으로 이 결과 상담'}</a>
    <button type="button" class="linklike res__alt" id="toConsult">전화번호 남기기</button>
    ${r.alt ? `<button type="button" class="linklike res__alt" id="altPath">${r.alt.t}</button>` : ''}</div>
    ${r.note ? `<p class="res__note">${r.note}</p>` : ''}
    <p class="res__note">${esc(summary())} · 2026.11.9 규정 기준, 실제 한도는 금융사 심사로 정해집니다.</p>`;
  bar(STEPS);
  document.getElementById('toConsult').addEventListener('click', carryToConsult);
  document.getElementById('altPath')?.addEventListener('click', () => {
    path.push({ node: id, set: r.alt.set });
    answers = { ...r.alt.set };
    show(r.alt.go);
  });
}

let current = 'start';
back.addEventListener('click', () => {
  const prev = path.pop();
  answers = {};
  path.forEach((p) => Object.assign(answers, p.set));
  show(prev ? prev.node : 'start');
});

function diagnosisText() {
  return lastResult ? `${lastResult.label} — ${summary()}` : '';
}
function carryToConsult() {
  const text = diagnosisText();
  document.getElementById('diagnosis').value = text;
  const carry = document.getElementById('carry');
  carry.textContent = `함께 전달되는 진단 결과: ${text}`;
  carry.hidden = false;
  document.getElementById('consult').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  setTimeout(() => document.getElementById('phone').focus({ preventScroll: true }), 500);
}

show('start');

/* ───────── 탭 (상황별 기준 · 상품 안내) ───────── */
document.querySelectorAll('[role="tablist"]').forEach((list) => {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const selectTab = (t) => tabs.forEach((x) => {
    const on = x === t;
    x.setAttribute('aria-selected', on);
    x.tabIndex = on ? 0 : -1;
    document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
  });
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', (e) => {
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      const n = tabs[(i + d + tabs.length) % tabs.length];
      n.focus();
      selectTab(n);
    });
  });
});

/* ───────── 상담 신청 (본문 폼 · 하단 고정 폼 공통) ───────── */
const fmtPhone = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.length < 4 ? d : d.length < 8 ? `${d.slice(0, 3)}-${d.slice(3)}` : `${d.slice(0, 3)}-${d.slice(3, d.length - 4)}-${d.slice(-4)}`;
};
document.querySelectorAll('.js-lead').forEach((f) => {
  const tel = f.querySelector('.js-phone');
  const note = f.querySelector('.js-msg');
  const btn = f.querySelector('button[type="submit"]');
  const label = btn.textContent;
  tel.addEventListener('input', () => { tel.value = fmtPhone(tel.value); });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nm = f.elements.namedItem('name');
    if (nm && !nm.value.trim()) { note.textContent = '성함을 입력해 주세요.'; nm.focus(); return; }
    if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(tel.value)) { note.textContent = '휴대폰 번호를 확인해 주세요.'; tel.focus(); return; }
    if (!f.agree.checked) { note.textContent = '개인정보 수집·이용에 동의해야 신청할 수 있습니다.'; f.agree.focus(); return; }
    f.querySelector('.js-diagnosis').value = diagnosisText();
    // TODO: action에 접수처 연결 (Google Apps Script → 시트, Formspree 등)
    if (!f.getAttribute('action')) { note.textContent = '접수처가 아직 연결되지 않았습니다. (오픈 전 설정)'; return; }
    btn.disabled = true; btn.textContent = '보내는 중';
    try {
      const res = await fetch(f.action, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error();
      f.reset();
      note.textContent = '접수됐습니다. 영업일 기준 당일 전화드립니다.';
    } catch {
      note.textContent = '전송에 실패했습니다. 전화나 카카오톡으로 연락 주세요.';
    } finally { btn.disabled = false; btn.textContent = label; }
  });
});

/* 모바일: 하단 바 [상담신청]으로 고정 폼 열기 */
const quick = document.getElementById('quick');
const quickOpen = document.getElementById('quickOpen');
const setQuick = (on) => {
  quick.classList.toggle('open', on);
  quickOpen.setAttribute('aria-expanded', String(on));
  if (on) setTimeout(() => document.getElementById('qName').focus({ preventScroll: true }), 150);
};
quickOpen.addEventListener('click', () => setQuick(!quick.classList.contains('open')));
document.getElementById('quickClose').addEventListener('click', () => setQuick(false));
document.querySelectorAll('.js-quick').forEach((b) => b.addEventListener('click', () => {
  if (matchMedia('(max-width:900px)').matches) setQuick(true);
  else { quick.classList.add('flash'); setTimeout(() => quick.classList.remove('flash'), 900); document.getElementById('qName').focus(); }
}));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && quick.classList.contains('open')) setQuick(false); });

document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => document.getElementById(b.dataset.open).showModal()));

/* ───────── 등장 모션 ───────── */
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const groups = [
    ['.hero__copy', 'h1, .hero__lead, .btn, .hero__date'],
    ['.cases', 'h2, .cases__head .btn, .tabs button, .bands li'],
    ['.prod', 'h2, .prod__date, .ptabs button'],
    ['.flow', 'h2, .ex'],
    ['.consult', 'h2, .one, .reach > div'],
  ];
  const io = new IntersectionObserver((es) => es.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in');
    io.unobserve(en.target);
  }), { rootMargin: '0px 0px -8% 0px' });
  groups.forEach(([sec, parts]) => {
    document.querySelectorAll(sec).forEach((s) => s.querySelectorAll(parts).forEach((el, i) => {
      el.classList.add('rise');
      el.style.transitionDelay = `${Math.min(i, 8) * 70}ms`;
      io.observe(el);
    }));
  });
  const pic = document.querySelector('#t1 .panel__pic');
  pic.classList.add('shutter');
  io.observe(pic);
}

/* ───────── 카톡 버튼: 진단 결과를 복사해 두고 채팅창을 엶 ───────── */
const toast = Object.assign(document.createElement('p'), { className: 'toast', role: 'status' });
document.body.append(toast);
function say(t) {
  toast.textContent = t;
  toast.classList.add('on');
  clearTimeout(say.t);
  say.t = setTimeout(() => toast.classList.remove('on'), 4000);
}
function copy(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(() => {});
  const ta = Object.assign(document.createElement('textarea'), { value: text });
  document.body.append(ta); ta.select();
  try { document.execCommand('copy'); } catch {}
  ta.remove();
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-kakao="chat"]');
  if (!a) return;
  if (!KAKAO_READY) {
    e.preventDefault();
    say('카카오톡 채널 주소가 아직 연결되지 않았습니다. (오픈 전 설정)');
    return;
  }
  const d = diagnosisText();
  if (d) {
    copy(`[사이트 진단 결과]\n${d}\n(2026.11.9 규정 기준)`);
    const carry = document.getElementById('carry');
    carry.textContent = `복사된 진단 결과: ${d}`;
    carry.hidden = false;
    say('진단 결과를 복사했습니다. 채팅창에 붙여넣기 하세요.');
  }
});
