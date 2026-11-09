// 2차 교육 공모 · 투표 탭: 참가 등록 → 산출물 제출 → 함께 보기 · 투표 → 결과
// 서버: /api/fire-contest/act  GET 조회, POST 등록·제출·투표·내 정보
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

  function renderStatus() {
    var b = state.board, s = $('c-status');
    s.textContent = '';
    if (!b) return;
    var items = [
      ['제출', b.flags.submit], ['투표', b.flags.vote], ['결과', b.flags.result]
    ];
    items.forEach(function (it) {
      var span = el('span', it[1] ? 'on' : 'off', it[0] + (it[0] === '결과' ? (it[1] ? ' 공개' : ' 비공개') : (it[1] ? ' 열림' : ' 닫힘')));
      s.appendChild(span);
    });
    s.appendChild(el('span', null, '참가 ' + b.people + '명'));
    s.appendChild(el('span', null, '제출 ' + b.works.length + '개'));
    s.appendChild(el('span', null, '투표 ' + b.voted + '명'));
  }

  function renderMe() {
    var me = state.me, box = $('c-me');
    if (!me) { box.hidden = true; return; }
    box.hidden = false;
    box.textContent = me.name + ' (' + me.dept + ') 님으로 이어서 하는 중입니다. ' +
      (me.work ? '제출한 산출물: ' + me.work.title + '. ' : '아직 산출물을 내지 않았습니다. ') +
      (me.picks.length ? '투표 완료 (' + me.picks.length + '개).' : '');
  }

  function renderSubmit() {
    var open = state.board && state.board.flags.submit;
    var box = $('c-submit-box');
    box.setAttribute('aria-disabled', open && state.me ? 'false' : 'true');
    if (!state.me) say($('s-msg'), '먼저 1번에서 등록하거나 이어서 하기를 해 주세요.', false);
    else if (!open) say($('s-msg'), '지금은 제출이 닫혀 있습니다.', false);
    else if ($('s-msg').classList.contains('err')) $('s-msg').textContent = '';
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
      li.appendChild(el('span', 'who', w.name + (w.dept ? ' · ' + w.dept : '')));
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
    $('c-vote-count').textContent = state.picks.length + ' / ' + need() + ' 골랐습니다';
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

  function loadMe(name, pin, msgEl) {
    return call('act', { action: 'mine', name: name, pin: pin }).then(function (d) {
      state.me = { id: d.id || name.replace(/\s+/g, '').toLowerCase(), name: d.name, dept: d.dept, work: d.work, picks: d.picks };
      state.pin = pin; state.picks = d.picks.slice();
      remember(name, pin);
      if (d.work) {
        $('s-title').value = d.work.title; $('s-url').value = d.work.url; $('s-intro').value = d.work.intro;
        var r = $('s-' + d.work.track); if (r) r.checked = true;
      }
      if (msgEl) say(msgEl, d.name + ' 님, 이어서 하세요.', true);
      renderAll();
    }).catch(function (e) { if (msgEl) say(msgEl, e.message, false); });
  }

  $('c-register').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var name = $('r-name').value.trim(), pin = $('r-pin').value.trim();
    call('act', { action: 'register', name: name, dept: $('r-dept').value.trim(), pin: pin })
      .then(function () { say($('r-msg'), '등록했습니다.', true); return loadMe(name, pin, null); })
      .then(loadBoard)
      .catch(function (e) { say($('r-msg'), e.message, false); });
  });

  $('c-login').addEventListener('submit', function (ev) {
    ev.preventDefault();
    loadMe($('l-name').value.trim(), $('l-pin').value.trim(), $('l-msg'));
  });

  $('c-submit').addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!state.me) return;
    var t = document.querySelector('input[name=track]:checked');
    call('act', { action: 'submit', name: state.me.name, pin: state.pin, title: $('s-title').value, url: $('s-url').value.trim(),
      intro: $('s-intro').value, track: t ? t.value : '' })
      .then(function (d) { say($('s-msg'), d.updated ? '고친 내용으로 다시 제출했습니다.' : '제출했습니다. 아래 함께 보기에 올라갔습니다.', true); return loadMe(state.me.name, state.pin, null); })
      .then(loadBoard)
      .catch(function (e) { say($('s-msg'), e.message, false); });
  });

  $('c-vote-btn').addEventListener('click', function () {
    if (!state.me) return;
    call('act', { action: 'vote', name: state.me.name, pin: state.pin, picks: state.picks })
      .then(function () { say($('v-msg'), '투표했습니다. 닫히기 전까지 다시 고를 수 있습니다.', true); return loadMe(state.me.name, state.pin, null); })
      .then(loadBoard)
      .catch(function (e) { say($('v-msg'), e.message, false); });
  });

  var saved = recall();
  if (saved) { $('l-name').value = saved.name; loadMe(saved.name, saved.pin, null); }
  loadBoard();
  // 탭이 보이는 동안 20초마다 새로 고침 (다른 사람 제출·투표 현황)
  setInterval(function () {
    if (document.visibilityState === 'visible' && location.hash === '#contest') loadBoard();
  }, 20000);
})();
