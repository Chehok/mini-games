import os
import pathlib
ROOT=str(pathlib.Path(__file__).resolve().parent.parent); SITE='https://mini-games-69o.pages.dev/'
EFFECTIVE='2026년 11월 14일'
NAV=[('about','소개'),('guide','이용 가이드'),('contact','문의'),('privacy','개인정보처리방침')]
def head(title,desc,path,pre):
    return f'''<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <link rel="icon" type="image/png" sizes="32x32" href="{pre}assets/icons/favicon-32.png">
  <link rel="icon" type="image/svg+xml" sizes="any" href="{pre}assets/icons/icon.svg">
  <link rel="apple-touch-icon" sizes="180x180" href="{pre}assets/icons/apple-touch-icon-180.png">
  <link rel="manifest" href="{pre}manifest.webmanifest">
  <meta name="theme-color" content="#e8ecf3" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#10131c" media="(prefers-color-scheme: dark)">
  <meta name="apple-mobile-web-app-title" content="미니게임">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <title>{title} | 미니게임</title>
  <meta name="description" content="{desc}">
  <link rel="canonical" href="{SITE}{path}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="미니게임">
  <meta property="og:title" content="{title} | 미니게임">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{SITE}{path}">
  <meta property="og:locale" content="ko_KR">
  <meta property="og:image" content="{SITE}assets/icons/icon-512.png">
  <meta name="color-scheme" content="light dark">
  <link rel="stylesheet" href="{pre}assets/style.css">
  <meta name="google-site-verification" content="2lnyP3t2mmgP6Hsc38QsWGOAUdmU66fPzzFMIPpKUXg">
  <meta name="naver-site-verification" content="4a9de818bb77014dd34e900997181b35793a5cd3">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9717375299017347" crossorigin="anonymous"></script>
  <script defer src="{pre}assets/pwa.js"></script>
</head>
<body class="doc-page">
  <header class="site-header">
    <a class="back" href="{pre or './'}">← 게임 목록</a>
    <h1>{title}</h1>
    <span class="spacer"></span>
  </header>
'''
def foot(pre,current):
    links=''.join(f'<a href="{pre}{k}/"'+(' aria-current="page"' if k==current else '')+f'>{v}</a>' for k,v in NAV)
    return f'''  <footer class="site-footer">
    <nav aria-label="사이트 안내">{links}</nav>
    <p>© 2026 미니게임 · 설치 없이 바로 즐기는 미니게임 모음</p>
  </footer>
<script data-goatcounter="https://mini-games.goatcounter.com/count"
        async src="//gc.zgo.at/count.js"></script>
</body>
</html>
'''
def page(slug,title,desc,body):
    os.makedirs(f'{ROOT}/{slug}',exist_ok=True)
    open(f'{ROOT}/{slug}/index.html','w').write(head(title,desc,slug+'/','../')+'  <main class="doc">\n'+body+'  </main>\n'+foot('../',slug))

