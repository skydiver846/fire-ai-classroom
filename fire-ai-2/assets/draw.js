// 2차 교안 판서 도구 (줌잇처럼 화면 위에 그리기)
// 오른쪽 위 [판서] 단추 → 도구상자: 마우스 · 펜 · 형광펜 · 사각형 · 원 · 화살표 · 지우개 · 색 · 굵기 · 되돌리기 · 모두 지우기
// 그림은 페이지 위치에 붙어 있어서 스크롤해도 그 글자 위에 남습니다. 페이지를 옮기면 지워집니다.
// 단축키(도구상자가 열려 있을 때): P 펜 · H 형광펜 · R 사각형 · O 원 · A 화살표 · E 지우개 · 1~6 색 · Ctrl+Z 되돌리기 · Del 모두 지우기 · Esc 마우스로
(function () {
  var COLORS = [
    { c: '#e5262a', n: '빨강' }, { c: '#1f6feb', n: '파랑' }, { c: '#1a9b4b', n: '초록' },
    { c: '#f5c400', n: '노랑' }, { c: '#111111', n: '검정' }, { c: '#ffffff', n: '흰색' }
  ];
  var WIDTHS = [{ w: 3, n: '가늘게' }, { w: 6, n: '보통' }, { w: 12, n: '굵게' }];
  var ICON = {
    open: '<path d="M4 20l4-1 11-11-3-3L5 16z M14 6l3 3"/>',
    mouse: '<path d="M6 3l0 15 4-4 3 7 3-1.5-3-6.5 6 0z"/>',
    pen: '<path d="M4 20l4-1 11-11-3-3L5 16z M14 6l3 3"/>',
    hl: '<path d="M5 19h7 M9 15l-3 3 M8 14l7-9 4 3-7 9z"/>',
    rect: '<rect x="4" y="6" width="16" height="12" rx="1.5"/>',
    ellipse: '<ellipse cx="12" cy="12" rx="8.5" ry="6.5"/>',
    arrow: '<path d="M4 20L19 5 M10 5h9v9"/>',
    eraser: '<path d="M8 20h12 M4.5 15.5l9-9 6 6-7.5 7.5h-4z M9 11l6 6"/>',
    undo: '<path d="M9 14L4 9l5-5 M4 9h11a5 5 0 0 1 0 10h-4"/>',
    clear: '<path d="M5 7h14 M9 7V4h6v3 M7 7l1 13h8l1-13"/>',
    close: '<path d="M6 6l12 12 M18 6L6 18"/>'
  };
  var svg = function (k) { return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + '</svg>'; };

  var state = { open: false, tool: 'mouse', color: COLORS[0].c, width: WIDTHS[1].w };
  var shapes = [], cur = null, drawing = false;

  // ── 그리는 판 (화면 전체를 덮는 캔버스, 도구를 고를 때만 마우스를 받음)
  var cv = document.createElement('canvas');
  cv.className = 'draw-canvas';
  var ctx = cv.getContext('2d');
  document.body.appendChild(cv);
  function fit() {
    var r = window.devicePixelRatio || 1;
    cv.width = Math.round(innerWidth * r); cv.height = Math.round(innerHeight * r);
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
    ctx.setTransform(r, 0, 0, r, 0, 0);
    paint();
  }

  // ── 그리기
  function stroke(s) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = s.color; ctx.lineWidth = s.width;
    if (s.type === 'hl') { ctx.globalAlpha = 0.35; ctx.lineWidth = s.width * 3; }
    ctx.beginPath();
    if (s.type === 'pen' || s.type === 'hl') {
      var p = s.pts;
      ctx.moveTo(p[0].x, p[0].y);
      for (var i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
      if (p.length === 1) ctx.lineTo(p[0].x + 0.1, p[0].y);
      ctx.stroke();
    } else if (s.type === 'rect') {
      ctx.strokeRect(Math.min(s.x1, s.x2), Math.min(s.y1, s.y2), Math.abs(s.x2 - s.x1), Math.abs(s.y2 - s.y1));
    } else if (s.type === 'ellipse') {
      ctx.ellipse((s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, Math.abs(s.x2 - s.x1) / 2 || 0.1, Math.abs(s.y2 - s.y1) / 2 || 0.1, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (s.type === 'arrow') {
      var a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1), L = 10 + s.width * 2.5;
      ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2);
      ctx.moveTo(s.x2, s.y2); ctx.lineTo(s.x2 - L * Math.cos(a - 0.45), s.y2 - L * Math.sin(a - 0.45));
      ctx.moveTo(s.x2, s.y2); ctx.lineTo(s.x2 - L * Math.cos(a + 0.45), s.y2 - L * Math.sin(a + 0.45));
      ctx.stroke();
    }
    ctx.restore();
  }
  function paint() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.save(); ctx.translate(-scrollX, -scrollY);   // 그림은 페이지 위치에 붙어 있음
    shapes.forEach(stroke); if (cur) stroke(cur);
    ctx.restore();
  }

  // ── 지우개: 닿은 그림 하나를 통째로 지움
  function distSeg(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l)) : 0;
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }
  function hit(s, x, y) {
    var tol = 12 + s.width;
    if (s.type === 'pen' || s.type === 'hl') {
      for (var i = 0; i < s.pts.length; i++) {
        var a = s.pts[i], b = s.pts[i + 1] || a;
        if (distSeg(x, y, a.x, a.y, b.x, b.y) < tol) return true;
      }
      return false;
    }
    if (s.type === 'arrow') return distSeg(x, y, s.x1, s.y1, s.x2, s.y2) < tol;
    var l = Math.min(s.x1, s.x2), r = Math.max(s.x1, s.x2), t = Math.min(s.y1, s.y2), bt = Math.max(s.y1, s.y2);
    if (s.type === 'rect') {
      var inside = x > l - tol && x < r + tol && y > t - tol && y < bt + tol;
      var deep = x > l + tol && x < r - tol && y > t + tol && y < bt - tol;
      return inside && !deep;
    }
    var cx = (l + r) / 2, cy = (t + bt) / 2, rx = (r - l) / 2 || 1, ry = (bt - t) / 2 || 1;
    var d = Math.hypot((x - cx) / rx, (y - cy) / ry);
    return Math.abs(d - 1) * Math.min(rx, ry) < tol;
  }
  function erase(x, y) {
    var before = shapes.length;
    shapes = shapes.filter(function (s) { return !hit(s, x, y); });
    if (shapes.length !== before) paint();
  }

  // ── 마우스 · 손가락 · 펜
  function pos(e) { return { x: e.clientX + scrollX, y: e.clientY + scrollY }; }
  cv.addEventListener('pointerdown', function (e) {
    if (state.tool === 'mouse') return;
    e.preventDefault();
    cv.setPointerCapture(e.pointerId);
    drawing = true;
    var p = pos(e);
    if (state.tool === 'eraser') { erase(p.x, p.y); return; }
    if (state.tool === 'pen' || state.tool === 'hl') cur = { type: state.tool, color: state.color, width: state.width, pts: [p] };
    else cur = { type: state.tool, color: state.color, width: state.width, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
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
      if (e.shiftKey && (cur.type === 'rect' || cur.type === 'ellipse')) {   // Shift: 정사각형 · 정원
        var s = Math.max(Math.abs(cur.x2 - cur.x1), Math.abs(cur.y2 - cur.y1));
        cur.x2 = cur.x1 + s * Math.sign(cur.x2 - cur.x1 || 1); cur.y2 = cur.y1 + s * Math.sign(cur.y2 - cur.y1 || 1);
      }
    }
    paint();
  });
  function end() {
    if (!drawing) return;
    drawing = false;
    if (cur) {
      var tiny = cur.pts ? false : Math.hypot(cur.x2 - cur.x1, cur.y2 - cur.y1) < 4;
      if (!tiny) shapes.push(cur);
      cur = null; paint();
    }
  }
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);

  // ── 도구상자
  var box = document.createElement('div');
  box.className = 'draw-box';
  box.setAttribute('role', 'toolbar');
  box.setAttribute('aria-label', '판서 도구');
  document.body.appendChild(box);

  function btn(key, label, title, cls) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'draw-btn' + (cls ? ' ' + cls : '');
    b.innerHTML = svg(key) + '<span>' + label + '</span>';
    b.title = title; b.dataset.key = key;
    return b;
  }
  var toggle = btn('open', '판서', '판서 도구 열기 (화면에 그리기)', 'draw-toggle');
  var panel = document.createElement('div');
  panel.className = 'draw-panel';
  var tools = [
    ['mouse', '마우스', '마우스로 돌아가기: 교안을 누르고 스크롤 (Esc)'],
    ['pen', '펜', '펜으로 자유롭게 그리기 (P)'],
    ['hl', '형광펜', '형광펜: 반투명하게 굵게 (H)'],
    ['rect', '사각형', '드래그해서 사각형 (R) · Shift: 정사각형'],
    ['ellipse', '원', '드래그해서 원 (O) · Shift: 정원'],
    ['arrow', '화살표', '드래그해서 화살표 (A)'],
    ['eraser', '지우개', '닿은 그림을 지우기 (E)']
  ];
  var toolBtns = tools.map(function (t) {
    var b = btn(t[0], t[1], t[2]);
    b.addEventListener('click', function () { setTool(t[0]); });
    panel.appendChild(b);
    return b;
  });
  var sw = document.createElement('div'); sw.className = 'draw-swatches';
  var swBtns = COLORS.map(function (c, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'draw-sw'; b.style.background = c.c;
    b.title = c.n + ' (' + (i + 1) + ')'; b.setAttribute('aria-label', c.n);
    b.addEventListener('click', function () { setColor(c.c); });
    sw.appendChild(b);
    return b;
  });
  panel.appendChild(sw);
  var wd = document.createElement('div'); wd.className = 'draw-widths';
  var wBtns = WIDTHS.map(function (w) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'draw-w'; b.title = '굵기: ' + w.n; b.setAttribute('aria-label', '굵기 ' + w.n);
    b.innerHTML = '<i style="height:' + Math.max(2, w.w * 0.7) + 'px"></i>';
    b.addEventListener('click', function () { state.width = w.w; sync(); });
    wd.appendChild(b);
    return b;
  });
  panel.appendChild(wd);
  var undoB = btn('undo', '되돌리기', '마지막 그림 지우기 (Ctrl+Z)');
  undoB.addEventListener('click', undo);
  var clearB = btn('clear', '모두 지우기', '그림 모두 지우기 (Del)');
  clearB.addEventListener('click', clearAll);
  var closeB = btn('close', '닫기', '판서 도구 닫기 (그림도 지움)');
  closeB.addEventListener('click', function () { setOpen(false); });
  panel.appendChild(undoB); panel.appendChild(clearB); panel.appendChild(closeB);
  box.appendChild(toggle); box.appendChild(panel);
  toggle.addEventListener('click', function () { setOpen(!state.open); });

  function setOpen(v) {
    state.open = v;
    if (!v) { clearAll(); setTool('mouse'); } else setTool('pen');
    sync();
  }
  function setTool(t) { state.tool = t; sync(); }
  function setColor(c) { state.color = c; if (state.tool === 'mouse' || state.tool === 'eraser') state.tool = 'pen'; sync(); }
  function undo() { shapes.pop(); paint(); }
  function clearAll() { shapes = []; cur = null; paint(); }
  function sync() {
    box.classList.toggle('open', state.open);
    toggle.setAttribute('aria-pressed', state.open ? 'true' : 'false');
    toolBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.key === state.tool ? 'true' : 'false'); });
    swBtns.forEach(function (b, i) { b.setAttribute('aria-pressed', COLORS[i].c === state.color ? 'true' : 'false'); });
    wBtns.forEach(function (b, i) { b.setAttribute('aria-pressed', WIDTHS[i].w === state.width ? 'true' : 'false'); });
    var active = state.open && state.tool !== 'mouse';
    cv.classList.toggle('active', active);
    cv.dataset.tool = state.tool;
    document.documentElement.classList.toggle('drawing', active);
  }

  // ── 단축키 (도구상자가 열려 있고, 글자 입력칸에 있지 않을 때)
  document.addEventListener('keydown', function (e) {
    if (!state.open) return;
    var el = e.target;
    if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
    var k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); undo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var map = { p: 'pen', h: 'hl', r: 'rect', o: 'ellipse', a: 'arrow', e: 'eraser' };
    if (map[k]) { setTool(map[k]); e.preventDefault(); }
    else if (k === 'escape') setTool('mouse');
    else if (k === 'delete' || k === 'backspace') { clearAll(); e.preventDefault(); }
    else if (/^[1-6]$/.test(k)) setColor(COLORS[+k - 1].c);
  });

  window.addEventListener('resize', fit);
  window.addEventListener('scroll', paint, { passive: true });
  fit(); sync();
})();
