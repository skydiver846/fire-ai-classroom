// 교육생 맞춤 강의 설계 워크숍 "바로 해 보기" 9가지.
// 적은 내용은 이 브라우저(localStorage 'ld-plan')에만 저장되고, 06의 강의계획서 칸으로 이어집니다. 어디에도 전송하지 않습니다.
(() => {
  'use strict';

  const KEY = 'ld-plan';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) { return {}; } };
  const save = patch => { const next = { ...load(), ...patch }; try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (_) { /* 저장소 없음 */ } return next; };
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 7);
  const shuffle = list => { const c = [...list]; for (let i = c.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
  const VAGUE = ['이해한다', '이해할 수 있다', '안다', '알 수 있다', '익힌다', '함양한다', '인식한다', '배운다', '습득한다', '숙지한다', '고취한다', '치유된다', '회복한다'];
  const vagueIn = text => VAGUE.filter(v => String(text).includes(v));
  // 받침에 따라 조사 고르기 (이/가, 은/는)
  const josa = (word, withB, without) => { const c = String(word).trim().slice(-1).charCodeAt(0); if (c < 0xac00 || c > 0xd7a3) return `${word}${withB}(${without})`; return word + ((c - 0xac00) % 28 ? withB : without); };
  const who = target => String(target || '').replace(/\s*\(.*\)\s*$/, '').replace(/\s*\d+\s*명$/, '').trim();

  async function copyText(text, button) {
    const label = button.textContent;
    try { await navigator.clipboard.writeText(text); button.textContent = '복사됨 ✓'; }
    catch (_) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.append(ta); ta.select();
      try { document.execCommand('copy'); button.textContent = '복사됨 ✓'; } catch (e) { button.textContent = 'Ctrl+C로 복사'; }
      ta.remove();
    }
    setTimeout(() => { button.textContent = label; }, 1500);
  }

  /* ───────── 공통: 고르고 채점하기 ───────── */
  function pickGrade(body, items, options, labels) {
    let order = shuffle(items);
    const id = uid();
    body.innerHTML = `
      <div class="match-grid" role="group"><div class="match-head"><span>${labels.left}</span><span>${labels.right}</span></div><div class="match-rows"></div></div>
      <div class="lab-actions"><button class="lab-button primary" type="button" data-act="grade">채점하기</button><button class="lab-button" type="button" data-act="shuffle">순서 섞기</button><p class="lab-result" aria-live="polite"></p></div>`;
    const rows = body.querySelector('.match-rows'), result = body.querySelector('.lab-result');
    const draw = () => {
      rows.innerHTML = order.map((it, i) => `
        <div class="match-row" data-i="${i}"><label for="${id}-${i}">${esc(it.q)}</label><div>
          <select id="${id}-${i}"><option value="">고르세요</option>${options.map(o => `<option>${esc(o)}</option>`).join('')}</select>
          <small class="match-fix" hidden></small></div></div>`).join('');
      result.textContent = '';
    };
    body.querySelector('[data-act="grade"]').addEventListener('click', () => {
      let right = 0;
      rows.querySelectorAll('.match-row').forEach(row => {
        const it = order[Number(row.dataset.i)], ok = row.querySelector('select').value === it.a;
        if (ok) right += 1;
        row.classList.toggle('is-right', ok); row.classList.toggle('is-wrong', !ok);
        const fix = row.querySelector('.match-fix');
        fix.hidden = false;
        fix.textContent = ok ? (it.why ? `✓ ${it.why}` : '✓') : `정답: ${it.a}${it.why ? ` · ${it.why}` : ''}`;
      });
      result.textContent = `${right} / ${order.length}${right === order.length ? ' · 모두 맞혔습니다.' : ' · 각 항목 아래 이유를 읽어 보세요.'}`;
    });
    body.querySelector('[data-act="shuffle"]').addEventListener('click', () => { order = shuffle(items); draw(); });
    draw();
  }

  /* ───────── 예시 교육생: 조별 프로젝트 4팀 + 더 해 보기 ───────── */
  const PERSONAS = {
    culture: { label: '🤝 1팀 조직문화', who: '세대 · 직급이 섞인 한 부서 직원', count: '20명', kind: '관계 · 문화', need: '상사와 대화가 어렵고 분위기가 무겁다', heart: '어색하다, 억지 참여가 싫다', env: '90분, 강당, 노트북 2인 1대',
      product: '상사와 나, 풍자 4컷 만화', during: '불편함을 웃음으로 꺼내 보기', after: '상사와 함께 보며 대화의 계기', tool: '이미지 생성 AI' },
    shop: { label: '🏪 2팀 소상공인', who: '동네에서 카페 · 식당을 운영하는 소상공인', count: '15명', kind: '업무 · 기술', need: '손님이 줄었고, SNS에 무엇을 올려야 할지 모른다', heart: '바쁘다, AI는 처음이라 걱정', env: '3시간, 교육장, 개인 휴대폰 · 노트북',
      product: '일주일 SNS 홍보 계획과 게시물 3개', during: '우리 가게 손님과 강점을 정리해 보기', after: '내일부터 바로 올리는 홍보 게시물', tool: '대화형 AI · 이미지 생성 AI' },
    mind: { label: '🌱 3팀 마음 돌봄', who: '우울감 · 스트레스를 겪는 성인 참여자', count: '8명', kind: '정서 · 표현', need: '감정을 말로 꺼내기 어렵다', heart: '조심스럽다, 평가받기 싫다', env: '90분, 소그룹, 상담사 동석, 태블릿',
      product: '내 마음 날씨 그림책 (4쪽)', during: '감정을 날씨 · 장면으로 바꾸며 말 대신 표현', after: '힘들 때 다시 펼쳐 보는 나만의 책', tool: '이미지 생성 AI' },
    work: { label: '🗂 4팀 공공기관', who: '매달 부서별 엑셀을 손으로 합치는 주무관', count: '15명', kind: '업무 · 기술', need: '반복 취합에 매달 30분 넘게 쓴다', heart: '바쁘다, 바로 쓸 걸 원한다', env: '90분, 업무 PC, 외부 프로그램 설치 불가',
      product: '엑셀 파일 병합 자동화 도구', during: '내 업무를 단계로 쪼개 보는 업무 분석', after: '매달 취합 30분 → 1분', tool: '대화형 AI (매크로 · 스크립트)' },
    teacher: { label: '🧑‍🏫 교육자', who: '수업 준비 시간이 부족한 직업훈련 강사', count: '12명', kind: '업무 · 기술', need: '수업 준비에 시간이 많이 들고, 교육생 수준 차이가 크다', heart: '잘 가르치고 싶다, 시간이 없다', env: '3시간, 노트북, 각자 담당 과목 자료',
      product: '교육생 맞춤형 강의계획서 + 수준별 문제 세트', during: '내 교육생의 수준 차이를 정리해 보기', after: '다음 수업에 바로 쓰는 계획서와 문제', tool: '대화형 AI' },
    senior: { label: '👵 시니어', who: '스마트폰이 낯선 복지관 어르신', count: '12명', kind: '관계 · 문화', need: '디지털이 두렵고, 멀리 사는 가족과 소식이 뜸하다', heart: '틀릴까 봐 걱정, 천천히 하고 싶다', env: '90분, 복지관, 큰 화면 태블릿, 보조 강사 4명',
      product: '손주에게 보내는 AI 그림 안부 카드', during: '말로 그림을 만들며 "나도 할 수 있다"는 자신감', after: '카드를 가족에게 보내고 답장 받기', tool: '이미지 생성 AI (음성 입력)' },
    youth: { label: '🧒 청소년', who: '소방안전 체험에 온 중학생', count: '25명', kind: '업무 · 기술', need: '화재 대피를 알기만 하고 집에서 해 본 적이 없다', heart: '재미없으면 딴짓, 친구 눈치', env: '90분, 체험관 교실, 1인 1태블릿, 인솔 교사',
      product: '우리 집 화재 대피 지도 + 119 신고 연습 카드', during: '우리 집 탈출 경로 두 개와 신고 말하기를 직접 정해 보기', after: '집에 가져가 가족과 대피 계획 세우기', tool: '이미지 생성 AI · 대화형 AI' }
  };
  const personaButtons = () => `<div class="lab-actions ld-presets"><span class="ld-out-label">예시로 채우기:</span>${Object.entries(PERSONAS).map(([k, p]) => `<button class="lab-button ghost" type="button" data-persona="${k}">${p.label}</button>`).join('')}</div>`;

  /* ───────── 01 교육생 카드 ───────── */
  const CARD = [['who', '누구 (유형으로)', '예: 매달 엑셀을 손으로 합치는 주무관'], ['count', '인원', '예: 15명'], ['need', '필요 (무엇이 어렵나)', '예: 반복 취합에 시간을 뺏긴다'], ['heart', '마음 (어떤 마음으로 오나)', '예: 바쁘다, 바로 쓸 걸 원한다'], ['env', '환경 (시간 · 장소 · 장비)', '예: 90분, 업무 PC']];
  function learnerCard(body) {
    const id = uid(), c = load().learner || {};
    body.innerHTML = `${personaButtons()}
      <div class="ld-form">${CARD.map(([k, l, ph]) => `<label for="${id}-${k}">${l}</label><input id="${id}-${k}" data-k="${k}" type="text" maxlength="80" placeholder="${esc(ph)}" value="${esc(c[k] || '')}">`).join('')}
        <label for="${id}-kind">필요의 종류</label><select id="${id}-kind" data-k="kind">${['업무 · 기술', '정서 · 표현', '관계 · 문화'].map(o => `<option ${c.kind === o ? 'selected' : ''}>${o}</option>`).join('')}</select>
      </div>
      <div class="ld-out"><p class="ld-out-label">내 교육생 카드</p><p class="ld-sentence" aria-live="polite"></p><p class="ld-hint"></p></div>`;
    const v = k => body.querySelector(`[data-k="${k}"]`).value.trim();
    const HINT = { '업무 · 기술': '🛠 바로 쓰는 도구 · 양식 · 자동화가 어울립니다.', '정서 · 표현': '💬 나를 표현하는 작품이 어울립니다. 전문가와 함께 기획하세요.', '관계 · 문화': '🤝 함께 보고 이야기할 거리가 어울립니다. 익명 · 존중 규칙을 정하세요.' };
    function update() {
      const card = Object.fromEntries([...CARD.map(([k]) => [k, v(k)]), ['kind', v('kind')]]);
      body.querySelector('.ld-sentence').textContent = card.who ? `${card.who}${card.count ? ` ${card.count}` : ''} · 필요: ${card.need || '?'} · 마음: ${card.heart || '?'}` : '누구 칸부터 적어 보세요. 또는 위의 예시를 눌러 보세요.';
      body.querySelector('.ld-hint').textContent = `→ 4-2 결과물 힌트: ${HINT[card.kind]}`;
      save({ learner: card });
    }
    body.addEventListener('input', update); body.addEventListener('change', update);
    body.querySelector('.ld-presets').addEventListener('click', e => {
      const b = e.target.closest('[data-persona]'); if (!b) return;
      const p = PERSONAS[b.dataset.persona];
      CARD.forEach(([k]) => { body.querySelector(`[data-k="${k}"]`).value = p[k]; });
      body.querySelector('[data-k="kind"]').value = p.kind;
      save({ persona: b.dataset.persona });
      update();
    });
    update();
  }


  /* ───────── 02 수요조사 설문 만들기 ───────── */
  const PURPOSE_OPTS = {
    culture: ['부서 간 소통', '세대 · 직급 간 대화', '회의 효율', '분위기 · 사기'],
    shop: ['가게 홍보 · SNS', '단골 · 재방문', '리뷰 · 손님 응대', '홍보 시간 줄이기'],
    mind: ['감정 정리 · 표현', '스트레스 관리', '나를 이해하기', '생활 습관 만들기'],
    work: ['보고서 작성', '민원 응대 문장', '자료 정리 · 취합', '회의록 · 요약'],
    teacher: ['강의안 만들기', '수준별 문제 만들기', '실습 시나리오', '평가 · 피드백'],
    senior: ['가족과 연락 · 소식', '사진 · 추억 정리', '스마트폰 기본 사용', '사기 예방'],
    youth: ['화재 대피 연습', '119 신고 연습', '안전 수칙 익히기', '재미있게 배우기']
  };
  function defaultSurvey(key) {
    const p = PERSONAS[key] || {};
    const opts = (PURPOSE_OPTS[key] || ['업무 시간 줄이기', '문제 해결', '새로운 결과물 만들기', '소통 · 관계']).join(' / ');
    return [
      { on: true, item: '직업', q: '현재 어떤 일을 하고 있습니까?', type: '주관식' },
      { on: true, item: '업무', q: '일상에서 가장 많은 시간을 쓰는 일은 무엇입니까?', type: '주관식' },
      { on: true, item: '어려움', q: '해결하고 싶은 가장 큰 문제는 무엇입니까?', type: '주관식' },
      { on: true, item: 'AI 경험', q: '생성형 AI를 어느 정도 사용합니까?', type: '객관식', opts: '처음 / 가끔 / 자주 / 업무에 매일' },
      { on: true, item: '교육 목적', q: 'AI를 활용해 무엇을 개선하고 싶습니까?', type: '객관식', opts: `${opts} / 기타` },
      { on: true, item: '기대 결과', q: '교육이 끝나면 무엇을 할 수 있기를 원합니까?', type: '주관식' },
      { on: true, item: '핵심 질문', q: '현재 자신의 일이나 생활에서 가장 바꾸고 싶은 것은 무엇입니까?', type: '주관식' }
    ].map(x => ({ ...x, who: p.who || '' }));
  }
  function surveyBuilder(body) {
    const st = load();
    let key = (st.survey && st.survey.key) || st.persona || 'shop';
    let rows = (st.survey && st.survey.rows) || defaultSurvey(key);
    let target = (st.survey && st.survey.target) || ((PERSONAS[key] || {}).who || '');
    body.innerHTML = `
      <div class="lab-actions ld-presets"><span class="ld-out-label">우리 팀 교육생:</span>${Object.entries(PERSONAS).map(([k, p]) => `<button class="lab-button ghost" type="button" data-sv="${k}">${p.label}</button>`).join('')}</div>
      <div class="ld-form"><label>설문 대상</label><input type="text" class="ld-sv-target" maxlength="60" placeholder="예: 동네 카페 사장님 15명"></div>
      <div class="table-wrap"><table class="ld-blocks ld-sv"><thead><tr><th>넣기</th><th>항목</th><th>질문 (고쳐 쓰기)</th><th>형식</th></tr></thead><tbody></tbody></table></div>
      <div class="lab-actions"><button class="lab-button" type="button" data-act="add">질문 추가</button></div>
      <ul class="ld-warn" aria-live="polite"></ul>
      <div class="lab-actions">
        <button class="lab-button primary" type="button" data-act="open">설문지 새 창으로 열기 (인쇄)</button>
        <button class="lab-button" type="button" data-act="copy">설문지 글로 복사</button>
        <button class="lab-button" type="button" data-act="ai">AI에게 다듬기 요청 복사</button>
        <p class="lab-result" aria-live="polite"></p>
      </div>`;
    const tbody = body.querySelector('tbody'), result = body.querySelector('.lab-result');
    const tgt = body.querySelector('.ld-sv-target'); tgt.value = target;
    function draw() {
      tbody.innerHTML = rows.map((r, i) => `<tr data-i="${i}">
        <td><input type="checkbox" data-f="on" ${r.on ? 'checked' : ''} aria-label="${i + 1}번 넣기"></td>
        <td><input type="text" data-f="item" value="${esc(r.item)}" maxlength="12" aria-label="${i + 1}번 항목"></td>
        <td><input type="text" data-f="q" value="${esc(r.q)}" maxlength="120" aria-label="${i + 1}번 질문">${r.type === '객관식' ? `<input type="text" data-f="opts" value="${esc(r.opts || '')}" maxlength="160" class="ld-opts" placeholder="보기를 / 로 나눠 적기" aria-label="${i + 1}번 보기">` : ''}</td>
        <td><select data-f="type" aria-label="${i + 1}번 형식">${['주관식', '객관식', '척도(1~5)'].map(t => `<option ${r.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></td></tr>`).join('');
      refresh();
    }
    const used = () => rows.filter(r => r.on && r.q.trim());
    function refresh() {
      const u = used(), w = [];
      if (u.length > 7) w.push(`${u.length}문항입니다. 7문항 이내(5분 안에)를 권합니다.`);
      if (u.length < 3) w.push('문항이 너무 적습니다. 직업 · 어려움 · 기대 결과는 꼭 넣으세요.');
      if (u.filter(r => r.type === '주관식').length < 2) w.push('주관식이 2개 미만입니다. 진짜 필요는 주관식에서 나옵니다.');
      u.forEach(r => {
        if (/배우|배워|사용법|ChatGPT를|챗GPT를/.test(r.q)) w.push(`"${r.q.slice(0, 24)}…" 도구 중심 질문입니다. 일 · 생활에서 바꾸고 싶은 것을 물어보세요.`);
        if (/이름|성명|연락처|전화|주소|주민/.test(r.q)) w.push(`"${r.q.slice(0, 24)}…" 개인정보를 묻고 있습니다. 꼭 필요한지 확인하세요.`);
        if (/(과|와|및|그리고)\s?\S+(을|를)\s?(어떻게|무엇)/.test(r.q) || (r.q.match(/\?/g) || []).length > 1) w.push(`"${r.q.slice(0, 24)}…" 한 문항에 두 가지를 묻고 있지 않은지 보세요.`);
      });
      body.querySelector('.ld-warn').innerHTML = w.length ? w.map(x => `<li>⚠️ ${esc(x)}</li>`).join('') : `<li class="ok">✓ ${u.length}문항 · 주관식 ${u.filter(r => r.type === '주관식').length}개 · 도구 중심 · 개인정보 질문 없음</li>`;
      save({ survey: { key, target: tgt.value.trim(), rows } });
    }
    function text() {
      const L = [`■ 교육 전 수요조사 (${tgt.value.trim() || '대상'})`, '이름은 적지 않습니다. 5분이면 끝납니다.', ''];
      used().forEach((r, i) => { L.push(`${i + 1}. ${r.q}`); if (r.type === '객관식') L.push(`   ${String(r.opts || '').split('/').map(o => `□ ${o.trim()}`).join('  ')}`); else if (r.type === '척도(1~5)') L.push('   ① ② ③ ④ ⑤'); else L.push('   ________________________________'); });
      return L.join('\n');
    }
    tbody.addEventListener('input', e => { const tr = e.target.closest('tr'); if (!tr) return; const r = rows[Number(tr.dataset.i)], f = e.target.dataset.f; r[f] = f === 'on' ? e.target.checked : e.target.value; refresh(); });
    tbody.addEventListener('change', e => { const tr = e.target.closest('tr'); if (!tr) return; const r = rows[Number(tr.dataset.i)], f = e.target.dataset.f; if (f === 'type') { r.type = e.target.value; if (r.type === '객관식' && !r.opts) r.opts = '보기1 / 보기2 / 보기3 / 기타'; draw(); } if (f === 'on') { r.on = e.target.checked; refresh(); } });
    tgt.addEventListener('input', refresh);
    body.addEventListener('click', e => {
      const sv = e.target.closest('[data-sv]');
      if (sv) { key = sv.dataset.sv; rows = defaultSurvey(key); const p = PERSONAS[key]; tgt.value = `${p.who} ${p.count}`; save({ persona: key }); draw(); result.textContent = ''; return; }
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'add') { rows.push({ on: true, item: '추가', q: '', type: '주관식' }); draw(); }
      if (a.dataset.act === 'copy') copyText(text(), a);
      if (a.dataset.act === 'ai') copyText(`너는 맞춤형 AI 교육과정을 설계하는 교육 컨설턴트야. 아래는 [${tgt.value.trim()}]에게 보낼 교육 전 수요조사 설문 초안이야.\n- 5분 안에 끝나도록 문항 수와 길이를 점검하고\n- 도구 중심 질문("AI를 배우고 싶나")이 있으면 일 · 생활 중심 질문으로 바꾸고\n- 한 문항에 두 가지를 묻는 곳, 대답하기 어려운 표현을 고치고\n- 객관식 보기가 빠진 것이 있으면 보태 줘. 개인정보는 묻지 않게.\n고친 설문 전체와, 무엇을 왜 고쳤는지 표로 보여 줘.\n\n${text()}`, a);
      if (a.dataset.act === 'open') {
        const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>수요조사 · ${esc(tgt.value)}</title><style>body{font:15px/1.7 "Malgun Gothic","Apple SD Gothic Neo",sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#111}h1{font-size:21px;border-bottom:3px solid #c8321e;padding-bottom:6px}ol li{margin:14px 0}.line{border-bottom:1px solid #999;height:26px;margin-top:6px}.opt{display:inline-block;margin:4px 14px 0 0}button{font:inherit;padding:8px 14px;border:0;border-radius:6px;background:#c8321e;color:#fff;cursor:pointer}@media print{button{display:none}}</style></head><body><button onclick="print()">인쇄 · PDF로 저장</button><h1>교육 전 수요조사</h1><p>${esc(tgt.value)} · 이름은 적지 않습니다. 5분이면 끝납니다.</p><ol>${used().map(r => `<li><b>${esc(r.q)}</b>${r.type === '객관식' ? `<div>${String(r.opts || '').split('/').map(o => `<span class="opt">□ ${esc(o.trim())}</span>`).join('')}</div>` : r.type === '척도(1~5)' ? '<div>① ② ③ ④ ⑤</div>' : '<div class="line"></div><div class="line"></div>'}</li>`).join('')}</ol></body></html>`;
        const w = window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
        result.textContent = w ? '새 창에서 인쇄하거나, 내용을 구글 폼 · 네이버 폼으로 옮기세요.' : '팝업이 막혔습니다. [설문지 글로 복사]를 쓰세요.';
      }
    });
    draw();
  }

  /* ───────── 03 응답 분석 연습: 묶고, 세고, 고르기 ───────── */
  const RESP = {
    shop: { tags: { '📣 홍보 · 인지도': ['가게 SNS 홍보 게시물 만들기', '사장님은 AI로 우리 가게 홍보 게시물 3개를 만든다.'], '🔁 단골 · 재방문': ['단골 감사 문자 · 쿠폰 문구 세트', '사장님은 재방문을 부르는 감사 문자 3종을 만든다.'], '⭐ 리뷰 · 응대': ['리뷰 답글 문장 카드 10개', '사장님은 좋은 · 나쁜 리뷰에 쓸 답글 문장을 만든다.'], '⏱ 시간 부족': ['일주일 치 홍보 글 한 번에 만들기', '사장님은 일주일 치 게시글을 30분 안에 만든다.'], '💸 비용 · 매출': ['메뉴 · 가격 안내판 다시 만들기', '사장님은 대표 메뉴 소개판을 만든다.'] },
      list: ['동네 사람들이 우리 가게가 있는지도 잘 몰라요.', '인스타그램을 해야 한다는데 뭘 올려야 할지 모르겠어요.', '한 번 왔던 손님이 다시 잘 안 와요.', '별점 1개 리뷰가 달리면 며칠 동안 신경 쓰여요.', '혼자 운영하느라 홍보할 시간이 없어요.', '사진을 찍어도 예쁘게 안 나와요.', '재료값이 올라서 가격을 올려야 하는데 손님이 줄까 걱정이에요.', '근처에 프랜차이즈가 생겨서 손님을 뺏겼어요.'] },
    work: { tags: { '📝 보고서 작성': ['보고서 초안 틀 + AI 요청문 세트', '주무관은 보고서 초안을 AI로 20분 안에 만든다.'], '☎️ 민원 응대': ['민원 유형별 답변 문장 카드', '주무관은 자주 받는 민원 5가지 답변 초안을 만든다.'], '📊 자료 정리 · 취합': ['엑셀 병합 자동화 도구', '주무관은 예시 파일 3개를 합치는 도구를 만든다.'], '🗒 회의 · 요약': ['회의록 요약 요청문', '주무관은 회의 메모를 결정 · 할 일로 정리한다.'], '🔒 보안 · 규정 걱정': ['쓸 수 있는 AI 도구 · 지켜야 할 규칙 한 장', '주무관은 업무에 AI를 쓸 때 지킬 규칙 5가지를 정리한다.'] },
      list: ['매달 부서별 엑셀을 손으로 합치는 데 반나절이 걸려요.', '같은 내용의 보고서를 형식만 바꿔 여러 번 써요.', '민원 전화에 같은 설명을 하루에 열 번은 해요.', '회의가 끝나면 회의록 정리가 또 일이에요.', '각 부서에서 온 자료 형식이 다 달라서 정리가 힘들어요.', 'AI를 써도 되는지, 보안 규정이 걱정돼요.', '보고서 문장을 다듬는 데 시간이 오래 걸려요.', '자료를 찾느라 예전 파일을 뒤지는 시간이 많아요.'] },
    culture: { tags: { '🗣 부서 간 소통': ['부서 소개 카드 · 협업 요청 양식', '직원은 우리 부서를 소개하는 카드 한 장을 만든다.'], '👥 세대 · 직급 차이': ['상사와 나, 풍자 4컷 만화', '직원은 특정인을 알아볼 수 없게 4컷 만화를 그린다.'], '⏳ 회의 비효율': ['회의 규칙 포스터 · 안건 틀', '직원은 우리 팀 회의 규칙 5가지를 정한다.'], '😶 말하기 어려운 분위기': ['익명 의견 모아 보기 (AI로 분류)', '직원은 익명 의견을 주제별로 묶어 본다.'], '🎉 사기 · 즐거움': ['우리 팀 응원가', '직원은 팀 응원가 가사를 함께 쓴다.'] },
      list: ['옆 부서가 무슨 일을 하는지 잘 몰라서 협조가 어려워요.', '팀장님께 의견을 말하기가 부담스러워요.', '회의가 길기만 하고 결론이 안 나요.', 'MZ 직원들과 대화 주제가 안 맞아요.', '좋은 아이디어가 있어도 말할 분위기가 아니에요.', '회의 때 말하는 사람만 계속 말해요.', '요즘 팀 분위기가 많이 가라앉아 있어요.', '선배들은 바쁘다고 물어보기가 어려워요.'] },
    mind: { tags: { '😮‍💨 스트레스': ['오늘의 마음 날씨 기록 카드', '참여자는 일주일 마음 날씨를 기록하는 카드를 만든다.'], '🪞 자기이해': ['나를 이해하는 자기성찰 노트', '참여자는 자기성찰 질문 5개에 답한 노트를 만든다.'], '💬 표현의 어려움': ['내 마음 날씨 그림책', '참여자는 감정을 4장면 그림책으로 표현한다.'], '🌙 생활 습관': ['나만의 작은 습관 계획표', '참여자는 일주일 실천할 작은 습관 3가지를 정한다.'], '🤝 관계 고민': ['나에게 · 소중한 사람에게 쓰는 편지', '참여자는 원하면 고마운 사람에게 짧은 편지를 쓴다.'] },
      list: ['요즘 이유 없이 지치고 무기력해요.', '내가 뭘 좋아하는지 잘 모르겠어요.', '속상한 일이 있어도 누구에게 말하기가 어려워요.', '잠드는 시간이 매일 달라서 피곤해요.', '가족과 대화가 자꾸 다툼으로 끝나요.', '머릿속이 복잡해서 정리가 안 돼요.', '나를 돌보는 시간이 전혀 없어요.', '감정을 글로 쓰려고 해도 말이 안 나와요.'] }
  };
  const ANALYSIS_EX = {
    shop: '핵심 문제: 📣 홍보 · 인지도(4명), 🔁 단골 · 재방문(1명), ⭐ 리뷰 · 응대(1명) / AI 수준: 대부분 처음',
    work: '핵심 문제: 📊 자료 정리 · 취합(3명), 📝 보고서 작성(2명), ☎️ 민원 응대(1명) / 절박: 보안 규정 걱정',
    culture: '핵심 문제: 😶 말하기 어려운 분위기(3명), ⏳ 회의 비효율(2명), 🗣 부서 간 소통(1명)',
    mind: '핵심 문제: 💬 표현의 어려움(2명), 😮‍💨 스트레스(2명), 🪞 자기이해(2명) / 전문가 연계 필요 응답 따로 표시',
    teacher: '핵심 문제: 수업 준비 시간(5명), 교육생 수준 차이(4명), 실습 시나리오 부족(3명)',
    senior: '핵심 문제: 가족과 연락 · 소식(6명), 스마트폰이 두려움(5명), 사기 걱정(2명)',
    youth: '핵심 문제: 대피를 해 본 적 없음(15명), 신고 말하기가 어려움(8명) / 집중 시간이 짧음'
  };
  function responseAnalysis(body) {
    let key = 'shop', marks = {}, stars = {};
    body.innerHTML = `
      <div class="lab-actions ld-presets"><span class="ld-out-label">우리 팀 응답:</span>${Object.keys(RESP).map(k => `<button class="lab-button ${k === key ? '' : 'ghost'}" type="button" data-rs="${k}">${PERSONAS[k].label}</button>`).join('')}</div>
      <p class="ld-note">① <b>묶기</b>: 응답마다 맞는 문제 유형을 누르세요 (여러 개 가능). ⭐는 소수지만 절박한 응답 표시. ② <b>세기</b>는 오른쪽에서 자동으로. ③ <b>고르기</b>: [핵심 문제 3가지 정리]</p>
      <div class="ld-ra"><ol class="ld-resp"></ol><div class="ld-tally-wrap"><p class="ld-out-label">② 세기</p><div class="ld-tally"></div></div></div>
      <div class="lab-actions"><button class="lab-button primary" type="button" data-act="pick">③ 핵심 문제 3가지 정리</button><button class="lab-button" type="button" data-act="ai">AI 분석 요청 복사 (응답 포함)</button><p class="lab-result" aria-live="polite"></p></div>
      <div class="ld-ra-out" hidden></div>`;
    const list = body.querySelector('.ld-resp'), tally = body.querySelector('.ld-tally'), out = body.querySelector('.ld-ra-out'), result = body.querySelector('.lab-result');
    function draw() {
      const R = RESP[key], tags = Object.keys(R.tags);
      list.innerHTML = R.list.map((r, i) => `<li data-i="${i}"><p>“${esc(r)}”</p><div class="ld-tags">${tags.map(t => `<button type="button" class="ld-tag ${(marks[i] || []).includes(t) ? 'on' : ''}" data-t="${esc(t)}">${esc(t)}</button>`).join('')}<button type="button" class="ld-star ${stars[i] ? 'on' : ''}" data-star aria-label="절박한 응답 표시">⭐</button></div></li>`).join('');
      count();
    }
    function counts() { const c = {}; Object.keys(RESP[key].tags).forEach(t => { c[t] = 0; }); Object.values(marks).forEach(ts => ts.forEach(t => { c[t] += 1; })); return c; }
    function count() {
      const c = counts(), max = Math.max(1, ...Object.values(c));
      tally.innerHTML = Object.entries(c).sort((a, b) => b[1] - a[1]).map(([t, n]) => `<div class="ld-tally-row"><span>${esc(t)}</span><i style="width:${n / max * 100}%"></i><b>${n}</b></div>`).join('');
      const done = Object.values(marks).filter(m => m.length).length;
      result.textContent = `${done} / ${RESP[key].list.length}개 응답을 묶었습니다.`;
    }
    body.addEventListener('click', e => {
      const rs = e.target.closest('[data-rs]');
      if (rs) { key = rs.dataset.rs; marks = {}; stars = {}; out.hidden = true; body.querySelectorAll('[data-rs]').forEach(b => b.classList.toggle('ghost', b !== rs)); draw(); return; }
      const li = e.target.closest('.ld-resp li');
      const tg = e.target.closest('[data-t]');
      if (tg && li) { const i = Number(li.dataset.i), t = tg.dataset.t; const m = marks[i] || (marks[i] = []); const k = m.indexOf(t); if (k >= 0) m.splice(k, 1); else m.push(t); tg.classList.toggle('on'); count(); return; }
      if (e.target.closest('[data-star]') && li) { const i = Number(li.dataset.i); stars[i] = !stars[i]; e.target.closest('[data-star]').classList.toggle('on'); return; }
      const a = e.target.closest('[data-act]'); if (!a) return;
      const R = RESP[key];
      if (a.dataset.act === 'ai') { copyText(`너는 맞춤형 AI 교육과정을 설계하는 교육 컨설턴트야.\n아래는 [${PERSONAS[key].who}]에게 받은 수요조사 응답이야 (가상 · 개인정보 없음).\n${R.list.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n1) 비슷한 어려움끼리 묶어 유형별로 분류하고 몇 명인지 세어 줘\n2) 핵심 문제 3가지를 고르고 이유를 써 줘 (소수지만 절박한 응답은 따로 표시)\n3) 핵심 문제마다 3시간 안에 만들 수 있는 실습 결과물과 교육 목표(ABCD)를 하나씩 제안해 줘\n응답에 없는 내용은 지어내지 말고, 추측이면 "추측"이라고 표시해 줘.`, a); return; }
      if (a.dataset.act === 'pick') {
        const c = counts(), top = Object.entries(c).filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1]).slice(0, 3);
        if (!top.length) { result.textContent = '먼저 응답을 몇 개 묶어 보세요.'; return; }
        const starred = Object.keys(stars).filter(i => stars[i]).map(i => R.list[i]);
        out.hidden = false;
        out.innerHTML = `<p class="ld-out-label">③ 핵심 문제 → 결과물 → 교육 목표</p><div class="vis-methods">${top.map(([t, n], i) => `<div class="vm-card"><div class="vm-top"><span class="vm-icon">${i + 1}</span><span class="vm-no">${n}명</span></div><p class="vm-name">${esc(t)}</p><p class="vm-how">🎁 ${esc(R.tags[t][0])}</p><p class="vm-tip">🎯 ${esc(R.tags[t][1])}</p></div>`).join('')}</div>${starred.length ? `<p class="ld-hint">⭐ 따로 챙길 응답: ${starred.map(x => `“${esc(x)}”`).join(' · ')}</p>` : ''}`;
        const text = `핵심 문제: ${top.map(([t, n]) => `${t}(${n}명)`).join(', ')}${starred.length ? ` / 절박: ${starred.join(' · ')}` : ''}`;
        save({ analysis: { key, text }, persona: key });
        result.textContent = '05 강의계획서의 "수요조사 · 분석 결과" 칸으로 이어집니다.';
      }
    });
    draw();
  }

  const PCHECK = [['내 것', '교육생 각자의 상황 · 감정 · 업무가 들어간다'], ['바로 씀', '강의 다음 날 실제로 쓰거나 보게 된다'], ['시간 안에 완성', '주어진 시간 안에 끝까지 만든다'], ['도구는 최소', '꼭 필요한 기능만 쓴다'], ['안전', '만들고 나누며 상처받거나 곤란해질 사람이 없다']];
  /* ───────── 02-① 교육생 카드 뽑기 → 산출물 바꿔 쓰기 ───────── */
  // 처음 보는 교육생을 뽑아, 같은 도구로 그 사람에게 맞는 산출물과 효과를 직접 적어 봅니다. 정답은 없고 예시 답 하나와 비교합니다.
  const DECK = [
    { who: '야간 근무가 잦은 119 구급대원', need: '교대 근무로 수면 · 피로 관리가 어렵다', mind: '지쳐 있다, 짧고 쓸모 있는 것만', ex: { 음악: '퇴근길에 듣는 나만의 “오늘도 수고했다” 노래', 음성: '교대 근무 맞춤 수면 유도 안내 음성 (내가 쓴 문장)', 이미지: '내 수면 리듬 포스터 (근무표 · 잠 · 식사를 한눈에)', 대화: '교대 근무 맞춤 수면 · 식사 계획표', 엑셀: '근무표를 넣으면 수면 시간을 계산해 주는 피로 관리표' }, effect: '근무표에 맞춘 내 수면 계획을 바로 냉장고에 붙임' },
    { who: '자녀의 학교 안내문이 어려운 다문화 가정 학부모', need: '가정통신문 · 준비물 안내를 이해하기 어렵다', mind: '묻기 미안하다, 실수할까 걱정', ex: { 음악: '아이와 함께 부르는 준비물 챙기기 노래', 음성: '가정통신문을 쉬운 말로 읽어 주는 음성 안내', 이미지: '그림으로 보는 우리 아이 학교 준비물 카드', 대화: '안내문을 쉬운 말 · 모국어로 바꿔 주는 나만의 질문 문장 모음', 엑셀: '학교 일정 · 준비물 체크 달력' }, effect: '다음 안내문부터 혼자 읽고 준비' },
    { who: '퇴직을 1년 앞둔 소방관', need: '30년 경험을 정리하고 다음 삶을 준비하고 싶다', mind: '아쉽고 막막하다', ex: { 음악: '30년 소방 인생을 가사로 쓴 내 노래 한 곡', 음성: '후배에게 남기는 목소리 편지 · 현장 이야기 오디오', 이미지: '내 소방 인생 연표 포스터 한 장', 대화: '후배에게 남기는 현장 노하우 10문 10답', 엑셀: '퇴직 후 1년 계획 · 버킷리스트 표' }, effect: '경험을 후배와 나누고, 다음 계획의 첫 줄을 씀' },
    { who: '처음 강의를 맡은 신임 교관', need: '강의 자료를 만드는 데 며칠씩 걸린다', mind: '잘하고 싶다, 평가가 두렵다', ex: { 음악: '강의 도입에 쓰는 30초 오프닝 음악', 음성: '내 강의 핵심을 3분에 정리한 오디오 예고편', 이미지: '내 첫 강의 표지 · 도입 장면 그림 3장', 대화: '내 강의 주제의 50분 강의계획서 초안', 엑셀: '강의 준비 체크리스트 · 일정표' }, effect: '다음 주 첫 강의에 바로 쓰는 자료' },
    { who: '귀농한 지 1년 된 농촌 마을 어르신', need: '농산물을 알리고 싶은데 홍보물을 만들 줄 모른다', mind: '해 보고 싶지만 어려울까 걱정', ex: { 음악: '우리 밭 농산물 홍보 노래 (CM송)', 음성: '직거래 장터 안내 방송 음성', 이미지: '우리 밭 농산물 홍보 전단 한 장', 대화: '직거래 문자 · 소개 글 문장 3가지', 엑셀: '주문 · 배송 기록표' }, effect: '마을 직거래 장터에 바로 붙이는 전단' },
    { who: '사회복무요원으로 처음 행정 업무를 맡은 청년', need: '민원 응대 문장이 서툴러 긴장한다', mind: '실수할까 긴장, 물어보기 어렵다', ex: { 음악: '긴장을 푸는 출근길 응원 노래', 음성: '민원 응대 문장을 소리 내어 연습하는 음성 카드', 이미지: '민원 응대 흐름 한 장 그림', 대화: '자주 받는 민원 10가지 응대 문장 카드', 엑셀: '민원 유형별 처리 기록표' }, effect: '내일 창구에서 꺼내 보는 내 응대 카드' },
    { who: '발달장애 청소년 방과후 프로그램 참여자', need: '하루 일과 순서를 스스로 챙기기 어렵다', mind: '새로운 것이 불안, 그림이 편하다', ex: { 음악: '하루 일과를 순서대로 부르는 노래 (보호자 · 교사와 함께)', 음성: '쉬운 말로 일과를 알려 주는 음성 안내', 이미지: '그림으로 보는 내 하루 일과 카드 (보호자 · 교사와 함께)', 대화: '쉬운 말 일과 안내 문장', 엑셀: '하루 일과 체크표 (그림 아이콘)' }, effect: '집 · 교실에 붙여 두고 스스로 확인' },
    { who: '회의가 많은 부서의 팀장', need: '회의록 정리와 후속 업무 배분에 시간이 걸린다', mind: '바쁘다, 팀원 눈치도 본다', ex: { 음악: '우리 팀 응원가 (회의실 공감 가사)', 음성: '회의 결정 사항 1분 음성 브리핑', 이미지: '우리 팀 회의 규칙 포스터', 대화: '회의 녹취를 넣으면 결정 · 할 일 · 담당을 뽑아 주는 요청문', 엑셀: '회의 후속 업무 담당 · 기한 추적표' }, effect: '다음 회의부터 정리 시간 절반' }
  ];
  const TOOLS = [['이미지', '🖼 이미지 생성 AI'], ['음악', '🎵 음악 생성 AI'], ['음성', '🎙 음성 합성 · 녹음 AI'], ['대화', '💬 대화형 AI (ChatGPT · Claude 등)'], ['엑셀', '📊 엑셀 · 표']];
  function productRemix(body) {
    const id = uid();
    let card = null, tool = '이미지';
    body.innerHTML = `
      <p class="ld-note">강의 주제가 <b>"도구 사용법"</b>으로 정해져 왔다고 해 봅시다. 같은 도구라도 교육생에 따라 들고 갈 산출물이 달라야 합니다.</p>
      <div class="ld-row"><label for="${id}-tool">오늘 쓸 도구</label><select id="${id}-tool" class="ld-tool">${TOOLS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
        <button class="lab-button primary" type="button" data-act="draw">🎴 교육생 카드 뽑기</button></div>
      <div class="ld-card" hidden></div>
      <div class="ld-remix" hidden>
        <div class="ld-form">
          <label for="${id}-p">이 사람이 만들어 갈 산출물</label><input id="${id}-p" data-k="p" type="text" maxlength="80" placeholder="예: ○○을 넣으면 ○○해 주는 ○○">
          <label for="${id}-d">만드는 과정의 효과</label><input id="${id}-d" data-k="d" type="text" maxlength="80" placeholder="만들면서 무엇을 경험 · 정리하게 되나">
          <label for="${id}-a">들고 간 뒤의 효과</label><input id="${id}-a" data-k="a" type="text" maxlength="80" placeholder="다음 날 무엇이 달라지나">
        </div>
        <fieldset class="ld-checks"><legend>스스로 점검: 좋은 산출물의 다섯 조건</legend>${PCHECK.map(([k, d], i) => `<label><input type="checkbox" data-c="${i}"> <b>${k}</b> · ${d}</label>`).join('')}</fieldset>
        <div class="lab-actions">
          <button class="lab-button" type="button" data-act="chat">채팅에 올릴 한 줄 복사</button>
          <button class="lab-button ghost" type="button" data-act="ex">예시 답 보기</button>
          <button class="lab-button ghost" type="button" data-act="draw">다른 카드 뽑기</button>
          <p class="lab-result" aria-live="polite"></p>
        </div>
        <div class="ld-out ld-ex" hidden></div>
      </div>`;
    const cardEl = body.querySelector('.ld-card'), remix = body.querySelector('.ld-remix'), ex = body.querySelector('.ld-ex'), result = body.querySelector('.lab-result');
    const val = k => body.querySelector(`[data-k="${k}"]`).value.trim();
    function draw() {
      const pool = DECK.filter(c => c !== card);
      card = pool[Math.floor(Math.random() * pool.length)];
      cardEl.hidden = false; remix.hidden = false; ex.hidden = true; result.textContent = '';
      cardEl.innerHTML = `<p class="ld-out-label">🎴 내가 뽑은 교육생</p><p class="ld-sentence">${esc(card.who)}</p><p class="ld-card-row"><span>필요</span>${esc(card.need)}</p><p class="ld-card-row"><span>마음</span>${esc(card.mind)}</p>`;
      body.querySelectorAll('[data-k]').forEach(i => { i.value = ''; });
      body.querySelectorAll('[data-c]').forEach(c => { c.checked = false; });
      body.querySelector('[data-k="p"]').focus();
    }
    body.querySelector('.ld-tool').addEventListener('change', e => { tool = e.target.value; ex.hidden = true; });
    body.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const a = b.dataset.act;
      if (a === 'draw') { draw(); return; }
      if (!card) return;
      if (a === 'chat') {
        if (!val('p')) { result.textContent = '산출물부터 적어 보세요.'; return; }
        const n = [...body.querySelectorAll('[data-c]')].filter(c => c.checked).length;
        copyText(`[${card.who}] 산출물: ${val('p')} / 과정 효과: ${val('d') || '-'} / 들고 간 뒤: ${val('a') || '-'} (조건 ${n}/5)`, b);
      }
      if (a === 'ex') {
        ex.hidden = false;
        ex.innerHTML = `<p class="ld-out-label">예시 답 (${esc(TOOLS.find(t => t[0] === tool)[1])}) · 정답은 아닙니다</p><p class="ld-sentence">${esc(card.ex[tool])}</p><p class="ld-hint">들고 간 뒤: ${esc(card.effect)}</p><p class="ld-hint">내 답과 무엇이 다른가요? 내 답이 다섯 조건을 더 잘 지키면 내 답이 더 좋은 답입니다.</p>`;
      }
    });
    body.addEventListener('input', () => { result.textContent = ''; });
  }

  /* ───────── 02-② 산출물 깔때기 ───────── */
  const PF = [['product', '산출물 (무엇을 만들어 가나)', '예: 엑셀 병합 자동화 도구'], ['during', '만드는 과정의 효과', '예: 내 업무를 단계로 쪼개 보기'], ['after', '들고 간 뒤의 효과', '예: 매달 30분 → 1분'], ['tool', '필요한 도구', '예: 대화형 AI']];
  function productFunnel(body) {
    const id = uid(), st = load(), p = st.product || {}, l = st.learner || {};
    body.innerHTML = `${personaButtons()}
      <p class="ld-note">02장 교육생 카드: <b class="ld-who">${esc(l.who ? `${l.who} ${l.count || ''} · 필요: ${l.need || ''}` : '아직 없음 (02장 교육생 카드를 먼저 채우거나 아래 예시를 누르세요)')}</b></p>
      <div class="ld-form">${PF.map(([k, lb, ph]) => `<label for="${id}-${k}">${lb}</label><input id="${id}-${k}" data-k="${k}" type="text" maxlength="80" placeholder="${esc(ph)}" value="${esc(p[k] || '')}">`).join('')}
        <label for="${id}-min">시간 (분)</label><input id="${id}-min" data-k="minutes" type="number" min="10" max="480" step="5" value="${esc(p.minutes || 90)}"></div>
      <div class="ld-out"><p class="ld-out-label">내 주제 문장</p><p class="ld-sentence" aria-live="polite"></p></div>
      <fieldset class="ld-checks"><legend>좋은 산출물의 다섯 조건</legend>${PCHECK.map(([k, d], i) => `<label><input type="checkbox" data-c="${i}" ${(p.checks || [])[i] ? 'checked' : ''}> <b>${k}</b> · ${d}</label>`).join('')}</fieldset>
      <p class="lab-result ld-verdict" aria-live="polite"></p>
      <div class="lab-actions"><button class="lab-button" type="button" data-act="copy">주제 문장 복사</button></div>`;
    const v = k => body.querySelector(`[data-k="${k}"]`).value.trim();
    const checks = [...body.querySelectorAll('[data-c]')];
    function update() {
      const lr = load().learner || {};
      const d = { product: v('product'), during: v('during'), after: v('after'), tool: v('tool'), minutes: Number(v('minutes')) || 90 };
      const sentence = lr.who && d.product ? `${josa(lr.who, '이', '가')} ${josa(d.product.replace(/\s*\(.*\)\s*$/, ''), '을', '를')} 만들어 가는 ${d.minutes}분 실습${d.after ? ` → ${d.after}` : ''}` : '교육생(01장)과 산출물을 적으면 주제 문장이 만들어집니다.';
      body.querySelector('.ld-sentence').textContent = sentence;
      const n = checks.filter(c => c.checked).length;
      body.querySelector('.ld-verdict').textContent = !d.product ? '' : n === 5 ? '다섯 조건을 모두 통과했습니다. 4-3 실습과 시간으로 갑니다.' : `조건 ${n} / 5 · ✓가 안 되는 조건이 있으면 산출물을 더 좁히거나 바꿔 보세요.`;
      save({ product: { ...d, sentence: body.querySelector('.ld-sentence').textContent, checks: checks.map(c => c.checked) } });
    }
    body.addEventListener('input', update); body.addEventListener('change', update);
    body.querySelector('.ld-presets').addEventListener('click', e => {
      const b = e.target.closest('[data-persona]'); if (!b) return;
      const ps = PERSONAS[b.dataset.persona];
      if (!(load().learner || {}).who) save({ learner: { who: ps.who, count: ps.count, need: ps.need, heart: ps.heart, env: ps.env, kind: ps.kind } });
      const lr = load().learner;
      body.querySelector('.ld-who').textContent = `${lr.who} ${lr.count || ''} · 필요: ${lr.need || ''}`;
      PF.forEach(([k]) => { body.querySelector(`[data-k="${k}"]`).value = ps[k]; });
      checks.forEach(c => { c.checked = true; });
      save({ persona: b.dataset.persona });
      update();
    });
    body.querySelector('[data-act="copy"]').addEventListener('click', e => copyText(body.querySelector('.ld-sentence').textContent, e.currentTarget));
    update();
  }

  /* ───────── 03-① 목표 판정 ───────── */
  const GOAL_ITEMS = [
    { q: 'AI 이미지 생성 도구를 이해한다.', a: '고칠 목표', why: '"이해한다"는 보이지 않습니다. 무엇을 만들지 쓰세요.' },
    { q: '주무관은 예시 엑셀 파일 3개를 20분 안에 오류 없이 합치는 도구를 만든다.', a: '좋은 목표', why: 'A · B · C · D가 모두 있습니다.' },
    { q: '참여자의 우울감이 치유된다.', a: '고칠 목표', why: '강사가 장담할 수 없는 결과입니다. 표현 행동으로 씁니다.' },
    { q: '참여자는 그림책 장면마다 그 날의 감정에 날씨 이름을 붙인다.', a: '좋은 목표', why: '마음의 목표를 보이는 행동(이름 붙인다)으로 썼습니다.' },
    { q: '건강한 조직문화를 함양한다.', a: '고칠 목표', why: '예: "4컷을 보여 주며 상사에게 바라는 점 하나를 말한다".' },
    { q: '강사는 4컷 만화 그리는 법을 시연한다.', a: '고칠 목표', why: '강사가 할 일입니다. 목표는 교육생이 할 수 있게 되는 것입니다.' }
  ];
  const goalJudge = body => pickGrade(body, GOAL_ITEMS, ['좋은 목표', '고칠 목표'], { left: '목표 문장', right: '판정' });

  /* ───────── 03-② ABCD 목표 조립 ───────── */
  const VERBS = { '만들기 · 적용': ['만든다', '그린다', '작성한다', '수행한다'], '기억 · 이해': ['나열한다', '설명한다', '구분한다'], '분석 · 판단': ['찾는다', '비교한다', '고른다'], '마음 · 태도': ['표현한다', '이름 붙인다', '스스로 고른다', '나눈다'], '관계': ['함께 웃는다', '질문한다', '제안한다', '말한다'] };
  const ABCD_EX = {
    mind: { a: '참여자는', c: '이미지 생성 AI로', d: '4장면으로', o: '내 마음 날씨 그림책을', v: '만든다' },
    work: { a: '주무관은', c: '예시 엑셀 파일 3개와 대화형 AI로', d: '20분 안에 오류 없이', o: '파일을 한 번에 합치는 도구를', v: '만든다' },
    culture: { a: '참여 직원은', c: '이미지 생성 AI와 4컷 틀로', d: '특정인을 알아볼 수 없게', o: '상사와 나의 4컷 만화를', v: '그린다' },
    shop: { a: '사장님은', c: '대화형 AI와 이미지 생성 AI로', d: '실제 가게를 소재로 3개를', o: '바로 올릴 SNS 홍보 게시물을', v: '만든다' },
    teacher: { a: '강사는', c: '대화형 AI로', d: '세 가지 수준으로 나눠', o: '담당 과목의 맞춤형 강의계획서와 문제 세트를', v: '만든다' },
    senior: { a: '어르신은', c: '음성 입력과 이미지 생성 AI로', d: '보조 강사 도움을 받아 1장 이상', o: '손주에게 보낼 안부 카드를', v: '만든다' },
    youth: { a: '학생은', c: '대피 지도 틀과 이미지 생성 AI로', d: '탈출 경로 2개가 보이게', o: '우리 집 화재 대피 지도를', v: '만든다' }
  };
  function abcd(body) {
    const id = uid(), st = load(), l = st.learner || {}, cur = st.abcd || {};
    const aDefault = cur.a || (l.who ? josa(who(l.who).split(' ').slice(-1)[0], '은', '는') : '');
    body.innerHTML = `${personaButtons()}
      <div class="ld-form">
        <label for="${id}-a">A 대상 (누가?)</label><input id="${id}-a" data-k="a" type="text" maxlength="40" placeholder="예: 주무관은" value="${esc(aDefault)}">
        <label for="${id}-c">C 조건 (어떤 상황 · 도구로?)</label><input id="${id}-c" data-k="c" type="text" maxlength="50" placeholder="예: 예시 엑셀 파일 3개와 대화형 AI로" value="${esc(cur.c || '')}">
        <label for="${id}-d">D 기준 (얼마나?)</label><input id="${id}-d" data-k="d" type="text" maxlength="40" placeholder="예: 20분 안에 오류 없이" value="${esc(cur.d || '')}">
        <label for="${id}-o">B 무엇을</label><input id="${id}-o" data-k="o" type="text" maxlength="60" placeholder="예: 파일을 한 번에 합치는 도구를" value="${esc(cur.o || '')}">
        <label for="${id}-v">B 보이는 동사</label><select id="${id}-v" data-k="v">${Object.entries(VERBS).map(([lv, vs]) => `<optgroup label="${lv}">${vs.map(x => `<option ${(cur.v || '만든다') === x ? 'selected' : ''}>${x}</option>`).join('')}</optgroup>`).join('')}</select>
      </div>
      <div class="ld-out"><p class="ld-out-label">조립된 목표</p><p class="ld-sentence" aria-live="polite"></p></div>
      <div class="lab-actions"><button class="lab-button primary" type="button" data-act="add">목표 목록에 넣기</button><p class="lab-result" aria-live="polite"></p></div>
      <p class="ld-out-label">내 학습목표 (핵심 1 + 보조 1~2, 05 강의계획서로 이어짐)</p><ol class="ld-goals"></ol>`;
    const val = k => body.querySelector(`[data-k="${k}"]`).value.trim();
    const result = body.querySelector('.lab-result');
    const sentence = () => [val('a'), val('c'), val('d'), val('o'), val('v')].filter(Boolean).join(' ').replace(/\s+/g, ' ') + '.';
    function drawGoals() {
      const goals = load().goals || [];
      body.querySelector('.ld-goals').innerHTML = goals.length ? goals.map((g, i) => `<li>${esc(g)} <button class="lab-button ghost ld-x" type="button" data-del="${i}" aria-label="${i + 1}번 목표 지우기">지우기</button></li>`).join('') : '<li class="muted-line">아직 없습니다. 위에서 조립한 뒤 [목표 목록에 넣기]를 누르세요.</li>';
    }
    function update() { body.querySelector('.ld-sentence').textContent = sentence(); save({ abcd: { a: val('a'), c: val('c'), d: val('d'), o: val('o'), v: val('v') } }); }
    body.addEventListener('input', update); body.addEventListener('change', update);
    body.querySelector('.ld-presets').addEventListener('click', e => {
      const b = e.target.closest('[data-persona]'); if (!b) return;
      Object.entries(ABCD_EX[b.dataset.persona]).forEach(([k, x]) => { body.querySelector(`[data-k="${k}"]`).value = x; });
      update();
    });
    body.querySelector('[data-act="add"]').addEventListener('click', () => {
      const missing = [['a', 'A 대상'], ['o', 'B 무엇을']].filter(([k]) => !val(k)).map(([, n]) => n);
      if (missing.length) { result.textContent = `${missing.join(', ')} 칸을 채워 주세요.`; return; }
      const goals = load().goals || [];
      if (goals.length >= 3) { result.textContent = '한 차시 목표는 3개까지입니다. 하나를 지운 뒤 넣으세요.'; return; }
      const vague = vagueIn(sentence());
      if (vague.length) { result.textContent = `"${vague[0]}"는 보이지 않거나 장담할 수 없는 동사입니다. 보이는 동사로 바꿔 주세요.`; return; }
      save({ goals: [...goals, sentence()] }); result.textContent = '넣었습니다.'; drawGoals();
    });
    body.querySelector('.ld-goals').addEventListener('click', e => {
      const b = e.target.closest('[data-del]'); if (!b) return;
      const goals = load().goals || []; goals.splice(Number(b.dataset.del), 1); save({ goals }); drawGoals();
    });
    update(); drawGoals();
  }

  /* ───────── 04 시간 블록 짜기 ───────── */
  const TYPES = { 열기: '#ef8a17', '설명 · 시연': '#2f6fd0', 만들기: '#13897a', 나누기: '#7a52c7', 정리: '#8a94a3' };
  const TEMPLATES = {
    mind: [['열기: 오늘의 마음 날씨 한 단어로', 10, '열기', '돌아가며 한 단어 (패스 가능)'], ['완성본 보기: 강사의 그림책 4쪽', 5, '설명 · 시연', '보여 주기'], ['따라 만들기: 날씨 → 장면 요청 연습 1장', 20, '만들기', '시연 · 따라 하기'], ['내 것 만들기: 내 그림책 4장면 (상담사 순회)', 40, '만들기', '개별 작업'], ['나누기: 원하는 사람만 한 장면 소개', 10, '나누기', '선택적 나눔'], ['닫기: 마음 정리 · 다음에 펼쳐 볼 때', 5, '정리', '안내']],
    work: [['열기: "취합에 몇 분 걸려요?" 투표', 10, '열기', '투표'], ['완성본 보기: 1분 만에 합쳐지는 시연', 5, '설명 · 시연', '시연'], ['따라 만들기: 예시 파일 3개로 AI에게 요청 → 실행', 20, '만들기', '따라 하기'], ['내 것 만들기: 내 업무 파일 구조로 고치기', 40, '만들기', '개별 실습 · 순회'], ['나누기: 막혔던 곳 · 해결법 공유', 10, '나누기', '토의'], ['정리: 다음 달 쓸 위치 정하기', 5, '정리', '약속']],
    culture: [['열기: 직장 공감 밈 3장 보며 웃기', 10, '열기', '보기 · 반응'], ['완성본 보기: 강사의 예시 4컷 · 익명 규칙', 5, '설명 · 시연', '보여 주기'], ['따라 만들기: 4컷 틀 + 첫 컷 함께', 20, '만들기', '시연 · 따라 하기'], ['내 것 만들기: 나만의 4컷 (2인 1조)', 35, '만들기', '짝 작업'], ['나누기: 갤러리 워크 · 공감 스티커', 15, '나누기', '갤러리 워크'], ['정리: 상사에게 바라는 점 한 줄', 5, '정리', '쪽지']],
    shop: [['열기: "요즘 가장 힘든 것" 채팅 · 손님 줄어든 이유 투표', 15, '열기', '채팅 · 투표'], ['완성본 보기: 강사가 만든 가게 홍보 게시물 3개', 10, '설명 · 시연', '보여 주기'], ['따라 만들기: 예시 가게로 고객 분석 → 홍보 문구 → 이미지', 40, '만들기', '시연 · 따라 하기'], ['내 것 만들기: 우리 가게 게시물 3개 + 일주일 계획', 75, '만들기', '개별 실습 · 순회'], ['나누기: 게시물 갤러리 · 서로 댓글 달기', 30, '나누기', '갤러리 워크'], ['정리: 내일 올릴 시간 정하기 · 후속 설문', 10, '정리', '약속 · 설문']],
    teacher: [['열기: "수업 준비에 가장 오래 걸리는 일" 채팅', 15, '열기', '채팅'], ['완성본 보기: 수준별로 나뉜 강의계획서 예시', 10, '설명 · 시연', '보여 주기'], ['따라 만들기: 예시 과목으로 교육생 분석 → 목표 → 시간표', 40, '만들기', '시연 · 따라 하기'], ['내 것 만들기: 내 과목 강의계획서 + 수준별 문제 3세트', 75, '만들기', '개별 실습 · 순회'], ['나누기: 짝과 바꿔 보고 별 둘 소원 하나', 30, '나누기', '짝 피드백'], ['정리: 다음 수업에 적용할 한 가지', 10, '정리', '약속']],
    senior: [['열기: 손주 사진 대신 "보고 싶은 사람" 이야기', 10, '열기', '이야기 나누기'], ['완성본 보기: 강사의 안부 카드 · 받은 답장', 5, '설명 · 시연', '보여 주기'], ['따라 만들기: 말로 그림 요청 1장 (천천히 두 번)', 25, '만들기', '시범 · 따라 하기 · 보조 강사'], ['내 것 만들기: 내 카드 + 안부 한 줄', 35, '만들기', '개별 · 보조 강사 1:3'], ['나누기: 실제로 가족에게 보내 보기', 10, '나누기', '보내기 · 칭찬'], ['정리: 낯선 링크 · 결제 안내는 누르지 않기', 5, '정리', '사기 예방 안내']],
    youth: [['열기: 화재 OX 퀴즈 3문항', 7, '열기', '퀴즈'], ['완성본 보기: 강사의 대피 지도 · 신고 카드', 5, '설명 · 시연', '보여 주기'], ['따라 만들기: 대피 지도 틀 채우기 (미션 1)', 20, '만들기', '미션 카드 · 짝'], ['내 것 만들기: 우리 집 탈출 경로 2개 + 119 신고 카드 (미션 2 · 3)', 38, '만들기', '개별 · 짝 확인'], ['나누기: 짝에게 신고 말하기 연습', 15, '나누기', '역할극'], ['정리: 집에서 가족과 확인하기 과제', 5, '정리', '과제 안내']]
  };
  const toBlocks = t => t.map(([name, min, type, how]) => ({ name, min, type, how }));
  function timeBlocks(body) {
    const st = load();
    const start = st.persona && TEMPLATES[st.persona] ? st.persona : 'work';
    let blocks = (st.blocks && st.blocks.length ? st.blocks : toBlocks(TEMPLATES[start])).map(b => ({ ...b }));
    let total = Number((st.product || {}).minutes) || 90;
    let zoom = Boolean(st.zoom);
    body.innerHTML = `
      <div class="lab-actions ld-presets"><span class="ld-out-label">예시 시간표:</span>${Object.entries(PERSONAS).map(([k, p]) => `<button class="lab-button ghost" type="button" data-tpl="${k}">${p.label}</button>`).join('')}</div>
      <div class="ld-row"><label>총 시간 <input type="number" class="ld-total" min="10" max="480" step="5" value="${total}"> 분</label>
        <label><input type="checkbox" class="ld-zoom" ${zoom ? 'checked' : ''}> 줌 강의 (설명 기준 10분 → 7분)</label></div>
      <div class="ld-bar" aria-hidden="true"></div>
      <div class="ld-legend">${Object.entries(TYPES).map(([k, c]) => `<span><i style="background:${c}"></i>${k}</span>`).join('')}<span class="ld-make"></span></div>
      <div class="table-wrap"><table class="ld-blocks"><thead><tr><th>순서</th><th>블록 (무엇을)</th><th>종류</th><th>분</th><th></th></tr></thead><tbody></tbody></table></div>
      <div class="lab-actions"><button class="lab-button" type="button" data-act="add">블록 추가</button></div>
      <ul class="ld-warn" aria-live="polite"></ul>`;
    const tbody = body.querySelector('tbody');
    function draw() {
      tbody.innerHTML = blocks.map((b, i) => `<tr data-i="${i}"><td>${i + 1}</td>
        <td><input type="text" data-f="name" value="${esc(b.name)}" maxlength="60" aria-label="${i + 1}번 블록 내용"></td>
        <td><select data-f="type" aria-label="${i + 1}번 블록 종류">${Object.keys(TYPES).map(t => `<option ${b.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
        <td><input type="number" data-f="min" min="1" max="240" value="${b.min}" aria-label="${i + 1}번 블록 분"></td>
        <td class="ld-ops"><button type="button" class="lab-button ghost" data-op="up" aria-label="위로">▲</button><button type="button" class="lab-button ghost" data-op="down" aria-label="아래로">▼</button><button type="button" class="lab-button ghost" data-op="del" aria-label="지우기">✕</button></td></tr>`).join('');
      refresh();
    }
    function refresh() {
      const sum = blocks.reduce((a, b) => a + (Number(b.min) || 0), 0);
      const make = blocks.filter(b => b.type === '만들기').reduce((a, b) => a + (Number(b.min) || 0), 0);
      let t = 0;
      body.querySelector('.ld-bar').innerHTML = blocks.map(b => { const w = (Number(b.min) || 0) / Math.max(sum, total) * 100; const s = t; t += Number(b.min) || 0; return `<span style="width:${w}%;background:${TYPES[b.type] || '#999'}" title="${esc(b.name)} (${s}~${t}분)">${w > 6 ? b.min : ''}</span>`; }).join('');
      const pct = sum ? Math.round(make / sum * 100) : 0;
      body.querySelector('.ld-make').textContent = `· 만들기 ${make}분 (${pct}%)`;
      const limit = zoom ? 7 : 10, w = [];
      if (sum !== total) w.push(`합계 ${sum}분 · 총 시간 ${total}분과 ${Math.abs(sum - total)}분 ${sum > total ? '넘칩니다' : '모자랍니다'}.`);
      if (pct < 50) w.push(`만들기가 ${pct}%입니다. 절반 이상을 교육생이 직접 만드는 시간으로 두세요.`);
      blocks.forEach((b, i) => { if (b.type === '설명 · 시연' && Number(b.min) > limit) w.push(`${i + 1}번 설명이 ${b.min}분입니다. ${limit}분을 넘기면 나눠서 사이에 활동을 넣으세요.`); });
      if (!blocks.some(b => b.type === '열기')) w.push('열기 블록이 없습니다. 마음 열기 · 오늘 만들 것 보여 주기를 넣으세요.');
      if (!blocks.some(b => b.type === '나누기')) w.push('나누기 블록이 없습니다. 만든 것을 보여 주고 다음에 쓸 곳을 정하는 시간을 넣으세요.');
      body.querySelector('.ld-warn').innerHTML = w.length ? w.map(x => `<li>⚠️ ${esc(x)}</li>`).join('') : `<li class="ok">✓ 합계 ${sum}분, 만들기 ${pct}%, 설명 ${limit}분 이내, 열기 · 나누기 모두 있음.</li>`;
      save({ blocks, zoom });
    }
    tbody.addEventListener('input', e => { const tr = e.target.closest('tr'); if (!tr) return; const b = blocks[Number(tr.dataset.i)], f = e.target.dataset.f; b[f] = f === 'min' ? Number(e.target.value) || 0 : e.target.value; refresh(); });
    tbody.addEventListener('change', e => { if (e.target.dataset.f === 'type') { blocks[Number(e.target.closest('tr').dataset.i)].type = e.target.value; refresh(); } });
    tbody.addEventListener('click', e => {
      const op = e.target.closest('[data-op]'); if (!op) return;
      const i = Number(op.closest('tr').dataset.i);
      if (op.dataset.op === 'del') blocks.splice(i, 1);
      if (op.dataset.op === 'up' && i > 0) [blocks[i - 1], blocks[i]] = [blocks[i], blocks[i - 1]];
      if (op.dataset.op === 'down' && i < blocks.length - 1) [blocks[i + 1], blocks[i]] = [blocks[i], blocks[i + 1]];
      draw();
    });
    body.querySelector('.ld-total').addEventListener('input', e => { total = Number(e.target.value) || 90; refresh(); });
    body.querySelector('.ld-zoom').addEventListener('change', e => { zoom = e.target.checked; refresh(); });
    body.querySelector('[data-act="add"]').addEventListener('click', () => { blocks.splice(Math.max(blocks.length - 1, 0), 0, { name: '', min: 5, type: '만들기', how: '' }); draw(); });
    body.querySelector('.ld-presets').addEventListener('click', e => { const b = e.target.closest('[data-tpl]'); if (!b) return; blocks = toBlocks(TEMPLATES[b.dataset.tpl]); total = blocks.reduce((a, r) => a + r.min, 0); body.querySelector('.ld-total').value = total; draw(); });
    draw();
  }

  /* ───────── 05-① 교육생에 맞는 방법 · 평가 ───────── */
  const ALIGN_EVAL = [
    { q: '주무관은 예시 파일 3개를 합치는 도구를 만든다', a: '도구 실행 확인 (체크리스트)', why: '"만든다"는 만든 것이 돌아가는지 봅니다.' },
    { q: '참여자는 마음 날씨 그림책 4장면을 만든다', a: '완성 여부 + 스스로 고른 소감 한 줄', why: '정서 산출물에는 점수를 매기지 않습니다.' },
    { q: '직원은 익명 규칙을 지켜 풍자 4컷을 그린다', a: '갤러리 워크 · 공감 스티커', why: '관계 산출물은 함께 보며 공감으로 확인합니다.' },
    { q: '주무관은 다음 달 실제 취합에 도구를 쓴다', a: '사후 확인 (1~4주 뒤)', why: '현장 적용과 효과는 강의 뒤에 확인합니다.' }
  ];
  const ALIGN_METHOD = [
    { q: '바쁘고 실용적인 업무형 교육생', a: '짧은 시연 → 내 파일로 실습', why: '긴 원리 설명보다 바로 내 것에 적용.' },
    { q: '조심스러운 정서형 교육생', a: '예시 먼저 · 혼자 만들 시간 · 선택적 나눔', why: '발표 강요 · 점수는 피합니다.' },
    { q: '어색한 관계형 교육생', a: '웃음으로 열기 · 짝 작업 · 갤러리 워크', why: '특정인 지목 · 서열 드러내기는 피합니다.' },
    { q: '디지털이 낯선 시니어', a: '천천히 두 번 시범 · 보조 강사 1:3 · 바로 칭찬', why: '전문 용어와 빠른 화면 전환은 피합니다.' },
    { q: '집중이 짧은 청소년', a: '미션 · 게임 · 짝 활동 · 집으로 가져가는 과제', why: '긴 설명, 성적처럼 느껴지는 평가는 피합니다.' }
  ];
  function alignMatch(body) {
    body.innerHTML = '<p class="ld-out-label">Ⓐ 목표 → 알맞은 평가</p><div class="ld-a"></div><p class="ld-out-label">Ⓑ 교육생 → 알맞은 방법</p><div class="ld-b"></div>';
    pickGrade(body.querySelector('.ld-a'), ALIGN_EVAL, ALIGN_EVAL.map(x => x.a), { left: '목표', right: '알맞은 평가' });
    pickGrade(body.querySelector('.ld-b'), ALIGN_METHOD, ALIGN_METHOD.map(x => x.a), { left: '교육생', right: '알맞은 방법' });
  }

  /* ───────── 05-② 내 강의 안전 설계 ───────── */
  const SAFETY = [['선택권', '나눔 · 발표 · 카메라는 원하는 사람만, 중간에 멈출 수 있음'], ['익명 · 존중', '특정인을 알아볼 수 없게, 비하 · 외모 · 성별 · 나이 놀림 금지'], ['전문가', '정서 · 심리 대상이면 전문가 기획 · 동석, 위기 시 연락 체계'], ['데이터', '실습은 예시 데이터로, 개인정보 · 내부 자료는 AI에 넣지 않음'], ['도구', '기관 보안 규정상 쓸 수 있는 도구, 계정 · 비용 확인'], ['연령', '시니어는 사기 예방 안내, 미성년자는 보호자 · 학교 동의와 AI 이용 가능 연령 확인']];
  function safetyCheck(body) {
    const id = uid(), s0 = load().safety || {};
    body.innerHTML = `<fieldset class="ld-checks"><legend>내 강의에 해당하는 안전 장치를 고르세요</legend>${SAFETY.map(([k, d], i) => `<label><input type="checkbox" data-c="${i}" ${(s0.checks || [])[i] ? 'checked' : ''}> <b>${k}</b> · ${d}</label>`).join('')}</fieldset>
      <div class="ld-form"><label for="${id}-n">내 강의만의 안전 장치</label><input id="${id}-n" data-k="note" type="text" maxlength="120" placeholder="예: 정서 활동 중 힘들면 '패스' 카드 사용, 상담사 1명 순회" value="${esc(s0.note || '')}"></div>
      <div class="ld-out"><p class="ld-out-label">05 계획서의 "안전" 칸으로 이어짐</p><p class="ld-sentence" aria-live="polite"></p></div>`;
    const checks = [...body.querySelectorAll('[data-c]')];
    function update() {
      const picked = SAFETY.filter((_, i) => checks[i].checked).map(([k, d]) => `${k}: ${d}`);
      const note = body.querySelector('[data-k="note"]').value.trim();
      const text = [...picked, note].filter(Boolean).join(' / ');
      body.querySelector('.ld-sentence').textContent = text || '하나 이상 고르거나 적어 보세요.';
      save({ safety: { checks: checks.map(c => c.checked), note, text } });
    }
    body.addEventListener('input', update); body.addEventListener('change', update);
    update();
  }

  /* ───────── 06 맞춤 강의계획서 ───────── */
  const FIELDS = [
    ['title', '강의명', 'input'], ['learner', '교육생 (누구 · 인원 · 마음)', 'input'], ['need', '필요 (무엇이 어렵나)', 'input'], ['analysis', '수요조사 · 분석 결과 (핵심 문제)', 'textarea'],
    ['product', '산출물', 'input'], ['effect', '기대 효과 (만드는 과정 · 들고 간 뒤)', 'textarea'], ['minutes', '시간 (분)', 'number'], ['place', '환경 (장소 · 장비)', 'input'],
    ['goals', '학습목표 (한 줄에 하나, 1~3개)', 'textarea'], ['evalText', '평가 방법', 'textarea'], ['safety', '안전 장치', 'textarea'], ['materials', '준비물 · AI 도구', 'input']
  ];
  function fromEarlier(st) {
    const l = st.learner || {}, p = st.product || {};
    return {
      title: p.product ? `${p.product} 만들기` : '', learner: l.who ? `${l.who}${l.count ? ` ${l.count}` : ''}${l.heart ? ` (${l.heart})` : ''}` : '', need: l.need || '',
      product: p.product || '', effect: [p.during && `만드는 과정: ${p.during}`, p.after && `들고 간 뒤: ${p.after}`].filter(Boolean).join('\n'),
      minutes: Number(p.minutes) || 0, place: l.env || '', goals: (st.goals || []).join('\n'), safety: (st.safety || {}).text || '', materials: p.tool || '', analysis: (st.analysis || {}).text || ''
    };
  }
  function examplePlan(key) {
    const ps = PERSONAS[key], g = ABCD_EX[key];
    const ev = { shop: '게시물 3개 완성 여부 + 시작 · 끝 자신감(1~5), 2주 뒤 실제 게시 수 · 걸린 시간 확인', teacher: '강의계획서 체크리스트(목표 ABCD · 만들기 절반 · 평가 정렬) + 다음 수업 적용 후기', mind: '4장면 완성 여부 + 스스로 고른 소감 한 줄 (점수 없음), 상담사와 함께 기분 척도 전 · 후 확인', work: '예시 파일 3개 병합 실행 확인 체크리스트, 4주 뒤 실제 사용 여부 · 걸린 시간 확인', culture: '갤러리 워크 공감 스티커, 상사에게 바라는 점 한 줄 (점수 · 순위 없음)',
      senior: '카드 1장 이상 완성 · 가족에게 보내기 성공 여부, "다시 해 볼 수 있다" 자신감 한마디 (점수 없음)', youth: '미션 1~3 완료 체크, 짝 역할극으로 119 신고 말하기 확인, 집에서 가족과 확인한 사진 · 서명 (과제)' }[key];
    const sf = { shop: '실제 손님 이름 · 연락처 · 얼굴 사진은 넣지 않음 / 다른 가게 사진 · 유명인 이미지 무단 사용 금지, 생성 이미지 상업적 이용 조건 확인', teacher: '교육생 실명 · 성적 등 개인정보는 AI에 넣지 않음 / 기관 교안 · 저작물은 원문 대신 요약으로', mind: '나눔 · 카메라는 원하는 사람만, 언제든 패스 가능 / 상담사 기획 · 동석, 위기 시 연락 체계', work: '예시(가짜) 데이터로 실습, 실제 개인정보 · 내부 자료는 AI에 넣지 않음 / 기관 보안 규정 확인', culture: '특정인 식별 금지, 비하 · 외모 · 성별 · 나이 놀림 금지 / 공유는 원하는 사람만',
      senior: '큰 글씨 · 한 번에 한 단계 · 보조 강사 1:3 / 가족 사진 · 연락처는 AI에 올리지 않음, 낯선 링크 · 결제 안내 누르지 않기', youth: '실제 집 주소 · 얼굴 사진 · 학교 이름 넣지 않기 (지도는 대략의 그림) / 보호자 · 학교 동의, AI 서비스 이용 가능 연령 확인' }[key];
    return { analysis: ANALYSIS_EX[key] || '', title: `${ps.product} 만들기`, learner: `${ps.who} ${ps.count} (${ps.heart})`, need: ps.need, product: ps.product, effect: `만드는 과정: ${ps.during}\n들고 간 뒤: ${ps.after}`, minutes: TEMPLATES[key].reduce((a, r) => a + r[1], 0), place: ps.env,
      goals: `${`${Object.values(g).join(' ')}.`.replace(/\s+/g, ' ')}\n${{ shop: '사장님은 다음 주 게시물을 올릴 요일과 시간을 정한다.', teacher: '강사는 짝의 계획서를 보고 별 둘 · 소원 하나를 준다.', mind: '참여자는 장면마다 그 날의 감정에 날씨 이름을 붙인다.', work: '주무관은 다음 달 취합에서 도구를 쓸 파일 위치와 순서를 정한다.', culture: '참여 직원은 원하면 4컷을 보여 주며 상사에게 바라는 점 하나를 말한다.', senior: '어르신은 만든 카드를 가족에게 직접 보낸다.', youth: '학생은 짝에게 주소 대신 랜드마크로 119 신고를 말해 본다.' }[key]}`, evalText: ev, safety: sf, materials: ps.tool, rows: toBlocks(TEMPLATES[key]) };
  }
  function planBuilder(body) {
    const st = load();
    let plan = st.plan && Object.keys(st.plan).length ? st.plan : { ...fromEarlier(st), rows: (st.blocks || []).map(b => ({ ...b })) };
    if (!plan.rows || !plan.rows.length) plan.rows = toBlocks(TEMPLATES.work);
    const id = uid();
    body.innerHTML = `
      <div class="lab-actions"><button class="lab-button" type="button" data-act="pull">앞 장에서 적은 것 불러오기</button>${Object.entries(PERSONAS).map(([k, p]) => `<button class="lab-button ghost" type="button" data-example="${k}">예시: ${p.label}</button>`).join('')}<button class="lab-button ghost" type="button" data-act="clear">모두 지우기</button></div>
      <div class="ld-plan">
        <div class="ld-form ld-plan-form">${FIELDS.map(([k, label, kind]) => `<label for="${id}-${k}">${label}</label>${kind === 'textarea' ? `<textarea id="${id}-${k}" data-k="${k}" rows="${k === 'goals' ? 3 : 2}"></textarea>` : `<input id="${id}-${k}" data-k="${k}" type="${kind === 'number' ? 'number' : 'text'}" ${kind === 'number' ? 'min="10" max="480" step="5"' : 'maxlength="140"'}>`}`).join('')}
          <p class="ld-out-label">시간표 (4-3 시간 블록에서 이어짐)</p>
          <div class="table-wrap"><table class="ld-blocks ld-rows"><thead><tr><th>분</th><th>내용</th><th>방법</th><th></th></tr></thead><tbody></tbody></table></div>
          <div class="lab-actions"><button class="lab-button" type="button" data-act="row">줄 추가</button></div>
        </div>
        <div class="ld-preview-wrap"><p class="ld-out-label">미리보기 · 점검</p><ul class="ld-warn"></ul><div class="ld-preview"></div></div>
      </div>
      <div class="lab-actions">
        <button class="lab-button primary" type="button" data-act="open">계획서 새 창으로 열기 (인쇄 · PDF 저장)</button>
        <button class="lab-button" type="button" data-act="copy">글로 복사</button>
        <button class="lab-button" type="button" data-act="ai">AI 검토 요청 복사</button>
        <p class="lab-result" aria-live="polite"></p>
      </div>`;
    const tbody = body.querySelector('.ld-rows tbody');
    const fill = () => { FIELDS.forEach(([k]) => { body.querySelector(`[data-k="${k}"]`).value = plan[k] == null ? '' : plan[k]; }); drawRows(); };
    function drawRows() {
      tbody.innerHTML = plan.rows.map((r, i) => `<tr data-i="${i}"><td><input type="number" data-f="min" min="1" max="240" value="${Number(r.min) || 0}" aria-label="${i + 1}번 줄 분"></td><td><input type="text" data-f="name" value="${esc(r.name)}" maxlength="80" aria-label="${i + 1}번 줄 내용"></td><td><input type="text" data-f="how" value="${esc(r.how || r.type || '')}" maxlength="40" aria-label="${i + 1}번 줄 방법"></td><td class="ld-ops"><button type="button" class="lab-button ghost" data-op="del" aria-label="지우기">✕</button></td></tr>`).join('');
      refresh();
    }
    const goalsOf = () => String(plan.goals || '').split('\n').map(x => x.trim()).filter(Boolean);
    const timeline = () => { let t = 0; return plan.rows.map(r => { const s = t; t += Number(r.min) || 0; return { ...r, from: s, to: t }; }); };
    function checks() {
      const w = [], goals = goalsOf(), sum = plan.rows.reduce((a, r) => a + (Number(r.min) || 0), 0), total = Number(plan.minutes) || 0;
      const make = plan.rows.filter(r => r.type === '만들기' || /만들기|실습|작업|그리기/.test(r.name + (r.how || ''))).reduce((a, r) => a + (Number(r.min) || 0), 0);
      if (!plan.learner) w.push('교육생 칸이 비었습니다 (02장).');
      if (!plan.analysis) w.push('수요조사 · 분석 결과가 비었습니다 (03장).');
      if (!plan.product) w.push('결과물 칸이 비었습니다 (4-2).');
      if (!goals.length) w.push('학습목표가 없습니다 (4-1).'); else if (goals.length > 3) w.push(`학습목표가 ${goals.length}개입니다. 1~3개를 권합니다.`);
      goals.forEach((g, i) => { const v = vagueIn(g); if (v.length) w.push(`목표 ${i + 1}의 "${v[0]}"는 보이지 않거나 장담할 수 없는 동사입니다.`); });
      if (total && sum !== total) w.push(`시간표 합계 ${sum}분 ≠ 총 ${total}분`);
      if (sum && make / sum < 0.5) w.push(`만들기 시간이 ${Math.round(make / sum * 100)}%입니다. 절반 이상을 권합니다 (4-3).`);
      if (!plan.evalText) w.push('평가 방법이 비었습니다 (4-4).');
      if (!plan.safety) w.push('안전 장치가 비었습니다 (4-4).');
      return w.length ? w.map(m => [m, false]) : [['빈칸 없음 · 시간 합계 맞음 · 만들기 절반 이상 · 목표 동사 확인 완료. 이제 예시 산출물을 직접 한 번 만들어 보세요.', true]];
    }
    function text() {
      const L = [`■ 강의계획서: ${plan.title || ''}`, `교육생: ${plan.learner || ''}`, `필요: ${plan.need || ''}`, `수요조사 · 분석: ${String(plan.analysis || '').replace(/\n/g, ' / ')}`, `산출물: ${plan.product || ''}`, `기대 효과: ${String(plan.effect || '').replace(/\n/g, ' / ')}`, `시간: ${plan.minutes || ''}분 · 환경: ${plan.place || ''}`, '학습목표:'];
      goalsOf().forEach((g, i) => L.push(`  ${i + 1}. ${g}`));
      L.push('시간표:'); timeline().forEach(r => L.push(`  ${r.from}~${r.to}분 | ${r.name} | ${r.how || ''}`));
      L.push(`평가 방법: ${plan.evalText || ''}`, `안전 장치: ${String(plan.safety || '').replace(/\n/g, ' / ')}`, `준비물 · AI 도구: ${plan.materials || ''}`);
      return L.join('\n');
    }
    const br = t => esc(t).replace(/\n/g, '<br>');
    function html() {
      return `<h2 class="lp-title">${esc(plan.title || '강의명')}</h2>
        <table class="lp-meta"><tr><th>교육생</th><td colspan="3">${esc(plan.learner)}</td></tr><tr><th>필요</th><td colspan="3">${esc(plan.need)}</td></tr><tr><th>수요조사 · 분석</th><td colspan="3">${br(plan.analysis)}</td></tr>
        <tr><th>산출물</th><td>${esc(plan.product)}</td><th>시간</th><td>${esc(plan.minutes)}분</td></tr><tr><th>기대 효과</th><td colspan="3">${br(plan.effect)}</td></tr><tr><th>환경</th><td colspan="3">${esc(plan.place)}</td></tr></table>
        <h3>학습목표</h3><ol>${goalsOf().map(g => `<li>${esc(g)}</li>`).join('') || '<li>—</li>'}</ol>
        <h3>시간표</h3><table class="lp-rows"><thead><tr><th>시간</th><th>내용</th><th>방법</th></tr></thead><tbody>${timeline().map(r => `<tr><td>${r.from}~${r.to}분</td><td>${esc(r.name)}</td><td>${esc(r.how || '')}</td></tr>`).join('')}</tbody></table>
        <table class="lp-meta"><tr><th>평가</th><td>${br(plan.evalText) || '—'}</td></tr><tr><th>안전 장치</th><td>${br(plan.safety) || '—'}</td></tr><tr><th>준비물 · AI</th><td>${esc(plan.materials)}</td></tr></table>`;
    }
    function refresh() {
      body.querySelector('.ld-preview').innerHTML = html();
      body.querySelector('.ld-warn').innerHTML = checks().map(([m, ok]) => `<li class="${ok ? 'ok' : ''}">${ok ? '✓' : '⚠️'} ${esc(m)}</li>`).join('');
      save({ plan });
    }
    body.querySelector('.ld-plan-form').addEventListener('input', e => {
      const k = e.target.dataset.k;
      if (k) { plan[k] = k === 'minutes' ? Number(e.target.value) || 0 : e.target.value; refresh(); return; }
      const tr = e.target.closest('tr'); if (!tr) return;
      const r = plan.rows[Number(tr.dataset.i)], f = e.target.dataset.f;
      r[f] = f === 'min' ? Number(e.target.value) || 0 : e.target.value; refresh();
    });
    tbody.addEventListener('click', e => { const op = e.target.closest('[data-op="del"]'); if (op) { plan.rows.splice(Number(op.closest('tr').dataset.i), 1); drawRows(); } });
    const result = body.querySelector('.lab-result');
    body.addEventListener('click', e => {
      const ex = e.target.closest('[data-example]');
      if (ex) { plan = examplePlan(ex.dataset.example); fill(); result.textContent = ''; return; }
      const act = e.target.closest('[data-act]'); if (!act) return;
      const a = act.dataset.act;
      if (a === 'row') { plan.rows.push({ name: '', min: 5, how: '' }); drawRows(); }
      if (a === 'pull') {
        const s = load(), e2 = fromEarlier(s);
        Object.entries(e2).forEach(([k, v]) => { if (v) plan[k] = v; });
        if ((s.blocks || []).length) plan.rows = s.blocks.map(b => ({ ...b }));
        fill(); result.textContent = '02 교육생 · 03 분석 · 4-1 목표 · 4-2 결과물 · 4-3 시간 · 4-4 안전에서 적은 것을 불러왔습니다.';
      }
      if (a === 'clear') { plan = { rows: [{ name: '열기', min: 10, type: '열기', how: '' }] }; fill(); }
      if (a === 'copy') copyText(text(), act);
      if (a === 'ai') copyText(`너는 교육생 맞춤 강의를 설계하는 교수설계 전문가야. 아래 강의계획서를 검토해 줘.\n1) 교육생(누구 · 필요 · 마음 · 환경)에 정말 맞는지, 다른 교육생에게도 그대로 쓸 수 있는 계획이면 무엇을 바꿔야 하는지\n2) 산출물이 각자 "내 것"이 되고 시간 안에 완성되는지, 산출물이 곧 기대 효과로 이어지는지\n3) 학습목표가 ABCD를 갖췄는지, 보이지 않거나 장담할 수 없는 동사(이해한다 · 함양한다 · 치유된다 등)가 있는지\n4) 목표 · 활동 · 평가의 정렬, 만들기 시간이 절반 이상인지, 설명이 10분을 넘는 곳\n5) 안전(선택권 · 익명 · 전문가 · 데이터 · 도구)\n고칠 점을 표로(항목 | 지금 | 고친 안 | 이유) 보여 주고, 효과에 대한 연구 · 통계는 지어내지 말고 근거가 필요하면 "[확인 필요]"로 표시해 줘.\n\n${text()}`, act);
      if (a === 'open') {
        const doc = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>강의계획서 · ${esc(plan.title || '')}</title><style>
          body{font:14px/1.6 "Malgun Gothic","Apple SD Gothic Neo",sans-serif;color:#111;max-width:760px;margin:24px auto;padding:0 16px}
          .lp-title{font-size:22px;border-bottom:3px solid #c8321e;padding-bottom:6px} h3{font-size:15px;margin:18px 0 6px;color:#14213d}
          table{border-collapse:collapse;width:100%;margin:6px 0} th,td{border:1px solid #bbb;padding:6px 8px;text-align:left;vertical-align:top} th{background:#f1f3f6;white-space:nowrap;width:110px}
          .bar{display:flex;gap:8px;margin-bottom:16px} button{font:inherit;padding:8px 14px;border:0;border-radius:6px;background:#c8321e;color:#fff;cursor:pointer}
          @media print{.bar{display:none} body{margin:0}}</style></head><body><div class="bar"><button onclick="print()">인쇄 · PDF로 저장</button></div>${html()}
          <p style="color:#777;font-size:12px;margin-top:18px">교육생 맞춤 강의 설계 워크숍 · www.jg-sobang.com/lesson-design/</p></body></html>`;
        const w = window.open(URL.createObjectURL(new Blob([doc], { type: 'text/html' })), '_blank');
        result.textContent = w ? '새 창에서 [인쇄 · PDF로 저장]을 누르세요.' : '팝업이 막혔습니다. [글로 복사]를 쓰거나 팝업을 허용해 주세요.';
      }
    });
    fill();
  }


  /* ───────── 02-③ 즉석 주제 정하기 연습 ───────── */
  // 강사가 열린 질문 → 세 번 더 묻기 → 메뉴에서 고르기를 직접 진행해 봅니다.
  const LIVE = {
    shop: { label: '🏪 동네 식당 사장님', first: '장사가 안 돼요~',
      follow: [['언제 특히 그러세요?', '점심은 그럭저럭인데, 저녁 손님이 뚝 끊겨요.'], ['손님들이 왜 안 올까요?', '근처에 새 가게들이 생겼는데, 우리 가게는 동네 사람들도 잘 몰라요.'], ['무엇이 바뀌면 제일 좋겠어요?', '동네 사람들이 우리 가게를 알고, 한 번이라도 와 봤으면 좋겠어요.']],
      need: '동네 사람들이 우리 가게를 모른다',
      menu: [['🖼', '가게 SNS 홍보 카드 3장', '이미지 생성 AI', '내일부터 동네 단톡 · SNS에 올림'], ['🎵', '우리 가게 30초 CM송', '음악 생성 AI', '가게 앞 · 영상에 틀어 기억에 남기기'], ['💬', '단골 감사 문자 · 쿠폰 문구 세트', '대화형 AI', '온 손님이 다시 오게']] },
    market: { label: '🧺 전통시장 상인', first: '손님들이 다 마트로 가요.',
      follow: [['어떤 손님이 줄었어요?', '젊은 사람들이요. 어르신 단골만 남았어요.'], ['젊은 손님은 뭘 보고 가게를 고를까요?', '휴대폰으로 찾아보고 오더라고요. 우리는 사진 한 장 없어요.'], ['무엇이 바뀌면 좋겠어요?', '우리 가게 물건이 신선하다는 걸 보여 주고 싶어요.']],
      need: '젊은 손님이 볼 가게 사진 · 소개가 없다',
      menu: [['🖼', '오늘의 신선 상품 소개 카드', '이미지 생성 AI', '매일 아침 시장 단톡 · SNS에'], ['💬', '가게 소개 글 · 지도 등록 문구', '대화형 AI', '검색했을 때 우리 가게가 나오게'], ['🎵', '우리 시장 응원가', '음악 생성 AI', '시장 행사 · 영상에 함께 쓰기']] },
    daycare: { label: '👩‍🏫 어린이집 교사', first: '서류가 너무 많아요.',
      follow: [['어떤 서류가 제일 오래 걸려요?', '아이들 관찰일지랑 학부모님께 보내는 알림장이요.'], ['왜 오래 걸릴까요?', '아이마다 다르게 써야 하는데, 매번 처음부터 써요.'], ['무엇이 바뀌면 좋겠어요?', '아이들과 노는 시간이 더 길었으면 좋겠어요.']],
      need: '알림장 · 관찰일지를 매번 처음부터 쓴다',
      menu: [['💬', '알림장 문장 틀 10개 (상황별)', '대화형 AI', '내일 알림장부터 5분 단축'], ['📊', '관찰 메모 → 일지 정리표', '대화형 AI + 표', '짧은 메모만 적으면 일지가 정리됨'], ['🎵', '정리 시간 노래 (우리 반 버전)', '음악 생성 AI', '정리 시간이 즐거워짐']] },
    fire: { label: '🚒 신임 소방 교육생', first: '외울 게 너무 많아요.',
      follow: [['뭐가 제일 안 외워져요?', '무전 용어랑 장비 점검 순서요.'], ['언제 공부하세요?', '이동할 때나 자기 전에 잠깐씩이요. 책 펴기는 힘들어요.'], ['무엇이 바뀌면 좋겠어요?', '귀로 듣거나 휴대폰으로 금방 확인할 수 있으면 좋겠어요.']],
      need: '틈틈이 듣고 확인할 수 있는 자료가 없다',
      menu: [['🎙', '무전 용어 듣기 퀴즈 오디오', '음성 합성 AI', '이동 중에 이어폰으로'], ['🎵', '장비 점검 순서 암기 노래', '음악 생성 AI', '흥얼거리며 순서가 몸에 붙음'], ['📊', '출동 전 점검 체크 화면', '대화형 AI + 웹', '현장에서 휴대폰으로 바로 확인']] },
    senior: { label: '👵 복지관 어르신', first: '자식들이 바빠서 연락이 없어요.',
      follow: [['연락은 주로 어떻게 하세요?', '전화는 미안해서 못 하고, 문자는 어려워요.'], ['손주들은 뭘 좋아할까요?', '그림이나 사진 보내 주면 좋아하더라고요.'], ['무엇이 바뀌면 좋겠어요?', '내가 먼저 안부를 보내 보고 싶어요.']],
      need: '내가 먼저 보낼 수 있는 쉬운 안부 방법이 없다',
      menu: [['🖼', '손주에게 보내는 AI 그림 안부 카드', '이미지 생성 AI (음성 입력)', '오늘 바로 보내고 답장 받기'], ['🎙', '내 목소리 음성 편지', '녹음 · 음성 AI', '글이 어려워도 마음 전하기'], ['🎵', '추억을 가사로 쓴 내 인생 노래', '음악 생성 AI', '가족 모임에서 함께 듣기']] }
  };
  function liveTopic(body) {
    let key = null, asked = [], pick = null;
    body.innerHTML = `
      <div class="lab-actions ld-presets"><span class="ld-out-label">교육생:</span>${Object.entries(LIVE).map(([k, v]) => `<button class="lab-button ghost" type="button" data-live="${k}">${v.label}</button>`).join('')}</div>
      <div class="vis-chat ld-live-chat" aria-live="polite" hidden></div>
      <div class="ld-live-ask" hidden><p class="ld-out-label">② 더 물어보기 (눌러서 질문)</p><div class="lab-actions ld-qs"></div></div>
      <div class="ld-live-need ld-out" hidden></div>
      <div class="ld-live-menu" hidden><p class="ld-out-label">③ 준비한 산출물 메뉴에서 함께 고르기</p><div class="vis-cards ld-menu"></div></div>
      <div class="ld-live-done" hidden></div>`;
    const chat = body.querySelector('.ld-live-chat');
    const say = (who, msg) => { chat.insertAdjacentHTML('beforeend', `<div class="vc-msg ${who === '강사' ? 'teacher' : 'learner'}"><span class="vc-who">${who === '강사' ? '🧑‍🏫' : '🙋'} ${who}</span><p>${esc(msg)}</p></div>`); chat.scrollTop = chat.scrollHeight; };
    function drawAsk() {
      const L = LIVE[key];
      body.querySelector('.ld-qs').innerHTML = L.follow.map(([q], i) => `<button class="lab-button ${asked.includes(i) ? 'ghost' : ''}" type="button" data-q="${i}" ${asked.includes(i) ? 'disabled' : ''}>${esc(q)}</button>`).join('');
      const needBox = body.querySelector('.ld-live-need');
      needBox.hidden = asked.length < 3;
      needBox.innerHTML = `<p class="ld-out-label">찾은 진짜 필요</p><p class="ld-sentence">"${esc(L.first.replace(/~/g, ''))}" → ${esc(L.need)}</p>`;
      body.querySelector('.ld-live-menu').hidden = asked.length < 3;
      body.querySelector('.ld-menu').innerHTML = L.menu.map(([ic, name, tool, eff], i) => `<button type="button" class="vc-card ld-menu-card ${pick === i ? 'picked' : ''}" data-m="${i}"><span class="vc-icon">${ic}</span><p class="vc-title">${esc(tool)}</p><p class="vc-main">${esc(name)}</p><p class="vc-sub">${esc(eff)}</p></button>`).join('');
    }
    body.addEventListener('click', e => {
      const lv = e.target.closest('[data-live]');
      if (lv) {
        key = lv.dataset.live; asked = []; pick = null;
        chat.hidden = false; chat.innerHTML = '';
        say('강사', '요즘 어떤 게 가장 힘드세요?'); say(LIVE[key].label.replace(/^\S+\s/, ''), LIVE[key].first);
        body.querySelector('.ld-live-ask').hidden = false; body.querySelector('.ld-live-done').hidden = true;
        body.querySelectorAll('[data-live]').forEach(b => b.classList.toggle('ghost', b !== lv));
        drawAsk(); return;
      }
      const q = e.target.closest('[data-q]');
      if (q && key) {
        const i = Number(q.dataset.q), [qq, aa] = LIVE[key].follow[i];
        asked.push(i); say('강사', qq); say(LIVE[key].label.replace(/^\S+\s/, ''), aa); drawAsk(); return;
      }
      const m = e.target.closest('[data-m]');
      if (m && key) {
        pick = Number(m.dataset.m); drawAsk();
        const L = LIVE[key], [, name, tool, eff] = L.menu[pick];
        const who = L.label.replace(/^\S+\s/, '');
        const line = `${josa(who, '이', '가')} ${josa(name, '을', '를')} 만들어 가는 실습 → ${eff}`;
        say('강사', `그럼 오늘은 "${name}"을(를) 함께 만들어 가 보죠!`.replace(/"을\(를\)/, () => { const c = name.charCodeAt(name.length - 1); return c >= 0xac00 && c <= 0xd7a3 ? ((c - 0xac00) % 28 ? '"을' : '"를') : '"을(를)'; }));
        const done = body.querySelector('.ld-live-done'); done.hidden = false;
        done.innerHTML = `<p class="vn-result"><span>④ 오늘의 주제</span>${esc(line)} <small>(${esc(tool)})</small></p><div class="lab-actions"><button class="lab-button" type="button" data-act="copy-live">채팅에 올릴 한 줄 복사</button><button class="lab-button ghost" type="button" data-live="${key}">처음부터 다시</button></div>`;
        done.querySelector('[data-act="copy-live"]').addEventListener('click', ev => copyText(`[즉석 주제] ${line} (${tool})`, ev.currentTarget));
      }
    });
  }

  const INLINE = {
    'learner-card': { title: '내 교육생 카드', time: '약 4분', goal: '네 렌즈(누구 · 필요 · 마음 · 환경)로 내 교육생을 적습니다. 아직 없으면 예시 세 가지 중 하나를 눌러 따라 하세요.', build: learnerCard },
    'product-remix': { title: '교육생 카드 뽑기: 같은 도구, 다른 산출물', time: '약 5분', goal: '처음 보는 교육생을 뽑아, 오늘 쓸 도구로 그 사람에게 맞는 산출물과 효과를 직접 적습니다. 다섯 조건으로 점검하고, 한 줄을 줌 채팅에 올려 서로의 답을 봅니다.', build: productRemix },
    'product-funnel': { title: '내 산출물 깔때기', time: '약 5분', goal: '02장의 교육생에게 맞는 결과물과 효과를 적고, 좋은 산출물의 다섯 조건으로 점검합니다.', build: productFunnel },
    'goal-judge': { title: '좋은 목표 · 고칠 목표', time: '약 3분', goal: '목표 문장마다 좋은 목표인지 고칠 목표인지 고르고 이유를 확인합니다.', build: goalJudge },
    abcd: { title: 'ABCD 목표 조립', time: '약 4분', goal: 'A · B · C · D를 채워 핵심 목표(만들기)와 보조 목표(마음 · 관계)를 목록에 넣습니다.', build: abcd },
    'time-blocks': { title: '내 90분 시간 블록 짜기', time: '약 5분', goal: '예시 시간표를 내 강의에 맞게 고칩니다. 합계 · 만들기 비율 · 설명 길이 · 열기 · 나누기를 자동으로 점검합니다.', build: timeBlocks },
    'align-match': { title: '목표에 맞는 평가 · 교육생에 맞는 방법', time: '약 3분', goal: 'Ⓐ 목표마다 알맞은 평가, Ⓑ 교육생 유형마다 알맞은 방법을 고릅니다.', build: alignMatch },
    'safety-check': { title: '내 강의 안전 설계', time: '약 2분', goal: '여섯 가지 안전 장치 중 내 강의에 필요한 것을 고르고, 나만의 장치를 한 줄 더합니다.', build: safetyCheck },
    'live-topic': { title: '즉석 주제 정하기 연습: 강사가 되어 물어보기', time: '약 4분', goal: '교육생 그룹을 골라, 첫 대답(증상)에서 세 번 더 물어 진짜 필요를 찾고, 준비한 메뉴에서 오늘의 산출물을 함께 고르는 흐름을 연습합니다.', build: liveTopic },
    'survey-builder': { title: '실습 1. 우리 팀 수요조사 설문 만들기', time: '약 8분', goal: '우리 팀 교육생을 고르면 공통 문항 7개가 채워집니다. 질문을 우리 교육생에 맞게 고쳐 쓰고, 경고(도구 중심 · 개인정보 · 문항 수)를 확인한 뒤 인쇄하거나 복사합니다.', build: surveyBuilder },
    'response-analysis': { title: '응답 분석 연습: 묶고, 세고, 고르기', time: '약 8분', goal: '우리 팀의 가상 응답 8개를 문제 유형으로 묶으면 자동으로 세어 줍니다. 핵심 문제 3가지를 고르면 결과물과 교육 목표 예시가 나오고, 05 강의계획서로 이어집니다.', build: responseAnalysis },
    'plan-builder': { title: '내 맞춤 강의계획서 한 장', time: '약 8분', goal: '앞 장에서 적은 것을 불러와 빈칸을 채웁니다. 오른쪽 점검이 모두 ✓가 되면 새 창으로 열어 PDF로 저장하세요.', build: planBuilder }
  };

  function inline(kind, host) {
    const spec = INLINE[kind];
    if (!host || !spec) return;
    host.dataset.printTitle = spec.title;
    host.innerHTML = `<section class="inline-lab"><p class="lab-kind"><span>바로 해 보기</span>${spec.time}</p><h3 class="inline-title">${spec.title}</h3><p class="lab-goal">${spec.goal}</p><div class="lab-body"></div></section>`;
    spec.build(host.querySelector('.lab-body'));
  }

  window.Practice = { inline, mount() {} };
})();
