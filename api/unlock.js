// POST /api/unlock { code }  강의 전 비공개 자료(2차 교안 /fire-ai-2/) 열기
// 접속 코드가 맞으면 쿠키를 심고, vercel.json 의 redirects 가 이 쿠키가 없는 요청을 접속 코드 화면(/gate.html)으로 보냅니다.
// 코드는 Vercel 환경 변수 LD_ACCESS_CODE 로 바꿀 수 있고(강의 설계 워크숍과 같은 코드), 없으면 기본 코드(해시)로 확인합니다.
const crypto = require('crypto');
const DEFAULT_HASH = '2147af49c37b1929b011acaa4596173831cfc80a105c2d4b444deef036dc95f7';
const COOKIE = 'jg_gate=DYbzA1yFnrw3amJiA9UZNICv';   // vercel.json 의 값과 같아야 함
const sha = t => crypto.createHash('sha256').update(String(t)).digest('hex');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST로만 받습니다.' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  const code = String((body && body.code) || '').trim();
  const ok = process.env.LD_ACCESS_CODE ? code === process.env.LD_ACCESS_CODE : sha(code) === DEFAULT_HASH;
  if (!ok) return res.status(401).json({ error: code ? '접속 코드가 맞지 않습니다.' : '접속 코드를 넣어 주세요.' });
  res.setHeader('Set-Cookie', `${COOKIE}; Path=/; Max-Age=${60 * 60 * 24 * 60}; Secure; SameSite=Lax`);
  return res.status(200).json({ ok: true });
};
