// /api/fire-contest/act
//   GET  누구나 보는 공모 현황판: 단계(제출·투표·결과 공개), 제출된 산출물, 참가·투표 인원, (결과 공개 뒤) 득표순.
//        비밀번호·누가 누구에게 투표했는지는 내보내지 않습니다.
//   POST 참가자가 하는 일 네 가지
//   { action: 'register', name, dept, pin }                    참가 등록 (이름 + 4자리 비밀번호)
//   { action: 'submit',   name, pin, title, url, intro, track } 산출물 제출·고치기 (제출이 열려 있을 때)
//   { action: 'vote',     name, pin, picks: [id, id, id] }       동료 투표·고치기 (투표가 열려 있을 때, 자기 작품 제외 3개)
//   { action: 'mine',     name, pin }                            내 제출과 내 투표 다시 보기
//   { action: 'enter',    name, pin }                            처음이면 등록, 아니면 로그인 (교안 화면은 이것만 씀)
const { redis, toObject, readBody, send, fail } = require('../_lib/store');
const R = require('./_rules');

// 이름 + 비밀번호 확인. 틀리면 횟수를 세고, 너무 많이 틀리면 잠급니다.
async function login(name, pin) {
  const id = R.keyOf(name);
  if (!id) return { error: '이름을 적어 주세요.' };
  if (!R.validPin(pin)) return { error: '비밀번호는 숫자 4자리입니다.' };
  const [raw, fails] = await redis([['HGET', R.PEOPLE, id], ['HGET', R.FAILS, id]]);
  if (!raw) return { error: '등록되지 않은 이름입니다. 먼저 참가 등록을 해 주세요.' };
  if (Number(fails || 0) >= R.MAX_FAILS) return { error: '비밀번호를 여러 번 틀려 잠겼습니다. 강사에게 풀어 달라고 해 주세요.' };
  const person = JSON.parse(raw);
  if (person.pin !== R.hashPin(name, pin)) {
    await redis([['HINCRBY', R.FAILS, id, 1]]);
    return { error: '비밀번호가 맞지 않습니다.' };
  }
  if (fails) await redis([['HDEL', R.FAILS, id]]);
  return { id, person };
}

async function board(req, res) {
  try {
    const [people, works, votes, flags, excluded] = (await redis([
      ['HGETALL', R.PEOPLE], ['HGETALL', R.WORKS], ['HGETALL', R.VOTES], ['HGETALL', R.FLAGS], ['HGETALL', R.EXCLUDED]
    ])).map(toObject);
    const f = { submit: flags.submit === '1', vote: flags.vote === '1', result: flags.result === '1' };
    const list = Object.entries(works).map(([id, v]) => {
      const w = JSON.parse(v);
      const p = people[id] ? JSON.parse(people[id]) : { name: id, dept: '' };
      return { id, name: p.name, dept: p.dept, title: w.title, url: w.url, intro: w.intro, track: w.track,
        updatedAt: w.updatedAt, excluded: Boolean(excluded[id]), reason: excluded[id] || '' };
    }).sort((a, b) => a.updatedAt - b.updatedAt);

    let results = null;
    if (f.result) {
      const count = Object.fromEntries(list.map(w => [w.id, 0]));
      Object.values(votes).forEach(v => JSON.parse(v).picks.forEach(id => { if (id in count) count[id] += 1; }));
      results = list.filter(w => !w.excluded).map(w => ({ id: w.id, votes: count[w.id] }))
        .sort((a, b) => b.votes - a.votes);
      // 같은 득표는 같은 순위
      results.forEach((r, i) => { r.rank = i && r.votes === results[i - 1].votes ? results[i - 1].rank : i + 1; });
    }
    return send(res, 200, {
      flags: f, picks: R.PICKS, tracks: R.TRACKS,
      people: Object.keys(people).length, voted: Object.keys(votes).length,
      works: list, results, updatedAt: Date.now()
    });
  } catch (error) {
    return fail(res, error);
  }
}

