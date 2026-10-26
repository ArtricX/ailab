// 글자 크게 보기: 누른 상태를 이 브라우저에 기억합니다.
(function () {
  var root = document.documentElement;
  var KEY = "ailab-large-text";
  try { if (localStorage.getItem(KEY) === "1") root.classList.add("large-text"); } catch (e) {}
  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.querySelector(".text-toggle");
    if (!btn) return;
    function sync() {
      var on = root.classList.contains("large-text");
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.textContent = on ? "글자 작게" : "글자 크게";
    }
    sync();
    btn.addEventListener("click", function () {
      root.classList.toggle("large-text");
      try { localStorage.setItem(KEY, root.classList.contains("large-text") ? "1" : "0"); } catch (e) {}
      sync();
    });
  });
})();

// 구독 폼: 구독 페이지의 입력 칸에서 신청을 받아 아이고 메일(구글 앱스 스크립트)로 보냅니다.
// 신청하면 확인 메일이 가고, 메일 속 '구독 확인하기'(subscribe.html?a=confirm&t=…)를 누르면 구독이 확정돼요.
// 신청·확인·그만 받기 결과는 입력 칸 대신 큰 결과 화면(#sub-result)으로 보여 줘요.
(function () {
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // 결과 화면 내용. title은 줄마다 나눠 적어요(한 줄은 한 구절).
  var STATES = {
    wait: { label: "잠시만요", title: ["확인하고", "있어요"], lede: "구독 정보를 확인하는 중이에요. 이 화면을 닫지 말고 잠깐만 기다려 주세요." },
    mail: { label: "신청 완료", title: ["메일함을", "확인해 주세요"],
      lede: "확인 메일을 보냈어요. 메일 속 '구독 확인하기' 버튼을 누르면 구독이 끝나요.",
      tip: "메일이 보이지 않으면 스팸함이나 프로모션함도 봐 주세요. 버튼을 누르지 않으면 메일을 보내지 않아요." },
    done: { label: "구독 완료", title: ["구독이", "완료됐어요"],
      lede: "내일 아침 7시부터 오늘의 AI 소식 세 가지를 메일로 보내 드릴게요.",
      tip: "메일이 스팸함으로 가면 '스팸 아님'을 눌러 주세요. 다음부터는 받은편지함으로 와요." },
    already: { label: "구독 중", title: ["이미", "구독하고 계세요"],
      lede: "이 주소로 매일 아침 7시에 오늘의 AI 소식을 보내 드리고 있어요. 따로 할 일은 없어요." },
    bye: { label: "구독 해지", title: ["구독을", "그만두었어요"],
      lede: "이제 메일을 보내지 않아요. 그동안 읽어 주셔서 고마워요. 블로그에서는 언제든 오늘의 소식을 볼 수 있어요." },
    error: { label: "확인 필요", title: ["링크를 확인할 수", "없어요"],
      lede: "링크가 잘못되었거나 오래되었어요. 아래 '다시 신청하기'를 눌러 한 번 더 신청해 주세요." },
    offline: { label: "확인 필요", title: ["지금은", "처리가 안 돼요"],
      lede: "잠시 뒤에 다시 해 주세요. 계속 안 되면 aigo.artricx@gmail.com으로 알려 주세요." }
  };

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.querySelector("form[data-subscribe]");
    var panel = document.querySelector(".sub-panel:not(.sub-result)");
    var result = document.getElementById("sub-result");
    var main = document.querySelector("main.sub");

    function showForm() {
      if (!result || !panel) return;
      result.hidden = true;
      panel.hidden = false;
      if (main) main.classList.remove("is-result");
      var input = form && form.querySelector("input[name=email]");
      if (input) input.focus();
    }

    function showResult(key, extra) {
      if (!result || !panel) return false;
      var st = STATES[key];
      extra = extra || {};
      result.setAttribute("data-state", key);
      result.querySelector("[data-r=label]").textContent = st.label;
      var h = result.querySelector("[data-r=title]");
      h.textContent = "";
      st.title.forEach(function (line) { h.appendChild(el("span", "line", line)); });
      result.querySelector("[data-r=lede]").textContent = st.lede;
      result.querySelector("[data-r=tip]").textContent = st.tip || "";

      var facts = result.querySelector("[data-r=facts]");
      facts.textContent = "";
      if (key === "done" || key === "already" || key === "mail") {
        if (extra.email) {
          var li = el("li", "ticket-mini c-yellow");
          li.appendChild(el("b", null, key === "mail" ? "확인 메일을 보낸 주소" : "받는 주소"));
          li.appendChild(el("span", null, extra.email));
          facts.appendChild(li);
        }
        if (key !== "mail") {
          var t = el("li", "ticket-mini c-blue");
          t.appendChild(el("b", null, "보내는 시간"));
          t.appendChild(el("span", null, "매일 아침 7시"));
          facts.appendChild(t);
        }
        var f = el("li", "ticket-mini c-pink");
        f.appendChild(el("b", null, "보내는 사람"));
        f.appendChild(el("span", null, "아이고 (aigo.artricx@gmail.com)"));
        facts.appendChild(f);
      }

      var acts = result.querySelector("[data-r=actions]");
      acts.textContent = "";
      if (key !== "wait") {
        var home = el("a", "pill pill-ink", "오늘의 소식 보러 가기");
        home.href = "index.html";
        acts.appendChild(home);
      }
      if (key === "error" || key === "bye" || key === "offline" || key === "mail") {
        var again = el("button", "pill", key === "mail" ? "다른 주소로 신청하기" : "다시 신청하기");
        again.type = "button";
        again.addEventListener("click", showForm);
        acts.appendChild(again);
      }

      panel.hidden = true;
      result.hidden = false;
      if (main) main.classList.add("is-result");
      window.scrollTo(0, 0);
      result.focus({ preventScroll: true });
      return true;
    }

    if (form) {
      var input = form.querySelector("input[name=email]");
      var button = form.querySelector("button[type=submit]");
      var status = form.querySelector(".sub-status");
      var say = function (msg, bad) {
        status.textContent = msg;
        status.hidden = false;
        status.classList.toggle("is-error", !!bad);
      };
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var email = (input.value || "").trim();
        if (!EMAIL_RE.test(email)) {
          say("이메일 주소를 다시 확인해 주세요.", true);
          input.focus();
          return;
        }
        button.disabled = true;
        say("신청하고 있어요…");
        var body = new URLSearchParams();
        body.set("email", email);
        body.set("website", (form.querySelector("input[name=website]") || {}).value || "");
        fetch(form.action, { method: "POST", body: body })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            if (!res || !res.ok) throw new Error("bad");
            status.hidden = true;
            form.reset();
            if (typeof ailabEvent === "function") ailabEvent("subscribe");
            if (!showResult(res.state === "active" ? "already" : "mail", { email: email })) {
              say(res.state === "active" ? "이미 구독하고 계세요." : "확인 메일을 보냈어요. 메일 속 '구독 확인하기'를 눌러 주세요.");
            }
          })
          .catch(function () {
            say("지금은 신청이 되지 않아요. 잠시 뒤에 다시 해 주세요.", true);
          })
          .then(function () { button.disabled = false; });
      });
    }

    // 메일 속 '구독 확인하기' · '그만 받기' 링크로 들어온 경우
    var q = new URLSearchParams(location.search);
    var act = q.get("a"), tok = q.get("t");
    if (form && (act === "confirm" || act === "unsubscribe") && tok) {
      showResult("wait");
      var data = new URLSearchParams();
      data.set("a", act);
      data.set("t", tok);
      fetch(form.action, { method: "POST", body: data })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res || !res.ok) showResult("error");
          else if (res.state === "active") {
            showResult("done", { email: res.email });
            if (typeof ailabEvent === "function") ailabEvent("subscribe-confirm");
          } else showResult("bye");
          try { history.replaceState(null, "", location.pathname); } catch (err) {}
        })
        .catch(function () { showResult("offline"); });
      return;
    }

    // 구독 메뉴로 들어오면 입력 칸으로 바로 이동
    if (location.hash === "#sub-form") {
      var box = document.getElementById("sub-form");
      if (box) { box.scrollIntoView({ block: "center" }); box.focus({ preventScroll: true }); }
    }
  });
})();

