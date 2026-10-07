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