module.exports = async (req, res) => {
  if (req.method === 'GET') return board(req, res);
  if (req.method !== 'POST') return send(res, 405, { error: 'GET 또는 POST로만 받습니다.' });
  try {
    const b = readBody(req);
    const action = String(b.action || '');

    // 이름 + 비밀번호 하나로 시작: 처음 보는 이름이면 등록하고, 있는 이름이면 비밀번호를 확인합니다.
    if (action === 'enter') {
      const name = R.clean(b.name, 20), id = R.keyOf(b.name);
      if (!name) return send(res, 400, { error: '이름을 적어 주세요.' });
      if (!R.validPin(b.pin)) return send(res, 400, { error: '비밀번호는 숫자 4자리입니다.' });
      const [old, count] = await redis([['HGET', R.PEOPLE, id], ['HLEN', R.PEOPLE]]);
      if (!old) {
        if (count >= R.MAX_PEOPLE) return send(res, 429, { error: '등록이 너무 많습니다. 강사에게 알려 주세요.' });
        const [made] = await redis([['HSETNX', R.PEOPLE, id, JSON.stringify({ name, dept: '', pin: R.hashPin(name, b.pin), at: Date.now() })]]);
        if (Number(made) === 1) return send(res, 200, { ok: true, id, name, dept: '', work: null, picks: [], created: true });
        // 같은 순간 같은 이름이 먼저 등록됐으면 아래 로그인으로 확인
      }
    }

    if (action === 'register') {
      const name = R.clean(b.name, 20), dept = R.clean(b.dept, 30), id = R.keyOf(b.name);
      if (!name || !dept) return send(res, 400, { error: '이름과 소속을 모두 적어 주세요.' });
      if (!R.validPin(b.pin)) return send(res, 400, { error: '비밀번호는 숫자 4자리로 정해 주세요.' });
      const [old, count] = await redis([['HGET', R.PEOPLE, id], ['HLEN', R.PEOPLE]]);
      if (old) return send(res, 409, { error: '이미 등록된 이름입니다. 본인이면 아래 칸에서 이름과 비밀번호로 이어서 하세요. 같은 이름의 다른 분이면 이름 뒤에 소속을 붙여 등록해 주세요.' });
      if (count >= R.MAX_PEOPLE) return send(res, 429, { error: '등록이 너무 많습니다. 강사에게 알려 주세요.' });
      await redis([['HSET', R.PEOPLE, id, JSON.stringify({ name, dept, pin: R.hashPin(name, b.pin), at: Date.now() })]]);
      return send(res, 200, { ok: true, name });
    }

    const who = await login(b.name, b.pin);
    if (who.error) return send(res, 401, { error: who.error });
    const flags = toObject((await redis([['HGETALL', R.FLAGS]]))[0]);

    if (action === 'mine' || action === 'enter') {
      const [work, vote] = await redis([['HGET', R.WORKS, who.id], ['HGET', R.VOTES, who.id]]);
      return send(res, 200, { ok: true, id: who.id, name: who.person.name, dept: who.person.dept,
        work: work ? JSON.parse(work) : null, picks: vote ? JSON.parse(vote).picks : [] });
    }

    if (action === 'submit') {
      if (flags.submit !== '1') return send(res, 403, { error: '지금은 산출물 제출이 닫혀 있습니다.' });
      const title = R.clean(b.title, 40), intro = R.clean(b.intro, 120), url = R.validUrl(b.url);
      const track = R.TRACKS[b.track] ? String(b.track) : '';
      if (!title) return send(res, 400, { error: '도구 이름을 적어 주세요.' });
      if (!url) return send(res, 400, { error: '배포 주소를 https:// 로 시작하는 전체 주소로 적어 주세요. 예) https://gear-check-hong.vercel.app' });
      if (!intro) return send(res, 400, { error: '한 줄 소개를 적어 주세요.' });
      if (!track) return send(res, 400, { error: '연동(DB / API / 둘 다)을 골라 주세요. 연동은 필수입니다.' });
      const old = (await redis([['HGET', R.WORKS, who.id]]))[0];
      const now = Date.now();
      await redis([['HSET', R.WORKS, who.id, JSON.stringify({ title, url, intro, track, at: old ? JSON.parse(old).at : now, updatedAt: now })]]);
      return send(res, 200, { ok: true, updated: Boolean(old) });
    }

    if (action === 'vote') {
      if (flags.vote !== '1') return send(res, 403, { error: '지금은 투표가 닫혀 있습니다.' });
      const [works, excluded] = (await redis([['HGETALL', R.WORKS], ['HGETALL', R.EXCLUDED]])).map(toObject);
      const candidates = Object.keys(works).filter(id => id !== who.id && !excluded[id]);
      const need = Math.min(R.PICKS, candidates.length);
      const picks = [...new Set(Array.isArray(b.picks) ? b.picks.map(String) : [])];
      if (picks.includes(who.id)) return send(res, 400, { error: '내 작품에는 투표할 수 없습니다.' });
      if (picks.some(id => !candidates.includes(id))) return send(res, 400, { error: '투표할 수 없는 작품이 들어 있습니다. 새로고침한 뒤 다시 골라 주세요.' });
      if (picks.length !== need) return send(res, 400, { error: `작품을 정확히 ${need}개 골라 주세요.` });
      await redis([['HSET', R.VOTES, who.id, JSON.stringify({ picks, at: Date.now() })]]);
      return send(res, 200, { ok: true });
    }

    return send(res, 400, { error: '알 수 없는 작업입니다.' });
  } catch (error) {
    return fail(res, error);
  }
};
