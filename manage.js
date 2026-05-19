if (!window.GlassBlogAuth?.requireAuthor()) {
  throw new Error("Author sign-in required");
}

const managerSearch = document.querySelector("[data-manager-search]");
const managerList = document.querySelector("[data-manager-list]");
const managerCount = document.querySelector("[data-manager-count]");
const managerHidden = document.querySelector("[data-manager-hidden]");
const managerEditor = document.querySelector("[data-manager-editor]");
const managerEmpty = document.querySelector("[data-manager-empty]");
const managerEditTitle = document.querySelector("[data-manager-edit-title]");
const managerSource = document.querySelector("[data-manager-source]");
const managerStatus = document.querySelector("[data-manager-status]");
const categoryOptions = document.querySelector("#manage-category-options");
const titleInput = document.querySelector("[data-manage-title]");
const slugInput = document.querySelector("[data-manage-slug]");
const dateInput = document.querySelector("[data-manage-date]");
const categoryInput = document.querySelector("[data-manage-category]");
const tagsInput = document.querySelector("[data-manage-tags]");
const summaryInput = document.querySelector("[data-manage-summary]");
const contentInput = document.querySelector("[data-manage-content]");
const saveButton = document.querySelector("[data-save-managed-post]");
const openButton = document.querySelector("[data-open-managed-post]");
const deleteButton = document.querySelector("[data-delete-managed-post]");
const cleanEmbeddedImagesButton = document.querySelector("[data-clean-embedded-images]");
const importImageButton = document.querySelector("[data-manage-import-image]");
const connectAssetsButton = document.querySelector("[data-manage-connect-assets]");
const imageInput = document.querySelector("[data-manage-image-input]");
const mediaFlow = document.querySelector("[data-manage-media-flow]");
const editorCanvas = document.querySelector("[data-manage-editor-canvas]");
const markdownButtons = [...document.querySelectorAll("[data-manage-md]")];
const highlightColorButtons = [...document.querySelectorAll("[data-manage-highlight-color]")];
const emojiToggleButton = document.querySelector("[data-manage-emoji-toggle]");
const ambient = document.querySelector("[data-ambient]");
const ambientBarA = document.querySelector('[data-ambient-bar="a"]');
const ambientBarB = document.querySelector('[data-ambient-bar="b"]');

const publishedPostsKey = "glass-blog-published-posts";
const hiddenPostsKey = "glass-blog-hidden-posts";
const draftKey = "glass-blog-compose-draft";
const draftsKey = "glass-blog-saved-drafts";
const summaryMaxLength = 80;
const categoryLabels = {
  tech: "技术",
  life: "生活",
  notes: "短札",
};

