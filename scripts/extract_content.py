#!/usr/bin/env python3
"""글 페이지(posts/날짜.html)를 앱·다른 서비스에서도 쓸 수 있는 데이터로 옮깁니다.

만드는 것
- content/날짜.json        : 제목, 소식 3개(그림, 쉽게 알아보기, 출처), 곧 만날지도 몰라요, 오늘의 말
- content/graphics/날짜-앵커.svg : 인포그래픽을 사이트 스타일 없이도 똑같이 보이는 독립 SVG로
- 소식마다 녹음이 있으면(section.story의 data-audio) audio 필드로

규칙
- 글 페이지가 원본이고, 이 파일들은 거기서 자동으로 만들어집니다. 손으로 고치지 않습니다.
- 구절 나눔(`<span class="ph">`)은 phrases 목록으로, 붙여 써야 하는 말(`<span class="nw">`)은 nobreak 목록으로 남깁니다.
- 구조가 틀과 다르면 조용히 넘어가지 않고 멈춥니다.

GitHub Actions(.github/workflows/fetch-images.yml)가 그림 저장 다음에 실행합니다.
직접 실행: python3 scripts/extract_content.py   (beautifulsoup4 필요)
"""
import datetime as dt
import json
import pathlib
import re
import sys

from bs4 import BeautifulSoup, NavigableString

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "content"
GFX = OUT / "graphics"
SITE = "https://artricx.github.io/ailab/"
SCHEMA = 1
WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]
COLORS = ("blue", "yellow", "pink", "green", "red")


class Broken(Exception):
    pass


def need(cond, msg):
    if not cond:
        raise Broken(msg)


def clean(s):
    return re.sub(r"\s+", " ", s or "").strip()


def phrased(el):
    """구절 표시가 있는 글: 전체 글과 구절 목록."""
    if el is None:
        return None
    phs = [clean(x.get_text()) for x in el.find_all("span", class_="ph", recursive=True)]
    return {"text": clean(el.get_text()), "phrases": phs or [clean(el.get_text())]}


def para(el):
    """본문 문단: 전체 글과 붙여 써야 하는 말 목록."""
    nws = [clean(x.get_text()) for x in el.find_all("span", class_="nw")]
    out = {"text": clean(el.get_text())}
    if nws:
        out["nobreak"] = nws
    return out


def sources(el):
    if el is None:
        return []
    out = []
    for a in el.find_all("a"):
        label = clean(a.get_text())
        m = re.match(r"^(.*?)\s*\(([^()]*)\)$", label)
        out.append({
            "name": m.group(1) if m else label,
            "date": m.group(2) if m else "",
            "url": a.get("href", ""),
        })
    return out


def color_of(el, prefix):
    for c in el.get("class", []):
        if c.startswith(prefix) and c[len(prefix):] in COLORS:
            return c[len(prefix):]
    return ""


# ── 인포그래픽: 사이트 CSS의 색과 글꼴을 SVG 안에 넣어 혼자서도 똑같이 보이게 ──

def css_vars():
    css = (ROOT / "assets" / "style.css").read_text(encoding="utf-8")
    root = css[css.index(":root"): css.index("}", css.index(":root"))]
    vars_ = dict(re.findall(r"(--[\w-]+):\s*([^;]+);", root))
    rules = re.findall(r"\.figure svg ([^{]+)\{([^}]*)\}", css)
    return vars_, rules


def svg_style():
    vars_, rules = css_vars()

    def sub(v):
        return re.sub(r"var\((--[\w-]+)\)", lambda m: vars_.get(m.group(1), m.group(0)).strip(), v)

    lines = []
    for sel, body in rules:
        sel = sel.strip()
        lines.append(f"{sel} {{ {sub(clean(body))} }}")
    return "\n".join(lines)


