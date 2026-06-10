if (!window.GlassBlogAuth?.requireAuthor()) {
  throw new Error("Author sign-in required");
}

const form = document.querySelector("[data-compose-form]");
const titleInput = document.querySelector("[data-title]");
const slugInput = document.querySelector("[data-slug]");
const dateInput = document.querySelector("[data-date]");
const categoryInput = document.querySelector("[data-category]");
const tagsInput = document.querySelector("[data-tags]");
const summaryInput = document.querySelector("[data-summary]");
const contentInput = document.querySelector("[data-content]");
const markdownOutput = document.querySelector("[data-markdown-output]");
const entryOutput = document.querySelector("[data-entry-output]");
const previewMeta = document.querySelector("[data-preview-meta]");
const previewTitle = document.querySelector("[data-preview-title]");
const previewSummary = document.querySelector("[data-preview-summary]");
const previewTags = document.querySelector("[data-preview-tags]");
const previewBody = document.querySelector("[data-preview-body]");
const downloadButton = document.querySelector("[data-download]");
const copyEntryButton = document.querySelector("[data-copy-entry]");
const clearDraftButton = document.querySelector("[data-clear-draft]");
const newDraftButton = document.querySelector("[data-new-draft]");
const saveDraftButton = document.querySelector("[data-save-draft]");
const publishPostButtons = [...document.querySelectorAll("[data-publish-post]")];
const importImageButton = document.querySelector("[data-import-image]");
const connectAssetsButton = document.querySelector("[data-connect-assets]");
const imageInput = document.querySelector("[data-image-input]");
const mediaFlow = document.querySelector("[data-media-flow]");
const editorCanvas = document.querySelector("[data-editor-canvas]");
const draftList = document.querySelector("[data-draft-list]");
const draftCount = document.querySelector("[data-draft-count]");
const publishState = document.querySelector("[data-publish-state]");
const statusMessage = document.querySelector("[data-status]");
const saveState = document.querySelector("[data-save-state]");
const wordCount = document.querySelector("[data-word-count]");
const readTime = document.querySelector("[data-read-time]");
const fileName = document.querySelector("[data-file-name]");
const checkTitle = document.querySelector("[data-check-title]");
const checkSummary = document.querySelector("[data-check-summary]");
const checkTags = document.querySelector("[data-check-tags]");
const editorOutlineList = document.querySelector("[data-editor-outline-list]");
const editorOutlineCount = document.querySelector("[data-editor-outline-count]");
const editorOutlineEmpty = document.querySelector("[data-editor-outline-empty]");
const viewButtons = [...document.querySelectorAll("[data-editor-view]")];
const viewPanels = [...document.querySelectorAll("[data-view-panel]")];
const markdownButtons = [...document.querySelectorAll("[data-md]")];
const highlightColorButtons = [...document.querySelectorAll("[data-highlight-color]")];
const emojiToggleButton = document.querySelector("[data-emoji-toggle]");
const ambient = document.querySelector("[data-ambient]");
const ambientBarA = document.querySelector('[data-ambient-bar="a"]');
const ambientBarB = document.querySelector('[data-ambient-bar="b"]');

const draftKey = "glass-blog-compose-draft";
const draftsKey = "glass-blog-saved-drafts";
const currentDraftIdKey = "glass-blog-current-draft-id";
const publishedPostsKey = "glass-blog-published-posts";
const hiddenPostsKey = "glass-blog-hidden-posts";
const summaryMaxLength = 80;
const categoryLabels = {
  tech: "技术",
  life: "生活",
  notes: "短札",
};
let slugTouched = false;
let currentDraftId = localStorage.getItem(currentDraftIdKey) || "";
let mediaEditor = null;
let legacyImages = [];
let updateTimer = 0;
let activeHighlightColor = highlightColorButtons.find((button) => button.classList.contains("is-active"))?.dataset.highlightColor || "#ffd966";
const emojiGroups = [
  { label: "常用", items: ["😊", "😂", "🤣", "😍", "🥰", "😎", "😭", "😅", "👍", "👏", "🙏", "💪"] },
  { label: "心情", items: ["✨", "🌙", "☕", "🍃", "🔥", "💡", "📌", "✅", "⚠️", "🎯", "📝", "📚"] },
  { label: "装饰", items: ["❤️", "🖤", "🤍", "⭐", "🌟", "💫", "🌈", "❄️", "🌊", "🌿", "🎧", "🧊"] },
];
let emojiPanel = null;
let slashMenu = null;
let slashMenuList = null;
let slashContext = null;
let slashItems = [];
let slashActiveIndex = 0;
let slashQuery = "";
let ambientAnimationFrame = 0;
let ambientAnimationTimer = 0;
const slashCommands = [
  { id: "h1", title: "一级标题", description: "插入文章主标题", shortcut: "H1", keywords: "h1 title heading 标题 一级" },
  { id: "h2", title: "二级标题", description: "插入章节标题", shortcut: "H2", keywords: "h2 heading 标题 二级" },
  { id: "h3", title: "三级标题", description: "插入小节标题", shortcut: "H3", keywords: "h3 heading 标题 三级" },
  { id: "h4", title: "四级标题", description: "插入更细一级的小标题", shortcut: "H4", keywords: "h4 heading 标题 四级" },
  { id: "bold", title: "加粗", description: "强调当前文字", shortcut: "B", keywords: "bold strong 加粗 强调" },
  { id: "highlight", title: "荧光笔", description: "标出重点句子", shortcut: "HL", keywords: "highlight mark 荧光笔 高亮 重点" },
  { id: "quote", title: "引用", description: "插入引用段落", shortcut: ">", keywords: "quote blockquote 引用" },
  { id: "list", title: "列表", description: "插入项目列表", shortcut: "LIST", keywords: "list bullet 列表 项目" },
  { id: "codeblock", title: "代码块", description: "插入多行代码区域", shortcut: "{ }", keywords: "code block 代码 代码块" },
  { id: "link", title: "链接", description: "插入一段可点击链接", shortcut: "LINK", keywords: "link url 链接 超链接" },
  { id: "emoji", title: "Emoji", description: "打开表情面板", shortcut: ":)", keywords: "emoji 表情" },
  { id: "image", title: "图片", description: "导入图片并插入到当前位置", shortcut: "IMG", keywords: "image photo 图片 插图 上传" },
];