const fallbackPosts = [
  {
    slug: "22233311",
    title: "五月里一个普通周末",
    date: "2026-05-17",
    category: "生活",
    summary: "没有安排什么特别的事，只是出门、吃饭、回家、发呆，却比想象中更像在过日子。",
    tags: ["周末", "生活"],
    content: `# 五月里一个普通周末

上周末其实没做什么特别的事。

没有出远门，也没有见很多人。上午醒得不算早，窗帘拉开以后，房间里那种已经进夏天一点点的亮度让我发了一会儿呆。洗漱、烧水、找衣服、出门，整个过程都很普通，普通到几乎没什么可记的。可就是这种没什么大事发生的两天，反而让我觉得自己真的在过日子。`,
  },
  {
    slug: "long-feature-test",
    title: "一整天没有消息提醒之后",
    date: "2026-05-17",
    category: "生活",
    summary: "把通知关掉一天之后，我注意到很多原本会被忽略的小事：风、路、饭桌上的沉默，还有自己真正想做什么。",
    tags: ["生活", "独处", "日常"],
    content: `# 一整天没有消息提醒之后

前几天我试着把通知关掉了一整天。

不是完全失联，也不是突然要过什么很极端的慢生活。只是把那些会突然亮起来的小红点、横幅提示、震动和提示音暂时都按了下去。刚开始其实不太习惯，手还是会下意识去摸手机。`,
  },
  {
    slug: "static-blog-system",
    title: "晚饭后出去走了二十分钟",
    date: "2026-05-16",
    category: "生活",
    summary: "最近重新把晚饭后的散步捡了回来，走得不快，但整个人会慢慢安静下来。",
    tags: ["散步", "生活", "日常"],
    featured: true,
    content: `# 晚饭后出去走了二十分钟

最近重新把晚饭后的散步捡了回来。

说是散步，其实也不是什么很有仪式感的事。吃完饭，把碗放进水池里，拿上钥匙，穿双最普通的鞋，下楼，沿着小区外面那条熟悉得有点无聊的路慢慢走一圈。`,
  },
  {
    slug: "quiet-workflow",
    title: "最近喜欢的安静工作流",
    date: "2026-05-12",
    category: "生活",
    summary: "把一天拆成几个安静的小段，少切换，少说服自己，反而更容易把事情做完。",
    tags: ["生活", "节奏"],
    content: `# 最近喜欢的安静工作流

我最近很喜欢把一天拆成几个安静的小段。

不是那种写得很满的时间表，也不是严格到有点紧张的自律游戏。更像是给自己留几个边界清楚的小房间：这一段只做这一件事，做完再换下一件。`,
  },
  {
    slug: "ui-cleanup",
    title: "把桌面收干净之后，心里也松了一点",
    date: "2026-05-03",
    category: "生活",
    summary: "最近花了一个晚上整理桌面和房间，没解决什么大问题，但那种松动感很真实。",
    tags: ["房间", "整理", "生活"],
    content: `# 把桌面收干净之后，心里也松了一点

前几天晚上，我花了点时间整理桌面。

不是大扫除那种阵仗，也没有突然决定做一个全新的自己。只是坐在那里，看着桌上那些慢慢堆起来的小东西：喝了一半的水杯、已经不用的便签、几根线、两支写不出字的笔。`,
  },
  {
    slug: "dont-optimize-too-early",
    title: "短札：别急着给生活下结论",
    date: "2026-04-28",
    category: "短札",
    summary: "很多事情不是没有答案，只是还没走到该明白的时候。",
    tags: ["短札", "生活"],
    content: `# 短札：别急着给生活下结论

很多事情不是没有答案，只是还没走到该明白的时候。

我们太容易在状态不好的那几天里，替一整段生活下结论。一次不顺，就怀疑是不是方向错了；一阵提不起劲，就觉得自己是不是变了。`,
  },
];