ABOUT='''    <p class="doc-lead">미니게임은 설치나 회원가입 없이 브라우저에서 바로 즐기는 작은 게임 모음이에요. 버스를 기다릴 때, 점심시간 끝무렵, 잠들기 전 5분처럼 짧은 틈을 채우려고 만들었어요.</p>

    <h2>어떤 게임이 있나요</h2>
    <h3>1인용</h3>
    <ul>
      <li><a href="../sudoku/">스도쿠</a> — 쉬움·보통·어려움, 메모 기능</li>
      <li><a href="../2048/">2048</a> — 같은 숫자를 밀어 합치기</li>
      <li><a href="../minesweeper/">지뢰찾기</a> — 초급·중급·고급, 휴대폰용 깃발 모드</li>
      <li><a href="../slide-puzzle/">슬라이드 퍼즐</a> — 3×3부터 5×5까지</li>
      <li><a href="../memory/">카드 짝맞추기</a> — 세 가지 판 크기</li>
      <li><a href="../wordle/">워들</a> — 오늘의 단어와 무한 모드</li>
      <li><a href="../chosung/?mode=solo">초성 퀴즈</a> — 일반·성경 카테고리 10문제 도전</li>
    </ul>
    <h3>어? 그 게임</h3>
    <p>광고에서 자주 보던 바로 그 퍼즐들을, 중간에 막히는 가짜 단계 없이 끝까지 풀 수 있게 다시 만들었어요. 단계가 오를수록 실제로 어려워지고, 게임마다 하트 5개로 도전해요.</p>
    <ul>
      <li><a href="../pin-pull/">핀 뽑기</a>, <a href="../water-sort/">물 분류</a>, <a href="../screw-puzzle/">나사 풀기</a>, <a href="../parking-jam/">주차장 탈출</a>, <a href="../untangle/">꼬인 줄 풀기</a></li>
    </ul>
    <p>여럿이 모여서 하는 게임(몸으로 말해요, 스피드 퀴즈, 라이어 게임 등)은 자매 사이트 <a href="https://recreation-cmx.pages.dev/">레크리에이션</a>에 있어요.</p>

    <h2>만드는 원칙</h2>
    <ul>
      <li><strong>바로 시작</strong>: 앱 설치, 회원가입, 로그인이 없어요. 원하면 앱으로 설치해 홈 화면에서 바로 열 수 있어요.</li>
      <li><strong>모두에게 건전하게</strong>: 청소년도 함께 쓰는 사이트라 폭력·선정·도박 같은 내용은 넣지 않아요.</li>
      <li><strong>개인정보를 받지 않아요</strong>: 기록은 내 기기에만 저장되고, 방문 통계도 쿠키 없이 집계해요. 운영을 위해 Google 광고를 싣고 있어요. 자세한 내용은 <a href="../privacy/">개인정보처리방침</a>에 있어요.</li>
      <li><strong>누구나 편하게</strong>: 휴대폰·태블릿·PC에서 같은 화면을 쓰고, 다크 모드·키보드 조작·움직임 줄이기 설정을 지원해요.</li>
    </ul>

    <h2>운영</h2>
    <p>개인 개발자가 만들고 운영해요. 게임 아이디어, 오류 제보, 단어·문제 제안은 <a href="../contact/">문의</a>로 보내 주세요.</p>
'''

