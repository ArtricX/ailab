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
      btn.textContent = on ? "글자 보통으로" : "글자 크게";
    }
    sync();
    btn.addEventListener("click", function () {
      root.classList.toggle("large-text");
      try { localStorage.setItem(KEY, root.classList.contains("large-text") ? "1" : "0"); } catch (e) {}
      sync();
    });
  });
})();

// 구독 폼: beehiiv 구독 폼(AILAB 블로그 인라인 구독)을 구독 페이지의 입력 칸에 넣습니다.
// 8초가 지나도 폼이 뜨지 않으면 beehiiv 구독 페이지로 가는 안내 문구를 보여 줘요.
(function () {
  var FORM_ID = "7397c447-a3ee-4ca3-8342-74634c246e54";
  var LOADER = "https://subscribe-forms.beehiiv.com/v3/loader.js";
  document.addEventListener("DOMContentLoaded", function () {
    var slot = document.querySelector("[data-subscribe]");
    if (!slot) return;
    var s = document.createElement("script");
    s.async = true;
    s.src = LOADER;
    s.setAttribute("data-beehiiv-form", FORM_ID);
    slot.appendChild(s);
    var fallback = document.querySelector(".sub-fallback");
    setTimeout(function () {
      if (fallback && !slot.querySelector("iframe")) fallback.hidden = false;
    }, 8000);
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
        var left = a.offsetLeft - (bar.clientWidth - a.offsetWidth) / 2;
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
      if (!older && !newer) return;
      var nav = document.createElement("nav");
      nav.className = "post-nav gutter";
      nav.setAttribute("aria-label", "다른 날 소식");
      [[older, "prev", "이전 소식"], [newer, "next", "다음 소식"]].forEach(function (x) {
        var p = x[0];
        if (!p) return;
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

// 좁은 화면: 아래로 읽을 때는 로고 줄을 숨기고 메뉴 줄만 남겨요. 위로 조금만 올려도 다시 나타나요.
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var nav = document.querySelector(".nav");
    var bar = nav && nav.querySelector(".nav-links");
    if (!bar) return;
    var mq = window.matchMedia("(max-width: 860px)");
    var lastY = window.scrollY, compact = false;
    function measure() { nav.style.setProperty("--nav-hide", Math.max(0, bar.offsetTop - 6) + "px"); }
    function set(on) { if (on !== compact) { compact = on; nav.classList.toggle("is-compact", on); } }
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      if (!mq.matches || y < nav.offsetHeight * 2) set(false);
      else if (y > lastY + 6) set(true);
      else if (y < lastY - 6) set(false);
      lastY = y;
    }, { passive: true });
    measure();
    window.addEventListener("resize", measure);
    document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".text-toggle")) setTimeout(measure, 50); });
  });
})();
