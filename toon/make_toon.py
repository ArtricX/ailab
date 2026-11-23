#!/usr/bin/env python3
"""아이고 인스타툰 〈엄마와 딸〉 조립기.
네 칸 그림 한 장(toon/sheets/*.webp, 2x2) + 아래 EPS의 대사 -> 편마다 1080x1350 다섯 장(PNG).

사용법: python3 toon/make_toon.py <출력 폴더> [편 열쇠: ep1 … ep7]
필요한 것: pip install pillow playwright && playwright install chromium

말풍선 위치는 칸(1000x1270) 안의 비율(0~1)로 적어요. 그림을 보고 빈 곳과 얼굴 위치에 맞춥니다.
  ("say", 글, cx, cy, 꼬리가 향하는 곳 tx, ty)   말풍선
  ("think", 글, cx, cy, tx, ty)                 생각 풍선
  ("msg", 글, cx, cy)                           문자 메시지
  ("cap", 글, x, y)                             지문 딱지(왼쪽 위 기준)
  ("sfx", 글, cx, cy, 기울기)                    효과음
  ("print", 글, cx, cy, 기울기, 글자 크기)        물건에 인쇄된 글자(봉투 등, 그림 주름이 비쳐요)
face=(가로 위치%, 세로 위치%, 확대%), faceof=칸 번호(0부터): 마지막 장 동그란 얼굴 딱지.

디자인 규칙은 프로젝트 문서 '아이고-홍보-자동화'에 있어요(그림체는 스티커 그림체로 고정,
꾸밈은 로고 그림에만, 그 밖의 글자는 밝은 바탕에 검은 글자, 글꼴은 주아 하나).
"""
import asyncio, json, pathlib, sys, html
from PIL import Image
from playwright.async_api import async_playwright

OUT = pathlib.Path(sys.argv[1]).resolve()
HERE = pathlib.Path(__file__).resolve().parent
FONTS = HERE / "fonts"
SRC = HERE / "sheets"
OUT.mkdir(parents=True, exist_ok=True)
PW, PH = 1000, 1270

