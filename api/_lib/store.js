// 결과 저장소(Upstash Redis REST) 연결. Vercel 대시보드에서 저장소를 연결하면 아래 환경 변수가 자동으로 생깁니다.
const BASE = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// 이 강의의 데이터는 모두 이 접두어 아래에 둡니다(같은 저장소를 다른 강의와 함께 써도 섞이지 않게).
const PREFIX = 'ail';

class StoreError extends Error {}

// 여러 명령을 한 번에 보냅니다. 예) redis([['HGET', key, field], ['HSET', key, field, value]])
async function redis(commands) {
  if (!BASE || !TOKEN) throw new StoreError('결과 저장소가 아직 연결되지 않았습니다. 강사에게 알려 주세요.');
  const response = await fetch(`${BASE.replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands)
  });
  if (!response.ok) throw new StoreError(`결과 저장소가 응답하지 않습니다 (${response.status}). 잠시 뒤 다시 시도해 주세요.`);
  const data = await response.json();
  return data.map(item => {
    if (item.error) throw new StoreError(`결과 저장소 오류: ${item.error}`);
    return item.result;
  });
}

// HGETALL 결과([필드, 값, 필드, 값 …])를 객체로
function toObject(flat) {
  const out = {};
  for (let i = 0; flat && i < flat.length; i += 2) out[flat[i]] = flat[i + 1];
  return out;
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (_) { return {}; }
}

function send(res, status, data) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(data);
}

function fail(res, error) {
  if (error instanceof StoreError) return send(res, 503, { error: error.message });
  console.error(error);
  return send(res, 500, { error: '서버에서 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요.' });
}

module.exports = { redis, toObject, readBody, send, fail, PREFIX };
