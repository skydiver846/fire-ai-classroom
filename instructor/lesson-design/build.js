// 강의 설계 워크숍 사이트(lesson-design/) 자료 만들기
// 원문: instructor/lesson-design/강의설계_*.md (퀴즈는 쓰지 않음)
// 결과: api/_lib/lesson-design-content.js (서버 함수 api/lesson.js 가 접속 코드 확인 뒤 내려줌), lesson-design/index.html 의 ?v= 버전
// 사용: node instructor/lesson-design/build.js
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const SRC = __dirname, ROOT = path.join(__dirname, '..', '..'), OUT = path.join(ROOT, 'lesson-design');


const files = fs.readdirSync(SRC).filter(f => /^강의설계_[0-9-]+_.+\.md$/.test(f)).sort();
const content = Object.fromEntries(files.map(f => [f, fs.readFileSync(path.join(SRC, f), 'utf8')]));
// 본문은 공개 폴더가 아니라 서버 함수(api/lesson.js)만 읽는 곳에 둡니다. 접속 코드가 맞아야 내려갑니다(강의 전 비공개).
fs.writeFileSync(path.join(ROOT, 'api', '_lib', 'lesson-design-content.js'), `// instructor/lesson-design/build.js 가 강의설계_*.md 에서 만든 파일입니다. 직접 고치지 마세요.\nmodule.exports = ${JSON.stringify(content)};\n`);
if (fs.existsSync(path.join(OUT, 'content.js'))) fs.unlinkSync(path.join(OUT, 'content.js'));


// index.html 의 스크립트 · 스타일 주소에 내용 기준 버전(?v=) 달기
const ver = f => crypto.createHash('md5').update(fs.readFileSync(path.join(OUT, f))).digest('hex').slice(0, 8);
const idx = path.join(OUT, 'index.html');
let html = fs.readFileSync(idx, 'utf8');
html = html.replace(/(href|src)="([\w-]+\.(?:css|js))(?:\?v=\w+)?"/g, (m, attr, f) => fs.existsSync(path.join(OUT, f)) ? `${attr}="${f}?v=${ver(f)}"` : m);
fs.writeFileSync(idx, html);
console.log('lesson-design:', files.length, 'docs');
