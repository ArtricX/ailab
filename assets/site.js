// 아이고 사이트 공통 스크립트 (2026-11 새 디자인)
// 글자 크게, 구독 폼, 상단 메뉴 표시, 맨 위로, 소식 듣기, 공유하기, 다른 날 소식, 홈의 지난 소식, 바닥글 링크.

// 글자 크게 보기: 누른 상태를 이 브라우저에 기억합니다.
(function () {
  var root = document.documentElement;
  var KEY = "ailab-large-text";
  try { if (localStorage.getItem(KEY) === "1") root.classList.add("large-text"); } catch (e) {}
  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.querySelector(".text-toggle");
    if (!btn) return;
    // 예전 글처럼 글자만 있는 버튼이면 '가+'와 이름을 넣어 줘요
    if (!btn.querySelector(".tt-label")) btn.innerHTML = '<span class="tt-icon" aria-hidden="true">가+</span><span class="tt-label">글자 크게</span>';
    var icon = btn.querySelector(".tt-icon"), label = btn.querySelector(".tt-label");
    function sync() {
      var on = root.classList.contains("large-text");
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? "글자 작게" : "글자 크게");
      if (icon) icon.textContent = on ? "가−" : "가+";
      if (label) label.textContent = on ? "글자 작게" : "글자 크게";
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
        var home = el("a", "btn btn-ink", "오늘의 소식 보러 가기");
        home.href = "index.html";
        acts.appendChild(home);
      }
      if (key === "error" || key === "bye" || key === "offline" || key === "mail") {
        var again = el("button", "btn", key === "mail" ? "다른 주소로 신청하기" : "다시 신청하기");
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

// 카카오톡 공유: 카카오디벨로퍼스 [앱] > [플랫폼 키] > [JavaScript 키]의 키를 넣으면 공유하기 카드에 '카카오톡' 버튼이 생겨요.
// 먼저 같은 화면의 [JavaScript SDK 도메인]과 [앱] > [제품 링크 관리] > [웹 도메인]에 https://aigo.artricx.com 을 등록해요.
// 이 키는 웹 페이지에 넣도록 만든 공개용 키예요(등록한 도메인에서만 동작).
var AIGO_KAKAO_KEY = "aa274e87a72ff661d65475c4bb4b05a5";
var AIGO_KAKAO_SDK = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.4/kakao.min.js";

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

// 공통 도우미
var AIGO = {
  WEEK: "일월화수목금토",
  base: function () { return /\/posts\//.test(location.pathname) ? "../" : ""; },
  label: function (d) {
    var dt = new Date(d + "T00:00:00");
    return (dt.getMonth() + 1) + "월 " + dt.getDate() + "일 " + AIGO.WEEK.charAt(dt.getDay()) + "요일";
  },
  phrases: function (el, s, sep) {
    String(s || "").split("|").map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (p, i) {
      if (i) el.appendChild(sep === "br" ? document.createElement("br") : document.createTextNode(" "));
      var span = document.createElement("span");
      span.className = "ph";
      span.textContent = p;
      el.appendChild(span);
    });
  },
  el: function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
};

// 상단 메뉴: 지금 읽고 있는 소식에 밑줄을 그어요.
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var bar = document.querySelector(".nav-links");
    if (!bar || !("IntersectionObserver" in window)) return;
    var links = Array.prototype.filter.call(bar.querySelectorAll("a"), function (a) {
      return (a.getAttribute("href") || "").charAt(0) === "#";
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

// 예전 인포그래픽(SVG)이 화면보다 넓으면 '옆으로 밀어 보세요' 안내를 붙여요.
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.forEach.call(document.querySelectorAll(".figure-frame"), function (fr) {
      if (fr.parentNode.querySelector(".figure-hint")) return;
      var hint = AIGO.el("p", "figure-hint", "그림이 잘리면 옆으로 밀어 보세요.");
      fr.parentNode.insertBefore(hint, fr.nextSibling);
      function check() { hint.hidden = fr.scrollWidth <= fr.clientWidth + 2; }
      check();
      window.addEventListener("resize", check);
    });
  });
})();

