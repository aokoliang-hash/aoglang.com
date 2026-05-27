(function () {
  var grids = document.querySelectorAll(".masonry-grid, .gallery-grid");
  if (!grids.length) return;

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
      var img = item.querySelector(".card-thumb");
      if (img) img.style.setProperty("--thumb-ar", ar);
    }
  }

  function measureItem(item) {
    var img = item.querySelector("img.card-thumb, .gallery-grid img, img");
    if (!img) {
      applyItem(item, 1.33);
      return;
    }

    function done() {
      var w = img.naturalWidth;
      var h = img.naturalHeight;
      if (w && h) applyItem(item, w / h);
      else applyItem(item, 1.33);
    }

    if (img.complete && img.naturalWidth) done();
    else {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", function () {
        applyItem(item, 1.33);
      }, { once: true });
    }
  }

  function layoutGrid(grid) {
    grid.querySelectorAll(".card, figure").forEach(measureItem);
  }

  grids.forEach(layoutGrid);

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      grids.forEach(layoutGrid);
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
