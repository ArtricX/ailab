# 아이고 — 매일 발행 작업 지침

이 저장소는 GitHub Pages로 운영하는 블로그 **아이고**(누구나 읽는 아침 AI 소식, 예전 이름 AILAB)입니다. 저장소와 주소(`ailab`)는 그대로 씁니다.
매일 오전 7시(한국 시간)에 그날의 AI 소식을 한 장으로 정리해 올립니다.

## 독자와 톤
- 독자: 어린이부터 어르신까지 누구나. 전문 지식이 없는 사람을 기준으로 씁니다.
- 문장: 짧고 쉬운 존댓말(~해요). 한 문장에 한 가지 내용만.
- 어려운 말은 쓰지 않거나, 쓰면 바로 풀어 쓰고 '오늘의 말'에 넣습니다.
- 영어 회사·서비스 이름은 한글로 씁니다(오픈AI, 구글, 챗GPT).
- **줄내림**: 제목, 한 줄 요약, 칩, 꼬리표, 그림 설명은 의미 단위(구절)로 묶습니다. 글 페이지에서는 `<span class="ph">…</span>`로, `posts.json`에서는 `|`로 구절 경계를 표시합니다(예: `AI 때문에|값싼 스마트폰이|사라지고 있어요`). 조사·어미가 홀로 남거나("있었어요."만 한 줄), 꾸밈말과 꾸밈받는 말이 갈라지지 않게("큰 AI / 회사들은" ✕) 나눕니다. 본문의 숫자와 단위, 날짜, 고유명사 묶음은 `<span class="nw">`로 감쌉니다(`10월 5일`, `약 2만 5천 개`). SVG 안의 글은 직접 줄을 나눌 때도 같은 기준을 따릅니다.
- 겁을 주거나 과장하지 않습니다. 확인되지 않은 소식은 "보도가 있어요", "아직 공식 발표는 없어요"처럼 분명히 표시합니다.

## 매일 하는 일 (순서대로)
1. **리서치**: 지난 24시간 안에 처음 나온 AI 소식을 웹에서 찾습니다. 한국 소식과 세계 소식을 모두 보고, 생활 소식과 기업·산업 소식을 함께 봅니다.
2. **고르기**: 소식 3개를 고릅니다.
   - **새 소식이 먼저**: 지난 24시간 안에 처음 나온 소식을 먼저 고릅니다. 며칠 전에 나온 소식이 오늘 다시 보도됐다고 해서 새 소식으로 치지 않습니다.
   - 일반 사람의 생활과 가까운 소식이면 더 좋습니다. 사업이나 일에 영감을 줄 만한 기업·산업 소식도 괜찮습니다.
   - 새 소식이 정말 마땅치 않아 이전 날 소식을 넣을 때는, 그 소식이 처음 나온 날짜와 넣은 이유를 PR 설명에 적습니다. PR은 '발행 전 확인 필요' 경고를 붙여 Draft로 열고, 알림 첫 줄에도 알립니다.
   - 태그는 `생활`, `안전`, `창작`, `일`, `건강`, `학교`, `돈` 중에서 고릅니다. 투자 권유, 정치적 논쟁, 자극적인 사건은 피합니다.
3. **확인**: 숫자와 사실은 가능한 한 출처 두 곳 이상에서 확인합니다. 출처 문장을 그대로 옮기지 말고 쉬운 말로 다시 씁니다(직접 인용은 쓰지 않습니다).
4. **글 쓰기**: `posts/2026-10-07.html`을 틀로 삼아 `posts/YYYY-MM-DD.html`을 만듭니다.
   - 구조: 머리(날짜 대괄호 라벨, 큰 제목, 소식 3개 칩) → 소식 3개(각각 일러스트, 태그, 제목, 한 줄 요약, 인포그래픽, 쉽게 알아보기: 무슨 일이에요? / 왜 그래요? / 나한테는요?, 출처) → 곧 만날지도 몰라요(선택) → 오늘의 말(꼬리표 3~5개) → 구독 칸(`id="subscribe"` 섹션, 틀 글에서 그대로 복사. 버튼은 `../subscribe.html` 구독 페이지로 연결) → 끝.
   - 소식마다 색을 하나 정합니다: `blue`, `yellow`, `pink`, `green`, `red` 중 겹치지 않게. 그 색을 칩(`c-`), 태그(`pill-tag c-`), 섹션(`a-`), 일러스트 배경에 똑같이 씁니다.
   - 제목, `<title>`, `description`, `og:*`, 날짜를 그날에 맞게 바꿉니다.
