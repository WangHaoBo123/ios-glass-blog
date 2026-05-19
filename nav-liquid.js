(function () {
  const navLinks = document.querySelector(".nav-links");
  if (!navLinks) return;

  const indicator =
    navLinks.querySelector(".nav-indicator") ||
    Object.assign(document.createElement("span"), {
      className: "nav-indicator",
    });

  indicator.setAttribute("aria-hidden", "true");
  if (!indicator.parentElement) {
    navLinks.prepend(indicator);
  }

  let hoverItem = null;

  function currentPageName() {
    return (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  }

  function visibleItems() {
    return [...navLinks.querySelectorAll("a[href], button")]
      .filter((item) => !item.hidden)
      .filter((item) => item.getAttribute("aria-hidden") !== "true")
      .filter((item) => item.offsetParent !== null);
  }

  function findItemByHref(needle) {
    return visibleItems().find((item) => item.tagName === "A" && item.getAttribute("href") === needle) || null;
  }

  function activeItem() {
    const items = visibleItems();
    const ariaCurrent = items.find((item) => item.getAttribute("aria-current") === "page");
    if (ariaCurrent) return ariaCurrent;

    const page = currentPageName();
    const hash = window.location.hash || "#articles";

    if (page === "index.html") {
      if (hash === "#archive") return findItemByHref("./index.html#archive");
      if (hash === "#tags" || hash.startsWith("#tag/")) return findItemByHref("./index.html#tags");
      return findItemByHref("./index.html#articles");
    }

    if (page === "about.html") return findItemByHref("./about.html");
    if (page === "compose.html") return findItemByHref("./compose.html");
    if (page === "manage.html") return findItemByHref("./manage.html");

    return null;
  }

  function clearCurrentClass() {
    visibleItems().forEach((item) => item.classList.remove("is-nav-current"));
  }

  function placeIndicator(target) {
    if (!target) {
      indicator.classList.remove("is-visible");
      clearCurrentClass();
      return;
    }

    const navRect = navLinks.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const x = targetRect.left - navRect.left;
    const y = targetRect.top - navRect.top;

    indicator.style.setProperty("--nav-x", `${x}px`);
    indicator.style.setProperty("--nav-y", `${y}px`);
    indicator.style.setProperty("--nav-width", `${targetRect.width}px`);
    indicator.style.setProperty("--nav-height", `${targetRect.height}px`);
    indicator.classList.add("is-visible");
  }

  function syncIndicator(preferredTarget = null) {
    const restingTarget = activeItem();
    clearCurrentClass();
    restingTarget?.classList.add("is-nav-current");
    placeIndicator(preferredTarget || hoverItem || restingTarget);
  }

  navLinks.addEventListener("pointerover", (event) => {
    const item = event.target.closest("a[href], button");
    if (!item || !navLinks.contains(item) || item.hidden) return;
    hoverItem = item;
    syncIndicator(item);
  });

  navLinks.addEventListener("pointerleave", () => {
    hoverItem = null;
    syncIndicator();
  });

  navLinks.addEventListener("focusin", (event) => {
    const item = event.target.closest("a[href], button");
    if (!item || !navLinks.contains(item) || item.hidden) return;
    hoverItem = item;
    syncIndicator(item);
  });

  navLinks.addEventListener("focusout", () => {
    window.setTimeout(() => {
      const focused = document.activeElement?.closest?.(".nav-links a[href], .nav-links button") || null;
      hoverItem = focused && navLinks.contains(focused) ? focused : null;
      syncIndicator();
    }, 0);
  });

  const observer = new MutationObserver(() => {
    syncIndicator();
  });

  observer.observe(navLinks, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["aria-current", "hidden"],
  });

  window.addEventListener("hashchange", () => syncIndicator());
  window.addEventListener("popstate", () => syncIndicator());
  window.addEventListener("resize", () => syncIndicator());
  window.addEventListener("pageshow", () => syncIndicator());

  syncIndicator();
})();