function setPublishButtonsDisabled(isDisabled) {
  publishPostButtons.forEach((button) => {
    button.disabled = isDisabled;
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "#";

  try {
    const url = new URL(raw, window.location.href);
    if (["http:", "https:", "mailto:"].includes(url.protocol)) return url.href;
  } catch {
    if (/^(?:\.{0,2}\/|#)[^\s<>"']+$/u.test(raw)) return raw;
  }

  if (/^(?:\.{0,2}\/|#)[^\s<>"']+$/u.test(raw)) return raw;
  return "#";
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

function renderHighlightMarks(value) {
  return value
    .replace(
      /==\{(#[0-9a-fA-F]{6})\}([\s\S]+?)==/g,
      (_match, color, text) => `<mark class="text-highlight" style="--hl-color: ${cleanHighlightColor(color)};">${text}</mark>`,
    )
    .replace(/==([\s\S]+?)==/g, '<mark class="text-highlight">$1</mark>');
}

function inlineMarkdown(value) {
  return renderHighlightMarks(
    escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => `<a href="${escapeHtml(safeUrl(url))}" target="_blank" rel="noreferrer">${label}</a>`),
  );
}

function renderInlineImage(line) {
  const image = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (!image) return "";

  return `
    <figure class="article-image-block">
      <img src="${escapeHtml(safeUrl(image[2]))}" alt="${escapeHtml(image[1] || "文章图片")}" />
      ${image[1] ? `<figcaption>${escapeHtml(image[1])}</figcaption>` : ""}
    </figure>
  `;
}

function renderCodeBlock(code) {
  return `
    <div class="code-block">
      <button class="copy-code-button" type="button" data-copy-code>复制</button>
      <pre><code>${escapeHtml(code)}</code></pre>
    </div>
  `;
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let list = [];
  let inCode = false;
  let code = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    html.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  };

  lines.forEach((line) => {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        html.push(renderCodeBlock(code.join("\n")));
        code = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      return;
    }

    if (inCode) {
      code.push(line);
      return;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const imageHtml = renderInlineImage(trimmed);
    if (imageHtml) {
      flushParagraph();
      flushList();
      html.push(imageHtml);
      return;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      return;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      list.push(trimmed.slice(2));
      return;
    }

    if (trimmed.startsWith("> ")) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${inlineMarkdown(trimmed.slice(2))}</blockquote>`);
      return;
    }

    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();
  return html.join("");
}

function stripMarkdown(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/==\{#[0-9a-fA-F]{6}\}([\s\S]+?)==/g, "$1")
    .replace(/==([\s\S]+?)==/g, "$1")
    .replace(/[#>*_`[\]()\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function slugify(title, date) {
  const slug = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `post-${date.replaceAll("-", "")}`;
}

function getTags() {
  return (tagsInput?.value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getDraft() {
  mediaEditor?.getValue();
  const date = dateInput?.value || today();
  const title = titleInput?.value.trim() || "新的文章标题";
  const slug = slugInput?.value.trim() || slugify(title, date);
  const category = categoryInput?.value.trim() || "技术";

  return {
    title,
    slug,
    date,
    category,
    summary: clampSummary(summaryInput?.value),
    tags: getTags(),
    content: contentInput?.value || "",
    images: [],
  };
}

function buildEntry(draft) {
  return {
    slug: draft.slug,
    title: draft.title,
    date: draft.date,
    category: draft.category,
    summary: draft.summary,
    tags: draft.tags,
    file: `./posts/${draft.slug}.md`,
  };
}

function renderTagList(tags) {
  return tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
}

function setStatus(message) {
  if (!statusMessage) return;
  statusMessage.textContent = message;
}

function scheduleUpdate() {
  window.clearTimeout(updateTimer);
  updateTimer = window.setTimeout(update, 300);
}

function flushScheduledUpdate() {
  if (!updateTimer) return;
  window.clearTimeout(updateTimer);
  updateTimer = 0;
  update();
}

function createDraftId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readSavedDrafts() {
  try {
    const saved = JSON.parse(localStorage.getItem(draftsKey) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    localStorage.removeItem(draftsKey);
    return [];
  }
}

function writeSavedDrafts(drafts) {
  try {
    localStorage.setItem(draftsKey, JSON.stringify(drafts));
  } catch {
    setStatus("草稿箱空间不够，图片仍然太大。建议减少图片数量或把图片作为文件放进 assets。");
  }
}

function readPublishedPosts() {
  try {
    const saved = JSON.parse(localStorage.getItem(publishedPostsKey) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    localStorage.removeItem(publishedPostsKey);
    return [];
  }
}

function writePublishedPosts(posts) {
  try {
    localStorage.setItem(publishedPostsKey, JSON.stringify(posts));
  } catch {
    setStatus("本地发布空间不够。挂到 GitHub 时建议把图片放到 assets 文件夹，用文件路径引用。");
  }
}

function readHiddenPosts() {
  try {
    const saved = JSON.parse(localStorage.getItem(hiddenPostsKey) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    localStorage.removeItem(hiddenPostsKey);
    return [];
  }
}

function writeHiddenPosts(slugs) {
  try {
    localStorage.setItem(hiddenPostsKey, JSON.stringify(slugs));
  } catch {
    setStatus("本地隐藏记录保存失败，浏览器存储空间可能已满。");
  }
}

function formatDraftTime(value) {
  if (!value) return "刚刚";

  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function setCurrentDraftId(id) {
  currentDraftId = id || "";

  try {
    if (currentDraftId) {
      localStorage.setItem(currentDraftIdKey, currentDraftId);
    } else {
      localStorage.removeItem(currentDraftIdKey);
    }
  } catch {
    setStatus("草稿状态保存失败，浏览器存储空间可能已满。");
  }
}

function setEditorView(view) {
  viewButtons.forEach((button) => {
    const isActive = button.dataset.editorView === view;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  viewPanels.forEach((panel) => {
    panel.hidden = panel.dataset.viewPanel !== view;
  });

  if (form) {
    form.hidden = view !== "write";
  }

  if (view !== "write") {
    closeSlashMenu();
  }
}

function setCheck(element, isDone) {
  if (!element) return;
  element.classList.toggle("is-done", isDone);
}

function updateStats(draft) {
  const text = stripMarkdown(draft.content);
  const count = text.length;
  const minutes = Math.max(1, Math.ceil(count / 420));

  if (wordCount) wordCount.textContent = `${count} 字`;
  if (readTime) readTime.textContent = `${minutes} 分钟`;
  if (fileName) fileName.textContent = `${draft.slug}.md`;
  setCheck(checkTitle, draft.title.length > 0);
  setCheck(checkSummary, draft.summary.length > 0);
  setCheck(checkTags, draft.tags.length > 0);
}

async function importImages(files) {
  await mediaEditor?.importFiles(files);
}

function updatePublishState(draft) {
  if (!publishState) return;
  const published = readPublishedPosts().find((post) => post.slug === draft.slug);

  if (!published) {
    publishState.textContent = "未发布";
    return;
  }

  publishState.textContent = `已发布 ${formatDraftTime(published.publishedAt)}`;
}

function setAutosaveState() {
  if (!saveState) return;
  const time = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  saveState.textContent = currentDraftId ? `当前草稿已自动保存 ${time}` : `临时草稿已自动保存 ${time}`;
}

function update() {
  updateTimer = 0;
  const draft = getDraft();
  const markdown = draft.content;
  const entry = buildEntry(draft);
  const categoryLabel = categoryLabels[draft.category] || draft.category;

  if (previewMeta) {
    previewMeta.innerHTML = `
      <time datetime="${escapeHtml(draft.date)}">${escapeHtml(draft.date.replaceAll("-", "."))}</time>
      <span>${escapeHtml(categoryLabel)}</span>
    `;
  }
  if (previewTitle) previewTitle.textContent = draft.title;
  if (previewSummary) previewSummary.textContent = draft.summary;
  if (previewTags) previewTags.innerHTML = renderTagList(draft.tags);
  if (previewBody) previewBody.innerHTML = markdownToHtml(markdown);
  if (markdownOutput) markdownOutput.value = markdown;
  if (entryOutput) entryOutput.value = JSON.stringify(entry, null, 2);
  updateStats(draft);
  updatePublishState(draft);
  setAutosaveState();
  renderEditorOutline();

  try {
    localStorage.setItem(draftKey, JSON.stringify(draft));
  } catch {
    setStatus("草稿太大，已暂停自动保存。建议压缩图片或减少单篇文章图片数量。");
  }

  if (currentDraftId) {
    persistCurrentDraft(draft);
  }
}

function enforceSummaryLimit() {
  if (!summaryInput) return;
  const clamped = clampSummary(summaryInput.value);
  if (summaryInput.value !== clamped) {
    summaryInput.value = clamped;
    setStatus(`摘要已限制在 ${summaryMaxLength} 字以内`);
  }
}

function renderSavedDrafts() {
  const drafts = readSavedDrafts().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  if (draftCount) draftCount.textContent = `${drafts.length} 篇`;
  if (!draftList) return;

  if (!drafts.length) {
    draftList.innerHTML = `<p class="draft-empty">还没有保存的草稿。</p>`;
    return;
  }

  draftList.innerHTML = drafts
    .map(
      (draft) => `
        <article class="draft-item${draft.id === currentDraftId ? " is-active" : ""}">
          <button class="draft-open" type="button" data-open-draft="${escapeHtml(draft.id)}">
            <strong>${escapeHtml(draft.title || "未命名草稿")}</strong>
            <span>${escapeHtml(draft.category || "文章")} · ${escapeHtml(formatDraftTime(draft.updatedAt))}</span>
          </button>
          <button class="draft-delete" type="button" data-delete-draft="${escapeHtml(draft.id)}" aria-label="删除草稿 ${escapeHtml(draft.title || "未命名草稿")}">
            删除
          </button>
        </article>
      `,
    )
    .join("");
}

function applyDraft(draft) {
  titleInput.value = draft.title || "新的文章标题";
  slugInput.value = draft.slug || slugify(titleInput.value, draft.date || today());
  dateInput.value = draft.date || today();
  categoryInput.value = categoryLabels[draft.category] || draft.category || "技术";
  tagsInput.value = Array.isArray(draft.tags) ? draft.tags.join(", ") : "";
  summaryInput.value = draft.summary || "";
  contentInput.value = draft.content || "";
  legacyImages = Array.isArray(draft.images) ? draft.images : [];
  mediaEditor?.setValue(draft.content || "", legacyImages);
  slugTouched = Boolean(draft.slug && draft.slug !== slugify(draft.title || "", draft.date || today()));
  update();
}

function persistCurrentDraft(draft) {
  const savedDrafts = readSavedDrafts();
  const now = new Date().toISOString();
  const matchedDraft = savedDrafts.find((item) => item.id === currentDraftId) || savedDrafts.find((item) => item.slug === draft.slug);
  const id = matchedDraft?.id || currentDraftId || createDraftId();
  const existing = savedDrafts.find((item) => item.id === id);
  const nextDraft = {
    ...existing,
    ...draft,
    id,
    updatedAt: now,
    createdAt: existing?.createdAt || now,
  };
  const nextDrafts = [nextDraft, ...savedDrafts.filter((item) => item.id !== id && item.slug !== draft.slug)];

  writeSavedDrafts(nextDrafts);
  setCurrentDraftId(id);
  try {
    localStorage.setItem(draftKey, JSON.stringify(draft));
  } catch {
    setStatus("草稿太大，未能写入临时草稿。建议把图片作为文件放进 assets。");
  }
  renderSavedDrafts();
  return nextDraft;
}

function saveCurrentDraft(options = {}) {
  flushScheduledUpdate();
  const draft = getDraft();
  const wasExistingDraft = Boolean(
    currentDraftId && readSavedDrafts().some((item) => item.id === currentDraftId),
  ) || readSavedDrafts().some((item) => item.slug === draft.slug);

  persistCurrentDraft(draft);
  renderSavedDrafts();
  setAutosaveState();
  const verb = wasExistingDraft ? "已覆盖" : "已保存";
  setStatus(`${options.shortcut ? "Ctrl+S " : ""}${verb}草稿《${draft.title}》`);
}

function openSavedDraft(id) {
  const draft = readSavedDrafts().find((item) => item.id === id);
  if (!draft) return;

  setCurrentDraftId(id);
  applyDraft(draft);
  renderSavedDrafts();
  setStatus(`已打开草稿《${draft.title || "未命名草稿"}》`);
}

function deleteSavedDraft(id) {
  const savedDrafts = readSavedDrafts();
  const draft = savedDrafts.find((item) => item.id === id);
  const nextDrafts = savedDrafts.filter((item) => item.id !== id);

  writeSavedDrafts(nextDrafts);

  if (id === currentDraftId) {
    setCurrentDraftId("");
  }

  renderSavedDrafts();
  setAutosaveState();
  setStatus(draft ? `草稿《${draft.title || "未命名草稿"}》已删除` : "草稿已删除");
}

function validatePublishDraft(draft) {
  if (!draft.title.trim()) return "请先写文章标题";
  if (!draft.slug.trim()) return "请先填写固定链接";
  if (!draft.summary.trim()) return "请先写文章摘要";
  if (!draft.content.trim()) return "请先写正文";
  return "";
}

async function publishCurrentPost() {
  flushScheduledUpdate();
  const draft = getDraft();
  const error = validatePublishDraft(draft);

  if (error) {
    setStatus(error);
    return;
  }

  if (window.GlassBlogRemote?.isConfigured?.()) {
    try {
      setPublishButtonsDisabled(true);
      setStatus("正在检查图片上传状态...");
      await mediaEditor?.waitForUploads?.();
      const readyDraft = getDraft();
      setStatus("正在发布到 GitHub，GitHub Pages 稍后会自动刷新...");
      const result = await window.GlassBlogRemote.publishPost(readyDraft);
      writePublishedPosts(readPublishedPosts().filter((item) => item.slug !== readyDraft.slug));
      writeHiddenPosts(readHiddenPosts().filter((slug) => slug !== readyDraft.slug));

      if (currentDraftId) {
        writeSavedDrafts(readSavedDrafts().filter((item) => item.id !== currentDraftId));
        setCurrentDraftId("");
        renderSavedDrafts();
      }

      updatePublishState({ ...readyDraft, publishedAt: new Date().toISOString() });
      setAutosaveState();
      setStatus(`文章《${readyDraft.title}》已发布到 GitHub。提交 ${String(result.commit || "").slice(0, 7)}，等 Pages 部署完成后线上可见。`);
    } catch (error) {
      setStatus(error.message || "发布到 GitHub 失败。");
    } finally {
      setPublishButtonsDisabled(false);
    }
    return;
  }

  const publishedPosts = readPublishedPosts();
  const now = new Date().toISOString();
  const post = {
    ...draft,
    publishedAt: now,
    updatedAt: now,
    source: "local",
  };
  const nextPosts = [post, ...publishedPosts.filter((item) => item.slug !== draft.slug)];

  writePublishedPosts(nextPosts);
  writeHiddenPosts(readHiddenPosts().filter((slug) => slug !== draft.slug));

  if (currentDraftId) {
    writeSavedDrafts(readSavedDrafts().filter((item) => item.id !== currentDraftId));
    setCurrentDraftId("");
    renderSavedDrafts();
  }

  try {
    localStorage.setItem(draftKey, JSON.stringify(draft));
  } catch {
    setStatus("文章已尝试发布，但临时草稿太大没有保存。建议把图片作为文件放进 assets。");
  }
  updatePublishState(draft);
  setAutosaveState();
  setStatus(`文章《${draft.title}》已发布到本机首页预览`);
}

function loadDraft() {
  dateInput.value = today();

  try {
    const savedDraft = currentDraftId ? readSavedDrafts().find((item) => item.id === currentDraftId) : null;
    const saved = savedDraft || JSON.parse(localStorage.getItem(draftKey) || "null");
    if (!saved) return;

    titleInput.value = saved.title || titleInput.value;
    slugInput.value = saved.slug || slugInput.value;
    dateInput.value = saved.date || dateInput.value;
    categoryInput.value = categoryLabels[saved.category] || saved.category || categoryInput.value;
    tagsInput.value = Array.isArray(saved.tags) ? saved.tags.join(", ") : tagsInput.value;
    summaryInput.value = saved.summary || summaryInput.value;
    contentInput.value = saved.content || contentInput.value;
    legacyImages = Array.isArray(saved.images) ? saved.images : legacyImages;
    slugTouched = Boolean(saved.slug && saved.slug !== "new-post");
  } catch {
    localStorage.removeItem(draftKey);
  }
}

function wrapSelection(before, after = before, fallback = "文字") {
  mediaEditor?.wrapSelection(before, after, fallback);
  scheduleUpdate();
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
    scheduleUpdate();
    return;
  }

  const start = contentInput.selectionStart ?? contentInput.value.length;
  const end = contentInput.selectionEnd ?? start;
  contentInput.setRangeText(value, start, end, "end");
  contentInput.focus({ preventScroll: true });
  scheduleUpdate();
}

function toggleWrap(before, after = before, fallback = "文字") {
  mediaEditor?.toggleWrap(before, after, fallback);
  scheduleUpdate();
}

function transformSelectedLines(transformLine, fallback = "新的段落") {
  mediaEditor?.transformSelectedLines(transformLine, fallback);
  scheduleUpdate();
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
    highlight: () => {
      mediaEditor?.applyHighlight(cleanHighlightColor(activeHighlightColor), "重点文字");
      scheduleUpdate();
    },
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
  emojiPanel.setAttribute("data-emoji-panel", "");
  emojiPanel.innerHTML = emojiGroups
    .map(
      (group) => `
        <section class="emoji-group" aria-label="${escapeHtml(group.label)}">
          <span>${escapeHtml(group.label)}</span>
          <div>
            ${group.items.map((emoji) => `<button type="button" data-emoji="${escapeHtml(emoji)}" aria-label="插入 ${escapeHtml(emoji)}">${escapeHtml(emoji)}</button>`).join("")}
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

function createSlashMenu() {
  if (slashMenu) return slashMenu;

  slashMenu = document.createElement("div");
  slashMenu.className = "editor-command-menu";
  slashMenu.hidden = true;
  slashMenu.setAttribute("data-editor-command-menu", "");
  slashMenu.innerHTML = `
    <div class="editor-command-head">
      <strong>Slash Command</strong>
      <span>输入 /h、/li、/im 这样的缩写可以快速筛选</span>
    </div>
    <div class="editor-command-list" data-editor-command-list></div>
  `;
  slashMenuList = slashMenu.querySelector("[data-editor-command-list]");
  slashMenu.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });
  document.body.append(slashMenu);
  return slashMenu;
}

function getSlashMatches(query = "") {
  const keyword = String(query || "").trim().toLowerCase();
  if (!keyword) return slashCommands;

  return slashCommands.filter((command) => {
    const haystack = `${command.id} ${command.title} ${command.description} ${command.keywords}`.toLowerCase();
    return haystack.includes(keyword);
  });
}

function getSlashContext() {
  const textarea = mediaEditor?.activeTextArea?.();
  if (!textarea) return null;

  const selectionStart = textarea.selectionStart ?? 0;
  const selectionEnd = textarea.selectionEnd ?? selectionStart;
  if (selectionStart !== selectionEnd) return null;

  const value = textarea.value || "";
  const lineStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const nextBreak = value.indexOf("\n", selectionStart);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  const line = value.slice(lineStart, lineEnd);
  const prefix = line.slice(0, selectionStart - lineStart);
  const match = prefix.match(/^(\s*)\/([^\s]*)$/);

  if (!match) return null;
  if (!/^\/[^\s]*$/.test(line.trim())) return null;

  return {
    textarea,
    index: Number(textarea.dataset.blockIndex),
    lineStart,
    lineEnd,
    start: selectionStart,
    end: selectionEnd,
    indent: match[1] || "",
    query: match[2].toLowerCase(),
  };
}

function positionSlashMenu() {
  if (!slashMenu || slashMenu.hidden || !slashContext?.textarea) return;

  const textarea = slashContext.textarea;
  const rect = textarea.getBoundingClientRect();
  const styles = window.getComputedStyle(textarea);
  const lineHeight = parseFloat(styles.lineHeight) || 34;
  const paddingTop = parseFloat(styles.paddingTop) || 0;
  const lineIndex = (textarea.value.slice(0, slashContext.start).match(/\n/g) || []).length;
  const anchorY = rect.top + paddingTop + lineIndex * lineHeight - textarea.scrollTop;
  let top = anchorY + lineHeight + 12;
  let left = rect.left + 10;

  const menuHeight = Math.min(260, window.innerHeight * 0.52);
  if (top + menuHeight > window.innerHeight - 18) {
    top = anchorY - menuHeight - 12;
  }

  top = Math.max(18, top);
  left = Math.max(18, Math.min(left, window.innerWidth - 338));
  slashMenu.style.top = `${top}px`;
  slashMenu.style.left = `${left}px`;
}

function renderSlashMenu() {
  const panel = createSlashMenu();
  slashItems = getSlashMatches(slashContext?.query || "");
  slashActiveIndex = slashItems.length ? Math.min(slashActiveIndex, slashItems.length - 1) : 0;

  if (!slashMenuList) return;

  if (!slashItems.length) {
    slashMenuList.innerHTML = `
      <div class="editor-command-item" aria-hidden="true">
        <span class="editor-command-label">
          <span class="editor-command-title">没有找到对应命令</span>
          <span class="editor-command-description">试试 /h、/list、/image 这些缩写</span>
        </span>
      </div>
    `;
  } else {
    slashMenuList.innerHTML = slashItems
      .map(
        (command, index) => `
          <button
            class="editor-command-item${index === slashActiveIndex ? " is-active" : ""}"
            type="button"
            data-editor-command="${escapeHtml(command.id)}"
          >
            <span class="editor-command-label">
              <span class="editor-command-title">${escapeHtml(command.title)}</span>
              <span class="editor-command-description">${escapeHtml(command.description)}</span>
            </span>
            <span class="editor-command-key">${escapeHtml(command.shortcut)}</span>
          </button>
        `,
      )
      .join("");
  }

  panel.hidden = false;
  requestAnimationFrame(positionSlashMenu);
}

function closeSlashMenu() {
  if (!slashMenu) return;
  slashMenu.hidden = true;
  slashContext = null;
  slashItems = [];
  slashQuery = "";
}

function syncSlashMenuState() {
  const context = getSlashContext();
  if (!context) {
    closeSlashMenu();
    return;
  }

  if (context.query !== slashQuery) {
    slashActiveIndex = 0;
  }

  slashQuery = context.query;
  slashContext = context;
  renderSlashMenu();
}

function removeSlashToken() {
  const context = slashContext || getSlashContext();
  if (!context) return false;

  const value = context.textarea.value || "";
  const replacement = context.indent;
  const cursor = context.lineStart + replacement.length;
  mediaEditor?.replaceText(
    context.index,
    `${value.slice(0, context.lineStart)}${replacement}${value.slice(context.lineEnd)}`,
    cursor,
    cursor,
  );
  return true;
}

function applySlashCommand(commandId) {
  const command = slashCommands.find((item) => item.id === commandId);
  if (!command) return;

  removeSlashToken();
  closeSlashMenu();

  if (command.id === "image") {
    importImageButton?.click();
    return;
  }

  insertMarkdown(command.id);
}

function handleSlashMenuKeydown(event) {
  if (!slashMenu || slashMenu.hidden) return false;

  if (event.key === "Escape") {
    event.preventDefault();
    closeSlashMenu();
    return true;
  }

  if (!slashItems.length) return false;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    slashActiveIndex = (slashActiveIndex + 1) % slashItems.length;
    renderSlashMenu();
    return true;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    slashActiveIndex = (slashActiveIndex - 1 + slashItems.length) % slashItems.length;
    renderSlashMenu();
    return true;
  }

  if (event.key === "Enter" || event.key === "Tab") {
    event.preventDefault();
    applySlashCommand(slashItems[slashActiveIndex].id);
    return true;
  }

  return false;
}

function renderEditorOutline() {
  const headings = mediaEditor?.getOutlineHeadings?.() || [];
  const activeHeadingId = mediaEditor?.getActiveHeadingId?.() || "";

  if (editorOutlineCount) {
    editorOutlineCount.textContent = `${headings.length} 节`;
  }

  if (editorOutlineEmpty) {
    editorOutlineEmpty.hidden = headings.length > 0;
  }

  if (!editorOutlineList) return;

  if (!headings.length) {
    editorOutlineList.innerHTML = "";
    return;
  }

  editorOutlineList.innerHTML = headings
    .map(
      (heading) => `
        <button
          class="editor-outline-link${heading.id === activeHeadingId ? " is-active" : ""}"
          type="button"
          data-outline-id="${escapeHtml(heading.id)}"
          data-level="${heading.level}"
        >
          <span class="editor-outline-kicker">H${heading.level}</span>
          <span class="editor-outline-text">${escapeHtml(heading.text)}</span>
        </button>
      `,
    )
    .join("");
}

function focusOutlineHeading(id) {
  const heading = (mediaEditor?.getOutlineHeadings?.() || []).find((item) => item.id === id);
  if (!heading) return;

  mediaEditor?.focusHeading?.(heading);
  renderEditorOutline();
  syncSlashMenuState();
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
  if (target.closest?.("[data-media-flow], .block-toolbar")) return true;
  if (target === contentInput) return true;

  const editable = target.closest?.("input, textarea, select, [contenteditable='true']");
  return !editable;
}

function announceShortcut(command) {
  const button = document.querySelector(`[data-md="${command}"]`);
  const label = button?.dataset.tooltip || "格式";
  const shortcut = button?.dataset.shortcut;
  setStatus(shortcut ? `${label}已应用（${shortcut}）` : `${label}已应用`);
}

function downloadMarkdown() {
  flushScheduledUpdate();
  const draft = getDraft();
  const blob = new Blob([draft.content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${draft.slug}.md`;
  link.click();
  URL.revokeObjectURL(url);
  setStatus(`已生成 ${draft.slug}.md`);
}

async function copyEntry() {
  flushScheduledUpdate();
  const draft = getDraft();
  const entry = JSON.stringify(buildEntry(draft), null, 2);
  await navigator.clipboard.writeText(entry);
  setStatus("文章条目已复制");
}

function clearDraft() {
  localStorage.removeItem(draftKey);
  setCurrentDraftId("");
  titleInput.value = "新的文章标题";
  slugInput.value = "new-post";
  dateInput.value = today();
  categoryInput.value = "技术";
  tagsInput.value = "Markdown, 博客";
  summaryInput.value = "这里写一句文章摘要，会显示在首页卡片里。";
  contentInput.value = `# 新的文章标题

从这里开始写正文。

## 小标题

- 第一条想法
- 第二条想法

写完以后可以在右侧检查预览。`;
  legacyImages = [];
  mediaEditor?.setValue(contentInput.value, legacyImages);
  update();
  renderSavedDrafts();
  setStatus("草稿已清空");
}

function createNewDraft() {
  if (titleInput.value.trim() || contentInput.value.trim()) {
    saveCurrentDraft();
  }

  clearDraft();
  setStatus("已新建空白草稿，上一篇已保存");
  titleInput.focus();
}

function animateAmbientBars(time) {
  ambientAnimationFrame = 0;
  if (document.visibilityState === "hidden") return;

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

  startAmbientAnimation(96);
}

function startAmbientAnimation(delay = 0) {
  if (ambientAnimationFrame || ambientAnimationTimer || document.visibilityState === "hidden") return;

  ambientAnimationTimer = window.setTimeout(() => {
    ambientAnimationTimer = 0;
    if (document.visibilityState === "hidden") return;
    ambientAnimationFrame = requestAnimationFrame(animateAmbientBars);
  }, delay);
}

function stopAmbientAnimation() {
  if (ambientAnimationFrame) cancelAnimationFrame(ambientAnimationFrame);
  if (ambientAnimationTimer) window.clearTimeout(ambientAnimationTimer);
  ambientAnimationFrame = 0;
  ambientAnimationTimer = 0;
}

loadDraft();
mediaEditor = window.GlassBlogMediaEditor?.create({
  source: contentInput,
  root: mediaFlow,
  dropTarget: editorCanvas,
  assetFolderButton: connectAssetsButton,
  filenamePrefixProvider: () => slugInput?.value || slugify(titleInput?.value || "post", dateInput?.value || today()),
  onChange: () => {
    renderEditorOutline();
    syncSlashMenuState();
    scheduleUpdate();
  },
  onStatus: setStatus,
});
mediaEditor?.setValue(contentInput?.value || "", legacyImages);
update();
renderSavedDrafts();
setEditorView("write");
summaryInput?.setAttribute("maxlength", String(summaryMaxLength));

form?.addEventListener("input", (event) => {
  if (event.target.closest("[data-media-flow]")) return;
  if (event.target === summaryInput) enforceSummaryLimit();
  scheduleUpdate();
});
slugInput?.addEventListener("input", () => {
  slugTouched = true;
});
titleInput?.addEventListener("input", () => {
  if (!slugTouched) {
    slugInput.value = slugify(titleInput.value, dateInput.value || today());
    scheduleUpdate();
  }
});
viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    flushScheduledUpdate();
    setEditorView(button.dataset.editorView || "write");
  });
});
markdownButtons.forEach((button) => {
  button.addEventListener("click", () => {
    insertMarkdown(button.dataset.md);
  });
});
highlightColorButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeHighlightColor = cleanHighlightColor(button.dataset.highlightColor);
    highlightColorButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    setStatus("已切换荧光笔颜色");
  });
});
emojiToggleButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleEmojiPanel();
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
mediaFlow?.addEventListener("input", () => {
  renderEditorOutline();
  syncSlashMenuState();
});
mediaFlow?.addEventListener("keyup", () => {
  renderEditorOutline();
  syncSlashMenuState();
});
mediaFlow?.addEventListener("click", () => {
  renderEditorOutline();
  syncSlashMenuState();
});
mediaFlow?.addEventListener("focusin", () => {
  renderEditorOutline();
  syncSlashMenuState();
});
window.addEventListener("resize", positionSlashMenu);
window.addEventListener("scroll", positionSlashMenu, true);
document.addEventListener("click", async (event) => {
  const outlineButton = event.target.closest("[data-outline-id]");
  if (outlineButton) {
    focusOutlineHeading(outlineButton.dataset.outlineId);
    return;
  }

  const slashButton = event.target.closest("[data-editor-command]");
  if (slashButton) {
    applySlashCommand(slashButton.dataset.editorCommand);
    return;
  }

  const emojiButton = event.target.closest("[data-emoji]");
  if (emojiButton) {
    insertPlainText(emojiButton.dataset.emoji);
    closeEmojiPanel();
    setStatus("已插入 Emoji");
    return;
  }

  if (emojiPanel && !emojiPanel.hidden && !event.target.closest("[data-emoji-panel], [data-emoji-toggle]")) {
    closeEmojiPanel();
  }

  if (slashMenu && !slashMenu.hidden && !event.target.closest("[data-editor-command-menu]") && !event.target.closest("[data-media-flow]")) {
    closeSlashMenu();
  }

  const openDraftButton = event.target.closest("[data-open-draft]");
  if (openDraftButton) {
    openSavedDraft(openDraftButton.dataset.openDraft);
    return;
  }

  const deleteDraftButton = event.target.closest("[data-delete-draft]");
  if (deleteDraftButton) {
    const confirmed = window.confirm("确定删除这篇草稿吗？");
    if (confirmed) {
      deleteSavedDraft(deleteDraftButton.dataset.deleteDraft);
    }
    return;
  }

  const button = event.target.closest("[data-copy-code]");
  if (!button) return;

  const code = button.closest(".code-block")?.querySelector("code")?.textContent || "";
  if (!code) return;

  try {
    await navigator.clipboard.writeText(code);
    button.textContent = "已复制";
    setTimeout(() => {
      button.textContent = "复制";
    }, 1400);
  } catch {
    button.textContent = "复制失败";
    setTimeout(() => {
      button.textContent = "复制";
    }, 1400);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.isComposing) return;

  if (handleSlashMenuKeydown(event)) {
    return;
  }

  if (event.key === "Escape" && emojiPanel && !emojiPanel.hidden) {
    closeEmojiPanel();
    return;
  }

  const isSaveShortcut = (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "s";
  if (isSaveShortcut) {
    event.preventDefault();
    saveCurrentDraft({ shortcut: true });
    return;
  }

  const command = shortcutCommandFromEvent(event);
  if (!command || !isEditorShortcutTarget(event.target)) return;

  event.preventDefault();
  if (insertMarkdown(command)) {
    announceShortcut(command);
  }
});
downloadButton?.addEventListener("click", downloadMarkdown);
saveDraftButton?.addEventListener("click", saveCurrentDraft);
newDraftButton?.addEventListener("click", createNewDraft);
publishPostButtons.forEach((button) => {
  button.addEventListener("click", () => {
    publishCurrentPost();
  });
});
copyEntryButton?.addEventListener("click", () => {
  copyEntry().catch(() => setStatus("复制失败"));
});
clearDraftButton?.addEventListener("click", clearDraft);
document.addEventListener("glass-blog:before-backup-export", () => {
  flushScheduledUpdate();
});

if (ambient || ambientBarA || ambientBarB) {
  startAmbientAnimation();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      stopAmbientAnimation();
      return;
    }
    startAmbientAnimation();
  });
}