5. **일러스트**: 소식마다 힉스필드(Higgsfield) 커넥터로 한 장씩 만듭니다. 세 장을 `generate_image_batch` 한 번으로 보내고 `jobs_wait`로 기다립니다.
   - 모델과 설정(고정): `gpt_image_2_5`, `quality: high`, `resolution: 2k`, `aspect_ratio: 4:3`. 장당 약 2.75크레딧, 하루 약 8크레딧.
   - 프롬프트 형식(고정): `Cute hand-drawn indie character illustration. Thick, slightly wobbly black brush-pen outlines, simple round characters with tiny dot eyes and deadpan expressions, pink round faces, flat muted colors, visible grainy paper texture, one solid <소식 색> background, lots of empty space, warm and friendly picture-book feel. Scene: <장면>. No text, no letters, no signature.` 배경색은 소식 색에 맞춥니다(blue → cobalt blue, yellow → mustard yellow, pink → soft pink, green → soft green, red → tomato red).
   - 특정 작가의 이름이나 캐릭터를 프롬프트에 넣지 않습니다. 화풍의 특징만 씁니다.
   - 장면은 소식의 핵심을 친근한 비유 하나로(예: 텅 빈 폰을 보는 사람과 칩을 끌어안은 서버, 외줄 타는 로봇과 구멍 난 안전 그물). 동그란 사람과 작은 흰 로봇을 고정 등장인물로 씁니다. 실제 인물·로고·브랜드 캐릭터·실제 작품은 넣지 않습니다.
   - 결과의 원본 주소(`.png`)를 글 페이지의 `story-art` 이미지와 `posts.json`의 `illust`에, `_min.webp` 주소를 `thumb`에 넣습니다. 저장소에 올라가면 GitHub Actions(`fetch-images.yml`)가 그림을 `assets/img/`에 저장하고 주소를 바꿉니다. 이미지 설명(alt)은 장면을 한국어로 적습니다.
   - 크레딧이 부족하거나 생성이 실패하면 올리지 말고 PR 설명에 그 사실을 적습니다.
   **인포그래픽**: 글 안에 인라인 SVG 하나(viewBox 너비 800). 외곽선 없이 평면 색 도형과 큰 숫자로 그립니다(`line` 클래스는 선과 화살표에만). 기존 글의 클래스만 씁니다(`num` 큰 숫자, `grey`, `white`, `red`, `f-red/blue/yellow/green/pink/ink/paper/ground`, `line`, `line-grey`, `line-red`).
   - 큰 숫자 하나를 주인공으로, 막대·말풍선·순서도 같은 구조는 사실 그대로. 빨강 강조는 그림마다 한 곳만.
   - 막대와 크기는 실제 눈금에 맞춰 계산하고, 모든 숫자는 출처의 실제 값입니다.
   - `<title>`과 `<desc>`로 그림 내용을 글로 적습니다.
5-2. **녹음 (앱의 '소리로 듣기')**: 글을 다 쓴 뒤, 소식마다 녹음을 하나씩 만듭니다. 세 개를 힉스필드 `generate_audio_batch` 한 번으로 보내고 `jobs_wait`로 기다립니다.
   - 설정(고정): `model: text2speech_v2`, `variant: elevenlabs`, `voice_type: preset`, `voice_id: c25f78a0-714e-42af-8da3-a399cef94968`(Hana, 여성 표준어), `use_unlim: false`. 하루 약 5~7크레딧.
   - 읽을 글은 **`python3 scripts/tts_text.py YYYY-MM-DD`가 만든 글을 그대로** 보냅니다. 손으로 쓰지 않습니다.
     - 이 도구는 글 페이지의 문장을 정해진 순서(첫 인사 → 소식마다 제목·한 줄 요약·질문 3개 → 끝인사)로 이어 붙이고, **숫자와 영어 약자를 소리 나는 대로 바꿉니다**(10월 13일 → 시월 십삼일, 오후 4시 → 오후 네 시, 172곳 → 백칠십이 곳, 3명 → 세 명, AI → 에이아이). 녹음 엔진이 아라비아 숫자를 뭉개 읽는 문제 때문이에요.
     - 바꾼 글을 한 번 훑어보고, 어색하게 읽힐 곳(처음 보는 단위, 영어 낱말)이 있으면 `scripts/tts_text.py`의 규칙을 고친 뒤 `python3 scripts/tts_text.py --test`가 모두 통과하는지 확인합니다.
   - 결과의 `.mp3` 주소를 글 페이지 각 소식 섹션에 `data-audio` 속성으로 넣습니다: `<section class="story a-pink" id="books" data-audio="https://…mp3">`. 저장소에 올라가면 GitHub Actions가 녹음을 `assets/audio/`에 저장하고 주소를 바꾸며, `content/날짜.json`의 `audio`로 옮겨 앱이 읽습니다.
   - 녹음이 실패하거나 크레딧이 부족해도 글은 올립니다(앱은 녹음이 없으면 읽기만 보여 줘요). 대신 PR 설명 점검 결과에 꼭 적습니다.
