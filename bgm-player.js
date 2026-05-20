(function () {
  const playlistUrl = "./assets/music/playlist.json?v=20260520-perf-pass";
  const enabledKey = "glass-blog-bgm-enabled";
  const stateKey = "glass-blog-bgm-state";
  const suppressPromptKey = "glass-blog-bgm-suppress-next-prompt-v2";
  const volumeKey = "glass-blog-bgm-volume";
  const defaultVolume = 0.24;
  const restoreMaxAge = 12 * 60 * 60 * 1000;
  const promptQuietPages = new Set(["about.html", "login.html", "compose.html", "manage.html"]);
  const fallbackTracks = [
    {
      title: "The Song of Destiny",
      artist: "Sebastien Skaf · Stellar Blade",
      src: "./assets/music/the-song-of-destiny-stellar-blade-sebastien-skaf.mp3",
    },
    {
      title: "The Song of the Sirens",
      artist: "Mothervibes",
      src: "./assets/music/the-song-of-the-sirens-mothervibes.mp3",
    },
    {
      title: "The Song of the Wanderer",
      artist: "Chewie Melodies · Pealeaf",
      src: "./assets/music/the-song-of-the-wanderer-chewie-melodies-pealeaf.mp3",
    },
    {
      title: "Lily",
      artist: "seibin, Youngjee Lee, SHIFT UP",
      src: "./assets/music/lily-seibin-youngjee-lee-shift-up.mp3",
    },
    {
      title: "White Night",
      artist: "ko.yo & SHIFT UP",
      src: "./assets/music/white-night-koyo-shift-up.mp3",
    },
  ];

  let tracks = [];
  let currentIndex = -1;
  let currentTrack = null;
  let isReady = false;
  let isPageUnloading = false;
  let isUserPausing = false;
  let lastStateWriteSecond = -1;
  let prompt = null;
  let resumeOnGesture = null;
  let hasAttemptedRestore = false;
  let playlistLoadPromise = null;

  const audio = document.createElement("audio");
  audio.className = "bgm-audio";
  audio.preload = "metadata";
  audio.setAttribute("playsinline", "");
  audio.volume = Number(localStorage.getItem(volumeKey)) || defaultVolume;

  const dock = document.createElement("aside");
  dock.className = "bgm-dock";
  dock.setAttribute("aria-label", "背景音乐播放器");
  dock.innerHTML = `
    <button class="bgm-toggle" type="button" data-bgm-toggle aria-label="播放背景音乐" aria-pressed="false">
      <span class="bgm-mark" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </span>
    </button>
    <div class="bgm-copy">
      <strong data-bgm-title>Background music</strong>
      <span data-bgm-status>点击左下角播放音乐</span>
    </div>
    <div class="bgm-wave" aria-hidden="true">
      <span style="--wave-index: 0"></span>
      <span style="--wave-index: 1"></span>
      <span style="--wave-index: 2"></span>
      <span style="--wave-index: 3"></span>
      <span style="--wave-index: 4"></span>
      <span style="--wave-index: 5"></span>
      <span style="--wave-index: 6"></span>
      <span style="--wave-index: 7"></span>
      <span style="--wave-index: 8"></span>
    </div>
    <button class="bgm-next" type="button" data-bgm-next aria-label="随机下一首" disabled></button>
  `;

  document.body.append(dock, audio);

  const toggleButton = dock.querySelector("[data-bgm-toggle]");
  const nextButton = dock.querySelector("[data-bgm-next]");
  const title = dock.querySelector("[data-bgm-title]");
  const status = dock.querySelector("[data-bgm-status]");

  function closePrompt() {
    if (!prompt) return;

    prompt.classList.add("is-leaving");
    window.setTimeout(() => {
      prompt?.remove();
      prompt = null;
    }, 240);
  }

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function setTitle(message) {
    if (title) title.textContent = message;
  }

  function currentPageName() {
    return (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  }

  function isHomePage() {
    return currentPageName() === "index.html";
  }

  function isPromptQuietPage() {
    return promptQuietPages.has(currentPageName()) || document.body.classList.contains("is-soft-page");
  }

  function shouldUseNetworkCache() {
    const host = String(window.location.hostname || "").toLowerCase();
    return Boolean(host) && host !== "localhost" && host !== "127.0.0.1";
  }

  function fileTitle(src) {
    const clean = String(src || "").split("/").pop()?.replace(/\.[a-z0-9]+$/i, "") || "Untitled track";
    return decodeURIComponent(clean).replaceAll("-", " ").replaceAll("_", " ");
  }

  function normalizeTrack(track) {
    if (!track || typeof track !== "object" || !track.src) return null;

    return {
      title: String(track.title || fileTitle(track.src)),
      artist: String(track.artist || "Local playlist"),
      src: String(track.src),
    };
  }

  function resolveSrc(src) {
    try {
      return new URL(src, window.location.href).href;
    } catch {
      return String(src || "");
    }
  }

  function sameSrc(left, right) {
    return resolveSrc(left) === resolveSrc(right);
  }

  function findTrackBySrc(src) {
    return tracks.find((track) => sameSrc(track.src, src)) || null;
  }

  function setCurrentTrack(track) {
    currentTrack = track || null;
    currentIndex = currentTrack ? tracks.findIndex((item) => sameSrc(item.src, currentTrack.src)) : -1;
  }

  function describeAudioError(error) {
    if (error?.name === "NotAllowedError") return "浏览器需要你先点击一下页面";
    if (error?.name === "NotSupportedError") return "当前浏览器不支持这段音频";

    const mediaError = audio.error;
    if (!mediaError) return "播放失败，请再试一次";

    const messages = {
      1: "播放被中断了",
      2: "音频文件加载失败",
      3: "音频解码失败",
      4: "当前浏览器不支持这段音频",
    };

    return messages[mediaError.code] || "播放失败，请再试一次";
  }

  function readPlaybackState() {
    try {
      const state = JSON.parse(sessionStorage.getItem(stateKey) || "null");
      if (!state || typeof state !== "object" || !state.src) return null;
      if (Date.now() - Number(state.savedAt || 0) > restoreMaxAge) return null;
      return state;
    } catch {
      sessionStorage.removeItem(stateKey);
      return null;
    }
  }

  function writePlaybackState(overrides = {}) {
    const track = currentTrack || findTrackBySrc(audio.getAttribute("src") || audio.src);
    if (!track && !audio.src) return;

    const state = {
      src: track?.src || audio.getAttribute("src") || audio.src,
      title: track?.title || title?.textContent || "Background music",
      artist: track?.artist || status?.textContent || "Local playlist",
      currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      volume: audio.volume,
      playing: !audio.paused && !audio.ended,
      savedAt: Date.now(),
      ...overrides,
    };

    sessionStorage.setItem(stateKey, JSON.stringify(state));
  }

  function restorePlaybackTime(time) {
    const savedTime = Number(time);
    if (!Number.isFinite(savedTime) || savedTime <= 0) return;

    const applyTime = () => {
      try {
        const maxTime = Number.isFinite(audio.duration) && audio.duration > 1
          ? Math.max(0, audio.duration - 0.5)
          : savedTime;
        audio.currentTime = Math.min(savedTime, maxTime);
      } catch {
        // Some browsers reject early currentTime writes until metadata is ready.
      }
    };

    if (audio.readyState >= 1) {
      applyTime();
      return;
    }

    audio.addEventListener("loadedmetadata", applyTime, { once: true });
  }

  function cancelGestureResume() {
    if (!resumeOnGesture) return;

    for (const eventName of ["pointerdown", "keydown", "touchstart"]) {
      window.removeEventListener(eventName, resumeOnGesture, true);
    }
    resumeOnGesture = null;
  }

  function scheduleGestureResume() {
    if (resumeOnGesture) return;

    resumeOnGesture = async (event) => {
      if (event?.target?.closest?.(".bgm-dock, .bgm-prompt")) return;

      cancelGestureResume();
      if (!audio.src || !audio.paused || localStorage.getItem(enabledKey) !== "1") return;

      try {
        await audio.play();
        updatePlayingState(true);
        setStatus(currentTrack?.artist || "正在继续播放");
        writePlaybackState({ playing: true });
      } catch (error) {
        setStatus(describeAudioError(error));
        writePlaybackState({ playing: true });
        scheduleGestureResume();
      }
    };

    for (const eventName of ["pointerdown", "keydown", "touchstart"]) {
      window.addEventListener(eventName, resumeOnGesture, true);
    }
  }

  async function restoreSavedPlayback() {
    const state = readPlaybackState();
    if (!state?.playing || localStorage.getItem(enabledKey) !== "1") return false;

    const track = findTrackBySrc(state.src) || normalizeTrack(state);
    if (!track) return false;

    setCurrentTrack(track);
    audio.src = track.src;
    if (Number.isFinite(Number(state.volume))) {
      audio.volume = Math.min(1, Math.max(0, Number(state.volume)));
    }
    setTitle(track.title);
    setStatus(track.artist || "正在继续播放");
    restorePlaybackTime(state.currentTime);

    try {
      await audio.play();
      updatePlayingState(true);
      writePlaybackState({ playing: true });
      cancelGestureResume();
    } catch (error) {
      updatePlayingState(false, { remember: false });
      localStorage.setItem(enabledKey, "1");
      setStatus(error?.name === "NotAllowedError" ? "点击页面继续播放" : describeAudioError(error));
      writePlaybackState({ playing: true });
      scheduleGestureResume();
    }

    return true;
  }

  function updatePlayingState(isPlaying, options = {}) {
    dock.classList.toggle("is-playing", isPlaying);
    toggleButton?.setAttribute("aria-pressed", String(isPlaying));
    toggleButton?.setAttribute("aria-label", isPlaying ? "暂停背景音乐" : "播放背景音乐");
    if (options.remember !== false) {
      localStorage.setItem(enabledKey, isPlaying ? "1" : "0");
    }
  }

  async function ensurePlaylistLoaded(options = {}) {
    if (!playlistLoadPromise) {
      setStatus("正在读取歌单");

      playlistLoadPromise = (async () => {
        if (window.location.protocol === "file:") {
          tracks = fallbackTracks;
          setStatus("本地文件模式");
        } else {
          try {
            const response = await fetch(playlistUrl, { cache: shouldUseNetworkCache() ? "default" : "no-store" });
            if (!response.ok) throw new Error("playlist missing");

            const data = await response.json();
            tracks = (Array.isArray(data.tracks) ? data.tracks : [])
              .map(normalizeTrack)
              .filter(Boolean);
          } catch {
            tracks = fallbackTracks;
          }
        }

        isReady = true;
        dock.classList.add("is-ready");
        if (nextButton) nextButton.disabled = tracks.length < 2;

        if (!tracks.length) {
          setTitle("No music yet");
          setStatus("还没有可用音乐");
          return tracks;
        }

        setTitle(`${tracks.length} tracks`);
        setStatus(window.location.protocol === "file:" ? "点击播放本地音乐" : "点击播放背景音乐");
        return tracks;
      })();
    }

    await playlistLoadPromise;
    if (!tracks.length) return tracks;

    if (!hasAttemptedRestore && options.restore !== false) {
      hasAttemptedRestore = true;
      if (await restoreSavedPlayback()) {
        return tracks;
      }
    }

    if (localStorage.getItem(enabledKey) === "1") {
      setStatus("点击继续播放");
    }

    if (options.showPrompt) {
      showPrompt();
    }

    return tracks;
  }

  function pickRandomTrack() {
    if (!tracks.length) return null;
    if (tracks.length === 1) {
      currentIndex = 0;
      return tracks[0];
    }

    let nextIndex = currentIndex;
    while (nextIndex === currentIndex) {
      nextIndex = Math.floor(Math.random() * tracks.length);
    }
    currentIndex = nextIndex;
    return tracks[currentIndex];
  }

  async function playRandomTrack() {
    if (!tracks.length) {
      setTitle("No music yet");
      setStatus("先把音乐放进 assets/music");
      return;
    }

    const track = pickRandomTrack();
    if (!track) return;

    setCurrentTrack(track);
    audio.src = track.src;
    setTitle(track.title);
    setStatus(track.artist);
    writePlaybackState({ playing: false, currentTime: 0 });

    try {
      await audio.play();
      updatePlayingState(true);
      writePlaybackState({ playing: true });
    } catch (error) {
      updatePlayingState(false, { remember: false });
      if (error?.name === "NotAllowedError") {
        localStorage.setItem(enabledKey, "1");
        writePlaybackState({ playing: true });
        scheduleGestureResume();
      }
      setStatus(describeAudioError(error));
    }
  }

  async function acceptPromptPlayback() {
    closePrompt();
    await ensurePlaylistLoaded({ showPrompt: false, restore: false });
    await playRandomTrack();
  }

  async function togglePlayback() {
    closePrompt();

    if (!isReady) {
      await ensurePlaylistLoaded({ showPrompt: false });
    }

    if (!tracks.length) {
      setTitle("No music yet");
      setStatus("先把音乐放进 assets/music");
      return;
    }

    if (!audio.paused) {
      isUserPausing = true;
      audio.pause();
      cancelGestureResume();
      updatePlayingState(false);
      setStatus("已暂停");
      return;
    }

    if (!audio.src) {
      await playRandomTrack();
      return;
    }

    try {
      await audio.play();
      updatePlayingState(true);
      setStatus(currentTrack?.artist || "正在播放");
      writePlaybackState({ playing: true });
    } catch (error) {
      updatePlayingState(false, { remember: false });
      if (error?.name === "NotAllowedError") {
        localStorage.setItem(enabledKey, "1");
        writePlaybackState({ playing: true });
        scheduleGestureResume();
      }
      setStatus(describeAudioError(error));
    }
  }

  function showPrompt() {
    if (prompt || !audio.paused) return;
    if (isPromptQuietPage()) {
      closePrompt();
      return;
    }
    if (!isHomePage()) return;
    if (sessionStorage.getItem(suppressPromptKey) === "1") {
      sessionStorage.removeItem(suppressPromptKey);
      return;
    }

    prompt = document.createElement("div");
    prompt.className = "bgm-prompt";
    prompt.setAttribute("role", "dialog");
    prompt.setAttribute("aria-modal", "false");
    prompt.setAttribute("aria-labelledby", "bgm-prompt-title");
    prompt.innerHTML = `
      <div class="bgm-prompt-card">
        <span class="bgm-prompt-mark" aria-hidden="true">music</span>
        <div class="bgm-prompt-copy">
          <strong id="bgm-prompt-title">播放背景音乐吗？</strong>
          <span>点击任意处关闭窗口</span>
        </div>
        <button class="bgm-prompt-play" type="button" data-bgm-prompt-play>播放</button>
      </div>
    `;

    document.body.append(prompt);
    window.requestAnimationFrame(() => prompt?.classList.add("is-visible"));

    prompt.addEventListener("click", closePrompt);
    prompt.querySelector("[data-bgm-prompt-play]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      void acceptPromptPlayback();
    });
  }

  function initPlaylistBoot() {
    setTitle("Background music");

    const savedState = readPlaybackState();
    const shouldRestoreImmediately = localStorage.getItem(enabledKey) === "1" || Boolean(savedState?.playing);

    if (shouldRestoreImmediately) {
      setStatus("准备恢复播放");
      void ensurePlaylistLoaded({ showPrompt: false });
      return;
    }

    setStatus("点击左下角播放音乐");

    if (!isHomePage() || isPromptQuietPage()) {
      return;
    }

    const deferredPrompt = () => showPrompt();
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(deferredPrompt, { timeout: 1800 });
      return;
    }

    window.setTimeout(deferredPrompt, 900);
  }

  toggleButton?.addEventListener("click", () => {
    void togglePlayback();
  });
  nextButton?.addEventListener("click", async () => {
    await ensurePlaylistLoaded({ showPrompt: false });
    await playRandomTrack();
  });
  audio.addEventListener("ended", () => {
    void playRandomTrack();
  });
  audio.addEventListener("pause", () => {
    if (isUserPausing) {
      isUserPausing = false;
      updatePlayingState(false);
      writePlaybackState({ playing: false });
      return;
    }

    if (!audio.ended && !isPageUnloading) {
      if (localStorage.getItem(enabledKey) === "1") {
        if (document.visibilityState !== "hidden") {
          setStatus("点击页面继续播放");
          scheduleGestureResume();
        }
        writePlaybackState({ playing: true });
        return;
      }

      cancelGestureResume();
      updatePlayingState(false);
      writePlaybackState({ playing: false });
    }
  });
  audio.addEventListener("play", () => {
    cancelGestureResume();
    writePlaybackState({ playing: true });
  });
  audio.addEventListener("volumechange", () => {
    localStorage.setItem(volumeKey, String(audio.volume));
    writePlaybackState();
  });
  audio.addEventListener("error", () => {
    updatePlayingState(false, { remember: false });
    setStatus(describeAudioError());
  });
  audio.addEventListener("timeupdate", () => {
    const second = Math.floor(audio.currentTime);
    if (second > 0 && second % 3 === 0 && second !== lastStateWriteSecond) {
      lastStateWriteSecond = second;
      writePlaybackState();
    }
  });

  function prepareForPageExit() {
    isPageUnloading = true;
    writePlaybackState({
      playing: localStorage.getItem(enabledKey) === "1" && (!audio.ended || Boolean(resumeOnGesture)),
    });
    if (isPromptQuietPage()) {
      sessionStorage.setItem(suppressPromptKey, "1");
    }
  }

  function rememberActivePlaybackBeforeHidden() {
    if (document.visibilityState !== "hidden") return;
    if (localStorage.getItem(enabledKey) !== "1" || audio.ended) return;

    writePlaybackState({ playing: true });
  }

  window.GlassBlogBgm = {
    closePrompt,
    suppressNextPrompt() {
      sessionStorage.setItem(suppressPromptKey, "1");
      closePrompt();
    },
  };

  window.addEventListener("pagehide", prepareForPageExit);
  window.addEventListener("beforeunload", prepareForPageExit);
  document.addEventListener("visibilitychange", rememberActivePlaybackBeforeHidden);

  initPlaylistBoot();
})();
