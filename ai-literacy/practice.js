(() => {
  'use strict';

  const reduceMotion = Boolean(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const wait = ms => new Promise(resolve => setTimeout(resolve, reduceMotion ? 0 : ms));

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  }

  function plain(md) {
    return String(md).replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1').trim();
  }

  function richInline(md) {
    return escapeHtml(md).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // 강의 원문에서 특정 제목 아래의 표를 읽어 [행][열] 배열로 돌려줍니다.
  function sectionTable(markdown, headingPattern) {
    const lines = markdown.replace(/\r/g, '').split('\n');
    const start = lines.findIndex(line => /^#{2,4}\s/.test(line) && headingPattern.test(line));
    if (start < 0) return [];
    const rows = [];
    for (let i = start + 1; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (/^#{1,4}\s/.test(line)) break;
      if (!line.startsWith('|')) { if (rows.length) break; continue; }
      rows.push(line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim()));
    }
    return rows.slice(2);
  }

  // 활동마다 교육생이 보는 진행 순서 (활동 제목으로 찾음)
  const HOW_TO = {
    '웹 서비스를 식당으로 옮겨 보기': [
      '왼쪽의 웹 서비스 항목마다 오른쪽 상자를 눌러 식당의 무엇에 해당하는지 고릅니다.',
      '모두 고르면 <strong>[채점하기]</strong>를 누릅니다.',
      '틀린 항목 아래에 나온 정답을 보고, 강의 안내의 “전체를 꿰는 비유” 표와 비교해 봅니다.'
    ],
    '눌러 보며 비교하는 주문 태블릿': [
      '<strong>[1단계 · HTML만]</strong>이 선택된 상태에서 미리보기의 <strong>[담기]</strong>를 눌러 봅니다.',
      '<strong>[2단계] → [3단계] → [4단계]</strong>를 차례로 누르고, 단계마다 [담기]를 눌러 무엇이 달라졌는지 봅니다.',
      '단계마다 노란 상자의 <strong>“살펴보기”</strong> 설명을 읽습니다.',
      '궁금하면 맨 아래 <strong>“이 단계의 코드 보기”</strong>를 열어 실제 코드를 봅니다.'
    ],
    '주문 태블릿 코드를 직접 고쳐 보기': [
      '단계 버튼을 고르고 노란 상자의 <strong>도전 과제</strong>를 읽습니다.',
      '<strong>HTML / CSS / JavaScript</strong> 탭을 눌러 고칠 코드를 엽니다.',
      '코드를 고친 뒤 <strong>[▶ 실행]</strong>(Ctrl + Enter)을 눌러 미리보기를 확인합니다.',
      '코드가 꼬이면 <strong>[이 단계 처음으로]</strong>로 되돌립니다.'
    ],
    '계좌 이체와 트랜잭션': [
      '먼저 “은행 전체 돈”이 <strong>150,000원</strong>인 것을 확인합니다.',
      '<strong>“② 입금 직전에 서버 정전”만</strong> 체크하고 [10만 원 이체 실행] → 은행 전체 돈이 줄어드는지 봅니다.',
      '[잔액 초기화] 후 <strong>“트랜잭션으로 묶기”도</strong> 체크하고 다시 실행 → 돈이 되돌아오는지(Rollback) 봅니다.',
      '정전 체크를 끄고 실행 → 정상 이체(Commit)를 봅니다. 아래 미션 3개가 모두 체크되면 끝입니다.'
    ],
    '목욕탕 열쇠로 로그인 유지하기': [
      '로그인하지 않고 <strong>[GET /me]</strong> → 401(누구세요?)을 받습니다.',
      '아이디 hong, 비밀번호 1234로 <strong>[POST /login]</strong> → 다시 [GET /me] → 200을 받습니다.',
      '<strong>[GET /admin]</strong> → 403(권한 없음)을 받습니다.',
      '<strong>[쿠키 지우기]</strong> 후 [GET /me] → 다시 401. 오른쪽 기록과 서버의 세션 장부를 함께 봅니다.'
    ],
    '장부에 질문하기 · 표 · 조건 · JOIN · 정규화': [
      '<strong>“준비됐습니다”</strong> 문구가 뜰 때까지 잠시 기다립니다.',
      '<strong>1번부터 5번까지</strong> 버튼을 차례로 누릅니다.',
      '누를 때마다 나오는 <strong>SQL · 해설 · 결과 표</strong>를 읽습니다. 특히 3번 → 4번 → 5번에서 무엇이 달라지는지 봅니다.',
      '다시 해 보려면 <strong>[처음부터 다시]</strong>를 누릅니다. DB와 ✓ 표시가 모두 처음으로 돌아갑니다.'
    ],
    '장부에 질문하기 · 사진은 어디에?': [
      '버튼을 눌러 게시물 표를 봅니다.',
      '사진 칸에 그림 대신 <strong>무엇이 들어 있는지</strong> 확인합니다.'
    ],
    '눌러서 장부에 질문하기': [
      '<strong>“준비됐습니다”</strong> 문구가 뜰 때까지 잠시 기다립니다.',
      '<strong>1번부터 6번까지</strong> 버튼을 차례로 누릅니다.',
      '누를 때마다 나오는 <strong>SQL · 해설 · 결과 표</strong>를 읽습니다.',
      '다시 해 보려면 <strong>[처음부터 다시]</strong>를 누릅니다. DB와 ✓ 표시가 모두 처음으로 돌아갑니다.'
    ],
    'SQL을 직접 써 보기': [
      '과제 버튼을 고르고 노란 상자의 과제를 읽습니다.',
      '왼쪽 <strong>표 구조</strong>를 보며 검은 상자에 SQL을 씁니다.',
      '<strong>[▶ 실행]</strong>(Ctrl + Enter) → 맞으면 “정답입니다”가 나옵니다.',
      '막히면 <strong>[힌트]</strong>, 결과가 이상하면 <strong>[DB 초기화]</strong>를 누릅니다.'
    ],
    'DNS 길찾기와 TTL': [
      '<strong>[주소 찾기]</strong>를 눌러 위의 경로가 차례로 켜지는 것을 봅니다.',
      '바로 한 번 더 [주소 찾기] → 이번에는 <strong>캐시</strong>에서 즉시 답이 나옵니다.',
      '<strong>[서버 이사]</strong> → [주소 찾기] → 옛 주소로 가는 빨간 기록을 봅니다.',
      '<strong>[시간 +60초]</strong>를 5번 누른 뒤 [주소 찾기] → 새 주소를 받습니다. 미션 4개가 체크되면 끝입니다.'
    ],
    '배포 장애, 원인부터 좁히기': [
      '증상을 읽고 가장 먼저 의심할 원인 하나를 고릅니다.',
      '고르면 바로 정답과 해설이 나옵니다.',
      '6개를 모두 풀고 맨 아래 점수를 확인합니다.'
    ],
    '문제와 해결 기술 잇기': [
      '문제마다 오른쪽 상자에서 그 문제를 해결한 기술을 고릅니다.',
      '모두 고르면 <strong>[채점하기]</strong>를 누릅니다.',
      '틀린 항목의 정답을 확인하고, <strong>[문제 순서 섞기]</strong>로 한 번 더 풀어 봅니다.'
    ],
    '막연한 요청을 구체적으로 다듬기': [
      '“막연한 요청”을 읽고, 강의에서 배운 용어를 넣어 아래 칸에 다시 씁니다.',
      '<strong>[모범 요청과 비교]</strong>를 누릅니다.',
      '내가 넣은 핵심 용어(초록색)와 빠진 용어를 확인하고 모범 요청을 읽어 봅니다.'
    ]
  };

  // 강의 후 퀴즈(결과 공유판에 모임)와 헷갈리지 않도록, 복습 · 선택 활동의 퀴즈에 붙이는 표시
  const PRACTICE_TAG = '<em class="practice-tag">연습용 · 결과판에 안 올라감</em>';

  // [처음부터 다시]: 실습을 새 상자에 처음부터 다시 그립니다. ✓ 표시 · 점수 · 기록이 모두 사라지고,
  // 진행 중이던 애니메이션은 버려진 옛 상자에 그려지므로 새 화면을 건드리지 않습니다.
  function addRestart(container, build) {
    const bar = document.createElement('div');
    bar.className = 'lab-actions lab-restart';
    bar.innerHTML = '<button class="lab-button ghost" type="button">처음부터 다시</button>';
    bar.querySelector('button').addEventListener('click', () => {
      const old = container.querySelector('.lab-body');
      const fresh = document.createElement('div');
      fresh.className = old.className;
      old.replaceWith(fresh);
      build(fresh);
    });
    container.append(bar);
  }

  function labShell(no, kind, title, goal, tag = '') {
    const steps = HOW_TO[title] || [];
    const section = document.createElement('section');
    section.className = 'lab';
    section.innerHTML = `
      <header class="lab-head">
        <p class="lab-kind"><span>활동 ${no}</span>${kind}${tag}</p>
        <h3>${title}</h3>
        <p class="lab-goal">${goal}</p>
      </header>
      ${steps.length ? `<div class="how-to"><p class="how-to-title">이렇게 진행하세요</p><ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol></div>` : ''}
      <div class="lab-body"></div>`;
    return { section, body: section.querySelector('.lab-body') };
  }

  function missionList(items) {
    const list = document.createElement('ul');
    list.className = 'missions';
    list.innerHTML = items.map(([key, text]) => `<li data-mission="${key}"><span class="tick" aria-hidden="true"></span>${text}</li>`).join('');
    const done = new Set();
    const total = items.length;
    const status = document.createElement('p');
    status.className = 'mission-status';
    const update = () => { status.textContent = done.size === total ? `미션 ${total}개를 모두 해냈습니다.` : `미션 ${done.size} / ${total}`; };
    update();
    return {
      nodes: [list, status],
      complete(key) {
        if (done.has(key)) return;
        const item = list.querySelector(`[data-mission="${key}"]`);
        if (!item) return;
        done.add(key);
        item.classList.add('done');
        update();
      }
    };
  }

  /* ───────────── 공통: 짝 맞추기 퀴즈 ───────────── */
  function matchQuiz(body, pairs, labels) {
    if (!pairs.length) return false;
    const options = [...new Set(pairs.map(p => p.answer))];
    let order = shuffle(pairs);

    body.innerHTML = `
      <div class="match-grid" role="group">
        <div class="match-head"><span>${labels.left}</span><span>${labels.right}</span></div>
        <div class="match-rows"></div>
      </div>
      <div class="lab-actions">
        <button class="lab-button primary" type="button" data-act="grade">채점하기</button>
        <button class="lab-button" type="button" data-act="reshuffle">문제 순서 섞기</button>
        <p class="lab-result" aria-live="polite"></p>
      </div>`;
    const rowsEl = body.querySelector('.match-rows');
    const result = body.querySelector('.lab-result');
    const uid = Math.random().toString(36).slice(2, 7);

    function draw() {
      rowsEl.innerHTML = order.map((pair, i) => `
        <div class="match-row" data-index="${i}">
          <label for="m-${uid}-${i}">${richInline(pair.question)}</label>
          <div>
            <select id="m-${uid}-${i}">
              <option value="">고르세요</option>
              ${shuffle(options).map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}
            </select>
            <small class="match-fix" hidden></small>
          </div>
        </div>`).join('');
      result.textContent = '';
    }

    body.querySelector('[data-act="grade"]').addEventListener('click', () => {
      let right = 0;
      rowsEl.querySelectorAll('.match-row').forEach(row => {
        const pair = order[Number(row.dataset.index)];
        const value = row.querySelector('select').value;
        const fix = row.querySelector('.match-fix');
        const ok = value === pair.answer;
        if (ok) right += 1;
        row.classList.toggle('is-right', ok);
        row.classList.toggle('is-wrong', !ok);
        fix.hidden = ok;
        fix.textContent = ok ? '' : `정답: ${pair.answer}`;
      });
      result.textContent = right === order.length ? `${right} / ${order.length} · 모두 맞혔습니다.` : `${right} / ${order.length} · 틀린 항목 아래에 정답을 표시했습니다.`;
    });
    body.querySelector('[data-act="reshuffle"]').addEventListener('click', () => { order = shuffle(pairs); draw(); });
    draw();
    return true;
  }

  /* ───────────── 공통: AI 요청 다듬기 ───────────── */
  function keywordsOf(md) {
    const words = [...md.matchAll(/\*\*([^*]+)\*\*/g)]
      .flatMap(m => m[1].split(/[+·/,]/))
      .map(w => w.replace(/\(.*?\)/g, '').trim())
      .filter(w => w.length >= 2);
    return [...new Set(words)];
  }
  const normalize = text => text.toLocaleLowerCase('ko').replace(/\s+/g, '');

  function promptLab(body, rows) {
    if (!rows.length) return false;
    const uid = Math.random().toString(36).slice(2, 7);
    body.innerHTML = rows.map(([vague, good], i) => `
      <div class="prompt-card" data-index="${i}">
        <p class="prompt-vague"><span>막연한 요청</span>${escapeHtml(plain(vague))}</p>
        <label for="p-${uid}-${i}">내가 다듬은 요청</label>
        <textarea id="p-${uid}-${i}" rows="3" placeholder="강의에서 배운 용어를 넣어 구체적으로 다시 써 보세요."></textarea>
        <div class="lab-actions">
          <button class="lab-button primary" type="button">모범 요청과 비교</button>
        </div>
        <div class="prompt-feedback" hidden></div>
      </div>`).join('');

    body.querySelectorAll('.prompt-card').forEach(card => {
      const [, good] = rows[Number(card.dataset.index)];
      const keys = keywordsOf(good);
      card.querySelector('button').addEventListener('click', () => {
        const mine = normalize(card.querySelector('textarea').value);
        const feedback = card.querySelector('.prompt-feedback');
        const hits = keys.filter(k => mine.includes(normalize(k)));
        feedback.hidden = false;
        feedback.innerHTML = `
          <p class="prompt-score">${mine ? `핵심 용어 ${keys.length}개 중 <strong>${hits.length}개</strong>를 넣었습니다.` : '먼저 직접 써 본 뒤 비교하면 더 잘 남습니다. 모범 요청은 아래와 같습니다.'}</p>
          <ul class="chips">${keys.map(k => `<li class="${hits.includes(k) ? 'hit' : ''}">${hits.includes(k) ? '✓' : '·'} ${escapeHtml(k)}</li>`).join('')}</ul>
          <p class="prompt-model"><span>모범 요청</span>${richInline(good)}</p>`;
      });
    });
    return true;
  }

  /* ───────────── 1강: HTML · CSS · JS 놀이터 ───────────── */
  const TABLET_HTML = [
    '<div class="tablet">',
    '  <header class="bar">',
    '    <h1>명동칼국수</h1>',
    '    <span class="badge" id="badge">장바구니 0</span>',
    '  </header>',
    '  <article class="menu">',
    '    <h2>칼국수</h2>',
    '    <p class="price">9,000원</p>',
    '    <button id="add">담기</button>',
    '  </article>',
    '  <p class="summary" id="summary">아직 담은 메뉴가 없습니다.</p>',
    '</div>'
  ].join('\n');

  const TABLET_CSS = [
    '.tablet { font-family: sans-serif; max-width: 320px; padding: 16px; border-radius: 16px; background: #fffaf2; border: 1px solid #ead9c0; }',
    '.bar { display: flex; justify-content: space-between; align-items: center; }',
    'h1 { margin: 0; font-size: 20px; }',
    '.badge { padding: 4px 10px; border-radius: 99px; background: #2f2a24; color: #fff; font-size: 13px; }',
    '.menu { margin: 16px 0; padding: 14px; border-radius: 12px; background: #fff; }',
    '.menu h2 { margin: 0 0 4px; font-size: 18px; }',
    '.price { margin: 0 0 10px; color: #8a6d46; }',
    'button { padding: 8px 16px; border: 0; border-radius: 8px; background: #d9480f; color: #fff; font-size: 15px; cursor: pointer; }',
    '.summary { margin: 0; color: #6b5d4c; font-size: 14px; }'
  ].join('\n');

  const DIRECT_JS = [
    '// 직접 조작: 버튼을 누를 때마다 화면의 두 곳을 각각 찾아서 고칩니다.',
    'let count = 0;',
    '',
    "root.querySelector('#add').addEventListener('click', () => {",
    '  count = count + 1;',
    "  root.querySelector('#badge').textContent = '장바구니 ' + count;",
    "  root.querySelector('#summary').textContent = '칼국수 ' + count + '그릇을 담았습니다.';",
    '});'
  ].join('\n');

  const STATE_JS = [
    '// 상태 중심: 상태(state)만 바꾸면 render()가 상태를 보고 화면 전체를 다시 그립니다.',
    'const state = { count: 0 };',
    '',
    'function render() {',
    "  root.querySelector('#badge').textContent = '장바구니 ' + state.count;",
    "  root.querySelector('#summary').textContent = state.count === 0",
    "    ? '아직 담은 메뉴가 없습니다.'",
    "    : '칼국수 ' + state.count + '그릇 · ' + (state.count * 9000).toLocaleString() + '원';",
    '}',
    '',
    "root.querySelector('#add').addEventListener('click', () => {",
    '  state.count += 1;',
    '  render();',
    '});',
    '',
    'render();'
  ].join('\n');

  const FRONT_STEPS = [
    { title: 'HTML만', html: TABLET_HTML, css: '', js: '',
      note: 'HTML은 구조만 정합니다. 제목, 가격, 버튼이 있지만 꾸밈도 반응도 없습니다.',
      task: '<code>명동칼국수</code>를 내 가게 이름으로 바꾸고 실행해 보세요. 버튼을 눌러도 아무 일도 없다는 것도 확인해 보세요.' },
    { title: 'CSS 입히기', html: TABLET_HTML, css: TABLET_CSS, js: '',
      note: '같은 HTML에 CSS 규칙표를 붙였습니다. 구조는 그대로이고 모양만 달라졌습니다.',
      task: 'CSS 탭에서 <code>button</code> 줄의 <code>#d9480f</code>를 <code>#1971c2</code>로 바꿔 보세요. 한 줄만 고쳐도 모든 버튼이 바뀝니다.' },
    { title: 'JavaScript로 반응하기', html: TABLET_HTML, css: TABLET_CSS, js: DIRECT_JS,
      note: '이벤트(클릭)를 받아 DOM의 두 곳을 직접 찾아 고칩니다. jQuery 시절의 방식입니다.',
      task: '한 번에 2그릇씩 담기게 바꿔 보세요. 숫자를 바꾸는 곳과 화면을 고치는 곳을 모두 챙겨야 합니다.' },
    { title: '상태 중심으로 바꾸기', html: TABLET_HTML, css: TABLET_CSS, js: STATE_JS,
      note: 'React의 생각 방식입니다. 클릭하면 상태만 바꾸고, 화면은 render()가 상태를 보고 그립니다.',
      task: 'HTML에 <code>&lt;button id="remove"&gt;빼기&lt;/button&gt;</code>를 추가하고, 누르면 <code>state.count</code>가 1 줄도록 해 보세요. 화면을 고치는 코드는 새로 쓰지 않아도 됩니다.' }
  ];

  // 기본 실습(간단 모드)에서 단계마다 보여 줄 관찰 안내
  const FRONT_OBSERVE = [
    '미리보기의 <strong>[담기]</strong>를 눌러 보세요. 아무 일도 일어나지 않습니다. HTML은 제목·가격·버튼이라는 <strong>구조</strong>만 정하기 때문입니다.',
    '내용은 1단계와 똑같은데 <strong>모양</strong>이 달라졌습니다. HTML은 그대로 두고 CSS 규칙만 더했습니다. [담기]는 여전히 반응이 없습니다.',
    '이제 [담기]를 누르면 숫자가 올라갑니다. JavaScript가 클릭(<strong>이벤트</strong>)을 받아 화면의 두 곳을 <strong>직접 찾아 고칩니다</strong>.',
    '겉보기는 3단계와 비슷하지만, 이번에는 <strong>상태(그릇 수)만 바꾸면</strong> 배지·문구·금액이 함께 따라 바뀝니다. React가 쓰는 생각 방식입니다.'
  ];

  function frontendLab(body, opts = {}) {
    const hostId = `pg-${Math.random().toString(36).slice(2, 8)}`;
    // opts.only: 본문 속에서 한 단계만 보여 줄 때의 단계 번호(0~3). 이때는 단계 버튼을 숨깁니다.
    const only = Number.isInteger(opts.only) ? opts.only : null;
    if (opts.simple) body.classList.add('simple');
    if (only !== null) body.classList.add('one-step');
    body.innerHTML = `
      ${only === null ? `<div class="steps" role="tablist" aria-label="실습 단계">
        ${FRONT_STEPS.map((s, i) => `<button type="button" role="tab" data-step="${i}" aria-selected="${i === 0}">${i + 1}단계 · ${s.title}</button>`).join('')}
      </div>` : ''}
      <p class="step-note"></p>
      <div class="playground">
        <div class="editor">
          <div class="editor-tabs" role="tablist" aria-label="편집할 언어">
            <button type="button" role="tab" data-lang="html" aria-selected="true">HTML</button>
            <button type="button" role="tab" data-lang="css" aria-selected="false">CSS</button>
            <button type="button" role="tab" data-lang="js" aria-selected="false">JavaScript</button>
          </div>
          <label class="sr-only" for="${hostId}-code">코드 편집</label>
          <textarea id="${hostId}-code" class="code-input" spellcheck="false" autocomplete="off"></textarea>
          <div class="lab-actions">
            <button class="lab-button primary" type="button" data-act="run">▶ 실행 <kbd>Ctrl</kbd>+<kbd>Enter</kbd></button>
            <button class="lab-button" type="button" data-act="reset">이 단계 처음으로</button>
          </div>
        </div>
        <div class="preview">
          <p class="preview-label">미리보기 · 주문 태블릿 화면</p>
          <div class="preview-screen" id="${hostId}"></div>
          <p class="lab-error" role="alert" hidden></p>
        </div>
      </div>
      <p class="step-task"></p>
      <details class="code-peek" ${opts.simple ? '' : 'hidden'}><summary>이 단계의 코드 보기</summary><div class="code-peek-body"></div></details>`;

    const host = body.querySelector(`#${hostId}`);
    const shadow = host.attachShadow({ mode: 'open' });
    const input = body.querySelector('.code-input');
    const errorBox = body.querySelector('.lab-error');
    const code = { html: '', css: '', js: '' };
    let lang = 'html';
    let step = 0;

    function showError(message) {
      errorBox.hidden = false;
      // 브라우저 내부 문구(appendChild 등)는 빼고 핵심 오류만 보여 줍니다.
      const plainMessage = message.replace(/Failed to execute '\w+' on '\w+':\s*/, '').trim();
      errorBox.textContent = `JavaScript 오류: ${plainMessage}. 괄호와 따옴표 짝이 맞는지 확인해 보세요.`;
    }

    function run() {
      code[lang] = input.value;
      errorBox.hidden = true;
      shadow.innerHTML = `<style>:host { all: initial; display: block; color: #1d1d1d; font-family: sans-serif; }\n${code.css}</style>${code.html}`;
      if (!code.js.trim()) return;
      const onError = event => { event.preventDefault(); showError(event.message.replace(/^Uncaught\s*/, '')); };
      window.addEventListener('error', onError);
      const script = document.createElement('script');
      script.textContent = `(function (root) {\n${code.js}\n})(document.getElementById(${JSON.stringify(hostId)}).shadowRoot);`;
      document.body.appendChild(script);
      script.remove();
      window.removeEventListener('error', onError);
    }

    function loadStep(i) {
      step = i;
      Object.assign(code, { html: FRONT_STEPS[i].html, css: FRONT_STEPS[i].css, js: FRONT_STEPS[i].js });
      body.querySelectorAll('[data-step]').forEach(b => b.setAttribute('aria-selected', String(Number(b.dataset.step) === i)));
      body.querySelector('.step-note').textContent = FRONT_STEPS[i].note;
      body.querySelector('.step-task').innerHTML = opts.simple
        ? `<strong>살펴보기</strong> ${FRONT_OBSERVE[i]}`
        : `<strong>도전 과제</strong> ${FRONT_STEPS[i].task}`;
      body.querySelector('.code-peek-body').innerHTML = [['HTML', code.html], ['CSS', code.css], ['JavaScript', code.js]]
        .filter(([, src]) => src)
        .map(([name, src]) => `<p class="panel-label">${name}</p><pre>${escapeHtml(src)}</pre>`).join('');
      selectLang(i === 0 ? 'html' : i === 1 ? 'css' : 'js', false);
      run();
    }

    function selectLang(next, save = true) {
      if (save) code[lang] = input.value;
      lang = next;
      body.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.lang === next)));
      input.value = code[next];
      input.placeholder = next === 'js' ? '// 이 단계에는 아직 JavaScript가 없습니다.' : next === 'css' ? '/* 이 단계에는 아직 CSS가 없습니다. */' : '';
    }

    body.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => loadStep(Number(b.dataset.step))));
    body.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => selectLang(b.dataset.lang)));
    body.querySelector('[data-act="run"]').addEventListener('click', run);
    body.querySelector('[data-act="reset"]').addEventListener('click', () => loadStep(step));
    input.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); run(); }
      if (event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault();
        const { selectionStart: s, selectionEnd: e } = input;
        input.setRangeText('  ', s, e, 'end');
      }
    });
    loadStep(only === null ? 0 : only);
  }

  /* ───────────── 2강: 세션 · 쿠키 · 인증/인가 ───────────── */
  function sessionLab(body) {
    const USERS = {
      hong: { pw: '1234', name: '홍길동', role: '일반 회원' },
      admin: { pw: 'admin1', name: '관리자', role: '관리자' }
    };
    const sessions = {};
    let cookie = null;
    const missions = missionList([
      ['anon', '로그인하지 않고 <code>GET /me</code>를 보내 <strong>401</strong>을 받아 보세요.'],
      ['login', '<code>hong</code>으로 로그인한 뒤 <code>GET /me</code>로 <strong>200</strong>을 받아 보세요.'],
      ['forbid', '일반 회원으로 <code>GET /admin</code>을 보내 <strong>403</strong>을 받아 보세요. (인증은 됐지만 인가가 없음)'],
      ['stateless', '쿠키를 지운 뒤 다시 <code>GET /me</code>를 보내 서버가 나를 잊는 것을 확인해 보세요.']
    ]);

    body.innerHTML = `
      <div class="sim-grid">
        <div class="sim-panel">
          <p class="panel-label">브라우저</p>
          <div class="field-row">
            <label for="sess-id">아이디</label>
            <select id="sess-id"><option value="hong">hong (일반 회원)</option><option value="admin">admin (관리자)</option></select>
          </div>
          <div class="field-row">
            <label for="sess-pw">비밀번호</label>
            <input id="sess-pw" type="text" value="1234" autocomplete="off">
          </div>
          <p class="hint-line">연습용 계정: hong / 1234, admin / admin1</p>
          <div class="request-buttons">
            <button class="lab-button" type="button" data-req="login">POST /login</button>
            <button class="lab-button" type="button" data-req="me">GET /me</button>
            <button class="lab-button" type="button" data-req="admin">GET /admin</button>
            <button class="lab-button ghost" type="button" data-req="clear">쿠키 지우기</button>
          </div>
          <p class="panel-label">브라우저가 가진 쿠키</p>
          <p class="state-box" data-view="cookie"></p>
        </div>
        <div class="sim-panel">
          <p class="panel-label">서버의 세션 장부</p>
          <div class="state-box" data-view="sessions"></div>
          <p class="panel-label">요청 · 응답 기록</p>
          <ol class="http-log" aria-live="polite"></ol>
        </div>
      </div>`;
    body.append(...missions.nodes);

    const idSelect = body.querySelector('#sess-id');
    const pwInput = body.querySelector('#sess-pw');
    const log = body.querySelector('.http-log');
    idSelect.addEventListener('change', () => { pwInput.value = USERS[idSelect.value].pw; });

    function draw() {
      body.querySelector('[data-view="cookie"]').textContent = cookie ? `session_id=${cookie}` : '(없음)';
      const rows = Object.entries(sessions);
      body.querySelector('[data-view="sessions"]').innerHTML = rows.length
        ? `<table class="mini-table"><thead><tr><th>세션 ID</th><th>사용자</th><th>권한</th></tr></thead><tbody>${rows.map(([id, s]) => `<tr><td><code>${id}</code></td><td>${s.name}</td><td>${s.role}</td></tr>`).join('')}</tbody></table>`
        : '(비어 있음)';
    }

    function record(request, status, text, payload) {
      const ok = status < 300;
      const item = document.createElement('li');
      item.className = ok ? 'ok' : 'fail';
      item.innerHTML = `<div class="req">→ ${escapeHtml(request)}${cookie && !request.startsWith('POST') ? `<br><span class="hdr">Cookie: session_id=${cookie}</span>` : ''}</div>
        <div class="res">← <strong>${status} ${text}</strong> ${payload ? `<code>${escapeHtml(payload)}</code>` : ''}</div>`;
      log.prepend(item);
    }

    function handle(kind) {
      if (kind === 'clear') {
        cookie = null;
        const item = document.createElement('li');
        item.className = 'note';
        item.textContent = '브라우저가 쿠키를 지웠습니다. 서버 장부에는 기록이 남아 있지만, 번호표가 없어 나를 찾을 수 없습니다.';
        log.prepend(item);
        draw();
        missions.cleared = true;
        return;
      }
      if (kind === 'login') {
        const user = USERS[idSelect.value];
        if (pwInput.value !== user.pw) { record(`POST /login  {"id":"${idSelect.value}"}`, 401, 'Unauthorized', '{"error":"비밀번호가 틀렸습니다"}'); return; }
        const id = `s_${Math.random().toString(16).slice(2, 6)}`;
        sessions[id] = { name: user.name, role: user.role };
        cookie = id;
        record(`POST /login  {"id":"${idSelect.value}"}`, 200, 'OK', `Set-Cookie: session_id=${id}`);
        missions.cleared = false;
        draw();
        return;
      }
      const session = cookie && sessions[cookie];
      if (kind === 'me') {
        if (!session) {
          record('GET /me', 401, 'Unauthorized', '{"error":"로그인이 필요합니다"}');
          if (missions.cleared) missions.complete('stateless'); else missions.complete('anon');
          return;
        }
        record('GET /me', 200, 'OK', JSON.stringify({ name: session.name, role: session.role }));
        missions.complete('login');
        return;
      }
      if (kind === 'admin') {
        if (!session) { record('GET /admin', 401, 'Unauthorized', '{"error":"로그인이 필요합니다"}'); return; }
        if (session.role !== '관리자') { record('GET /admin', 403, 'Forbidden', '{"error":"권한이 없습니다"}'); missions.complete('forbid'); return; }
        record('GET /admin', 200, 'OK', '{"page":"관리자 대시보드"}');
      }
    }

    body.querySelectorAll('[data-req]').forEach(b => b.addEventListener('click', () => handle(b.dataset.req)));
    draw();
  }

  /* ───────────── 2강: 트랜잭션 계좌 이체 ───────────── */
  function transactionLab(body) {
    const START = { A: 100000, B: 50000 };
    const AMOUNT = 100000;
    let bank = { ...START };
    let busy = false;
    const won = n => `${n.toLocaleString('ko-KR')}원`;
    const missions = missionList([
      ['vanish', '트랜잭션 없이 정전을 켜고 이체해, 돈이 사라지는 것을 확인해 보세요.'],
      ['rollback', '트랜잭션을 켜고 정전 상태로 이체해, <strong>Rollback</strong>으로 되돌아오는 것을 확인해 보세요.'],
      ['commit', '정전 없이 트랜잭션으로 이체해 <strong>Commit</strong>을 확인해 보세요.']
    ]);

    body.innerHTML = `
      <div class="accounts">
        <div class="account"><span>A 계좌</span><strong data-acc="A"></strong></div>
        <div class="account-arrow" aria-hidden="true">→ 10만 원 →</div>
        <div class="account"><span>B 계좌</span><strong data-acc="B"></strong></div>
        <div class="account total"><span>은행 전체 돈</span><strong data-acc="total"></strong></div>
      </div>
      <div class="toggles">
        <label><input type="checkbox" id="tx-on"> 두 작업을 트랜잭션으로 묶기</label>
        <label><input type="checkbox" id="tx-crash"> ② 입금 직전에 서버 정전</label>
      </div>
      <div class="lab-actions">
        <button class="lab-button primary" type="button" data-act="transfer">10만 원 이체 실행</button>
        <button class="lab-button" type="button" data-act="reset">잔액 초기화</button>
      </div>
      <ol class="tx-log" aria-live="polite"></ol>`;
    body.append(...missions.nodes);

    const log = body.querySelector('.tx-log');
    const txOn = body.querySelector('#tx-on');
    const crash = body.querySelector('#tx-crash');

    function draw() {
      body.querySelector('[data-acc="A"]').textContent = won(bank.A);
      body.querySelector('[data-acc="B"]').textContent = won(bank.B);
      const total = bank.A + bank.B;
      const totalEl = body.querySelector('[data-acc="total"]');
      totalEl.textContent = won(total);
      totalEl.parentElement.classList.toggle('broken', total !== START.A + START.B);
    }

    function line(text, kind = '') {
      const li = document.createElement('li');
      li.className = kind;
      li.innerHTML = text;
      log.append(li);
    }

    async function transfer() {
      if (busy) return;
      busy = true;
      log.innerHTML = '';
      const useTx = txOn.checked;
      const willCrash = crash.checked;
      const before = { ...bank };
      if (useTx) { line('BEGIN · 트랜잭션 시작', 'muted'); await wait(400); }
      if (bank.A < AMOUNT) {
        line(`A 잔액이 ${won(bank.A)}이라 10만 원을 보낼 수 없습니다. (일관성: 잔액은 마이너스가 될 수 없음)`, 'fail');
        if (useTx) line('ROLLBACK · 아무것도 바뀌지 않았습니다.', 'muted');
        busy = false;
        return;
      }
      bank.A -= AMOUNT; draw();
      line(`① A 계좌에서 ${won(AMOUNT)} 차감`, 'ok');
      await wait(500);
      if (willCrash) {
        line('⚡ 서버 정전! ② 입금을 하지 못했습니다.', 'fail');
        await wait(500);
        if (useTx) {
          bank = before; draw();
          line('ROLLBACK · 확정되지 않은 ①을 시작 전으로 되돌렸습니다. 돈은 그대로입니다.', 'ok');
          missions.complete('rollback');
        } else {
          line(`A에서는 빠져나갔는데 B에는 들어가지 않았습니다. <strong>${won(AMOUNT)}이 사라졌습니다.</strong>`, 'fail');
          missions.complete('vanish');
        }
        busy = false;
        return;
      }
      bank.B += AMOUNT; draw();
      line(`② B 계좌에 ${won(AMOUNT)} 입금`, 'ok');
      await wait(400);
      if (useTx) { line('COMMIT · 두 작업을 함께 확정했습니다.', 'ok'); missions.complete('commit'); }
      else line('이번에는 무사히 끝났지만, 중간에 멈췄다면 보호 장치가 없었습니다.', 'muted');
      busy = false;
    }

    body.querySelector('[data-act="transfer"]').addEventListener('click', transfer);
    body.querySelector('[data-act="reset"]').addEventListener('click', () => { if (busy) return; bank = { ...START }; log.innerHTML = ''; draw(); });
    draw();
  }

  /* ───────────── 3강: SQL 실습실 ───────────── */
  const SEED_SQL = `
    CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, city TEXT, age INTEGER);
    INSERT INTO customers VALUES (1,'홍길동','서울',34),(2,'김영희','부산',28),(3,'이철수','대전',41),(4,'박민지','서울',25),(5,'최유리','광주',37);
    CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, item TEXT, price INTEGER, ordered_at TEXT);
    INSERT INTO orders VALUES (10,1,'책',20000,'2026-09-01'),(11,1,'텀블러',15000,'2026-09-03'),(12,2,'노트',5000,'2026-09-04'),(13,3,'이어폰',89000,'2026-09-05'),(14,1,'책',18000,'2026-09-10'),(15,5,'가방',62000,'2026-09-11'),(16,3,'책',22000,'2026-09-12');
    CREATE TABLE posts (id INTEGER PRIMARY KEY, author_id INTEGER, caption TEXT, image_key TEXT, is_public INTEGER);
    INSERT INTO posts VALUES (12,1,'첫 여행 사진','users/1/posts/12.jpg',1),(13,2,'비공개 메모 사진','users/2/posts/13.jpg',0),(14,4,'오늘의 점심','users/4/posts/14.jpg',1);`;

  const SQL_TASKS = [
    { title: '표 전체 보기', goal: '<code>customers</code> 표의 모든 행과 열을 조회하세요.',
      hint: 'SELECT * FROM 표이름;', answer: 'SELECT * FROM customers;' },
    { title: '조건으로 고르기 · WHERE', goal: '30세 이상인 고객의 <strong>이름만</strong> 조회하세요.',
      hint: 'SELECT name FROM customers WHERE ...', answer: 'SELECT name FROM customers WHERE age >= 30;' },
    { title: '두 표 잇기 · JOIN', goal: '홍길동이 주문한 <strong>상품과 금액</strong>을 조회하세요. <code>orders</code>에는 이름 대신 <code>customer_id</code>만 있습니다.',
      hint: "두 표를 orders JOIN customers ON orders.customer_id = customers.id 로 잇고, WHERE customers.name = '홍길동' 으로 홍길동만 고릅니다.",
      answer: "SELECT orders.item, orders.price\nFROM orders\nJOIN customers ON orders.customer_id = customers.id\nWHERE customers.name = '홍길동';" },
    { title: '묶어서 합계 · GROUP BY', goal: '고객 이름별 <strong>주문 총액</strong>을 구하세요.',
      hint: 'SUM(orders.price) 와 GROUP BY customers.name',
      answer: 'SELECT customers.name, SUM(orders.price) AS total\nFROM orders\nJOIN customers ON orders.customer_id = customers.id\nGROUP BY customers.name;' },
    { title: '정규화 체험 · 한 곳만 고치기', goal: '홍길동이 <strong>부산</strong>으로 이사했습니다. <code>customers</code> 표 한 곳만 고친 뒤, 홍길동의 주문과 도시를 함께 조회해 모든 주문에 새 주소가 보이는지 확인하세요.',
      hint: "UPDATE customers SET city = '부산' WHERE name = '홍길동';",
      answer: "UPDATE customers SET city = '부산' WHERE name = '홍길동';\nSELECT orders.item, customers.city\nFROM orders\nJOIN customers ON orders.customer_id = customers.id\nWHERE customers.name = '홍길동';",
      check: db => {
        const r = db.exec("SELECT city FROM customers WHERE name = '홍길동'");
        return r.length && r[0].values[0][0] === '부산';
      } },
    { title: 'DB에는 주소만, 파일은 스토리지에', goal: '공개 게시물(<code>is_public = 1</code>)의 설명과 사진 파일 키를 조회하세요. 사진 자체가 아니라 <strong>창고 속 위치</strong>만 들어 있는 것을 확인하세요.',
      hint: 'SELECT caption, image_key FROM posts WHERE ...', answer: 'SELECT caption, image_key FROM posts WHERE is_public = 1;' }
  ];

  let sqlEngine = null;
  function loadSql() {
    if (sqlEngine) return sqlEngine;
    sqlEngine = new Promise((resolve, reject) => {
      const finish = () => window.initSqlJs().then(resolve, reject);
      if (window.initSqlJs) { finish(); return; }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-asm.js';
      script.onload = finish;
      script.onerror = () => reject(new Error('SQL 엔진을 불러오지 못했습니다.'));
      document.head.appendChild(script);
    }).catch(error => { sqlEngine = null; throw error; });
    return sqlEngine;
  }

  function resultTable(result) {
    if (!result) return '<p class="muted-line">실행했습니다. 조회 결과가 없는 명령입니다.</p>';
    return `<div class="table-wrap result-wrap"><table><thead><tr>${result.columns.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${result.values.map(row => `<tr>${row.map(v => `<td>${v === null ? '<em>NULL</em>' : escapeHtml(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="muted-line">${result.values.length}행</p>`;
  }

  const rowsKey = result => (result ? result.values.map(r => JSON.stringify(r)).sort().join('\n') : '');

  function sqlLab(body, opts = {}) {
    body.innerHTML = `
      <div class="sql-layout">
        <aside class="schema" aria-label="표 구조">
          <p class="panel-label">표 구조</p>
          <dl>
            <dt>customers <small>고객 · 출석부</small></dt><dd>id, name, city, age</dd>
            <dt>orders <small>주문 · 성적표</small></dt><dd>id, customer_id, item, price, ordered_at</dd>
            <dt>posts <small>게시물</small></dt><dd>id, author_id, caption, image_key, is_public</dd>
          </dl>
        </aside>
        <div class="sql-main">
          <div class="steps" role="tablist" aria-label="SQL 과제">
            ${SQL_TASKS.map((t, i) => `<button type="button" role="tab" data-task="${i}" aria-selected="${i === 0}">${i + 1}. ${t.title}</button>`).join('')}
          </div>
          <p class="sql-goal"></p>
          <label class="sr-only" for="sql-input">SQL 입력</label>
          <textarea id="sql-input" class="code-input sql-input" rows="5" spellcheck="false" autocomplete="off"></textarea>
          <div class="lab-actions">
            <button class="lab-button primary" type="button" data-act="run" disabled>▶ 실행 <kbd>Ctrl</kbd>+<kbd>Enter</kbd></button>
            <button class="lab-button" type="button" data-act="hint">힌트</button>
            ${opts.teacher ? '<button class="lab-button" type="button" data-act="answer">정답 넣기 (강사용)</button>' : ''}
            <button class="lab-button ghost" type="button" data-act="reset">DB 초기화</button>
          </div>
          <p class="sql-feedback" aria-live="polite">SQL 엔진을 불러오는 중입니다…</p>
          <div class="sql-result"></div>
        </div>
      </div>`;

    const input = body.querySelector('#sql-input');
    const feedback = body.querySelector('.sql-feedback');
    const resultEl = body.querySelector('.sql-result');
    const runButton = body.querySelector('[data-act="run"]');
    const solved = new Set();
    let SQL = null;
    let db = null;
    let task = 0;

    function freshDb() { const d = new SQL.Database(); d.run(SEED_SQL); return d; }

    function selectTask(i) {
      task = i;
      body.querySelectorAll('[data-task]').forEach(b => b.setAttribute('aria-selected', String(Number(b.dataset.task) === i)));
      body.querySelector('.sql-goal').innerHTML = `<strong>과제 ${i + 1}</strong> ${SQL_TASKS[i].goal}`;
      input.value = '';
      input.placeholder = '-- 여기에 SQL을 입력하세요';
      resultEl.innerHTML = '';
      if (SQL) feedback.textContent = solved.has(i) ? '이미 해결한 과제입니다. 다른 방법으로도 써 보세요.' : '';
    }

    function run() {
      if (!db) return;
      const sql = input.value.trim();
      if (!sql) { feedback.textContent = 'SQL을 먼저 입력하세요.'; return; }
      let results;
      try { results = db.exec(sql); } catch (error) {
        feedback.className = 'sql-feedback fail';
        feedback.textContent = `오류: ${error.message}. 표 이름, 쉼표, 따옴표를 확인해 보세요.`;
        resultEl.innerHTML = '';
        return;
      }
      const last = results[results.length - 1];
      resultEl.innerHTML = resultTable(last);
      const t = SQL_TASKS[task];
      let ok;
      if (t.check) ok = t.check(db);
      else {
        const ref = freshDb();
        const expected = ref.exec(t.answer);
        ref.close();
        ok = rowsKey(last) === rowsKey(expected[expected.length - 1]);
      }
      if (ok) {
        solved.add(task);
        body.querySelector(`[data-task="${task}"]`).classList.add('solved');
        feedback.className = 'sql-feedback ok';
        feedback.textContent = `정답입니다. (${solved.size} / ${SQL_TASKS.length} 해결)`;
      } else {
        feedback.className = 'sql-feedback';
        feedback.textContent = '실행은 됐지만 과제가 원하는 결과와 다릅니다. 힌트를 참고해 다시 시도해 보세요.';
      }
    }

    body.querySelectorAll('[data-task]').forEach(b => b.addEventListener('click', () => selectTask(Number(b.dataset.task))));
    runButton.addEventListener('click', run);
    body.querySelector('[data-act="hint"]').addEventListener('click', () => { feedback.className = 'sql-feedback'; feedback.textContent = `힌트: ${SQL_TASKS[task].hint}`; });
    body.querySelector('[data-act="answer"]')?.addEventListener('click', () => { input.value = SQL_TASKS[task].answer; input.focus(); });
    body.querySelector('[data-act="reset"]').addEventListener('click', () => {
      if (!SQL) return;
      db.close(); db = freshDb();
      feedback.className = 'sql-feedback';
      feedback.textContent = 'DB를 처음 상태로 되돌렸습니다.';
      resultEl.innerHTML = '';
    });
    input.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); run(); }
    });

    selectTask(0);
    loadSql().then(engine => {
      SQL = engine;
      db = freshDb();
      runButton.disabled = false;
      feedback.className = 'sql-feedback';
      feedback.textContent = '준비됐습니다. 이 DB는 내 브라우저 안에서만 돌아가니 마음껏 실험해도 됩니다.';
    }, () => {
      feedback.className = 'sql-feedback fail';
      feedback.textContent = 'SQL 엔진을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 페이지를 새로 고쳐 주세요.';
    });
  }

  /* ───────────── 3강: 눌러서 보는 SQL (기본 실습) ───────────── */
  const SQL_QUESTIONS = [
    { label: '고객 표 전체 보기', sql: 'SELECT * FROM customers;',
      say: '장부(DB)의 표 하나입니다. <strong>한 줄(행)이 고객 한 명</strong>, 한 칸(열)이 이름·도시·나이 같은 항목입니다.' },
    { label: '30세 이상만 고르기', sql: 'SELECT name, age FROM customers WHERE age >= 30;',
      say: '<code>WHERE</code>로 조건을 걸어 필요한 줄만 골랐습니다. 데이터가 1,000만 줄이어도 같은 한 줄로 찾습니다.' },
    { label: '주문 표 보기', sql: 'SELECT * FROM orders;',
      say: '주문 표에는 고객 <strong>이름이 없고 번호(customer_id)만</strong> 있습니다. 같은 이름과 주소를 주문마다 반복해 적지 않기 위해서입니다.' },
    { label: '주문에 고객 이름 잇기 (JOIN)', sql: 'SELECT customers.name, orders.item, orders.price\nFROM orders\nJOIN customers ON orders.customer_id = customers.id;',
      say: '두 표를 <strong>번호로 맞대어</strong> 이름과 주문을 함께 봤습니다. 출석부와 성적표를 출석번호로 맞춰 보는 것과 같습니다. 이것이 <code>JOIN</code>입니다.' },
    { label: '홍길동이 부산으로 이사', sql: "UPDATE customers SET city = '부산' WHERE name = '홍길동';\nSELECT customers.name, customers.city, orders.item\nFROM orders\nJOIN customers ON orders.customer_id = customers.id\nWHERE customers.name = '홍길동';",
      say: '고객 표 <strong>한 곳만</strong> 고쳤는데 홍길동의 모든 주문에 새 주소가 보입니다. 같은 사실을 한 곳에만 두는 <strong>정규화</strong> 덕분입니다.' },
    { label: '게시물 사진은 어디에?', sql: 'SELECT caption, image_key FROM posts;',
      say: 'DB에는 사진 파일 자체가 아니라 <strong>창고(스토리지) 속 위치</strong>만 적혀 있습니다. 장부에는 위치를, 물건은 창고에 둡니다.' }
  ];

  // opts.only: 본문의 절마다 일부 질문만 보여 줄 때의 질문 번호 목록(예: [0,1,2,3,4] 또는 [5])
  function sqlClickLab(body, opts = {}) {
    const seen = new Set();
    const items = opts.only || SQL_QUESTIONS.map((_, i) => i);
    body.innerHTML = `
      <div class="sql-buttons">${items.map(i => `<button class="lab-button" type="button" data-q="${i}" disabled>${i + 1}. ${SQL_QUESTIONS[i].label}</button>`).join('')}</div>
      <p class="sql-feedback" aria-live="polite">SQL 엔진을 불러오는 중입니다…</p>
      <div class="sql-answer" hidden>
        <p class="panel-label">DB에 보낸 질문 (SQL)</p>
        <pre class="sql-shown"></pre>
        <p class="sql-say"></p>
        <div class="sql-result"></div>
      </div>
      <div class="lab-actions"><button class="lab-button ghost" type="button" data-act="reset" disabled>처음부터 다시</button></div>`;
    const feedback = body.querySelector('.sql-feedback');
    const answer = body.querySelector('.sql-answer');
    let SQL = null;
    let db = null;
    const fresh = () => { const d = new SQL.Database(); d.run(SEED_SQL); return d; };

    body.querySelectorAll('[data-q]').forEach(button => button.addEventListener('click', () => {
      const q = SQL_QUESTIONS[Number(button.dataset.q)];
      const results = db.exec(q.sql);
      seen.add(button.dataset.q);
      button.classList.add('seen');
      answer.hidden = false;
      body.querySelector('.sql-shown').textContent = q.sql;
      body.querySelector('.sql-say').innerHTML = q.say;
      body.querySelector('.sql-result').innerHTML = resultTable(results[results.length - 1]);
      feedback.textContent = items.length === 1 ? '확인했습니다.' : seen.size === items.length ? `${items.length}개를 모두 확인했습니다.` : `${items.length}개 중 ${seen.size}개 확인`;
    }));
    // 처음부터 다시: DB · ✓ 표시 · 결과 화면을 모두 처음으로(수업 전 리허설 뒤에도 깨끗하게)
    body.querySelector('[data-act="reset"]').addEventListener('click', () => {
      db.close(); db = fresh();
      seen.clear();
      body.querySelectorAll('[data-q].seen').forEach(b => b.classList.remove('seen'));
      answer.hidden = true;
      feedback.textContent = items.length > 1 ? `처음 상태로 되돌렸습니다. ${items[0] + 1}번부터 다시 눌러 보세요.` : '처음 상태로 되돌렸습니다.';
    });

    loadSql().then(engine => {
      SQL = engine;
      db = fresh();
      body.querySelectorAll('button[disabled]').forEach(b => { b.disabled = false; });
      feedback.textContent = items.length > 1 ? `준비됐습니다. ${items[0] + 1}번부터 차례로 눌러 보세요.` : '준비됐습니다. 버튼을 눌러 보세요.';
    }, () => {
      feedback.className = 'sql-feedback fail';
      feedback.textContent = 'SQL 엔진을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 페이지를 새로 고쳐 주세요.';
    });
  }

  /* ───────────── 4강: DNS 길찾기와 TTL ───────────── */
  function dnsLab(body) {
    const DOMAIN = 'myservice.com';
    const TTL = 300;
    const OLD_IP = '203.0.113.10';
    const NEW_IP = '198.51.100.7';
    let realIp = OLD_IP;
    let clock = 0;
    let cache = null;
    let busy = false;
    const missions = missionList([
      ['full', '처음 주소를 찾아 루트 → .com → 네임서버까지 가는 전체 경로를 보세요.'],
      ['cached', '바로 한 번 더 찾아 <strong>캐시</strong>에서 즉시 답이 나오는 것을 보세요.'],
      ['stale', '서버를 이사시킨 뒤 다시 찾아 <strong>옛 주소</strong>를 받는 상황을 만들어 보세요.'],
      ['fresh', '시간을 흘려 TTL이 지난 뒤 <strong>새 주소</strong>를 받아 보세요.']
    ]);

    const NODES = [['cache', '내 컴퓨터 캐시'], ['resolver', '리졸버 (통신사)'], ['root', '루트 서버'], ['tld', '.com 서버'], ['ns', '네임서버']];
    body.innerHTML = `
      <div class="dns-path">${NODES.map(([k, label]) => `<div class="dns-node" data-node="${k}">${label}</div>`).join('<span class="dns-arrow" aria-hidden="true">→</span>')}</div>
      <div class="dns-status">
        <div><span>시각</span><strong data-view="clock"></strong></div>
        <div><span>내 캐시</span><strong data-view="cache"></strong></div>
        <div><span>실제 서버 주소</span><strong data-view="real"></strong></div>
      </div>
      <div class="lab-actions">
        <button class="lab-button primary" type="button" data-act="lookup">${DOMAIN} 주소 찾기</button>
        <button class="lab-button" type="button" data-act="time">시간 +60초</button>
        <button class="lab-button" type="button" data-act="move">서버 이사 (IP 변경)</button>
        <button class="lab-button ghost" type="button" data-act="flush">캐시 비우기</button>
      </div>
      <ol class="dns-log" aria-live="polite"></ol>`;
    body.append(...missions.nodes);

    const log = body.querySelector('.dns-log');
    const left = () => (cache ? Math.max(0, cache.expires - clock) : 0);

    function draw() {
      body.querySelector('[data-view="clock"]').textContent = `+${clock}초`;
      body.querySelector('[data-view="cache"]').textContent = cache && left() > 0 ? `${cache.ip} · 남은 TTL ${left()}초` : '없음';
      body.querySelector('[data-view="real"]').textContent = realIp;
    }

    function say(text, kind = '') {
      const li = document.createElement('li');
      li.className = kind;
      li.innerHTML = text;
      log.prepend(li);
    }

    async function light(key) {
      body.querySelectorAll('.dns-node').forEach(n => n.classList.toggle('active', n.dataset.node === key));
      await wait(450);
    }

    async function lookup() {
      if (busy) return;
      busy = true;
      await light('cache');
      if (cache && left() > 0) {
        const stale = cache.ip !== realIp;
        say(stale
          ? `캐시에서 바로 <code>${cache.ip}</code> 주소를 받았습니다. 하지만 가게는 이미 <code>${realIp}</code> 주소로 이사했습니다. <strong>옛 건물로 찾아갑니다.</strong> 남은 TTL ${left()}초가 지나야 새 주소를 묻습니다.`
          : `캐시에서 바로 <code>${cache.ip}</code> 주소를 받았습니다. 아무에게도 묻지 않아 가장 빠릅니다. (남은 TTL ${left()}초)`, stale ? 'fail' : 'ok');
        missions.complete(stale ? 'stale' : 'cached');
      } else {
        const hadOld = cache && cache.ip !== realIp;
        say('내 캐시에 없거나 기한이 지났습니다. 리졸버에게 묻습니다.', 'muted');
        await light('resolver');
        await light('root'); say('루트 서버: ".com은 .com 서버에 물어보세요."', 'muted');
        await light('tld'); say(`.com 서버: "${DOMAIN}은 이 네임서버가 담당합니다."`, 'muted');
        await light('ns');
        cache = { ip: realIp, expires: clock + TTL };
        say(`네임서버: "${DOMAIN}의 IP는 <code>${realIp}</code>입니다." 이 답을 TTL ${TTL}초 동안 기억합니다.`, 'ok');
        missions.complete(hadOld || (realIp === NEW_IP && missions.movedSeen) ? 'fresh' : 'full');
      }
      body.querySelectorAll('.dns-node').forEach(n => n.classList.remove('active'));
      draw();
      busy = false;
    }

    body.querySelector('[data-act="lookup"]').addEventListener('click', lookup);
    body.querySelector('[data-act="time"]').addEventListener('click', () => {
      clock += 60; draw();
      say(cache && left() === 0 ? `+${clock}초 · TTL이 끝나 캐시가 만료됐습니다.` : `+${clock}초`, 'muted');
    });
    body.querySelector('[data-act="move"]').addEventListener('click', () => {
      realIp = realIp === OLD_IP ? NEW_IP : OLD_IP;
      missions.movedSeen = true;
      say(`가게가 이사했습니다. 네임서버의 A 레코드가 <code>${realIp}</code> 주소로 바뀌었습니다. 이미 받아 둔 캐시는 그대로입니다.`, 'note');
      draw();
    });
    body.querySelector('[data-act="flush"]').addEventListener('click', () => { cache = null; say('캐시를 비웠습니다.', 'muted'); draw(); });
    draw();
  }

  /* ───────────── 4강: 장애 진단 퀴즈 ───────────── */
  const TROUBLES = [
    { q: '친구에게 <code>http://localhost:3000</code> 링크를 보냈는데 친구 화면에는 아무것도 안 열립니다.',
      a: 'localhost는 친구 자신의 컴퓨터를 가리킨다',
      wrong: ['3000번 포트가 친구 컴퓨터에서 막혀 있다', 'HTTPS 인증서가 없다', '친구 브라우저가 오래됐다'],
      why: 'localhost는 "우리 집"처럼 말하는 사람마다 다른 곳을 가리킵니다. 친구가 열려면 공개 서버와 도메인이 필요합니다.' },
    { q: '화면은 뜨는데 주문 버튼을 누르면 <strong>502 Bad Gateway</strong>가 나옵니다.',
      a: '앞단(Nginx)이 받은 요청을 넘길 백엔드가 꺼져 있거나 포트가 틀렸다',
      wrong: ['DNS TTL이 아직 안 끝났다', '이미지 파일이 너무 크다', 'CSS 파일이 빠졌다'],
      why: '502는 프런트 직원이 주방에 주문을 넣었는데 주방에 아무도 없는 상황입니다. 앱 실행 상태와 프록시가 가리키는 포트를 먼저 보세요.' },
    { q: '도메인을 연결했더니 주소창에 <strong>"안전하지 않음"</strong>이 뜹니다.',
      a: 'TLS 인증서가 아직 발급되지 않았거나 만료됐다',
      wrong: ['백엔드 코드에 오류가 있다', 'DB 인덱스가 없다', 'npm install을 안 했다'],
      why: '자물쇠는 영업허가증입니다. DNS가 맞게 연결됐는지, 인증서 발급과 도메인 검증이 끝났는지 확인하세요.' },
    { q: '새 버전을 배포했는데 사용자에게는 여전히 <strong>옛날 화면</strong>이 보입니다.',
      a: '브라우저·CDN 캐시가 옛 파일을 주고 있거나 다른 브랜치가 배포됐다',
      wrong: ['DB 트랜잭션이 롤백됐다', '로드 밸런서가 고장 났다', '도메인이 만료됐다'],
      why: '편의점 진열대(캐시)에 옛 상품이 남아 있는 상황입니다. 배포된 브랜치와 캐시 무효화를 확인하세요.' },
    { q: 'DNS에서 IP를 바꿨는데 어떤 사람은 새 사이트, 어떤 사람은 <strong>옛 사이트</strong>를 봅니다.',
      a: '각자 캐시해 둔 옛 주소가 TTL이 끝날 때까지 남아 있다',
      wrong: ['서버가 해킹당했다', 'HTML 문법이 틀렸다', '세션이 만료됐다'],
      why: '이사 후 단골들 지도 앱에 옛 주소가 남아 있는 것과 같습니다. 바로 위 DNS 실습에서 직접 확인할 수 있습니다.' },
    { q: '내 컴퓨터에서는 잘 되는데 배포 서버에서만 실행이 실패합니다.',
      a: 'Node 버전, 환경 변수 같은 실행 환경이 서로 다르다',
      wrong: ['도메인 이름이 너무 길다', '인터넷 속도가 느리다', 'CSS 우선순위가 꼬였다'],
      why: '요리법만 보내면 집마다 맛이 다릅니다. 버전과 환경 변수를 맞추거나 Docker 밀키트로 환경째 포장합니다.' }
  ];

  function troubleQuiz(body) {
    let right = 0;
    let answered = 0;
    const uid = Math.random().toString(36).slice(2, 7);
    body.innerHTML = `${TROUBLES.map((t, i) => `
      <fieldset class="trouble" data-index="${i}">
        <legend><span>증상 ${i + 1}</span>${t.q}</legend>
        ${shuffle([t.a, ...t.wrong]).map((choice, j) => `
          <label class="choice"><input type="radio" name="t-${uid}-${i}" id="t-${uid}-${i}-${j}" value="${escapeHtml(choice)}"> ${escapeHtml(choice)}</label>`).join('')}
        <p class="why" hidden></p>
      </fieldset>`).join('')}
      <p class="lab-result" aria-live="polite"></p>`;
    const result = body.querySelector('.lab-result');
    body.querySelectorAll('.trouble').forEach(set => {
      const t = TROUBLES[Number(set.dataset.index)];
      set.addEventListener('change', event => {
        if (set.dataset.done) return;
        set.dataset.done = '1';
        const ok = event.target.value === t.a;
        answered += 1;
        if (ok) right += 1;
        set.classList.add(ok ? 'is-right' : 'is-wrong');
        set.querySelectorAll('input').forEach(input => {
          input.disabled = true;
          if (input.value === t.a) input.parentElement.classList.add('correct');
        });
        const why = set.querySelector('.why');
        why.hidden = false;
        why.innerHTML = `<strong>${ok ? '맞았습니다.' : '정답은 표시된 항목입니다.'}</strong> ${t.why}`;
        result.textContent = `${answered} / ${TROUBLES.length}개 풀이 · ${right}개 정답`;
      });
    });
  }

  /* ───────────── 강의 본문 속 "바로 해 보기" ─────────────
     app.js가 강의의 해당 절 끝에 자리를 만들고 inline(kind, host, …)을 부릅니다.
     optional: true 이면 접힌 채로 두었다가, 펼칠 때 처음 만듭니다(SQL 엔진 같은 큰 파일도 그때 받음). */
  const INLINE = {
    analogy: { time: '약 2분', title: '웹 서비스를 식당으로 옮겨 보기', practiceQuiz: true,
      goal: '바로 위 표의 식당 비유입니다. 각 기술이 식당의 무엇에 해당하는지 골라 보세요.',
      build: (body, ctx) => matchQuiz(body, sectionTable(ctx.markdown, /전체를 꿰는 비유/).map(([web, place]) => ({ question: web, answer: plain(place) })), { left: '웹 서비스', right: '식당에서는' }) },
    'tablet-step': { time: '약 1~2분',
      title: ctx => `주문 태블릿 ${ctx.step + 1}단계 · ${FRONT_STEPS[ctx.step].title}`,
      goal: ctx => ['방금 배운 HTML만으로 만든 화면입니다. 미리보기의 [담기]를 눌러 보세요.', '같은 화면에 CSS만 더했습니다. 무엇이 달라졌는지, [담기]는 어떤지 보세요.', '이번엔 JavaScript가 더해졌습니다. [담기]를 여러 번 눌러 보세요.', '같은 화면을 상태 중심으로 바꿨습니다. [담기]를 눌러 배지 · 문구 · 금액이 함께 바뀌는지 보세요.'][ctx.step],
      build: (body, ctx) => frontendLab(body, { simple: true, only: ctx.step }) },
    playground: { time: '약 10분', title: '주문 태블릿 코드를 직접 고쳐 보기',
      goal: '같은 화면의 코드를 직접 바꿔 봅니다. 단계마다 도전 과제가 있습니다.', build: body => frontendLab(body) },
    session: { restart: true, time: '약 3분', title: '목욕탕 열쇠로 로그인 유지하기',
      goal: '세션 · 쿠키가 오가는 모습을 보고, 인증(401)과 인가(403)의 차이를 직접 만들어 봅니다.', build: body => sessionLab(body) },
    transaction: { restart: true, time: '약 4분', title: '계좌 이체와 트랜잭션',
      goal: '체크박스 두 개와 버튼 하나로, 중간에 서버가 멈출 때 트랜잭션이 돈을 어떻게 지키는지 비교합니다.', build: body => transactionLab(body) },
    'sql-ask': { time: ctx => (ctx.only.length > 1 ? '약 4분' : '약 1분'),
      title: ctx => (ctx.only.length > 1 ? '장부에 질문하기 · 표 · 조건 · JOIN · 정규화' : '장부에 질문하기 · 사진은 어디에?'),
      goal: ctx => (ctx.only.length > 1 ? '버튼을 누르면 준비된 SQL이 실행됩니다. 표 보기부터 JOIN과 정규화까지 결과로 확인합니다.' : '게시물 표에 사진이 어떻게 들어 있는지 확인합니다.'),
      build: (body, ctx) => sqlClickLab(body, { only: ctx.only }) },
    'sql-write': { restart: true, time: '약 10분', title: 'SQL을 직접 써 보기',
      goal: '같은 장부에 SQL을 직접 입력해 6개 과제를 풉니다. 막히면 힌트를 보세요.', build: (body, ctx) => sqlLab(body, ctx) },
    dns: { restart: true, time: '약 6분', title: 'DNS 길찾기와 TTL',
      goal: '버튼만 눌러 도메인 주소를 찾는 경로를 따라가고, 서버 이사 후 캐시 때문에 옛 주소로 가는 상황을 재현합니다.', build: body => dnsLab(body) }
  };

  function inline(kind, host, ctx = {}) {
    const spec = INLINE[kind];
    if (!host || !spec) return;
    const val = v => (typeof v === 'function' ? v(ctx) : v);
    const title = val(spec.title);
    const steps = HOW_TO[title] || [];
    const howTo = steps.length ? `<div class="how-to"><p class="how-to-title">이렇게 진행하세요</p><ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol></div>` : '';
    const note = ctx.noteHtml || '';
    if (ctx.optional) {
      host.innerHTML = `<details class="inline-lab optional"><summary><span class="inline-tag">더 해 보기 · 시간이 있으면</span> ${title} <small>${val(spec.time)}</small>${spec.practiceQuiz ? ` ${PRACTICE_TAG}` : ''}</summary>
        <div class="inline-inner">${note}<p class="lab-goal">${val(spec.goal)}</p>${howTo}<div class="lab-body"></div></div></details>`;
      const details = host.querySelector('details');
      details.addEventListener('toggle', () => {
        const body = details.querySelector('.lab-body');
        if (!details.open || body.dataset.built) return;
        body.dataset.built = '1';
        spec.build(body, ctx);
        if (spec.restart) addRestart(details.querySelector('.inline-inner'), fresh => { fresh.dataset.built = '1'; spec.build(fresh, ctx); });
      });
      return;
    }
    host.dataset.printTitle = title; // 인쇄 · PDF에서는 실습 대신 "사이트에서 해 보기" 한 줄로 바뀝니다(styles.css)
    host.innerHTML = `<section class="inline-lab">
        <p class="lab-kind"><span>바로 해 보기</span>${val(spec.time)}</p>
        <h3 class="inline-title">${title}</h3>
        ${note}<p class="lab-goal">${val(spec.goal)}</p>${howTo}<div class="lab-body"></div></section>`;
    spec.build(host.querySelector('.lab-body'), ctx);
    if (spec.restart) addRestart(host.querySelector('.inline-lab'), fresh => spec.build(fresh, ctx));
  }

  /* ───────────── 복습 페이지 (강의를 마친 뒤) ───────────── */
  function mount(courseId, markdown, host) {
    if (!host) return;
    host.innerHTML = '';
    let no = 0;
    const add = (kind, title, goal, build, tag, restart) => {
      const { section, body } = labShell(no + 1, kind, title, goal, tag);
      host.appendChild(section);
      if (build(body) === false) { section.remove(); return; }
      no += 1;
      if (restart) addRestart(section, build);
    };
    const matchPairs = sectionTable(markdown, /문제\s*→\s*해결/).map(([q, a]) => ({ question: q, answer: plain(a) }));
    const promptRows = sectionTable(markdown, /AI에게 더 잘 요청하기/);

    if (courseId === 'deploy') {
      add('복습 · 약 5분', '배포 장애, 원인부터 좁히기', '바이브코딩 중 자주 만나는 증상입니다. 4강 12절 “문제 해결 질문 지도”를 문제로 바꿨습니다. 가장 먼저 의심할 원인을 고르세요.', troubleQuiz, PRACTICE_TAG, true);
    }
    add('복습 · 약 3분', '문제와 해결 기술 잇기', '이 강의에 나온 문제마다 그것을 해결한 기술을 고르세요.',
      body => matchQuiz(body, matchPairs, { left: '문제', right: '해결 기술' }), PRACTICE_TAG);
    add('복습 · 약 5분', '막연한 요청을 구체적으로 다듬기', '이 강의의 용어를 넣어 AI에게 보낼 요청을 직접 다시 써 보고, 모범 요청의 핵심 용어와 비교합니다.',
      body => promptLab(body, promptRows));
  }

  window.Practice = { mount, inline };
})();