// 소식 듣기: 소식마다 '이 소식 듣기', 머리에 '오늘 소식 전체 듣기'. 녹음(data-audio)이 있는 글에서만 보여요.
(function () {
  function fmt(s) {
    if (!isFinite(s) || s <= 0) return "";
    s = Math.round(s);
    return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
  }
  document.addEventListener("DOMContentLoaded", function () {
    var secs = Array.prototype.filter.call(document.querySelectorAll("section.story[data-audio]"), function (s) {
      return s.getAttribute("data-audio");
    });
    if (!secs.length || typeof Audio === "undefined") return;
    var audio = new Audio();
    audio.preload = "none";
    var queue = [], cur = -1, mode = null; // mode: 'one' | 'all'
    var items = [], allBtn = null;

    function title(sec) {
      var h = sec.querySelector(".story-head h2");
      return h ? h.textContent.replace(/\s+/g, " ").trim() : "";
    }
    function paint() {
      var playing = !audio.paused && cur >= 0;
      items.forEach(function (it, i) {
        var on = playing && cur === i;
        it.btn.classList.toggle("is-playing", on);
        it.btn.querySelector(".listen-label").textContent = on ? "듣는 중 · 멈추기" : "이 소식 듣기";
        it.btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (allBtn) {
        var allOn = playing && mode === "all";
        allBtn.classList.toggle("is-playing", allOn);
        allBtn.querySelector(".listen-title").textContent = allOn ? "전체 듣는 중 · 멈추기" : "오늘 소식 전체 듣기";
        allBtn.setAttribute("aria-pressed", allOn ? "true" : "false");
      }
    }
    function start(i) {
      cur = i;
      audio.src = items[i].src;
      audio.play().catch(function () {});
    }
    function stop() { audio.pause(); paint(); }
    audio.addEventListener("play", paint);
    audio.addEventListener("pause", paint);
    audio.addEventListener("ended", function () {
      if (mode === "all" && queue.length) { start(queue.shift()); return; }
      cur = -1; mode = null; paint();
    });

    secs.forEach(function (sec, i) {
      var head = sec.querySelector(".story-head");
      if (!head) return;
      var b = AIGO.el("button", "listen");
      b.type = "button";
      b.innerHTML = '<span class="listen-ic" aria-hidden="true"></span><span class="listen-label">이 소식 듣기</span><span class="listen-time"></span>';
      b.setAttribute("aria-label", "이 소식 소리로 듣기: " + title(sec));
      head.appendChild(b);
      var it = { btn: b, src: sec.getAttribute("data-audio"), dur: 0 };
      items.push(it);
      var probe = new Audio();
      probe.preload = "metadata";
      probe.addEventListener("loadedmetadata", function () {
        it.dur = probe.duration;
        b.querySelector(".listen-time").textContent = fmt(probe.duration);
        if (allBtn) {
          var total = items.reduce(function (a, x) { return a + (x.dur || 0); }, 0);
          if (items.every(function (x) { return x.dur; })) allBtn.querySelector(".listen-sub").textContent = "세 소식을 이어서 읽어 드려요 · 약 " + Math.max(1, Math.round(total / 60)) + "분";
        }
      });
      probe.src = it.src;
      b.addEventListener("click", function () {
        var idx = items.indexOf(it);
        if (cur === idx && !audio.paused) { stop(); return; }
        if (cur === idx && audio.paused && audio.currentTime > 0 && mode === "one") { audio.play(); return; }
        mode = "one"; queue = [];
        ailabEvent("listen-story");
        start(idx);
      });
    });

    var h1 = document.querySelector(".post-hero h1");
    if (h1 && items.length > 1) {
      allBtn = AIGO.el("button", "listen listen-all");
      allBtn.type = "button";
      allBtn.innerHTML = '<span class="listen-ic" aria-hidden="true"></span><span class="listen-label"><span class="listen-title">오늘 소식 전체 듣기</span><span class="listen-sub">세 소식을 이어서 읽어 드려요</span></span>';
      h1.parentNode.insertBefore(allBtn, h1.nextSibling);
      allBtn.addEventListener("click", function () {
        if (mode === "all" && !audio.paused) { stop(); return; }
        if (mode === "all" && audio.paused && cur >= 0) { audio.play(); return; }
        mode = "all";
        queue = items.map(function (_, i) { return i; });
        ailabEvent("listen-all");
        start(queue.shift());
      });
    }
  });
})();

// 글 끝: 공유하기 카드와 다른 날 소식. 글 페이지(posts/날짜.html)에서만 만들어요.
(function () {
  // 미리보기 파일은 window.AIGO_DATE로 날짜를 알려 줘요
  // 대표 주소(Cloudflare Pages)는 주소 끝의 .html을 떼고 보여 줘요(/posts/2026-11-17). 그래서 .html은 있어도 없어도 돼요.
  var m = location.pathname.match(/posts\/(\d{4}-\d{2}-\d{2})(?:\.html)?\/?$/) || (window.AIGO_DATE ? [0, window.AIGO_DATE] : null);
  if (!m) return;
  var today = m[1];
  var ICON = {
    sms: '<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M24.5 17.5C24.5 18.1188 24.2542 18.7123 23.8166 19.1499C23.379 19.5875 22.7855 19.8333 22.1667 19.8333H8.16667L3.5 24.5V5.83333C3.5 5.21449 3.74583 4.621 4.18342 4.18342C4.621 3.74583 5.21449 3.5 5.83333 3.5H22.1667C22.7855 3.5 23.379 3.74583 23.8166 4.18342C24.2542 4.621 24.5 5.21449 24.5 5.83333V17.5Z" stroke="#fff" stroke-width="2.33" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    link: '<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M11.6667 15.166C12.1677 15.8358 12.8069 16.39 13.541 16.7911C14.275 17.1921 15.0868 17.4306 15.9211 17.4904C16.7554 17.5501 17.5929 17.4297 18.3766 17.1374C19.1603 16.845 19.872 16.3876 20.4633 15.796L23.9633 12.296C25.0259 11.1958 25.6139 9.72228 25.6006 8.1928C25.5873 6.66332 24.9738 5.20025 23.8923 4.1187C22.8107 3.03715 21.3477 2.42367 19.8182 2.41038C18.2887 2.39709 16.8152 2.98505 15.715 4.04764L13.7083 6.04264" stroke="#1B1B1F" stroke-width="2.33" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.3333 12.8334C15.8323 12.1636 15.1931 11.6094 14.459 11.2083C13.725 10.8073 12.9132 10.5688 12.0789 10.509C11.2446 10.4493 10.4072 10.5697 9.62343 10.862C8.83972 11.1544 8.12804 11.6119 7.53667 12.2034L4.03667 15.7034C2.97408 16.8036 2.38611 18.2771 2.39941 19.8066C2.4127 21.3361 3.02618 22.7992 4.10773 23.8807C5.18928 24.9623 6.65235 25.5757 8.18183 25.589C9.71131 25.6023 11.1848 25.0144 12.285 23.9518L14.28 21.9568" stroke="#1B1B1F" stroke-width="2.33" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    kakao: '<svg viewBox="16 16 28 28" fill="none" aria-hidden="true"><path d="M40.5 29.4167C40.504 30.9565 40.1442 32.4756 39.45 33.85C38.6268 35.4971 37.3614 36.8824 35.7954 37.8509C34.2293 38.8193 32.4246 39.3327 30.5833 39.3334C29.0435 39.3374 27.5245 38.9776 26.15 38.2834L19.5 40.5L21.7167 33.85C21.0224 32.4756 20.6627 30.9565 20.6667 29.4167C20.6674 27.5754 21.1807 25.7707 22.1492 24.2047C23.1176 22.6387 24.503 21.3732 26.15 20.55C27.5245 19.8558 29.0435 19.496 30.5833 19.5H31.1667C33.5984 19.6342 35.8952 20.6606 37.6173 22.3827C39.3394 24.1048 40.3658 26.4016 40.5 28.8334V29.4167Z" stroke="#1B1B1F" stroke-width="2.33" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    more: '<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><circle cx="14" cy="14" r="1.4" stroke="#1B1B1F" stroke-width="2.33"/><circle cx="22.17" cy="14" r="1.4" stroke="#1B1B1F" stroke-width="2.33"/><circle cx="5.83" cy="14" r="1.4" stroke="#1B1B1F" stroke-width="2.33"/></svg>'
  };

  document.addEventListener("DOMContentLoaded", function () {
    var main = document.querySelector("main");
    if (!main) return;
    var anchor = document.getElementById("subscribe");
    function put(node) { if (anchor && anchor.parentNode === main) main.insertBefore(node, anchor); else main.appendChild(node); }
    var base = AIGO.base();
    var site = window.AIGO_DATE ? "https://aigo.artricx.com/" : base; // 링크가 갈 곳
    // 대표 주소든 예비 주소(artricx.github.io/ailab)든, 공유하는 링크는 늘 대표 주소의 글 주소로 보내요.
    var onSite = /(^|\.)artricx\.(com|github\.io)$/.test(location.hostname);
    var url = (window.AIGO_DATE || onSite) ? "https://aigo.artricx.com/posts/" + today + ".html" : location.origin + location.pathname;
    var h1 = document.querySelector(".post-hero h1");
    var title = h1 ? h1.textContent.replace(/\s+/g, " ").trim() : document.title;

    // 공유하기
    var share = AIGO.el("section", "share");
    share.setAttribute("aria-labelledby", "share-title");
    var text = AIGO.el("div");
    var h2 = AIGO.el("h2");
    h2.id = "share-title";
    AIGO.phrases(h2, "이 소식을 함께 보고 싶은|분께 보내 보세요");
    text.appendChild(h2);
    var kakaoOn = !!AIGO_KAKAO_KEY;
    text.appendChild(AIGO.el("p", "share-sub", kakaoOn
      ? "카카오톡으로 바로 보내거나, 주소를 복사해 문자·메일에 붙여 넣을 수 있어요."
      : "주소를 복사해 문자·메일·메신저에 붙여 넣을 수 있어요."));
    share.appendChild(text);
    var row = AIGO.el("div", "share-to");
    var msg = AIGO.el("p", "share-msg");
    msg.setAttribute("role", "status");
    function btn(kind, label, cls) {
      var b = AIGO.el(kind === "sms" ? "a" : "button", "share-btn is-" + kind + (cls ? " " + cls : ""));
      if (kind !== "sms") b.type = "button";
      b.innerHTML = "<i>" + ICON[kind] + "</i>";
      b.appendChild(document.createTextNode(label));
      row.appendChild(b);
      return b;
    }
    function copy(say) {
      function done() { msg.textContent = say; }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(done, function () { window.prompt("이 주소를 복사하세요", url); });
      } else { window.prompt("이 주소를 복사하세요", url); }
    }
    // 피그마 시안 순서: 휴대폰 카카오톡·문자·링크 복사·더보기 / 컴퓨터 카카오톡·링크 복사
    if (kakaoOn) {
      // 검수용 미리보기(아티팩트)는 등록한 도메인이 아니라서 SDK를 불러오지 않아요(누르면 링크 복사).
      if (!window.Kakao && !window.AIGO_DATE) {
        var ks = document.createElement("script");
        ks.src = AIGO_KAKAO_SDK;
        ks.crossOrigin = "anonymous";
        ks.onload = function () { try { if (!window.Kakao.isInitialized()) window.Kakao.init(AIGO_KAKAO_KEY); } catch (e) {} };
        document.head.appendChild(ks);
      }
      btn("kakao", "카카오톡").addEventListener("click", function () {
        ailabEvent("share-kakao");
        var K = window.Kakao;
        if (!K || !K.isInitialized || !K.isInitialized() || !K.Share) {
          copy("카카오톡을 열지 못해 링크를 복사했어요. 카카오톡 대화창에 붙여 넣으세요.");
          return;
        }
        var og = document.querySelector('meta[property="og:image"]');
        var img = og ? og.content.replace(/^https:\/\/artricx\.github\.io\/ailab\//, "https://aigo.artricx.com/") : "";
        var dsc = document.querySelector('meta[property="og:description"]');
        var link = { mobileWebUrl: url, webUrl: url };
        var content = { title: title, description: dsc ? dsc.content : "누구나 읽는 아침 AI 소식", link: link };
        if (img) { content.imageUrl = img; content.imageWidth = 1200; content.imageHeight = 630; }
        try {
          K.Share.sendDefault({ objectType: "feed", content: content, buttons: [{ title: "소식 보기", link: link }] });
        } catch (e) { copy("카카오톡을 열지 못해 링크를 복사했어요. 카카오톡 대화창에 붙여 넣으세요."); }
      });
    }
    var sms = btn("sms", "문자", "only-phone");
    sms.href = "sms:?&body=" + encodeURIComponent(title + " " + url);
    sms.addEventListener("click", function () { ailabEvent("share-sms"); });
    btn("link", "링크 복사").addEventListener("click", function () {
      ailabEvent("share-copy");
      copy("링크를 복사했어요. 카톡이나 문자에 붙여 넣으세요.");
    });
    if (navigator.share) {
      btn("more", "더보기", "only-phone").addEventListener("click", function () {
        ailabEvent("share-more");
        navigator.share({ title: document.title, text: title, url: url }).catch(function () {});
      });
    }
    share.appendChild(row);
    share.appendChild(msg);
    put(share);

    // 다른 날 소식
    var other = AIGO.el("section", "other");
    other.setAttribute("aria-labelledby", "other-title");
    var oh = AIGO.el("h2", null, "다른 날 소식");
    oh.id = "other-title";
    other.appendChild(oh);
    var cards = AIGO.el("div", "other-cards");
    other.appendChild(cards);
    var all = AIGO.el("a", "btn", "지난 소식 모두 보기");
    all.href = site + "index.html#archive";
    all.addEventListener("click", function () { ailabEvent("post-nav-archive"); });
    other.appendChild(all);
    put(other);

    function card(p, when, cls) {
      var a = AIGO.el("a", "other-card" + (cls ? " " + cls : ""));
      var s = p && p.stories && p.stories[0];
      if (p) {
        a.href = (window.AIGO_DATE ? site + "posts/" : "") + p.date + ".html";
        var src = s && (s.thumb || s.illust);
        if (src) {
          var img = AIGO.el("img");
          img.src = /^(https?:|data:)/.test(src) ? src : base + src;
          img.alt = "";
          a.appendChild(img);
        } else {
          var na = AIGO.el("i", "no-art c-" + ((s && s.color) || "yellow"));
          a.appendChild(na);
        }
      }
      var box = AIGO.el("span");
      box.appendChild(AIGO.el("span", "other-when", when));
      var st = AIGO.el("strong");
      if (p) AIGO.phrases(st, p.title, "br"); else st.textContent = "내일 아침 7시에 올라와요";
      box.appendChild(st);
      a.appendChild(box);
      return a;
    }
    // 미리보기 파일은 글 목록을 window.AIGO_POSTS로 넣어 둬요
    (window.AIGO_POSTS ? Promise.resolve(window.AIGO_POSTS) : fetch(base + "posts.json", { cache: "no-cache" }).then(function (r) { return r.json(); })).then(function (posts) {
      posts = posts.slice();
      posts.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      var i = posts.findIndex(function (p) { return p.date === today; });
      if (i < 0) return;
      var older = posts[i + 1], newer = posts[i - 1];
      if (older) {
        var c1 = card(older, "이전 소식 · " + AIGO.label(older.date));
        c1.addEventListener("click", function () { ailabEvent("post-nav-prev"); });
        cards.appendChild(c1);
      }
      if (newer) {
        var c2 = card(newer, "다음 소식 · " + AIGO.label(newer.date));
        c2.addEventListener("click", function () { ailabEvent("post-nav-next"); });
        cards.appendChild(c2);
      } else {
        var d = new Date(today + "T00:00:00");
        d.setDate(d.getDate() + 1);
        var next = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
        var soon = card(null, "다음 소식 · " + AIGO.label(next), "is-soon");
        soon.href = site + "subscribe.html";
        soon.setAttribute("aria-label", "다음 소식은 내일 아침 7시에 올라와요. 메일로 받아 보기");
        cards.appendChild(soon);
      }
    }).catch(function () {});
  });
})();

// 홈: 지난 소식의 요일 띠와 '더 지난 소식 보기'
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var archive = document.getElementById("archive");
    if (!archive) return;
    var more = archive.querySelector(".more");
    var days = Array.prototype.slice.call(archive.querySelectorAll(".day"));
    var STEP = 7;
    function shown() { return days.filter(function (d) { return !d.hidden; }).length; }
    function reveal(n) {
      days.forEach(function (d, i) { if (i < n) d.hidden = false; });
      if (more) more.hidden = shown() >= days.length;
    }
    if (more) {
      more.hidden = shown() >= days.length;
      more.addEventListener("click", function () {
        ailabEvent("archive-more");
        var first = days.filter(function (d) { return d.hidden; })[0];
        reveal(shown() + STEP);
        if (first) { var a = first.querySelector("a"); if (a) a.focus({ preventScroll: true }); }
      });
    }
    var week = archive.querySelector(".week");
    if (!week) return;
    var links = Array.prototype.slice.call(week.querySelectorAll("a[href^='#d-']"));
    function mark(id) {
      links.forEach(function (a) { a.setAttribute("aria-current", a.getAttribute("href") === "#" + id ? "true" : "false"); });
    }
    links.forEach(function (a) {
      a.addEventListener("click", function () {
        var t = document.getElementById(a.getAttribute("href").slice(1));
        if (t && t.hidden) reveal(days.indexOf(t) + 1);
        mark(t ? t.id : "");
      });
    });
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) mark(e.target.id); });
      }, { rootMargin: "-30% 0px -60% 0px" });
      days.forEach(function (d) { io.observe(d); });
    }
  });
})();

