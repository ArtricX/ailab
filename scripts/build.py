#!/usr/bin/env python3
"""posts.json을 읽어 홈 화면(index.html)을 다시 만들고, CSS·JS 주소에 바뀜 꼬리표를 붙입니다.

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


def ph(s):
    """'|'로 나눈 구절을 <span class="ph">로 감쌉니다. 줄은 구절 사이에서만 바뀝니다."""
    parts = [p.strip() for p in str(s).split("|") if p.strip()]
    if len(parts) <= 1:
        return esc(str(s).replace("|", " "))
    return " ".join(f'<span class="ph">{esc(p)}</span>' for p in parts)


def plain(s):
    return " ".join(p.strip() for p in str(s).split("|") if p.strip())


def check(posts):
    for p in posts:
        if not (ROOT / "posts" / f"{p['date']}.html").exists():
            raise SystemExit(f"글 파일이 없어요: posts/{p['date']}.html")
        if len(p["stories"]) != 3:
            raise SystemExit(f"{p['date']}: 소식은 3개여야 해요")
        for s in p["stories"]:
            if s["illust"] and not s["illust"].startswith("https://") and not (ROOT / s["illust"]).exists():
                raise SystemExit(f"일러스트 파일이 없어요: {s['illust']}")
            if s["color"] not in COLORS:
                raise SystemExit(f"색 이름이 잘못됐어요: {s['color']}")


def thumb(s):
    return s.get("thumb") or s["illust"]


SITE = "https://artricx.github.io/ailab/"


def art_open(s, tag, cls, attrs="", lazy=False):
    """그림 칸 여는 태그와 그림. 그림이 없는 날(생성 실패 등)은 빈 회색 대신 소식 색 지면을 둡니다."""
    if thumb(s):
        load = ' loading="lazy"' if lazy else ""
        return f'<{tag} class="{cls}"{attrs}><img src="{esc(thumb(s))}" alt=""{load}>'
    return f'<{tag} class="{cls} no-art c-{esc(s["color"])}"{attrs}>'


def og_meta(posts):
    """카톡·문자 공유 미리보기 그림: 가장 최근에 만들어진 assets/og/날짜.jpg를 홈에도 씁니다."""
    for p in posts:
        if (ROOT / "assets" / "og" / f"{p['date']}.jpg").exists():
            return (
                f'<meta property="og:image" content="{SITE}assets/og/{p["date"]}.jpg">\n'
                '<meta property="og:image:width" content="1200">\n'
                '<meta property="og:image:height" content="630">\n'
                '<meta name="twitter:card" content="summary_large_image">'
            )
    return ""


def feature(p, s, lead=False):
    d = dt.date.fromisoformat(p["date"])
    cls = "feature lead" if lead else "feature"
    dek = f'\n          <p class="feature-dek">{ph(s["dek"])}</p>' if lead else ""
    return (
        f'        <a class="{cls}" href="posts/{p["date"]}.html#{esc(s["anchor"])}">\n'
        f'          {art_open(s, "div", "feature-art", lazy=True)}'
        f'<span class="side-label">{d.month:02d}.{d.day:02d} {esc(s["tag"])}</span></div>\n'
        f'          <span class="feature-tag">{esc(s["tag"])}</span>\n'
        f'          <h3>{ph(s["title"])}</h3>{dek}\n'
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
        f'        <div class="ticket {TICKET_COLORS[i % len(TICKET_COLORS)]}"><b>{esc(k["word"])}</b><span>{ph(k["meaning"])}</span></div>'
        for i, k in enumerate(today.get("keywords", []))
    )

    rest = posts[1:]
    if rest:
        items = []
        for p in rest:
            pd = dt.date.fromisoformat(p["date"])
            items.append(
                f'        <a class="archive-item" href="posts/{p["date"]}.html">'
                f'<img src="{esc(thumb(p["stories"][0]))}" alt="" loading="lazy">'
                f'<span class="archive-date">{pd.year}.{pd.month:02d}.{pd.day:02d} {WEEKDAYS[pd.weekday()]}</span>'
                f'<span class="archive-title">{ph(p["title"])}</span></a>'
            )
        archive = '      <div class="archive">\n' + "\n".join(items) + "\n      </div>"
    else:
        archive = '      <p class="empty">오늘이 첫 소식이에요. 내일부터 지난 소식이 여기에 쌓여요.</p>'

    tpl = (ROOT / "templates" / "index.template.html").read_text(encoding="utf-8")
    out = (
        tpl.replace("{{DATE_DOTS}}", f"{d.year}.{d.month:02d}.{d.day:02d}")
        .replace("{{WEEKDAY}}", WEEKDAYS[d.weekday()])
        .replace("{{HREF}}", href)
        .replace("{{SUMMARY}}", ph(today["summary"]))
        .replace("{{HERO_TILES}}", "\n".join(
            "      " + art_open(s, "a", "hero-tile", f' href="{href}#{esc(s["anchor"])}"') + "</a>" for s in st[:2]))
        .replace("{{OG_META}}", og_meta(posts))
        .replace("{{FEATURES}}", features)
        .replace("{{TICKETS}}", tickets)
        .replace("{{ARCHIVE}}", archive)
    )
    (ROOT / "index.html").write_text(out, encoding="utf-8")
    print(f"index.html 생성 완료: 오늘 {today['date']}, 지난 소식 {len(rest)}개")


def bust_cache():
    """style.css와 site.js 주소 뒤에 파일 내용으로 만든 꼬리표(?v=…)를 붙입니다.
    파일이 바뀌면 꼬리표도 바뀌어서, 방문자 브라우저가 예전 파일을 쓰지 않고 새 파일을 바로 받아요."""
    import hashlib
    import re
    tags = {}
    for name in ("style.css", "site.js"):
        data = (ROOT / "assets" / name).read_bytes()
        tags[name] = hashlib.sha256(data).hexdigest()[:10]
    pages = [ROOT / "templates" / "index.template.html", ROOT / "index.html"]
    pages += sorted(ROOT.glob("*.html")) + sorted((ROOT / "posts").glob("*.html"))
    changed = 0
    for page in dict.fromkeys(pages):
        if not page.exists():
            continue
        s = page.read_text(encoding="utf-8")
        t = s
        for name, tag in tags.items():
            t = re.sub(r'(assets/' + re.escape(name) + r')(\?v=[0-9a-f]+)?"', r'\1?v=' + tag + '"', t)
        if t != s:
            page.write_text(t, encoding="utf-8")
            changed += 1
    print(f"꼬리표 갱신: style.css?v={tags['style.css']}, site.js?v={tags['site.js']} (파일 {changed}개)")


if __name__ == "__main__":
    bust_cache()
    main()
