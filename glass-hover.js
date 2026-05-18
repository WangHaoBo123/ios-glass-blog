(function () {
  const selector = [
    ".featured-post",
    ".post-card",
    ".status-panel",
    ".reader-card",
    ".archive-panel",
    ".tag-cloud-panel",
    ".tag-result-panel",
    ".note-panel",
    ".about-panel",
    ".compose-panel",
    ".profile-dock",
    ".reader-toc",
  ].join(",");

  if (!window.matchMedia("(pointer: fine)").matches) return;

  let activePanel = null;
  let nextPoint = null;
  let rafId = 0;

  function findPanel(target) {
    return target instanceof Element ? target.closest(selector) : null;
  }

  function applyGlow() {
    rafId = 0;
    if (!activePanel || !nextPoint) return;

    const rect = activePanel.getBoundingClientRect();
    const x = nextPoint.clientX - rect.left;
    const y = nextPoint.clientY - rect.top;

    activePanel.style.setProperty("--glow-x", `${x}px`);
    activePanel.style.setProperty("--glow-y", `${y}px`);
  }

  document.addEventListener("pointerover", (event) => {
    const panel = findPanel(event.target);
    if (!panel) return;

    activePanel = panel;
    activePanel.classList.add("is-glow-hovered");
  });

  document.addEventListener("pointermove", (event) => {
    const panel = findPanel(event.target);
    if (!panel) return;

    if (activePanel && activePanel !== panel) {
      activePanel.classList.remove("is-glow-hovered");
    }

    activePanel = panel;
    activePanel.classList.add("is-glow-hovered");
    nextPoint = event;

    if (!rafId) {
      rafId = window.requestAnimationFrame(applyGlow);
    }
  });

  document.addEventListener("pointerout", (event) => {
    const panel = findPanel(event.target);
    if (!panel) return;
    if (event.relatedTarget instanceof Node && panel.contains(event.relatedTarget)) return;

    panel.classList.remove("is-glow-hovered");
    if (activePanel === panel) {
      activePanel = null;
      nextPoint = null;
    }
  });
})();
