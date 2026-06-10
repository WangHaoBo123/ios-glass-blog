(function () {
  const playedKey = "glass-blog-opening-played";
  const openingState = {
    isPlaying: false,
    done: Promise.resolve(false),
  };

  window.GlassBlogOpening = openingState;

  function sameSiteReferrer() {
    if (!document.referrer) return false;

    try {
      return new URL(document.referrer).origin === window.location.origin;
    } catch {
      return false;
    }
  }

  const isHomePage = /(?:^|\/)index\.html$/i.test(window.location.pathname) || /\/$/.test(window.location.pathname);
  const isArticleList = !window.location.hash || window.location.hash === "#articles";
  const navigation = performance.getEntriesByType?.("navigation")?.[0];
  const navigationType = navigation?.type || "";
  const cameFromSameSite = sameSiteReferrer();
  const hasPlayedThisSession = sessionStorage.getItem(playedKey) === "1";
  const shouldPlayForNavigation = !hasPlayedThisSession && navigationType !== "back_forward" && !cameFromSameSite;

  if (
    !isHomePage ||
    !isArticleList ||
    !shouldPlayForNavigation ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  sessionStorage.setItem(playedKey, "1");

  const overlay = document.createElement("section");
  overlay.className = "opening-screen";
  overlay.setAttribute("aria-label", "博客开幕介绍");
  overlay.innerHTML = `
    <div class="opening-copy">
      <p>Gray Glass Diary</p>
      <h2>Thoughts, projects, and quiet notes behind a frosted pane.</h2>
    </div>
  `;

  openingState.isPlaying = true;
  openingState.done = new Promise((resolve) => {
    window.setTimeout(() => {
      openingState.isPlaying = false;
      document.dispatchEvent(new CustomEvent("glassblog:opening-ended"));
      resolve(true);
    }, 1850);
  });

  document.body.append(overlay);
  document.body.classList.add("opening-active");

  window.setTimeout(() => {
    overlay.classList.add("is-dispersing");
  }, 760);

  window.setTimeout(() => {
    overlay.classList.add("is-leaving");
  }, 1320);

  window.setTimeout(() => {
    overlay.remove();
    document.body.classList.remove("opening-active");
  }, 1850);
})();