// 구독 페이지의 "취소하고 돌아가기": 우리 사이트에서 왔으면 보던 화면으로, 아니면 홈으로. Esc 키도 같아요.
(function () {
  function goBack(e) {
    var link = document.querySelector("[data-back]");
    var sameSite = false;
    try { sameSite = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (err) {}
    if (sameSite && history.length > 1) {
      if (e) e.preventDefault();
      history.back();
    } else if (!e && link) {
      location.href = link.href;
    }
  }
  document.addEventListener("DOMContentLoaded", function () {
    var link = document.querySelector("[data-back]");
    if (!link) return;
    link.addEventListener("click", goBack);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !e.defaultPrevented) goBack(null);
    });
  });
})();

// ───────── 사용성 ─────────

// 방문자 집계(GoatCounter, 쿠키 없음). goatcounter.com에서 만든 코드를 넣으면 켜져요. 비어 있으면 아무것도 하지 않아요.
var AILAB_GOATCOUNTER = "";
(function () {
  if (!AILAB_GOATCOUNTER || /^(localhost|127\.)/.test(location.hostname)) return;
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.setAttribute("data-goatcounter", "https://" + AILAB_GOATCOUNTER + ".goatcounter.com/count");
  document.head.appendChild(s);
})();
// 버튼 누름 같은 행동을 집계에 남겨요(집계가 꺼져 있으면 그냥 넘어가요).
function ailabEvent(name) {
  try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: "event/" + name, title: name, event: true }); } catch (e) {}
}

