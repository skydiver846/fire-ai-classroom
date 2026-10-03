# fire-ai-classroom

소방학교 AI 강의의 **교육생용 강의 사이트**입니다. Vercel에 연결되어 `main` 에 올리면 자동으로 배포됩니다.

- 주소: **https://www.jg-sobang.com/** (Vercel 기본 주소 `fire-ai-classroom.vercel.app` 도 동작)

| 경로 | 내용 |
|---|---|
| `index.html` | 강의 목록 첫 화면 |
| `fire-ai/` | 생성형 AI 업무 활용 입문 |
| `fire-ai-free/` | 같은 강의의 **무료 계정판** 보존본 (Claude Team 전환 전, 목록에는 링크하지 않음) |
| `network-check.html` | 강사용 강의장 PC 접속 점검 (목록에는 링크하지 않음) |

## 이 저장소의 파일은 직접 고치지 않습니다

`fire-ai/` 는 `skydiver846/manage` 저장소의 강의자료(`lecture/`)로 **자동 생성**한 결과물입니다.
내용을 고칠 때는 `manage` 에서 고친 뒤 다시 만들어 이 폴더에 덮어씁니다.

```bash
cd manage/tools/classroom && npm run build          # manage/classroom-site 생성
rsync -a --delete ../../classroom-site/ ../../../fire-ai-classroom/fire-ai/
```

## 강의 추가

새 강의는 폴더를 하나 더 만들고 `index.html` 목록에 카드를 하나 추가합니다. 저장소나 Vercel 프로젝트를 새로 만들 필요가 없습니다.
