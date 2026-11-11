// 사이트 공통: 큰 커서 + 누를 수 있는 곳 블록 강조 (발표 화면에서 잘 보이게)
// 페이지 끝에 <script src="/assets/pointer.js"></script> 한 줄로 붙입니다.
// - 큰 커서: 처음에는 켜짐, [큰 커서 켜짐/꺼짐] 단추로 끄고 켜며 이 브라우저에 기억 (모든 페이지 공통)
// - 단추 위치: 교안 머리띠(.masthead)가 있으면 그 안, 없으면 화면 오른쪽 아래
// - 블록 강조: 교안(1차 · 2차)의 목록 · 칸 · 단추는 정해 둔 모양으로, 다른 페이지는 :where() 로 약하게 걸어 각 페이지 스타일이 이깁니다.
(function () {
  if (window.__bigPointer) return; window.__bigPointer = true;
  var KEY = "big-cursor", OLD = "f2-big-cursor", root = document.documentElement;

  var ARROW = 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22 viewBox=%220 0 56 56%22%3E%3Cpath d=%22M5 3 L5 45 L15 35 L22 51 L30 47.5 L23 32 L37 32 Z%22 fill=%22%23ffffff%22 stroke=%22%23111111%22 stroke-width=%223.2%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E") 6 3, auto';
  var HAND = 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2268%22 viewBox=%220 0 60 64%22%3E%3Cpath d=%22M20 30 V9 a5 5 0 0 1 10 0 V27 V22 a4.5 4.5 0 0 1 9 0 V28 V25 a4.5 4.5 0 0 1 9 0 V31 V29 a4 4 0 0 1 8 0 V44 c0 9 -7 16 -16 16 H31 c-6 0 -10 -3 -13 -7 L7 39 a4.5 4.5 0 0 1 7 -6 L20 39 Z%22 fill=%22%23ffffff%22 stroke=%22%23111111%22 stroke-width=%223%22 stroke-linejoin=%22round%22/%3E%3Ccircle cx=%2225%22 cy=%228%22 r=%223%22 fill=%22%23c8321e%22/%3E%3C/svg%3E") 27 6, pointer';
  var ACC = "var(--accent, #c8321e)", SOFT = "var(--accent-soft, rgba(200, 50, 30, .10))";
  var CLICK = "a, button, summary, label, select, [role=button], [onclick], input[type=checkbox], input[type=radio], input[type=submit], input[type=button], .copy, .tab";

  var css = [
    // 큰 커서
    "html.big-cursor, html.big-cursor body { cursor: " + ARROW + "; }",
    CLICK.split(", ").map(function (s) { return "html.big-cursor " + s; }).join(", ") + " { cursor: " + HAND + "; }",
    "html.big-cursor input[type=text], html.big-cursor input[type=url], html.big-cursor input[type=password], html.big-cursor input[type=email], html.big-cursor input[type=search], html.big-cursor input[type=number], html.big-cursor input:not([type]), html.big-cursor input[inputmode], html.big-cursor textarea, html.big-cursor [contenteditable=true] { cursor: text; }",
    // 켜기/끄기 단추
    ".cursor-toggle { flex: none; font: 700 15px var(--font-body, system-ui, sans-serif); padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,.35); background: transparent; color: #fff; white-space: nowrap; cursor: pointer; }",
    ".cursor-toggle[aria-pressed=true] { background: " + ACC + "; border-color: " + ACC + "; }",
    ".cursor-toggle.floating { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; background: #14213d; border-color: #14213d; box-shadow: 0 4px 14px rgba(0,0,0,.25); }",
    ".cursor-toggle.floating[aria-pressed=true] { background: #c8321e; border-color: #c8321e; }",
    "@media (max-width: 900px), (hover: none) { .cursor-toggle { display: none; } }",
    // 블록 강조: 교안(1차 · 2차) 공통 모양
    ".mods a, .tile, .pager a, .group a, .btn, .steps-bar a, .copy { transition: background-color .15s, border-color .15s, box-shadow .15s, transform .15s, color .15s; }",
    ".mods a { border-radius: 10px; }",
    ".mods a:hover, .mods a:focus-visible { background: " + SOFT + "; box-shadow: inset 4px 0 0 " + ACC + "; outline: none; }",
    ".mods a:hover .no, .mods a:focus-visible .no { background: " + ACC + "; box-shadow: none; }",
    ".mods a:hover .t, .mods a:focus-visible .t { font-weight: 700; color: " + ACC + "; }",
    ".btn:hover, .btn:focus-visible { filter: brightness(.88); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(200, 50, 30, .35); }",
    ".tile:hover, .tile:focus-visible, .pager a:hover, .pager a:focus-visible { background: " + SOFT + "; border-color: " + ACC + "; box-shadow: 0 6px 16px rgba(16, 24, 40, .12); transform: translateY(-2px); outline: none; }",
    ".group a:hover { background: " + SOFT + "; color: " + ACC + "; }",
    ".group a:hover .n { border-color: " + ACC + "; color: " + ACC + "; }",
    ".steps-bar a:not([aria-current=step]):hover { background: " + SOFT + "; border-color: " + ACC + "; color: " + ACC + "; }",
    ".copy:hover { background: " + ACC + "; color: #fff; border-color: " + ACC + "; }",
    // 블록 강조: 그 밖의 페이지 (특이도 0이라 페이지 자체 스타일이 있으면 그쪽이 이김)
    ":where(button, [role=button], input[type=submit], input[type=button]) { transition: filter .15s, box-shadow .15s, transform .15s; }",
    ":where(button:not(:disabled):hover, [role=button]:hover, input[type=submit]:not(:disabled):hover, input[type=button]:not(:disabled):hover) { filter: brightness(.9); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(200, 50, 30, .30); }",
    ":where(a:hover, summary:hover, label:hover) { background-color: rgba(200, 50, 30, .10); box-shadow: 0 0 0 3px rgba(200, 50, 30, .10); border-radius: 4px; }",
    ":where(a:focus-visible, button:focus-visible, summary:focus-visible) { outline: 3px solid rgba(200, 50, 30, .55); outline-offset: 2px; }",
    "@media (prefers-reduced-motion: reduce) { .btn:hover, .tile:hover, .pager a:hover, :where(button:hover, [role=button]:hover) { transform: none; } }"
  ].join("\n");
  var st = document.createElement("style"); st.id = "big-pointer-css"; st.textContent = css;
  (document.head || root).appendChild(st);

  var on = true;
  try {
    var v = localStorage.getItem(KEY);
    if (v === null) v = localStorage.getItem(OLD);   // 2차 교안에서 정해 둔 값 이어받기
    on = v !== "0";
  } catch (e) {}
  root.classList.toggle("big-cursor", on);

  function addButton() {
    if (document.querySelector(".cursor-toggle")) return;
    var head = document.querySelector(".masthead");
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "cursor-toggle" + (head ? "" : " floating");
    function paint() { btn.setAttribute("aria-pressed", on ? "true" : "false"); btn.textContent = on ? "큰 커서 켜짐" : "큰 커서 꺼짐"; }
    btn.addEventListener("click", function () {
      on = !on; root.classList.toggle("big-cursor", on); paint();
      try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {}
    });
    paint();
    (head || document.body).appendChild(btn);
  }
  if (document.body) addButton(); else document.addEventListener("DOMContentLoaded", addButton);
})();