6. **목록 갱신**: `posts.json` 맨 앞에 그날 항목(date, title, summary, minutes, stories[tag, color, anchor, title, dek, illust], keywords[word, meaning])을 추가하고 `python3 scripts/build.py`를 실행해 `index.html`을 다시 만듭니다.
7. **줄내림 검사**: `python3 scripts/check_lines.py`를 돌려 문제 0개가 될 때까지 구절을 다시 나눕니다. 문제가 남아 있으면 올리지 않습니다.
   이어서 `python3 scripts/extract_content.py`(필요하면 `pip install beautifulsoup4 --break-system-packages`)를 돌려 "멈춘 글"이 없는지 확인합니다. 멈춘 글이 있으면 글 구조가 틀과 다르다는 뜻이니 틀에 맞게 고칩니다. 만들어진 `content/` 파일은 함께 올려도 되고, 올리지 않아도 GitHub Actions가 다시 만듭니다.
8. **뉴스레터 초안(beehiiv)**: PR보다 먼저 만듭니다(PR 설명에 초안 링크를 넣어야 하니까요). 출판물 `pub_24fff7ac-12bd-4f24-9339-9ef1dc54d733`(아이고, 예전 이름 AILAB)에 그날 메일 초안을 만듭니다. 발송은 사람이 beehiiv에서 **오전 7시 정각 예약**으로 겁니다(도구로는 초안까지만 가능하므로, Claude는 발송이나 예약을 걸지 않습니다). 작업은 오전 5시쯤 시작해 7시 전에 확인하고 예약할 여유를 둡니다.
   - 그림: 힉스필드 원본 주소(`.png`) 3개를 `save_image`로 올리고, 돌려받은 `url`만 메일에 씁니다(webp는 일부 메일 앱에서 안 보여요).
   - `save_post`: `title`은 그날 제목(구절 표시 `|` 없이), `subtitle`은 "M월 D일 X요일 아침, 오늘의 AI 소식 세 가지", `content_tags: ["아침 소식"]`, `thumbnail_image_url`은 첫 그림.
   - 본문 맨 위에는 로고 머리 그림을 넣습니다: `imageBlock`, 주소 `https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/3e1f0aa6-1f1d-4441-9429-6e1ef166b1d1/email-header.png?t=1791969965`(이미 beehiiv에 올라가 있어 다시 올리지 않아요), `data-url`은 `https://artricx.github.io/ailab/`, alt는 `아이고`.
   - 본문 순서: 로고 머리 그림 → 인사 한 줄 → 소식마다 [그림(`imageBlock`, `data-url`은 글 페이지 앵커) → 굵은 `[태그]` → `h2` 제목 → 한 줄 요약 → **나한테는요?** 문단 → 검정 버튼 "그림과 함께 자세히 읽기"(글 페이지 앵커)] 사이에 가로줄 → `h3` 오늘의 말(3개, 목록) → 맺음말 "내일 아침 7시에 또 만나요. …전달해 주세요."
   - 이어서 `edit_post`로 `email_settings`의 `email_subject_line`("[아이고] " + 가장 궁금증을 끄는 소식 한 구절 + " 오늘의 AI 소식 3가지"), `email_preview_text`(나머지 두 소식 한 문장), `display_byline_in_email: false`를 정합니다.
   - 글 페이지 주소는 `https://artricx.github.io/ailab/posts/YYYY-MM-DD.html#앵커`입니다(PR 병합 뒤 1~2분이면 열려요).
   - **보내기 전 점검**: `get_post`와 `get_post_content`로 다시 읽어 확인합니다. 제목·부제·메일 제목·미리보기 글·썸네일이 채워졌는지, 받는 사람이 무료 구독자 전체(`recipients.email.tier_ids: ["free"]`)인지, 그림 3장이 모두 beehiiv 주소인지, 버튼과 그림 링크가 모두 오늘 날짜 글 페이지를 가리키는지 봅니다. 고칠 것이 있으면 고친 뒤 다시 확인합니다. 사람은 '발행' 버튼만 누르면 되도록 완성된 상태로 둡니다.
