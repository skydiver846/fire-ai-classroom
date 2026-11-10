// GET /api/fire?sido=서울[&date=YYYYMMDD]  강사 공용 화재 현황 주소 (2차 교육 API 트랙 예비 경로)
// 공공데이터포털 서비스 키를 받지 못한 교육생이, 키 없이 이 주소에서 소방청 화재정보서비스의
// "시도단위 화재발생현황"(그날 시도별 화재 접수 · 진행 · 상황종료 건수)을 받아 씁니다.
// 키는 Vercel 환경 변수 DATA_GO_KR_KEY(소방청_화재정보서비스 일반 인증키)에만 있고 응답에 넣지 않습니다.
// 교육생 화면(다른 주소, ○○.vercel.app)에서도 부를 수 있게 CORS를 열고, 10분 동안 Vercel CDN에 캐시해 하루 호출 한도를 아낍니다.
const ENDPOINT = 'https://apis.data.go.kr/1661000/FireInformationService/getOcBysidoFireSmrzPcnd';
// 짧은 이름 → 응답의 시도 이름(SIDO_NM)에 들어 있을 글자들
const SIDO = {
  서울: ['서울'], 부산: ['부산'], 대구: ['대구'], 인천: ['인천'], 광주: ['광주'], 대전: ['대전'], 울산: ['울산'], 세종: ['세종'],
  경기: ['경기'], 강원: ['강원'], 충북: ['충북', '충청북'], 충남: ['충남', '충청남'], 전북: ['전북', '전라북'], 전남: ['전남', '전라남'],
  경북: ['경북', '경상북'], 경남: ['경남', '경상남'], 제주: ['제주'], 전체: null
};
const n = v => (v === undefined || v === null || v === '' ? null : Number(v));

function kstDate(daysAgo) {
  const d = new Date(Date.now() + 9 * 3600e3 - daysAgo * 86400e3);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

async function load(key, ymd) {
  const url = new URL(ENDPOINT);
  url.searchParams.set('serviceKey', key);   // 키를 그대로 넣으면 여기서 알맞게 인코딩됨 (두 줄 키라면 Decoding 쪽)
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('numOfRows', '100');
  url.searchParams.set('resultType', 'json');
  url.searchParams.set('ocrn_ymd', ymd);
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch (_) {
    const msg = (text.match(/<returnAuthMsg>([^<]+)/) || text.match(/<resultMsg>([^<]+)/) || [])[1];
    throw { status: 502, error: msg ? '공공데이터포털 오류: ' + msg : '공공데이터포털 응답을 읽지 못했습니다.' };
  }
  const root = data.response || data;
  const header = root.header || {};
  if (header.resultCode && header.resultCode !== '00') throw { status: 502, error: '공공데이터포털 오류: ' + header.resultMsg };
  let items = (root.body || {}).items || [];
  if (!Array.isArray(items)) items = [].concat(items.item || []);
  return items;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const reply = (status, data, cache) => {
    res.setHeader('Cache-Control', cache ? 'public, s-maxage=600, stale-while-revalidate=120' : 'no-store');
    res.status(status).json(data);
  };
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return reply(405, { error: 'GET으로만 조회합니다.' });

  const q = req.query || {};
  const sido = String(q.sido || '전체');
  if (!(sido in SIDO)) return reply(400, { error: 'sido 값이 올바르지 않습니다. 예) 서울, 경기, 부산, 전체', sidoList: Object.keys(SIDO) });
  const asked = q.date ? String(q.date) : '';
  if (asked && !/^20\d{6}$/.test(asked)) return reply(400, { error: 'date 는 20261118 처럼 8자리 날짜로 넣습니다.' });
  const key = process.env.DATA_GO_KR_KEY;
  if (!key) return reply(500, { error: '서비스 키가 설정되지 않았습니다. 강사에게 알려 주세요.' });

  try {
    // 날짜를 안 주면 오늘(한국 시각). 오늘 자료가 아직 없으면 어제 자료를 줍니다.
    let date = asked || kstDate(0);
    let raw = await load(key, date);
    if (!asked && raw.length === 0) { date = kstDate(1); raw = await load(key, date); }
    const words = SIDO[sido];
    const items = raw
      .filter(i => !words || words.some(w => String(i.SIDO_NM || '').includes(w)))
      .map(i => ({
        sido: i.SIDO_NM,                  // 시도 이름
        date: i.OCRN_YMD || date,         // 발생 일자
        received: n(i.FIRE_RCPT_MNB),     // 화재 접수
        ongoing: n(i.FIRE_PROG_MNB),      // 진행 중
        ended: n(i.STN_END_MNB),          // 상황 종료
        selfExtinguished: n(i.SLF_EXTSH_MNB), // 자체 진화
        falseReport: n(i.FALS_DCLR_MNB),  // 허위 신고
        misreport: n(i.FLSRP_PRCS_MNB)    // 오보 처리
      }));
    return reply(200, { source: '공공데이터포털 · 소방청 화재정보서비스(시도단위 화재발생현황)', sido, date, items }, true);
  } catch (e) {
    if (e && e.status) return reply(e.status, { error: String(e.error).replace(key, '***') });
    return reply(504, { error: '공공데이터포털이 제때 답하지 않았습니다. 잠시 뒤 다시 시도해 주세요.' });
  }
};
