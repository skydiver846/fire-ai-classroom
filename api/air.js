// GET /api/air?sido=서울  강사 공용 대기질 주소 (2차 교육 API 트랙 예비 경로)
// 공공데이터포털 서비스 키를 받지 못한 교육생이, 키 없이 이 주소에서 에어코리아 시도별 실시간 측정정보를 받아 씁니다.
// 키는 Vercel 환경 변수 DATA_GO_KR_KEY(에어코리아 일반 인증키, Decoding)에만 있고 응답에 넣지 않습니다.
// 교육생 화면(다른 주소, ○○.vercel.app)에서도 부를 수 있게 CORS를 열고, 10분 동안 Vercel CDN에 캐시해 하루 호출 한도를 아낍니다.
const SIDO = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '세종'];
const ENDPOINT = 'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const reply = (status, data, cache) => {
    res.setHeader('Cache-Control', cache ? 'public, s-maxage=600, stale-while-revalidate=120' : 'no-store');
    res.status(status).json(data);
  };
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return reply(405, { error: 'GET으로만 조회합니다.' });

  const sido = String((req.query && req.query.sido) || '서울');
  if (!SIDO.includes(sido)) return reply(400, { error: 'sido 값이 올바르지 않습니다. 예) 서울, 경기, 부산', sidoList: SIDO });
  const key = process.env.DATA_GO_KR_KEY;
  if (!key) return reply(500, { error: '서비스 키가 설정되지 않았습니다. 강사에게 알려 주세요.' });

  const url = new URL(ENDPOINT);
  url.searchParams.set('serviceKey', key);   // Decoding 키를 넣으면 여기서 알맞게 인코딩됨
  url.searchParams.set('returnType', 'json');
  url.searchParams.set('sidoName', sido);
  url.searchParams.set('numOfRows', '100');
  url.searchParams.set('ver', '1.0');
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const text = await r.text();
    let body;
    try { body = JSON.parse(text); } catch (_) {
      return reply(502, { error: '공공데이터포털 응답을 읽지 못했습니다.', detail: text.slice(0, 200).replace(key, '***') });
    }
    const header = body && body.response && body.response.header;
    if (header && header.resultCode !== '00') return reply(502, { error: '공공데이터포털 오류: ' + header.resultMsg });
    const items = ((body.response.body || {}).items || []).map(i => ({
      station: i.stationName, time: i.dataTime, pm10: i.pm10Value, pm25: i.pm25Value, grade: i.khaiGrade
    }));
    return reply(200, { source: '공공데이터포털 · 한국환경공단 에어코리아', sido, items }, true);
  } catch (e) {
    return reply(504, { error: '공공데이터포털이 제때 답하지 않았습니다. 잠시 뒤 다시 시도해 주세요.' });
  }
};