GUIDE='''    <p class="doc-lead">게임마다 화면에 짧은 안내가 있지만, 처음이라면 여기서 규칙을 한 번 보고 시작해요.</p>
    <nav class="doc-toc" aria-label="이 페이지 차례">
      <a href="#basics">기본 사용법</a><a href="#solo">1인용 게임</a><a href="#puzzles">어? 그 게임</a><a href="#rules">하트와 별</a><a href="#faq">자주 묻는 질문</a>
    </nav>

    <h2 id="basics">기본 사용법</h2>
    <ul>
      <li>게임 목록에서 카드를 누르면 바로 시작해요. 왼쪽 위 <strong>← 게임 목록</strong>으로 돌아와요.</li>
      <li>진행 상황과 최고 기록은 <strong>지금 쓰는 기기의 브라우저</strong>에 자동 저장돼요. 다른 기기와는 이어지지 않아요.</li>
      <li>소리는 처음에 꺼져 있어요. 퍼즐 화면의 🔇 버튼으로 켤 수 있어요.</li>
      <li>PC에서는 Tab으로 버튼을 고르고 Enter·스페이스로 누를 수 있어요. 게임마다 방향키 조작도 있어요.</li>
    </ul>
    <h3>앱으로 설치하기</h3>
    <ul>
      <li><strong>안드로이드·PC 크롬</strong>: 게임 목록 오른쪽 위의 <em>앱 설치</em> 버튼을 누르거나, 브라우저 메뉴에서 <em>앱 설치</em>를 골라요.</li>
      <li><strong>아이폰·아이패드 사파리</strong>: 공유 버튼 → <em>홈 화면에 추가</em>를 눌러요.</li>
      <li>설치한 앱에서는 같은 자리의 <em>링크 공유</em> 버튼으로 지금 보는 페이지 주소를 복사해 친구에게 보낼 수 있어요.</li>
      <li>한 번 열어 둔 게임은 인터넷이 잠깐 끊겨도 열려요.</li>
    </ul>

    <h2 id="solo">1인용 게임</h2>
    <dl class="doc-games">
      <dt><a href="../sudoku/">🔢 스도쿠</a></dt>
      <dd>가로줄, 세로줄, 굵은 선의 3×3 칸 안에 1부터 9까지 숫자가 한 번씩만 들어가게 채워요. <strong>메모</strong>를 켜면 후보 숫자를 작게 적어 둘 수 있어요. 키보드에서는 숫자 입력, 방향키 이동, N 메모, Backspace 지우기예요.</dd>
      <dt><a href="../2048/">🧮 2048</a></dt>
      <dd>방향키·WASD 또는 화면을 밀면 모든 타일이 그쪽으로 움직여요. 같은 숫자가 부딪히면 합쳐져요. 2048 타일을 만들면 성공이고, 그 뒤로도 계속할 수 있어요. 모서리 하나에 큰 숫자를 모으면 유리해요.</dd>
      <dt><a href="../minesweeper/">💣 지뢰찾기</a></dt>
      <dd>칸의 숫자는 주변 8칸에 있는 지뢰 수예요. 지뢰가 확실한 칸에는 깃발을 꽂아요(PC 오른쪽 클릭, 휴대폰은 길게 누르기 또는 깃발 모드). 깃발 수가 맞는 숫자 칸을 두 번 누르면 주변을 한꺼번에 열어요.</dd>
      <dt><a href="../slide-puzzle/">🧩 슬라이드 퍼즐</a></dt>
      <dd>빈칸 옆의 타일을 눌러 밀어서 1부터 순서대로 맞춰요. 윗줄부터 한 줄씩 완성하면 쉬워요.</dd>
      <dt><a href="../memory/">🃏 카드 짝맞추기</a></dt>
      <dd>카드를 두 장씩 뒤집어 같은 그림을 찾아요. 이동 수와 시간이 적을수록 좋은 기록이에요.</dd>
      <dt><a href="../wordle/">🔤 워들</a></dt>
      <dd>영어 다섯 글자 단어를 여섯 번 안에 맞혀요. <strong>초록</strong>은 글자와 자리가 모두 맞음, <strong>노랑</strong>은 단어에 있지만 다른 자리, <strong>회색</strong>은 단어에 없는 글자예요. 화면 읽기 프로그램은 칸마다 결과를 읽어 줘요. 오늘의 단어는 하루에 한 번, 무한 모드는 계속 풀 수 있어요.</dd>
      <dt><a href="../chosung/?mode=solo">💡 초성 퀴즈</a></dt>
      <dd>초성만 보고 단어를 맞혀요. 카테고리를 고르고 10문제에 도전해요. 빨리 맞힐수록, 연속으로 맞힐수록 점수가 올라가고, 힌트를 쓰면 점수가 깎여요. 성경 카테고리는 개역개정 표기를 따라요.</dd>
    </dl>

    <h2 id="puzzles">어? 그 게임</h2>
    <dl class="doc-games">
      <dt><a href="../pin-pull/">📍 핀 뽑기</a></dt>
      <dd>황금 핀을 눌러 뽑으면 막혀 있던 공이 굴러가요. 색 보석을 컵에 모으면 성공이에요. 진흙이 보석에 닿거나, 돌이 컵에 들어가거나, 회색 보석이 물들지 않은 채 컵에 들어가면 실패예요. <strong>뽑는 순서</strong>가 핵심이에요.</dd>
      <dt><a href="../water-sort/">🧪 물 분류</a></dt>
      <dd>시험관을 하나 고르고 다른 시험관을 누르면 맨 위 물이 옮겨져요. 같은 색 위나 빈 시험관에만 부을 수 있어요. 색마다 기호가 있어서 색만으로 구분하지 않아도 돼요. 이동 횟수 제한 안에 모든 색을 한 시험관씩 모아요.</dd>
      <dt><a href="../screw-puzzle/">🔩 나사 풀기</a></dt>
      <dd>나사를 누르면 같은 기호의 공구함으로 들어가요. 맞는 공구함이 없으면 임시 칸에 놓이고, <strong>임시 칸이 넘치면 실패</strong>예요. 위 판에 가려진 나사는 판을 치워야 풀 수 있어요. 아래의 다음 공구함 순서를 보며 미리 계획해요.</dd>
      <dt><a href="../parking-jam/">🚗 주차장 탈출</a></dt>
      <dd>차를 누르면 화살표 방향으로 끝까지 달려 나가요. 앞이 막힌 차를 누르면 부딪혀서 하트가 1개 줄어요. 어느 차가 먼저 나가야 길이 열리는지 순서를 찾아요.</dd>
      <dt><a href="../untangle/">🪢 꼬인 줄 풀기</a></dt>
      <dd>점을 끌어 옮겨서 어떤 줄도 서로 겹치지 않게 만들어요. 겹친 줄은 빨갛게, 풀린 줄은 초록으로 바뀌어요. 점 하나를 집어 놓을 때마다 이동 1번이에요.</dd>
    </dl>

    <h2 id="rules">하트와 별 (어? 그 게임)</h2>
    <ul>
      <li><strong>하트</strong>: 게임마다 5개가 있어요. 실패하거나, 시작한 판을 끝내지 않고 다시 하기·단계 바꾸기·나가기를 하면 1개를 써요. 하트는 20분마다 1개씩 다시 차요. 다 쓰면 기다리거나 다른 퍼즐을 즐겨요.</li>
      <li><strong>별</strong>: 목표 이동 수 안에 깨면 ★3이에요. 되돌리기·힌트·빈 시험관 같은 도움을 쓰면 최대 ★2예요. 단계 목록에 가장 좋은 별이 표시돼요.</li>
      <li><strong>난이도</strong>: 1~5단계 쉬움, 6~20단계 보통, 21단계부터 어려움이에요. 10단계마다 보스 단계가 나와요.</li>
    </ul>

    <h2 id="faq">자주 묻는 질문</h2>
    <dl class="doc-faq">
      <dt>기록이 사라졌어요.</dt>
      <dd>기록은 브라우저 저장공간에 있어요. 방문 기록·사이트 데이터를 지우거나, 시크릿 모드로 열거나, 다른 브라우저·기기로 열면 보이지 않아요.</dd>
      <dt>하트를 바로 채울 수 있나요?</dt>
      <dd>아니요. 20분마다 1개씩만 차요. 하트는 게임마다 따로라서 다른 퍼즐은 바로 할 수 있어요.</dd>
      <dt>화면이 예전 모습 그대로예요.</dt>
      <dd>앱으로 설치해서 쓰는 경우 새 버전이 다음 실행 때 적용돼요. 앱을 완전히 닫았다 다시 열어 보세요.</dd>
      <dt>오류를 찾았거나 아이디어가 있어요.</dt>
      <dd><a href="../contact/">문의</a>로 알려 주세요.</dd>
    </dl>
'''