def raw_svg(raw, anchor):
    """원본 글에서 해당 소식의 <svg>…</svg>를 그대로 잘라 옵니다(viewBox처럼 대소문자가 중요한 속성을 지키려고)."""
    i = raw.find(f'id="{anchor}"')
    need(i >= 0, f"{anchor}: 원본에서 섹션을 못 찾았어요")
    a = raw.find("<svg", i)
    b = raw.find("</svg>", a)
    need(a >= 0 and b >= 0, f"{anchor}: 인포그래픽 svg를 못 찾았어요")
    return raw[a:b + len("</svg>")]


def standalone_svg(svg_src, style, ground):
    """사이트 스타일 없이도 똑같이 보이는 SVG 파일. XML로 읽히는지 확인합니다."""
    import xml.etree.ElementTree as ET
    head_end = svg_src.index(">") + 1
    head = svg_src[:head_end]
    head = re.sub(r'\s+aria-labelledby="[^"]*"', "", head)
    if "xmlns=" not in head:
        head = head.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"', 1)
    vb = re.search(r'viewBox="([^"]+)"', head)
    x, y, w, h = (vb.group(1).split() if vb else ["0", "0", "800", "450"])
    body = (
        f"\n<style>\n{style}\n</style>"
        f'\n<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{ground}"/>'
    )
    out = '<?xml version="1.0" encoding="UTF-8"?>\n' + head + body + svg_src[head_end:] + "\n"
    try:
        ET.fromstring(out.split("?>", 1)[1])
    except ET.ParseError as e:
        raise Broken(f"인포그래픽이 SVG 파일로 읽히지 않아요: {e}")
    return out


# ── 글 하나 ──

