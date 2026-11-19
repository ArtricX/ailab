#!/usr/bin/env python3
"""새 디자인(2026-11)으로 글 페이지와 안내 페이지의 머리·끝을 바꿉니다. 한 번만 돌리면 되고, 다시 돌려도 결과가 같아요.

사용법: python3 scripts/migrate_design.py
- 글(posts/*.html): head의 아이콘·글꼴 줄, 상단 메뉴, '홈 › 날짜 소식' 길 표시, 날짜 줄, 오늘의 말 안내 문장,
  받아 보기(앱 + 메일), 바닥글을 바꿔요. 소식 본문(section.story)과 인포그래픽, 오늘의 말 칸은 그대로 둬요.
- 안내 페이지(subscribe.html, copyright.html, privacy.html, terms.html): head와 상단 메뉴, 바닥글만 바꿔요.
"""
import datetime as dt
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]
APP_STORE = "https://apps.apple.com/kr/app/id6827768014"
PLAY_STORE = "https://play.google.com/store/apps/details?id=com.artricx.aigo"
PRETENDARD = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">'


def icons(base):
    return (
        f'<link rel="icon" href="{base}assets/ui/favicon.ico" sizes="any">\n'
        f'<link rel="icon" type="image/png" href="{base}assets/ui/favicon-32.png">\n'
        f'<link rel="apple-touch-icon" href="{base}assets/ui/apple-touch-icon.png">'
    )


def header(base, links, app_href="#subscribe"):
    """상단 메뉴. links: [(href, 이름)] — 컴퓨터 화면에만 보이는 바로 가기."""
    out = [
        '  <header class="nav">',
        '    <div class="nav-in">',
        f'      <a class="logo" href="{base}index.html"><img src="{base}assets/ui/logo.png" alt="아이고 AI-go" width="130" height="34"><span class="logo-en" aria-hidden="true">AI-go</span></a>',
    ]
    if links:
        out.append('      <nav class="nav-links" aria-label="바로 가기">')
        for href, name in links:
            if href == "|":
                out.append('        <span class="nav-sep" aria-hidden="true"></span>')
            else:
                out.append(f'        <a href="{href}">{name}</a>')
        out.append('      </nav>')
    out += [
        f'      <a class="nav-archive" href="{base}index.html#archive">지난 소식</a>',
        '      <button class="text-toggle" type="button" id="text-toggle" aria-pressed="false"><span class="tt-icon" aria-hidden="true">가+</span><span class="tt-label">글자 크게</span></button>',
        f'      <a class="nav-app" href="{app_href}">앱으로 받기</a>',
        '    </div>',
        '  </header>',
    ]
    return "\n".join(out)


def footer(base, next_line="내일 아침 7시에 다음 소식이 올라와요."):
    return "\n".join([
        '  <footer class="footer">',
        '    <div class="footer-in">',
        f'      <p class="footer-next">{next_line}</p>',
        '      <p class="footer-about">글은 AI가 쓰고 사람이 확인한 뒤 올려요. 숫자와 내용은 출처의 보도를 바탕으로 해요.</p>',
        f'      <p class="footer-links">아이고 AI-go · <a href="{base}copyright.html">출처와 저작권 안내</a> · <a href="{base}privacy.html">개인정보처리방침</a> · <a href="{base}terms.html">이용약관</a></p>',
        '    </div>',
        '  </footer>',
    ])


def get_section(base, indent="    "):
    """받아 보기: 앱 안내 + 메일 안내. id="subscribe"는 예전 구독 칸과 같은 자리 표시예요."""
    lines = [
        '<section class="get" id="subscribe" aria-label="아이고 받아 보기">',
        '  <div class="get-app">',
        f'    <img class="get-icon" src="{base}assets/email/app-icon.png" alt="" width="56" height="56">',
        '    <h2><span class="ph">아이고 앱으로</span> <span class="ph">받아 보세요</span></h2>',
        '    <p><span class="ph">매일 아침 정한 시간에</span> <span class="ph">알림으로 알려 드려요.</span> <span class="ph">읽어도 되고,</span> <span class="ph">들어도 돼요.</span></p>',
        '    <div class="stores">',
        f'      <a href="{APP_STORE}"><img src="{base}assets/email/badge-app-store.png" alt="App Store에서 다운로드 하기" width="156" height="48"></a>',
        f'      <a href="{PLAY_STORE}"><img src="{base}assets/email/badge-google-play.png" alt="Google Play에서 다운로드" width="163" height="48"></a>',
        '    </div>',
        '  </div>',
        '  <div class="get-mail">',
        '    <h2><span class="ph">메일로</span> <span class="ph">받아 보기</span></h2>',
        '    <p><span class="ph">매일 아침 7시,</span> <span class="ph">오늘의 AI 소식 세 가지를</span> <span class="ph">메일 한 통으로 보내 드려요.</span> <span class="ph">하루 한 통만 보내고,</span> <span class="ph">언제든 끊을 수 있어요.</span></p>',
        f'    <a class="btn btn-yellow" href="{base}subscribe.html#sub-form">메일로 받아보기</a>',
        '  </div>',
        '</section>',
    ]
    return "\n".join(indent + l for l in lines)


