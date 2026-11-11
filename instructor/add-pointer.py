# 사이트 공통 큰 커서 · 블록 강조(/assets/pointer.js)를 페이지에 붙이거나 버전을 새로 고칩니다.
# 사용: python3 instructor/add-pointer.py   (2차 교안은 build-fire-ai-2.js 가 붙임)
import hashlib, glob, os, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
v = hashlib.md5(open(os.path.join(ROOT, 'assets/pointer.js'), 'rb').read()).hexdigest()[:8]
tag = f'<script src="/assets/pointer.js?v={v}"></script>'
pages = ['index.html', 'network-check.html', 'pen/index.template.html', 'pen/index.html', 'ai-literacy/index.html',
         'fire-ai-2/check.html', 'fire-ai-2/admin.html'] + sorted(glob.glob('fire-ai/*.html', root_dir=ROOT))
for p in pages:
    f = os.path.join(ROOT, p); s = open(f, encoding='utf8').read()
    s2 = re.sub(r'<script src="/assets/pointer\.js(\?v=\w+)?"></script>', tag, s)
    if s2 == s and tag not in s:
        i = s.rindex('</body>'); s2 = s[:i] + tag + '\n' + s[i:]
    if s2 != s: open(f, 'w', encoding='utf8').write(s2); print('updated', p)
