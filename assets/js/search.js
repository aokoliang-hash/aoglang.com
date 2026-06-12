(function () {
  var input = document.getElementById("search-input");
  var form = document.getElementById("search-form");
  var main = document.getElementById("main");
  var screen = document.querySelector(".search-screen");
  var panel = document.getElementById("search-panel");
  var list = document.getElementById("search-results");
  var empty = document.getElementById("search-empty");
  var status = document.getElementById("search-status");
  var browse = document.getElementById("search-browse");
  var indexUrl = document.body.getAttribute("data-search-index");
  var urlBase = document.body.getAttribute("data-search-base") || "";
  var lang = document.body.getAttribute("data-lang") || "zh";
  if (!input || !list || !indexUrl) return;

  var items = [];
  var labels =
    lang === "en"
      ? {
          empty: "No results found. Try different keywords.",
          status: function (n) {
            return n === 1 ? "1 result" : n + " results";
          },
          loadError: "Could not load search index.",
          browse: "Browse",
        }
      : {
          empty: "未找到匹配内容，请换关键词试试。",
          status: function (n) {
            return "找到 " + n + " 条结果";
          },
          loadError: "无法加载搜索索引。",
          browse: "浏览内容",
        };

  fetch(indexUrl)
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      items = (data.items || []).filter(function (item) {
        return item.lang === lang;
      });
      renderBrowse();
      runSearch();
      input.focus({ preventScroll: true });
    })
    .catch(function () {
      if (empty) {
        empty.hidden = false;
        empty.textContent = labels.loadError;
      }
      if (panel) panel.hidden = false;
    });

  function renderBrowse() {
    if (!browse) return;
    var ul = browse.querySelector(".search-browse-list");
    if (!ul) return;
    ul.innerHTML = "";
    items.slice(0, 8).forEach(function (item) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = urlBase + item.url;
      a.textContent = item.title;
      li.appendChild(a);
      ul.appendChild(li);
    });
  }

  function runSearch() {
    var q = input.value.trim();
    var ql = q.toLowerCase();
    list.innerHTML = "";

    if (screen) {
      screen.classList.toggle("has-query", q.length > 0);
    }
    if (main) {
      main.classList.toggle("is-searching", q.length > 0);
    }

    if (!q) {
      if (empty) empty.hidden = true;
      if (status) status.hidden = true;
      if (panel) panel.hidden = true;
      if (browse) browse.hidden = false;
      updateUrl("");
      return;
    }

    if (panel) panel.hidden = false;
    if (browse) browse.hidden = true;

    var hits = items.filter(function (item) {
      var hay =
        (item.title + " " + item.desc + " " + (item.tags || []).join(" ")).toLowerCase();
      return hay.indexOf(ql) !== -1;
    });

    if (status) {
      status.hidden = false;
      status.textContent = labels.status(hits.length);
    }
    if (empty) empty.hidden = hits.length > 0;

    hits.forEach(function (item) {
      var li = document.createElement("li");
      var tags =
        item.tags && item.tags.length
          ? '<div class="result-tags">' +
            item.tags
              .map(function (t) {
                return '<span class="tag">' + escapeHtml(t) + "</span>";
              })
              .join("") +
            "</div>"
          : "";
      li.innerHTML =
        '<a href="' +
        escapeAttr(urlBase + item.url) +
        '">' +
        escapeHtml(item.title) +
        "</a><p>" +
        escapeHtml(item.desc) +
        "</p>" +
        tags;
      list.appendChild(li);
    });

    updateUrl(q);
  }

  function updateUrl(q) {
    var url = new URL(window.location.href);
    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    history.replaceState(null, "", url);
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  input.addEventListener("input", runSearch);

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      runSearch();
      var first = list.querySelector("a");
      if (first) first.focus();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== input) {
      e.preventDefault();
      input.focus();
    }
  });

  var params = new URLSearchParams(window.location.search);
  var initial = params.get("q");
  if (initial) {
    input.value = initial;
    runSearch();
  }

  if (window.location.hash === "#search" && input) {
    setTimeout(function () {
      input.focus({ preventScroll: false });
    }, 100);
  }
})();
