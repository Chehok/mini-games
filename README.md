# 🎮 Mini Games

설치도 빌드도 필요 없는 **순수 HTML/CSS/JS** 미니 게임 모음이에요. 외부 라이브러리·CDN·폰트를 쓰지 않고, 모든 링크는 상대 경로라서 GitHub Pages에 그대로 올리면 바로 동작해요.

배포 주소: <https://chehok.github.io/mini-games/>

## 게임 목록

허브(`index.html`)는 **1인용 / 다인용 / 진행 도구** 탭으로 나뉘어 있어요. 마지막으로 본 탭을 기억하고, `#solo` · `#party` · `#tools` 주소로 그 탭을 바로 열 수 있어요(주소의 해시가 저장된 탭보다 우선).

### 1인용

| 게임 | 폴더 | 설명 |
| --- | --- | --- |
| 🔢 스도쿠 | `sudoku/` | 정답이 하나뿐인 퍼즐을 즉석에서 생성. 쉬움/보통/어려움, 메모 모드, 같은 숫자·행·열·박스 강조, 실수 표시, 타이머 |
| 🧮 2048 | `2048/` | 방향키/WASD/스와이프, 부드러운 타일 애니메이션, 최고 점수 저장, 되돌리기(1회) |
| 💣 지뢰찾기 | `minesweeper/` | 초급 9×9(10) · 중급 16×16(40) · 고급 30×16(99, 모바일은 16×30). 첫 클릭 안전, 깃발 모드/길게 누르기/우클릭, 코딩(chording) |
| 🧩 슬라이드 퍼즐 | `slide-puzzle/` | 3×3 / 4×4 / 5×5. 항상 풀 수 있게 섞기, 탭 또는 방향키, 이동 횟수·타이머 |
| 🃏 카드 짝맞추기 | `memory/` | 이모지 카드, 4×3 / 4×4 / 6×4, 뒤집기 애니메이션, 난이도별 최고 기록 저장 |
| 🔤 워들 | `wordle/` | 영어 5글자 단어 6번 도전. 오늘의 단어(한국 시간 기준 하루 한 문제) / 무한 모드, 통계, 이모지 결과 복사 |
| 💡 초성 퀴즈 | `chosung/?mode=solo` | 초성만 보고 정답 맞히기. 10문제 라운드(문제당 30초), 속도·연속 정답 보너스, 힌트(-30점)와 첫 글자 힌트, 패스, 카테고리 선택, 최고 점수 저장, 이모지 결과 공유 |

### 다인용 (한 화면 · 한 휴대폰으로 여럿이)

