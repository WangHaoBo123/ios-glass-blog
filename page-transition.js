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
  let originalMain = null;
  let originalMainId = "";
  let originalTitle = document.title;
  let softMain = null;

  const softPageNames = new Set(["about.html", "login.html"]);

  function pageName(url) {
    return (url.pathname.split("/").pop() || "index.html").toLowerCase();
  }

  function canUseSoftPage() {
    return Boolean(window.GlassBlogApp || document.querySelector("[data-featured-post]"));
  }

  function isSoftPageUrl(url) {
    return canUseSoftPage() && softPageNames.has(pageName(url));
  }

  function isSoftHomeUrl(url) {
    return canUseSoftPage() && pageName(url) === "index.html";
  }

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

  function setNavCurrent(page) {
    document.querySelectorAll(".nav-links a[aria-current]").forEach((link) => {
      link.removeAttribute("aria-current");
    });

    const current = document.querySelector(`.nav-links a[href$="${page}"]`);
    if (current) current.setAttribute("aria-current", "page");
  }

  function ensureOriginalMain() {
    if (originalMain) return originalMain;

    originalMain = document.querySelector("main#content") || document.querySelector("main.page-shell");
    originalMainId = originalMain?.id || "";
    return originalMain;
  }

  function removeSoftPage() {
    softMain?.remove();
    softMain = null;
  }

  function activateOriginalMain() {
    const main = ensureOriginalMain();
    removeSoftPage();
    document.body.classList.remove("is-soft-page");

    if (main) {
      main.hidden = false;
      if (originalMainId) main.id = originalMainId;
    }
  }

  function copySoftPageMeta(doc) {
    document.title = doc.title || originalTitle;

    const incomingDescription = doc.querySelector('meta[name="description"]');
    const description = document.querySelector('meta[name="description"]');
    if (incomingDescription && description) {
      description.setAttribute("content", incomingDescription.getAttribute("content") || "");
    }
  }

  function finishSoftPage(page) {
    document.body.classList.add("is-soft-page");
    setNavCurrent(page);
    window.GlassBlogBgm?.suppressNextPrompt?.();
    window.GlassBlogAuth?.syncAuthorUi?.();
    window.GlassBlogAuth?.initLoginPage?.();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  async function showSoftPage(url, options = {}) {
    const main = ensureOriginalMain();
    if (!main) {
      window.location.href = url.href;
      return;
    }

    const response = await fetch(url.href, { cache: "no-store" });
    if (!response.ok) throw new Error("soft page missing");

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const incomingMain = doc.querySelector("main#content") || doc.querySelector("main.page-shell");
    if (!incomingMain) throw new Error("soft page has no main");

    removeSoftPage();
    main.hidden = true;
    if (main.id) main.removeAttribute("id");

    softMain = incomingMain.cloneNode(true);
    softMain.dataset.softPage = pageName(url);
    softMain.id = "content";
    main.insertAdjacentElement("afterend", softMain);

    copySoftPageMeta(doc);
    finishSoftPage(pageName(url));

    if (!options.fromPopState) {
      history.pushState({ softPage: pageName(url) }, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }

  function showSoftHome(url, options = {}) {
    activateOriginalMain();
    setNavCurrent("");
    document.title = originalTitle;

    if (!options.fromPopState) {
      history.pushState({ softPage: null }, "", `${url.pathname}${url.search}${url.hash}`);
    }

    window.GlassBlogApp?.route?.();
    window.GlassBlogApp?.syncChromeState?.();

    if (url.hash) {
      document.querySelector(url.hash)?.scrollIntoView({ block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }

  function runSoftNavigation(callback) {
    begin();
    leaveTimer = window.setTimeout(async () => {
      try {
        await callback();
      } catch {
        callback.fallback?.();
        return;
      }
      holdTimer = window.setTimeout(end, 90);
    }, leaveDuration);
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

    const url = new URL(link.href, window.location.href);
    if (isSoftPageUrl(url)) {
      event.preventDefault();
      const task = () => showSoftPage(url);
      task.fallback = () => {
        window.location.href = link.href;
      };
      runSoftNavigation(task);
      return;
    }

    if (softMain && isSoftHomeUrl(url)) {
      event.preventDefault();
      runSoftNavigation(() => showSoftHome(url));
      return;
    }

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

  window.addEventListener("popstate", () => {
    const url = new URL(window.location.href);
    if (isSoftPageUrl(url)) {
      showSoftPage(url, { fromPopState: true }).catch(() => {
        window.location.href = url.href;
      });
      return;
    }

    if (softMain && isSoftHomeUrl(url)) {
      showSoftHome(url, { fromPopState: true });
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
