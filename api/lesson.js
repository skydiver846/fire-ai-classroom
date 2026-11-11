// GET /api/lesson?code=…  강의 설계 워크숍 본문 (강의 전까지 비공개)
// 접속 코드가 맞을 때만 본문을 돌려줍니다. 코드는 Vercel 환경 변수 LD_ACCESS_CODE 로 바꿀 수 있고,
// 없으면 아래 기본 코드(해시)로 확인합니다. LD_PUBLIC=1 이면 코드 없이 공개합니다.
const crypto = require('crypto');
const CONTENT = require('./_lib/lesson-design-content');
const DEFAULT_HASH = '2147af49c37b1929b011acaa4596173831cfc80a105c2d4b444deef036dc95f7';
const sha = t => crypto.createHash('sha256').update(String(t)).digest('hex');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET으로만 받습니다.' });
  const code = String((req.query && req.query.code) || '').trim();
  const open = process.env.LD_PUBLIC === '1';
  const ok = open || (process.env.LD_ACCESS_CODE ? code === process.env.LD_ACCESS_CODE : sha(code) === DEFAULT_HASH);
  if (!ok) return res.status(401).json({ error: code ? '접속 코드가 맞지 않습니다.' : '접속 코드를 넣어 주세요.' });
  return res.status(200).json({ content: CONTENT });
};
