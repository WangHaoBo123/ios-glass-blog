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
const highlightColorInput = document.querySelector("[data-manage-highlight-color]");
const ambient = document.querySelector("[data-ambient]");
const ambientBarA = document.querySelector('[data-ambient-bar="a"]');
const ambientBarB = document.querySelector('[data-ambient-bar="b"]');

const publishedPostsKey = "glass-blog-published-posts";
const hiddenPostsKey = "glass-blog-hidden-posts";
const draftKey = "glass-blog-compose-draft";
const draftsKey = "glass-blog-saved-drafts";
const categoryLabels = {
  tech: "技术",
  life: "生活",
  notes: "短札",
};

const fallbackPosts = [
  {
    slug: "static-blog-system",
    title: "如何把一个静态博客长期维护下去",
    date: "2026-05-16",
    category: "技术",
    summary: "从目录结构、文章命名、图片管理到 GitHub Pages 发布流程，整理一套不容易半途而废的写作系统。",
    tags: ["GitHub Pages", "Markdown", "静态博客"],
    featured: true,
    content: `# 如何把一个静态博客长期维护下去

静态博客最舒服的地方，是它没有后台、数据库和服务器维护压力。文章就是文件，样式就是代码，发布就是一次提交。

## 推荐结构

- \`posts/index.json\` 保存文章列表和摘要。
- \`posts/*.md\` 保存正文。
- 图片可以放到 \`assets\` 或 \`posts/images\`。

## 写作节奏

每篇文章只要先写清楚标题、摘要、标签和日期，后面就可以慢慢补正文。个人博客最重要的不是一次做大，而是能一直写下去。`,
  },
  {
    slug: "quiet-workflow",
    title: "最近喜欢的安静工作流",
    date: "2026-05-12",
    category: "生活",
    summary: "少开标签页，少切窗口，把一天拆成几个有边界的小段。",
    tags: ["生活", "效率"],
    content: `# 最近喜欢的安静工作流

我最近越来越喜欢把工作环境收窄：少开标签页，少开聊天窗口，只保留一个正在处理的问题。

这种方式不一定最快，但它很稳。稳下来以后，很多原本觉得乱的事，会自己排出轻重缓急。`,
  },
  {
    slug: "ui-cleanup",
    title: "给个人项目做一次 UI 收敛",
    date: "2026-05-03",
    category: "技术",
    summary: "删除多余的色彩和组件，让页面重新回到内容本身。",
    tags: ["前端", "设计", "UI"],
    content: `# 给个人项目做一次 UI 收敛

个人项目最容易越做越散。一个按钮一种圆角，一个页面一种阴影，最后所有东西都在争夺注意力。

我的做法是先保留三类东西：文字层级、空间关系、关键操作。其他装饰先删掉。删完以后，真正重要的内容会露出来。`,
  },
  {
    slug: "dont-optimize-too-early",
    title: "短札：别急着优化",
    date: "2026-04-28",
    category: "短札",
    summary: "很多时候真正该先做的，是把问题说清楚。",
    tags: ["短札", "思考"],
    content: `# 短札：别急着优化

很多时候真正该先做的，是把问题说清楚。

如果问题本身还没有形状，优化就会变成绕路。`,
  },
];

let posts = [];
let staticPostsCache = [];
let selectedSlug = "";
let mediaEditor = null;
let legacyImages = [];

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
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Cannot load ${path}`);
  return response.text();
}

async function loadStaticPosts() {
  try {
    const response = await fetch("./posts/index.json");
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
    highlight: () => mediaEditor?.applyHighlight(cleanHighlightColor(highlightColorInput?.value), "重点文字"),
    quote: () => setLinePrefix("> ", /^\s{0,3}>\s?/, "引用内容"),
    list: () => setLinePrefix("- ", /^\s{0,3}[-*+]\s+/, "列表项"),
    codeblock: () => wrapSelection("```\n", "\n```", "console.log(\"hello blog\");"),
    link: () => wrapSelection("[", "](https://example.com)", "链接文字"),
  };

  if (!actions[command]) return false;
  actions[command]();
  return true;
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
  summaryInput.value = post.summary || "";
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
    summary: summaryInput.value.trim(),
    tags,
    content: contentInput.value || "",
    images: [],
    source: "local",
    updatedAt: now,
    publishedAt: sourcePost.publishedAt || now,
  };
}

function saveSelectedPost() {
  const post = selectedPost();
  if (!post) return;

  const nextPost = buildManagedPost(post);
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

function deleteSelectedPost() {
  const post = selectedPost();
  if (!post) return;

  const confirmed = window.confirm(`确定删除《${post.title}》吗？静态文件文章会在本机隐藏。`);
  if (!confirmed) return;

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
document.addEventListener("keydown", (event) => {
  if (event.isComposing) return;

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
saveButton?.addEventListener("click", saveSelectedPost);
deleteButton?.addEventListener("click", deleteSelectedPost);
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
