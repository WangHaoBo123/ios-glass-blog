(function () {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const transitionKey = "glass-blog-page-transition";
  const leaveDuration = 360;
  const enterDuration = 560;

  if (reducedMotion.matches) {
    window.GlassBlogTransition = {
      run(callback) {
        callback?.();
      },
      begin() {},
      end() {},
    };
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "page-transition-overlay";
  overlay.setAttribute("aria-hidden", "true");
  document.body.appendChild(overlay);

  let leaveTimer = 0;
  let enterTimer = 0;
  let holdTimer = 0;

  function clearTransitionTimers() {
    window.clearTimeout(leaveTimer);
    window.clearTimeout(enterTimer);
    window.clearTimeout(holdTimer);
  }

  function reset() {
    clearTransitionTimers();
    overlay.classList.remove("is-visible", "is-entering");
  }

  function begin() {
    clearTransitionTimers();
    overlay.classList.remove("is-entering");
    overlay.classList.add("is-visible");
  }

  function end() {
    window.clearTimeout(enterTimer);
    requestAnimationFrame(() => {
      overlay.classList.add("is-entering");
      overlay.classList.remove("is-visible");
      enterTimer = window.setTimeout(() => {
        overlay.classList.remove("is-entering");
      }, enterDuration + 80);
    });
  }

  function run(callback, options = {}) {
    begin();
    leaveTimer = window.setTimeout(() => {
      callback?.();
      if (options.persist) return;
      holdTimer = window.setTimeout(end, options.hold ?? 80);
    }, options.duration ?? leaveDuration);
  }

  function showEntryTransition() {
    if (sessionStorage.getItem(transitionKey) !== "1") return;
    sessionStorage.removeItem(transitionKey);

    reset();
    overlay.classList.add("is-visible");
    holdTimer = window.setTimeout(end, 80);
  }

  function shouldTransitionLink(link, event) {
    if (!link || event.defaultPrevented) return false;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (link.target && link.target !== "_self") return false;
    if (link.hasAttribute("download") || link.dataset.noTransition === "true") return false;

    const url = new URL(link.href, window.location.href);
    if (!["http:", "https:", "file:"].includes(url.protocol)) return false;
    if (url.origin !== window.location.origin) return false;

    const samePage =
      url.pathname === window.location.pathname &&
      url.search === window.location.search;

    if (samePage && url.hash) return false;
    if (url.href === window.location.href) return false;

    return true;
  }

  function handleLinkClick(event) {
    const link = event.target.closest?.("a[href]");
    if (!shouldTransitionLink(link, event)) return;

    event.preventDefault();
    sessionStorage.setItem(transitionKey, "1");
    run(() => {
      window.location.href = link.href;
    }, { persist: true });
  }

  window.GlassBlogTransition = {
    run,
    begin,
    end,
    reset,
  };

  window.addEventListener("pageshow", (event) => {
    const navigation = performance.getEntriesByType?.("navigation")?.[0];
    if (event.persisted || navigation?.type === "back_forward") {
      sessionStorage.removeItem(transitionKey);
      reset();
    }
  });

  window.addEventListener("pagehide", () => {
    reset();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      reset();
    }
  });

  showEntryTransition();
  document.addEventListener("click", handleLinkClick);
})();
