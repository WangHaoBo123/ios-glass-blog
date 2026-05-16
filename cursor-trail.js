(function () {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");

  if (reducedMotion.matches || !finePointer.matches) return;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  const trail = [];
  const maxTrailPoints = 34;
  const pointer = { x: 0, y: 0, active: false };
  const focus = { x: 0, y: 0, ready: false };
  let width = 0;
  let height = 0;
  let dpr = 1;
  let animationId = 0;
  let lastTime = performance.now();
  let paused = false;

  canvas.className = "cursor-trail-canvas";
  canvas.setAttribute("aria-hidden", "true");
  canvas.setAttribute("tabindex", "-1");
  canvas.style.pointerEvents = "none";
  document.body.appendChild(canvas);
  document.body.classList.add("has-custom-cursor");

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function pushPoint(x, y) {
    const last = trail[trail.length - 1];
    if (last && Math.hypot(x - last.x, y - last.y) < 2) return;

    trail.push({
      x,
      y,
      age: 0,
    });

    if (trail.length > maxTrailPoints) {
      trail.splice(0, trail.length - maxTrailPoints);
    }
  }

  function pruneTrail(delta) {
    for (let index = trail.length - 1; index >= 0; index -= 1) {
      trail[index].age += delta;
      if (trail[index].age > 620) {
        trail.splice(index, 1);
      }
    }
  }

  function drawRibbon() {
    if (trail.length < 2) return;

    context.globalCompositeOperation = "screen";
    context.lineCap = "round";
    context.lineJoin = "round";

    for (let index = 1; index < trail.length; index += 1) {
      const previous = trail[index - 1];
      const current = trail[index];
      const next = trail[index + 1] || current;
      const ageOpacity = Math.max(0, 1 - current.age / 620);
      const orderOpacity = index / trail.length;
      const opacity = Math.pow(ageOpacity * orderOpacity, 1.25);
      if (opacity <= 0.02) continue;

      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      const width = 3.5 + orderOpacity * 8;
      const gradient = context.createLinearGradient(previous.x, previous.y, midX, midY);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${0.05 * opacity})`);
      gradient.addColorStop(0.55, `rgba(235, 240, 247, ${0.42 * opacity})`);
      gradient.addColorStop(1, `rgba(255, 255, 255, ${0.22 * opacity})`);

      context.strokeStyle = gradient;
      context.lineWidth = width;
      context.beginPath();
      context.moveTo(previous.x, previous.y);
      context.quadraticCurveTo(current.x, current.y, midX, midY);
      context.stroke();
    }

    context.globalCompositeOperation = "source-over";
  }

  function draw(now) {
    const delta = Math.min(34, now - lastTime);
    lastTime = now;

    context.clearRect(0, 0, width, height);
    if (paused) {
      animationId = requestAnimationFrame(draw);
      return;
    }

    pruneTrail(delta);

    if (pointer.active) {
      if (!focus.ready) {
        focus.x = pointer.x;
        focus.y = pointer.y;
        focus.ready = true;
      } else {
        focus.x += (pointer.x - focus.x) * 0.22;
        focus.y += (pointer.y - focus.y) * 0.22;
      }
    }

    drawRibbon();
    animationId = requestAnimationFrame(draw);
  }

  function handlePointerMove(event) {
    if (paused) return;

    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;

    const last = trail[trail.length - 1];
    if (!last) {
      pushPoint(pointer.x, pointer.y);
      return;
    }

    const dx = pointer.x - last.x;
    const dy = pointer.y - last.y;
    const distance = Math.hypot(dx, dy);
    const steps = Math.min(8, Math.max(1, Math.floor(distance / 10)));

    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      pushPoint(last.x + dx * progress, last.y + dy * progress);
    }
  }

  function handlePointerLeave() {
    pointer.active = false;
    focus.ready = false;
  }

  function toggleCursorEffects() {
    paused = !paused;
    trail.length = 0;
    pointer.active = false;
    focus.ready = false;
    canvas.hidden = paused;
    document.body.classList.toggle("has-custom-cursor", !paused);
    context.clearRect(0, 0, width, height);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("pointerleave", handlePointerLeave, { passive: true });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      toggleCursorEffects();
    }
  });
  animationId = requestAnimationFrame(draw);

  reducedMotion.addEventListener?.("change", (event) => {
    if (!event.matches) return;
    cancelAnimationFrame(animationId);
    document.body.classList.remove("has-custom-cursor");
    canvas.remove();
  });
})();
