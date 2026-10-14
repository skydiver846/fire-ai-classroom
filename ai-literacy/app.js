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
  const DOCS = [
    { id: 'guide', group: '강의 개요', kind: 'lecture', short: '00 강의 안내 · 약어 사전', file: 'AI리터러시_00_강의안내_약어사전.md' },
    ...TEACHER.pages.map(page => ({ ...page, group: '강의 개요', kind: 'teacher' })),
    { id: 'frontend', group: '본 강의', kind: 'lecture', short: '01 프론트엔드', file: 'AI리터러시_01_프론트엔드.md' },
    { id: 'backend', group: '본 강의', kind: 'lecture', short: '02 백엔드', file: 'AI리터러시_02_백엔드.md' },
    { id: 'database', group: '본 강의', kind: 'lecture', short: '03 데이터베이스 · 스토리지', file: 'AI리터러시_03_데이터베이스_스토리지.md' },
    { id: 'deploy', group: '본 강의', kind: 'lecture', short: '04 웹서버 · 배포', file: 'AI리터러시_04_웹서버_배포.md' },
    { id: 'lab-guide', group: '실습', kind: 'lab', course: 'guide', short: '실습 00 · 식당 비유 맞추기', title: '실습 00. 식당 비유 맞추기',
      lede: '4개 강의를 하나로 꿰는 식당 비유를 먼저 머리에 넣습니다. 웹 서비스의 각 부분이 식당의 무엇에 해당하는지 골라 보세요.' },
    { id: 'lab-frontend', group: '실습', kind: 'lab', course: 'frontend', short: '실습 01 · HTML·CSS·JS 놀이터', title: '실습 01. HTML · CSS · JavaScript 놀이터',
      lede: '주문 태블릿 화면을 HTML → CSS → JavaScript → 상태 중심 순서로 직접 고쳐 보며 1강의 흐름을 손으로 확인합니다.' },
    { id: 'lab-backend', group: '실습', kind: 'lab', course: 'backend', short: '실습 02 · 로그인과 계좌 이체', title: '실습 02. 로그인 유지와 트랜잭션',
      lede: '세션·쿠키로 로그인이 유지되는 모습과, 트랜잭션이 돈을 지키는 모습을 시뮬레이터로 직접 만들어 봅니다.' },
    { id: 'lab-database', group: '실습', kind: 'lab', course: 'database', short: '실습 03 · SQL 실습실', title: '실습 03. SQL 실습실',
      lede: '브라우저 안의 작은 DB에 SQL로 질문합니다. 표 보기부터 JOIN, 정규화, DB와 스토리지의 역할 분리까지 6개 과제를 풉니다.' },
    { id: 'lab-deploy', group: '실습', kind: 'lab', course: 'deploy', short: '실습 04 · DNS와 장애 진단', title: '실습 04. DNS 길찾기와 장애 진단',
      lede: '도메인 주소를 찾아가는 길과 TTL 캐시를 시뮬레이터로 확인하고, 배포 중 자주 만나는 증상의 원인을 짚어 봅니다.' }
  ];
  const ORDER = ['guide', ...TEACHER.pages.map(p => p.id), 'lab-guide', 'frontend', 'lab-frontend', 'backend', 'lab-backend', 'database', 'lab-database', 'deploy', 'lab-deploy'];
  const GROUPS = ['강의 개요', '본 강의', '실습'];
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
          const m = ordered ? lines[i].match(/^\s*\d+\.\s+(.+)$/) : lines[i].match(/^\s*[-*+]\s+(.+)$/);
          if (!m) break;
          items.push(m[1]);
          i += 1;
        }
        const tag = ordered ? 'ol' : 'ul';
        out.push(`<${tag}>${items.map(item => `<li>${inline(item)}</li>`).join('')}</${tag}>`);
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
    return stripMarkdown(`${d.title} ${d.lede} ${(TEACHER.notes[d.id] || []).map(n => n.md).join(' ')}`);
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

  function render() {
    const { d, anchor } = current();
    const { prev, next } = neighbours(d);
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
      doc.innerHTML = `<h1>${inline(title)}</h1>${docnav}${renderMarkdown(full.replace(/^#\s+.+$/m, ''), used)}`;
    } else if (d.kind === 'teacher') {
      crumb.textContent = `${d.group} · 강사 전용`;
      const title = (d.body.match(/^#\s+(.+)$/m) || [, d.short])[1];
      doc.innerHTML = `<h1>${inline(title)}</h1>${docnav}${renderMarkdown(d.body.replace(/^#\s+.+$/m, ''))}`;
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
    renderDiagrams();
    side.classList.remove('open');
    requestAnimationFrame(() => {
      const target = anchor && document.getElementById(anchor);
      if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
    });
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
      } catch (_) {
        document.getElementById(id)?.remove();
        document.getElementById(`d${id}`)?.remove();
      }
    }
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
    toggle.checked = store.get('ai-literacy-teacher-notes') !== 'off';
    document.body.classList.toggle('hide-teacher', !toggle.checked);
    toggle.addEventListener('change', () => {
      document.body.classList.toggle('hide-teacher', !toggle.checked);
      store.set('ai-literacy-teacher-notes', toggle.checked ? 'on' : 'off');
    });
  }
  search.addEventListener('input', renderNav);
  document.getElementById('menu').addEventListener('click', () => side.classList.toggle('open'));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') side.classList.remove('open');
    if (event.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { event.preventDefault(); search.focus(); }
  });
  window.addEventListener('hashchange', render);
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', renderDiagrams);
  render();
})();