def extract(page, style):
    date = page.stem
    d = dt.date.fromisoformat(date)
    raw = page.read_text(encoding="utf-8")
    soup = BeautifulSoup(raw, "html.parser")
    main = soup.find("main")
    need(main is not None, "main이 없어요")

    hero = main.find("header", class_="post-hero")
    need(hero is not None, "머리(post-hero)가 없어요")
    minutes = re.search(r"(\d+)\s*분", hero.get_text())

    meta = {m.get("property") or m.get("name"): m.get("content") for m in soup.find_all("meta") if m.get("content")}

    chips = []
    for a in hero.select(".chips a.chip"):
        em = a.find("em")
        tag = clean(em.get_text()) if em else ""
        label = clean(a.get_text())
        chips.append({
            "anchor": a.get("href", "").lstrip("#"),
            "tag": tag,
            "color": color_of(a, "c-"),
            "label": label[len(tag):].strip() if tag and label.startswith(tag) else label,
        })

    stories = []
    for sec in main.find_all("section", class_="story"):
        anchor = sec.get("id", "")
        need(anchor, "소식 섹션에 id가 없어요")
        head = sec.find(class_="story-head")
        need(head is not None, f"{anchor}: story-head가 없어요")
        tag_el = head.find(class_="pill-tag")

        art = sec.find(class_="story-art")
        img = art.find("img") if art else None
        illust = None
        if img is not None and img.get("src"):
            src = img["src"]
            rel = src[3:] if src.startswith("../") else src
            illust = {
                "src": rel,
                "url": rel if rel.startswith("http") else SITE + rel,
                "width": int(img.get("width", 0) or 0),
                "height": int(img.get("height", 0) or 0),
                "alt": clean(img.get("alt", "")),
            }

        fig = sec.find("figure", class_="figure")
        graphic = None
        if fig is not None and fig.find("svg") is not None:
            svg = fig.find("svg")
            name = f"{date}-{anchor}.svg"
            GFX.mkdir(parents=True, exist_ok=True)
            (GFX / name).write_text(standalone_svg(raw_svg(raw, anchor), style, GROUND), encoding="utf-8")
            t, ds = svg.find("title"), svg.find("desc")
            graphic = {
                "file": f"content/graphics/{name}",
                "url": f"{SITE}content/graphics/{name}",
                "viewBox": (re.search(r'viewBox="([^"]+)"', raw_svg(raw, anchor)) or [None, ""])[1],
                "title": clean(t.get_text()) if t else "",
                "desc": clean(ds.get_text()) if ds else "",
                "caption": phrased(fig.find("figcaption")),
            }

        # 녹음(앱의 '소리로 듣기'): 소식 섹션의 data-audio. 없으면 null
        audio = None
        if sec.get("data-audio"):
            a = sec["data-audio"]
            rel = a[3:] if a.startswith("../") else a
            audio = {"src": rel, "url": rel if rel.startswith("http") else SITE + rel}

        qa = []
        for block in sec.select(".qa > div"):
            h3, p = block.find("h3"), block.find("p")
            if h3 and p:
                qa.append({"q": clean(h3.get_text()), "a": para(p)})
        need(len(qa) == 3, f"{anchor}: 쉽게 알아보기가 3개가 아니에요({len(qa)}개)")

        stories.append({
            "anchor": anchor,
            "url": f"{SITE}posts/{date}.html#{anchor}",
            "tag": clean(tag_el.get_text()) if tag_el else "",
            "color": color_of(sec, "a-"),
            "title": phrased(head.find("h2")),
            "dek": phrased(head.find(class_="dek")),
            "illustration": illust,
            "infographic": graphic,
            "qa": qa,
            "sources": sources(sec.find(class_="source")),
            "audio": audio,
        })
    need(len(stories) == 3, f"소식이 3개가 아니에요({len(stories)}개)")

    soon = None
    soon_sec = main.find("section", class_="soon")
    if soon_sec is not None:
        box = soon_sec.find(class_="soon-box") or soon_sec
        soon = {
            "title": phrased(box.find("h2")),
            "paragraphs": [para(p) for p in box.find_all("p") if "source" not in (p.get("class") or [])],
            "sources": sources(box.find(class_="source")),
        }

    words = []
    gl = main.find("section", id="words")
    if gl is not None:
        for t in gl.select(".ticket"):
            b = t.find("b")
            span = b.find_next_sibling("span") if b else None
            words.append({
                "word": clean(b.get_text()) if b else "",
                "meaning": phrased(span),
                "color": color_of(t, "c-"),
            })

    return {
        "schema": SCHEMA,
        "date": date,
        "weekday": WEEKDAYS[d.weekday()],
        "url": f"{SITE}posts/{date}.html",
        "minutes": int(minutes.group(1)) if minutes else None,
        "title": phrased(hero.find("h1")),
        "share": {
            "title": meta.get("og:title", ""),
            "description": meta.get("og:description", ""),
            "image": meta.get("og:image", ""),
        },
        "chips": chips,
        "stories": stories,
        "soon": soon,
        "words": words,
    }


GROUND = "#EDEEF0"


def main():
    global GROUND
    OUT.mkdir(exist_ok=True)
    GROUND = css_vars()[0].get("--ground", GROUND).strip()
    style = svg_style()
    pages = sorted((ROOT / "posts").glob("*.html"))
    index = []
    failed = []
    for page in pages:
        try:
            data = extract(page, style)
        except Broken as e:
            failed.append(f"{page.name}: {e}")
            continue
        (OUT / f"{page.stem}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        index.append({
            "date": data["date"],
            "title": data["title"]["text"],
            "file": f"content/{page.stem}.json",
            "stories": [{"anchor": s["anchor"], "tag": s["tag"], "color": s["color"], "title": s["title"]["text"]} for s in data["stories"]],
        })
    index.sort(key=lambda x: x["date"], reverse=True)
    (OUT / "index.json").write_text(json.dumps({"schema": SCHEMA, "posts": index}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"데이터 만들기: 글 {len(index)}편, 인포그래픽 {len(list(GFX.glob('*.svg')))}개")
    if failed:
        print("구조가 틀과 달라 멈춘 글:\n  " + "\n  ".join(failed))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
