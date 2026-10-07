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


def local_name(url):
    return url.rsplit("/", 1)[-1]


def download(url):
    dest = IMG / local_name(url)
    if not dest.exists():
        req = urllib.request.Request(url, headers={"User-Agent": "ailab-image-fetch"})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        if len(data) < 1000:
            raise SystemExit(f"내려받은 파일이 너무 작아요: {url}")
        dest.write_bytes(data)
        print(f"저장: assets/img/{dest.name} ({len(data) // 1024}KB)")
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

    print("바뀐 파일 있음" if changed else "바꿀 외부 그림 없음")
    return 0


if __name__ == "__main__":
    sys.exit(main())
