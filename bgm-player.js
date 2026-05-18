(function () {
  const playlistUrl = "./assets/music/playlist.json?v=20260518-bgm";
  const enabledKey = "glass-blog-bgm-enabled";
  const promptClosedKey = "glass-blog-bgm-prompt-closed";
  const volumeKey = "glass-blog-bgm-volume";
  const defaultVolume = 0.42;
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
  let isReady = false;
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
    sessionStorage.setItem(promptClosedKey, "1");
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

  function updatePlayingState(isPlaying) {
    dock.classList.toggle("is-playing", isPlaying);
    toggleButton?.setAttribute("aria-pressed", String(isPlaying));
    toggleButton?.setAttribute("aria-label", isPlaying ? "暂停背景音乐" : "播放背景音乐");
    localStorage.setItem(enabledKey, isPlaying ? "1" : "0");
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

    audio.src = track.src;
    setTitle(track.title);
    setStatus(track.artist);

    try {
      await audio.play();
      updatePlayingState(true);
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

    if (localStorage.getItem(enabledKey) === "1") {
      setStatus("点击继续播放");
    }

    showPrompt();
  }

  function showPrompt() {
    if (prompt || !tracks.length || sessionStorage.getItem(promptClosedKey) === "1") return;

    prompt = document.createElement("div");
    prompt.className = "bgm-prompt";
    prompt.setAttribute("role", "dialog");
    prompt.setAttribute("aria-modal", "false");
    prompt.setAttribute("aria-labelledby", "bgm-prompt-title");
    prompt.innerHTML = `
      <div class="bgm-prompt-card">
        <span class="bgm-prompt-mark" aria-hidden="true"></span>
        <div class="bgm-prompt-copy">
          <strong id="bgm-prompt-title">播放背景音乐吗？</strong>
          <span>点击任意处关闭窗口）</span>
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
    if (!audio.ended) updatePlayingState(false);
  });
  audio.addEventListener("volumechange", () => {
    localStorage.setItem(volumeKey, String(audio.volume));
  });
  audio.addEventListener("error", () => {
    updatePlayingState(false);
    setStatus(describeAudioError());
  });

  loadPlaylist();
})();