// 상단 메뉴: 지금 읽고 있는 소식에 표시하고, 좁은 화면에서는 그 칩이 보이도록 옆으로 밀어 줘요.
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var bar = document.querySelector(".nav-links");
    if (!bar || !("IntersectionObserver" in window)) return;
    var links = Array.prototype.filter.call(bar.querySelectorAll("a"), function (a) {
      return a.getAttribute("href").charAt(0) === "#";
    });
    var map = {};
    links.forEach(function (a) {
      var el = document.getElementById(a.getAttribute("href").slice(1));
      if (el) map[el.id] = a;
    });
    function mark(a) {
      links.forEach(function (l) { if (l !== a) l.removeAttribute("aria-current"); });
      if (!a) return;
      a.setAttribute("aria-current", "true");
      if (bar.scrollWidth > bar.clientWidth) {
        var ar = a.getBoundingClientRect(), br = bar.getBoundingClientRect();
        var left = bar.scrollLeft + (ar.left - br.left) - (bar.clientWidth - ar.width) / 2;
        bar.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
      }
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) mark(map[e.target.id]); });
    }, { rootMargin: "-40% 0px -55% 0px" });
    Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
    // 맨 위로 올라오면 표시를 지워요.
    window.addEventListener("scroll", function () { if (window.scrollY < 200) mark(null); }, { passive: true });
  });
})();

// 맨 위로 버튼: 한 화면쯤 내려가면 나타나요.
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "to-top";
    btn.setAttribute("aria-label", "맨 위로 가기");
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg><span>맨 위로</span>';
    document.body.appendChild(btn);
    var shown = false;
    function update() {
      var want = window.scrollY > window.innerHeight * 0.9;
      if (want !== shown) { shown = want; btn.classList.toggle("is-shown", want); }
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
    btn.addEventListener("click", function () {
      ailabEvent("to-top");
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      var logo = document.querySelector(".logo");
      if (logo) logo.focus({ preventScroll: true });
      if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    });
  });
})();

// 글 끝: 공유하기 버튼과 이전·다음 날 소식. 글 페이지(posts/날짜.html)에서만 만들어요.
(function () {
  var m = location.pathname.match(/posts\/(\d{4}-\d{2}-\d{2})\.html$/);
  if (!m) return;
  var today = m[1];
  function plain(s) { return String(s || "").split("|").map(function (x) { return x.trim(); }).filter(Boolean); }
  function phrases(el, s) {
    plain(s).forEach(function (p, i) {
      if (i) el.appendChild(document.createTextNode(" "));
      var span = document.createElement("span");
      span.className = "ph";
      span.textContent = p;
      el.appendChild(span);
    });
  }
  function label(d) {
    var dt = new Date(d + "T00:00:00");
    return (dt.getMonth() + 1) + "월 " + dt.getDate() + "일 " + "일월화수목금토".charAt(dt.getDay()) + "요일";
  }
  document.addEventListener("DOMContentLoaded", function () {
    var end = document.querySelector(".post-end");
    if (!end) return;

    // 공유하기
    var row = document.createElement("div");
    row.className = "share-row gutter";
    var share = document.createElement("button");
    share.type = "button";
    share.className = "pill pill-ink";
    share.textContent = "이 소식 공유하기";
    var msg = document.createElement("span");
    msg.className = "share-msg";
    msg.setAttribute("role", "status");
    row.appendChild(share);
    row.appendChild(msg);
    var sub = document.getElementById("subscribe");
    (sub || end).parentNode.insertBefore(row, sub || end);
    var url = location.origin + location.pathname;
    share.addEventListener("click", function () {
      ailabEvent("share");
      var data = { title: document.title, text: "누구나 읽는 아침 AI 소식", url: url };
      if (navigator.share) { navigator.share(data).catch(function () {}); return; }
      function done() { msg.textContent = "주소를 복사했어요. 카톡이나 문자에 붙여 넣으세요."; }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(done, function () { window.prompt("이 주소를 복사하세요", url); });
      } else { window.prompt("이 주소를 복사하세요", url); }
    });

    // 이전·다음 날 소식
    fetch("../posts.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (posts) {
      posts.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      var i = posts.findIndex(function (p) { return p.date === today; });
      if (i < 0) return;
      var older = posts[i + 1], newer = posts[i - 1];
      var nav = document.createElement("nav");
      nav.className = "post-nav gutter";
      nav.setAttribute("aria-label", "다른 날 소식");
      [[older, "prev", "이전 소식"], [newer, "next", "다음 소식"]].forEach(function (x) {
        var p = x[0];
        if (!p) {
          // 빈 칸 대신 안내 카드: 다음 소식이 없으면 내일 아침 안내와 메일 받기, 이전 소식이 없으면 첫 소식 안내
          var e = document.createElement("a");
          e.className = "post-nav-link is-empty " + x[1];
          var eb = document.createElement("span");
          eb.className = "bracket";
          var et = document.createElement("strong");
          var em = document.createElement("span");
          em.className = "post-nav-more";
          if (x[1] === "next") {
            e.href = "../subscribe.html";
            eb.textContent = "다음 소식 · 내일 아침 7시";
            phrases(et, "다음 소식은|내일 아침 7시에|올라와요");
            em.textContent = "아침마다 메일로 받아보기";
          } else {
            e.href = "../index.html";
            eb.textContent = "이전 소식";
            phrases(et, "아이고의|첫 소식이에요");
            em.textContent = "처음 화면으로 가기";
          }
          e.appendChild(eb);
          e.appendChild(et);
          e.appendChild(em);
          e.addEventListener("click", function () { ailabEvent("post-nav-" + x[1] + "-empty"); });
          nav.appendChild(e);
          return;
        }
        var a = document.createElement("a");
        a.className = "post-nav-link " + x[1];
        a.href = p.date + ".html";
        var b = document.createElement("span");
        b.className = "bracket";
        b.textContent = x[2] + " · " + label(p.date);
        var t = document.createElement("strong");
        phrases(t, p.title);
        a.appendChild(b);
        a.appendChild(t);
        a.addEventListener("click", function () { ailabEvent("post-nav-" + x[1]); });
        nav.appendChild(a);
      });
      end.parentNode.insertBefore(nav, end);
    }).catch(function () {});
  });
})();

