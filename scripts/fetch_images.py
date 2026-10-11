#!/usr/bin/env python3
"""힉스필드 등 외부 주소에 있는 그림을 내려받아 assets/img/ 에 저장하고, 글과 목록의 주소를 사이트 안 경로로 바꿉니다.

GitHub Actions(.github/workflows/fetch-images.yml)가 저장소에 올라올 때마다 실행합니다.
직접 실행: python3 scripts/fetch_images.py
"""
import json
import pathlib
import re
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"
URL_RE = re.compile(r"https://d8j0ntlcm91z4\.cloudfront\.net/[^\s\"'<>)]+\.(?:png|jpe?g|webp)")


MAX_W = {"thumb": 900, "full": 1600}


def local_name(url):
    """저장 이름: 원본은 .webp로 바꾸고, 미리보기(_min)는 그대로 webp."""
    name = url.rsplit("/", 1)[-1]
    return name.rsplit(".", 1)[0] + ".webp"


def shrink(raw, dest, max_w):
    """휴대폰에서도 빠르게 열리도록 너비를 줄이고 WebP로 저장합니다."""
    from io import BytesIO
    from PIL import Image
    im = Image.open(BytesIO(raw)).convert("RGB")
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    im.save(dest, "WEBP", quality=82, method=6)


def download(url):
    dest = IMG / local_name(url)
    if not dest.exists():
        req = urllib.request.Request(url, headers={"User-Agent": "ailab-image-fetch"})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        if len(data) < 1000:
            raise SystemExit(f"내려받은 파일이 너무 작아요: {url}")
        shrink(data, dest, MAX_W["thumb" if "_min." in url else "full"])
        print(f"저장: assets/img/{dest.name} ({dest.stat().st_size // 1024}KB)")
    return dest.name


def main():
    IMG.mkdir(parents=True, exist_ok=True)
    changed = False

    # 글 페이지: posts/ 안에서는 ../assets/img/ 로
    for page in sorted((ROOT / "posts").glob("*.html")):
        s = page.read_text(encoding="utf-8")
        urls = set(URL_RE.findall(s))
        for u in urls:
            s = s.replace(u, f"../assets/img/{download(u)}")
        if urls:
            page.write_text(s, encoding="utf-8")
            changed = True

    # 최상위 페이지(구독 페이지 등): assets/img/ 로
    for page in sorted(ROOT.glob("*.html")):
        if page.name == "index.html":
            continue
        t = page.read_text(encoding="utf-8")
        urls = set(URL_RE.findall(t))
        for u in urls:
            t = t.replace(u, f"assets/img/{download(u)}")
        if urls:
            page.write_text(t, encoding="utf-8")
            changed = True

    # 목록: 홈 기준 assets/img/ 로
    pj = ROOT / "posts.json"
    raw = pj.read_text(encoding="utf-8")
    urls = set(URL_RE.findall(raw))
    if urls:
        data = json.loads(raw)
        for p in data:
            for st in p.get("stories", []):
                for key in ("illust", "thumb"):
                    v = st.get(key, "")
                    if URL_RE.fullmatch(v):
                        st[key] = f"assets/img/{download(v)}"
        pj.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        changed = True

    changed = make_og() or changed
    print("바뀐 파일 있음" if changed else "바꿀 외부 그림 없음")
    return 0


SITE = "https://artricx.github.io/ailab/"
OG = ROOT / "assets" / "og"
IMG_SRC_RE = re.compile(r'(?:\.\./)?(assets/img/[^"\s]+\.webp)')


def og_tags(url):
    return (
        f'<meta property="og:image" content="{url}">\n'
        '<meta property="og:image:width" content="1200">\n'
        '<meta property="og:image:height" content="630">\n'
        '<meta name="twitter:card" content="summary_large_image">\n'
    )


def og_jpg(src, dest):
    """공유 미리보기용 1200×630 JPG(카톡·문자·SNS가 잘 읽는 형식). 가운데를 잘라 씁니다."""
    from PIL import Image
    im = Image.open(src).convert("RGB")
    w, h = 1200, 630
    scale = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    left, top = (im.width - w) // 2, (im.height - h) // 2
    im.crop((left, top, left + w, top + h)).save(dest, "JPEG", quality=85, optimize=True, progressive=True)
    print(f"공유 그림: assets/og/{dest.name}")


def add_og(page, url):
    """페이지 head에 공유 미리보기 그림 태그가 없으면 og:description 바로 아래에 넣습니다."""
    t = page.read_text(encoding="utf-8")
    if 'property="og:image"' in t:
        return False
    i = t.find('<meta property="og:description"')
    if i < 0:
        return False
    j = t.index("\n", i) + 1
    page.write_text(t[:j] + og_tags(url) + t[j:], encoding="utf-8")
    return True


def make_og():
    """글마다 첫 그림으로 assets/og/날짜.jpg를 만들고 글 페이지에 연결합니다. 구독 페이지도 같은 방식."""
    OG.mkdir(parents=True, exist_ok=True)
    changed = False
    pages = [(p, p.stem) for p in sorted((ROOT / "posts").glob("*.html"))]
    pages.append((ROOT / "subscribe.html", "subscribe"))
    for page, name in pages:
        if not page.exists():
            continue
        dest = OG / f"{name}.jpg"
        if not dest.exists():
            t = page.read_text(encoding="utf-8")
            m = IMG_SRC_RE.search(t[t.find("<main"):])
            if not m or not (ROOT / m.group(1)).exists():
                continue  # 아직 사이트 안 그림이 없으면 다음 실행 때 만들어요
            og_jpg(ROOT / m.group(1), dest)
            changed = True
        changed = add_og(page, f"{SITE}assets/og/{name}.jpg") or changed
    return changed


if __name__ == "__main__":
    sys.exit(main())
