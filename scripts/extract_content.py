#!/usr/bin/env python3
"""글 페이지(posts/날짜.html)를 앱·다른 서비스에서도 쓸 수 있는 데이터로 옮깁니다.

만드는 것
- content/날짜.json        : 제목, 소식 3개(그림, 쉽게 알아보기, 출처), 곧 만날지도 몰라요, 오늘의 말
- content/graphics/날짜-앵커.svg : 인포그래픽을 사이트 스타일 없이도 똑같이 보이는 독립 SVG로
- '한눈에 보기' 카드(aside.glance, 2026-11-18부터의 인포그래픽)는 카드 글을 glance로 옮기고,
  render_glance.py가 찍어 둔 카드 그림(content/graphics/날짜-앵커.png)을 infographic에 넣어요(앱은 그림을 보여 줘요)
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
import struct
import sys

from bs4 import BeautifulSoup, NavigableString

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "content"
GFX = OUT / "graphics"
SITE = "https://aigo.artricx.com/"
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
        card = sec.find("aside", class_="glance", recursive=False)
        graphic = None
        glance = None
        if card is not None:
            glance = glance_data(card, anchor)
            graphic = glance_graphic(date, anchor, glance)
        elif fig is not None and fig.find("svg") is not None:
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
            **({"glance": glance} if glance else {}),
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


# ── '한눈에 보기' 카드: 카드 글을 데이터로, 앱에는 render_glance.py가 찍은 카드 그림을 ──

def ratio_of(el):
    m = re.search(r"--v\s*:\s*([0-9.]+)", el.get("style", ""))
    return float(m.group(1)) if m else None


def glance_data(card, anchor):
    """카드 하나를 칸 목록으로. 모르는 칸이 있으면 멈춰요(사이트에는 보여도 앱 데이터에서 빠지지 않게)."""
    key = card.find(class_="g-key")
    num = key.find(class_="g-num") if key else None
    what = key.find(class_="g-what") if key else None
    need(num is not None and what is not None, f"{anchor}: 한눈에 보기 카드에 핵심 숫자(g-key 안 g-num·g-what)가 없어요")
    src = key.find(class_="g-src")
    out = {"key": {"num": clean(num.get_text()), "what": phrased(what), "source": clean(src.get_text()) if src else ""}, "blocks": []}
    for el in card.find_all(recursive=False):
        cls = el.get("class") or []
        if {"glance-label", "g-key", "g-rule"} & set(cls):
            continue
        if "g-stat" in cls:
            b = el.find("b")
            need(b is not None, f"{anchor}: 숫자 줄(g-stat)에 숫자(b)가 없어요")
            out["blocks"].append({"type": "stat", "num": clean(b.get_text()), "text": phrased(b.find_next_sibling("span"))})
        elif "g-group" in cls:
            head = el.find(class_="g-head")
            hc = (head.get("class") or []) if head else []
            block = {"head": clean(head.get_text()) if head else "",
                     "head_style": "warn" if "is-warn" in hc else "color" if "is-color" in hc else ""}
            lst, facts, steps, bars = el.find("ul", class_="g-list"), el.find("dl", class_="g-facts"), el.find("ol", class_="g-steps"), el.find(class_="g-bars")
            if lst is not None:
                lc = lst.get("class") or []
                block.update(type="list", style="check" if "is-check" in lc else "x" if "is-x" in lc else "dot",
                             items=[phrased(li) for li in lst.find_all("li", recursive=False)])
            elif facts is not None:
                block.update(type="facts", items=[{"label": clean(d.find("dt").get_text()), "text": phrased(d.find("dd"))}
                                                  for d in facts.find_all("div", recursive=False) if d.find("dt") and d.find("dd")])
            elif steps is not None:
                block.update(type="steps", items=[phrased(li) for li in steps.find_all("li", recursive=False)])
            elif bars is not None:
                items = []
                for bar in bars.find_all(class_="g-bar", recursive=False):
                    lab, val = bar.find("span", recursive=False), bar.find("b")
                    need(lab is not None and val is not None and ratio_of(bar) is not None, f"{anchor}: 막대(g-bar)에 이름·값·--v가 다 있어야 해요")
                    items.append({"label": clean(lab.get_text()), "value": clean(val.get_text()), "ratio": ratio_of(bar),
                                  "main": "is-main" in (bar.get("class") or [])})
                small = bars.find(class_="g-small")
                block.update(type="bars", items=items, note=clean(small.get_text()) if small else "")
            else:
                need(False, f"{anchor}: 한눈에 보기 묶음(g-group)에 목록·이름표·순서·막대 중 하나가 없어요")
            need(block["items"], f"{anchor}: 한눈에 보기 묶음 '{block['head']}'이 비어 있어요")
            out["blocks"].append(block)
        elif "g-note" in cls:
            h = el.find("h4")
            out["blocks"].append({"type": "note", "head": clean(h.get_text()) if h else "알아 두세요",
                                  "items": [phrased(p) for p in el.find_all("p", recursive=False)]})
        elif "g-foot" in cls:
            out["blocks"].append({"type": "foot", "text": phrased(el)})
        else:
            need(False, f"{anchor}: 한눈에 보기 카드에 모르는 칸이 있어요({' '.join(cls) or el.name})")
    return out


def glance_text(g):
    """화면 읽기 프로그램용으로 카드 내용을 글 한 덩어리로."""
    parts = [f"{g['key']['num']} {g['key']['what']['text']}", g["key"]["source"]]
    for b in g["blocks"]:
        if b["type"] == "stat":
            parts.append(f"{b['num']} {b['text']['text'] if b['text'] else ''}")
        elif b["type"] in ("list", "steps"):
            parts.append(f"{b['head']}: " + ", ".join(x["text"] for x in b["items"]))
        elif b["type"] == "facts":
            parts.append(f"{b['head']}: " + ", ".join(f"{x['label']} {x['text']['text']}" for x in b["items"]))
        elif b["type"] == "bars":
            parts.append(f"{b['head']}: " + ", ".join(f"{x['label']} {x['value']}" for x in b["items"]) + (f". {b['note']}" if b["note"] else ""))
        elif b["type"] == "note":
            parts.append(f"{b['head']}: " + " ".join(x["text"] for x in b["items"]))
        elif b["type"] == "foot":
            parts.append(b["text"]["text"])
    return ". ".join(clean(p).rstrip(".") for p in parts if clean(p)) + "."


MISSING_CARDS = []


def glance_graphic(date, anchor, g):
    """render_glance.py가 찍은 카드 그림. 아직 없으면 null(앱은 인포그래픽 칸을 빼고 보여 줘요)."""
    name = f"{date}-{anchor}.png"
    path = GFX / name
    if not path.exists():
        MISSING_CARDS.append(name)
        return None
    with open(path, "rb") as f:
        w, h = struct.unpack(">II", f.read(24)[16:24])
    return {
        "file": f"content/graphics/{name}",
        "url": f"{SITE}content/graphics/{name}",
        "viewBox": f"0 0 {w} {h}",
        "title": f"한눈에 보기: {g['key']['num']} {g['key']['what']['text']}",
        "desc": glance_text(g),
        "caption": None,
        "kind": "card",
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
    cards = len(list(GFX.glob("*.png"))) if GFX.exists() else 0
    print(f"데이터 만들기: 글 {len(index)}편, 인포그래픽 {len(list(GFX.glob('*.svg')))}개, 한눈에 보기 카드 그림 {cards}장")
    if MISSING_CARDS:
        print("카드 그림이 아직 없는 소식(python3 scripts/render_glance.py로 만들어요. Actions는 저절로 해요):\n  " + "\n  ".join(MISSING_CARDS))
    if failed:
        print("구조가 틀과 달라 멈춘 글:\n  " + "\n  ".join(failed))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
