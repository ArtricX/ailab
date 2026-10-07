# AILAB — 매일 발행 작업 지침

이 저장소는 GitHub Pages로 운영하는 블로그 **AILAB**(누구나 읽는 아침 AI 소식)입니다.
매일 오전 7시(한국 시간)에 그날의 AI 소식을 한 장으로 정리해 올립니다.

## 독자와 톤
- 독자: 초등학생부터 어르신까지 누구나. 전문 지식이 없는 사람을 기준으로 씁니다.
- 문장: 짧고 쉬운 존댓말(~해요). 한 문장에 한 가지 내용만.
- 어려운 말은 쓰지 않거나, 쓰면 바로 풀어 쓰고 '오늘의 말'에 넣습니다.
- 영어 회사·서비스 이름은 한글로 씁니다(오픈AI, 구글, 챗GPT).
- **줄내림**: 제목, 한 줄 요약, 칩, 꼬리표, 그림 설명은 의미 단위(구절)로 묶습니다. 글 페이지에서는 `<span class="ph">…</span>`로, `posts.json`에서는 `|`로 구절 경계를 표시합니다(예: `AI 때문에|값싼 스마트폰이|사라지고 있어요`). 조사·어미가 홀로 남거나("있었어요."만 한 줄), 꾸밈말과 꾸밈받는 말이 갈라지지 않게("큰 AI / 회사들은" ✕) 나눕니다. 본문의 숫자와 단위, 날짜, 고유명사 묶음은 `<span class="nw">`로 감쌉니다(`10월 5일`, `약 2만 5천 개`). SVG 안의 글은 직접 줄을 나눌 때도 같은 기준을 따릅니다.
- 겁을 주거나 과장하지 않습니다. 확인되지 않은 소식은 "보도가 있어요", "아직 공식 발표는 없어요"처럼 분명히 표시합니다.

## 매일 하는 일 (순서대로)
1. **리서치**: 지난 24시간 안팎의 AI 소식을 웹에서 찾습니다. 한국 소식과 세계 소식을 모두 봅니다.
2. **고르기**: 일반 사람의 생활과 관련 있는 소식 3개를 고릅니다. 태그는 `생활`, `안전`, `창작`, `일`, `건강`, `학교`, `돈` 중에서 고릅니다. 투자 권유, 정치적 논쟁, 자극적인 사건은 피합니다.
3. **확인**: 숫자와 사실은 가능한 한 출처 두 곳 이상에서 확인합니다. 출처 문장을 그대로 옮기지 말고 쉬운 말로 다시 씁니다(직접 인용은 쓰지 않습니다).
4. **글 쓰기**: `posts/2026-10-07.html`을 틀로 삼아 `posts/YYYY-MM-DD.html`을 만듭니다.
   - 구조: 머리(날짜 대괄호 라벨, 큰 제목, 소식 3개 칩) → 소식 3개(각각 일러스트, 태그, 제목, 한 줄 요약, 인포그래픽, 쉽게 알아보기: 무슨 일이에요? / 왜 그래요? / 나한테는요?, 출처) → 곧 만날지도 몰라요(선택) → 오늘의 말(꼬리표 3~5개) → 끝.
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
6. **목록 갱신**: `posts.json` 맨 앞에 그날 항목(date, title, summary, minutes, stories[tag, color, anchor, title, dek, illust], keywords[word, meaning])을 추가하고 `python3 scripts/build.py`를 실행해 `index.html`을 다시 만듭니다.
7. **줄내림 검사**: `python3 scripts/check_lines.py`를 돌려 문제 0개가 될 때까지 구절을 다시 나눕니다. 문제가 남아 있으면 올리지 않습니다.
8. **올리기**: `main`에 바로 올리지 않습니다. `daily/YYYY-MM-DD` 브랜치에 커밋하고 Pull Request를 엽니다. PR 설명에 소식 3개 제목과 출처를 적습니다. 사람이 PR을 병합하면 발행됩니다.

## 디자인 규칙
- 스타일은 `assets/style.css` 하나만 씁니다. 글 페이지에 새 CSS를 넣지 않습니다.
- 콘셉트: 흰 지면 위 잡지·진(zine). 그림은 손으로 그린 듯한 친근한 캐릭터 일러스트(굵게 떨리는 선, 동그란 얼굴, 단색 배경, 종이 질감). 화면 밖으로 넘치는 빨간 AILAB 워드마크, 대괄호 라벨, 원색 다섯 가지, 꼬리표 스티커, 세로 날짜 라벨.
- 글자는 검정과 회색만. 색은 일러스트, 인포그래픽, 칩과 스티커가 담당합니다.
- 밝은 지면 하나로만 디자인했습니다(다크 모드 없음).
- 이모지와 01/02 같은 번호 매기기는 쓰지 않습니다(순서도처럼 진짜 순서일 때만 화살표로).
