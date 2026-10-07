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

// 구독 폼: beehiiv '구독 폼 > Get embed code'에서 받은 코드를 아래 EMBED에 붙여 넣으면
// 모든 페이지의 [구독] 칸이 그 폼으로 바뀝니다. 비어 있으면 beehiiv 구독 페이지로 가는 버튼이 그대로 보여요.
(function () {
  var EMBED = "";
  if (!EMBED) return;
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-subscribe]").forEach(function (slot) {
      var box = document.createElement("div");
      box.innerHTML = EMBED;
      slot.innerHTML = "";
      // innerHTML로 넣은 <script>는 실행되지 않아서 새로 만들어 붙입니다.
      Array.prototype.forEach.call(box.childNodes, function (node) {
        if (node.nodeName === "SCRIPT") {
          var s = document.createElement("script");
          Array.prototype.forEach.call(node.attributes, function (a) { s.setAttribute(a.name, a.value); });
          s.text = node.text;
          slot.appendChild(s);
        } else {
          slot.appendChild(node.cloneNode(true));
        }
      });
    });
  });
})();