// 바닥글에 '출처와 저작권 안내'와 '개인정보처리방침' 링크가 없으면 붙여요 (모든 페이지 공통)
(function () {
  function add() {
    var foot = document.querySelector(".footer .footer-in, .footer .footer-main");
    if (!foot || document.querySelector(".footer .footer-links")) return;
    var base = AIGO.base();
    var p = document.createElement("p");
    p.className = "footer-links";
    p.innerHTML = '아이고 AI-go · <a href="' + base + 'copyright.html">출처와 저작권 안내</a> · <a href="' + base + 'privacy.html">개인정보처리방침</a>';
    foot.appendChild(p);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add);
  else add();
})();

// 소식 끝 반응 '이 소식, 어떠셨어요?' (피그마 3i·3j, C안 캐릭터)
// 숫자는 앱과 같은 Supabase(reaction_get · reaction_set 함수)에 모여요. 표 만들기는 aigo-app 저장소 supabase/migrations/20261117000000_story_reactions.sql.
// 주소나 키가 빈 칸이거나 서버가 답하지 않으면 반응 칸을 아예 보여 주지 않아요.
// 키는 공개용(publishable) 키예요. 표는 직접 못 읽고 두 함수로만 써요.
var AIGO_REACT_URL = "https://nmnkslcupmamcobxvqqm.supabase.co";
var AIGO_REACT_KEY = "sb_publishable_B7UmfG4etyeyWBcjlEugRA_Ct9qlQUu";
(function () {
  if (!AIGO_REACT_URL || !AIGO_REACT_KEY) return;
  var m = location.pathname.match(/posts\/(\d{4}-\d{2}-\d{2})(?:\.html)?\/?$/) || (window.AIGO_DATE ? [0, window.AIGO_DATE] : null);
  if (!m) return;
  var day = m[1];
  var KINDS = [["help", "도움 돼요"], ["aigo", "아이고!"], ["worry", "걱정돼요"], ["curious", "궁금해요"]];
  var SHOW_AT = 10; // 소식 하나의 합계가 이 수를 넘으면 숫자를 보여 줘요

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; }
  }
  function deviceId() {
    var id = store("aigo-device");
    if (id && /^[0-9a-f-]{36}$/.test(id)) return id;
    if (window.crypto && crypto.randomUUID) id = crypto.randomUUID();
    else id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16);
    });
    store("aigo-device", id);
    return id;
  }
  function rpc(name, body) {
    return fetch(AIGO_REACT_URL + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: AIGO_REACT_KEY },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (j) { if (!r.ok) throw new Error((j && j.message) || "error"); return j; });
    });
  }
  // 1,234 · 1.2만 · 12만
  function fmt(n) {
    if (n >= 100000) return Math.floor(n / 10000) + "만";
    if (n >= 10000) { var x = Math.floor(n / 1000) / 10; return (x % 1 ? x.toFixed(1) : String(x)) + "만"; }
    return n.toLocaleString("en-US");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var stories = Array.prototype.filter.call(document.querySelectorAll("section.story[id]"), function (s) {
      return s.querySelector(".qa");
    });
    if (!stories.length) return;
    var device = deviceId();
    var img = AIGO.base() + "assets/ui/react/";

    rpc("reaction_get", { p_date: day, p_device: device }).then(function (data) {
      stories.forEach(function (sec) { build(sec, (data.counts || {})[sec.id] || {}, (data.mine || {})[sec.id] || null); });
    }).catch(function () { /* 서버가 답하지 않으면 보여 주지 않아요 */ });

    function build(sec, counts, mine) {
      var anchor = sec.id;
      var box = AIGO.el("div", "react");
      box.setAttribute("role", "group");
      box.setAttribute("aria-label", "이 소식, 어떠셨어요?");
      box.appendChild(AIGO.el("p", "react-q", "이 소식, 어떠셨어요?"));
      var row = AIGO.el("div", "react-row");
      var hint = AIGO.el("p", "react-hint", "다시 누르면 취소돼요.");
      hint.setAttribute("aria-live", "polite");
      var btns = {};
      KINDS.forEach(function (k) {
        var b = AIGO.el("button", "react-btn is-" + k[0]);
        b.type = "button";
        var face = AIGO.el("i");
        var pic = document.createElement("img");
        pic.src = img + k[0] + ".png";
        pic.alt = "";
        pic.width = 64; pic.height = 64;
        pic.decoding = "async";
        face.appendChild(pic);
        var num = AIGO.el("b", "react-num");
        face.appendChild(num);
        b.appendChild(face);
        b.appendChild(AIGO.el("span", "react-name", k[1]));
        b.addEventListener("click", function () { choose(mine === k[0] ? null : k[0]); });
        btns[k[0]] = { el: b, num: num, label: k[1] };
        row.appendChild(b);
      });
      box.appendChild(row);
      box.appendChild(hint);

      function paint() {
        var total = 0;
        KINDS.forEach(function (k) { total += counts[k[0]] || 0; });
        var show = total > SHOW_AT;
        KINDS.forEach(function (k) {
          var it = btns[k[0]], n = counts[k[0]] || 0, on = mine === k[0];
          it.el.classList.toggle("is-on", on);
          it.el.setAttribute("aria-pressed", on ? "true" : "false");
          it.num.hidden = !(show && n > 0);
          it.num.textContent = fmt(n);
          it.num.classList.toggle("is-one", String(fmt(n)).length === 1);
          it.el.setAttribute("aria-label", it.label + (show ? ", " + n.toLocaleString("en-US") + "명" : ""));
        });
        hint.hidden = !mine;
      }

      // 바로 바뀐 모습을 보여 주고, 서버에는 마지막으로 고른 것만 보내요(빠르게 여러 번 눌러도 괜찮아요).
      var timer = null, sending = false, wanted = mine, saved = mine;
      function choose(kind) {
        if (mine) counts[mine] = Math.max(0, (counts[mine] || 0) - 1);
        if (kind) counts[kind] = (counts[kind] || 0) + 1;
        mine = kind;
        wanted = kind;
        hint.textContent = "다시 누르면 취소돼요.";
        paint();
        ailabEvent("react-" + (kind || "cancel"));
        clearTimeout(timer);
        timer = setTimeout(send, 400);
      }
      function send(retry) {
        if (sending) { timer = setTimeout(send, 400); return; }
        if (wanted === saved && !retry) return;
        sending = true;
        var kind = wanted;
        rpc("reaction_set", { p_date: day, p_anchor: anchor, p_device: device, p_kind: kind }).then(function (res) {
          sending = false;
          saved = kind;
          if (wanted === kind) { counts = res.counts || {}; mine = res.mine || null; paint(); }
          else send();
        }).catch(function (err) {
          sending = false;
          if (/too_fast/.test(err.message) && !retry) { timer = setTimeout(function () { send(true); }, 1200); return; }
          // 반영되지 않았으면 원래대로 되돌려요
          rpc("reaction_get", { p_date: day, p_device: device }).then(function (d) {
            counts = (d.counts || {})[anchor] || {}; mine = (d.mine || {})[anchor] || null; saved = wanted = mine; paint();
          }).catch(function () {});
          hint.hidden = false;
          hint.textContent = "지금은 반영되지 않았어요. 잠시 뒤 다시 눌러 주세요.";
        });
      }

      paint();
      var src = sec.querySelector(".qa > .source, .source");
      if (src && src.parentNode) src.parentNode.insertBefore(box, src);
      else sec.querySelector(".qa").appendChild(box);
    }
  });
})();
