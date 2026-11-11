// 강의 설계 워크숍 "바로 해 보기" 7가지.
// 적은 내용은 이 브라우저(localStorage 'ld-plan')에만 저장되고, 05의 강의계획서 칸으로 이어집니다. 어디에도 전송하지 않습니다.
(() => {
  'use strict';

  const KEY = 'ld-plan';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) { return {}; } };
  const save = patch => { const next = { ...load(), ...patch }; try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (_) { /* 저장소 없음 */ } return next; };
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 7);
  const shuffle = list => { const c = [...list]; for (let i = c.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
  const VAGUE = ['이해한다', '이해할 수 있다', '안다', '알 수 있다', '익힌다', '함양한다', '인식한다', '배운다', '습득한다', '숙지한다', '고취한다'];
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

  /* ───────── 01-① 주제 깔때기 ───────── */
  const FUNNEL = [
    ['field', '① 분야', '넓은 분야 (예: 공기호흡기)', '공기호흡기'],
    ['target', '② 대상', '누구에게? 수준은? (예: 신임 교육생, 처음 다룸)', '신임 교육생 24명 (공기호흡기를 처음 다룸)'],
    ['problem', '③ 문제', '지금 무엇을 못 하나? (예: 착용 전 점검을 빠뜨림)', '착용 전 점검을 빠뜨리거나 순서가 섞임'],
    ['action', '④ 한 가지', '끝나면 할 수 있는 한 가지 행동', '착용 전 점검 5단계를 빠짐없이 수행']
  ];
  const CRITERIA = [['현장성', '내일 현장(업무)에서 달라지는 것이 있다'], ['대상 적합', '대상의 수준 · 경험에 맞다'], ['전문성', '내가 경험과 근거로 설명할 수 있다'], ['시간 안에 가능', '한 차시(50분) 안에 끝낼 수 있다']];
  function topicFunnel(body) {
    const id = uid();
    const t = load().topic || {};
    body.innerHTML = `
      <div class="ld-form">${FUNNEL.map(([k, label, ph]) => `
        <label for="${id}-${k}">${label}</label><input id="${id}-${k}" data-k="${k}" type="text" maxlength="80" placeholder="${esc(ph)}" value="${esc(t[k] || '')}">`).join('')}
        <label for="${id}-min">⑤ 시간 (분)</label><input id="${id}-min" data-k="minutes" type="number" min="10" max="240" step="5" value="${esc(t.minutes || 50)}">
      </div>
      <div class="ld-out"><p class="ld-out-label">내 주제 문장</p><p class="ld-sentence" aria-live="polite"></p></div>
      <fieldset class="ld-checks"><legend>네 가지 조건 (모두 ✓면 좋은 주제)</legend>${CRITERIA.map(([k, d], i) => `
        <label><input type="checkbox" data-c="${i}" ${(t.checks || [])[i] ? 'checked' : ''}> <b>${k}</b> · ${d}</label>`).join('')}</fieldset>
      <p class="lab-result ld-verdict" aria-live="polite"></p>
      <div class="lab-actions"><button class="lab-button ghost" type="button" data-act="example">예시로 채우기</button><button class="lab-button" type="button" data-act="copy">주제 문장 복사</button></div>`;
    const inputs = [...body.querySelectorAll('input[data-k]')];
    const checks = [...body.querySelectorAll('input[data-c]')];
    function update() {
      const v = Object.fromEntries(inputs.map(i => [i.dataset.k, i.value.trim()]));
      const sentence = v.target && v.action
        ? `${josa(who(v.target), '이', '가')} ${v.action}할 수 있게 하는 ${v.minutes || 50}분 강의${v.field ? ` (${v.field})` : ''}`
        : '② 대상과 ④ 한 가지를 적으면 주제 문장이 만들어집니다.';
      body.querySelector('.ld-sentence').textContent = sentence;
      const n = checks.filter(c => c.checked).length;
      const verdict = body.querySelector('.ld-verdict');
      verdict.textContent = !(v.target && v.action) ? '' : n === 4 ? '네 조건을 모두 통과했습니다. 이 주제로 02 학습목표로 갑니다.' : `조건 ${n} / 4 · ✓가 안 되는 조건이 있으면 ③ 문제나 ④ 한 가지를 더 좁혀 보세요.`;
      save({ topic: { ...v, sentence: v.target && v.action ? sentence : '', checks: checks.map(c => c.checked) } });
    }
    body.addEventListener('input', update);
    body.querySelector('[data-act="example"]').addEventListener('click', () => {
      FUNNEL.forEach(([k, , , ex]) => { body.querySelector(`[data-k="${k}"]`).value = ex; });
      body.querySelector('[data-k="minutes"]').value = 50;
      checks.forEach(c => { c.checked = true; });
      update();
    });
    body.querySelector('[data-act="copy"]').addEventListener('click', e => copyText(body.querySelector('.ld-sentence').textContent, e.currentTarget));
    update();
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

  /* ───────── 01-② 주제 고르기 ───────── */
  const SORT_OPTS = ['너무 넓음', '한 차시에 알맞음', '교육으로 풀 문제가 아님'];
  const SORT_ITEMS = [
    { q: '소방 전술의 이해', a: '너무 넓음', why: '대상 · 문제 · 행동이 없습니다. 한 학기 분량입니다.' },
    { q: '신임 교육생이 공기호흡기 착용 전 점검 5단계를 빠짐없이 수행하기', a: '한 차시에 알맞음', why: '대상 · 행동이 분명하고 50분 안에 연습까지 됩니다.' },
    { q: '고장 난 무전기가 많아 교신이 자주 끊기는 문제 해결', a: '교육으로 풀 문제가 아님', why: '원인이 장비입니다. 정비 · 교체가 먼저입니다.' },
    { q: '구급대원이 개정된 이송 보고서 양식을 10분 안에 작성하기', a: '한 차시에 알맞음', why: '바뀐 양식을 모르는 것은 교육으로 풀립니다.' },
    { q: '재난 대응 체계 전반', a: '너무 넓음', why: '여러 차시 과정 주제입니다. 대상과 행동 하나로 좁힙니다.' },
    { q: '출동 대기 일정에 점검 시간이 아예 없어 점검을 못 하는 문제', a: '교육으로 풀 문제가 아님', why: '원인이 일과(시간)입니다. 절차 조정이 먼저입니다.' }
  ];
  const topicSort = body => pickGrade(body, SORT_ITEMS, SORT_OPTS, { left: '주제 후보', right: '판정' });

  /* ───────── 02-① 목표 판정 ───────── */
  const GOAL_ITEMS = [
    { q: '공기호흡기의 중요성을 이해한다.', a: '고칠 목표', why: '"이해한다"는 보이지 않습니다. 무엇으로 확인할지 알 수 없습니다.' },
    { q: '교육생은 점검표를 보며 3분 안에 착용 전 점검 5단계를 빠짐없이 수행한다.', a: '좋은 목표', why: 'A · B · C · D가 모두 있습니다.' },
    { q: '강사는 점검 순서를 시범으로 보여 준다.', a: '고칠 목표', why: '강사가 할 일입니다. 목표는 교육생이 할 수 있게 되는 것입니다.' },
    { q: '교육생은 압력계 사진 5장을 보고 사용 가능 여부를 모두 맞게 판단한다.', a: '좋은 목표', why: '조건(사진 5장) · 기준(모두 맞게) · 보이는 동사(판단한다)가 있습니다.' },
    { q: '현장 안전 의식을 함양한다.', a: '고칠 목표', why: '"함양한다"는 보이지 않습니다. 예: "출동 전 안전 점검표를 스스로 작성한다".' },
    { q: '교육생은 착용 전 점검 항목 5가지를 순서대로 말한다.', a: '좋은 목표', why: '기억 수준의 보이는 동사(말한다)입니다. 보조 목표로 알맞습니다.' }
  ];
  const goalJudge = body => pickGrade(body, GOAL_ITEMS, ['좋은 목표', '고칠 목표'], { left: '목표 문장', right: '판정' });

  /* ───────── 02-② ABCD 목표 조립 ───────── */
  const VERBS = { '기억': ['나열한다', '말한다', '찾는다'], '이해': ['설명한다', '구분한다', '예를 든다'], '적용': ['수행한다', '점검한다', '작성한다', '시연한다'], '분석': ['원인을 찾는다', '비교한다', '분류한다'], '평가': ['판단한다', '고른다', '검토한다'], '창조': ['계획한다', '만든다', '설계한다'] };
  function abcd(body) {
    const id = uid();
    const st = load();
    const topic = st.topic || {};
    body.innerHTML = `
      <div class="ld-form">
        <label for="${id}-a">A 대상 (누가?)</label><input id="${id}-a" data-k="a" type="text" maxlength="40" placeholder="예: 신임 교육생은" value="${esc((st.abcd || {}).a || (topic.target ? josa(who(topic.target), '은', '는') : ''))}">
        <label for="${id}-c">C 조건 (어떤 상황 · 도구로?)</label><input id="${id}-c" data-k="c" type="text" maxlength="40" placeholder="예: 점검표를 보며" value="${esc((st.abcd || {}).c || '')}">
        <label for="${id}-d">D 기준 (얼마나 잘?)</label><input id="${id}-d" data-k="d" type="text" maxlength="40" placeholder="예: 3분 안에 빠짐없이" value="${esc((st.abcd || {}).d || '')}">
        <label for="${id}-o">B 행동의 대상 (무엇을?)</label><input id="${id}-o" data-k="o" type="text" maxlength="60" placeholder="예: 착용 전 점검 5단계를" value="${esc((st.abcd || {}).o || '')}">
        <label for="${id}-v">B 보이는 동사</label><select id="${id}-v" data-k="v">${Object.entries(VERBS).map(([lv, vs]) => `<optgroup label="${lv}">${vs.map(v => `<option ${((st.abcd || {}).v || '수행한다') === v ? 'selected' : ''}>${v}</option>`).join('')}</optgroup>`).join('')}</select>
      </div>
      <div class="ld-out"><p class="ld-out-label">조립된 목표</p><p class="ld-sentence" aria-live="polite"></p></div>
      <div class="lab-actions"><button class="lab-button primary" type="button" data-act="add">목표 목록에 넣기</button><button class="lab-button ghost" type="button" data-act="example">예시로 채우기</button><p class="lab-result" aria-live="polite"></p></div>
      <p class="ld-out-label">내 학습목표 (1~3개, 05 강의계획서로 이어짐)</p><ol class="ld-goals"></ol>`;
    const val = k => body.querySelector(`[data-k="${k}"]`).value.trim();
    const result = body.querySelector('.lab-result');
    const sentence = () => [val('a'), val('c'), val('d'), val('o'), val('v')].filter(Boolean).join(' ').replace(/\s+/g, ' ') + '.';
    function drawGoals() {
      const goals = load().goals || [];
      body.querySelector('.ld-goals').innerHTML = goals.length
        ? goals.map((g, i) => `<li>${esc(g)} <button class="lab-button ghost ld-x" type="button" data-del="${i}" aria-label="${i + 1}번 목표 지우기">지우기</button></li>`).join('')
        : '<li class="muted-line">아직 없습니다. 위에서 조립한 뒤 [목표 목록에 넣기]를 누르세요.</li>';
    }
    function update() {
      body.querySelector('.ld-sentence').textContent = sentence();
      save({ abcd: { a: val('a'), c: val('c'), d: val('d'), o: val('o'), v: val('v') } });
    }
    body.addEventListener('input', update);
    body.addEventListener('change', update);
    body.querySelector('[data-act="add"]').addEventListener('click', () => {
      const missing = [['a', 'A 대상'], ['o', 'B 무엇을'], ['d', 'D 기준']].filter(([k]) => !val(k)).map(([, n]) => n);
      if (missing.length) { result.textContent = `${missing.join(', ')} 칸을 채워 주세요. (C 조건은 비워도 됩니다)`; return; }
      const goals = load().goals || [];
      if (goals.length >= 3) { result.textContent = '한 차시 목표는 3개까지입니다. 하나를 지운 뒤 넣으세요.'; return; }
      const vague = vagueIn(sentence());
      if (vague.length) { result.textContent = `"${vague[0]}"는 보이지 않는 동사입니다. 보이는 동사로 바꿔 주세요.`; return; }
      save({ goals: [...goals, sentence()] });
      result.textContent = '넣었습니다.';
      drawGoals();
    });
    body.querySelector('[data-act="example"]').addEventListener('click', () => {
      [['a', '신임 교육생은'], ['c', '점검표를 보며'], ['d', '3분 안에 빠짐없이'], ['o', '공기호흡기 착용 전 점검 5단계를'], ['v', '수행한다']].forEach(([k, v]) => { body.querySelector(`[data-k="${k}"]`).value = v; });
      update();
    });
    body.querySelector('.ld-goals').addEventListener('click', e => {
      const b = e.target.closest('[data-del]');
      if (!b) return;
      const goals = load().goals || [];
      goals.splice(Number(b.dataset.del), 1);
      save({ goals });
      drawGoals();
    });
    update(); drawGoals();
  }

  /* ───────── 03 시간 블록 짜기 ───────── */
  const TYPES = { 설명: '#2f6fd0', 활동: '#13897a', 평가: '#7a52c7', 도입: '#ef8a17', 정리: '#8a94a3' };
  const DEFAULT_BLOCKS = [
    { name: '도입: 아차사고 장면 · 목표 · 경험 묻기', min: 5, type: '도입', how: '질문 · 사진' },
    { name: '전개 ①: 점검 5단계 시범과 설명', min: 10, type: '설명', how: '시범 · 설명' },
    { name: '활동 ①: 짝 실습 (점검표 보며 따라 하기)', min: 10, type: '활동', how: '실습' },
    { name: '전개 ②: 자주 틀리는 곳 3가지 · 압력 기준', min: 8, type: '설명', how: '설명 · 사례' },
    { name: '활동 ②: 3분 점검 실연, 짝이 체크리스트로 확인', min: 10, type: '평가', how: '실습 · 평가' },
    { name: '정리: 결과 공유 · 현장 적용 약속', min: 7, type: '정리', how: '토의' }
  ];
  function timeBlocks(body) {
    const st = load();
    let blocks = (st.blocks && st.blocks.length ? st.blocks : DEFAULT_BLOCKS).map(b => ({ ...b }));
    let total = Number((st.topic || {}).minutes) || 50;
    let zoom = Boolean(st.zoom);
    body.innerHTML = `
      <div class="ld-row"><label>총 시간 <input type="number" class="ld-total" min="10" max="240" step="5" value="${total}"> 분</label>
        <label><input type="checkbox" class="ld-zoom" ${zoom ? 'checked' : ''}> 줌 강의 (설명 블록 기준 10분 → 7분)</label></div>
      <div class="ld-bar" aria-hidden="true"></div>
      <div class="ld-legend">${Object.entries(TYPES).map(([k, c]) => `<span><i style="background:${c}"></i>${k}</span>`).join('')}</div>
      <div class="table-wrap"><table class="ld-blocks"><thead><tr><th>순서</th><th>블록 (무엇을)</th><th>종류</th><th>분</th><th></th></tr></thead><tbody></tbody></table></div>
      <div class="lab-actions"><button class="lab-button" type="button" data-act="add">블록 추가</button><button class="lab-button ghost" type="button" data-act="reset">예시로 되돌리기</button></div>
      <ul class="ld-warn" aria-live="polite"></ul>`;
    const tbody = body.querySelector('tbody');
    function draw() {
      tbody.innerHTML = blocks.map((b, i) => `<tr data-i="${i}">
        <td>${i + 1}</td>
        <td><input type="text" data-f="name" value="${esc(b.name)}" maxlength="60" aria-label="${i + 1}번 블록 내용"></td>
        <td><select data-f="type" aria-label="${i + 1}번 블록 종류">${Object.keys(TYPES).map(t => `<option ${b.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
        <td><input type="number" data-f="min" min="1" max="120" value="${b.min}" aria-label="${i + 1}번 블록 분"></td>
        <td class="ld-ops"><button type="button" class="lab-button ghost" data-op="up" aria-label="위로">▲</button><button type="button" class="lab-button ghost" data-op="down" aria-label="아래로">▼</button><button type="button" class="lab-button ghost" data-op="del" aria-label="지우기">✕</button></td></tr>`).join('');
      refresh();
    }
    function refresh() {
      const sum = blocks.reduce((a, b) => a + (Number(b.min) || 0), 0);
      const bar = body.querySelector('.ld-bar');
      let t = 0;
      bar.innerHTML = blocks.map(b => { const w = (Number(b.min) || 0) / Math.max(sum, total) * 100; const s = t; t += Number(b.min) || 0; return `<span style="width:${w}%;background:${TYPES[b.type] || '#999'}" title="${esc(b.name)} (${s}~${t}분)">${w > 6 ? `${b.min}` : ''}</span>`; }).join('');
      const limit = zoom ? 7 : 10;
      const warns = [];
      if (sum !== total) warns.push(`합계 ${sum}분 · 총 시간 ${total}분과 ${Math.abs(sum - total)}분 ${sum > total ? '넘칩니다' : '모자랍니다'}.`);
      blocks.forEach((b, i) => { if (b.type === '설명' && Number(b.min) > limit) warns.push(`${i + 1}번 설명 블록이 ${b.min}분입니다. ${limit}분을 넘기면 중간에 활동을 하나 끼워 보세요.`); });
      for (let i = 1; i < blocks.length; i += 1) if (blocks[i].type === '설명' && blocks[i - 1].type === '설명') warns.push(`${i}번과 ${i + 1}번이 연달아 설명입니다. 사이에 활동을 넣어 보세요.`);
      if (!blocks.some(b => b.type === '도입')) warns.push('도입 블록이 없습니다. 주의 끌기 · 목표 알리기를 넣어 보세요.');
      if (!blocks.some(b => b.type === '정리')) warns.push('정리 블록이 없습니다.');
      if (!blocks.some(b => b.type === '평가')) warns.push('평가(확인) 블록이 없습니다. 목표를 무엇으로 확인할지 넣어 보세요 (04장).');
      body.querySelector('.ld-warn').innerHTML = warns.length ? warns.map(w => `<li>⚠️ ${esc(w)}</li>`).join('') : `<li class="ok">✓ 합계 ${sum}분, 설명은 ${limit}분 이내, 도입 · 평가 · 정리가 모두 있습니다.</li>`;
      save({ blocks, zoom });
    }
    tbody.addEventListener('input', e => {
      const tr = e.target.closest('tr'); if (!tr) return;
      const b = blocks[Number(tr.dataset.i)], f = e.target.dataset.f;
      b[f] = f === 'min' ? Number(e.target.value) || 0 : e.target.value;
      refresh();
    });
    tbody.addEventListener('change', e => { if (e.target.dataset.f === 'type') { blocks[Number(e.target.closest('tr').dataset.i)].type = e.target.value; refresh(); } });
    tbody.addEventListener('click', e => {
      const op = e.target.closest('[data-op]'); if (!op) return;
      const i = Number(op.closest('tr').dataset.i);
      if (op.dataset.op === 'del') blocks.splice(i, 1);
      if (op.dataset.op === 'up' && i > 0) [blocks[i - 1], blocks[i]] = [blocks[i], blocks[i - 1]];
      if (op.dataset.op === 'down' && i < blocks.length - 1) [blocks[i + 1], blocks[i]] = [blocks[i], blocks[i + 1]];
      draw();
    });
    body.querySelector('.ld-total').addEventListener('input', e => { total = Number(e.target.value) || 50; refresh(); });
    body.querySelector('.ld-zoom').addEventListener('change', e => { zoom = e.target.checked; refresh(); });
    body.querySelector('[data-act="add"]').addEventListener('click', () => { blocks.splice(Math.max(blocks.length - 1, 0), 0, { name: '활동: ', min: 5, type: '활동', how: '' }); draw(); });
    body.querySelector('[data-act="reset"]').addEventListener('click', () => { blocks = DEFAULT_BLOCKS.map(b => ({ ...b })); draw(); });
    draw();
  }

  /* ───────── 04 목표 · 방법 · 평가 맞추기 ───────── */
  const ALIGN_EVAL = [
    { q: '점검 5단계를 3분 안에 빠짐없이 수행한다', a: '체크리스트로 실기 관찰', why: '"수행"은 해 보는 것을 보고 확인합니다.' },
    { q: '점검 항목 5가지를 순서대로 말한다', a: '단답 · 객관식 퀴즈', why: '기억 수준은 짧은 퀴즈로 충분합니다.' },
    { q: '점검 누락 사고 사례에서 원인을 찾는다', a: '사례 보고 판단 쓰기', why: '분석 · 판단은 사례에 대한 답으로 봅니다.' },
    { q: '우리 팀의 월간 장비 점검 훈련 계획을 세운다', a: '결과물(계획서) 평가', why: '"계획한다"는 만들어 낸 결과물로 봅니다.' }
  ];
  const ALIGN_METHOD = [
    { q: '점검 5단계를 수행한다', a: '시범 → 실습', why: '동작이 있는 기술은 보여 주고 해 보게 합니다.' },
    { q: '바뀐 장비 관리 지침의 핵심 3가지를 설명한다', a: '짧은 강의 + 질문', why: '새 기준은 짧게 설명하고 질문으로 확인합니다.' },
    { q: '현장에서 사용 가능 여부를 판단한다', a: '사례 토의', why: '판단은 여러 사례를 놓고 이야기하며 기릅니다.' },
    { q: '팀 점검 훈련 계획을 세운다', a: '프로젝트 (조별 작성)', why: '만드는 목표는 직접 만들어 보게 합니다.' }
  ];
  function alignMatch(body) {
    body.innerHTML = '<p class="ld-out-label">Ⓐ 목표 → 평가</p><div class="ld-a"></div><p class="ld-out-label">Ⓑ 목표 → 방법</p><div class="ld-b"></div>';
    pickGrade(body.querySelector('.ld-a'), ALIGN_EVAL, ['체크리스트로 실기 관찰', '단답 · 객관식 퀴즈', '사례 보고 판단 쓰기', '결과물(계획서) 평가'], { left: '목표', right: '알맞은 평가' });
    pickGrade(body.querySelector('.ld-b'), ALIGN_METHOD, ['시범 → 실습', '짧은 강의 + 질문', '사례 토의', '프로젝트 (조별 작성)'], { left: '목표', right: '알맞은 방법' });
  }

  /* ───────── 05 강의계획서 만들기 ───────── */
  const EXAMPLE_PLAN = {
    title: '공기호흡기 착용 전 점검', target: '신임 교육생 24명 (공기호흡기를 처음 다룸)', minutes: 50, place: '실습장 (장비 12세트, 2인 1조)',
    need: '현장 실습에서 착용 전 점검을 빠뜨리거나 순서가 섞이는 일이 반복됨',
    goals: '교육생은 착용 전 점검 항목 5가지를 순서대로 말한다.\n교육생은 점검표를 보며 3분 안에 빠짐없이 착용 전 점검 5단계를 수행한다.',
    evalText: '활동 ②에서 짝이 체크리스트(5개 항목, 3분)로 실기 관찰 · 통과하지 못하면 재실습',
    materials: '공기호흡기 12세트, 점검표 24장, 체크리스트, 초시계, 소독 티슈',
    safety: '실습 전 장비 상태 확인, 면체 소독, 2인 1조로 서로 확인 · 담당 교관 1명 순회'
  };
  const FIELDS = [
    ['title', '강의명', 'input'], ['target', '대상 (인원 · 수준)', 'input'], ['minutes', '시간 (분)', 'number'], ['place', '장소 · 조건', 'input'],
    ['need', '교육 요구 (왜 필요한가)', 'textarea'], ['goals', '학습목표 (한 줄에 하나, 1~3개)', 'textarea'],
    ['evalText', '평가 방법', 'textarea'], ['materials', '준비물', 'input'], ['safety', '안전 · 유의사항', 'input']
  ];
  function fromEarlier(st) {
    const t = st.topic || {};
    return {
      title: t.field && t.action ? `${t.field}: ${t.action}` : '', target: t.target || '', minutes: Number(t.minutes) || 50,
      need: t.problem ? `${t.target ? `${josa(who(t.target), '이', '가')} ` : ''}${t.problem}` : '',
      goals: (st.goals || []).join('\n')
    };
  }
  function planBuilder(body) {
    const st = load();
    let plan = st.plan && Object.keys(st.plan).length ? st.plan : { ...fromEarlier(st), rows: (st.blocks || []).map(b => ({ ...b })) };
    if (!plan.rows || !plan.rows.length) plan.rows = DEFAULT_BLOCKS.map(b => ({ ...b }));
    const id = uid();
    body.innerHTML = `
      <div class="lab-actions"><button class="lab-button" type="button" data-act="pull">앞 장에서 적은 것 불러오기</button><button class="lab-button ghost" type="button" data-act="example">예시로 채우기</button><button class="lab-button ghost" type="button" data-act="clear">모두 지우기</button></div>
      <div class="ld-plan">
        <div class="ld-form ld-plan-form">${FIELDS.map(([k, label, kind]) => `<label for="${id}-${k}">${label}</label>${kind === 'textarea'
          ? `<textarea id="${id}-${k}" data-k="${k}" rows="${k === 'goals' ? 3 : 2}"></textarea>`
          : `<input id="${id}-${k}" data-k="${k}" type="${kind === 'number' ? 'number' : 'text'}" ${kind === 'number' ? 'min="10" max="240" step="5"' : 'maxlength="120"'}>`}`).join('')}
          <p class="ld-out-label">차시 구성 (03 시간 블록에서 이어짐)</p>
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
    const fill = () => {
      FIELDS.forEach(([k]) => { body.querySelector(`[data-k="${k}"]`).value = plan[k] == null ? '' : plan[k]; });
      drawRows();
    };
    function drawRows() {
      tbody.innerHTML = plan.rows.map((r, i) => `<tr data-i="${i}"><td><input type="number" data-f="min" min="1" max="120" value="${Number(r.min) || 0}" aria-label="${i + 1}번 줄 분"></td><td><input type="text" data-f="name" value="${esc(r.name)}" maxlength="80" aria-label="${i + 1}번 줄 내용"></td><td><input type="text" data-f="how" value="${esc(r.how || r.type || '')}" maxlength="30" aria-label="${i + 1}번 줄 방법"></td><td class="ld-ops"><button type="button" class="lab-button ghost" data-op="del" aria-label="지우기">✕</button></td></tr>`).join('');
      refresh();
    }
    const goalsOf = () => String(plan.goals || '').split('\n').map(s => s.trim()).filter(Boolean);
    function timeline() {
      let t = 0;
      return plan.rows.map(r => { const s = t; t += Number(r.min) || 0; return { ...r, from: s, to: t }; });
    }
    function checks() {
      const w = [];
      const goals = goalsOf(), sum = plan.rows.reduce((a, r) => a + (Number(r.min) || 0), 0), total = Number(plan.minutes) || 0;
      if (!plan.title) w.push(['강의명을 적어 주세요.', false]);
      if (!goals.length) w.push(['학습목표가 없습니다 (02장).', false]);
      else if (goals.length > 3) w.push([`학습목표가 ${goals.length}개입니다. 한 차시는 1~3개를 권합니다.`, false]);
      goals.forEach((g, i) => { const v = vagueIn(g); if (v.length) w.push([`목표 ${i + 1}의 "${v[0]}"는 보이지 않는 동사입니다.`, false]); });
      if (total && sum !== total) w.push([`차시 구성 합계 ${sum}분 ≠ 총 ${total}분`, false]);
      plan.rows.forEach((r, i) => { if (/설명/.test(r.how || '') && !/실습|활동|질문|토의|평가/.test(r.how || '') && Number(r.min) > 10) w.push([`${i + 1}번 줄 설명이 ${r.min}분입니다. 10분을 넘기지 않게 나눠 보세요.`, false]); });
      if (!plan.evalText) w.push(['평가 방법이 비었습니다 (04장). 목표와 같은 행동으로 확인합니다.', false]);
      if (!plan.need) w.push(['교육 요구(왜 필요한가)가 비었습니다 (01장).', false]);
      return w.length ? w : [['빈칸 없음 · 시간 합계 맞음 · 목표 동사 확인 완료. 이제 동료에게 보여 주세요.', true]];
    }
    function text() {
      const L = [`■ 강의계획서: ${plan.title || ''}`, `대상: ${plan.target || ''}`, `시간: ${plan.minutes || ''}분 · 장소/조건: ${plan.place || ''}`, `교육 요구: ${plan.need || ''}`, '학습목표:'];
      goalsOf().forEach((g, i) => L.push(`  ${i + 1}. ${g}`));
      L.push('차시 구성:');
      timeline().forEach(r => L.push(`  ${r.from}~${r.to}분 | ${r.name} | ${r.how || ''}`));
      L.push(`평가 방법: ${plan.evalText || ''}`, `준비물: ${plan.materials || ''}`, `안전 · 유의사항: ${plan.safety || ''}`);
      return L.join('\n');
    }
    function html() {
      return `<h2 class="lp-title">${esc(plan.title || '강의명')}</h2>
        <table class="lp-meta"><tr><th>대상</th><td>${esc(plan.target)}</td><th>시간</th><td>${esc(plan.minutes)}분</td></tr><tr><th>장소 · 조건</th><td colspan="3">${esc(plan.place)}</td></tr><tr><th>교육 요구</th><td colspan="3">${esc(plan.need)}</td></tr></table>
        <h3>학습목표</h3><ol>${goalsOf().map(g => `<li>${esc(g)}</li>`).join('') || '<li>—</li>'}</ol>
        <h3>차시 구성</h3><table class="lp-rows"><thead><tr><th>시간</th><th>내용</th><th>방법</th></tr></thead><tbody>${timeline().map(r => `<tr><td>${r.from}~${r.to}분</td><td>${esc(r.name)}</td><td>${esc(r.how || '')}</td></tr>`).join('')}</tbody></table>
        <h3>평가 방법</h3><p>${esc(plan.evalText) || '—'}</p>
        <table class="lp-meta"><tr><th>준비물</th><td>${esc(plan.materials)}</td></tr><tr><th>안전 · 유의사항</th><td>${esc(plan.safety)}</td></tr></table>`;
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
      r[f] = f === 'min' ? Number(e.target.value) || 0 : e.target.value;
      refresh();
    });
    tbody.addEventListener('click', e => { const op = e.target.closest('[data-op="del"]'); if (op) { plan.rows.splice(Number(op.closest('tr').dataset.i), 1); drawRows(); } });
    const result = body.querySelector('.lab-result');
    body.addEventListener('click', e => {
      const act = e.target.closest('[data-act]'); if (!act) return;
      const a = act.dataset.act;
      if (a === 'row') { plan.rows.push({ name: '', min: 5, how: '' }); drawRows(); }
      if (a === 'example') { plan = { ...EXAMPLE_PLAN, rows: DEFAULT_BLOCKS.map(b => ({ ...b })) }; fill(); }
      if (a === 'pull') {
        const s = load(), e2 = fromEarlier(s);
        Object.entries(e2).forEach(([k, v]) => { if (v) plan[k] = v; });
        if ((s.blocks || []).length) plan.rows = s.blocks.map(b => ({ ...b }));
        fill(); result.textContent = '01 주제 · 02 목표 · 03 시간 블록에서 적은 것을 불러왔습니다.';
      }
      if (a === 'clear') { plan = { rows: [{ name: '도입', min: 5, how: '' }] }; fill(); }
      if (a === 'copy') copyText(text(), act);
      if (a === 'ai') copyText(`너는 소방학교 교수설계 전문가야. 아래 강의계획서를 검토해 줘.\n1) 학습목표가 ABCD(대상·행동·조건·기준)를 갖췄는지, 보이지 않는 동사가 있는지\n2) 목표·활동·평가가 같은 행동을 가리키는지(정렬)\n3) 시간 배분: 설명이 10분을 넘는 곳, 활동이 빠진 곳\n4) 대상 수준과 안전에 맞는지\n고칠 점을 표로(항목 | 지금 | 고친 안 | 이유) 보여 주고, 장비 수치·규정은 지어내지 말고 확인이 필요하면 "[확인 필요]"로 표시해 줘.\n\n${text()}`, act);
      if (a === 'open') {
        const doc = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>강의계획서 · ${esc(plan.title || '')}</title><style>
          body{font:14px/1.6 "Malgun Gothic","Apple SD Gothic Neo",sans-serif;color:#111;max-width:760px;margin:24px auto;padding:0 16px}
          .lp-title{font-size:22px;border-bottom:3px solid #c8321e;padding-bottom:6px} h3{font-size:15px;margin:18px 0 6px;color:#14213d}
          table{border-collapse:collapse;width:100%;margin:6px 0} th,td{border:1px solid #bbb;padding:6px 8px;text-align:left;vertical-align:top} th{background:#f1f3f6;white-space:nowrap;width:110px}
          .bar{display:flex;gap:8px;margin-bottom:16px} button{font:inherit;padding:8px 14px;border:0;border-radius:6px;background:#c8321e;color:#fff;cursor:pointer}
          @media print{.bar{display:none} body{margin:0}}</style></head><body><div class="bar"><button onclick="print()">인쇄 · PDF로 저장</button></div>${html()}
          <p style="color:#777;font-size:12px;margin-top:18px">강의 설계 워크숍 · www.jg-sobang.com/lesson-design/</p></body></html>`;
        const url = URL.createObjectURL(new Blob([doc], { type: 'text/html' }));
        const w = window.open(url, '_blank');
        result.textContent = w ? '새 창에서 [인쇄 · PDF로 저장]을 누르세요.' : '팝업이 막혔습니다. [글로 복사]를 쓰거나 팝업을 허용해 주세요.';
      }
    });
    fill();
  }

  const INLINE = {
    'topic-funnel': { title: '내 주제 깔때기', time: '약 4분', goal: '네 칸을 채워 내 강의 주제를 한 문장으로 만들고, 네 가지 조건으로 점검합니다. 내 주제가 없으면 [예시로 채우기]로 따라 하세요.', build: topicFunnel },
    'topic-sort': { title: '이 주제, 한 차시에 알맞을까?', time: '약 3분', goal: '주제 후보마다 "너무 넓음 · 한 차시에 알맞음 · 교육으로 풀 문제가 아님"을 골라 채점합니다.', build: topicSort },
    'goal-judge': { title: '좋은 목표 · 고칠 목표', time: '약 3분', goal: '목표 문장마다 좋은 목표인지 고칠 목표인지 고르고 이유를 확인합니다.', build: goalJudge },
    abcd: { title: 'ABCD 목표 조립', time: '약 5분', goal: 'A · B · C · D 칸을 채워 내 목표를 만들고 목록에 넣습니다. 1~3개를 넣으면 05 강의계획서로 이어집니다.', build: abcd },
    'time-blocks': { title: '내 50분 시간 블록 짜기', time: '약 6분', goal: '예시 블록을 내 강의에 맞게 고칩니다. 합계 · 설명 길이 · 도입 · 평가 · 정리를 자동으로 점검합니다.', build: timeBlocks },
    'align-match': { title: '목표 · 방법 · 평가 맞추기', time: '약 4분', goal: '목표마다 알맞은 평가(Ⓐ)와 방법(Ⓑ)을 골라 정렬을 연습합니다.', build: alignMatch },
    'plan-builder': { title: '내 강의계획서 한 장', time: '약 10분', goal: '앞 장에서 적은 것을 불러와 빈칸을 채웁니다. 오른쪽 점검이 모두 ✓가 되면 새 창으로 열어 PDF로 저장하세요.', build: planBuilder }
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