EPS = [
    dict(key="ep1", sheet="ep1.webp", title="한국은 엄마가 해", panels=[
        [("cap", "밤 10시.", .05, .04), ("think", "오늘도\n컵라면이네…", .66, .16, .5, .36), ("sfx", "지잉—", .87, .62, -8)],
        [("msg", "AI가 건강 기록 보고\n운동하라고 챙겨 준대.", .5, .14), ("sfx", "톡톡", .15, .43, -8)],
        [("msg", "근데 아직 미국만 된대.", .38, .05), ("msg", "그래서 한국은 엄마가 해.\n밥 먹었니. 좀 걸어라.", .56, .185)],
        [("cap", "한국 서비스는\n엄마가 이미 운영 중.", .05, .04), ("say", "네네,\n걸을게요.", .20, .33, .5, .44)],
    ], news="챗GPT 건강 기능이\n컴퓨터와 안드로이드에서도\n된대요.", note="아직은 미국에서만 쓸 수 있어요.", no=1, date="11월 21일", band="#FFC9CF", pop="#F06A5C", faceof=1, face=(47, 50, 190)),
    dict(key="ep2", sheet="ep2.webp", title="원조", panels=[
        [("say", "앱 하나 만드는 데\n석 달째야…", .5, .14, .5, .36)],
        [("say", "요즘 고등학생들은\n말로 앱 만든다던데?", .42, .12, .46, .36), ("say", "일주일에\n천 개.", .83, .325, .62, .44)],
        [("say", "엄마가 그걸\n어떻게 알아?!", .28, .11, .27, .30), ("say", "너만\n모르더라.", .76, .11, .76, .28)],
        [("say", "우리 딸한테\n잔소리해 주는\n앱 만들어 줘.", .29, .13, .30, .32), ("say", "그건 엄마가\n원조잖아.", .76, .17, .78, .34)],
    ], news="고등학생들이 말로 설명해서\n일주일 만에 앱을\n1000개쯤 만들었대요.", note="숫자는 서비스 회사가 밝힌 거예요.", no=2, date="11월 21일", band="#FFE27A", pop="#2348D6", faceof=3, face=(22, 52, 210)),
    dict(key="ep3", sheet="ep3.webp", title="맨 앞자리", panels=[
        [("say", "엄마,\n어디 가?", .27, .19, .25, .40), ("say", "수업!", .72, .21, .68, .38)],
        [("say", "선생님 240명도\nAI 회사 가서 배운대.", .5, .14, .45, .34)],
        [("say", "…엄마는\n선생님 아니잖아.", .5, .11, .5, .28)],
        [("cap", "경로당 스마트폰 교실\n3년 차 강사.", .04, .035), ("say", "자, 어제 배운 거\n복습합니다!", .73, .235, .56, .40)],
    ], news="선생님 240명쯤이\nAI 회사에 가서\n수업에 쓸 AI를 배워요.", note="교육부가 11월 20일에 발표했어요.", no=3, date="11월 21일", band="#BBD7FF", pop="#F6C93B", faceof=1, face=(42, 52, 190)),
    dict(key="ep4", sheet="ep4.webp", title="삼십 년 전부터", panels=[
        [("say", "이제 AI한테 할 일을\n통째로 맡길 수 있대.", .5, .14, .28, .40)],
        [("say", "나는 삼십 년 전부터\n썼다.", .5, .13, .48, .33)],
        [("say", "…뭘?", .5, .12, .47, .28)],
        [("say", "너.", .58, .15, .80, .34, 1.9), ("print", "쓰레기\n종량제 봉투", .45, .818, -4, 45)],
    ], news="구글 제미나이에게\n할 일을 통째로 맡길 수\n있게 됐어요.", note="한국에서도 무료로 쓸 수 있어요.", no=4, date="11월 19일", band="#FFC9CF", pop="#F06A5C", faceof=3, face=(100, 44, 200)),
    dict(key="ep5", sheet="ep5.webp", title="번역 불가", panels=[
        [("say", "카톡에 외국어 오면\nAI가 바로 번역해 준대.", .5, .14, .30, .37)],
        [("say", "그래? 그럼\n이것 좀 해 봐라.", .5, .13, .50, .33)],
        [("cap", "딸이 보낸 카톡", .05, .04), ("msg", "ㅇㅇ", .45, .40), ("msg", "ㄴㄴ", .45, .54), ("msg", "ㅇㅋ", .45, .68)],
        [("say", "네 건 왜\n번역이 안 되니.", .34, .14, .27, .34), ("say", "ㅇㅋ…", .82, .21, .74, .34)],
    ], news="카카오톡에\n외국어가 오면 AI가\n바로 번역해 줘요.", note="중요한 내용은 상대에게 다시 물어보세요.", no=5, date="11월 20일", band="#FFE27A", pop="#2348D6", faceof=3, face=(0, 40, 200)),
    dict(key="ep6", sheet="ep6.webp", title="안 바꾼다", panels=[
        [("say", "AI는 아니라고 하면\n맞는 답도 바꾼대.\n열에 여덟 번.", .5, .145, .45, .36)],
        [("say", "줏대 없기는.", .46, .19, .45, .34)],
        [("say", "엄마,\n이 옷 어때?", .28, .10, .27, .25), ("say", "별로다.", .77, .12, .78, .27)],
        [("say", "아니야,\n예쁜데?", .27, .14, .25, .32), ("say", "별로라니까.", .73, .13, .75, .29), ("cap", "우리 집 AI는 안 바꾼다.", .07, .88)],
    ], news="AI는 '아니야' 한마디에\n맞는 답도 바꾸곤 해요.", note="유네스코 시험에서 열에 여덟 번 그랬어요.", no=6, date="11월 18일", band="#BBD7FF", pop="#F6C93B", faceof=1, face=(37, 44, 190)),
    dict(key="ep7", sheet="ep7.webp", title="밥심", panels=[
        [("say", "전기 아껴라.", .58, .30, .53, .52), ("sfx", "딸깍", .15, .57, -8)],
        [("say", "AI한테 한 번 물을\n때마다 전기가 든대.", .5, .14, .52, .37)],
        [("say", "그럼\n나한테 물어.", .5, .095, .5, .22)],
        [("say", "나는 밥만 먹으면\n돌아간다.", .38, .14, .28, .33)],
    ], news="AI 때문에 데이터센터가\n쓰는 전기가 2배로\n늘 수 있대요.", note="국제에너지기구가 내다본 숫자예요.", no=7, date="11월 20일", band="#C9EBCF", pop="#F06A5C", faceof=2, face=(48, 25, 190)),
]


