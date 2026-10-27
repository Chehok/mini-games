# 🎮 Mini Games

설치도 빌드도 필요 없는 **순수 HTML/CSS/JS** 미니 게임 모음이에요. 외부 라이브러리·CDN·폰트를 쓰지 않고, 모든 링크는 상대 경로라서 GitHub Pages에 그대로 올리면 바로 동작해요.

배포 주소: <https://chehok.github.io/mini-games/>

## 게임 목록

| 게임 | 폴더 | 설명 |
| --- | --- | --- |
| 🔢 스도쿠 | `sudoku/` | 정답이 하나뿐인 퍼즐을 즉석에서 생성. 쉬움/보통/어려움, 메모 모드, 같은 숫자·행·열·박스 강조, 실수 표시, 타이머 |
| 🧮 2048 | `2048/` | 방향키/WASD/스와이프, 부드러운 타일 애니메이션, 최고 점수 저장, 되돌리기(1회) |
| 💣 지뢰찾기 | `minesweeper/` | 초급 9×9(10) · 중급 16×16(40) · 고급 30×16(99, 모바일은 16×30). 첫 클릭 안전, 깃발 모드/길게 누르기/우클릭, 코딩(chording) |
| 🧩 슬라이드 퍼즐 | `slide-puzzle/` | 3×3 / 4×4 / 5×5. 항상 풀 수 있게 섞기, 탭 또는 방향키, 이동 횟수·타이머 |
| 🃏 카드 짝맞추기 | `memory/` | 이모지 카드, 4×3 / 4×4 / 6×4, 뒤집기 애니메이션, 난이도별 최고 기록 저장 |
| 🔤 워들 | `wordle/` | 영어 5글자 단어 6번 도전. 오늘의 단어(한국 시간 기준 하루 한 문제) / 무한 모드, 통계, 이모지 결과 복사 |

## 폴더 구조

```
index.html          허브 페이지 (게임 카드 목록)
assets/style.css    공통 스타일 (색상 변수, 헤더, 버튼, 팝업, 다크 모드)
assets/common.js    공통 유틸 (MG.store, MG.Timer, MG.toast, MG.dialog, MG.rng, MG.shuffle)
<게임>/index.html   각 게임 (한 파일에 HTML + 게임별 CSS/JS)
wordle/words.js     워들 단어 목록 (정답 후보 + 허용 단어)
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
3. 허브(`/index.html`)의 `.cards` 안에 카드 한 장을 추가해요.
   ```html
   <a class="card" href="snake/" style="--c:#14b8a6">
     <span class="emoji" aria-hidden="true">🐍</span>
     <div><h2>스네이크</h2><p>한 줄 설명</p></div>
   </a>
   ```
4. 이 README의 게임 목록 표에도 한 줄 추가해 주세요.

### 팁

- 공통 클래스: `.btn`, `.btn.primary`, `.seg`(난이도 선택), `.statbar`/`.stat`(점수·시간), `.toolbar`, `.hint`.
- 최고 기록 등은 `MG.store.get/set`으로 저장해요. 키 앞에 게임 이름을 붙이면 겹치지 않아요. (예: `snake.best`)
- 결과 팝업은 `MG.dialog({ title, text, buttons })`, 짧은 안내는 `MG.toast('메시지')`를 써요.
- 모바일(폭 390px 안팎)에서 가로 스크롤이 생기지 않는지 꼭 확인해 주세요.

## GitHub Pages 배포

저장소 루트에 이 폴더의 내용을 그대로 푸시하고, **Settings → Pages**에서 `main` 브랜치의 `/ (root)`를 선택하면 끝이에요.