def head_fix(s, base):
    """아이콘을 새 앱 아이콘으로, Pretendard 글꼴 줄을 넣어요(예전 인포그래픽용 Gothic A1·Archivo 줄은 그대로)."""
    s = re.sub(r'<link rel="icon" href="[^"]*favicon\.ico" sizes="any">\n<link rel="icon" type="image/png" href="[^"]*favicon-32\.png">\n<link rel="apple-touch-icon" href="[^"]*apple-touch-icon\.png">',
               icons(base), s, count=1)
    if "pretendard" not in s:
        s = re.sub(r'(\n<link rel="stylesheet" href="[^"]*assets/style\.css)', "\n" + PRETENDARD + r"\1", s, count=1)
    return s


class Skip(Exception):
    pass


def one(pattern, s, what, flags=re.S):
    m = list(re.finditer(pattern, s, flags))
    if len(m) != 1:
        raise Skip(f"{what}: {len(m)}개")
    return m[0]


def migrate_post(path):
    s = path.read_text(encoding="utf-8")
    if 'class="nav-in"' in s:
        return False  # 이미 바꾼 글
    date = path.stem
    d = dt.date.fromisoformat(date)
    s = head_fix(s, "../")

    # 상단 메뉴: 예전 메뉴의 소식 바로 가기(#앵커)를 그대로 가져와요
    m = one(r'  <header class="nav gutter">.*?</header>', s, "상단 메뉴")
    links = re.findall(r'<a href="(#[^"]+)">([^<]+)</a>', m.group(0))
    links = [(h, n) for h, n in links] + [("|", ""), ("../index.html#archive", "지난 소식")]
    s = s[:m.start()] + header("../", links) + s[m.end():]

    s = s.replace("  <main>", '  <main class="post-main">', 1).replace("    <main>", '  <main class="post-main">', 1)
    if '<main class="post-main">' not in s:
        raise Skip("main")

    # 머리: 길 표시 + 날짜 줄
    m = one(r'<header class="post-hero gutter">\s*<div class="post-meta">(.*?)</div>', s, "날짜 줄")
    mins = re.search(r"(\d+)\s*분", m.group(1))
    mins = f" · 읽는 데 약 {mins.group(1)}분" if mins else ""
    hero = (
        '<header class="post-hero">\n'
        f'      <nav class="crumb" aria-label="지금 있는 곳"><a href="../index.html">홈</a><span aria-hidden="true">›</span><span>{d.month}월 {d.day}일 소식</span></nav>\n'
        f'      <p class="post-date">{d.year}년 {d.month}월 {d.day}일 {WEEKDAYS[d.weekday()]}요일{mins}</p>'
    )
    s = s[:m.start()] + hero + s[m.end():]

    # 오늘의 말 안내 문장
    if 'class="glossary-sub"' not in s:
        s = re.sub(r'(<h2 id="words-title">오늘의 말</h2>)', r'\1\n      <p class="glossary-sub">오늘 소식에 나온 말을 쉽게 풀었어요.</p>', s, count=1)

    # 받아 보기 (예전 구독 칸 자리)
    m = one(r'[ ]*<section class="subscribe[^"]*" id="subscribe".*?</section>', s, "구독 칸")
    s = s[:m.start()] + get_section("../") + s[m.end():]

    # 글 끝 줄('처음으로')은 바닥글이 맡아요
    s = re.sub(r'\n\s*<div class="post-end[^"]*">.*?</div>\n', "\n", s, count=1, flags=re.S)

    # 바닥글
    m = one(r'  <footer class="footer">.*?</footer>', s, "바닥글")
    s = s[:m.start()] + footer("../") + s[m.end():]

    path.write_text(s, encoding="utf-8")
    return True


def migrate_page(path, next_line):
    s = path.read_text(encoding="utf-8")
    if 'class="nav-in"' in s:
        return False
    s = head_fix(s, "")
    m = one(r'  <header class="nav gutter">.*?</header>', s, "상단 메뉴")
    s = s[:m.start()] + header("", [("index.html#today", "오늘 소식"), ("index.html#archive", "지난 소식")], app_href="index.html#subscribe") + s[m.end():]
    m = one(r'  <footer class="footer">.*?</footer>', s, "바닥글")
    s = s[:m.start()] + footer("", next_line) + s[m.end():]
    path.write_text(s, encoding="utf-8")
    return True


def main():
    changed, skipped = 0, []
    for p in sorted((ROOT / "posts").glob("*.html")):
        try:
            changed += migrate_post(p)
        except Skip as e:
            skipped.append(f"{p.name}: {e}")
    for name, line in (("subscribe.html", "매일 아침 7시, 오늘의 AI 소식 세 가지를 보내 드려요."),
                       ("copyright.html", "아이고는 소식마다 출처를 밝혀요."),
                       ("privacy.html", "아이고는 꼭 필요한 정보만 받아요."),
                       ("terms.html", "아이고는 누구나 무료로 볼 수 있어요.")):
        try:
            changed += migrate_page(ROOT / name, line)
        except Skip as e:
            skipped.append(f"{name}: {e}")
    print(f"바꾼 파일 {changed}개")
    if skipped:
        print("바꾸지 못한 파일:\n  " + "\n  ".join(skipped))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
