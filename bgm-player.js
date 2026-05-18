(function () {
  const playlistUrl = "./assets/music/playlist.json?v=20260518-bgm";
  const enabledKey = "glass-blog-bgm-enabled";
  const stateKey = "glass-blog-bgm-state";
  const suppressPromptKey = "glass-blog-bgm-suppress-next-prompt-v2";
  const volumeKey = "glass-blog-bgm-volume";
  const defaultVolume = 0.42;
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
  ];

  let tracks = [];
  let currentIndex = -1;
  let currentTrack = null;
  let isReady = false;
  let isPageUnloading = false;
  let lastStateWriteSecond = -1;
  let prompt = null;

  const audio = document.createElement("audio");
  audio.className = "bgm-audio";
  audio.preload = "auto";
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
      <span data-bgm-status>正在读取歌单</span>
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

  function describeAudioError(error) {
    if (error?.name === "NotAllowedError") return "浏览器要求先点击播放";
    if (error?.name === "NotSupportedError") return "浏览器不支持这个音频";

    const mediaError = audio.error;
    if (!mediaError) return "播放失败，请再点一次";

    const messages = {
      1: "播放被中断",
      2: "音频文件加载失败",
      3: "音频解码失败",
      4: "浏览器不支持这个音频",
    };

    return messages[mediaError.code] || "播放失败，请再点一次";
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
    } catch (error) {
      updatePlayingState(false, { remember: false });
      setStatus(describeAudioError(error));
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
    const track = pickRandomTrack();
    if (!track) {
      setTitle("No music yet");
      setStatus("先配置 assets/music/playlist.json");
      return;
    }

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
      updatePlayingState(false);
      setStatus(describeAudioError(error));
    }
  }

  async function acceptPromptPlayback() {
    closePrompt();
    await playRandomTrack();
  }

  async function togglePlayback() {
    closePrompt();

    if (!isReady) {
      setStatus("歌单还在读取");
      return;
    }

    if (!tracks.length) {
      setTitle("No music yet");
      setStatus("把歌曲加入 assets/music 后再播放");
      return;
    }

    if (!audio.paused) {
      audio.pause();
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
      setStatus(tracks[currentIndex]?.artist || "正在播放");
      writePlaybackState({ playing: true });
    } catch (error) {
      updatePlayingState(false);
      setStatus(describeAudioError(error));
    }
  }

  async function loadPlaylist() {
    if (window.location.protocol === "file:") {
      tracks = fallbackTracks;
      setStatus("本地文件模式");
    } else {
      try {
        const response = await fetch(playlistUrl, { cache: "no-store" });
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
      setStatus("等待本地歌单");
      return;
    }

    setTitle(`${tracks.length} tracks`);
    setStatus(window.location.protocol === "file:" ? "点击播放本地音乐" : "点击随机播放");

    if (await restoreSavedPlayback()) {
      return;
    }

    if (localStorage.getItem(enabledKey) === "1") {
      setStatus("点击继续播放");
    }

    showPrompt();
  }

  function showPrompt() {
    if (prompt || !tracks.length || !audio.paused) return;
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
      acceptPromptPlayback();
    });
  }

  toggleButton?.addEventListener("click", togglePlayback);
  nextButton?.addEventListener("click", playRandomTrack);
  audio.addEventListener("ended", playRandomTrack);
  audio.addEventListener("pause", () => {
    if (!audio.ended && !isPageUnloading) {
      updatePlayingState(false);
      writePlaybackState({ playing: false });
    }
  });
  audio.addEventListener("play", () => {
    writePlaybackState({ playing: true });
  });
  audio.addEventListener("volumechange", () => {
    localStorage.setItem(volumeKey, String(audio.volume));
    writePlaybackState();
  });
  audio.addEventListener("error", () => {
    updatePlayingState(false);
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
    writePlaybackState({ playing: !audio.paused && !audio.ended });
    if (isPromptQuietPage()) {
      sessionStorage.setItem(suppressPromptKey, "1");
    }
  }

  window.GlassBlogBgm = {
    closePrompt,
    suppressNextPrompt() {
      sessionStorage.setItem(suppressPromptKey, "1");
      closePrompt();
    },
  };

  window.addEventListener("pagehide", () => {
    prepareForPageExit();
  });

  window.addEventListener("beforeunload", () => {
    prepareForPageExit();
  });

  loadPlaylist();
})();
