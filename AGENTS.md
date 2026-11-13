# AGENTS.md — mini-games 인수인계서

대화 기록이 없는 사람이나 AI(Cursor, Claude Code, Codex 등)가 이 저장소를 이어받을 때 먼저 읽는 문서예요.
게임 목록, 폴더 구조, 실행 방법, 게임 추가 방법, `?v=` 스크립트, Pages 배포는 [README](README.md)에 있으니 여기서는 되풀이하지 않아요.

- 저장소: <https://github.com/Chehok/mini-games> (공개, 개인 계정 `Chehok`)
- 배포 주소: <https://mini-games-69o.pages.dev/> (Cloudflare Pages, 운영) · <https://stage.mini-games-69o.pages.dev/> (stage 확인용)
- 기준: **GitHub `main` 브랜치가 정본**이에요. 다른 곳에 있는 사본은 오래됐을 수 있어요.
- 범위: **1인용 게임과 어? 그 게임(퍼즐)** 이에요. 레크리에이션·다인용 게임은 2026-11-13 별도 저장소 <https://github.com/Chehok/recreation>(<https://recreation-cmx.pages.dev/>)으로 옮겼어요. 그쪽 코드는 여기서 고치지 않아요.

## 1. 작업 방식 (2026-11-13 변경: stage → main)

- 브랜치는 두 개예요.
  - `main`: 운영. <https://mini-games-69o.pages.dev/>
  - `stage`: 확인용. <https://stage.mini-games-69o.pages.dev/> (Cloudflare Pages 브랜치 미리보기)
- 작업한 내용은 **바로 `stage`에 push**해서 사용자가 stage 주소에서 결과를 확인하게 해요.
- **`main`에는 사용자가 명시적으로 지시했을 때만** 반영해요(예: "main에 머지해줘", "운영에 반영해줘"). 에이전트가 스스로 `main`에 push하거나 머지하지 않아요.
  - 반영 방법: `stage`를 `main`에 fast-forward로 올려요(`git push origin stage:main`). 두 브랜치 기록을 똑같이 유지하려고 squash는 쓰지 않아요.
  - stage에 있는 작업 중 일부만 반영하라는 지시가 있으면, 그때 방법을 사용자와 정해요.
