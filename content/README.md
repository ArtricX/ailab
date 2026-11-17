# content/ — 앱·다른 서비스용 데이터

글 페이지(`posts/날짜.html`)에서 자동으로 만들어지는 데이터예요. **손으로 고치지 마세요.**
글이 저장소에 올라오면 GitHub Actions가 `scripts/extract_content.py`를 돌려 새로 만듭니다.

## 파일
- `index.json` — 모든 글 목록(최신 순). 날짜, 제목, 소식 3개의 앵커·태그·색·제목, 데이터 파일 경로.
- `날짜.json` — 글 하나의 전체 내용.
- `graphics/날짜-앵커.svg` — 인포그래픽. 사이트 스타일 없이도 똑같이 보이도록 색과 글꼴을 안에 넣었어요.
- `graphics/날짜-앵커.png` — '한눈에 보기' 카드(2026-11-18부터의 인포그래픽)를 찍은 그림(가로 1080px). `scripts/render_glance.py`가 만들어요.
- `graphics/glance.json` — 카드 그림마다 지문과 크기(바뀐 카드만 다시 찍으려고). 앱은 읽지 않아도 돼요.

## 날짜.json 구조 (schema 1)
| 필드 | 내용 |
|---|---|
| `date`, `weekday`, `url`, `minutes` | 날짜, 요일, 글 주소, 읽는 시간(분) |
| `title` | 글 제목 |
| `share` | 공유 미리보기 제목·설명·그림 |
| `chips` | 머리의 소식 칩: `anchor`, `tag`, `color`, `label` |
| `stories[]` | 소식 3개 (아래) |
| `soon` | 곧 만날지도 몰라요(없으면 `null`): `title`, `paragraphs[]`, `sources[]` |
| `words[]` | 오늘의 말: `word`, `meaning`, `color` |

`stories[]` 하나:
| 필드 | 내용 |
|---|---|
| `anchor`, `url`, `tag`, `color` | 앵커, 글 안 주소, 태그(생활·안전·창작·일·건강·학교·돈), 색(blue·yellow·pink·green·red) |
| `title`, `dek` | 제목, 한 줄 요약 |
| `illustration` | 그림: `src`(저장소 경로), `url`, `width`, `height`, `alt`. 그림이 없으면 `null` |
| `infographic` | `file`, `url`, `viewBox`, `title`, `desc`(그림 내용을 글로), `caption`. 카드를 찍은 그림이면 `kind: "card"`(파일은 PNG, `viewBox`는 `0 0 가로 세로` 픽셀, `caption`은 `null`). 그림이 아직 없으면 `null` |
| `glance` | '한눈에 보기' 카드가 있는 소식만(아래). 카드 내용을 글로 옮긴 것이라 앱이 직접 그릴 때 써요 |
| `qa[]` | 쉽게 알아보기 3개: `q`(무슨 일이에요? / 왜 그래요? / 나한테는요?), `a` |
| `sources[]` | 출처: `name`, `date`(예: "10월 9일"), `url` |

`glance` (카드가 있는 소식만):
| 필드 | 내용 |
|---|---|
| `key` | 핵심 숫자: `num`(예: "80%"), `what`(그 숫자가 뜻하는 것, 구절 글), `source`(누가 · 언제 · 기준) |
| `blocks[]` | 카드의 칸을 위에서부터. `type`에 따라 아래 필드 |

| `type` | 필드 |
|---|---|
| `stat` | 숫자 줄: `num`, `text`(구절 글) |
| `list` | 목록: `head`, `head_style`(`color` 소식 색 · `warn` 경고 빨강 · `""` 회색), `style`(`check` ✓ · `x` ✕ · `dot` 점), `items[]`(구절 글) |
| `facts` | 이름표 줄: `head`, `head_style`, `items[]`: `label`(언제·어디서 등), `text`(구절 글) |
| `steps` | 순서: `head`, `head_style`, `items[]`(구절 글, 차례대로) |
| `bars` | 막대 비교: `head`, `head_style`, `items[]`: `label`, `value`(예: "4.5일"), `ratio`(가장 큰 막대 = 1), `main`(주인공 막대), `note`(막대 읽는 법) |
| `note` | 알아 두세요: `head`, `items[]`(구절 글) |
| `foot` | 끝 줄: `text`(구절 글) |

## 글 표기
- **구절이 있는 글**(제목, 요약, 칩, 그림 설명, 오늘의 말 뜻): `{ "text": 전체 글, "phrases": [구절, …] }`
  줄을 바꿀 때는 구절 사이에서만 바꾸면 사이트와 같은 줄내림이 돼요.
- **본문 문단**: `{ "text": 전체 글, "nobreak": [붙여 써야 하는 말, …] }`
  `nobreak`의 말(날짜, 숫자와 단위, 이름)은 중간에서 줄을 바꾸지 않아요.
