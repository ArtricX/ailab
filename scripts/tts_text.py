#!/usr/bin/env python3
"""녹음(앱의 '소리로 듣기')에 보낼 읽을 글을 만듭니다.

녹음 엔진은 아라비아 숫자와 영어 약자를 어색하게 읽을 때가 많아요('172곳', '4시', 'JP모건').
그래서 엔진에 보내기 전에 한국 사람이 소리 내어 읽는 그대로 글자로 바꿔 씁니다.
  10월 13일 → 시월 십삼일 · 오후 4시 → 오후 네 시 · 172곳 → 백칠십이 곳 · 3명 → 세 명
  2만 5천 개 → 이만 오천 개 · 2.5% → 이 점 오 퍼센트 · AI → 에이아이 · JP모건 → 제이피모건

사용법
  python3 scripts/tts_text.py 2026-10-19          # 소식 3개의 읽을 글을 JSON으로 출력
  python3 scripts/tts_text.py --say "오후 4시에 172곳"   # 글 한 줄만 바꿔 보기
  python3 scripts/tts_text.py --test              # 바꾸기 규칙 점검
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# ---------- 숫자 읽기 ----------
SINO = "영일이삼사오육칠팔구"
NATIVE_ATTR = {1: "한", 2: "두", 3: "세", 4: "네", 5: "다섯", 6: "여섯", 7: "일곱", 8: "여덟", 9: "아홉"}
NATIVE_TENS = {1: "열", 2: "스물", 3: "서른", 4: "마흔", 5: "쉰", 6: "예순", 7: "일흔", 8: "여든", 9: "아흔"}


def sino_under_10000(n):
    out = ""
    for unit, val in (("천", 1000), ("백", 100), ("십", 10)):
        d = n // val
        if d:
            out += ("" if d == 1 else SINO[d]) + unit
        n %= val
    if n:
        out += SINO[n]
    return out


def sino(n):
    """한자어 수: 172 → 백칠십이, 10000 → 만, 25000 → 이만오천"""
    if n == 0:
        return "영"
    parts = []
    for unit, val in (("조", 10**12), ("억", 10**8), ("만", 10**4), ("", 1)):
        g = n // val
        n %= val
        if g:
            word = sino_under_10000(g)
            if unit == "만" and g == 1:
                word = ""  # 일만 → 만
            parts.append(word + unit)
    return "".join(parts)


def native(n):
    """고유어 수(단위 앞 꼴): 1 → 한, 3 → 세, 20 → 스무, 25 → 스물다섯"""
    if n == 20:
        return "스무"
    tens, ones = divmod(n, 10)
    return (NATIVE_TENS.get(tens, "") + NATIVE_ATTR.get(ones, "")) or sino(n)


def digits_after_point(s):
    return " ".join(SINO[int(c)] for c in s)


def number_word(raw):
    """'1,234' '2.5' 같은 글자를 한자어 읽기로"""
    raw = raw.replace(",", "")
    if "." in raw:
        a, b = raw.split(".", 1)
        return f"{sino(int(a))} 점 {digits_after_point(b)}"
    return sino(int(raw))


NUM = r"(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)"

# 고유어로 읽는 단위(작은 수일 때). 긴 것부터 맞춰요(개월은 한자어라 따로).
NATIVE_COUNTERS = ["시간", "자리", "군데", "가지", "사람", "마리", "번째", "살", "개", "명", "곳", "번", "권", "대", "잔", "장", "달", "통", "벌", "켤레", "그릇"]
NATIVE_LIMIT = {"살": 99, "시간": 99, "번째": 99}  # 나머지는 19까지만 고유어(뉴스 읽는 방식)


def read_numbers(t):
    # 물결: 3~4개 → 삼에서 네 개 (앞의 수는 한자어로)
    t = re.sub(r"(\d+)\s?[~∼〜]\s?(?=\d)", lambda m: sino(int(m.group(1))) + "에서 ", t)

    # 월: 6월 → 유월, 10월 → 시월
    def month(m):
        n = int(m.group(1))
        return {6: "유", 10: "시"}.get(n, sino(n)) + "월"
    t = re.sub(r"(\d{1,2})\s?월", month, t)

    # 몇 시: 1~12시는 고유어(오후 네 시), 13시 이상은 한자어. '시간'은 아래 고유어 단위에서
    def hour(m):
        n = int(m.group(1))
        return (native(n) if 1 <= n <= 12 else sino(n)) + " 시"
    t = re.sub(r"(\d{1,2})\s?시(?!간)", hour, t)

    # 퍼센트
    t = re.sub(NUM + r"\s?(%|퍼센트|프로)", lambda m: number_word(m.group(1)) + " 퍼센트", t)

    # 큰 단위가 붙은 수: 2만 → 이만, 1억 → 일억, 5천 → 오천
    def big(m):
        raw, unit = m.group(1), m.group(2)
        word = "" if raw == "1" and unit in ("만", "천", "백") else number_word(raw)  # 1만 → 만
        return word + unit
    t = re.sub(r"(\d+(?:\.\d+)?)\s?(조|억|만|천|백)(?=[\s가-힣]|$)", big, t)

    # 첫 번째, 두 번째
    def nth(m):
        n = int(m.group(1))
        return ("첫" if n == 1 else native(n)) + " 번째"
    t = re.sub(r"(\d+)\s?번째", nth, t)

    # 고유어 단위: 3명 → 세 명, 172곳 → 백칠십이 곳, 3개월 → 삼 개월(한자어)
    t = re.sub(r"(\d+)\s?개월", lambda m: sino(int(m.group(1))) + " 개월", t)
    # 배: 2배 → 두 배, 10배 → 열 배 (소수 1.5배는 한자어 그대로)
    t = re.sub(r"(?<![\d.,])(\d+)\s?배", lambda m: (native(int(m.group(1))) if 1 <= int(m.group(1)) <= 10 else sino(int(m.group(1)))) + " 배", t)
    pat = r"(\d{1,3}(?:,\d{3})+|\d+)\s?(" + "|".join(NATIVE_COUNTERS) + ")"

    def counter(m):
        raw, unit = m.group(1), m.group(2)
        n = int(raw.replace(",", ""))
        if "," not in raw and 1 <= n <= NATIVE_LIMIT.get(unit, 19):
            return f"{native(n)} {unit}"
        return f"{sino(n)} {unit}"
    t = re.sub(pat, counter, t)

    # 점수와 소수 배: 9.2점 → 구 점 이 점, 10점 → 십 점, 3.6배 → 삼 점 육 배
    t = re.sub(NUM + r"\s?배", lambda m: number_word(m.group(1)) + " 배", t)
    t = re.sub(NUM + r"\s?점(?=[이을은과도만]|$|\s)", lambda m: number_word(m.group(1)) + " 점", t)
    # 남은 수는 모두 한자어(일, 년, 원, 분, 초, 배, 위, 층, 호 등)
    t = re.sub(NUM, lambda m: number_word(m.group(1)), t)
    return t


# ---------- 영어 약자 ----------
LETTERS = {
    "A": "에이", "B": "비", "C": "씨", "D": "디", "E": "이", "F": "에프", "G": "지", "H": "에이치", "I": "아이",
    "J": "제이", "K": "케이", "L": "엘", "M": "엠", "N": "엔", "O": "오", "P": "피", "Q": "큐", "R": "알",
    "S": "에스", "T": "티", "U": "유", "V": "브이", "W": "더블유", "X": "엑스", "Y": "와이", "Z": "지",
}


def read_letters(t):
    # 대문자 약자(AI, SNS, JP모건의 JP)를 한 글자씩. 소문자 섞인 낱말은 그대로 둬요.
    return re.sub(r"(?<![A-Za-z])[A-Z]{1,6}(?![a-z])", lambda m: "".join(LETTERS[c] for c in m.group(0)), t)


def normalize(t):
    t = t.replace("|", " ")
    t = read_numbers(t)
    t = read_letters(t)
    return re.sub(r"\s+", " ", t).strip()


# ---------- 하루치 읽을 글 ----------
NTH = ["첫 번째", "두 번째", "세 번째"]


def build(date):
    sys.path.insert(0, str(ROOT / "scripts"))
    import extract_content as ec  # 글 페이지에서 바로 읽어요(content/ 파일이 아직 없어도 됨)
    page = ROOT / "posts" / f"{date}.html"
    data = ec.extract(page, ec.svg_style())
    m, d = int(date[5:7]), int(date[8:])
    out = []
    for i, s in enumerate(data["stories"]):
        parts = []
        if i == 0:
            parts.append(f"안녕하세요, 아이고 아침 소식이에요. {m}월 {d}일 {data['weekday']}요일, 오늘의 AI 소식 세 가지를 들려 드릴게요.")
        parts.append(f"{NTH[i]} 소식이에요. {s['title']['text']}.")
        parts.append(s["dek"]["text"])
        for q in s["qa"]:
            parts.append(f"{q['q']} {q['a']['text']}")
        if i == len(data["stories"]) - 1:
            parts.append("오늘 소식은 여기까지예요. 내일 아침에 또 만나요.")
        out.append({"anchor": s["anchor"], "text": normalize(" ".join(parts))})
    return out


TESTS = [
    ("10월 13일", "시월 십삼일"),
    ("6월 1일", "유월 일일"),
    ("16일 오후 4시까지", "십육일 오후 네 시까지"),
    ("오후 12시", "오후 열두 시"),
    ("24시간", "스물네 시간"),
    ("172곳, 개인 348명", "백칠십이 곳, 개인 삼백사십팔 명"),
    ("3명", "세 명"),
    ("숫자 4자리", "숫자 네 자리"),
    ("20개", "이십 개"),
    ("1번째", "첫 번째"),
    ("2만 5천 개", "이만 오천 개"),
    ("1만 명", "만 명"),
    ("10,000원", "만원"),
    ("2.5%", "이 점 오 퍼센트"),
    ("3개월", "삼 개월"),
    ("2026년", "이천이십육년"),
    ("30살", "서른 살"),
    ("AI 비서", "에이아이 비서"),
    ("JP모건", "제이피모건"),
    ("SNS에", "에스엔에스에"),
    ("일주일에 수십 번", "일주일에 수십 번"),
    ("3~4개", "삼에서 네 개"),
    ("2배 넘게", "두 배 넘게"),
    ("6배", "여섯 배"),
    ("3.6배로", "삼 점 육 배로"),
    ("10점 만점에 9.2점이에요", "십 점 만점에 구 점 이 점이에요"),
]


def test():
    bad = 0
    for src, want in TESTS:
        got = normalize(src)
        if got != want:
            bad += 1
            print(f"✗ {src!r} → {got!r} (기대: {want!r})")
    print(f"규칙 점검: {len(TESTS) - bad}/{len(TESTS)} 통과")
    return 1 if bad else 0


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        print(__doc__)
        sys.exit(1)
    if a[0] == "--test":
        sys.exit(test())
    if a[0] == "--say":
        print(normalize(" ".join(a[1:])))
        sys.exit(0)
    print(json.dumps(build(a[0]), ensure_ascii=False, indent=2))
