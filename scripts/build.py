#!/usr/bin/env python3
"""posts.json을 읽어 홈 화면(index.html)을 다시 만듭니다.

사용법: python3 scripts/build.py
- posts.json의 가장 최근 글이 '오늘의 장'이 되고, 나머지는 '지난 장'에 쌓입니다.
- 외부 패키지 없이 파이썬 표준 라이브러리만 씁니다.
"""
import datetime as dt
import html
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
WEEKDAYS = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]


def esc(s):
    return html.escape(str(s), quote=True)


def day_class(d):
    wd = d.weekday()
    return " sun" if wd == 6 else (" sat" if wd == 5 else "")


def main():
    posts = json.loads((ROOT / "posts.json").read_text(encoding="utf-8"))
    posts.sort(key=lambda p: p["date"], reverse=True)
    for p in posts:
        f = ROOT / "posts" / f"{p['date']}.html"
        if not f.exists():
            raise SystemExit(f"글 파일이 없어요: {f}")

    today = posts[0]
    d = dt.date.fromisoformat(today["date"])
    href = f"posts/{today['date']}.html"
    stories = "\n".join(
        f'          <li><a href="{href}#{esc(s["anchor"])}"><span class="story-list-tag">{esc(s["tag"])}</span>'
        f'<span class="story-list-title">{esc(s["title"])}</span></a></li>'
        for s in today["stories"]
    )

    rest = posts[1:]
    if rest:
        minis = "\n".join(
            (lambda pd: (
                f'      <a class="mini" href="posts/{p["date"]}.html">'
                f'<span class="mini-num{day_class(pd)}">{pd.day}</span>'
                f'<span class="mini-day">{pd.month}월 {pd.day}일 {WEEKDAYS[pd.weekday()]}</span>'
                f'<span class="mini-title">{esc(p["title"])}</span></a>'
            ))(dt.date.fromisoformat(p["date"]))
            for p in rest
        )
        archive = f'    <div class="archive-grid">\n{minis}\n    </div>'
    else:
        archive = '    <p class="archive-empty">오늘이 첫 장이에요. 내일부터 한 장씩 여기에 쌓여요.</p>'

    tpl = (ROOT / "templates" / "index.template.html").read_text(encoding="utf-8")
    out = (
        tpl.replace("{{MONTH}}", f"{d.year}년 {d.month}월")
        .replace("{{DAY_CLASS}}", day_class(d))
        .replace("{{DAY}}", str(d.day))
        .replace("{{WEEKDAY}}", WEEKDAYS[d.weekday()])
        .replace("{{MINUTES}}", str(today.get("minutes", 5)))
        .replace("{{HREF}}", href)
        .replace("{{TITLE}}", esc(today["title"]))
        .replace("{{SUMMARY}}", esc(today["summary"]))
        .replace("{{STORIES}}", stories)
        .replace("{{ARCHIVE}}", archive)
    )
    (ROOT / "index.html").write_text(out, encoding="utf-8")
    print(f"index.html 생성 완료: 오늘의 장 {today['date']}, 지난 장 {len(rest)}개")


if __name__ == "__main__":
    main()
