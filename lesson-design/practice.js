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

  /* ───────── 세 가지 예시 교육생 ───────── */
  const PERSONAS = {
    mind: { label: '🌱 마음 돌봄', who: '우울감 · 스트레스를 겪는 성인 참여자', count: '8명', kind: '정서 · 표현', need: '감정을 말로 꺼내기 어렵다', heart: '조심스럽다, 평가받기 싫다', env: '90분, 소그룹, 상담사 동석, 태블릿',
      product: '내 마음 날씨 그림책 (4쪽)', during: '감정을 날씨 · 장면으로 바꾸며 말 대신 표현', after: '힘들 때 다시 펼쳐 보는 나만의 책', tool: '이미지 생성 AI' },
    work: { label: '🗂 행정 공무원', who: '매달 부서별 엑셀을 손으로 합치는 주무관', count: '15명', kind: '업무 · 기술', need: '반복 취합에 매달 30분 넘게 쓴다', heart: '바쁘다, 바로 쓸 걸 원한다', env: '90분, 업무 PC, 외부 프로그램 설치 불가',
      product: '엑셀 파일 병합 자동화 도구', during: '내 업무를 단계로 쪼개 보는 업무 분석', after: '매달 취합 30분 → 1분', tool: '대화형 AI (매크로 · 스크립트)' },
    culture: { label: '🤝 조직문화', who: '세대 · 직급이 섞인 한 부서 직원', count: '20명', kind: '관계 · 문화', need: '상사와 대화가 어렵고 분위기가 무겁다', heart: '어색하다, 억지 참여가 싫다', env: '90분, 강당, 노트북 2인 1대',
      product: '상사와 나, 풍자 4컷 만화', during: '불편함을 웃음으로 꺼내 보기', after: '상사와 함께 보며 대화의 계기', tool: '이미지 생성 AI' }
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
      body.querySelector('.ld-hint').textContent = `→ 02장 산출물 힌트: ${HINT[card.kind]}`;
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

  /* ───────── 02-① 교육생 ↔ 산출물 잇기 ───────── */
  const MATCH_ITEMS = [
    { q: '매달 부서별 엑셀을 손으로 합치는 주무관', a: '엑셀 병합 자동화 도구', why: '업무 필요 → 다음 날 바로 쓰는 도구' },
    { q: '감정을 말로 꺼내기 어려운 마음 돌봄 참여자', a: '내 마음 날씨 그림책', why: '정서 필요 → 말 대신 그림으로 표현' },
    { q: '상사와 대화가 어려운 부서 직원들', a: '상사와 나, 풍자 4컷 만화', why: '관계 필요 → 웃음으로 꺼내는 대화의 계기' },
    { q: '출동 전 점검을 자주 빠뜨리는 신임 소방 교육생', a: '출동 전 장비 점검 체크 화면', why: '업무 필요 → 현장에서 바로 쓰는 내 점검표' },
    { q: '은퇴를 1년 앞둔 직원', a: '내 인생 연표와 다음 10년 버킷리스트', why: '정서 필요 → 돌아보고 내다보기' }
  ];
  const productMatch = body => pickGrade(body, MATCH_ITEMS, ['엑셀 병합 자동화 도구', '내 마음 날씨 그림책', '상사와 나, 풍자 4컷 만화', '출동 전 장비 점검 체크 화면', '내 인생 연표와 다음 10년 버킷리스트'], { left: '교육생', right: '들고 갈 산출물' });

  /* ───────── 02-② 산출물 깔때기 ───────── */
  const PCHECK = [['내 것', '교육생 각자의 상황 · 감정 · 업무가 들어간다'], ['바로 씀', '강의 다음 날 실제로 쓰거나 보게 된다'], ['시간 안에 완성', '주어진 시간 안에 끝까지 만든다'], ['도구는 최소', '꼭 필요한 기능만 쓴다'], ['안전', '만들고 나누며 상처받거나 곤란해질 사람이 없다']];
  const PF = [['product', '산출물 (무엇을 만들어 가나)', '예: 엑셀 병합 자동화 도구'], ['during', '만드는 과정의 효과', '예: 내 업무를 단계로 쪼개 보기'], ['after', '들고 간 뒤의 효과', '예: 매달 30분 → 1분'], ['tool', '필요한 도구', '예: 대화형 AI']];
  function productFunnel(body) {
    const id = uid(), st = load(), p = st.product || {}, l = st.learner || {};
    body.innerHTML = `${personaButtons()}
      <p class="ld-note">01장 교육생: <b class="ld-who">${esc(l.who ? `${l.who} ${l.count || ''} · 필요: ${l.need || ''}` : '아직 없음 (01장 교육생 카드를 먼저 채우거나 예시를 누르세요)')}</b></p>
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
      body.querySelector('.ld-verdict').textContent = !d.product ? '' : n === 5 ? '다섯 조건을 모두 통과했습니다. 03 학습목표로 갑니다.' : `조건 ${n} / 5 · ✓가 안 되는 조건이 있으면 산출물을 더 좁히거나 바꿔 보세요.`;
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
    culture: { a: '참여 직원은', c: '이미지 생성 AI와 4컷 틀로', d: '특정인을 알아볼 수 없게', o: '상사와 나의 4컷 만화를', v: '그린다' }
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
      <p class="ld-out-label">내 학습목표 (핵심 1 + 보조 1~2, 06 강의계획서로 이어짐)</p><ol class="ld-goals"></ol>`;
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
    culture: [['열기: 직장 공감 밈 3장 보며 웃기', 10, '열기', '보기 · 반응'], ['완성본 보기: 강사의 예시 4컷 · 익명 규칙', 5, '설명 · 시연', '보여 주기'], ['따라 만들기: 4컷 틀 + 첫 컷 함께', 20, '만들기', '시연 · 따라 하기'], ['내 것 만들기: 나만의 4컷 (2인 1조)', 35, '만들기', '짝 작업'], ['나누기: 갤러리 워크 · 공감 스티커', 15, '나누기', '갤러리 워크'], ['정리: 상사에게 바라는 점 한 줄', 5, '정리', '쪽지']]
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
    body.querySelector('.ld-presets').addEventListener('click', e => { const b = e.target.closest('[data-tpl]'); if (!b) return; blocks = toBlocks(TEMPLATES[b.dataset.tpl]); total = 90; body.querySelector('.ld-total').value = 90; draw(); });
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
    { q: '어색한 관계형 교육생', a: '웃음으로 열기 · 짝 작업 · 갤러리 워크', why: '특정인 지목 · 서열 드러내기는 피합니다.' }
  ];
  function alignMatch(body) {
    body.innerHTML = '<p class="ld-out-label">Ⓐ 목표 → 알맞은 평가</p><div class="ld-a"></div><p class="ld-out-label">Ⓑ 교육생 → 알맞은 방법</p><div class="ld-b"></div>';
    pickGrade(body.querySelector('.ld-a'), ALIGN_EVAL, ALIGN_EVAL.map(x => x.a), { left: '목표', right: '알맞은 평가' });
    pickGrade(body.querySelector('.ld-b'), ALIGN_METHOD, ALIGN_METHOD.map(x => x.a), { left: '교육생', right: '알맞은 방법' });
  }

  /* ───────── 05-② 내 강의 안전 설계 ───────── */
  const SAFETY = [['선택권', '나눔 · 발표 · 카메라는 원하는 사람만, 중간에 멈출 수 있음'], ['익명 · 존중', '특정인을 알아볼 수 없게, 비하 · 외모 · 성별 · 나이 놀림 금지'], ['전문가', '정서 · 심리 대상이면 전문가 기획 · 동석, 위기 시 연락 체계'], ['데이터', '실습은 예시 데이터로, 개인정보 · 내부 자료는 AI에 넣지 않음'], ['도구', '기관 보안 규정상 쓸 수 있는 도구, 계정 · 비용 확인']];
  function safetyCheck(body) {
    const id = uid(), s0 = load().safety || {};
    body.innerHTML = `<fieldset class="ld-checks"><legend>내 강의에 해당하는 안전 장치를 고르세요</legend>${SAFETY.map(([k, d], i) => `<label><input type="checkbox" data-c="${i}" ${(s0.checks || [])[i] ? 'checked' : ''}> <b>${k}</b> · ${d}</label>`).join('')}</fieldset>
      <div class="ld-form"><label for="${id}-n">내 강의만의 안전 장치</label><input id="${id}-n" data-k="note" type="text" maxlength="120" placeholder="예: 정서 활동 중 힘들면 '패스' 카드 사용, 상담사 1명 순회" value="${esc(s0.note || '')}"></div>
      <div class="ld-out"><p class="ld-out-label">06 계획서의 "안전" 칸으로 이어짐</p><p class="ld-sentence" aria-live="polite"></p></div>`;
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
    ['title', '강의명', 'input'], ['learner', '교육생 (누구 · 인원 · 마음)', 'input'], ['need', '필요 (무엇이 어렵나)', 'input'],
    ['product', '산출물', 'input'], ['effect', '기대 효과 (만드는 과정 · 들고 간 뒤)', 'textarea'], ['minutes', '시간 (분)', 'number'], ['place', '환경 (장소 · 장비)', 'input'],
    ['goals', '학습목표 (한 줄에 하나, 1~3개)', 'textarea'], ['evalText', '평가 방법', 'textarea'], ['safety', '안전 장치', 'textarea'], ['materials', '준비물 · AI 도구', 'input']
  ];
  function fromEarlier(st) {
    const l = st.learner || {}, p = st.product || {};
    return {
      title: p.product ? `${p.product} 만들기` : '', learner: l.who ? `${l.who}${l.count ? ` ${l.count}` : ''}${l.heart ? ` (${l.heart})` : ''}` : '', need: l.need || '',
      product: p.product || '', effect: [p.during && `만드는 과정: ${p.during}`, p.after && `들고 간 뒤: ${p.after}`].filter(Boolean).join('\n'),
      minutes: Number(p.minutes) || 0, place: l.env || '', goals: (st.goals || []).join('\n'), safety: (st.safety || {}).text || '', materials: p.tool || ''
    };
  }
  function examplePlan(key) {
    const ps = PERSONAS[key], g = ABCD_EX[key];
    const ev = { mind: '4장면 완성 여부 + 스스로 고른 소감 한 줄 (점수 없음), 상담사와 함께 기분 척도 전 · 후 확인', work: '예시 파일 3개 병합 실행 확인 체크리스트, 4주 뒤 실제 사용 여부 · 걸린 시간 확인', culture: '갤러리 워크 공감 스티커, 상사에게 바라는 점 한 줄 (점수 · 순위 없음)' }[key];
    const sf = { mind: '나눔 · 카메라는 원하는 사람만, 언제든 패스 가능 / 상담사 기획 · 동석, 위기 시 연락 체계', work: '예시(가짜) 데이터로 실습, 실제 개인정보 · 내부 자료는 AI에 넣지 않음 / 기관 보안 규정 확인', culture: '특정인 식별 금지, 비하 · 외모 · 성별 · 나이 놀림 금지 / 공유는 원하는 사람만' }[key];
    return { title: `${ps.product} 만들기`, learner: `${ps.who} ${ps.count} (${ps.heart})`, need: ps.need, product: ps.product, effect: `만드는 과정: ${ps.during}\n들고 간 뒤: ${ps.after}`, minutes: 90, place: ps.env,
      goals: `${`${Object.values(g).join(' ')}.`.replace(/\s+/g, ' ')}\n${{ mind: '참여자는 장면마다 그 날의 감정에 날씨 이름을 붙인다.', work: '주무관은 다음 달 취합에서 도구를 쓸 파일 위치와 순서를 정한다.', culture: '참여 직원은 원하면 4컷을 보여 주며 상사에게 바라는 점 하나를 말한다.' }[key]}`, evalText: ev, safety: sf, materials: ps.tool, rows: toBlocks(TEMPLATES[key]) };
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
          <p class="ld-out-label">시간표 (04 시간 블록에서 이어짐)</p>
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
      if (!plan.learner) w.push('교육생 칸이 비었습니다 (01장).');
      if (!plan.product) w.push('산출물 칸이 비었습니다 (02장).');
      if (!goals.length) w.push('학습목표가 없습니다 (03장).'); else if (goals.length > 3) w.push(`학습목표가 ${goals.length}개입니다. 1~3개를 권합니다.`);
      goals.forEach((g, i) => { const v = vagueIn(g); if (v.length) w.push(`목표 ${i + 1}의 "${v[0]}"는 보이지 않거나 장담할 수 없는 동사입니다.`); });
      if (total && sum !== total) w.push(`시간표 합계 ${sum}분 ≠ 총 ${total}분`);
      if (sum && make / sum < 0.5) w.push(`만들기 시간이 ${Math.round(make / sum * 100)}%입니다. 절반 이상을 권합니다 (04장).`);
      if (!plan.evalText) w.push('평가 방법이 비었습니다 (05장).');
      if (!plan.safety) w.push('안전 장치가 비었습니다 (05장).');
      return w.length ? w.map(m => [m, false]) : [['빈칸 없음 · 시간 합계 맞음 · 만들기 절반 이상 · 목표 동사 확인 완료. 이제 예시 산출물을 직접 한 번 만들어 보세요.', true]];
    }
    function text() {
      const L = [`■ 강의계획서: ${plan.title || ''}`, `교육생: ${plan.learner || ''}`, `필요: ${plan.need || ''}`, `산출물: ${plan.product || ''}`, `기대 효과: ${String(plan.effect || '').replace(/\n/g, ' / ')}`, `시간: ${plan.minutes || ''}분 · 환경: ${plan.place || ''}`, '학습목표:'];
      goalsOf().forEach((g, i) => L.push(`  ${i + 1}. ${g}`));
      L.push('시간표:'); timeline().forEach(r => L.push(`  ${r.from}~${r.to}분 | ${r.name} | ${r.how || ''}`));
      L.push(`평가 방법: ${plan.evalText || ''}`, `안전 장치: ${String(plan.safety || '').replace(/\n/g, ' / ')}`, `준비물 · AI 도구: ${plan.materials || ''}`);
      return L.join('\n');
    }
    const br = t => esc(t).replace(/\n/g, '<br>');
    function html() {
      return `<h2 class="lp-title">${esc(plan.title || '강의명')}</h2>
        <table class="lp-meta"><tr><th>교육생</th><td colspan="3">${esc(plan.learner)}</td></tr><tr><th>필요</th><td colspan="3">${esc(plan.need)}</td></tr>
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
        fill(); result.textContent = '01 교육생 · 02 산출물 · 03 목표 · 04 시간 · 05 안전에서 적은 것을 불러왔습니다.';
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

  const INLINE = {
    'learner-card': { title: '내 교육생 카드', time: '약 4분', goal: '네 렌즈(누구 · 필요 · 마음 · 환경)로 내 교육생을 적습니다. 아직 없으면 예시 세 가지 중 하나를 눌러 따라 하세요.', build: learnerCard },
    'product-match': { title: '교육생 ↔ 산출물 잇기', time: '약 3분', goal: '교육생마다 들고 갈 산출물을 골라 채점합니다. 필요(업무 · 정서 · 관계)와 산출물의 관계를 봅니다.', build: productMatch },
    'product-funnel': { title: '내 산출물 깔때기', time: '약 5분', goal: '01장의 교육생에게 맞는 산출물과 효과를 적고, 좋은 산출물의 다섯 조건으로 점검합니다.', build: productFunnel },
    'goal-judge': { title: '좋은 목표 · 고칠 목표', time: '약 3분', goal: '목표 문장마다 좋은 목표인지 고칠 목표인지 고르고 이유를 확인합니다.', build: goalJudge },
    abcd: { title: 'ABCD 목표 조립', time: '약 4분', goal: 'A · B · C · D를 채워 핵심 목표(만들기)와 보조 목표(마음 · 관계)를 목록에 넣습니다.', build: abcd },
    'time-blocks': { title: '내 90분 시간 블록 짜기', time: '약 5분', goal: '예시 시간표를 내 강의에 맞게 고칩니다. 합계 · 만들기 비율 · 설명 길이 · 열기 · 나누기를 자동으로 점검합니다.', build: timeBlocks },
    'align-match': { title: '목표에 맞는 평가 · 교육생에 맞는 방법', time: '약 3분', goal: 'Ⓐ 목표마다 알맞은 평가, Ⓑ 교육생 유형마다 알맞은 방법을 고릅니다.', build: alignMatch },
    'safety-check': { title: '내 강의 안전 설계', time: '약 2분', goal: '다섯 가지 안전 장치 중 내 강의에 필요한 것을 고르고, 나만의 장치를 한 줄 더합니다.', build: safetyCheck },
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