- 반영 뒤에는 배포 주소에서 바뀐 내용이 실제로 보이는지 확인해요(Cloudflare Pages 빌드가 끝난 뒤 보통 1~2분 안팎).
- `stage`에 push하기 전에 확인할 것:
  - 브라우저(헤드리스여도 됨)에서 바뀐 페이지를 열어 모바일 폭(약 390px)과 데스크톱, 다크 모드를 확인
  - 콘솔 오류 없음, 가로 스크롤 없음
  - css/js를 고쳤다면 `node scripts/stamp-assets.js` 실행 ([README의 배포 절](README.md#github-pages-배포))
  - push한 뒤 사용자에게 바뀐 점 요약과 확인할 stage 주소를 알려요
- 커밋 하나에 작업 하나가 들어가게 해요. 그래야 나중에 되돌리기 쉬워요.

## 2. 콘텐츠 규칙

- 대상은 **교회 청소년부와 여러 사람이 모이는 레크리에이션** 자리예요. 모든 단어·문제·문구는 건전해야 해요.
  - 넣지 않는 것: 성적인 내용, 폭력·공포, 술·담배·도박, 특정인·집단을 비하하거나 놀리는 내용, 정치적으로 논쟁적인 내용
- **성경 카테고리**가 초성 퀴즈에 있어요(성경 인물·지명·사건·물건 4개). 성경 인명·지명·용어는 **개역개정 표기**를 따라요(예: 모세, 다윗, 바울, 여리고, 갈릴리).
- UI 문구는 한국어예요. 말투는 친근한 해요체예요.
- 방향: 흔한 게임을 베끼는 데서 그치지 않고 **사용성, 차별화, 이후 수익화**를 함께 노려요. 진행자가 한 화면, 휴대폰 한 대로 바로 쓸 수 있어야 해요.

## 3. 로컬 PC와 배포 흐름

- 사용자 Windows PC의 작업 폴더는 `C:\git\mini-games`이고, 이 저장소에 연결돼 있어요.
- PC 사본은 뒤처져 있을 수 있어요. PC에서 고치기 전에 반드시 `git pull`부터 해요.
- 배포는 **Cloudflare Pages**가 GitHub 저장소에 연결돼 자동으로 해요. 빌드 단계 없이 저장소 루트를 그대로 서비스해요.
  - `main` push → 운영 <https://mini-games-69o.pages.dev/>
  - `stage` push → 미리보기 <https://stage.mini-games-69o.pages.dev/>
- Pages는 css/js를 캐시할 수 있어서 `?v=` 스탬프를 써요([README](README.md#github-pages-배포)). `.github/workflows/asset-versions.yml`은 스탬프가 맞는지 **검사만** 해요(PR, `main`·`stage` push).
- `github-pages` 브랜치는 **GitHub Pages 전용**이에요(`chehok.github.io/mini-games`). `main`(95a55c3) 시점 그대로에, 모든 페이지에 Cloudflare 새 주소로 안내하는 팝업(세션당 한 번, `assets/pwa.js` 끝)만 더했어요. `main` 업데이트는 여기에 반영하지 않아요. 기준 배포 주소는 Cloudflare예요.

## 4. git 계정 규칙

- 커밋은 사용자의 **개인 GitHub 계정 `Chehok`** 으로 해요. 이 저장소 안에서만 `git config user.name` / `git config user.email`(로컬 설정)로 지정해요.
- `git config --global`은 바꾸지 않아요. 사용자의 **회사 GitHub 계정과 회사 git 설정은 절대 건드리지 않아요.**
- 저장소에 비밀값(토큰, 비밀번호, API 키)을 넣지 않아요.

## 5. 코드 구조 메모 (README에 없는 것)

- 빌드 단계가 없어요. 외부 라이브러리·CDN·웹폰트를 쓰지 않는 원칙을 지켜요.
- `assets/common.js`의 `MG.*` 유틸(저장, 타이머, 토스트, 팝업, 공유 등)을 먼저 쓰고, 게임마다 새로 만들지 않아요.
- 저장값은 `MG.store`를 쓰고, 키 앞에 게임 이름을 붙여요(예: `chosung.best`). 허브는 마지막으로 본 탭을 저장해요.
- 초성은 데이터에 적지 않고 실행할 때 한글 음절에서 계산해요. 단어 데이터는 각 폴더의 `words.js`에 있어요.
- `chosung/`은 recreation 저장소에도 사본이 있어요. 여기서는 혼자 모드만 쓰고, "함께" 버튼과 `?mode=party`는 레크리에이션 사이트로 보내요(파티 모드 코드는 남아 있지만 쓰이지 않아요).
- `_redirects`(Cloudflare Pages): 옮긴 게임의 예전 주소를 레크리에이션 사이트로 보내요. 지우지 않아요.

## 6. 진행 중이거나 예정된 작업

지금 열려 있는 작업은 없어요. 아래는 이야기된 아이디어 목록이고, 확정된 일정은 아니에요. 시작하기 전에 사용자에게 확인해요.

- 한국어 워들(지금은 영어 5글자만 있음)
- 차별화 기능: 오늘의 퍼즐, 결과 공유 강화 등 다시 찾아오게 만드는 장치
- 수익화(예: 하단 광고)는 나중에 검토해요. AdSense는 커스텀 도메인과 충분한 콘텐츠가 있어야 하고, 방문자가 많지 않으면 수익이 작다는 점까지 이야기됐어요.

최근 끝난 작업(참고용): 허브 상단 탭(1인용 / 다인용 / 진행 도구), 진행 도구 개선(사다리·룰렛·팀 나누기·뽑기, 전체 화면, 다크 모드), css/js 캐시 문제 해결(`?v=` 스탬프), 몸으로 말해요·스피드 퀴즈의 2초 뒤 답 가리기.

## 7. 관련 프로젝트

- **Icebreaker**(대화 주제 & 밸런스 게임)는 별도 저장소 <https://github.com/Chehok/icebreaker>에서 따로 관리해요. 이 허브에는 <https://chehok.github.io/icebreaker/>로 가는 링크 카드만 있어요. 이 저장소에서 Icebreaker 코드를 고치지 않아요.
