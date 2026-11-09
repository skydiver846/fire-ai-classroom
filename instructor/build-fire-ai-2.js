// 2차 교안(fire-ai-2/)을 1차 교안(fire-ai/)과 같은 모양으로 만듭니다: 남색 머리띠, 왼쪽 목차, 모듈 머리(번호·진행 막대),
// 절마다 칩 띠, "✋ 실습" 상자, 복사 버튼, 이전/다음 단추. 스타일·동작은 fire-ai-2/assets/site.css, site.js (1차 것을 복사).
// 원본: instructor/2차-사전학습.md, instructor/2차-실습지.md(단계별로 나눠 1~4교시 페이지), instructor/contest.part.html
// 사용: 빈 폴더에서 npm i marked@12.0.2 → NODE_PATH=그폴더/node_modules node instructor/build-fire-ai-2.js
const fs = require('fs'), path = require('path'), { marked } = require('marked');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'fire-ai-2');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

const TITLE = '생성형 AI 활용능력 향상교육 2차';
const WHEN = '11. 18.(수) 13:00~17:00 · 교육훈련관 2층 정보화교육장';

// ── 실습지를 "## " 절 단위로 나누기
const work = read('2차-실습지.md').replace(/^# .*\n/, '');
const parts = work.split(/\n(?=## )/);
const intro = parts[0];                                     // 맨 앞 안내 인용
const sec = name => parts.filter(p => p.startsWith('## ' + name));
const join = list => list.join('\n');

// ── 페이지 목록 (목차·이전/다음 순서)
const PAGES = [
  { file: 'index.html', nav: '처음 화면' },
  { file: 'prework.html', no: '사전', nav: '사전 학습', eyebrow: '수업 전 · 11. 16.(월)~17.(화)', title: '2차 교육 사전 학습',
    md: read('2차-사전학습.md').replace(/^# .*\n/, '') },
  { file: 'flow.html', no: '▶', nav: '오늘의 흐름도 · 식당 지도', eyebrow: '1교시 시작 전 · 설명 ①', title: '오늘 만드는 것: 흐름도와 식당 지도',
    md: intro + '\n' + join(sec('오늘 만드는 것')) + '\n' + join(sec('시간표')) },
  { file: 's1.html', no: '1', nav: '1교시 · PRD 쓰기', eyebrow: '1교시 · 13:00~13:50', title: 'PRD 쓰기',
    md: join(sec('단계 0')) + '\n' + join(sec('단계 1')) },
  { file: 's2.html', no: '2', nav: '2교시 · v0.1 만들기 · 배포', eyebrow: '2교시 · 14:00~14:50', title: '화면 시안 v0.1 만들고 배포하기',
    md: join(sec('단계 2')) + '\n' + join(sec('단계 3')) + '\n' + join(sec('단계 4')) },
  { file: 's3.html', no: '3', nav: '3교시 · 데이터 연동 · 검증', eyebrow: '3교시 · 15:00~15:50 · 설명 ② 열쇠와 규칙 + 설치 시연', title: 'v0.2 데이터 연동(필수)과 검증',
    md: join(sec('단계 5')) + '\n' + join(sec('단계 6')) + '\n' + join(sec('단계 7')) },
  { file: 's4.html', no: '4', nav: '4교시 · 짝 검증 · 제출 · 마무리', eyebrow: '4교시 · 16:00~16:50', title: '짝 검증, 최종 제출, 과정 마무리',
    md: join(sec('단계 8')) + '\n' + join(sec('단계 9')) + '\n' + join(sec('심사 기준')) + '\n' + join(sec('과정을 마치며')) },
  { file: 'contest.html', no: '★', nav: '공모 · 투표', eyebrow: '1교시 등록 · 16:20 제출 마감 · 투표 · 결과 공개', title: '공모 · 투표',
    html: read('contest.part.html'), script: 'contest.js' },
];
const CONTENT = PAGES.filter(p => p.file !== 'index.html');

// ── 마크다운 → 1차와 같은 본문 HTML
function render(md) {
  // "## 단계 …(N분)" 과 "## 🛠 …" 절은 "✋ 실습" 상자로 감싼다 (1차의 section.do)
  // 인용 상자 안의 줄(> 🎯 목표 / > 📌 복습 / > ⏭ 끝나면 …)이 한 문단으로 붙지 않게 줄마다 나눈다
  md = md.replace(/^(>[ \t]*\S[^\n]*)\n(?=>[ \t]*\S)/gm, '$1\n>\n');
  const chunks = md.split(/\n(?=## )/);
  return chunks.map(c => {
    let h = marked.parse(c, { gfm: true });
    h = h.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>')
         .replace(/<input disabled="" type="checkbox">/g, '<input type="checkbox">')
         .replace(/<a href="(https?:)/g, '<a target="_blank" rel="noopener" href="$1');
    // 실습 절: 교안의 "단계 N", 사전 학습의 "① 계정 준비". 제목 끝 "(…N분)"의 N을 시간으로
    const head = (c.match(/^## [^\n]*/) || [''])[0];
    const min = (head.match(/(\d+)분\)\s*$/) || [])[1];
    if (min && /^## (단계 \d+\.|①)/.test(head)) h = `<section class="do do-h2"><p class="do-tag"><span>✋ 실습</span> 약 ${min}분 · 혼자 해 보는 부분</p>${h}</section>`;
    return h;
  }).join('\n');
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function nav(current) {
  const a = p => `<a href="${p.file}"${p.file === current ? ' aria-current="page"' : ''}>${p.no ? `<span class="n">${esc(p.no)}</span>` : ''}${esc(p.nav)}</a>`;
  const by = f => PAGES.find(p => p.file === f);
  return `<nav aria-label="목차">
    <div class="group">${a(by('index.html'))}${a(by('prework.html'))}</div>
    <div class="group"><h3>수업 (11. 18.)</h3>${['flow.html', 's1.html', 's2.html', 's3.html', 's4.html'].map(f => a(by(f))).join('')}</div>
    <div class="group"><h3>공모</h3>${a(by('contest.html'))}</div>
    <div class="group"><h3>자료</h3><a href="check.html">2차 접속 점검</a><a href="../fire-ai/">1차 교안</a><a href="../ai-literacy/">웹 서비스의 뿌리</a></div>
  </nav>`;
}

function page(p, body) {
  const i = PAGES.indexOf(p), prev = PAGES[i - 1], next = PAGES[i + 1];
  const k = CONTENT.indexOf(p) + 1;
  const hero = p.no ? `<header class="hero"><span class="hero-no">${esc(p.no)}</span><div class="hero-body"><p class="eyebrow">${esc(p.eyebrow)}</p><h1>${esc(p.title)}</h1><div class="hero-prog"><div class="prog" aria-label="전체 ${CONTENT.length}개 중 ${k}번째"><span style="width:${(k / CONTENT.length * 100).toFixed(1)}%"></span></div><span class="prog-t">${k} / ${CONTENT.length}</span></div></div></header>\n` : '';
  const pager = p.file === 'index.html' ? '' : `<div class="pager">${prev ? `<a class="prev" href="${prev.file}"><span>← 이전</span>${esc(prev.title || prev.nav)}</a>` : ''}${next ? `<a class="next" href="${next.file}"><span>다음 →</span>${esc(next.title || next.nav)}</a>` : ''}</div>`;
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(p.title || '처음 화면')} · ${TITLE}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;600;700&family=Nanum+Gothic+Coding&display=swap">
<link rel="stylesheet" href="assets/site.css">
</head>
<body>
<header class="masthead">
  <button type="button" id="menu" aria-label="목차 열기">☰</button>
  <a class="brand" href="index.html"><span class="mark" aria-hidden="true">AI</span><span class="brand-t"><small>소방학교 특별교육 · 과정 마무리</small><strong>${TITLE}</strong></span></a>
  <span class="when">${WHEN}</span>
</header>
<div class="app">
  <aside class="side" id="side">
    ${nav(p.file)}
  </aside>
  <main>
    <article>${hero}${body}</article>
    ${pager}
  </main>
</div>
<script src="assets/site.js"></script>
<script src="../pen/pen-core.js" data-launcher></script>
${p.script ? `<script src="${p.script}"></script>\n` : ''}</body>
</html>
`;
}

// ── 처음 화면 (1차 index 와 같은 짜임: 소개 → 모듈 목록 → 바로가기 → 준비물)
const mod = (f, time) => { const p = PAGES.find(x => x.file === f); return `<li><a href="${f}"><span class="no">${esc(p.no)}</span><span class="t">${esc(p.title)}</span><span class="time">${esc(time)}</span></a></li>`; };
const tile = (name, url, note) => `<a class="tile" href="${url}" target="_blank" rel="noopener"><b>${name}</b><span>${url.replace(/^https:\/\//, '').replace(/\/$/, '')}</span><small>${note}</small></a>`;
const home = `
  <h1>${TITLE} · 과정 마무리</h1>
  <p class="lead"><b>1차에서 따라 해 본 흐름을, 이번에는 혼자 끝까지.</b> 1차 교육생이 각자 업무 도구 하나를 PRD부터 배포까지 혼자 만들고, 여러 사람이 함께 쓰는 장부(Firebase)나 공공데이터 API를 <b>하나 이상 반드시 연동</b>한 뒤, 서로의 작품을 써 보고 투표하며 과정을 마무리합니다. 1등에게는 교수부장님 부상을 드립니다.</p>
  <p class="note"><b>11. 18.(수) 13:00~17:00</b> · 교육훈련관 2층 정보화교육장 · 1차 교육생 대상 (별도 신청 없음)</p>
  <h2>수업 전 · 사전 학습</h2>
  <ol class="mods">${mod('prework.html', '11. 16.~17.')}</ol>
  <p><a class="btn" href="prework.html">사전 학습 보기</a> 계정 준비(공공데이터 활용신청 포함), 웹 서비스의 뿌리 핵심 읽기, 데이터베이스 · 공공데이터 API 개념 한 장. 약 1시간 15분. 설치 · 연결은 당일 3교시에 함께 합니다.</p>
  <h2>수업 (4교시) · 혼자 해 보는 날</h2>
  <ol class="mods">${mod('flow.html', '시작 전 10분')}${mod('s1.html', '13:00')}${mod('s2.html', '14:00')}${mod('s3.html', '15:00')}${mod('s4.html', '16:00')}</ol>
  <p class="note">오늘은 강사가 시범을 보이지 않습니다. <b>이 교안이 교재</b>입니다. 막히면 ① 각 단계의 "막히면" 표 → ② 옆 사람 → ③ 손 들기 순서로 풉니다.</p>
  <h2>공모 · 투표</h2>
  <ol class="mods">${mod('contest.html', '16:20 마감')}</ol>
  <p class="note">1교시 시작할 때 참가 등록, 2교시 끝에 v0.1 주소 제출, 16:20까지 최종 제출 → 모두의 작품을 함께 보고 1인 3표 → 결과 공개.</p>
  <h2>바로가기</h2>
  <div class="tiles">${tile('Claude Code', 'https://claude.ai/code', '단계 2~9')}${tile('GitHub', 'https://github.com/', '저장소 · 결재')}${tile('Vercel', 'https://vercel.com/', '배포 · 미리보기')}${tile('Firebase 콘솔', 'https://console.firebase.google.com/', 'DB 트랙')}${tile('공공데이터포털', 'https://www.data.go.kr/', 'API 트랙')}${tile('웹 서비스의 뿌리', 'https://www.jg-sobang.com/ai-literacy/', '사전 학습')}</div>
  <h2>준비물</h2>
  <ul><li><b>사전 학습</b>: 11. 16.(월)~17.(화) — <a href="prework.html">사전 학습</a></li><li>본인 휴대폰 (문자 인증, 만든 화면 시험)</li><li>비밀번호 수첩</li><li><code>공공데이터 메모.txt</code> (서비스 키 · End Point · 요청 변수)</li><li>당일 만들 주제 한 줄</li></ul>
  <p class="note">체크박스 표시는 이 PC의 브라우저에만 저장됩니다.</p>
  <script>
    // 예전 한 장짜리 교안 주소(#contest 등)로 들어오면 새 페이지로 보냅니다
    (function () { var m = { contest: 'contest.html', prework: 'prework.html', workbook: 'flow.html' }; var h = location.hash.slice(1); if (m[h]) location.replace(m[h]); })();
  </script>`;

for (const p of PAGES) {
  const body = p.file === 'index.html' ? home : p.html ? p.html : render(p.md);
  fs.writeFileSync(path.join(OUT, p.file), page(p, body));
}
console.log('fire-ai-2/', PAGES.map(p => p.file).join(', '), '생성');
