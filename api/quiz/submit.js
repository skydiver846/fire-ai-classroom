// POST /api/quiz/submit  { quiz, name, answers: [원래 선택지 번호, …] }
// 서버에서 채점하고, 한 사람(이름)당 퀴즈마다 첫 제출만 저장합니다.
const { redis, readBody, send, fail, PREFIX } = require('../_lib/store');
const { keys, where } = require('../_lib/quiz-key');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: '제출은 POST로만 받습니다.' });
  try {
    const { quiz, name, answers } = readBody(req);
    const key = keys[quiz];
    if (!key) return send(res, 400, { error: '알 수 없는 퀴즈입니다.' });

    const display = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!display) return send(res, 400, { error: '이름을 입력해 주세요.' });
    const valid = Array.isArray(answers) && answers.length === key.length
      && answers.every(a => Number.isInteger(a) && a >= 0 && a <= 3);
    if (!valid) return send(res, 400, { error: '모든 문항에 답한 뒤 제출해 주세요.' });

    const field = display.toLocaleLowerCase('ko');
    const hash = `${PREFIX}:sub:${quiz}`;
    const record = { name: display, answers, score: answers.filter((a, i) => a === key[i]).length, total: key.length, at: Date.now() };
    const [created] = await redis([['HSETNX', hash, field, JSON.stringify(record)]]);

    // 이미 같은 이름으로 낸 기록이 있으면 그 결과를 돌려줍니다(다시 내도 점수는 바뀌지 않음).
    const saved = created ? record : JSON.parse((await redis([['HGET', hash, field]]))[0]);
    const correct = saved.answers.map((a, i) => a === key[i]);
    return send(res, 200, {
      already: !created,
      name: saved.name,
      score: saved.score,
      total: saved.total,
      correct,
      // 틀린 문항만 "본문에서 다시 볼 곳"을 알려 줍니다(정답 번호는 알려 주지 않음).
      review: correct.map((ok, i) => (ok ? null : where[quiz][i]))
    });
  } catch (error) {
    return fail(res, error);
  }
};
