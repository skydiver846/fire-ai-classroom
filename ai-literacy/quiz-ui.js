(() => {
  'use strict';

  // 강의 후 퀴즈와 결과 공유판.
  // - 교육생용(내 도메인): 서버(/api/quiz/…)로 제출하고 공유판을 불러옵니다.
  // - 강사용(아티팩트): 다른 주소로 요청을 보낼 수 없으므로, 퀴즈는 정답과 함께 보여 주고 공유판은 도메인 링크로 안내합니다.
  const API = '/api/quiz';
  const BOARD_URL = 'https://www.jg-sobang.com/ai-literacy/#board';
  const NAME_KEY = 'ai-literacy-quiz-name';

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (_) { /* 저장소를 쓸 수 없는 환경 */ } }
  };
  const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const shuffle = list => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
    return copy;
  };
  const LETTERS = ['①', '②', '③', '④'];

  async function call(path, options = {}) {
    let response;
    try {
      response = await fetch(`${API}/${path}`, { headers: { 'Content-Type': 'application/json' }, cache: 'no-store', ...options });
    } catch (_) {
      throw new Error('서버에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
    }
    let data = {};
    try { data = await response.json(); } catch (_) { /* 본문이 JSON이 아님 */ }
    if (!response.ok) throw new Error(data.error || `서버에서 문제가 생겼습니다 (${response.status}).`);
    return data;
  }

  /* ───────── 생각해 보기 (강의 맨 앞, 점수 없음) ───────── */
  function warmup(quizId) {
    const quiz = window.QUIZ && window.QUIZ[quizId];
    if (!quiz) return '';
    return `<aside class="warmup"><p class="warmup-title">🤔 생각해 보기</p><p class="warmup-q">${esc(quiz.warmup)}</p><p class="warmup-note">답은 강의를 들으며 찾아보세요. 점수에는 들어가지 않습니다.</p></aside>`;
  }

  /* ───────── 강의 후 퀴즈 ───────── */
  function mountQuiz(host, quizId, opts = {}) {
    const quiz = window.QUIZ && window.QUIZ[quizId];
    if (!host || !quiz) return;
    const uid = `qz-${quizId}`;
    const teacherKey = opts.teacher && window.QUIZ_KEY ? window.QUIZ_KEY[quizId] : null;
    // 선택지는 사람마다 섞어 보여 주고, 제출할 때는 원래 번호로 보냅니다.
    const orders = quiz.questions.map(item => shuffle(item.options.map((_, i) => i)));

    host.innerHTML = `
      <div class="quiz-head">
        <p class="quiz-kind">강의 후 퀴즈 · ${quiz.questions.length}문항 · 약 3분</p>
        <h2 id="${uid}">${esc(quiz.title)}</h2>
        <p class="quiz-lede">${teacherKey
          ? '강사용 화면에서는 정답과 “본문에서 다시 볼 곳”이 함께 보입니다. 교육생은 교육생용 사이트에서 이름을 적고 제출합니다.'
          : '방금 들은 내용을 확인합니다. 이름을 적고 모든 문항에 답한 뒤 제출하세요. <strong>첫 제출만 기록</strong>되고, 결과는 강의 마지막에 함께 봅니다.'}</p>
      </div>
      ${teacherKey ? '' : `
      <div class="quiz-name">
        <label for="${uid}-name">이름 (또는 별명)</label>
        <input id="${uid}-name" type="text" maxlength="20" autocomplete="off" placeholder="예: 홍길동">
        <small>같은 이름으로 4개 퀴즈를 모두 내야 점수가 합산됩니다.</small>
      </div>`}
      <ol class="quiz-list">
        ${quiz.questions.map((item, qi) => `
          <li class="quiz-item" data-q="${qi}">
            <p class="quiz-q">${esc(item.q)}</p>
            <div class="quiz-options" role="radiogroup" aria-label="${qi + 1}번 문항">
              ${orders[qi].map((optIndex, pos) => `
                <label class="quiz-option ${teacherKey && teacherKey[qi].answer === optIndex ? 'is-answer' : ''}">
                  <input type="radio" name="${uid}-${qi}" value="${optIndex}" ${teacherKey ? 'disabled' : ''}>
                  <span class="mark">${LETTERS[pos]}</span><span>${esc(item.options[optIndex])}</span>
                </label>`).join('')}
            </div>
            ${teacherKey ? `<p class="quiz-where">정답: ${esc(item.options[teacherKey[qi].answer])} · 본문 ${esc(teacherKey[qi].where)}</p>` : '<p class="quiz-where" hidden></p>'}
          </li>`).join('')}
      </ol>
      ${teacherKey
        ? `<p class="quiz-board-link">교육생 제출 현황과 정답률은 <a href="${BOARD_URL}" target="_blank" rel="noopener">결과 공유판</a>에서 봅니다.</p>`
        : `<div class="quiz-actions">
            <button class="lab-button primary" type="button" data-act="submit" disabled>제출하기</button>
            <p class="quiz-status" aria-live="polite">모든 문항에 답하면 제출할 수 있습니다.</p>
          </div>
          <div class="quiz-result" hidden></div>`}`;

    if (teacherKey) return;

    const nameInput = host.querySelector(`#${uid}-name`);
    const submit = host.querySelector('[data-act="submit"]');
    const status = host.querySelector('.quiz-status');
    const result = host.querySelector('.quiz-result');
    const doneKey = `ai-literacy-quiz-done:${quizId}`;
    nameInput.value = store.get(NAME_KEY) || '';

    const chosen = () => quiz.questions.map((_, qi) => {
      const picked = host.querySelector(`input[name="${uid}-${qi}"]:checked`);
      return picked ? Number(picked.value) : null;
    });
    const refresh = () => {
      const left = chosen().filter(a => a === null).length;
      const hasName = nameInput.value.trim().length > 0;
      submit.disabled = left > 0 || !hasName;
      status.textContent = !hasName ? '이름을 적어 주세요.' : left ? `${left}문항이 남았습니다.` : '제출할 수 있습니다.';
    };

    function showResult(data, mine) {
      result.hidden = false;
      // 다른 사람이 이미 같은 이름으로 낸 경우: 고른 답은 그대로 두고 이름만 바꿔 바로 다시 낼 수 있게 합니다.
      if (data.already && !mine) {
        result.innerHTML = `<p class="quiz-score warn">“${esc(data.name)}” 이름으로 이미 제출된 기록이 있습니다.</p><p>본인이 낸 기록이 아니라면 이름을 바꿔(예: 이름+숫자) 다시 제출해 주세요. 4개 퀴즈 모두 같은 이름을 써야 점수가 합산됩니다.</p>`;
        status.textContent = '';
        nameInput.focus();
        nameInput.select();
        refresh();
        return;
      }
      host.querySelectorAll('input[type="radio"]').forEach(input => { input.disabled = true; });
      host.querySelectorAll('.quiz-item').forEach((li, qi) => {
        const ok = data.correct[qi];
        li.classList.add(ok ? 'is-right' : 'is-wrong');
        const where = li.querySelector('.quiz-where');
        if (!ok && data.review[qi]) { where.hidden = false; where.textContent = `본문에서 다시 보기: ${data.review[qi]}`; }
      });
      submit.hidden = true;
      nameInput.disabled = true;
      result.innerHTML = `<p class="quiz-score">${esc(data.name)} 님 · <strong>${data.score} / ${data.total}</strong>${data.already ? ' (이미 제출한 기록)' : ''}</p><p>틀린 문항 아래에 본문에서 다시 볼 곳을 표시했습니다. 정답과 다른 사람들의 결과는 강의 마지막 <a href="#board">결과 공유판</a>에서 함께 봅니다.</p>`;
      status.textContent = '';
    }

    host.addEventListener('change', refresh);
    nameInput.addEventListener('input', refresh);
    submit.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      store.set(NAME_KEY, name);
      submit.disabled = true;
      status.textContent = '제출하는 중입니다…';
      try {
        const data = await call('submit', { method: 'POST', body: JSON.stringify({ quiz: quizId, name, answers: chosen() }) });
        const mine = store.get(doneKey) === name.toLocaleLowerCase('ko');
        if (!data.already) store.set(doneKey, name.toLocaleLowerCase('ko'));
        showResult(data, !data.already || mine);
      } catch (error) {
        status.textContent = error.message;
        refresh();
      }
    });
    refresh();
  }

  /* ───────── 결과 공유판 ───────── */
  function mountBoard(host, opts = {}) {
    if (!host) return () => {};
    if (opts.teacher) {
      host.innerHTML = `<p class="lede">결과 공유판은 교육생 제출을 받는 <strong>교육생용 사이트</strong>에서 열립니다.</p>
        <p><a class="lab-button primary" href="${BOARD_URL}" target="_blank" rel="noopener">결과 공유판 열기 (새 탭)</a></p>
        <p class="docnav">강의별 우수자는 공유판에 항상 보입니다. 관리 기능(정답 표시 · 전체 우수자 공개 · 결과 지우기)은 공유판 맨 아래 “강사 관리”에 있습니다. 관리 비밀번호는 Vercel 환경 변수 <code>QUIZ_ADMIN_KEY</code>에 넣은 값입니다.</p>`;
      return () => {};
    }
    const quizIds = Object.keys(window.QUIZ || {});
    const open = new Set();
    host.innerHTML = `
      <p class="lede">강의 후 퀴즈 우수자와 제출 현황, 문항별 정답률입니다. 몇 초마다 저절로 새로 고쳐집니다. 우수자 말고는 개인 점수가 보이지 않습니다.</p>
      <p class="board-updated docnav" aria-live="polite">불러오는 중입니다…</p>
      <section class="board-block"><h2>🏅 강의별 우수자</h2><p class="muted-line">각 강의 퀴즈의 상위 3명입니다. 점수가 같으면 먼저 제출한 사람이 앞섭니다.</p><div class="board-quiz-tops"></div></section>
      <section class="board-block"><h2>🏆 전체 우수자</h2><div class="board-top"></div></section>
      <section class="board-block"><h2>제출 현황</h2><div class="board-people"></div></section>
      <section class="board-block"><h2>문항별 정답률</h2><div class="board-rates"></div></section>
      <details class="board-admin">
        <summary>강사 관리</summary>
        <div class="board-admin-body">
          <label for="board-key">관리 비밀번호</label>
          <input id="board-key" type="password" autocomplete="off">
          <div class="lab-actions">
            <button class="lab-button" type="button" data-admin="show-answers">정답 표시</button>
            <button class="lab-button" type="button" data-admin="hide-answers">정답 숨기기</button>
            <button class="lab-button primary" type="button" data-admin="show-top">전체 우수자 공개</button>
            <button class="lab-button" type="button" data-admin="hide-top">전체 우수자 숨기기</button>
          </div>
          <div class="lab-actions">
            <button class="lab-button ghost" type="button" data-admin="reset-ask">결과 모두 지우기…</button>
            <span class="board-reset-confirm" hidden>정말 모든 제출 기록을 지울까요? <button class="lab-button primary" type="button" data-admin="reset">네, 지웁니다</button> <button class="lab-button" type="button" data-admin="reset-cancel">취소</button></span>
          </div>
          <p class="board-admin-status" aria-live="polite"></p>
        </div>
      </details>`;

    const updated = host.querySelector('.board-updated');
    const adminStatus = host.querySelector('.board-admin-status');
    const keyInput = host.querySelector('#board-key');
    try { keyInput.value = sessionStorage.getItem('ai-literacy-admin') || ''; } catch (_) { /* 저장소 없음 */ }

    function draw(data) {
      const quizTitle = id => (window.QUIZ[id] ? window.QUIZ[id].title.split(' · ')[0] : id);
      host.querySelector('.board-top').innerHTML = data.top
        ? (data.top.length ? `<ol class="podium">${data.top.map((p, i) => `<li><span class="medal">${['🥇', '🥈', '🥉'][i]}</span><strong>${esc(p.name)}</strong><span>${p.score} / ${p.total}점 · 퀴즈 ${p.quizzes}개</span></li>`).join('')}</ol>` : '<p class="muted-line">아직 제출한 사람이 없습니다.</p>')
        : '<p class="muted-line">강사가 공개하면 4개 퀴즈 총점 상위 3명이 여기에 나타납니다. (총점이 같으면 마지막 퀴즈를 먼저 낸 순서)</p>';

      const time = at => new Date(at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      host.querySelector('.board-quiz-tops').innerHTML = `<div class="quiz-tops">${data.quizIds.map(id => {
        const top = (data.quizzes[id] && data.quizzes[id].top) || [];
        return `<div class="quiz-top"><h3>${esc(quizTitle(id))}</h3>${top.length
          ? `<ol class="podium">${top.map((p, i) => `<li><span class="medal">${['🥇', '🥈', '🥉'][i]}</span><strong>${esc(p.name)}</strong><span>${p.score} / ${p.total}점 · ${time(p.at)} 제출</span></li>`).join('')}</ol>`
          : '<p class="muted-line">아직 제출한 사람이 없습니다.</p>'}</div>`;
      }).join('')}</div>`;

      host.querySelector('.board-people').innerHTML = data.people.length
        ? `<div class="table-wrap"><table class="board-table"><thead><tr><th>이름</th>${data.quizIds.map(id => `<th>${esc(quizTitle(id))}</th>`).join('')}</tr></thead><tbody>${data.people.map(p => `<tr><td>${esc(p.name)}</td>${p.done.map(d => `<td class="${d ? 'done' : ''}">${d ? '✓' : '·'}</td>`).join('')}</tr>`).join('')}</tbody><tfoot><tr><td>제출</td>${data.quizIds.map(id => `<td>${data.quizzes[id].submitted}명</td>`).join('')}</tr></tfoot></table></div>`
        : '<p class="muted-line">아직 제출한 사람이 없습니다.</p>';

      host.querySelector('.board-rates').innerHTML = data.quizIds.map(id => {
        const quiz = window.QUIZ[id];
        const qs = data.quizzes[id].questions;
        const rated = qs.map(q => q.correctRate).filter(r => r !== null);
        const worst = rated.length ? Math.min(...rated) : null;
        return `<div class="rate-group"><h3>${esc(quiz.title)} <small>${data.quizzes[id].submitted}명 제출</small></h3>
          ${qs.map((q, qi) => {
            const key = `${id}-${qi}`;
            const total = q.counts.reduce((a, b) => a + b, 0);
            const rate = q.correctRate;
            return `<div class="rate-row ${rate !== null && rate === worst && rated.length > 1 && worst < 100 ? 'worst' : ''}">
              <button type="button" class="rate-q" data-key="${key}" aria-expanded="${open.has(key)}">
                <span>Q${qi + 1}. ${esc(quiz.questions[qi].q)}</span>
                <span class="rate-bar" aria-hidden="true"><span style="width:${rate || 0}%"></span></span>
                <strong>${rate === null ? '–' : `${rate}%`}</strong>
              </button>
              <ul class="rate-options" ${open.has(key) ? '' : 'hidden'}>
                ${quiz.questions[qi].options.map((opt, oi) => `<li class="${q.answer === oi ? 'is-answer' : ''}"><span>${esc(opt)}${q.answer === oi ? ' ✓ 정답' : ''}</span><span>${q.counts[oi]}명${total ? ` (${Math.round((q.counts[oi] / total) * 100)}%)` : ''}</span></li>`).join('')}
                ${q.answer === null ? '<li class="muted-line">정답은 강사가 “정답 표시”를 누르면 보입니다.</li>' : ''}
              </ul>
            </div>`;
          }).join('')}</div>`;
      }).join('');
      updated.textContent = `${new Date(data.updatedAt).toLocaleTimeString('ko-KR')} 기준 · 문항을 누르면 어떤 답을 많이 골랐는지 볼 수 있습니다. 가장 많이 틀린 문항은 빨간색으로 표시됩니다.`;
    }

    let timer = null;
    let alive = true;
    async function load() {
      try { draw(await call('board')); } catch (error) { updated.textContent = error.message; }
      if (alive) timer = setTimeout(load, 5000);
    }

    host.addEventListener('click', async event => {
      const q = event.target.closest('.rate-q');
      if (q) {
        const key = q.dataset.key;
        if (open.has(key)) open.delete(key); else open.add(key);
        q.setAttribute('aria-expanded', String(open.has(key)));
        q.nextElementSibling.hidden = !open.has(key);
        return;
      }
      const btn = event.target.closest('[data-admin]');
      if (!btn) return;
      const action = btn.dataset.admin;
      const confirmBox = host.querySelector('.board-reset-confirm');
      if (action === 'reset-ask') { confirmBox.hidden = false; return; }
      if (action === 'reset-cancel') { confirmBox.hidden = true; return; }
      try { sessionStorage.setItem('ai-literacy-admin', keyInput.value); } catch (_) { /* 저장소 없음 */ }
      adminStatus.textContent = '처리하는 중입니다…';
      try {
        await call('admin', { method: 'POST', body: JSON.stringify({ key: keyInput.value, action }) });
        confirmBox.hidden = true;
        adminStatus.textContent = { 'show-answers': '정답을 표시했습니다.', 'hide-answers': '정답을 숨겼습니다.', 'show-top': '전체 우수자를 공개했습니다.', 'hide-top': '전체 우수자를 숨겼습니다.', reset: '모든 제출 기록을 지웠습니다.' }[action];
        clearTimeout(timer);
        load();
      } catch (error) {
        adminStatus.textContent = error.message;
      }
    });

    load();
    return () => { alive = false; clearTimeout(timer); };
  }

  window.QuizUI = { warmup, mountQuiz, mountBoard };
})();
