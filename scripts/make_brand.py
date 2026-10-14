#!/usr/bin/env python3
"""로고 파일 만들기: assets/brand/sources.json의 힉스필드 원본을 받아 사이트·메일용 로고를 만듭니다.

GitHub Actions(.github/workflows/brand.yml)가 sources.json이나 이 파일이 바뀌면 실행합니다.
직접 실행: python3 scripts/make_brand.py   (pillow 필요, 글자 그림에는 npm이 있으면 Gothic A1을 받아 씀)

만드는 파일 (assets/brand/)
- symbol.png          투명 배경 까치 심볼(높이 256). 상단 메뉴 로고.
- symbol-512.png      큰 심볼(높이 512).
- icon-1024.png       노란 정사각 앱 아이콘(모서리 채움). beehiiv 로고, 앱 출시용.
- icon-512.png, icon-192.png, apple-touch-icon.png(180)
- favicon-32.png, favicon.ico(16·32·48)  둥근 모서리 바깥은 투명.
- lockup.png          심볼 + 손글씨 '아이고!' 조합(투명 배경, 가로 1200).
- email-header.png    메일 맨 위 머리 그림(1200×400, 흰 바탕, 글자 조합). 조합이 없으면 심볼 + Gothic A1 글자.
"""
import json
import pathlib
import subprocess
import sys
import tempfile
import urllib.request
from io import BytesIO

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
BRAND = ROOT / "assets" / "brand"
NAME = "아이고"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "aigo-brand"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    if len(data) < 1000:
        raise SystemExit(f"내려받은 파일이 너무 작아요: {url}")
    return Image.open(BytesIO(data)).convert("RGBA")


def clear_background(im, tol=38):
    """테두리에서 이어진 흰 배경만 투명하게 만듭니다(까치의 흰 배는 검은 선 안쪽이라 그대로 남아요)."""
    rgb = im.convert("RGB")
    w, h = rgb.size
    mark = rgb.copy()
    key = (255, 0, 255)
    seeds = [(x, y) for x in range(0, w, max(1, w // 40)) for y in (0, h - 1)]
    seeds += [(x, y) for y in range(0, h, max(1, h // 40)) for x in (0, w - 1)]
    for s in seeds:
        r, g, b = mark.getpixel(s)
        if min(r, g, b) > 255 - tol and (r, g, b) != key:
            ImageDraw.floodfill(mark, s, key, thresh=tol)
    out = im.copy()
    px, mp = out.load(), mark.load()
    for y in range(h):
        for x in range(w):
            if mp[x, y] == key:
                px[x, y] = (255, 255, 255, 0)
    # 가장자리 흰 테두리 번짐을 줄이려고 반투명 1px 정리
    return out


def crop_alpha(im, pad=0.04):
    box = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    im = im.crop(box)
    p = round(max(im.size) * pad)
    canvas = Image.new("RGBA", (im.width + 2 * p, im.height + 2 * p), (0, 0, 0, 0))
    canvas.paste(im, (p, p), im)
    return canvas


def fit_h(im, h):
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)


def korean_font(size):
    d = pathlib.Path(tempfile.gettempdir()) / "aigo-fonts"
    ttf = d / "GothicA1-Black.ttf"
    if not ttf.exists():
        d.mkdir(exist_ok=True)
        try:
            urllib.request.urlretrieve(
                "https://github.com/google/fonts/raw/main/ofl/gothica1/GothicA1-Black.ttf", ttf)
        except Exception as e:  # 글꼴을 못 받으면 머리 그림 글자를 건너뜁니다
            print(f"::warning::글꼴을 받지 못했어요: {e}")
            return None
    return ImageFont.truetype(str(ttf), size)


def email_header(symbol):
    W, H = 1200, 360
    im = Image.new("RGB", (W, H), "white")
    s = fit_h(symbol, 280)
    font = korean_font(170)
    text_w = 0
    if font:
        text_w = round(ImageDraw.Draw(im).textlength(NAME, font=font))
    gap = 36
    total = s.width + (gap + text_w if font else 0)
    x = (W - total) // 2
    im.paste(s, (x, (H - s.height) // 2), s)
    if font:
        d = ImageDraw.Draw(im)
        bbox = d.textbbox((0, 0), NAME, font=font)
        ty = (H - (bbox[3] - bbox[1])) // 2 - bbox[1]
        d.text((x + s.width + gap, ty), NAME, font=font, fill="black")
    return im


def main():
    src = json.loads((BRAND / "sources.json").read_text(encoding="utf-8"))
    BRAND.mkdir(parents=True, exist_ok=True)

    sym = crop_alpha(clear_background(fetch(src["symbol"])))
    fit_h(sym, 256).save(BRAND / "symbol.png", optimize=True)
    fit_h(sym, 512).save(BRAND / "symbol-512.png", optimize=True)

    icon = crop_alpha(clear_background(fetch(src["icon"])), pad=0)
    side = max(icon.size)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(icon, ((side - icon.width) // 2, (side - icon.height) // 2), icon)
    # 노란 바탕색: 아이콘 위쪽 가운데 근처에서 고릅니다
    bg = sq.convert("RGB").getpixel((side // 2, round(side * 0.06)))
    filled = Image.new("RGB", sq.size, bg)
    filled.paste(sq, (0, 0), sq)
    filled.resize((1024, 1024), Image.LANCZOS).save(BRAND / "icon-1024.png", optimize=True)
    filled.resize((512, 512), Image.LANCZOS).save(BRAND / "icon-512.png", optimize=True)
    filled.resize((192, 192), Image.LANCZOS).save(BRAND / "icon-192.png", optimize=True)
    filled.resize((180, 180), Image.LANCZOS).save(BRAND / "apple-touch-icon.png", optimize=True)
    # 파비콘: 아주 작게 보이므로 머리와 부리만 크게 잘라 씁니다(노란 정사각, 모서리 둥글게)
    c = round(side * 0.80)
    x0, y0 = round(side * 0.16), round(side * 0.04)
    head = filled.crop((x0, y0, min(side, x0 + c), y0 + c)).resize((256, 256), Image.LANCZOS).convert("RGBA")
    mask = Image.new("L", head.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 255, 255), radius=56, fill=255)
    head.putalpha(mask)
    head.resize((32, 32), Image.LANCZOS).save(BRAND / "favicon-32.png", optimize=True)
    head.save(BRAND / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    # 글자 조합(심볼 + 손글씨 '아이고!'): AI 시안의 손글씨가 그림체와 잘 맞아 메일 머리에 씁니다
    lock = None
    if src.get("lockup"):
        lock = crop_alpha(clear_background(fetch(src["lockup"])), pad=0.02)
        lw = 1200
        lock = lock.resize((lw, round(lock.height * lw / lock.width)), Image.LANCZOS)
        lock.save(BRAND / "lockup.png", optimize=True)
    if lock is not None:
        W, H = 1200, 400
        head_img = Image.new("RGB", (W, H), "white")
        k = min(960 / lock.width, 300 / lock.height)
        l2 = lock.resize((round(lock.width * k), round(lock.height * k)), Image.LANCZOS)
        head_img.paste(l2, ((W - l2.width) // 2, (H - l2.height) // 2), l2)
        head_img.save(BRAND / "email-header.png", optimize=True)
    else:
        email_header(sym).save(BRAND / "email-header.png", optimize=True)

    for f in sorted(BRAND.glob("*.png")) + sorted(BRAND.glob("*.ico")):
        print(f"로고 파일: assets/brand/{f.name} ({f.stat().st_size // 1024}KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
