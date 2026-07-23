(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var toggle = document.querySelector("[data-nav-toggle]");
    var mobile = document.querySelector("[data-nav-mobile]");
    if (toggle && mobile) {
      mobile.hidden = true;
      toggle.addEventListener("click", function () {
        var open = mobile.hidden;
        mobile.hidden = !open;
        mobile.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    var sideToggle = document.querySelector("[data-sidebar-toggle]");
    var sidePanel = document.querySelector("[data-sidebar-panel]");
    if (sideToggle && sidePanel) {
      sideToggle.addEventListener("click", function () {
        var open = !sidePanel.classList.contains("is-open");
        sidePanel.classList.toggle("is-open", open);
        sideToggle.setAttribute("aria-expanded", open ? "true" : "false");
        var mark = sideToggle.querySelector("[aria-hidden]");
        if (mark) mark.textContent = open ? "−" : "+";
      });
    }

    // Wrap tables for horizontal scroll
    document.querySelectorAll(".page-content > table").forEach(function (table) {
      if (table.parentElement && table.parentElement.classList.contains("table-wrap")) return;
      var wrap = document.createElement("div");
      wrap.className = "table-wrap";
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });

    // TOC scroll-spy
    var tocLinks = Array.prototype.slice.call(
      document.querySelectorAll(".docs-toc a[href^='#'], .docs-toc-mobile a[href^='#']")
    );
    if (!tocLinks.length || !("IntersectionObserver" in window)) return;

    var map = {};
    tocLinks.forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      if (!id) return;
      map[id] = map[id] || [];
      map[id].push(a);
    });

    var headings = Object.keys(map)
      .map(function (id) {
        return document.getElementById(id);
      })
      .filter(Boolean);

    if (!headings.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.id;
          tocLinks.forEach(function (a) {
            a.classList.toggle("is-active", a.getAttribute("href") === "#" + id);
          });
        });
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );

    headings.forEach(function (h) {
      observer.observe(h);
    });
  });
})();