9. **올리기**: `main`에 바로 올리지 않습니다. `daily/YYYY-MM-DD` 브랜치에 커밋하고 Pull Request를 엽니다. 사람이 PR을 병합하면 사이트에 발행되고, 이어서 beehiiv에서 오전 7시로 예약하면 그 시각에 메일이 나갑니다. 메일 속 링크가 열리도록 PR 병합이 먼저입니다. PR 설명은 아래 틀을 그대로 씁니다(맨 위에 발행 순서).

   ```
   ## 오늘 발행하는 법 (두 번 누르면 끝)
   1. 이 PR 아래 **Merge pull request** → **Confirm merge** (1~2분 뒤 사이트에 올라가요)
   2. 뉴스레터 초안 열기 → 오른쪽 위 **Continue** → 마지막 화면에서 **Schedule**(예약) → **오전 7:00** 선택 → 확인
      <beehiiv editor_url>
      (7시가 이미 지났으면 **Publish now**로 바로 보내요. 먼저 내 메일로만 보고 싶으면: 같은 화면 Preview → Send test email)
   - 7시 전에 1번과 2번을 모두 마쳐 주세요. PR을 먼저 병합해야 메일 속 링크가 열려요.

   - 메일 제목: <email_subject_line>
   - 미리보기 글: <email_preview_text>
   - 사이트 글: https://artricx.github.io/ailab/posts/YYYY-MM-DD.html

   ## 오늘의 소식
   - [태그] 제목 — 출처 링크들 (3개)

   ## 점검 결과
   - 줄내림 검사: 문제 0개
   - 힉스필드: 그림 3장, 약 N크레딧
   - 녹음: 3개, 약 N크레딧 (또는 실패한 이유)
   - 뉴스레터 점검: 통과 (또는 무엇이 안 됐는지)
   ```
   - 뉴스레터를 만들지 못했으면 2번 대신 그 사실과 이유를 적습니다.
   - 마지막 알림에도 같은 두 링크(PR, 뉴스레터 초안)를 순서대로 적습니다.

## 데이터 (앱으로 옮길 때를 위해)
- 글 페이지가 원본이고, `content/`의 데이터는 거기서 자동으로 만들어집니다(`content/README.md`에 구조 설명). 손으로 고치지 않습니다.
- 앱 '아이고'(저장소 ArtricX/aigo-app)는 `posts.json`과 `content/날짜.json`을 그대로 읽습니다. 앱 개인정보처리방침은 `privacy.html`입니다.
- 그래서 **글 구조를 틀과 똑같이 지킵니다**: 소식은 `section.story`(id = 앵커, 녹음이 있으면 `data-audio`) 3개, 각 소식에 `story-head`(태그·h2·dek), `figure.figure` 안 인라인 SVG 하나, `.qa` 안에 질문 3개(h3+p), `p.source` 출처. 오늘의 말은 `section#words`의 `.ticket`. 새 구획을 만들고 싶으면 먼저 `extract_content.py`도 함께 고칩니다.

## 디자인 규칙
- 스타일은 `assets/style.css` 하나만 씁니다. 글 페이지에 새 CSS를 넣지 않습니다.
- 콘셉트: 흰 지면 위 잡지·진(zine). 그림은 손으로 그린 듯한 친근한 캐릭터 일러스트(굵게 떨리는 선, 동그란 얼굴, 단색 배경, 종이 질감). 홈의 마스코트 띠(외치는 까치 + 노란 말풍선), 대괄호 라벨, 원색 다섯 가지, 꼬리표 스티커, 그림 왼쪽 위의 날짜·분야 태그(검은 바탕 흰 글자, 가로 한 줄).
- 글자는 검정과 회색만. 색은 일러스트, 인포그래픽, 칩과 스티커가 담당합니다.
- 밝은 지면 하나로만 디자인했습니다(다크 모드 없음).
- 이모지와 01/02 같은 번호 매기기는 쓰지 않습니다(순서도처럼 진짜 순서일 때만 화살표로).

