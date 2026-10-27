#!/usr/bin/env python3
"""발행 전 검수용 미리보기 한 장을 만듭니다.

PR을 병합하기 전에는 사이트 주소(posts/날짜.html)가 404라서 글을 볼 수 없어요.
그래서 글 페이지에 스타일, 스크립트, 그림, 녹음을 모두 넣은 파일 하나를 만들어
Claude 아티팩트(비공개 페이지)로 올려 휴대폰에서도 바로 보게 합니다.
글 내용은 글 페이지와 똑같고, 맨 위에 '발행 전 미리보기' 띠만 더해요.

사용법
  python3 scripts/make_preview.py 2026-10-28 [출력 파일]
  (출력 파일을 빼면 preview/아이고-미리보기.html — 저장소에는 올리지 않아요)
"""
import base64
import mimetypes
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
MIME = {".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".ico": "image/x-icon"}


def data_uri(path):
    mime = MIME.get(path.suffix) or mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def build(date):
    page = (ROOT / "posts" / f"{date}.html").read_text(encoding="utf-8")
    css = (ROOT / "assets/style.css").read_text(encoding="utf-8")
    js = (ROOT / "assets/site.js").read_text(encoding="utf-8")
    fonts = re.search(r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com[^"]+)">', page).group(1)

    body = re.search(r"<body>(.*)</body>", page, re.S).group(1)
    missing = []

    def inline(m):
        attr, rel = m.group(1), m.group(2)
        f = ROOT / "assets" / rel
        if not f.exists():
            missing.append(rel)
            return m.group(0)
        return f'{attr}="{data_uri(f)}"'

    # 그림·녹음·로고를 파일 안에 넣어요(아티팩트는 다른 주소의 그림을 막아요)
    body = re.sub(r'(src|data-audio)="\.\./assets/([^"?]+)"', inline, body)
    # 바깥 그림 주소(아직 저장소로 옮기기 전 힉스필드 주소)가 남아 있으면 알려요
    for u in re.findall(r'(?:src|data-audio)="(https?://[^"]+)"', body):
        missing.append(u)
    # 사이트 안 링크는 실제 사이트 주소로 바꿔 눌러도 길을 잃지 않게 해요
    body = re.sub(r'href="\.\./([^"#]*)', r'href="https://artricx.github.io/ailab/\1', body)

    title = re.search(r"<title>(.*?)</title>", page).group(1)
    banner = (
        '<div class="preview-band"><b>발행 전 미리보기</b> '
        f'<span>{date} · 아직 사이트에 올라가지 않은 글이에요. PR을 병합하면 이대로 발행돼요.</span></div>'
    )
    html = f"""<title>아이고 미리보기</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{fonts}">
<style>
{css}
/* 미리보기 전용: 사이트는 밝은 지면 하나로만 디자인했어요(다크 모드 없음) */
:root {{ color-scheme: light; }}
html, body {{ background: #FFFFFF; color: #111111; }}
.preview-band {{ display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline;
  padding: 10px max(16px, env(safe-area-inset-right, 0px)) 10px max(16px, env(safe-area-inset-left, 0px));
  background: #111111; color: #FFFFFF; font: 500 14px/1.5 "Gothic A1", system-ui, sans-serif; }}
.preview-band b {{ font-weight: 900; }}
.preview-band span {{ color: #D6D6D6; }}
</style>
<!-- 원본 제목: {title} -->
{banner}
{body}
<script>
{js}
</script>
"""
    return html, missing


def main():
    date = sys.argv[1]
    out = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "preview" / "아이고-미리보기.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    html, missing = build(date)
    out.write_text(html, encoding="utf-8")
    size = out.stat().st_size / 1e6
    print(f"미리보기 만들기: {out} ({size:.1f}MB)")
    if size > 15.5:
        print("주의: 16MB에 가까워요. 녹음을 빼고 다시 만들어 주세요.")
    for m in missing:
        print("파일 안에 넣지 못한 것:", m)
    sys.exit(1 if missing else 0)


if __name__ == "__main__":
    main()
