#!/usr/bin/env python3
"""posts.json을 읽어 홈 화면(index.html)을 다시 만듭니다.

사용법: python3 scripts/build.py
- posts.json의 가장 최근 글이 홈의 '오늘의 소식'이 되고, 나머지는 '지난 소식'에 쌓입니다.
- 글 파일(posts/날짜.html)과 일러스트 파일이 모두 있는지 확인합니다.
- 외부 패키지 없이 파이썬 표준 라이브러리만 씁니다.
"""
import datetime as dt
import html
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]
TICKET_COLORS = ["c-yellow", "c-blue", "c-pink", "c-green", "c-red"]
COLORS = {"blue", "yellow", "pink", "green", "red"}


def esc(s):
    return html.escape(str(s), quote=True)


def check(posts):
    for p in posts:
        if not (ROOT / "posts" / f"{p['date']}.html").exists():
            raise SystemExit(f"글 파일이 없어요: posts/{p['date']}.html")
        if len(p["stories"]) != 3:
            raise SystemExit(f"{p['date']}: 소식은 3개여야 해요")
        for s in p["stories"]:
            if not (ROOT / s["illust"]).exists():
                raise SystemExit(f"일러스트 파일이 없어요: {s['illust']}")
            if s["color"] not in COLORS:
                raise SystemExit(f"색 이름이 잘못됐어요: {s['color']}")


def feature(p, s, lead=False):
    d = dt.date.fromisoformat(p["date"])
    cls = "feature lead" if lead else "feature"
    dek = f'\n          <p class="feature-dek">{esc(s["dek"])}</p>' if lead else ""
    return (
        f'        <a class="{cls}" href="posts/{p["date"]}.html#{esc(s["anchor"])}">\n'
        f'          <div class="feature-art"><img src="{esc(s["illust"])}" alt="">'
        f'<span class="side-label">{d.month:02d}.{d.day:02d} {esc(s["tag"])}</span></div>\n'
        f'          <span class="feature-tag">{esc(s["tag"])}</span>\n'
        f'          <h3>{esc(s["title"])}</h3>{dek}\n'
        f'        </a>'
    )


def main():
    posts = json.loads((ROOT / "posts.json").read_text(encoding="utf-8"))
    posts.sort(key=lambda p: p["date"], reverse=True)
    check(posts)

    today = posts[0]
    d = dt.date.fromisoformat(today["date"])
    st = today["stories"]
    href = f"posts/{today['date']}.html"

    features = (
        feature(today, st[0], lead=True)
        + '\n        <div class="feature-stack">\n'
        + "\n".join(feature(today, s) for s in st[1:])
        + "\n        </div>"
    )
    tickets = "\n".join(
        f'        <div class="ticket {TICKET_COLORS[i % len(TICKET_COLORS)]}"><b>{esc(k["word"])}</b><span>{esc(k["meaning"])}</span></div>'
        for i, k in enumerate(today.get("keywords", []))
    )

    rest = posts[1:]
    if rest:
        items = []
        for p in rest:
            pd = dt.date.fromisoformat(p["date"])
            items.append(
                f'        <a class="archive-item" href="posts/{p["date"]}.html">'
                f'<img src="{esc(p["stories"][0]["illust"])}" alt="">'
                f'<span class="archive-date">{pd.year}.{pd.month:02d}.{pd.day:02d} {WEEKDAYS[pd.weekday()]}</span>'
                f'<span class="archive-title">{esc(p["title"])}</span></a>'
            )
        archive = '      <div class="archive">\n' + "\n".join(items) + "\n      </div>"
    else:
        archive = '      <p class="empty">오늘이 첫 소식이에요. 내일부터 지난 소식이 여기에 쌓여요.</p>'

    tpl = (ROOT / "templates" / "index.template.html").read_text(encoding="utf-8")
    out = (
        tpl.replace("{{DATE_DOTS}}", f"{d.year}.{d.month:02d}.{d.day:02d}")
        .replace("{{WEEKDAY}}", WEEKDAYS[d.weekday()])
        .replace("{{HREF}}", href)
        .replace("{{SUMMARY}}", esc(today["summary"]))
        .replace("{{A0}}", esc(st[0]["anchor"])).replace("{{I0}}", esc(st[0]["illust"]))
        .replace("{{A1}}", esc(st[1]["anchor"])).replace("{{I1}}", esc(st[1]["illust"]))
        .replace("{{FEATURES}}", features)
        .replace("{{TICKETS}}", tickets)
        .replace("{{ARCHIVE}}", archive)
    )
    (ROOT / "index.html").write_text(out, encoding="utf-8")
    print(f"index.html 생성 완료: 오늘 {today['date']}, 지난 소식 {len(rest)}개")


if __name__ == "__main__":
    main()