CONTACT='''    <p class="doc-lead">오류 제보, 게임 아이디어, 단어·문제 제안, 그 밖의 문의를 받아요.</p>

    <h2>문의하는 방법</h2>
    <div class="doc-card">
      <h3>GitHub 이슈</h3>
      <p>이 사이트의 소스 코드가 공개된 GitHub 저장소에 글을 남겨 주세요. 진행 상황을 함께 볼 수 있어요. GitHub 계정이 필요해요.</p>
      <p><a class="btn primary" href="https://github.com/Chehok/mini-games/issues/new" rel="noopener">GitHub에 문의 남기기</a></p>
      <p class="doc-note">이슈는 누구나 볼 수 있는 공개 글이에요. 이름·연락처 같은 개인정보는 적지 말아 주세요.</p>
    </div>

    <h2>오류를 알려 주실 때</h2>
    <p>아래 내용을 함께 적어 주시면 빨리 고칠 수 있어요.</p>
    <ul>
      <li>어떤 게임의 몇 단계였는지</li>
      <li>무엇을 눌렀을 때 어떤 일이 생겼는지</li>
      <li>쓰는 기기와 브라우저(예: 갤럭시 S24 · 삼성 인터넷, 아이폰 15 · 사파리)</li>
      <li>가능하면 화면 캡처</li>
    </ul>

    <h2>답변</h2>
    <p>개인이 운영하는 사이트라 답변까지 며칠 걸릴 수 있어요. 모든 제안을 반영하지는 못하지만 하나하나 읽어요.</p>
'''

