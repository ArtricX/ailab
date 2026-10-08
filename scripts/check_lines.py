#!/usr/bin/env python3
"""줄내림 검사: 홈과 모든 글을 휴대폰~큰 모니터 11가지 폭, 보통·큰 글씨에서 열어
제목이 두 줄을 넘는지, 구절(.ph)이 안에서 다시 끊기는지, 페이지가 옆으로 밀리는지, 그림 칸 비율이 맞는지 확인합니다.

사용법: python3 scripts/check_lines.py   (playwright 필요: pip install playwright --break-system-packages && playwright install chromium)
실제 사이트 글꼴(Gothic A1, Archivo)은 npm 레지스트리에서 받아 씁니다. 문제가 하나라도 있으면 종료 코드 1.
"""
import asyncio, pathlib, subprocess, sys, tempfile
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
WIDTHS = [360, 390, 430, 600, 768, 860, 1024, 1180, 1280, 1440, 1920]


def fonts_css():
    d = pathlib.Path(tempfile.gettempdir()) / "ailab-fonts"
    g = d / "gothic/package/files"
    a = d / "archivo/package/files"
    if not g.exists() or not a.exists():
        d.mkdir(exist_ok=True)
        for pkg, name in (("@fontsource/gothic-a1", "gothic"), ("@fontsource-variable/archivo", "archivo")):
            tgz = subprocess.run(["npm", "pack", pkg, "--silent"], cwd=d, capture_output=True, text=True, check=True).stdout.strip().splitlines()[-1]
            (d / name).mkdir(exist_ok=True)
            subprocess.run(["tar", "xzf", tgz, "-C", name], cwd=d, check=True)
    css = ""
    for w in (400, 500, 700, 800, 900):
        css += f"@font-face{{font-family:'Gothic A1';font-weight:{w};src:url('file://{g}/gothic-a1-korean-{w}-normal.woff2');}}"
        css += f"@font-face{{font-family:'Gothic A1';font-weight:{w};src:url('file://{g}/gothic-a1-latin-{w}-normal.woff2');unicode-range:U+0000-00FF,U+2000-206F;}}"
    css += f"@font-face{{font-family:'Archivo';font-weight:100 900;src:url('file://{a}/archivo-latin-wght-normal.woff2');}}"
    return css


JS = '''() => {
 const out=[]; const vw=innerWidth;
 if (document.documentElement.scrollWidth>vw+1) out.push('page scrolls sideways: '+document.documentElement.scrollWidth);
 const h=document.querySelector('.hero-text h1');
 if(h){ const lh=parseFloat(getComputedStyle(h).lineHeight)||parseFloat(getComputedStyle(h).fontSize)*1.04;
   const n=Math.round(h.getBoundingClientRect().height/lh); if(n!==2) out.push('hero h1 lines='+n);
   h.querySelectorAll('.line').forEach(l=>{ if(l.scrollWidth>h.clientWidth+1) out.push('hero line overflows: '+l.textContent+' '+l.scrollWidth+'>'+h.clientWidth)});}
 document.querySelectorAll('.ph').forEach(el=>{ const cs=getComputedStyle(el.parentElement); const lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.3;
   if(el.getBoundingClientRect().height>lh*1.5) out.push('phrase wraps inside: "'+el.textContent+'" in <'+el.parentElement.tagName.toLowerCase()+' class='+el.parentElement.className+'>');});
 document.querySelectorAll('.nw').forEach(el=>{ if(el.getBoundingClientRect().right>vw) out.push('nowrap overflow: '+el.textContent)});
 document.querySelectorAll('.story-art img, .feature-art img').forEach(im=>{ const b=im.getBoundingClientRect(); const r=b.width/b.height;
   if(b.width>0 && (r<1.30||r>1.37)) out.push('그림 비율이 4:3이 아님: '+Math.round(b.width)+'x'+Math.round(b.height)+' '+im.getAttribute('src'));});
 document.querySelectorAll('.hero-tile img').forEach(im=>{ const b=im.getBoundingClientRect(); const r=b.width/b.height;
   if(b.width>0 && Math.abs(r-1)>0.03) out.push('첫 화면 그림이 정사각형이 아님: '+Math.round(b.width)+'x'+Math.round(b.height));});
 return out;}'''


async def main():
    css = fonts_css()
    pages = sorted(p.name for p in ROOT.glob("*.html")) + sorted(f"posts/{p.name}" for p in (ROOT / "posts").glob("*.html"))
    bad = 0
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for path in pages:
            for large in (False, True):
                for w in WIDTHS:
                    pg = await b.new_page(viewport={"width": w, "height": 900})
                    await pg.goto((ROOT / path).as_uri())
                    await pg.add_style_tag(content=css)
                    if large:
                        await pg.evaluate("document.documentElement.classList.add('large-text')")
                    await pg.evaluate("document.fonts.ready")
                    await pg.wait_for_timeout(250)
                    for x in await pg.evaluate(JS):
                        print(f"{path} {'큰글씨' if large else '보통'} {w}px: {x}")
                        bad += 1
                    await pg.close()
        await b.close()
    print(f"검사 끝: 문제 {bad}개")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    asyncio.run(main())
