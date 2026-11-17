#!/usr/bin/env python3
"""'한눈에 보기' 카드를 앱용 그림으로 찍습니다.

글 페이지의 인포그래픽 카드(aside.glance)는 글로 된 칸이라, 그림 파일만 받는 지금 앱은 그대로 보여 주지 못해요.
그래서 카드를 휴대폰 폭(360px, 3배 크기)으로 열어 PNG로 저장하고, extract_content.py가 앱 데이터의
infographic에 넣어요. 블로그는 카드를 그대로 쓰고, 이 그림은 앱만 써요.

만드는 것
- content/graphics/날짜-앵커.png : 카드 그림 (가로 1080px)
- content/graphics/glance.json  : 카드마다 지문(내용 + style.css)과 그림 크기. 바뀐 카드만 다시 찍으려고 적어 둬요.

사용법
  python3 scripts/render_glance.py            모든 글에서 새로 생겼거나 바뀐 카드만
  python3 scripts/render_glance.py 2026-11-18 그날 글만
  python3 scripts/render_glance.py --force    모두 다시
playwright와 beautifulsoup4가 필요해요(check_lines.py와 같아요). 글꼴은 npm 레지스트리에서 받아요.
GitHub Actions(fetch-images.yml)가 앱용 데이터 만들기 바로 앞에서 실행합니다.
"""
import asyncio
import hashlib
import json
import pathlib
import struct
import sys

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from check_lines import fonts_css  # noqa: E402  (같은 글꼴로 찍어요)

ROOT = pathlib.Path(__file__).resolve().parent.parent
GFX = ROOT / "content" / "graphics"
MANIFEST = GFX / "glance.json"
WIDTH = 360   # 카드 폭(CSS px). 블로그 컴퓨터 화면의 오른쪽 칸, 앱 화면 폭과 비슷해요
SCALE = 3     # 휴대폰 화면에서 선명하게
VERSION = "1"  # 찍는 방식을 바꾸면 올려요(모든 카드를 다시 찍어요)

# 카드만 찍히게: 메뉴·버튼을 숨기고, 카드 폭을 고정하고, 모서리는 앱이 둥글게 깎으니 네모로 찍어요.
FIX = (
    ".nav,.to-top,.listen,.listen-all,.share,.other,.get,.footer{display:none!important}"
    f".story>.glance{{width:{WIDTH}px!important;max-width:none!important;margin:0!important;"
    "border-radius:0!important;position:static!important}"
)


def cards(page):
    """글 하나에서 (앵커, 카드 HTML) 목록. 카드는 소식 섹션 바로 아래에 있어요."""
    soup = BeautifulSoup(page.read_text(encoding="utf-8"), "html.parser")
    out = []
    for sec in soup.select("section.story"):
        g = sec.find("aside", class_="glance", recursive=False)
        if g is not None and sec.get("id"):
            out.append((sec["id"], str(g)))
    return out


def png_size(path):
    with open(path, "rb") as f:
        head = f.read(24)
    return struct.unpack(">II", head[16:24])


async def main(args):
    force = "--force" in args
    dates = [a for a in args if not a.startswith("--")]
    pages = sorted((ROOT / "posts").glob("*.html"))
    if dates:
        pages = [p for p in pages if p.stem in dates]
    css = (ROOT / "assets" / "style.css").read_bytes()
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}

    todo, alive = [], set()
    for page in pages:
        for anchor, html in cards(page):
            name = f"{page.stem}-{anchor}.png"
            alive.add(name)
            mark = hashlib.sha1(VERSION.encode() + html.encode() + css).hexdigest()[:16]
            if force or manifest.get(name, {}).get("hash") != mark or not (GFX / name).exists():
                todo.append((page, anchor, name, mark))

    # 카드를 지운 글(예전 그림으로 되돌린 글)의 그림은 치워요. 날짜를 골라 돌릴 때는 건드리지 않아요.
    if not dates:
        for name in [n for n in manifest if n not in alive]:
            (GFX / name).unlink(missing_ok=True)
            del manifest[name]

    if todo:
        GFX.mkdir(parents=True, exist_ok=True)
        fonts = fonts_css()
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx = await b.new_context(viewport={"width": WIDTH + 60, "height": 1400}, device_scale_factor=SCALE)
            for page, anchor, name, mark in todo:
                pg = await ctx.new_page()
                await pg.goto(page.as_uri())
                await pg.add_style_tag(content=fonts + FIX)
                await pg.evaluate("document.fonts.ready")
                await pg.wait_for_timeout(300)
                await pg.locator(f"section#{anchor} > aside.glance").screenshot(path=str(GFX / name), animations="disabled")
                w, h = png_size(GFX / name)
                manifest[name] = {"hash": mark, "width": w, "height": h}
                print(f"카드 그림: {name} ({w}×{h})")
                await pg.close()
            await b.close()

    if manifest or MANIFEST.exists():
        MANIFEST.write_text(json.dumps(dict(sorted(manifest.items())), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"카드 그림 만들기: 새로 {len(todo)}장, 모두 {len(alive) if not dates else len(manifest)}장")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1:]))
