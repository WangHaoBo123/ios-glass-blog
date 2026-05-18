(function () {
  const playlistUrl = "./assets/music/playlist.json?v=20260518-bgm";
  const enabledKey = "glass-blog-bgm-enabled";
  const volumeKey = "glass-blog-bgm-volume";
  const defaultVolume = 0.42;

  let tracks = [];
  let currentIndex = -1;
  let isReady = false;

  const audio = new Audio();
  audio.preload = "metadata";
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

  document.body.append(dock);

  const toggleButton = dock.querySelector("[data-bgm-toggle]");
  const nextButton = dock.querySelector("[data-bgm-next]");
  const title = dock.querySelector("[data-bgm-title]");
  const status = dock.querySelector("[data-bgm-status]");

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
    } catch {
      updatePlayingState(false);
      setStatus("点击按钮开始播放");
    }
  }

  async function togglePlayback() {
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
    } catch {
      updatePlayingState(false);
      setStatus("点击按钮开始播放");
    }
  }

  async function loadPlaylist() {
    try {
      const response = await fetch(playlistUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("playlist missing");

      const data = await response.json();
      tracks = (Array.isArray(data.tracks) ? data.tracks : [])
        .map(normalizeTrack)
        .filter(Boolean);
    } catch {
      tracks = [];
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
    setStatus("点击随机播放");

    if (localStorage.getItem(enabledKey) === "1") {
      await playRandomTrack();
    }
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

  loadPlaylist();
})();