PRIVACY=f'''    <p class="doc-lead">미니게임(이하 "사이트")은 운영자가 이용자의 개인정보를 직접 받지 않도록 만들었어요. 다만 광고와 통계, 호스팅 과정에서 외부 서비스가 일부 정보를 처리해요. 이 방침은 어떤 정보가 어디에서 처리되는지 알려 드려요.</p>
    <p class="doc-note">시행일: {EFFECTIVE}</p>

    <h2>1. 수집하는 개인정보</h2>
    <p>사이트는 회원가입·로그인·입력 양식이 없고, 운영자는 이름·이메일·전화번호 같은 개인정보를 요청하거나 수집하지 않아요. 광고 제공 과정에서 Google이 쿠키 등으로 처리하는 정보는 6항을 참고해 주세요.</p>

    <h2>2. 이용자 기기에 저장되는 정보</h2>
    <p>게임 진행을 이어서 할 수 있도록 다음 정보를 <strong>이용자 기기의 브라우저 저장공간(localStorage)</strong>에만 저장해요. 이 정보는 운영자에게 전송되지 않아요.</p>
    <table class="doc-table">
      <thead><tr><th>항목</th><th>예</th></tr></thead>
      <tbody>
        <tr><td>게임 진행·설정</td><td>현재 단계, 난이도, 판 크기, 고른 카테고리, 큰 칸 보기</td></tr>
        <tr><td>기록</td><td>최고 점수·최단 시간, 워들 통계, 단계별 별</td></tr>
        <tr><td>퍼즐 도전 상태</td><td>남은 하트와 회복 시각, 본 안내 문구</td></tr>
        <tr><td>오프라인 사용</td><td>홈 화면 추가 시 게임 파일 사본(서비스 워커 캐시)</td></tr>
      </tbody>
    </table>
    <p>브라우저의 사이트 데이터 삭제 기능으로 언제든 지울 수 있어요. 지우면 기록도 함께 사라져요.</p>

    <h2>3. 방문 통계</h2>
    <p>어떤 게임이 많이 쓰이는지 알기 위해 <a href="https://www.goatcounter.com/" rel="noopener">GoatCounter</a>로 방문 수를 집계해요.</p>
    <ul>
      <li>쿠키나 브라우저 저장공간을 쓰지 않아요.</li>
      <li>집계 항목: 방문한 페이지, 이전 페이지(유입 경로), 브라우저와 운영체제 종류, 화면 너비, 언어, 접속 국가·지역</li>
      <li>IP 주소는 저장하지 않아요. 같은 방문을 두 번 세지 않도록 IP 주소·브라우저 정보를 최대 8시간 동안 메모리에서만 임의 번호와 연결해 쓰고 버려요.</li>
      <li>개인을 알아볼 수 있는 형태로 보관하거나 다른 곳에 제공하지 않아요.</li>
    </ul>

    <h2>4. 호스팅 접속 기록</h2>
    <p>사이트는 Cloudflare Pages에서 제공돼요. 웹사이트를 전송하는 과정에서 Cloudflare가 보안과 서비스 운영을 위해 IP 주소 등 접속 기록을 처리할 수 있어요. 자세한 내용은 <a href="https://www.cloudflare.com/ko-kr/privacypolicy/" rel="noopener">Cloudflare 개인정보처리방침</a>을 참고해 주세요.</p>

    <h2>5. 외부 링크</h2>
    <p>사이트에는 자매 사이트(레크리에이션, Icebreaker)와 GitHub로 가는 링크가 있어요. 이동한 사이트에서는 그 사이트의 방침이 적용돼요.</p>

    <h2>6. 광고 (Google 애드센스)</h2>
    <p>사이트 운영 비용을 위해 Google 애드센스 광고를 게재해요.</p>
    <ul>
      <li>Google을 포함한 제3자 광고 업체는 쿠키를 사용해 이용자가 이 사이트나 다른 웹사이트를 방문한 기록을 바탕으로 광고를 보여 줄 수 있어요.</li>
      <li>Google은 광고 쿠키를 사용해 이 사이트와 인터넷의 다른 사이트 방문 기록을 바탕으로 이용자에게 맞는 광고를 보여 줘요.</li>
      <li>맞춤 광고는 <a href="https://adssettings.google.com/" rel="noopener">Google 광고 설정</a>에서 끌 수 있어요. 제3자 업체의 맞춤 광고 쿠키는 <a href="https://www.aboutads.info/choices/" rel="noopener">aboutads.info</a>에서 끌 수 있어요.</li>
      <li>Google이 정보를 처리하는 방식은 <a href="https://policies.google.com/technologies/partner-sites?hl=ko" rel="noopener">Google 파트너 사이트 데이터 사용 방식</a>과 <a href="https://policies.google.com/privacy?hl=ko" rel="noopener">Google 개인정보처리방침</a>에서 볼 수 있어요.</li>
      <li>운영자는 광고 쿠키로 수집된 정보를 받거나 보관하지 않아요.</li>
    </ul>

    <h2>7. 아동의 이용</h2>
    <p>사이트는 청소년도 함께 쓰는 곳이라, 선정적이거나 폭력적인 광고가 나오지 않도록 애드센스의 광고 차단 설정을 사용해요. 운영자는 아동의 개인정보를 받지 않아요.</p>

    <h2>8. 이용자의 권리</h2>
    <p>운영자가 보관하는 개인정보가 없어 열람·정정·삭제를 요청할 대상이 없어요. 기기에 저장된 정보와 쿠키는 이용자가 브라우저 설정에서 직접 지우거나 막을 수 있어요.</p>

    <h2>9. 문의처</h2>
    <p>개인정보와 관련한 문의는 <a href="../contact/">문의</a> 페이지로 보내 주세요. 개인정보 침해에 대한 상담이 필요하면 아래 기관에 문의할 수 있어요.</p>
    <ul>
      <li>개인정보침해신고센터 (국번 없이) 118 · privacy.kisa.or.kr</li>
      <li>개인정보분쟁조정위원회 1833-6972 · kopico.go.kr</li>
    </ul>

    <h2>10. 방침의 변경</h2>
    <p>방침이 바뀌면 시행 7일 전에 이 페이지에 알려요. 이전 방침은 GitHub 저장소의 변경 기록에서 볼 수 있어요.</p>
'''

