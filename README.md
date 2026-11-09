# fire-ai-classroom

소방학교 AI 강의의 **교육생용 강의 사이트**입니다. Vercel에 연결되어 `main` 에 올리면 자동으로 배포됩니다.

- 주소: **https://www.jg-sobang.com/** (Vercel 기본 주소 `fire-ai-classroom.vercel.app` 도 동작)

| 경로 | 내용 |
|---|---|
| `index.html` | 강의 목록 첫 화면 |
| `fire-ai/` | 생성형 AI 업무 활용 입문 |
| `fire-ai-2/` | 생성형 AI 2차 교육(4시간) 교육생 자료: 사전 학습·실습지. `instructor/2차-사전학습.md`, `instructor/2차-실습지.md` 를 고친 뒤 `instructor/build-fire-ai-2.js` 로 다시 만듦 (방법은 파일 맨 위) |
| `api/fire-contest/` | 2차 공모 서버 함수: `board`(현황·결과 조회), `act`(참가 등록·산출물 제출·투표), `admin`(강사: 단계 열고 닫기·자격 미달 빼기). 퀴즈와 같은 저장소(Upstash Redis)와 `QUIZ_ADMIN_KEY` 를 씀. 강사 관리 화면은 `fire-ai-2/admin.html` |
| `instructor/` | 강사용 자료(2차 계획안·흐름도·심사 기준)와 2차 원본. `.vercelignore` 로 배포에서 뺌 |
| `ai-literacy/` | AI 리터러시 · 웹 서비스의 뿌리 (교육생용). `skydiver846/ai-literacy-course-site` 저장소에서 `node build-student.mjs ../fire-ai-classroom/ai-literacy --api ../fire-ai-classroom/api` 로 만든 결과물이라 직접 고치지 않음. 강사용은 Claude 아티팩트로 따로 둠 |
| `api/quiz/` | AI 리터러시 강의 후 퀴즈의 서버 함수(제출·채점, 결과 공유판, 강사 관리). 위와 같은 방법으로 만들어짐. Vercel Storage(Upstash Redis)와 환경 변수 `QUIZ_ADMIN_KEY` 가 필요 (방법은 `ai-literacy-course-site` README) |
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