// 메뉴가 화면보다 길면 오른쪽 끝을 흐리게 해서 옆으로 더 있다는 걸 알려요. 끝까지 밀면 흐림을 없애요.
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var bar = document.querySelector(".nav-links");
    if (!bar) return;
    function update() {
      bar.classList.toggle("is-more", bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 4);
      bar.classList.toggle("is-less", bar.scrollLeft > 4);
    }
    bar.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".text-toggle")) setTimeout(update, 50); });
    update();
  });
})();

// 첫 화면 그림 두 장을 옆 글 묶음 높이(날짜 위 ~ 버튼 아래)에 맞춰 정사각형으로 맞춥니다.
// 글 칸 너비가 바뀌면 제목 크기도 바뀌므로, 크기가 멈출 때까지 몇 번 다시 잽니다.
(function () {
  var WIDE = window.matchMedia("(min-width: 1200px)");
  var MIN_TEXT = 420; // 글 칸이 이보다 좁아지지 않게(px)
  function fit() {
    var hero = document.querySelector(".hero");
    if (!hero) return;
    var date = hero.querySelector(".hero-text .bracket");
    var pill = hero.querySelector(".hero-text .pill");
    if (!date || !pill || !WIDE.matches) {
      hero.classList.remove("is-fit");
      hero.style.removeProperty("--hero-tile");
      return;
    }
    var cs = getComputedStyle(hero);
    var gap = parseFloat(cs.columnGap) || 0;
    var inner = hero.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var max = Math.floor((inner - MIN_TEXT - 2 * gap) / 2);
    var size = parseFloat(hero.style.getPropertyValue("--hero-tile")) || 0;
    hero.classList.add("is-fit");
    for (var i = 0; i < 8; i++) {
      var h = Math.round(pill.getBoundingClientRect().bottom - date.getBoundingClientRect().top);
      var next = Math.max(0, Math.min(h, max));
      if (Math.abs(next - size) < 1) break;
      size = next;
      hero.style.setProperty("--hero-tile", size + "px");
    }
    // 글 칸이 너무 좁아져 높이를 맞출 수 없으면(창이 좁고 글자를 크게 했을 때) 원래 배치로 돌아가요
    var left = Math.round(pill.getBoundingClientRect().bottom - date.getBoundingClientRect().top);
    if (Math.abs(left - size) > 2) {
      hero.classList.remove("is-fit");
      hero.style.removeProperty("--hero-tile");
    }
  }
  function start() {
    fit();
    var hero = document.querySelector(".hero");
    if (hero && "ResizeObserver" in window) {
      var text = hero.querySelector(".hero-text");
      var busy = false;
      var ro = new ResizeObserver(function () {
        if (busy) return;
        busy = true;
        requestAnimationFrame(function () { fit(); busy = false; });
      });
      ro.observe(hero);
      if (text) ro.observe(text);
    } else {
      window.addEventListener("resize", fit);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    if (WIDE.addEventListener) WIDE.addEventListener("change", fit);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
