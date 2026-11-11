// 강의 설계 워크숍 사이트(lesson-design/) 자료 만들기
// 원문: instructor/lesson-design/강의설계_*.md, 퀴즈: 이 파일의 QUIZ
// 결과: lesson-design/content.js, lesson-design/quiz.js, api/_lib/quiz-key-ld.js(서버 채점용 정답), lesson-design/index.html 의 ?v= 버전
// 사용: node instructor/lesson-design/build.js
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const SRC = __dirname, ROOT = path.join(__dirname, '..', '..'), OUT = path.join(ROOT, 'lesson-design');

// 퀴즈: answer 는 options 의 번호(0부터), where 는 틀렸을 때 "본문에서 다시 볼 곳"
const QUIZ = {
  topic: { title: '01 퀴즈 · 강의 주제 선정', warmup: '지금까지 들은 강의 중 "딱 내 얘기"였던 강의는 무엇이 달랐나요?', questions: [
    { q: '교육 요구(필요)를 가장 잘 설명한 것은?', options: ['강사가 가장 자신 있는 내용', '대상의 지금 모습과 바라는 모습의 차이', '기관이 정한 교육 시간', '요즘 유행하는 주제'], answer: 1, where: '1절 · 대상이 못 하는 일에서' },
    { q: '50분 한 차시 주제로 가장 알맞은 것은?', options: ['소방 전술의 이해', '화재 진압 전반', '신임 교육생의 공기호흡기 착용 전 점검 5단계', '소방 행정 총론'], answer: 2, where: '4절 · 주제 좁히기: 깔때기' },
    { q: '강의(교육)로 풀 문제가 아닌 것은?', options: ['점검 순서를 몰라 빠뜨리는 경우', '장비가 고장 나 있어서 못 하는 경우', '보고서 작성 요령을 몰라 헤매는 경우', '바뀐 지침 내용을 모르는 경우'], answer: 1, where: '5절 · 교육으로 풀 문제인가' }
  ] },
  goal: { title: '02 퀴즈 · 학습목표 쓰기', warmup: '"공기호흡기를 이해한다"가 목표라면, 강의가 끝나고 무엇을 보면 달성했다고 알 수 있을까요?', questions: [
    { q: '학습목표로 가장 알맞은 문장은?', options: ['공기호흡기의 중요성을 이해한다', '강사는 점검 순서를 설명한다', '교육생은 점검표를 보며 3분 안에 5단계 점검을 빠짐없이 수행한다', '안전 의식을 함양한다'], answer: 2, where: '1절 · 교육생이 할 수 있게 되는 것' },
    { q: 'ABCD 목표에서 D(Degree)가 뜻하는 것은?', options: ['대상', '행동', '조건', '기준 (얼마나 잘)'], answer: 3, where: '2절 · ABCD로 쓰기' },
    { q: '"적용" 수준 목표에 어울리는 동사는?', options: ['나열한다', '수행한다', '말한다', '외운다'], answer: 1, where: '3절 · 보이는 동사 쓰기' }
  ] },
  design: { title: '03 퀴즈 · 내용 구성과 시간 배분', warmup: '50분 강의에서 교육생의 집중이 가장 떨어지는 때는 언제일까요?', questions: [
    { q: '도입 단계에서 하는 일이 아닌 것은?', options: ['주의 끌기', '목표 알리기', '총괄평가 시험 보기', '이전 경험 떠올리기'], answer: 2, where: '2절 · 도입 · 전개 · 정리' },
    { q: '줌 강의에서 권하는 진행은?', options: ['50분 내내 설명하기', '7~10분마다 채팅 · 투표 같은 짧은 참여 넣기', '카메라를 모두 끄게 하기', '질문은 맨 끝에만 받기'], answer: 1, where: '3절 · 10분 규칙 (줌이라면 더 짧게)' },
    { q: '시간이 모자랄 때 먼저 뺄 내용은?', options: ['꼭 알아야 할 것', '알면 좋은 것', '목표와 바로 이어진 실습', '정리'], answer: 1, where: '1절 · 세 개의 원' }
  ] },
  method: { title: '04 퀴즈 · 교수방법과 평가', warmup: '교육생이 "할 수 있다"는 것을 확인하려면 시험지와 실연 중 무엇이 맞을까요?', questions: [
    { q: '"점검을 수행한다" 목표에 맞는 평가는?', options: ['객관식 시험', '체크리스트로 실기 관찰', '소감문', '출석 확인'], answer: 1, where: '1절 · 목표 · 방법 · 평가를 한 줄로' },
    { q: '수업 중간에 이해 정도를 보고 바로 고쳐 주는 평가는?', options: ['진단평가', '형성평가', '총괄평가', '상대평가'], answer: 1, where: '3절 · 언제 무엇을 확인하나' },
    { q: '목표 · 활동 · 평가가 같은 행동을 가리키게 맞추는 것은?', options: ['정렬 (일치)', '분산', '요약', '배치'], answer: 0, where: '1절 · 정렬' }
  ] }
};

const files = fs.readdirSync(SRC).filter(f => /^강의설계_\d\d_.+\.md$/.test(f)).sort();
const content = Object.fromEntries(files.map(f => [f, fs.readFileSync(path.join(SRC, f), 'utf8')]));
fs.writeFileSync(path.join(OUT, 'content.js'), `// instructor/lesson-design/build.js 가 강의설계_*.md 에서 만든 파일입니다. 직접 고치지 마세요.\nwindow.COURSE_CONTENT = ${JSON.stringify(content)};\n`);

const pub = Object.fromEntries(Object.entries(QUIZ).map(([id, z]) => [id, { title: z.title, warmup: z.warmup, questions: z.questions.map(q => ({ q: q.q, options: q.options })) }]));
fs.writeFileSync(path.join(OUT, 'quiz.js'), `// instructor/lesson-design/build.js 가 만든 파일입니다. 정답은 서버(api/_lib/quiz-key-ld.js)에만 있습니다.\nwindow.QUIZ = ${JSON.stringify(pub)};\n`);
const keys = Object.fromEntries(Object.entries(QUIZ).map(([id, z]) => [id, z.questions.map(q => q.answer)]));
const where = Object.fromEntries(Object.entries(QUIZ).map(([id, z]) => [id, z.questions.map(q => q.where)]));
fs.writeFileSync(path.join(ROOT, 'api', '_lib', 'quiz-key-ld.js'), `// instructor/lesson-design/build.js 가 만든 파일입니다. 강의 설계 워크숍 퀴즈의 정답과 "본문에서 다시 볼 곳".\nmodule.exports = { keys: ${JSON.stringify(keys)}, where: ${JSON.stringify(where)} };\n`);

// index.html 의 스크립트 · 스타일 주소에 내용 기준 버전(?v=) 달기
const ver = f => crypto.createHash('md5').update(fs.readFileSync(path.join(OUT, f))).digest('hex').slice(0, 8);
const idx = path.join(OUT, 'index.html');
let html = fs.readFileSync(idx, 'utf8');
html = html.replace(/(href|src)="([\w-]+\.(?:css|js))(?:\?v=\w+)?"/g, (m, attr, f) => fs.existsSync(path.join(OUT, f)) ? `${attr}="${f}?v=${ver(f)}"` : m);
fs.writeFileSync(idx, html);
console.log('lesson-design:', files.length, 'docs,', Object.keys(QUIZ).length, 'quizzes');
