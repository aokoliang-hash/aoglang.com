(function () {
  var toggle = document.querySelector(".menu-toggle");
  var drawer = document.getElementById("nav-drawer");
  if (toggle && drawer) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", open ? "false" : "true");
      drawer.classList.toggle("is-open", !open);
      drawer.hidden = open;
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        toggle.setAttribute("aria-expanded", "false");
        drawer.classList.remove("is-open");
        drawer.hidden = true;
        toggle.focus();
      }
    });
  }

  var yearEls = document.querySelectorAll("[data-year]");
  var y = String(new Date().getFullYear());
  yearEls.forEach(function (el) {
    el.textContent = y;
  });
})();