page('about','소개','설치 없이 브라우저에서 바로 즐기는 미니게임 모음을 소개해요.',ABOUT)
page('guide','이용 가이드','미니게임의 게임별 규칙과 조작, 하트와 별, 홈 화면 추가 방법을 안내해요.',GUIDE)
page('contact','문의','미니게임 오류 제보와 아이디어를 보내는 방법이에요.',CONTACT)
page('privacy','개인정보처리방침','미니게임은 개인정보를 수집하지 않아요. 기기에 저장되는 정보와 방문 통계를 안내해요.',PRIVACY)

# 404 at root with absolute asset paths
NF=head('페이지를 찾을 수 없어요','요청한 페이지가 없어요.','404.html','/').replace('<link rel="canonical" href="'+SITE+'404.html">\n','')
NF=NF.replace('<a class="back" href="/">','<a class="back" href="/">')
open(f'{ROOT}/404.html','w').write(NF+'''  <main class="doc doc-center">
    <p class="doc-big" aria-hidden="true">🕹️</p>
    <h2>찾는 페이지가 없어요</h2>
    <p>주소가 바뀌었거나 없어진 페이지예요. 게임 목록에서 다시 골라 주세요.</p>
    <p><a class="btn primary" href="/">게임 목록으로</a></p>
    <p class="doc-note">모임용 게임(몸으로 말해요, 라이어 게임 등)은 <a href="https://recreation-cmx.pages.dev/">레크리에이션</a>으로 옮겼어요.</p>
  </main>
'''+foot('/',''))
pages=['', 'puzzles/','sudoku/','2048/','minesweeper/','slide-puzzle/','memory/','wordle/','chosung/','pin-pull/','water-sort/','screw-puzzle/','parking-jam/','untangle/','about/','guide/','contact/','privacy/']
open(f'{ROOT}/sitemap.xml','w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(f'  <url><loc>{SITE}{p}</loc><lastmod>2026-11-14</lastmod></url>\n' for p in pages)+'</urlset>\n')
open(f'{ROOT}/robots.txt','w').write(f'User-agent: *\nAllow: /\n\nSitemap: {SITE}sitemap.xml\n')
print('ok')
