// GET /api/fire-contest/board  누구나 보는 공모 현황판
// 단계(제출·투표·결과 공개 여부), 제출된 산출물 목록, 참가·투표 인원, (결과 공개 뒤) 득표순 결과.
// 비밀번호·누가 누구에게 투표했는지는 내보내지 않습니다.
const { redis, toObject, send, fail } = require('../_lib/store');
const R = require('./_rules');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'GET으로만 조회합니다.' });
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
};