| 게임 | 폴더 | 설명 |
| --- | --- | --- |
| 💡 초성 퀴즈 파티 모드 | `chosung/?mode=party` | 큰 초성 화면을 같이 보며 팀 대항(2~4팀, 이름 편집). 정답 보기, 팀별 +1, 다음 문제, 문제당 10/20/30초 타이머(끌 수 있음), 힌트 |
| 🤸 몸으로 말해요 | `charades/` | 말 없이 몸짓으로 설명. 팀 설정, 카테고리 선택, 60/90/120초, 패스 횟수 제한, 턴 요약, 최종 순위. 화면 꺼짐 방지(Wake Lock) |
| ⚡ 스피드 퀴즈 | `speed/` | 말로 설명해서 팀원이 맞히기. 몸으로 말해요와 같은 진행 방식, 성경 카테고리 포함 |
| 🚫 금지어 게임 | `taboo/` | 정답 카드와 금지어 3~5개. 정답 / 패스 / 금지어 사용(-1점), 팀전·타이머·점수판 |
| 🤥 라이어 게임 | `liar/` | 휴대폰을 돌려 주제어 확인(3~12명, 이름 선택). 기본 / 변형(라이어도 비슷한 다른 단어를 받음) 모드, 토론 타이머, 투표 도우미, 라이어 공개와 역전 기회 |
| ⭕ OX 퀴즈 | `ox/` | 발표자용 큰 화면 모드. 문제 → (선택) 카운트다운 → O/X 공개와 해설. 성경·일반 상식·과학·한국 문화·역사 |
| 🔮 텔레파시 게임 | `telepathy/` | 주제를 보고 종이에 답을 적고 동시에 공개. 타이머, 참가자별 점수 기록(선택) |
| 🧊 Icebreaker | (외부) | 별도 사이트(<https://chehok.github.io/icebreaker/>)로 연결되는 링크 카드 — 대화 주제 & 밸런스 게임 |

### 진행 도구

| 도구 | 폴더 | 설명 |
| --- | --- | --- |
| 🧰 진행 도구 | `tools/` | 탭 4개: 랜덤 팀 나누기(이름/태그 균형, 한 팀씩 공개, 결과 복사) · 사다리 타기(도착할 때 결과 공개) · 룰렛(글자가 바로 읽힘, 감속·틱) · 슬롯 순서/뽑기. 전체 화면 |

### 콘텐츠 규모 (교회 청소년·모임에서도 쓸 수 있도록 건전한 내용만)

- 초성 퀴즈 `chosung/words.js`: 일반 8개 카테고리(음식, 동물, 영화·드라마, 속담·사자성어, 나라·도시, 직업, 일상 사물, 브랜드·장소) + 성경 4개 카테고리(성경 인물, 성경 지명, 성경 사건·이야기, 성경 물건·용어, 개역개정 표기). 초성은 실행 시 한글 음절에서 계산해요.
- 몸으로 말해요 `charades/words.js`, 스피드 퀴즈 `speed/words.js`(+ 위 파일들의 단어 재사용), 금지어 `taboo/words.js`(성경 카드 포함), 라이어 `liar/words.js`, OX `ox/questions.js`(해설 포함), 텔레파시 `telepathy/words.js`.

## 폴더 구조

```
index.html          허브 페이지 (1인용 / 다인용 / 진행 도구 탭)
assets/style.css    공통 스타일 (색상 변수, 헤더, 버튼, 팝업, 칩, 팀 라운드 UI, 다크 모드)
assets/common.js    공통 유틸 (MG.store, MG.Timer, MG.toast, MG.dialog, MG.rng, MG.shuffle,
                    MG.beep, MG.vibrate, MG.wake(화면 꺼짐 방지), MG.copy, MG.share)
assets/teamround.js 팀 대항 진행 엔진 (몸으로 말해요 / 스피드 퀴즈 / 금지어 게임이 함께 사용)
<게임>/index.html   각 게임 (한 파일에 HTML + 게임별 CSS/JS)
tools/logic.js      진행 도구 계산 (사다리 순열, 룰렛 각도, 팀 배정. DOM 없음)
*/words.js          게임별 단어·문제 데이터 (wordle, chosung, charades, speed, taboo, liar, telepathy, ox/questions.js)
```

## 로컬에서 실행

빌드가 필요 없어요. 간단한 정적 서버만 있으면 돼요. (폴더 링크가 `index.html`로 연결되려면 서버가 필요해요.)

```bash
python3 -m http.server 8000
# http://localhost:8000/
```

## 새 게임 추가하는 법

1. 폴더를 만들고 `index.html`을 추가해요. (예: `snake/index.html`)
2. 기존 게임 페이지를 복사해서 시작하면 편해요. 필수 요소는 다음과 같아요.
   - `<meta name="viewport">`, `<title>`, `<meta name="description">`
   - `<link rel="stylesheet" href="../assets/style.css">` 와 `<script src="../assets/common.js"></script>` (**상대 경로**만 사용!)
   - `<body data-game="snake">` — 게임별 포인트 색상은 `assets/style.css`의 `body[data-game="..."] { --accent: ... }` 에 한 줄 추가해요.
   - 공통 헤더:
     ```html
     <header class="site-header">
       <a class="back" href="../">← 게임 목록</a>
       <h1>🐍 스네이크</h1>
       <span class="spacer"></span>
     </header>
     ```
3. 허브(`/index.html`)의 알맞은 구역(1인용 / 다인용 / 진행 도구) `.cards` 안에 카드 한 장을 추가해요.
   ```html
   <a class="card" href="snake/" style="--c:#14b8a6">
     <span class="emoji" aria-hidden="true">🐍</span>
     <div><h2>스네이크</h2><p>한 줄 설명</p></div>
   </a>
   ```
4. 이 README의 게임 목록 표에도 한 줄 추가해 주세요.
5. css/js를 추가·수정했다면 `node scripts/stamp-assets.js` 를 실행해요. 로컬 자산 주소의 `?v=` 를 파일 내용에 맞춥니다.

### 팁

- 공통 클래스: `.btn`, `.btn.primary`, `.seg`(난이도 선택), `.statbar`/`.stat`(점수·시간), `.toolbar`, `.hint`, `.panel`, `.chips`/`.chip`(카테고리 선택), `.input`, `.scoreboard`.
- 팀 대항형 단어 게임은 `assets/teamround.js`의 `TeamRound.start({...})`에 카테고리와 문구만 넘기면 설정·준비·진행·요약·최종 결과 화면이 만들어져요. (`charades/index.html` 참고)
- 최고 기록 등은 `MG.store.get/set`으로 저장해요. 키 앞에 게임 이름을 붙이면 겹치지 않아요. (예: `snake.best`)
- 결과 팝업은 `MG.dialog({ title, text, buttons })`, 짧은 안내는 `MG.toast('메시지')`를 써요.
- 모바일(폭 390px 안팎)에서 가로 스크롤이 생기지 않는지 꼭 확인해 주세요.

## GitHub Pages 배포

저장소 루트에 이 폴더의 내용을 그대로 푸시하고, **Settings → Pages**에서 `main` 브랜치의 `/ (root)`를 선택하면 끝이에요.

Pages는 CSS·JS를 최대 10분(`Cache-Control: max-age=600`) 저장합니다. 새 HTML이 예전 `style.css` 주소와 만나면 탭이 스타일 없는 버튼으로 보일 수 있어요. 그래서 각 페이지의 로컬 css/js(`assets/`, `words.js`, `questions.js`, `logic.js` 등)는 `?v=` 와 파일 내용의 짧은 해시를 달고 있습니다. 내용이 바뀐 파일만 주소가 바뀝니다.

```bash
node scripts/stamp-assets.js          # HTML의 ?v= 를 다시 찍기
node scripts/stamp-assets.js --check  # 어긋나면 실패 (파일은 그대로)
```

css/js를 고친 커밋에는 스탬프를 같이 넣어 주세요. `.github/workflows/asset-versions.yml` 은 PR과 `main` 푸시에서 그것만 확인합니다. 커밋을 만들거나 Pages 배포를 건드리지 않아요.
