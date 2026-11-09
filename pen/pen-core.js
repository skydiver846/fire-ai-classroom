/* 강사 판서 도구 (줌잇처럼 어느 화면 위에나 그리기)
 * 한 파일로 세 곳에서 씁니다.
 *   1) 크롬 확장 프로그램: 아이콘 클릭 또는 Alt+Shift+D 로 켜고 끔
 *   2) 즐겨찾기 버튼(북마클릿): 누를 때마다 켜고 끔
 *   3) 2차 교안: <script src="…/pen-core.js" data-launcher> 로 넣으면 오른쪽 위에 [판서] 단추
 * 다시 실행하면 켜고 끄기(toggle)만 합니다. 페이지 디자인과 섞이지 않게 Shadow DOM 안에 그립니다.
 * 도구: 마우스 · 펜 · 형광펜 · 사각형 · 원 · 화살표 · 지우개 · 색 6 · 굵기 3 · 되돌리기 · 모두 지우기
 * 단축키(열려 있을 때): P H R O A E · 1~6 색 · Ctrl+Z · Del · Esc(마우스로)
 */
(function () {
  if (window.__zpen) { window.__zpen.toggle(); return; }
  var script = document.currentScript;
  var launcher = !!(script && script.hasAttribute('data-launcher'));

  var COLORS = [
    { c: '#e5262a', n: '빨강' }, { c: '#1f6feb', n: '파랑' }, { c: '#1a9b4b', n: '초록' },
    { c: '#f5c400', n: '노랑' }, { c: '#111111', n: '검정' }, { c: '#ffffff', n: '흰색' }
  ];
  var WIDTHS = [{ w: 3, n: '가늘게' }, { w: 6, n: '보통' }, { w: 12, n: '굵게' }];
  var ICONS = {
    pen: 'M4 20l4-1 11-11-3-3L5 16z M14 6l3 3',
    mouse: 'M6 3l0 15 4-4 3 7 3-1.5-3-6.5 6 0z',
    hl: 'M5 19h7 M9 15l-3 3 M8 14l7-9 4 3-7 9z',
    rect: 'M4 6h16v12H4z',
    ellipse: 'M3.5 12a8.5 6.5 0 1 0 17 0a8.5 6.5 0 1 0 -17 0',
    arrow: 'M4 20L19 5 M10 5h9v9',
    eraser: 'M8 20h12 M4.5 15.5l9-9 6 6-7.5 7.5h-4z M9 11l6 6',
    undo: 'M9 14L4 9l5-5 M4 9h11a5 5 0 0 1 0 10h-4',
    clear: 'M5 7h14 M9 7V4h6v3 M7 7l1 13h8l1-13',
    close: 'M6 6l12 12 M18 6L6 18',
    grip: 'M9 6h.01 M15 6h.01 M9 12h.01 M15 12h.01 M9 18h.01 M15 18h.01'
  };
  var SVGNS = 'http://www.w3.org/2000/svg';
  function icon(k, size) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size || 22); s.setAttribute('height', size || 22);
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', k === 'grip' ? '3.2' : '2');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', ICONS[k]); s.appendChild(p);
    return s;
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  // ── 설정은 이 사이트 브라우저에 기억 (색 · 굵기 · 도구상자 위치)
  var KEY = 'zpen-settings';
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
  var state = { open: false, tool: 'mouse', color: saved.color || COLORS[0].c, width: saved.width || WIDTHS[1].w, pos: saved.pos || null };
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ color: state.color, width: state.width, pos: state.pos })); } catch (e) {} }

  var shapes = [], cur = null, drawing = false;

  // ── 큰 커서 그림 (발표 화면에서 잘 보이게)
  var CROSS = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g stroke-linecap="round"><path d="M24 4v14M24 30v14M4 24h14M30 24h14" stroke="#fff" stroke-width="6"/><path d="M24 4v14M24 30v14M4 24h14M30 24h14" stroke="#111" stroke-width="2.6"/></g><circle cx="24" cy="24" r="3" fill="#e5262a" stroke="#fff" stroke-width="1.5"/></svg>') + '") 24 24, crosshair';
  var ERASER = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="16" fill="rgba(255,255,255,.35)" stroke="#fff" stroke-width="5"/><circle cx="24" cy="24" r="16" fill="none" stroke="#111" stroke-width="2.4"/></svg>') + '") 24 24, cell';

  // ── 화면 전체를 덮는 겉껍데기 + Shadow DOM
  var host = el('div');
  host.setAttribute('data-zpen', '');
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483646;pointer-events:none;';
  var root = host.attachShadow({ mode: 'open' });
  var style = el('style');
  style.textContent = [
    ':host{all:initial}',
    '*{box-sizing:border-box}',
    'canvas{position:fixed;inset:0;pointer-events:none;touch-action:none}',
    'canvas.active{pointer-events:auto;cursor:' + CROSS + '}',
    'canvas.active.eraser{cursor:' + ERASER + '}',
    '.box{position:fixed;top:120px;right:16px;display:grid;justify-items:end;gap:8px;pointer-events:auto;font:700 14px "IBM Plex Sans KR","Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif;color:#1b2230}',
    '.launch{display:flex;align-items:center;gap:8px;padding:10px 16px;border:0;border-radius:999px;background:#14213d;color:#fff;font:inherit;cursor:pointer;box-shadow:0 4px 14px rgba(16,24,40,.25),inset 0 -3px 0 #c8321e}',
    '.launch[aria-pressed="true"]{background:#c8321e;box-shadow:0 4px 14px rgba(16,24,40,.25)}',
    '.panel{display:none;width:172px;padding:6px 8px 8px;gap:2px;border:1px solid #dde1e8;border-radius:14px;background:#fff;box-shadow:0 10px 30px rgba(16,24,40,.25);max-height:calc(100vh - 140px);overflow-y:auto}',
    '.box.open .panel{display:grid}',
    '.grip{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:4px 4px 6px;margin-bottom:2px;border-bottom:1px solid #dde1e8;color:#5b6474;font-size:12.5px;cursor:move;user-select:none;touch-action:none}',
    '.b{display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border:0;border-radius:10px;background:transparent;color:#1b2230;font:inherit;text-align:left;cursor:pointer;white-space:nowrap}',
    '.b:hover{background:#eef1f5}',
    '.b[aria-pressed="true"]{background:#c8321e;color:#fff}',
    '.b kbd{margin-left:auto;font:600 11px ui-monospace,Consolas,monospace;opacity:.6}',
    '.sw{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;padding:8px 2px;margin:4px 0;border-block:1px solid #dde1e8}',
    '.c{width:22px;height:22px;padding:0;border-radius:50%;border:2px solid #c3c9d3;cursor:pointer;justify-self:center}',
    '.c[aria-pressed="true"]{outline:3px solid #14213d;outline-offset:2px;border-color:#fff}',
    '.wd{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:0 2px 8px;margin-bottom:4px;border-bottom:1px solid #dde1e8}',
    '.w{height:30px;display:grid;place-items:center;border:1px solid #dde1e8;border-radius:8px;background:#fff;cursor:pointer}',
    '.w i{display:block;width:26px;border-radius:4px;background:#1b2230}',
    '.w[aria-pressed="true"]{border-color:#c8321e;box-shadow:0 0 0 1px #c8321e}',
    'button:focus-visible{outline:3px solid #1f6feb;outline-offset:2px}',
    '@media (max-width:700px){.b span,.b kbd{display:none}.panel{width:auto}.sw{grid-template-columns:repeat(2,1fr)}.wd{grid-template-columns:1fr}}'
  ].join('\n');
  root.appendChild(style);

  var cv = el('canvas');
  var ctx = cv.getContext('2d');
  root.appendChild(cv);
  function fit() {
    var r = window.devicePixelRatio || 1;
    cv.width = Math.round(innerWidth * r); cv.height = Math.round(innerHeight * r);
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
    ctx.setTransform(r, 0, 0, r, 0, 0);
    paint();
  }

  // ── 그리기 (그림은 페이지 위치에 붙어 스크롤을 따라감)
  function stroke(s) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = s.color; ctx.lineWidth = s.width;
    if (s.type === 'hl') { ctx.globalAlpha = 0.35; ctx.lineWidth = s.width * 3; }
    ctx.beginPath();
    if (s.pts) {
      ctx.moveTo(s.pts[0].x, s.pts[0].y);
      for (var i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y);
      if (s.pts.length === 1) ctx.lineTo(s.pts[0].x + 0.1, s.pts[0].y);
    } else if (s.type === 'rect') {
      ctx.rect(Math.min(s.x1, s.x2), Math.min(s.y1, s.y2), Math.abs(s.x2 - s.x1), Math.abs(s.y2 - s.y1));
    } else if (s.type === 'ellipse') {
      ctx.ellipse((s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, Math.abs(s.x2 - s.x1) / 2 || 0.1, Math.abs(s.y2 - s.y1) / 2 || 0.1, 0, 0, Math.PI * 2);
    } else if (s.type === 'arrow') {
      var a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1), L = 10 + s.width * 2.5;
      ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2);
      ctx.moveTo(s.x2, s.y2); ctx.lineTo(s.x2 - L * Math.cos(a - 0.45), s.y2 - L * Math.sin(a - 0.45));
      ctx.moveTo(s.x2, s.y2); ctx.lineTo(s.x2 - L * Math.cos(a + 0.45), s.y2 - L * Math.sin(a + 0.45));
    }
    ctx.stroke();
    ctx.restore();
  }
  function paint() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.save(); ctx.translate(-scrollX, -scrollY);
    shapes.forEach(stroke); if (cur) stroke(cur);
    ctx.restore();
  }

  // ── 지우개: 닿은 그림 하나를 통째로
  function seg(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l)) : 0;
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }
  function hit(s, x, y) {
    var tol = 12 + s.width;
    if (s.pts) { for (var i = 0; i < s.pts.length; i++) { var a = s.pts[i], b = s.pts[i + 1] || a; if (seg(x, y, a.x, a.y, b.x, b.y) < tol) return true; } return false; }
    if (s.type === 'arrow') return seg(x, y, s.x1, s.y1, s.x2, s.y2) < tol;
    var l = Math.min(s.x1, s.x2), r = Math.max(s.x1, s.x2), t = Math.min(s.y1, s.y2), bt = Math.max(s.y1, s.y2);
    if (s.type === 'rect') return x > l - tol && x < r + tol && y > t - tol && y < bt + tol && !(x > l + tol && x < r - tol && y > t + tol && y < bt - tol);
    var cx = (l + r) / 2, cy = (t + bt) / 2, rx = (r - l) / 2 || 1, ry = (bt - t) / 2 || 1;
    return Math.abs(Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry) < tol;
  }
  function erase(x, y) { var n = shapes.length; shapes = shapes.filter(function (s) { return !hit(s, x, y); }); if (shapes.length !== n) paint(); }

  function pos(e) { return { x: e.clientX + scrollX, y: e.clientY + scrollY }; }
  cv.addEventListener('pointerdown', function (e) {
    if (state.tool === 'mouse') return;
    e.preventDefault(); cv.setPointerCapture(e.pointerId); drawing = true;
    var p = pos(e);
    if (state.tool === 'eraser') { erase(p.x, p.y); return; }
    cur = (state.tool === 'pen' || state.tool === 'hl')
      ? { type: state.tool, color: state.color, width: state.width, pts: [p] }
      : { type: state.tool, color: state.color, width: state.width, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    paint();
  });
  cv.addEventListener('pointermove', function (e) {
    if (!drawing) return;
    var p = pos(e);
    if (state.tool === 'eraser') { erase(p.x, p.y); return; }
    if (!cur) return;
    if (cur.pts) cur.pts.push(p);
    else {
      cur.x2 = p.x; cur.y2 = p.y;
      if (e.shiftKey && (cur.type === 'rect' || cur.type === 'ellipse')) {
        var m = Math.max(Math.abs(cur.x2 - cur.x1), Math.abs(cur.y2 - cur.y1));
        cur.x2 = cur.x1 + m * Math.sign(cur.x2 - cur.x1 || 1); cur.y2 = cur.y1 + m * Math.sign(cur.y2 - cur.y1 || 1);
      }
    }
    paint();
  });
  function end() {
    if (!drawing) return;
    drawing = false;
    if (cur) { if (cur.pts || Math.hypot(cur.x2 - cur.x1, cur.y2 - cur.y1) >= 4) shapes.push(cur); cur = null; paint(); }
  }
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);

  // ── 도구상자
  var box = el('div', 'box');
  box.setAttribute('role', 'toolbar'); box.setAttribute('aria-label', '판서 도구');
  function button(k, label, title, kbd) {
    var b = el('button', 'b'); b.type = 'button'; b.title = title; b.dataset.k = k;
    b.appendChild(icon(k)); b.appendChild(el('span', null, label)); if (kbd) b.appendChild(el('kbd', null, kbd));
    return b;
  }
  var launch = null;
  if (launcher) {
    launch = el('button', 'launch'); launch.type = 'button'; launch.title = '판서 도구 열기 (화면에 그리기)';
    launch.appendChild(icon('pen')); launch.appendChild(el('span', null, '판서'));
    launch.addEventListener('click', function () { api.toggle(); });
    box.appendChild(launch);
  }
  var panel = el('div', 'panel');
  var grip = el('div', 'grip');
  grip.appendChild(el('span', null, '판서 도구')); grip.appendChild(icon('grip', 18));
  grip.title = '끌어서 옮기기';
  panel.appendChild(grip);
  var TOOLS = [['mouse', '마우스', 'Esc'], ['pen', '펜', 'P'], ['hl', '형광펜', 'H'], ['rect', '사각형', 'R'], ['ellipse', '원', 'O'], ['arrow', '화살표', 'A'], ['eraser', '지우개', 'E']];
  var TIPS = { mouse: '그리기 멈추고 화면 누르기 · 스크롤', pen: '자유롭게 그리기', hl: '반투명하게 굵게', rect: '드래그 · Shift는 정사각형', ellipse: '드래그 · Shift는 정원', arrow: '드래그로 화살표', eraser: '닿은 그림 지우기' };
  var toolBtns = TOOLS.map(function (t) {
    var b = button(t[0], t[1], t[1] + ': ' + TIPS[t[0]] + ' (' + t[2] + ')', t[2]);
    b.addEventListener('click', function () { setTool(t[0]); });
    panel.appendChild(b); return b;
  });
  var sw = el('div', 'sw');
  var cBtns = COLORS.map(function (c, i) {
    var b = el('button', 'c'); b.type = 'button'; b.style.background = c.c; b.title = c.n + ' (' + (i + 1) + ')'; b.setAttribute('aria-label', c.n);
    b.addEventListener('click', function () { setColor(c.c); });
    sw.appendChild(b); return b;
  });
  panel.appendChild(sw);
  var wd = el('div', 'wd');
  var wBtns = WIDTHS.map(function (w) {
    var b = el('button', 'w'); b.type = 'button'; b.title = '굵기: ' + w.n; b.setAttribute('aria-label', '굵기 ' + w.n);
    var i = el('i'); i.style.height = Math.max(2, w.w * 0.7) + 'px'; b.appendChild(i);
    b.addEventListener('click', function () { state.width = w.w; save(); sync(); });
    wd.appendChild(b); return b;
  });
  panel.appendChild(wd);
  var undoB = button('undo', '되돌리기', '마지막 그림 지우기 (Ctrl+Z)', '^Z'); undoB.addEventListener('click', undo); panel.appendChild(undoB);
  var clearB = button('clear', '모두 지우기', '그림 모두 지우기 (Del)', 'Del'); clearB.addEventListener('click', clearAll); panel.appendChild(clearB);
  var closeB = button('close', '닫기', '판서 끝내기 (그림도 지움)'); closeB.addEventListener('click', function () { api.close(); }); panel.appendChild(closeB);
  box.appendChild(panel);
  root.appendChild(box);

  // 도구상자 끌어서 옮기기 (위치는 이 사이트에 기억)
  function place() {
    if (!state.pos) { box.style.left = ''; box.style.top = ''; box.style.right = ''; return; }
    var x = Math.max(4, Math.min(innerWidth - 60, state.pos.x)), y = Math.max(4, Math.min(innerHeight - 60, state.pos.y));
    box.style.left = x + 'px'; box.style.top = y + 'px'; box.style.right = 'auto';
  }
  grip.addEventListener('pointerdown', function (e) {
    e.preventDefault(); grip.setPointerCapture(e.pointerId);
    var r = box.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    function mv(ev) { state.pos = { x: ev.clientX - dx, y: ev.clientY - dy }; place(); }
    function up() { grip.removeEventListener('pointermove', mv); grip.removeEventListener('pointerup', up); save(); }
    grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', up);
  });

  function setTool(t) { state.tool = t; sync(); }
  function setColor(c) { state.color = c; if (state.tool === 'mouse' || state.tool === 'eraser') state.tool = 'pen'; save(); sync(); }
  function undo() { shapes.pop(); paint(); }
  function clearAll() { shapes = []; cur = null; paint(); }
  function sync() {
    box.classList.toggle('open', state.open);
    box.style.display = (state.open || launcher) ? '' : 'none';
    if (launch) launch.setAttribute('aria-pressed', state.open ? 'true' : 'false');
    toolBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.k === state.tool ? 'true' : 'false'); });
    cBtns.forEach(function (b, i) { b.setAttribute('aria-pressed', COLORS[i].c === state.color ? 'true' : 'false'); });
    wBtns.forEach(function (b, i) { b.setAttribute('aria-pressed', WIDTHS[i].w === state.width ? 'true' : 'false'); });
    var active = state.open && state.tool !== 'mouse';
    cv.classList.toggle('active', active);
    cv.classList.toggle('eraser', state.tool === 'eraser');
  }

  document.addEventListener('keydown', function (e) {
    if (!state.open) return;
    var t = e.composedPath ? e.composedPath()[0] : e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    var k = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.stopPropagation(); undo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var map = { p: 'pen', h: 'hl', r: 'rect', o: 'ellipse', a: 'arrow', e: 'eraser' };
    if (map[k]) { setTool(map[k]); e.preventDefault(); e.stopPropagation(); }
    else if (k === 'escape') setTool('mouse');
    else if (k === 'delete' || k === 'backspace') { clearAll(); e.preventDefault(); }
    else if (/^[1-6]$/.test(k)) { setColor(COLORS[+k - 1].c); e.preventDefault(); }
  }, true);

  var api = {
    open: function () { state.open = true; state.tool = 'pen'; place(); sync(); },
    close: function () { state.open = false; state.tool = 'mouse'; clearAll(); sync(); },
    toggle: function () { if (state.open) api.close(); else api.open(); }
  };
  window.__zpen = api;

  (document.body || document.documentElement).appendChild(host);
  window.addEventListener('resize', function () { fit(); place(); });
  window.addEventListener('scroll', paint, { passive: true });
  fit(); place(); sync();
  if (!launcher) api.open();   // 확장 · 북마클릿은 누르자마자 펜으로
})();
