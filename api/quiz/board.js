// GET /api/quiz/board  결과 공유판: 제출 현황, 문항별 정답률·선택 분포, 강의별 상위 3명(항상),
// (강사가 공개하면) 정답과 전체 상위 3명
// 개인 점수는 돌려주지 않습니다.
const { redis, toObject, send, fail, PREFIX } = require('../_lib/store');
const { keys } = require('../_lib/quiz-key');

const QUIZ_IDS = Object.keys(keys);

module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'GET으로만 조회합니다.' });
  try {
    const results = await redis([...QUIZ_IDS.map(id => ['HGETALL', `${PREFIX}:sub:${id}`]), ['HGETALL', `${PREFIX}:flags`]]);
    const flags = toObject(results.pop());
    const showAnswers = flags.answers === '1';
    const showTop = flags.top === '1';

    const people = new Map();
    const quizzes = {};
    QUIZ_IDS.forEach((id, qi) => {
      const subs = Object.values(toObject(results[qi])).map(text => JSON.parse(text));
      const counts = keys[id].map(() => [0, 0, 0, 0]);
      subs.forEach(sub => {
        sub.answers.forEach((a, i) => { counts[i][a] += 1; });
        const field = sub.name.toLocaleLowerCase('ko');
        const person = people.get(field) || { name: sub.name, done: {}, score: 0, total: 0, first: sub.at, last: sub.at };
        person.done[id] = true;
        person.score += sub.score;
        person.total += sub.total;
        person.first = Math.min(person.first, sub.at);
        person.last = Math.max(person.last, sub.at);
        people.set(field, person);
      });
      quizzes[id] = {
        submitted: subs.length,
        // 강의별 우수자(항상 공개): 그 퀴즈 점수가 높은 순, 같으면 먼저 제출한 순
        top: [...subs].sort((a, b) => b.score - a.score || a.at - b.at).slice(0, 3)
          .map(s => ({ name: s.name, score: s.score, total: s.total, at: s.at })),
        questions: counts.map((c, i) => ({
          counts: c,
          correctRate: subs.length ? Math.round((c[keys[id][i]] / subs.length) * 100) : null,
          answer: showAnswers ? keys[id][i] : null
        }))
      };
    });

    const list = [...people.values()];
    // 전체 우수자: 총점이 높은 순, 같으면 마지막 제출을 먼저 마친 순
    const top = showTop
      ? [...list].sort((a, b) => b.score - a.score || a.last - b.last).slice(0, 3)
          .map(p => ({ name: p.name, score: p.score, total: p.total, quizzes: Object.keys(p.done).length }))
      : null;

    return send(res, 200, {
      quizIds: QUIZ_IDS,
      people: list.sort((a, b) => a.first - b.first).map(p => ({ name: p.name, done: QUIZ_IDS.map(id => Boolean(p.done[id])) })),
      quizzes,
      showAnswers,
      top,
      updatedAt: Date.now()
    });
  } catch (error) {
    return fail(res, error);
  }
};
