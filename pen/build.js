// 강사 판서 도구 묶기: pen-core.js 하나로 크롬 확장(ZIP) · 즐겨찾기 버튼(북마클릿) · 설치 안내 페이지를 만듭니다.
// 사용: 빈 폴더에서 npm i terser@5.31.0 → NODE_PATH=그폴더/node_modules node pen/build.js
// 결과: pen/extension/pen-core.js (복사), pen/jg-pen-extension.zip, pen/index.html (북마클릿 링크 포함)
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const { minify } = require('terser');
const DIR = __dirname;

// ── 아주 작은 ZIP 만들기 (외부 도구 없이, 압축 방식 deflate)
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
const NOW = new Date(), DOSDATE = ((NOW.getFullYear() - 1980) << 9) | ((NOW.getMonth() + 1) << 5) | NOW.getDate();
function zip(files) {   // files: [{ name, data(Buffer) }]
  const locals = [], centrals = []; let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8'), raw = f.data, comp = zlib.deflateRawSync(raw), crc = crc32(raw);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(0, 10); lh.writeUInt16LE(DOSDATE, 12); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, name, comp);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(0, 12); ch.writeUInt16LE(DOSDATE, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(offset, 42);
    centrals.push(ch, name);
    offset += 30 + name.length + comp.length;
  }
  const cd = Buffer.concat(centrals), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

(async () => {
  const core = fs.readFileSync(path.join(DIR, 'pen-core.js'), 'utf8');
  fs.writeFileSync(path.join(DIR, 'extension', 'pen-core.js'), core);
  const ext = ['manifest.json', 'background.js', 'pen-core.js', 'icon16.png', 'icon48.png', 'icon128.png'];
  fs.writeFileSync(path.join(DIR, 'jg-pen-extension.zip'),
    zip(ext.map(n => ({ name: 'jg-pen-tool/' + n, data: fs.readFileSync(path.join(DIR, 'extension', n)) }))));

  const min = (await minify(core, { compress: true, mangle: true, format: { comments: false } })).code;
  const bookmarklet = 'javascript:' + encodeURIComponent(min);
  const tpl = fs.readFileSync(path.join(DIR, 'index.template.html'), 'utf8');
  fs.writeFileSync(path.join(DIR, 'index.html'), tpl.replace('@@BOOKMARKLET@@', () => bookmarklet.replace(/"/g, '%22')));
  console.log('pen/: extension zip', fs.statSync(path.join(DIR, 'jg-pen-extension.zip')).size, 'bytes, bookmarklet', bookmarklet.length, 'chars');
})();
