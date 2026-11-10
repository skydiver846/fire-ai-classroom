// 2차 교육 공모 · 투표 탭: 시작하기(이름+비밀번호) → 내 작품 내기 → 모두의 작품 · 투표 → 결과
// 지금 열린 단계에 필요한 칸만 보입니다.
// 서버: /api/fire-contest/act  GET 조회, POST 시작(enter)·제출·투표
(function () {
  var API = '/api/fire-contest/';
  var $ = function (id) { return document.getElementById(id); };
  var state = { board: null, me: null, pin: '', picks: [] };

  // 같은 탭 안에서만 기억 (공용 PC라서 탭을 닫으면 잊음)
  function remember(name, pin) { try { sessionStorage.setItem('f2-me', JSON.stringify({ name: name, pin: pin })); } catch (_) {} }
  function recall() { try { return JSON.parse(sessionStorage.getItem('f2-me') || 'null'); } catch (_) { return null; } }

  function call(path, body) {
    var opt = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {};
    return fetch(API + path, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.error || ('서버 응답 ' + r.status));
        return d;
      });
    });
  }
  function say(el, text, ok) { el.textContent = text; el.className = 'msg ' + (ok ? 'ok' : 'err'); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  // 지금 무엇을 하는 때인지 한 줄로
  function renderStatus() {
    var b = state.board, s = $('c-status');
    if (!b) return;
    var f = b.flags, t;
    if (f.result) t = '🏆 결과가 공개되었습니다';
    else if (f.vote) t = '🗳 투표 중 · 내 작품을 뺀 ' + b.picks + '개를 골라 주세요 (투표 ' + b.voted + '명)';
    else if (f.submit) t = '📮 제출 받는 중 · 16:20 마감 (제출 ' + b.works.length + '개)';
    else t = '⏳ 아직 열리지 않았습니다 · 먼저 시작하기만 해 두세요';
    s.textContent = t;
  }

  function renderMe() {
    var me = state.me;
    $('c-login-box').hidden = Boolean(me);
    $('c-me').hidden = !me;
    if (me) $('c-me-t').textContent = me.name + ' 님' + (me.work ? ' · 낸 작품: ' + me.work.title : '') + (me.picks.length ? ' · 투표 완료' : '');
  }

  function renderSubmit() {
    var open = state.board && state.board.flags.submit;
    $('c-submit-box').hidden = !(open && state.me);
  }

  function renderWorks() {
    var b = state.board, list = $('c-works');
    list.textContent = '';
    if (!b) return;
    if (!b.works.length) { list.appendChild(el('li', 'empty', '아직 제출된 산출물이 없습니다.')); }
    var canVote = b.flags.vote && state.me;
    var myId = state.me ? state.me.id : '';
    var rankOf = {};
    (b.results || []).forEach(function (r) { rankOf[r.id] = r; });
    b.works.forEach(function (w) {
      var li = el('li', 'work' + (w.excluded ? ' out' : '') + (state.picks.indexOf(w.id) >= 0 ? ' picked' : ''));
      if (rankOf[w.id]) li.appendChild(el('span', 'rank', rankOf[w.id].rank + '위 · ' + rankOf[w.id].votes + '표'));
      li.appendChild(el('h3', null, w.title));
      li.appendChild(el('span', 'who', w.name));
      li.appendChild(el('p', 'intro', w.intro));
      var row = el('div', 'row');
      var a = el('a', 'open', '열어 보기 ↗'); a.href = w.url; a.target = '_blank'; a.rel = 'noopener';
      row.appendChild(a);
      row.appendChild(el('span', 'chip', (b.tracks[w.track] || w.track)));
      li.appendChild(row);
      if (w.excluded) li.appendChild(el('span', 'who', '투표 대상 아님: ' + w.reason));
      else if (canVote && w.id !== myId) {
        var lab = el('label', 'pick');
        var cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = 'pick-' + w.id;
        cb.checked = state.picks.indexOf(w.id) >= 0;
        cb.addEventListener('change', function () { togglePick(w.id, cb); });
        lab.appendChild(cb); lab.appendChild(document.createTextNode(' 이 작품에 투표'));
        li.appendChild(lab);
      } else if (canVote && w.id === myId) li.appendChild(el('span', 'who', '내 작품 (투표 불가)'));
      list.appendChild(li);
    });
    renderVoteBar();
  }

  function need() {
    var b = state.board, myId = state.me ? state.me.id : '';
    var n = b ? b.works.filter(function (w) { return !w.excluded && w.id !== myId; }).length : 0;
    return Math.min(b ? b.picks : 3, n);
  }
  function togglePick(id, cb) {
    var i = state.picks.indexOf(id);
    if (cb.checked && i < 0) {
      if (state.picks.length >= need()) { cb.checked = false; say($('v-msg'), need() + '개까지 고를 수 있습니다. 다른 작품을 먼저 빼 주세요.', false); return; }
      state.picks.push(id);
    } else if (!cb.checked && i >= 0) state.picks.splice(i, 1);
    $('v-msg').textContent = '';
    renderWorks();
  }
  function renderVoteBar() {
    var b = state.board, bar = $('c-vote-bar');
    bar.hidden = !(b && b.flags.vote && state.me);
    if (bar.hidden) return;
    $('c-vote-count').textContent = state.picks.length + ' / ' + need() + ' 골랐음';
    $('c-vote-btn').disabled = state.picks.length !== need() || need() === 0;
  }

  function renderResults() {
    var b = state.board, box = $('c-result-box'), body = $('c-results');
    box.hidden = !(b && b.flags.result && b.results);
    body.textContent = '';
    if (box.hidden) return;
    var byId = {};
    b.works.forEach(function (w) { byId[w.id] = w; });
    b.results.forEach(function (r) {
      var w = byId[r.id], tr = document.createElement('tr');
      [r.rank + '위', w.title, w.name, r.votes + '표'].forEach(function (v) { tr.appendChild(el('td', null, v)); });
      body.appendChild(tr);
    });
  }

  function renderAll() { renderStatus(); renderMe(); renderSubmit(); renderWorks(); renderResults(); }

  function loadBoard() {
    return call('act').then(function (d) { state.board = d; renderAll(); })
      .catch(function (e) { $('c-status').textContent = '현황을 불러오지 못했습니다: ' + e.message; });
  }

  function apply(d, name, pin) {
    state.me = { id: d.id, name: d.name, dept: d.dept, work: d.work, picks: d.picks };
    state.pin = pin; state.picks = d.picks.slice();
    remember(name, pin);
    if (d.work) {
      $('s-title').value = d.work.title; $('s-url').value = d.work.url; $('s-intro').value = d.work.intro;
      var r = $('s-' + d.work.track); if (r) r.checked = true;
    }
    renderAll();
  }
  function enter(name, pin, msgEl) {
    return call('act', { action: 'enter', name: name, pin: pin }).then(function (d) {
      apply(d, name, pin);
      if (d.created) loadBoard();
    }).catch(function (e) {
      if (msgEl) say(msgEl, e.message, false);
      else forget();
    });
  }
  function forget() {
    try { sessionStorage.removeItem('f2-me'); } catch (_) {}
    state.me = null; state.pin = ''; state.picks = [];
    $('c-submit').reset(); $('e-pin').value = ''; $('e-msg').textContent = '';
    renderAll();
  }

  $('c-enter').addEventListener('submit', function (ev) {
    ev.preventDefault();
    enter($('e-name').value.trim(), $('e-pin').value.trim(), $('e-msg'));
  });
  $('c-out').addEventListener('click', forget);

  $('c-submit').addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!state.me) return;
    var t = document.querySelector('input[name=track]:checked');
    call('act', { action: 'submit', name: state.me.name, pin: state.pin, title: $('s-title').value, url: $('s-url').value.trim(),
      intro: $('s-intro').value, track: t ? t.value : '' })
      .then(function (d) { say($('s-msg'), d.updated ? '고친 내용으로 다시 제출했습니다.' : '제출했습니다. 아래 모두의 작품에 올라갔습니다.', true); return enter(state.me.name, state.pin, null); })
      .then(loadBoard)
      .catch(function (e) { say($('s-msg'), e.message, false); });
  });

  $('c-vote-btn').addEventListener('click', function () {
    if (!state.me) return;
    call('act', { action: 'vote', name: state.me.name, pin: state.pin, picks: state.picks })
      .then(function () { say($('v-msg'), '투표했습니다. 닫히기 전까지 다시 고를 수 있습니다.', true); return enter(state.me.name, state.pin, null); })
      .then(loadBoard)
      .catch(function (e) { say($('v-msg'), e.message, false); });
  });

  var saved = recall();
  if (saved) { $('e-name').value = saved.name; enter(saved.name, saved.pin, null); }
  loadBoard();
  // 탭이 보이는 동안 20초마다 새로 고침 (다른 사람 제출·투표 현황)
  setInterval(function () {
    if (document.visibilityState === 'visible') loadBoard();
  }, 20000);
})();
