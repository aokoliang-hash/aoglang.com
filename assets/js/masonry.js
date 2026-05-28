(function () {
  var grids = document.querySelectorAll(".masonry-grid, .gallery-grid");
  if (!grids.length) return;

  var ROW_UNIT = 8;

  function thumbArFromRatio(ratio) {
    if (!ratio || ratio <= 0) return "4 / 3";
    if (ratio >= 1.6) return "16 / 9";
    if (ratio >= 1.15) return "4 / 3";
    if (ratio >= 0.85) return "1 / 1";
    return "3 / 4";
  }

  function applyItem(item, ratio) {
    var ar = thumbArFromRatio(ratio);
    item.style.setProperty("--thumb-ar", ar);
    if (item.classList.contains("card")) {
      var thumb = item.querySelector(".card-thumb");
      if (thumb) thumb.style.setProperty("--thumb-ar", ar);
    }
  }

  function gapPx(grid) {
    var s = getComputedStyle(grid);
    var g = parseFloat(s.rowGap);
    if (!Number.isNaN(g) && g > 0) return g;
    g = parseFloat(s.gap);
    return Number.isNaN(g) ? 16 : g;
  }

  /** 按真实高度设置 grid-row-end，填满空隙（真正瀑布流） */
  function layoutMasonryRows(grid) {
    grid.style.gridAutoRows = ROW_UNIT + "px";
    grid.style.gridAutoFlow = "dense";
    var gap = gapPx(grid);
    var items = grid.querySelectorAll(".card, figure");
    items.forEach(function (item) {
      var h = item.getBoundingClientRect().height;
      var span = Math.max(1, Math.ceil((h + gap) / (ROW_UNIT + gap)));
      item.style.gridRowEnd = "span " + span;
    });
  }

  function measureItem(item, onDone) {
    var img = item.querySelector("img.card-thumb, .gallery-grid img, img");
    if (!img) {
      applyItem(item, 1.33);
      onDone();
      return;
    }

    function done() {
      var w = img.naturalWidth;
      var h = img.naturalHeight;
      if (w && h) applyItem(item, w / h);
      else applyItem(item, 1.33);
      onDone();
    }

    if (img.complete && img.naturalWidth) done();
    else {
      img.addEventListener("load", done, { once: true });
      img.addEventListener(
        "error",
        function () {
          applyItem(item, 1.33);
          onDone();
        },
        { once: true }
      );
    }
  }

  function scheduleLayout(grid) {
    clearTimeout(grid._masonryTimer);
    grid._masonryTimer = setTimeout(function () {
      requestAnimationFrame(function () {
        layoutMasonryRows(grid);
      });
    }, 80);
  }

  function layoutGrid(grid) {
    var items = Array.from(grid.querySelectorAll(".card, figure"));
    if (!items.length) {
      layoutMasonryRows(grid);
      return;
    }
    items.forEach(function (item) {
      measureItem(item, function () {
        scheduleLayout(grid);
      });
    });
    scheduleLayout(grid);
  }

  grids.forEach(layoutGrid);

  window.addEventListener("load", function () {
    grids.forEach(layoutMasonryRows);
  });

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      grids.forEach(layoutMasonryRows);
    }, 150);
  });

  if (typeof MutationObserver !== "undefined") {
    grids.forEach(function (grid) {
      var obs = new MutationObserver(function () {
        layoutGrid(grid);
      });
      obs.observe(grid, { childList: true });
    });
  }
})();