let posts = [];
let staticPostsCache = [];
let selectedSlug = "";
let mediaEditor = null;
let legacyImages = [];
let activeHighlightColor = highlightColorButtons.find((button) => button.classList.contains("is-active"))?.dataset.manageHighlightColor || "#ffd966";
const emojiGroups = [
  { label: "常用", items: ["😊", "😂", "🤣", "😍", "🥰", "😎", "😭", "😅", "👍", "👏", "🙏", "💪"] },
  { label: "心情", items: ["✨", "🌙", "☕", "🍃", "🔥", "💡", "📌", "✅", "⚠️", "🎯", "📝", "📚"] },
  { label: "装饰", items: ["❤️", "🖤", "🤍", "⭐", "🌟", "💫", "🌈", "❄️", "🌊", "🌿", "🎧", "🧊"] },
];
let emojiPanel = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanHighlightColor(value) {
  const match = String(value || "").trim().match(/^#?([0-9a-fA-F]{6})$/);
  return match ? `#${match[1].toLowerCase()}` : "#ffd966";
}

function clampSummary(value, maxLength = summaryMaxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd();
}

function stripMarkdown(markdown) {
  return String(markdown || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/==\{#[0-9a-fA-F]{6}\}([\s\S]+?)==/g, "$1")
    .replace(/==([\s\S]+?)==/g, "$1")
    .replace(/[#>*_`[\]()\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readingMinutes(content) {
  return Math.max(1, Math.ceil(stripMarkdown(content).length / 420));
}

function readJsonStorage(key, fallback = []) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    return Array.isArray(saved) ? saved : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    setStatus("本地存储空间不够，图片可能仍然太大。挂到 GitHub 时建议把图片放进 assets 文件夹。");
  }
}

function readPublishedPosts() {
  return readJsonStorage(publishedPostsKey);
}

function writePublishedPosts(nextPosts) {
  writeJsonStorage(publishedPostsKey, nextPosts);
}

function readHiddenPosts() {
  return readJsonStorage(hiddenPostsKey);
}

function writeHiddenPosts(slugs) {
  writeJsonStorage(hiddenPostsKey, slugs);
}

function normalizePost(post, source = "static") {
  const category = (categoryLabels[post.category] || post.category || "文章").trim();
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const content = post.content || "";

  return {
    ...post,
    category,
    tags,
    content,
    images: Array.isArray(post.images) ? post.images : [],
    source: post.source || source,
    minutes: readingMinutes(content),
    searchText: `${post.title} ${post.summary} ${category} ${tags.join(" ")} ${stripMarkdown(content)}`.toLowerCase(),
  };
}

async function fetchText(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Cannot load ${path}`);
  return response.text();
}

async function loadStaticPosts() {
  try {
    const response = await fetch("./posts/index.json", { cache: "no-store" });
    if (!response.ok) throw new Error("posts index missing");
    const index = await response.json();
    const loaded = await Promise.all(
      index.posts.map(async (post) => {
        const content = await fetchText(post.file);
        return normalizePost({ ...post, content }, "static");
      }),
    );

    return loaded;
  } catch {
    return fallbackPosts.map((post) => normalizePost(post, "static"));
  }
}

function loadLocalPosts() {
  return readPublishedPosts().map((post) => normalizePost(post, "local"));
}

function mergePosts(staticPosts, localPosts) {
  const hidden = new Set(readHiddenPosts());
  const bySlug = new Map();

  staticPosts.forEach((post) => {
    if (!hidden.has(post.slug)) {
      bySlug.set(post.slug, post);
    }
  });

  localPosts.forEach((post) => {
    if (!hidden.has(post.slug)) {
      bySlug.set(post.slug, { ...bySlug.get(post.slug), ...post, source: post.source || "local" });
    }
  });

  return [...bySlug.values()].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function setStatus(message) {
  if (managerStatus) managerStatus.textContent = message;
}

function formatDate(value) {
  return value ? value.replaceAll("-", ".") : "";
}

function hasEmbeddedImages(content) {
  return String(content || "").includes("](data:image/");
}

function stripEmbeddedImages(content) {
  return String(content || "")
    .replace(/\n{0,2}!\[[^\]]*]\(data:image\/[^)]+\)\n{0,2}/g, "\n\n> 旧版内嵌图片已清理，请用“图片目录”重新导入为文件路径。\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanOldEmbeddedImages() {
  const confirmed = window.confirm("这会移除旧版保存在浏览器缓存里的 base64 图片，让管理页恢复流畅。正文文字会保留，图片需要用新方案重新导入。继续吗？");
  if (!confirmed) return;

  let cleaned = 0;
  const postsWithEmbeddedImages = readPublishedPosts();
  const nextPosts = postsWithEmbeddedImages.map((post) => {
    if (!hasEmbeddedImages(post.content)) return post;
    cleaned += 1;
    return {
      ...post,
      content: stripEmbeddedImages(post.content),
      images: [],
      updatedAt: new Date().toISOString(),
    };
  });
  writePublishedPosts(nextPosts);

  const savedDrafts = readJsonStorage(draftsKey);
  const nextDrafts = savedDrafts.map((draft) => {
    if (!hasEmbeddedImages(draft.content)) return draft;
    cleaned += 1;
    return {
      ...draft,
      content: stripEmbeddedImages(draft.content),
      images: [],
      updatedAt: new Date().toISOString(),
    };
  });
  writeJsonStorage(draftsKey, nextDrafts);

  try {
    const currentDraft = JSON.parse(localStorage.getItem(draftKey) || "null");
    if (currentDraft && hasEmbeddedImages(currentDraft.content)) {
      cleaned += 1;
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          ...currentDraft,
          content: stripEmbeddedImages(currentDraft.content),
          images: [],
        }),
      );
    }
  } catch {
    localStorage.removeItem(draftKey);
  }

  setStatus(cleaned ? `已清理 ${cleaned} 处旧版内嵌图片缓存` : "没有发现旧版内嵌图片缓存");
  init();
}

async function importImages(files) {
  await mediaEditor?.importFiles(files);
}

function wrapSelection(before, after = before, fallback = "文字") {
  mediaEditor?.wrapSelection(before, after, fallback);
}

function insertPlainText(text) {
  const value = String(text || "");
  if (!value) return;

  const textarea = mediaEditor?.activeTextArea?.();
  if (textarea && mediaEditor?.replaceText) {
    const index = Number(textarea.dataset.blockIndex);
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${textarea.value.slice(0, start)}${value}${textarea.value.slice(end)}`;
    const cursor = start + value.length;
    mediaEditor.replaceText(index, next, cursor, cursor);
    return;
  }

  const start = contentInput.selectionStart ?? contentInput.value.length;
  const end = contentInput.selectionEnd ?? start;
  contentInput.setRangeText(value, start, end, "end");
  contentInput.focus({ preventScroll: true });
}

function toggleWrap(before, after = before, fallback = "文字") {
  mediaEditor?.toggleWrap(before, after, fallback);
}

function transformSelectedLines(transformLine, fallback = "新的段落") {
  mediaEditor?.transformSelectedLines(transformLine, fallback);
}

function setHeading(level) {
  transformSelectedLines((line) => {
    const text = line.replace(/^\s{0,3}#{1,6}\s+/, "").trimStart();
    return `${"#".repeat(level)} ${text || "小标题"}`;
  }, "小标题");
}

function setLinePrefix(prefix, stripPattern, fallback) {
  transformSelectedLines((line) => {
    const text = line.replace(stripPattern, "").trimStart();
    return `${prefix}${text || fallback}`;
  }, fallback);
}

function insertMarkdown(command) {
  const actions = {
    h1: () => setHeading(1),
    h2: () => setHeading(2),
    h3: () => setHeading(3),
    h4: () => setHeading(4),
    bold: () => toggleWrap("**", "**", "加粗文字"),
    italic: () => toggleWrap("*", "*", "斜体文字"),
    highlight: () => mediaEditor?.applyHighlight(cleanHighlightColor(activeHighlightColor), "重点文字"),
    quote: () => setLinePrefix("> ", /^\s{0,3}>\s?/, "引用内容"),
    list: () => setLinePrefix("- ", /^\s{0,3}[-*+]\s+/, "列表项"),
    codeblock: () => wrapSelection("```\n", "\n```", "console.log(\"hello blog\");"),
    link: () => wrapSelection("[", "](https://example.com)", "链接文字"),
    emoji: () => toggleEmojiPanel(),
  };

  if (!actions[command]) return false;
  actions[command]();
  return true;
}

function createEmojiPanel() {
  if (emojiPanel) return emojiPanel;

  emojiPanel = document.createElement("div");
  emojiPanel.className = "emoji-panel";
  emojiPanel.hidden = true;
  emojiPanel.setAttribute("data-manage-emoji-panel", "");
  emojiPanel.innerHTML = emojiGroups
    .map(
      (group) => `
        <section class="emoji-group" aria-label="${escapeHtml(group.label)}">
          <span>${escapeHtml(group.label)}</span>
          <div>
            ${group.items.map((emoji) => `<button type="button" data-manage-emoji="${escapeHtml(emoji)}" aria-label="插入 ${escapeHtml(emoji)}">${escapeHtml(emoji)}</button>`).join("")}
          </div>
        </section>
      `,
    )
    .join("");

  emojiToggleButton?.after(emojiPanel);
  return emojiPanel;
}

function closeEmojiPanel() {
  if (!emojiPanel) return;
  emojiPanel.hidden = true;
  emojiToggleButton?.classList.remove("is-active");
  emojiToggleButton?.setAttribute("aria-expanded", "false");
}

function toggleEmojiPanel() {
  const panel = createEmojiPanel();
  const shouldOpen = panel.hidden;
  panel.hidden = !shouldOpen;
  emojiToggleButton?.classList.toggle("is-active", shouldOpen);
  emojiToggleButton?.setAttribute("aria-expanded", String(shouldOpen));
}

function shortcutDigit(event) {
  const digitFromCode = event.code?.match(/^Digit([1-4])$/)?.[1];
  return digitFromCode || (["1", "2", "3", "4"].includes(event.key) ? event.key : "");
}

function shortcutCommandFromEvent(event) {
  if (!(event.ctrlKey || event.metaKey)) return "";

  const key = event.key.toLowerCase();

  if (!event.altKey && !event.shiftKey) {
    if (key === "b") return "bold";
    if (key === "i") return "italic";
    if (key === "k") return "link";
  }

  if (event.altKey && !event.shiftKey) {
    const digit = shortcutDigit(event);
    if (digit) return `h${digit}`;
    if (key === "q") return "quote";
    if (key === "l") return "list";
    if (key === "c") return "codeblock";
  }

  if (!event.altKey && event.shiftKey && key === "h") {
    return "highlight";
  }

  return "";
}

function isEditorShortcutTarget(target) {
  if (!target) return true;
  if (target === document.body || target === document.documentElement) return true;
  if (target.closest?.("[data-manage-media-flow], .block-toolbar")) return true;
  if (target === contentInput) return true;

  const editable = target.closest?.("input, textarea, select, [contenteditable='true']");
  return !editable;
}

function announceShortcut(command) {
  const button = document.querySelector(`[data-manage-md="${command}"]`);
  const label = button?.dataset.tooltip || "格式";
  const shortcut = button?.dataset.shortcut;
  setStatus(shortcut ? `${label}已应用（${shortcut}）` : `${label}已应用`);
}

function updateCategoryOptions() {
  if (!categoryOptions) return;
  const categories = [...new Set(posts.map((post) => post.category).filter(Boolean))];
  categoryOptions.innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}"></option>`).join("");
}

function getFilteredPosts() {
  const query = managerSearch?.value.trim().toLowerCase() || "";
  return query ? posts.filter((post) => post.searchText.includes(query)) : posts;
}

function renderList() {
  const filtered = getFilteredPosts();
  const hiddenCount = readHiddenPosts().length;

  if (managerCount) managerCount.textContent = `${posts.length} 篇文章`;
  if (managerHidden) managerHidden.textContent = `${hiddenCount} 篇隐藏`;
  if (!managerList) return;

  if (!filtered.length) {
    managerList.innerHTML = `<p class="draft-empty">没有找到文章。</p>`;
    return;
  }

  managerList.innerHTML = filtered
    .map(
      (post) => `
        <article class="manager-post-row${post.slug === selectedSlug ? " is-active" : ""}">
          <button type="button" data-select-post="${escapeHtml(post.slug)}">
            <strong>${escapeHtml(post.title)}</strong>
            <span>${escapeHtml(formatDate(post.date))} · ${escapeHtml(post.category)} · ${post.minutes} 分钟</span>
          </button>
          <span>${post.source === "local" ? "本地" : "文件"}</span>
        </article>
      `,
    )
    .join("");
}

function selectedPost() {
  return posts.find((post) => post.slug === selectedSlug);
}

function showEditor(post) {
  if (!post) {
    if (managerEditor) managerEditor.hidden = true;
    if (managerEmpty) managerEmpty.hidden = false;
    return;
  }

  if (managerEditor) managerEditor.hidden = false;
  if (managerEmpty) managerEmpty.hidden = true;
  if (managerEditTitle) managerEditTitle.textContent = post.title;
  if (managerSource) managerSource.textContent = post.source === "local" ? "本地文章" : "静态文件";

  titleInput.value = post.title || "";
  if (slugInput) slugInput.value = post.slug || "";
  dateInput.value = post.date || "";
  categoryInput.value = post.category || "";
  tagsInput.value = post.tags.join(", ");
  summaryInput.value = clampSummary(post.summary);
  contentInput.value = post.content || "";
  legacyImages = Array.isArray(post.images) ? post.images.map((image) => ({ ...image })) : [];
  mediaEditor?.setValue(post.content || "", legacyImages);
}

function selectPost(slug) {
  selectedSlug = slug;
  renderList();
  showEditor(selectedPost());
}

function buildManagedPost(sourcePost) {
  mediaEditor?.getValue();
  const tags = tagsInput.value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const now = new Date().toISOString();

  return {
    ...sourcePost,
    title: titleInput.value.trim() || "未命名文章",
    date: dateInput.value || new Date().toISOString().slice(0, 10),
    category: categoryInput.value.trim() || "文章",
    summary: clampSummary(summaryInput.value),
    tags,
    content: contentInput.value || "",
    images: [],
    source: "local",
    updatedAt: now,
    publishedAt: sourcePost.publishedAt || now,
  };
}

function enforceSummaryLimit() {
  if (!summaryInput) return;
  const clamped = clampSummary(summaryInput.value);
  if (summaryInput.value !== clamped) {
    summaryInput.value = clamped;
    setStatus(`摘要已限制在 ${summaryMaxLength} 字以内`);
  }
}

async function saveSelectedPost() {
  const post = selectedPost();
  if (!post) return;

  const nextPost = buildManagedPost(post);

  if (window.GlassBlogRemote?.isConfigured?.()) {
    try {
      saveButton.disabled = true;
      setStatus("正在检查图片上传状态...");
      await mediaEditor?.waitForUploads?.();
      const readyPost = buildManagedPost(post);
      setStatus("正在把更改发布到 GitHub...");
      const result = await window.GlassBlogRemote.publishPost(readyPost);

      writePublishedPosts(readPublishedPosts().filter((item) => item.slug !== readyPost.slug));
      writeHiddenPosts(readHiddenPosts().filter((slug) => slug !== readyPost.slug));
      staticPostsCache = staticPostsCache.filter((item) => item.slug !== readyPost.slug);
      staticPostsCache.push(normalizePost({ ...result.post, content: readyPost.content }, "static"));
      posts = mergePosts(staticPostsCache, loadLocalPosts());
      selectedSlug = readyPost.slug;
      updateCategoryOptions();
      renderList();
      showEditor(selectedPost());
      setStatus(`文章《${readyPost.title}》已保存到 GitHub。提交 ${String(result.commit || "").slice(0, 7)}，稍后线上刷新。`);
    } catch (error) {
      setStatus(error.message || "保存到 GitHub 失败。");
    } finally {
      saveButton.disabled = false;
    }
    return;
  }

  const nextPublished = [nextPost, ...readPublishedPosts().filter((item) => item.slug !== nextPost.slug)];

  writePublishedPosts(nextPublished);
  writeHiddenPosts(readHiddenPosts().filter((slug) => slug !== nextPost.slug));
  posts = mergePosts(staticPostsCache, nextPublished.map((item) => normalizePost(item, "local")));
  selectedSlug = nextPost.slug;
  updateCategoryOptions();
  renderList();
  showEditor(selectedPost());
  setStatus(`文章《${nextPost.title}》已保存，本机首页会使用这个版本`);
}

async function deleteSelectedPost() {
  const post = selectedPost();
  if (!post) return;

  const confirmed = window.confirm(`确定删除《${post.title}》吗？${window.GlassBlogRemote?.isConfigured?.() ? "这会提交到 GitHub 仓库。" : "静态文件文章会在本机隐藏。"}`);
  if (!confirmed) return;

  if (window.GlassBlogRemote?.isConfigured?.()) {
    try {
      deleteButton.disabled = true;
      setStatus("正在从 GitHub 删除文章...");
      const result = await window.GlassBlogRemote.deletePost(post.slug);

      writePublishedPosts(readPublishedPosts().filter((item) => item.slug !== post.slug));
      writeHiddenPosts(readHiddenPosts().filter((slug) => slug !== post.slug));
      staticPostsCache = staticPostsCache.filter((item) => item.slug !== post.slug);
      posts = mergePosts(staticPostsCache, loadLocalPosts());
      selectedSlug = posts[0]?.slug || "";
      updateCategoryOptions();
      renderList();
      showEditor(selectedPost());
      setStatus(`文章《${post.title}》已从 GitHub 删除。提交 ${String(result.commit || "").slice(0, 7)}，稍后线上刷新。`);
    } catch (error) {
      setStatus(error.message || "从 GitHub 删除失败。");
    } finally {
      deleteButton.disabled = false;
    }
    return;
  }

  writePublishedPosts(readPublishedPosts().filter((item) => item.slug !== post.slug));

  const hidden = new Set(readHiddenPosts());
  hidden.add(post.slug);
  writeHiddenPosts([...hidden]);

  posts = posts.filter((item) => item.slug !== post.slug);
  selectedSlug = posts[0]?.slug || "";
  updateCategoryOptions();
  renderList();
  showEditor(selectedPost());
  setStatus(`文章《${post.title}》已删除或隐藏`);
}

function openSelectedPost() {
  const post = selectedPost();
  if (!post) return;
  window.location.href = `./index.html#post/${encodeURIComponent(post.slug)}`;
}

function slugFromHash() {
  const match = window.location.hash.match(/^#post\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : "";
}

function animateAmbientBars(time) {
  const t = time / 1000;

  if (ambient) {
    const x = Math.sin(t * 0.22) * 14;
    const y = Math.cos(t * 0.18) * 10;
    ambient.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  if (ambientBarA) {
    const x = Math.sin(t * 0.7) * 54;
    const y = Math.cos(t * 0.56) * 34;
    const rotate = 17 + Math.sin(t * 0.42) * 2.4;
    const skew = -8 + Math.cos(t * 0.38) * 1.2;
    const scale = 1 + Math.sin(t * 0.48) * 0.025;
    ambientBarA.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg) skewX(${skew}deg) scale(${scale})`;
  }

  if (ambientBarB) {
    const x = Math.cos(t * 0.62) * 62;
    const y = Math.sin(t * 0.5) * 38;
    const rotate = -13 + Math.cos(t * 0.4) * 2.2;
    const skew = 10 + Math.sin(t * 0.44) * 1.1;
    const scale = 1 + Math.cos(t * 0.46) * 0.022;
    ambientBarB.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg) skewX(${skew}deg) scale(${scale})`;
  }

  requestAnimationFrame(animateAmbientBars);
}

async function init() {
  try {
    const staticPosts = await loadStaticPosts();
    const localPosts = loadLocalPosts();
    staticPostsCache = staticPosts;
    posts = mergePosts(staticPosts, localPosts);
    const hashSlug = slugFromHash();
    selectedSlug = posts.some((post) => post.slug === hashSlug) ? hashSlug : posts[0]?.slug || "";
    updateCategoryOptions();
    renderList();
    showEditor(selectedPost());
  } catch {
    staticPostsCache = [];
    posts = mergePosts([], loadLocalPosts());
    const hashSlug = slugFromHash();
    selectedSlug = posts.some((post) => post.slug === hashSlug) ? hashSlug : posts[0]?.slug || "";
    updateCategoryOptions();
    renderList();
    showEditor(selectedPost());
    setStatus("静态文章加载失败，只显示本机文章");
  }
}

managerSearch?.addEventListener("input", renderList);
summaryInput?.setAttribute("maxlength", String(summaryMaxLength));
summaryInput?.addEventListener("input", enforceSummaryLimit);
managerList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-select-post]");
  if (!button) return;
  selectPost(button.dataset.selectPost);
});
markdownButtons.forEach((button) => {
  button.addEventListener("click", () => {
    insertMarkdown(button.dataset.manageMd);
  });
});
highlightColorButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeHighlightColor = cleanHighlightColor(button.dataset.manageHighlightColor);
    highlightColorButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    setStatus("已切换荧光笔颜色");
  });
});
emojiToggleButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleEmojiPanel();
});
document.addEventListener("click", (event) => {
  const emojiButton = event.target.closest("[data-manage-emoji]");
  if (emojiButton) {
    insertPlainText(emojiButton.dataset.manageEmoji);
    closeEmojiPanel();
    setStatus("已插入 Emoji");
    return;
  }

  if (emojiPanel && !emojiPanel.hidden && !event.target.closest("[data-manage-emoji-panel], [data-manage-emoji-toggle]")) {
    closeEmojiPanel();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.isComposing) return;

  if (event.key === "Escape" && emojiPanel && !emojiPanel.hidden) {
    closeEmojiPanel();
    return;
  }

  const isSaveShortcut = (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "s";
  if (isSaveShortcut) {
    event.preventDefault();
    saveSelectedPost();
    return;
  }

  const command = shortcutCommandFromEvent(event);
  if (!command || !isEditorShortcutTarget(event.target)) return;

  event.preventDefault();
  if (insertMarkdown(command)) {
    announceShortcut(command);
  }
});
saveButton?.addEventListener("click", () => {
  saveSelectedPost();
});
deleteButton?.addEventListener("click", () => {
  deleteSelectedPost();
});
openButton?.addEventListener("click", openSelectedPost);
cleanEmbeddedImagesButton?.addEventListener("click", cleanOldEmbeddedImages);
mediaEditor = window.GlassBlogMediaEditor?.create({
  source: contentInput,
  root: mediaFlow,
  dropTarget: editorCanvas,
  assetFolderButton: connectAssetsButton,
  filenamePrefixProvider: () => slugInput?.value || selectedSlug || "post",
  onChange: () => {},
  onStatus: setStatus,
});
importImageButton?.addEventListener("click", async () => {
  const ready = await mediaEditor?.ensureAssetFolder();
  if (ready) imageInput?.click();
});
imageInput?.addEventListener("change", () => {
  importImages(imageInput.files || []).finally(() => {
    imageInput.value = "";
  });
});
document.addEventListener("glass-blog:before-backup-export", () => {
  if (selectedPost()) saveSelectedPost();
});
window.addEventListener("hashchange", () => {
  const hashSlug = slugFromHash();
  if (!hashSlug || !posts.some((post) => post.slug === hashSlug)) return;

  if (window.GlassBlogTransition?.run) {
    window.GlassBlogTransition.run(() => selectPost(hashSlug));
  } else {
    selectPost(hashSlug);
  }
});

if (ambient || ambientBarA || ambientBarB) {
  requestAnimationFrame(animateAmbientBars);
}

init();
