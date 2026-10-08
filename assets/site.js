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