## 로고
- 이름은 **아이고**(AI + go, 놀랄 때 쓰는 말 '아이고'). 영문으로 쓸 때는 중국 전자 브랜드 aigo와 헷갈리지 않게 `AI-go`로 씁니다.
- 마스코트는 안테나 달린 까치. 로고는 외치는 포즈(부리를 벌리고 날개를 입가에 댄 모습)입니다. 원본 주소는 `assets/brand/sources.json`, 파일은 GitHub Actions(`brand.yml`, `scripts/make_brand.py`)가 만듭니다. 손으로 고치지 않습니다.
- 쓰는 곳: 상단 메뉴 로고(`assets/brand/lockup.png`: 까치 + 손글씨 '아이고!', 한 장 이미지), 홈 마스코트 띠(`symbol-512.png` + 말풍선), 파비콘·홈 화면 아이콘(`favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`), 메일 머리(`email-header.png`), beehiiv 출판물 로고(`icon-1024.png`).
- 새 페이지를 만들 때도 틀 글의 `<head>` 아이콘 줄(`rel="icon"`, `apple-touch-icon`)과 `header.nav`의 로고를 그대로 둡니다.
- 이름 뜻(AI + go)이 전해지도록 '아이고' 옆에 `AI-go`를 함께 씁니다: 상단 로고 옆 작은 회색 `AI-go`(좁은 화면에서는 숨김), 홈 마스코트 말풍선 'AI + go = 아이고!'(설명은 말풍선 안 두 줄로 짧게), 꼬리말 '아이고 AI-go', 홈 제목. 로고 이미지의 alt도 '아이고 AI-go'.
- 꼬리말(검은 바탕)에는 까치가 묻히므로 글자 '아이고 AI-go'만 씁니다.

## 사용성 규칙 (예쁜 것보다 먼저)
누구나 편하게 쓰는 것이 가장 중요합니다. 아래 기능은 `assets/site.js`와 `assets/style.css`가 모든 페이지에 자동으로 붙이므로, 글 페이지에 따로 넣지 않습니다. 틀 글의 머리(`header.nav`)와 끝(`.post-end`, `#subscribe`)만 그대로 두면 됩니다.
- **상단 메뉴**: 늘 화면 위에 붙어 있고, 휴대폰에서도 로고 · 글자 메뉴 · 글자 크게가 한 줄에 놓입니다. 메뉴가 넘치면 옆으로 밀어 보고 오른쪽 끝이 흐려집니다. 지금 읽는 소식에 밑줄이 생깁니다. '글자 크게'는 테두리 없는 회색 버튼으로 메뉴와 구분합니다. 메뉴 링크는 `#앵커`로 각 소식 섹션 `id`와 맞춥니다.
- **맨 위로 버튼**: 한 화면쯤 내려가면 오른쪽 아래에 '맨 위로'가 나타납니다.
- **글 끝**: '이 소식 공유하기' 버튼과 이전·다음 날 소식 카드가 `posts.json`을 읽어 자동으로 붙습니다.
- **공유 미리보기 그림**: GitHub Actions(`fetch_images.py`)가 글마다 첫 그림으로 `assets/og/날짜.jpg`(1200×630)를 만들고 `og:image`를 넣습니다. 손으로 넣지 않아도 됩니다.
- **그림이 빠진 날**: `story-art`에 img가 없으면 소식 색 지면으로 채워집니다. 홈은 `posts.json`의 `illust`가 빈 값이면 같은 방식으로 그립니다. 그래도 그림 누락은 발행 전 경고 대상입니다.
- **누르는 곳의 크기**: 링크와 버튼은 손가락으로 누르기 쉽게 높이 44px 안팎을 지킵니다. 새로 만드는 버튼도 같습니다.
- **방문자 집계**: `assets/site.js`의 `AILAB_GOATCOUNTER`에 GoatCounter 코드를 넣으면 켜집니다(쿠키 없음). 맨 위로·공유·이전/다음 누름도 함께 집계됩니다.