def split(sheet, key):
    im = Image.open(SRC / sheet).convert("RGB")
    W, H = im.size
    g = im.convert("L").resize((W // 4, H // 4))
    w, h = g.size
    px = g.load()

    def runs(n, m, get):
        white = [sum(1 for j in range(m) if get(i, j) > 244) / m > 0.985 for i in range(n)]
        segs, s = [], None
        for i, wv in enumerate(white + [True]):
            if not wv and s is None:
                s = i
            if wv and s is not None:
                if i - s > n * 0.2:
                    segs.append((s * 4, i * 4))
                s = None
        return segs
    xs = runs(w, h, lambda i, j: px[i, j])
    ys = runs(h, w, lambda i, j: px[j, i])
    assert len(xs) == 2 and len(ys) == 2, (sheet, xs, ys)
    out = []
    for j, (y0, y1) in enumerate(ys):
        for i, (x0, x1) in enumerate(xs):
            p = im.crop((x0 + 10, y0 + 10, x1 - 10, y1 - 10))
            pw, ph = p.size
            if pw / ph > PW / PH:   # 너무 넓으면 양옆을 조금
                nw = int(ph * PW / PH); l = (pw - nw) // 2; p = p.crop((l, 0, l + nw, ph))
            else:                   # 너무 길면 위(빈 바탕)를 조금
                nh = int(pw * PH / PW); p = p.crop((0, ph - nh, pw, ph))
            f = OUT / f"_{key}_{j * 2 + i + 1}.png"
            p.resize((PW, PH), Image.LANCZOS).save(f)
            out.append(f)
    return out



def face(u, name):
    return (f"@font-face{{font-family:'{u}';src:url('{(FONTS / (name + '-korean-400-normal.woff2')).as_uri()}') format('woff2');}}"
            f"@font-face{{font-family:'{u}';src:url('{(FONTS / (name + '-latin-400-normal.woff2')).as_uri()}') format('woff2');unicode-range:U+0000-00FF,U+2010-2027;}}")


DOTS = "radial-gradient(rgba(17,17,17,.10) 2.2px,transparent 2.6px)"
CSS = face("Jua", "jua") + """
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px;font-family:'Jua',sans-serif;color:#111;overflow:hidden}
body{background:#FFF6E3 """ + DOTS + """ 0 0/22px 22px}
/* 칸 */
#wrap{position:absolute;width:1000px;height:1270px;transform-origin:0 0}
#panel{position:absolute;inset:0;border:11px solid #111;border-radius:10px;background:#fff;box-shadow:16px 16px 0 var(--sh,#111)}
#clip{position:absolute;inset:0;overflow:hidden;border-radius:2px}
#clip img{position:absolute;left:-11px;top:-11px;width:1000px;height:1270px}
#panel svg{position:absolute;left:-11px;top:-11px;overflow:visible}
.b{position:absolute;white-space:pre;text-align:center;line-height:1.22;transform:translate(-50%,-50%);margin:-11px 0 0 -11px}
.say,.think{font-size:62px}
.msg{font-size:56px}
.cap{font-size:48px;text-align:left;transform:rotate(-1.5deg);background:#FFE27A;border:10px solid #111;padding:14px 26px 10px;line-height:1.25;box-shadow:7px 7px 0 #111}
.sfx{font-family:'Jua';font-size:84px;color:#111;-webkit-text-stroke:14px #fff;paint-order:stroke fill;letter-spacing:.02em}
.sfx i{display:none}
.print{color:#2348D6;border:7px solid #2348D6;border-radius:16px;padding:13px 18px 6px;line-height:1.16;mix-blend-mode:multiply;opacity:.92}
/* 칸 번호 딱지 */
.num{position:absolute;left:-44px;top:-44px;width:96px;height:96px;border-radius:50%;background:#fff;border:9px solid #111;display:flex;align-items:center;justify-content:center;font-family:'Jua';font-size:60px;color:#111;padding-top:6px;transform:rotate(-8deg);box-shadow:5px 5px 0 #111}
/* 글자 로고 */
.logo{display:inline-flex;align-items:flex-end;font-family:'Jua';line-height:1}
.logo span{display:inline-block;-webkit-text-stroke:var(--st) #111;paint-order:stroke fill;text-shadow:var(--sd) var(--sd) 0 #111}
.logo .m{color:#F06A5C} .logo .d{color:#3D6BFF}
.logo .w{font-size:.46em;color:#fff;background:#111;border-radius:50%;width:1.5em;height:1.5em;display:inline-flex;align-items:center;justify-content:center;-webkit-text-stroke:0;text-shadow:none;margin:0 .12em .5em .05em;transform:rotate(-10deg)}
/* 표지 */
#band{position:absolute;left:0;top:0;width:1080px;height:500px;background:var(--band) """ + DOTS + """ 0 0/22px 22px;border-bottom:11px solid #111}
#cover{position:absolute;left:40px;top:18px} #cover img{height:262px;display:block}
#cover .logo{font-size:176px;--st:11px;--sd:8px;letter-spacing:.03em}
#epc{position:absolute;left:52px;top:286px}
.ep{display:flex;align-items:center;transform:rotate(-2.5deg);transform-origin:0 50%}
.ep .no{position:relative;z-index:2;width:118px;height:118px;border-radius:50%;background:#FFE27A;border:9px solid #111;box-shadow:5px 5px 0 #111;display:flex;align-items:center;justify-content:center;font-size:50px;color:#111;padding-top:6px;transform:rotate(-7deg);margin-right:-34px}
.ep .t{position:relative;font-size:84px;line-height:1;color:#111;white-space:nowrap;letter-spacing:.03em;background:#fff;border:9px solid #111;border-radius:64px 78px 70px 84px / 70px 62px 80px 66px;box-shadow:8px 8px 0 #111;padding:22px 58px 14px 62px}
.ep .t span{display:inline-block}
.ep svg{position:absolute;overflow:visible}
.burst{position:absolute;right:34px;top:36px;width:210px;height:210px;transform:rotate(12deg)}
.burst b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Jua';font-weight:400;font-size:44px;line-height:1.05;text-align:center;color:#111}
/* 아래 줄 */
#foot{position:absolute;left:66px;right:60px;bottom:20px;height:92px;display:flex;align-items:center;justify-content:space-between}
#foot .fl{height:84px;display:block;transform:rotate(-2deg)}
#foot .ep{zoom:.5;transform-origin:100% 50%;transform:rotate(1.5deg)}
/* 덧 */
#band.short{height:372px}
#cover.small{left:40px;top:26px} #cover.small img{height:228px}
#memo{position:absolute;left:92px;top:318px;width:880px;min-height:820px;padding:140px 60px 150px;background:#fff;border:11px solid #111;border-radius:14px;box-shadow:16px 16px 0 var(--pop);transform:rotate(-1.6deg)}
#memo .ep{position:absolute;left:-26px;top:-64px;zoom:.86}
#memo .n{font-size:74px;line-height:1.5;white-space:pre}
#memo .m{margin-top:44px;font-size:46px;line-height:1.4;color:#555;max-width:470px;word-break:keep-all}
#memo .dt{margin-top:22px;font-size:34px;color:#8a8a8a}
#memo .e{position:absolute;left:60px;bottom:58px;font-size:44px;background:#FFE27A;border:7px solid #111;box-shadow:5px 5px 0 #111;padding:10px 22px 6px;transform:rotate(-2deg)}
#face{position:absolute;right:-40px;bottom:-64px;width:400px;height:400px;border-radius:50%;border:11px solid #111;box-shadow:9px 9px 0 #111;background-size:var(--fs);background-position:var(--fx) var(--fy);transform:rotate(6deg)}
.burst.big b{font-size:74px;padding-top:8px}
"""

JS = """
() => {
  const NS='http://www.w3.org/2000/svg', svg=document.querySelector('#panel svg'), out=[];
  const mk=(t,a)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);svg.appendChild(e);return e;};
  document.querySelectorAll('.b').forEach(d=>{
    const k=d.dataset.kind, w=d.offsetWidth, h=d.offsetHeight, cx=+d.dataset.cx, cy=+d.dataset.cy;
    out.push([k, Math.round(cx-w/2), Math.round(cy-h/2), Math.round(cx+w/2), Math.round(cy+h/2)]);
    if(k==='msg'){ mk('rect',{x:cx-w/2-36,y:cy-h/2-24,width:w+72,height:h+44,rx:42,fill:'#FFE27A',stroke:'#111','stroke-width':11}); return; }
    if(k!=='say'&&k!=='think') return;
    const rx=w/2*1.12+34, ry=h/2*1.2+32, tx=+d.dataset.tx, ty=+d.dataset.ty;
    let dx=tx-cx, dy=ty-cy; const L=Math.hypot(dx,dy)||1; dx/=L; dy/=L;
    const s=1/Math.hypot(dx/rx,dy/ry), bx=cx+dx*s, by=cy+dy*s, nx=-dy, ny=dx;   // 풍선 가장자리 점
    if(k==='think'){
      mk('ellipse',{cx,cy,rx,ry,fill:'#111',stroke:'#111','stroke-width':22}); mk('ellipse',{cx,cy,rx,ry,fill:'#fff'});
      mk('circle',{cx:bx+dx*34,cy:by+dy*30,r:16,fill:'#fff',stroke:'#111','stroke-width':10});
      mk('circle',{cx:bx+dx*66,cy:by+dy*66,r:9,fill:'#fff',stroke:'#111','stroke-width':8});
      return; }
    const B=21, tipL=Math.min(46, Math.max(30, L-s-10)), bend=(dx>=0?1:-1)*13;
    const p=(a,b)=>(bx+nx*a+dx*b)+','+(by+ny*a+dy*b);
    const pd='M'+p(-B,-18)+' Q'+p(-B*0.35+bend*0.5,tipL*0.6)+' '+p(bend,tipL)+' Q'+p(B*0.95+bend*0.35,tipL*0.4)+' '+p(B,-18)+' Z';
    // 테두리를 먼저 두껍게 그리고, 흰 속을 한 번 더 덮어서 꼬리와 풍선이 한 덩어리가 되게 해요
    mk('path',{d:pd,fill:'#111',stroke:'#111','stroke-width':22,'stroke-linejoin':'round','stroke-linecap':'round'});
    mk('ellipse',{cx,cy,rx,ry,fill:'#111',stroke:'#111','stroke-width':22});
    mk('path',{d:pd,fill:'#fff'});
    mk('ellipse',{cx,cy,rx,ry,fill:'#fff'});
  });
  return out;
}
"""



DECO = ('<svg style="right:-34px;top:-40px" width="78" height="72" viewBox="0 0 78 72"><path d="M39 66 C10 44 4 30 8 18 C12 6 30 4 39 18 C48 4 66 6 70 18 C74 30 68 44 39 66Z" fill="#FF8F85" stroke="#111" stroke-width="8" stroke-linejoin="round" transform="rotate(14 39 36)"/></svg>'
        '<svg style="right:52px;bottom:-36px" width="52" height="52" viewBox="0 0 52 52"><path d="M26 4 Q30 22 48 26 Q30 30 26 48 Q22 30 4 26 Q22 22 26 4Z" fill="#FFE27A" stroke="#111" stroke-width="7" stroke-linejoin="round"/></svg>'
        '<svg style="left:150px;top:-30px" width="38" height="38" viewBox="0 0 52 52"><path d="M26 4 Q30 22 48 26 Q30 30 26 48 Q22 30 4 26 Q22 22 26 4Z" fill="#fff" stroke="#111" stroke-width="8" stroke-linejoin="round"/></svg>')
LOGOIMG = (HERE / 'logo.png').as_uri()
LOGO = '<span class="logo"><span class="m" style="transform:rotate(-6deg) translateY(4px)">엄</span><span class="m" style="transform:rotate(4deg) translateY(-8px)">마</span><span class="w">와</span><span class="d" style="transform:rotate(-3deg) translateY(2px)">딸</span></span>'
BURST = '<svg viewBox="-100 -100 200 200" width="210" height="210"><polygon points="{pts}" fill="#fff" stroke="#111" stroke-width="8" stroke-linejoin="round"/></svg>'


def burst(text):
    import math
    pts = " ".join(f"{math.cos(math.pi*k/12)*(92 if k%2==0 else 68):.1f},{math.sin(math.pi*k/12)*(92 if k%2==0 else 68):.1f}" for k in range(24))
    return f'<div class="burst">{BURST.format(pts=pts)}<b>{text}</b></div>'


def wiggle(text):
    rot = [-5, 4, -3, 5, -4, 3, -5, 4]
    out, k = [], 0
    for ch in text:
        if ch == " ":
            out.append('<span style="width:.28em"></span>')
        else:
            out.append(f'<span style="transform:rotate({rot[k % 8]}deg) translateY({(-5, 5, -3, 6)[k % 4]}px)">{html.escape(ch)}</span>'); k += 1
    return "".join(out)


def bubbles(ep, i):
    items = []
    for b in ep["panels"][i]:
        kind, text = b[0], html.escape(b[1])
        if kind == "cap":
            items.append(f'<div class="b cap" data-kind="cap" style="left:{b[2]*PW}px;top:{b[3]*PH}px">{text}</div>')
        elif kind == "print":
            items.append(f'<div class="b print" data-kind="print" style="left:{b[2]*PW}px;top:{b[3]*PH}px;font-size:{b[5]}px;transform:translate(-50%,-50%) rotate({b[4]}deg)">{text}</div>')
        elif kind == "sfx":
            items.append(f'<div class="b sfx" data-kind="sfx" style="left:{b[2]*PW}px;top:{b[3]*PH}px;transform:translate(-50%,-50%) rotate({b[4]}deg)">{text}<i>{text}</i></div>')
        else:
            cy = b[3] * PH - (34 if kind == "say" and b[3] <= .145 else 0)   # 위쪽 말풍선은 칸 밖으로 살짝 튀어나오게
            extra = f' data-tx="{b[4]*PW}" data-ty="{b[5]*PH}"' if kind in ("say", "think") else ""
            big = f";font-size:{int(62 * b[6])}px" if kind == "say" and len(b) > 6 else ""   # 웃음이 터지는 대사는 크게
            items.append(f'<div class="b {kind}" data-kind="{kind}" data-cx="{b[2]*PW}" data-cy="{cy}"{extra} style="left:{b[2]*PW}px;top:{cy}px{big}">{text}</div>')
    return "".join(items)


def panel(ep, i, img, x, y, scale, rot, shadow="#111"):
    return f"""<div id="wrap" style="left:{x}px;top:{y}px;transform:scale({scale}) rotate({rot}deg);--sh:{shadow}"><div id="panel"><div id="clip"><img src="{img.as_uri()}"></div><svg width="{PW}" height="{PH}"></svg>{bubbles(ep, i)}<div class="num">{i + 1}</div></div></div>"""


def eptag(ep, title=None, no=True):
    badge = f'<span class="no">{ep["no"]}화</span>' if no else ""
    lead = "" if no else ' style="padding-left:52px"'
    return f'<div class="ep">{badge}<span class="t"{lead}>{wiggle(title or ep["title"])}{DECO}</span></div>'


def foot(ep):
    return f'<div id="foot"><img class="fl" src="{LOGOIMG}">{eptag(ep)}</div>'


def slide(ep, i, img):
    var = f'<style>:root{{--band:{ep["band"]};--pop:{ep["pop"]}}}</style>'
    if i == 0:   # 표지: 제목 띠 + 첫 칸
        return f"""{var}<div id="band"></div><div id="cover"><img src="{LOGOIMG}"></div>
        <div id="epc">{eptag(ep)}</div>{burst('네 칸<br>만화')}
        {panel(ep, 0, img, 204, 446, .685, 1.2)}"""
    rot = (-0.8, 0.7, -0.6)[i - 1]
    return f"""{var}{panel(ep, i, img, 84, 52, .898, rot, ep['pop'] if i == 3 else '#111')}{foot(ep)}"""


def after(ep, img):
    fx, fy, fs = ep["face"]
    return f"""<style>:root{{--band:{ep['band']};--pop:{ep['pop']};--fx:{fx}%;--fy:{fy}%;--fs:{fs}%}}</style>
    <div id="band" class="short"></div><div id="cover" class="small"><img src="{LOGOIMG}"></div>{burst('끝!').replace('class="burst"', 'class="burst big"')}
    <div id="memo">{eptag(ep, '이 만화의 진짜 소식', no=False)}<div class="n">{html.escape(ep['news'])}</div><div class="m">{html.escape(ep['note'])}</div><div class="dt">아이고 {ep['date']} 소식</div>
    <div class="e">다음 화에 또 만나요!</div><div id="face" style="background-image:url('{img.as_uri()}')"></div></div>{foot(ep)}"""

async def main():
    only = sys.argv[2] if len(sys.argv) > 2 else None
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1080, "height": 1350})
        for ep in EPS:
            if only and ep["key"] != only:
                continue
            imgs = split(ep["sheet"], ep["key"])
            pages = [slide(ep, i, imgs[i]) for i in range(4)] + [after(ep, imgs[ep['faceof']])]
            for n, body in enumerate(pages, 1):
                f = OUT / "_p.html"
                f.write_text(f"<!doctype html><meta charset=utf-8><style>{CSS}</style>{body}")
                await pg.goto(f.as_uri())
                await pg.evaluate("document.fonts.ready")
                await pg.wait_for_timeout(150)
                if n <= 4:
                    boxes = await pg.evaluate(JS)
                    bad = [x for x in boxes if x[1] < 20 or x[3] > PW - 20]
                    if bad:
                        print(ep["key"], n, "가장자리에 닿음:", bad)
                await pg.screenshot(path=str(OUT / f"toon-{ep['key']}-{n}.png"))
            f.unlink()
        await b.close()
    for f in OUT.glob("_*.png"):
        f.unlink()

asyncio.run(main())
