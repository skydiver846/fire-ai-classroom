// POST /api/fire-contest/admin  { key, action, ... }  강사 전용 (Vercel 환경 변수 QUIZ_ADMIN_KEY, 퀴즈·수요조사와 같은 값)
//   state                       전체 보기: 단계, 참가자, 산출물, 투표(누가 무엇을 골랐는지), 득표
//   set     { flag, on }        단계 열고 닫기: flag = submit | vote | result
//   exclude { id, reason }      참가 자격 미달로 투표 대상에서 빼기 / include { id } 되돌리기
//   unlock  { id }              비밀번호 잠금 풀기 / reset-pin { id, pin } 비밀번호 바꿔 주기
//   delete-person { id }        참가자와 그 산출물·투표 지우기
//   delete-all                  공모 자료 전부 지우기 (리허설 뒤 정리용)
const { redis, toObject, readBody, send, fail } = require('../_lib/store');
const R = require('./_rules');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST로만 받습니다.' });
  const adminKey = process.env.QUIZ_ADMIN_KEY;
  if (!adminKey) return send(res, 503, { error: '관리 비밀번호(QUIZ_ADMIN_KEY)가 아직 설정되지 않았습니다.' });
  try {
    const b = readBody(req);
    if (String(b.key || '') !== adminKey) return send(res, 401, { error: '관리 비밀번호가 맞지 않습니다.' });
    const id = String(b.id || '');

    switch (b.action) {
      case 'state': {
        const [people, works, votes, flags, fails, excluded] = (await redis([
          ['HGETALL', R.PEOPLE], ['HGETALL', R.WORKS], ['HGETALL', R.VOTES], ['HGETALL', R.FLAGS], ['HGETALL', R.FAILS], ['HGETALL', R.EXCLUDED]
        ])).map(toObject);
        const count = {};
        Object.values(votes).forEach(v => JSON.parse(v).picks.forEach(p => { count[p] = (count[p] || 0) + 1; }));
        const rows = Object.entries(people).map(([pid, v]) => {
          const p = JSON.parse(v);
          return { id: pid, name: p.name, dept: p.dept, at: p.at, locked: Number(fails[pid] || 0) >= R.MAX_FAILS,
            work: works[pid] ? JSON.parse(works[pid]) : null, picks: votes[pid] ? JSON.parse(votes[pid]).picks : [],
            votes: count[pid] || 0, excluded: excluded[pid] || '' };
        }).sort((a, b) => a.at - b.at);
        return send(res, 200, { ok: true, flags, rows, tracks: R.TRACKS });
      }
      case 'set': {
        if (!['submit', 'vote', 'result'].includes(b.flag)) return send(res, 400, { error: 'flag는 submit, vote, result 중 하나입니다.' });
        await redis([['HSET', R.FLAGS, b.flag, b.on ? '1' : '0']]);
        return send(res, 200, { ok: true });
      }
      case 'exclude':
        await redis([['HSET', R.EXCLUDED, id, R.clean(b.reason, 60) || '참가 자격 미달']]);
        return send(res, 200, { ok: true });
      case 'include':
        await redis([['HDEL', R.EXCLUDED, id]]);
        return send(res, 200, { ok: true });
      case 'unlock':
        await redis([['HDEL', R.FAILS, id]]);
        return send(res, 200, { ok: true });
      case 'reset-pin': {
        if (!R.validPin(b.pin)) return send(res, 400, { error: '새 비밀번호는 숫자 4자리입니다.' });
        const raw = (await redis([['HGET', R.PEOPLE, id]]))[0];
        if (!raw) return send(res, 404, { error: '없는 참가자입니다.' });
        const p = JSON.parse(raw);
        await redis([['HSET', R.PEOPLE, id, JSON.stringify({ ...p, pin: R.hashPin(p.name, b.pin) })], ['HDEL', R.FAILS, id]]);
        return send(res, 200, { ok: true });
      }
      case 'delete-person':
        await redis([['HDEL', R.PEOPLE, id], ['HDEL', R.WORKS, id], ['HDEL', R.VOTES, id], ['HDEL', R.FAILS, id], ['HDEL', R.EXCLUDED, id]]);
        return send(res, 200, { ok: true });
      case 'delete-all':
        await redis([['DEL', R.PEOPLE, R.WORKS, R.VOTES, R.FLAGS, R.FAILS, R.EXCLUDED]]);
        return send(res, 200, { ok: true });
      default:
        return send(res, 400, { error: '알 수 없는 작업입니다.' });
    }
  } catch (error) {
    return fail(res, error);
  }
};
