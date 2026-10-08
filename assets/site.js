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

// 구독 폼: beehiiv 구독 폼(AILAB 블로그 인라인 구독)을 [구독] 칸에 넣습니다.
// 폼이 뜨기 전이나 불러오지 못하면 beehiiv 구독 페이지로 가는 버튼이 그대로 보여요.
(function () {
  var FORM_ID = "7397c447-a3ee-4ca3-8342-74634c246e54";
  var LOADER = "https://subscribe-forms.beehiiv.com/v3/loader.js";
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-subscribe]").forEach(function (slot) {
      var fallback = slot.querySelector("a");
      var s = document.createElement("script");
      s.async = true;
      s.src = LOADER;
      s.setAttribute("data-beehiiv-form", FORM_ID);
      slot.appendChild(s);
      if (!fallback || !window.MutationObserver) return;
      var mo = new MutationObserver(function () {
        if (slot.querySelector("iframe")) { fallback.hidden = true; mo.disconnect(); }
      });
      mo.observe(slot, { childList: true, subtree: true });
    });
  });
})();
