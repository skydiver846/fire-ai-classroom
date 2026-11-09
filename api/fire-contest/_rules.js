// 2차 교육 공모(산출물 제출·동료 투표·결과 공개) 공통 규칙. 서버 함수 세 개(board, act, admin)가 함께 씁니다.
const crypto = require('crypto');

const PREFIX = 'f2';
const PEOPLE = `${PREFIX}:people`;   // 참가자: 이름 → { name, dept, pin(해시), at }
const WORKS = `${PREFIX}:works`;     // 산출물: 이름 → { title, url, intro, track, at, updatedAt }
const VOTES = `${PREFIX}:votes`;     // 투표: 투표자 이름 → { picks: [이름, 이름, 이름], at }
const FLAGS = `${PREFIX}:flags`;     // 단계: submit / vote / result = '1' 이면 열림
const FAILS = `${PREFIX}:fails`;     // 비밀번호 틀린 횟수 (이름별)
const EXCLUDED = `${PREFIX}:excluded`; // 참가 자격 미달로 투표 대상에서 뺀 산출물: 이름 → 사유

const MAX_PEOPLE = 60;   // 등록 상한 (장난 등록 방지)
const MAX_FAILS = 8;     // 비밀번호를 이만큼 틀리면 강사가 풀어 줄 때까지 잠김
const PICKS = 3;         // 1인 투표 수
const TRACKS = { db: 'DB (공용 장부)', api: 'API (공공데이터)', polish: '다듬기' };

const clean = (v, n) => String(v || '').trim().replace(/\s+/g, ' ').slice(0, n);
const keyOf = name => clean(name, 20).replace(/\s+/g, '').toLowerCase();
const hashPin = (name, pin) => crypto.createHash('sha256').update(`fire-ai-2|${keyOf(name)}|${pin}`).digest('hex');
const validPin = pin => /^\d{4}$/.test(String(pin || ''));

function validUrl(raw) {
  const s = clean(raw, 200);
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:') return '';
    return u.toString();
  } catch (_) { return ''; }
}

module.exports = { PEOPLE, WORKS, VOTES, FLAGS, FAILS, EXCLUDED, MAX_PEOPLE, MAX_FAILS, PICKS, TRACKS, clean, keyOf, hashPin, validPin, validUrl };
