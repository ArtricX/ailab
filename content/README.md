# content/ — 앱·다른 서비스용 데이터

글 페이지(`posts/날짜.html`)에서 자동으로 만들어지는 데이터예요. **손으로 고치지 마세요.**
글이 저장소에 올라오면 GitHub Actions가 `scripts/extract_content.py`를 돌려 새로 만듭니다.

## 파일
- `index.json` — 모든 글 목록(최신 순). 날짜, 제목, 소식 3개의 앵커·태그·색·제목, 데이터 파일 경로.
- `날짜.json` — 글 하나의 전체 내용.
- `graphics/날짜-앵커.svg` — 인포그래픽. 사이트 스타일 없이도 똑같이 보이도록 색과 글꼴을 안에 넣었어요.

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
| `infographic` | `file`, `url`, `viewBox`, `title`, `desc`(그림 내용을 글로), `caption` |
| `qa[]` | 쉽게 알아보기 3개: `q`(무슨 일이에요? / 왜 그래요? / 나한테는요?), `a` |
| `sources[]` | 출처: `name`, `date`(예: "10월 9일"), `url` |

## 글 표기
- **구절이 있는 글**(제목, 요약, 칩, 그림 설명, 오늘의 말 뜻): `{ "text": 전체 글, "phrases": [구절, …] }`
  줄을 바꿀 때는 구절 사이에서만 바꾸면 사이트와 같은 줄내림이 돼요.
- **본문 문단**: `{ "text": 전체 글, "nobreak": [붙여 써야 하는 말, …] }`
  `nobreak`의 말(날짜, 숫자와 단위, 이름)은 중간에서 줄을 바꾸지 않아요.
