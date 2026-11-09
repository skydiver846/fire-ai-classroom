// instructor/*.md 중 교육생용(사전 학습, 실습지)과 공모 · 투표 탭(contest.part.html)을 fire-ai-2/index.html 한 장으로 만듭니다.
// 공모 · 투표 탭의 동작은 fire-ai-2/contest.js, 서버는 api/fire-contest/, 강사 관리는 fire-ai-2/admin.html 입니다.
// 사용: 빈 폴더에서 npm i marked@12.0.2 → NODE_PATH=그폴더/node_modules node instructor/build-fire-ai-2.js
const fs = require('fs'), path = require('path'), { marked } = require('marked');
const root = path.join(__dirname, '..');
const docs = [['prework', '사전 학습', '2차-사전학습.md'], ['workbook', '실습지', '2차-실습지.md']];
let out = '';
for (const [id, label, file] of docs) {
  let h = marked.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'), { gfm: true });
  h = h.replace(/<a href="http/g, '<a target="_blank" rel="noopener" href="http')
       .replace(/<table>/g, '<div class="tbl"><table>').replace(/<\/table>/g, '</table></div>')
       .replace(/<pre>/g, '<pre tabindex="0">');
  out += `<article id="doc-${id}" class="doc" data-id="${id}" hidden>\n${h}</article>\n`;
}
const tabs = docs.map(d => `<a class="tab" href="#${d[0]}" data-id="${d[0]}">${d[1]}</a>`).join('');
const tpl = fs.readFileSync(path.join(__dirname, 'fire-ai-2.template.html'), 'utf8');
fs.writeFileSync(path.join(root, 'fire-ai-2', 'index.html'), tpl.replace('@@TABS@@', () => tabs).replace('@@DOCS@@', () => out).replace('@@CONTEST@@', () => fs.readFileSync(path.join(__dirname, 'contest.part.html'), 'utf8')));
console.log('fire-ai-2/index.html 생성');
