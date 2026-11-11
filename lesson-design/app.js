(() => {
  'use strict';

  // 강사용과 교육생용은 같은 코드를 씁니다. 강사 노트·정답·운영 계획은 notes.js(window.TEACHER)에만 있고,
  // 교육생용 페이지에는 notes.js를 아예 올리지 않습니다.
  const app = document.getElementById('app');
  const IS_TEACHER = app.dataset.edition === 'teacher';
  const TEACHER = IS_TEACHER && window.TEACHER ? window.TEACHER : { pages: [], notes: {} };
  const content = window.COURSE_CONTENT || {};

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (_) { /* 저장소를 쓸 수 없는 환경 */ } }
  };

  const LAB_NOTE = '모든 실습은 이 브라우저 안에서만 돌아가며, 입력한 내용은 어디에도 전송되지 않습니다.';
  const SITE_URL = 'https://www.jg-sobang.com/lesson-design/';
  // 인쇄 · PDF 마지막에 붙는 안내(화면에는 보이지 않음)
  const PRINT_FOOT = `<footer class="print-foot"><p>바로 해 보기와 퀴즈는 강의 사이트에서 해 보세요: ${SITE_URL}</p>
    <p>참고: ADDIE 모형, Mager의 ABCD 목표 진술, Bloom의 개정 교육목표 분류, Gagné의 9가지 수업 사태를 강의용으로 간추렸습니다.</p></footer>`;
  const PRINT_BUTTON = '<button type="button" class="print-button" data-print>PDF로 저장 · 인쇄</button>';
  const DOCS = [
    { id: 'guide', group: '강의 개요', kind: 'lecture', short: '00 강의 안내', file: '강의설계_00_강의안내.md' },
    { id: 'topic', group: '본 강의', kind: 'lecture', short: '01 강의 주제 선정', file: '강의설계_01_주제선정.md' },
    { id: 'goal', group: '본 강의', kind: 'lecture', short: '02 학습목표 쓰기', file: '강의설계_02_학습목표.md' },
    { id: 'design', group: '본 강의', kind: 'lecture', short: '03 내용 구성 · 시간 배분', file: '강의설계_03_내용구성_시간배분.md' },
    { id: 'method', group: '본 강의', kind: 'lecture', short: '04 교수방법 · 평가', file: '강의설계_04_교수방법_평가.md' },
    { id: 'plan', group: '본 강의', kind: 'lecture', short: '05 AI로 강의계획서 완성', file: '강의설계_05_AI로_강의계획서.md' },
    { id: 'board', group: '마무리', kind: 'board', short: '퀴즈 결과 공유판', title: '퀴즈 결과 공유판' }
  ];
  const ORDER = ['guide', 'topic', 'goal', 'design', 'method', 'plan', 'board'];
  const GROUPS = ['강의 개요', '본 강의', '마무리'];

  // 강의 본문 속 "바로 해 보기": [그 절의 제목 줄 앞부분, 활동 종류, 설정]. 활동은 그 절의 끝에 들어갑니다.
  const INLINE_AT = {
    topic: [['## 4. 주제 좁히기', 'topic-funnel'], ['## 6. AI로 주제 후보', 'topic-sort']],
    goal: [['## 3. 보이는 동사 쓰기', 'goal-judge'], ['## 4. 한 차시 목표는', 'abcd']],
    design: [['## 4. 시간 배분 예시', 'time-blocks']],
    method: [['## 2. 방법 고르기', 'align-match']],
    plan: [['## 4. AI 초안 검토', 'plan-builder']]
  };
  const byId = Object.fromEntries(DOCS.map(d => [d.id, d]));
  const byFile = Object.fromEntries(DOCS.filter(d => d.file).map(d => [d.file.replace(/\.md$/, ''), d]));
  const reading = ORDER.map(id => byId[id]).filter(Boolean);

  const side = document.getElementById('side');
  const nav = document.getElementById('nav');
  const doc = document.getElementById('doc');
  const crumb = document.getElementById('crumb');
  const pager = document.getElementById('pager');
  const topTitle = document.getElementById('topTitle');
  const search = document.getElementById('q');

  /* ───────── 마크다운 ───────── */
  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  }

  function slugify(text, used) {
    const base = text.replace(/[`*_"'“”‘’()[\]{}:,.!?·—–/]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'section';
    const count = used.get(base) || 0;
    used.set(base, count + 1);
    return count ? `${base}-${count + 1}` : base;
  }

  function inline(text) {
    let value = escapeHtml(text);
    const code = [];
    value = value.replace(/`([^`]+)`/g, (_, body) => `%%CODE${code.push(`<code>${body}</code>`) - 1}%%`);
    value = value.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
      const d = byFile[target.trim()];
      return d ? `<a href="#${d.id}">${label || d.short}</a>` : (label || target);
    });
    value = value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => href.startsWith('#') ? `<a href="${href}">${label}</a>` : `<a href="${href}" target="_blank" rel="noopener">${label}</a>`);
    value = value.replace(/~~(.+?)~~/g, '<del>$1</del>');
    value = value.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    value = value.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    value = value.replace(/%%CODE(\d+)%%/g, (_, i) => code[Number(i)]);
    return value;
  }

  const isTableDivider = line => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
  const tableCells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(s => s.trim());
  const CALLOUT_NAMES = { info: '안내', tip: '핵심 팁', question: '생각해 보기', abstract: '약어 풀이', example: '생활 속 비유', note: '참고', warning: '주의', danger: '주의', success: '완료' };

  function renderMarkdown(markdown, used = new Map()) {
    const lines = markdown.replace(/^﻿/, '').replace(/\r/g, '').split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i += 1; continue; }

      const fence = line.match(/^```\s*([\w-]*)/);
      if (fence) {
        const lang = fence[1] || 'text';
        const block = [];
        i += 1;
        while (i < lines.length && !lines[i].startsWith('```')) block.push(lines[i++]);
        i += 1;
        const source = escapeHtml(block.join('\n'));
        if (lang === 'mermaid') out.push(`<figure class="diagram" data-source="${source}"><pre class="mermaid-src">${source}</pre></figure>`);
        // text: 글자로 그린 설명 그림(복사할 코드가 아님) → 복사 버튼 없이
        else if (lang === 'text') out.push(`<figure class="text-figure"><pre>${source}</pre></figure>`);
        else out.push(`<div class="code-block"><button class="copy-button" type="button">복사</button><pre><code>${source}</code></pre></div>`);
        continue;
      }

      const heading = line.match(/^(#{1,4})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        const text = heading[2].replace(/\s+#+$/, '');
        out.push(`<h${level} id="${slugify(text, used)}">${inline(text)}</h${level}>`);
        i += 1;
        continue;
      }

      if (/^\s*(---+|___+|\*\*\*+)\s*$/.test(line)) { out.push('<hr>'); i += 1; continue; }

      if (line.startsWith('>')) {
        const quote = [];
        while (i < lines.length && lines[i].startsWith('>')) quote.push(lines[i++].replace(/^>\s?/, ''));
        const callout = quote[0].match(/^\[!(\w+)\]\s*(.*)$/);
        if (quote[0].startsWith('🧑‍🏫')) {
          quote[0] = quote[0].replace(/^🧑‍🏫\s*/, '');
          out.push(`<blockquote class="teacher"><p class="teacher-label">🧑‍🏫 강사 노트</p>${renderMarkdown(quote.join('\n'), used)}</blockquote>`);
        } else if (callout) {
          const type = callout[1].toLowerCase();
          out.push(`<aside class="callout ${type}"><p class="callout-title">${inline(callout[2] || CALLOUT_NAMES[type] || '참고')}</p>${renderMarkdown(quote.slice(1).join('\n'), used)}</aside>`);
        } else {
          out.push(`<blockquote>${renderMarkdown(quote.join('\n'), used)}</blockquote>`);
        }
        continue;
      }

      if (i + 1 < lines.length && line.includes('|') && isTableDivider(lines[i + 1])) {
        const head = tableCells(line);
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(tableCells(lines[i++]));
        out.push(`<div class="table-wrap"><table><thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
        continue;
      }

      const listMatch = line.match(/^\s*([-*+]|\d+\.)\s+(.+)$/);
      if (listMatch) {
        const ordered = /\d+\./.test(listMatch[1]);
        const items = [];
        while (i < lines.length) {
          // 번호 목록 항목 아래 들여 쓴 "- " 줄은 그 항목의 하위 목록
          const sub = ordered && items.length && lines[i].match(/^\s{2,}[-*+]\s+(.+)$/);
          if (sub) { items[items.length - 1].sub.push(sub[1]); i += 1; continue; }
          const m = ordered ? lines[i].match(/^\s*\d+\.\s+(.+)$/) : lines[i].match(/^\s*[-*+]\s+(.+)$/);
          if (!m) break;
          items.push({ text: m[1], sub: [] });
          i += 1;
        }
        const tag = ordered ? 'ol' : 'ul';
        out.push(`<${tag}>${items.map(item => `<li>${inline(item.text)}${item.sub.length ? `<ul>${item.sub.map(t => `<li>${inline(t)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</${tag}>`);
        continue;
      }

      const paragraph = [line.trim()];
      i += 1;
      while (i < lines.length && lines[i].trim() && !/^(#{1,4})\s+/.test(lines[i]) && !/^```/.test(lines[i]) && !/^>/.test(lines[i]) && !/^\s*([-*+]|\d+\.)\s+/.test(lines[i]) && !/^\s*(---+|___+)\s*$/.test(lines[i]) && !(i + 1 < lines.length && lines[i].includes('|') && isTableDivider(lines[i + 1]))) {
        paragraph.push(lines[i].trim());
        i += 1;
      }
      out.push(`<p>${inline(paragraph.join(' '))}</p>`);
    }
    return out.join('\n');
  }

  const stripMarkdown = text => text.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`|[\]()!-]/g, ' ').replace(/\s+/g, ' ').trim();

  // 강사 노트를 원문 제목 바로 아래에 끼워 넣습니다. at: 'top'(제목 아래) 또는 그 줄로 시작하는 원문 제목.
  function noteLines(md) {
    return ['', ...md.trim().split('\n').map((l, i) => `> ${i === 0 ? '🧑‍🏫 ' : ''}${l}`), ''];
  }
  function withNotes(id, markdown) {
    const notes = TEACHER.notes[id] || [];
    if (!notes.length) return markdown;
    const lines = markdown.replace(/\r/g, '').split('\n');
    const out = [];
    let placedTop = false;
    lines.forEach(line => {
      out.push(line);
      if (!placedTop && /^#\s/.test(line)) {
        placedTop = true;
        notes.filter(n => n.at === 'top').forEach(n => out.push(...noteLines(n.md)));
      }
      if (/^#{2,4}\s/.test(line)) notes.filter(n => n.at !== 'top' && line.startsWith(n.at)).forEach(n => out.push(...noteLines(n.md)));
    });
    return out.join('\n');
  }

  function docText(d) {
    if (d.kind === 'lecture') return stripMarkdown(withNotes(d.id, content[d.file] || ''));
    if (d.kind === 'teacher') return stripMarkdown(d.body);
    return stripMarkdown(`${d.title} ${d.lede || ''} ${(TEACHER.notes[d.id] || []).map(n => n.md).join(' ')}`);
  }

  /* ───────── 목차 · 검색 ───────── */
  function current() {
    const [id, ...rest] = location.hash.replace(/^#/, '').split('/');
    return { d: byId[id] || reading[0], anchor: decodeURIComponent(rest.join('/')) };
  }

  function renderNav() {
    const active = current().d.id;
    const q = search.value.trim().toLocaleLowerCase('ko');
    const counts = {};
    if (q.length >= 2) {
      DOCS.forEach(d => {
        const text = docText(d).toLocaleLowerCase('ko');
        let n = 0;
        let at = text.indexOf(q);
        while (at >= 0) { n += 1; at = text.indexOf(q, at + q.length); }
        if (n) counts[d.id] = n;
      });
    }
    const filtering = q.length >= 2;
    const html = GROUPS.map(group => {
      const items = DOCS.filter(d => d.group === group && (!filtering || counts[d.id]));
      if (!items.length) return '';
      return `<div class="group"><h3>${group}</h3>${items.map(d => `<a href="#${d.id}" class="${d.kind === 'teacher' ? 'teacher-only' : ''}" ${d.id === active ? 'aria-current="page"' : ''}>${d.short}${counts[d.id] ? `<span class="hit">${counts[d.id]}곳</span>` : ''}</a>`).join('')}</div>`;
    }).join('');
    nav.innerHTML = html || '<p class="empty-search">찾는 말이 들어 있는 자료가 없습니다.</p>';
  }

  /* ───────── 페이지 ───────── */
  function neighbours(d) {
    const i = reading.indexOf(d);
    return { prev: reading[i - 1], next: reading[i + 1] };
  }

  // 강의 본문의 해당 절 끝(다음 같은 단계 이상의 제목, 또는 그 앞의 구분선 바로 앞)에 "바로 해 보기"를 넣습니다.
  function placeInline(id, markdown) {
    const list = INLINE_AT[id];
    if (!list || !window.Practice || !window.Practice.inline) return;
    const headings = [...doc.querySelectorAll('h2, h3')];
    const isStop = (el, level) => el && /^H[1-6]$/.test(el.tagName) && Number(el.tagName[1]) <= level;
    const lastSlot = new Map();
    const notesShown = new Set();
    list.forEach(([at, kind, extra = {}]) => {
      const level = at.match(/^#+/)[0].length;
      const text = at.replace(/^#+\s*/, '');
      const heading = headings.find(el => el.tagName === `H${level}` && el.textContent.startsWith(text));
      if (!heading) return;
      let end = heading.nextElementSibling;
      while (end && !isStop(end, level) && !(end.tagName === 'HR' && isStop(end.nextElementSibling, level)) && !end.classList.contains('quiz')) end = end.nextElementSibling;
      const slot = document.createElement('div');
      slot.className = 'inline-slot';
      const prev = lastSlot.get(heading);
      if (prev) prev.after(slot); else if (end) end.before(slot); else doc.appendChild(slot);
      lastSlot.set(heading, slot);
      // 강사용: 같은 종류의 진행 노트는 그 강의에서 처음 나올 때 한 번만 보여 줍니다.
      const note = TEACHER.notes[`inline:${kind}`];
      const noteHtml = note && !notesShown.has(kind) ? note.map(n => renderMarkdown(noteLines(n.md).join('\n'))).join('') : '';
      notesShown.add(kind);
      try {
        window.Practice.inline(kind, slot, { ...extra, markdown, teacher: IS_TEACHER, noteHtml });
      } catch (_) {
        slot.innerHTML = '<div class="error">실습을 불러오지 못했습니다. 페이지를 새로 고쳐 주세요.</div>';
      }
    });
  }

  /* ───────── 이번 2시간 수업: 건너뛸 절 · 강사용 진행 카드 ───────── */
  // 이번 수업에서 건너뛸 절(그 제목부터 같은 단계의 다음 제목 전까지). 강사용: 사선 무늬 · 취소선 · “⏭ 이번엔 건너뜀”,
  // 교육생용: 제목에 “📖 수업 뒤 읽을거리” 표시만. 진행 카드(⏱)는 강사용 notes.js 의 scenario.
  const SKIP_THIS_CLASS = {};


  function markLessonPlan(id) {
    const headings = [...doc.querySelectorAll('h1, h2, h3, h4')];
    const isHeading = el => /^H[1-6]$/.test(el.tagName);
    const find = at => {
      const level = at.match(/^#+/)[0].length;
      const text = at.replace(/^#+\s*/, '');
      return headings.find(el => el.tagName === `H${level}` && el.textContent.startsWith(text));
    };
    (SKIP_THIS_CLASS[id] || []).forEach(at => {
      const heading = find(at);
      if (!heading) return;
      const level = Number(heading.tagName[1]);
      const range = [];
      for (let el = heading.nextElementSibling; el && !(isHeading(el) && Number(el.tagName[1]) <= level) && !el.matches('.quiz, .print-foot'); el = el.nextElementSibling) range.push(el);
      if (!IS_TEACHER) {
        // 교육생용: 제목 한 줄만 보이게 접어 두고, 누르면 펼침(인쇄 · 링크로 갈 때는 자동으로 펼침)
        heading.insertAdjacentHTML('beforeend', ' <span class="later-badge">📖 수업 뒤 읽을거리</span>');
        const fold = document.createElement('details');
        fold.className = 'later-fold';
        const summary = document.createElement('summary');
        heading.before(fold);
        fold.append(summary);
        summary.append(heading);
        fold.append(...range);
        return;
      }
      heading.classList.add('skipped');
      heading.insertAdjacentHTML('beforeend', ' <span class="skip-badge teacher">⏭ 이번엔 건너뜀</span>');
      range.forEach(el => el.classList.add('skipped'));
    });
    if (!IS_TEACHER) return;
    // 접혀 있는 선택 활동(더 해 보기)도 이번에는 건너뜀
    doc.querySelectorAll('.inline-slot').forEach(slot => { if (slot.querySelector('details.optional')) slot.classList.add('skipped'); });
    (TEACHER.scenario?.[id] || []).forEach(cue => {
      const html = `<aside class="cue teacher"><p class="cue-time">⏱ ${cue.time}${cue.min ? ` · ${cue.min}분` : ''}</p>${renderMarkdown(cue.md)}${cue.cut ? `<p class="cue-cut">✂ 밀리면: ${inline(cue.cut)}</p>` : ''}</aside>`;
      if (cue.at === 'top') {
        const warmup = doc.querySelector('.warmup');
        if (warmup) warmup.insertAdjacentHTML('beforebegin', html);
        else (doc.querySelector('.print-button') || doc.querySelector('.docnav')).insertAdjacentHTML('afterend', html);
      } else if (cue.at === 'quiz') {
        doc.querySelector('#quiz')?.insertAdjacentHTML('beforebegin', html);
      } else {
        find(cue.at)?.insertAdjacentHTML('afterend', html);
      }
    });
  }

  let stopBoard = () => {};
  function render() {
    const { d, anchor } = current();
    const { prev, next } = neighbours(d);
    stopBoard();
    stopBoard = () => {};
    renderNav();
    topTitle.textContent = d.short;
    const docnav = `<p class="docnav">${prev ? `← <a href="#${prev.id}">${prev.short}</a>` : ''}${prev && next ? ' | ' : ''}${next ? `다음 → <a href="#${next.id}">${next.short}</a>` : ''}</p>`;

    if (d.kind === 'lecture') {
      const markdown = content[d.file];
      if (!markdown) { doc.innerHTML = '<div class="error">강의 원문을 찾지 못했습니다. 페이지를 새로 고쳐 주세요.</div>'; return; }
      const used = new Map();
      const full = withNotes(d.id, markdown);
      const title = (full.match(/^#\s+(.+)$/m) || [, d.short])[1];
      crumb.textContent = `${d.group} · ${d.file}`;
      // 생각해 보기(점수 없음) → 본문 → 강의 후 퀴즈
      const quiz = window.QuizUI && window.QUIZ && window.QUIZ[d.id];
      doc.innerHTML = `<h1>${inline(title)}</h1>${docnav}${PRINT_BUTTON}${quiz ? window.QuizUI.warmup(d.id) : ''}${renderMarkdown(full.replace(/^#\s+.+$/m, ''), used)}${quiz ? '<section class="quiz" id="quiz"></section>' : ''}${PRINT_FOOT}`;
      placeInline(d.id, markdown);
      markLessonPlan(d.id);
      if (quiz) window.QuizUI.mountQuiz(document.getElementById('quiz'), d.id, { teacher: IS_TEACHER });
    } else if (d.kind === 'board') {
      crumb.textContent = `${d.group} · 강의 후 퀴즈 결과`;
      doc.innerHTML = `<h1>${d.title}</h1>${docnav}<div id="board"></div>`;
      if (window.QuizUI) stopBoard = window.QuizUI.mountBoard(document.getElementById('board'), { teacher: IS_TEACHER });
      markLessonPlan(d.id);
    } else if (d.kind === 'teacher') {
      crumb.textContent = `${d.group} · 강사 전용`;
      const title = (d.body.match(/^#\s+(.+)$/m) || [, d.short])[1];
      doc.innerHTML = `<h1>${inline(title)}</h1>${docnav}${PRINT_BUTTON}${renderMarkdown(d.body.replace(/^#\s+.+$/m, ''))}`;
      markLessonPlan(d.id);
    } else {
      const course = byId[d.course];
      crumb.textContent = `${d.group} · 관련 강의 ${course.short}`;
      const notes = (TEACHER.notes[d.id] || []).map(n => renderMarkdown(noteLines(n.md).join('\n'))).join('');
      doc.innerHTML = `<h1>${d.title}</h1>${docnav}<p class="lede">${d.lede}</p><p class="docnav">${LAB_NOTE} 관련 강의: <a href="#${course.id}">${course.short}</a></p>${notes}<div id="labs"></div>`;
      try {
        window.Practice.mount(d.course, content[course.file] || '', document.getElementById('labs'), { teacher: IS_TEACHER });
      } catch (_) {
        document.getElementById('labs').innerHTML = '<div class="error">실습을 불러오지 못했습니다. 페이지를 새로 고쳐 주세요.</div>';
      }
    }

    pager.innerHTML = `${prev ? `<a class="prev" href="#${prev.id}"><span>← 이전</span>${prev.short}</a>` : ''}${next ? `<a class="next" href="#${next.id}"><span>다음 →</span>${next.short}</a>` : ''}`;
    doc.querySelectorAll('.copy-button').forEach(b => b.addEventListener('click', copyBlock));
    doc.querySelector('[data-print]')?.addEventListener('click', printPage);
    side.classList.remove('open');
    // 흐름도가 그려지면 위쪽 높이가 바뀌므로, 제목 위치로 바로 이동한 뒤 그림이 끝나면 한 번 더 맞춥니다.
    const jump = () => {
      const target = anchor && document.getElementById(anchor);
      // 접혀 있는 “수업 뒤 읽을거리” 안의 제목이면 펼친 뒤 이동
      for (let fold = target && target.closest('details'); fold; fold = fold.parentElement.closest('details')) fold.open = true;
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
      else if (!anchor) window.scrollTo({ top: 0, behavior: 'instant' });
    };
    jump();
    renderDiagrams().then(() => { if (anchor && current().d === d) jump(); });
  }

  /* ───────── 흐름도 ───────── */
  const isDark = () => {
    const theme = document.documentElement.dataset.theme;
    if (theme) return theme === 'dark';
    return Boolean(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  };
  let diagramRun = 0;
  async function renderDiagrams() {
    const figures = [...doc.querySelectorAll('figure.diagram')];
    if (!figures.length || !window.mermaid) return;
    const run = ++diagramRun;
    try { window.mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: isDark() ? 'dark' : 'neutral' }); } catch (_) { return; }
    for (let i = 0; i < figures.length; i += 1) {
      const id = `diagram-${run}-${i}`;
      try {
        const { svg } = await window.mermaid.render(id, figures[i].dataset.source);
        if (run !== diagramRun || !figures[i].isConnected) return;
        figures[i].innerHTML = svg;
        // 강의 모드에서 흐름도를 화면 높이에 맞출 때, 평소 화면보다 작아지지 않게 하는 기준(styles.css)
        const box = figures[i].querySelector('svg')?.viewBox.baseVal;
        if (box && box.height) figures[i].style.setProperty('--natural-h', `${box.height}px`);
      } catch (_) {
        document.getElementById(id)?.remove();
        document.getElementById(`d${id}`)?.remove();
      }
    }
  }

  /* ───────── PDF로 저장 · 인쇄 ───────── */
  // 어두운 화면에서는 흐름도를 밝은 색으로 다시 그린 뒤 인쇄하고, 인쇄 창이 닫히면 되돌립니다.
  // 인쇄 · PDF에는 접힌 “수업 뒤 읽을거리”도 모두 펼쳐 넣고, 인쇄가 끝나면 원래대로
  let foldedForPrint = [];
  window.addEventListener('beforeprint', () => {
    foldedForPrint = [...doc.querySelectorAll('details.later-fold:not([open])')];
    foldedForPrint.forEach(fold => { fold.open = true; });
  });
  window.addEventListener('afterprint', () => { foldedForPrint.forEach(fold => { fold.open = false; }); foldedForPrint = []; });

  async function printPage() {
    const root = document.documentElement;
    const before = root.dataset.theme;
    if (isDark()) {
      root.dataset.theme = 'light';
      await renderDiagrams();
      window.addEventListener('afterprint', () => {
        if (before) root.dataset.theme = before; else delete root.dataset.theme;
        renderDiagrams();
      }, { once: true });
    }
    try { window.print(); } catch (_) { /* 인쇄가 막힌 환경 */ }
  }

  async function copyBlock(event) {
    const button = event.currentTarget;
    const text = button.parentElement.querySelector('code').textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = '복사됨';
      setTimeout(() => { button.textContent = '복사'; }, 1300);
    } catch (_) {
      const range = document.createRange();
      range.selectNodeContents(button.parentElement.querySelector('code'));
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = 'Ctrl+C로 복사';
    }
  }

  /* ───────── 연결 ───────── */
  const toggle = document.getElementById('teacher');
  if (toggle) {
    toggle.checked = store.get('ld-teacher-notes') !== 'off';
    document.body.classList.toggle('hide-teacher', !toggle.checked);
    toggle.addEventListener('change', () => {
      document.body.classList.toggle('hide-teacher', !toggle.checked);
      store.set('ld-teacher-notes', toggle.checked ? 'on' : 'off');
    });
  }
  /* ───────── 강의 모드: 목차를 숨기고 본문을 크게 (프로젝터용) ───────── */
  // 화면 전체 전환은 막힌 곳(아티팩트 등)에서는 조용히 넘어가고, 목차 숨기기와 확대는 그대로 동작합니다.
  const lectureButton = document.createElement('button');
  lectureButton.type = 'button';
  lectureButton.className = 'lecture-toggle';
  document.body.append(lectureButton);
  let ownFullscreen = false;
  function setLecture(on, { fullscreen = false } = {}) {
    app.classList.toggle('lecture', on);
    lectureButton.textContent = on ? '강의 모드 끄기' : '강의 모드';
    lectureButton.title = on ? '원래 화면으로 (P 또는 Esc, 화면 전체일 때는 Esc 두 번)' : '목차를 숨기고 글자를 크게 (P)';
    lectureButton.setAttribute('aria-pressed', on);
    store.set('ld-lecture', on ? '1' : '0');
    if (on && fullscreen && document.fullscreenEnabled && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => { ownFullscreen = true; }, () => {});
    }
    if (!on && ownFullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  lectureButton.addEventListener('click', () => setLecture(!app.classList.contains('lecture'), { fullscreen: true }));
  // 화면 전체가 풀려도(Esc, 다른 탭으로 이동 등) 강의 모드는 그대로 둡니다. 끄려면 Esc를 한 번 더 또는 P.
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) ownFullscreen = false;
  });
  setLecture(store.get('ld-lecture') === '1');

  search.addEventListener('input', renderNav);
  document.getElementById('menu').addEventListener('click', () => side.classList.toggle('open'));
  document.addEventListener('keydown', event => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if (event.key === 'Escape') {
      if (side.classList.contains('open')) side.classList.remove('open');
      else if (app.classList.contains('lecture') && !typing) setLecture(false);
    }
    if (event.key === '/' && !typing) { event.preventDefault(); search.focus(); }
    // 한글 입력 상태에서도 되도록 글자 대신 키 위치(KeyP)로 봅니다.
    if (event.code === 'KeyP' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
      setLecture(!app.classList.contains('lecture'), { fullscreen: true });
    }
  });
  window.addEventListener('hashchange', render);
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', renderDiagrams);
  render();
})();
