const filterList = document.querySelector("[data-filter-list]");
const searchInput = document.querySelector("[data-search]");
const emptyState = document.querySelector("[data-empty]");
const loadingState = document.querySelector("[data-loading]");
const listViews = [...document.querySelectorAll("[data-list-view]")];
const featuredPost = document.querySelector("[data-featured-post]");
const postList = document.querySelector("[data-post-list]");
const reader = document.querySelector("[data-reader]");
const readerMeta = document.querySelector("[data-reader-meta]");
const readerTitle = document.querySelector("[data-reader-title]");
const readerSummary = document.querySelector("[data-reader-summary]");
const readerTags = document.querySelector("[data-reader-tags]");
const readerBody = document.querySelector("[data-reader-body]");
const readerToc = document.querySelector("[data-reader-toc]");
const articleSignature = document.querySelector("[data-article-signature]");
const articleSignatureName = document.querySelector("[data-article-signature-name]");
const bottomReadingProgress = document.querySelector("[data-bottom-reading-progress]");
const bottomReadingProgressBar = document.querySelector("[data-bottom-reading-progress-bar]");
const backToTopButton = document.querySelector("[data-back-to-top]");
const floatingReaderTitle = document.querySelector("[data-reader-floating-title]");
const floatingReaderTitleText = document.querySelector("[data-reader-floating-title-text]");
const floatingReadingProgressBar = document.querySelector("[data-floating-reading-progress-bar]");
const imagePreview = document.querySelector("[data-image-preview]");
const imagePreviewImg = document.querySelector("[data-image-preview-img]");
const imagePreviewCaption = document.querySelector("[data-image-preview-caption]");
const postNeighbors = document.querySelector("[data-post-neighbors]");
const archiveView = document.querySelector("[data-archive-view]");
const archiveList = document.querySelector("[data-archive-list]");
const tagsView = document.querySelector("[data-tags-view]");
const tagCloud = document.querySelector("[data-tag-cloud]");
const tagResults = document.querySelector("[data-tag-results]");
const totalPosts = document.querySelector("[data-total-posts]");
const latestDate = document.querySelector("[data-latest-date]");
const ambient = document.querySelector("[data-ambient]");
const ambientBarA = document.querySelector('[data-ambient-bar="a"]');
const ambientBarB = document.querySelector('[data-ambient-bar="b"]');
const profileName = document.querySelector(".profile-copy strong");
const profileStatus = document.querySelector("[data-profile-status]");
const scriptHeroTitle = document.querySelector("[data-script-hero-title]");
const typingIntro = document.querySelector("[data-typing-intro]");
const typingIntroOutput = document.querySelector("[data-typing-output]");

const categoryLabels = {
  tech: "技术",
  life: "生活",
  notes: "短札",
};
const publishedPostsKey = "glass-blog-published-posts";
const hiddenPostsKey = "glass-blog-hidden-posts";
const siteUrl = "https://starytra32.top/";
const siteTitle = "灰玻璃日记";
const siteDescription = "一个深色磨砂玻璃风格的个人静态博客，可写 Markdown 文章并部署到 GitHub Pages。";

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
let activeFilter = "all";
let activeProgressFrame = 0;
let listTransitionTimer = 0;
let profileStatusTimer = 0;
let typingIntroFrame = 0;
const heroWritingDuration = 3200;

function revealTypingIntroText() {
  if (!typingIntro || !typingIntroOutput) return;

  typingIntroOutput.textContent = typingIntro.dataset.typingText || "";
  typingIntro.classList.remove("is-typing-pending", "is-typing");
  typingIntro.classList.add("is-typed");
}

function playTypingIntro() {
  if (!typingIntro || !typingIntroOutput) return;

  const text = typingIntro.dataset.typingText || "";
  const characters = [...text];
  const startedAt = performance.now();

  window.cancelAnimationFrame(typingIntroFrame);
  typingIntroOutput.textContent = "";
  typingIntro.classList.remove("is-typing-pending", "is-typed");
  typingIntro.classList.add("is-typing");

  const typeFrame = (now) => {
    const progress = Math.min((now - startedAt) / heroWritingDuration, 1);
    const visibleCount = Math.floor(progress * characters.length);
    typingIntroOutput.textContent = characters.slice(0, visibleCount).join("");

    if (progress < 1) {
      typingIntroFrame = window.requestAnimationFrame(typeFrame);
      return;
    }

    revealTypingIntroText();
  };

  typingIntroFrame = window.requestAnimationFrame(typeFrame);
}

function playScriptHeroWriting() {
  if (!scriptHeroTitle && !typingIntro) return;

  scriptHeroTitle?.classList.remove("is-writing-pending");

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    revealTypingIntroText();
    return;
  }

  if (scriptHeroTitle) {
    scriptHeroTitle.classList.remove("is-writing");
    void scriptHeroTitle.offsetWidth;
    scriptHeroTitle.classList.add("is-writing");
  }

  playTypingIntro();
}

function queueScriptHeroWriting() {
  if (!scriptHeroTitle && !typingIntro) return;

  const start = () => {
    window.setTimeout(playScriptHeroWriting, 35);
  };

  if (window.GlassBlogOpening?.isPlaying) {
    window.GlassBlogOpening.done?.then(start);
    return;
  }

  start();
}

function authorIsSignedIn() {
  return window.GlassBlogAuth?.isSignedIn?.() === true;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setMetaContent(selector, content) {
  const element = document.head.querySelector(selector);
  if (element) element.setAttribute("content", content);
}

function setCanonical(path = "./index.html") {
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.append(canonical);
  }
  canonical.href = new URL(path, siteUrl).href;
}

function updatePageMeta(title = siteTitle, description = siteDescription, canonical = "./index.html") {
  const absoluteCanonical = new URL(canonical, siteUrl).href;
  document.title = title;
  setMetaContent('meta[name="description"]', description);
  setMetaContent('meta[property="og:title"]', title);
  setMetaContent('meta[property="og:description"]', description);
  setMetaContent('meta[property="og:url"]', absoluteCanonical);
  setCanonical(absoluteCanonical);
}

function cleanHighlightColor(value) {
  const match = String(value || "").trim().match(/^#?([0-9a-fA-F]{6})$/);
  return match ? `#${match[1].toLowerCase()}` : "#ffd966";
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
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => `<a href="${escapeHtml(safeUrl(url))}" target="_blank" rel="noreferrer">${label}</a>`),
  );
}

function plainMarkdownText(value) {
  return String(value || "")
    .replace(/==\{#[0-9a-fA-F]{6}\}([\s\S]+?)==/g, "$1")
    .replace(/==([\s\S]+?)==/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function slugifyHeading(value, counts) {
  const base =
    plainMarkdownText(value)
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section";
  const nextCount = (counts.get(base) || 0) + 1;
  counts.set(base, nextCount);
  return nextCount === 1 ? base : `${base}-${nextCount}`;
}

function renderInlineImage(line) {
  const image = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (!image) return "";

  return `
    <figure class="article-image-block">
      <img class="is-loading" src="${escapeHtml(safeUrl(image[2]))}" alt="${escapeHtml(image[1] || "文章图片")}" loading="lazy" decoding="async" />
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
  const headingCounts = new Map();

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

  for (const line of lines) {
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
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const imageHtml = renderInlineImage(trimmed);
    if (imageHtml) {
      flushParagraph();
      flushList();
      html.push(imageHtml);
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const id = slugifyHeading(heading[2], headingCounts);
      html.push(`<h${level} id="${escapeHtml(id)}">${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      list.push(trimmed.slice(2));
      continue;
    }

    if (trimmed.startsWith("> ")) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${inlineMarkdown(trimmed.slice(2))}</blockquote>`);
      continue;
    }

    paragraph.push(trimmed);
  }

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

function formatDate(value) {
  return value ? value.replaceAll("-", ".") : "";
}

function readingMinutes(content) {
  const words = stripMarkdown(content).length;
  return Math.max(1, Math.ceil(words / 420));
}

async function fetchText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Cannot load ${path}`);
  return response.text();
}

async function loadPosts() {
  try {
    const response = await fetch("./posts/index.json");
    if (!response.ok) throw new Error("posts index missing");
    const index = await response.json();
    const loaded = await Promise.all(
      index.posts.map(async (post) => {
        const content = await fetchText(post.file);
        return { ...post, content };
      }),
    );
    return loaded;
  } catch {
    return fallbackPosts;
  }
}

function loadLocalPublishedPosts() {
  try {
    const saved = JSON.parse(localStorage.getItem(publishedPostsKey) || "[]");
    if (!Array.isArray(saved)) return [];

    return saved.map((post) => ({
      ...post,
      file: post.file || `local:${post.slug}`,
      featured: Boolean(post.featured),
      content: post.content || "",
    }));
  } catch {
    localStorage.removeItem(publishedPostsKey);
    return [];
  }
}

function loadHiddenPosts() {
  try {
    const saved = JSON.parse(localStorage.getItem(hiddenPostsKey) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    localStorage.removeItem(hiddenPostsKey);
    return [];
  }
}

function mergePosts(basePosts, localPosts) {
  const hidden = new Set(loadHiddenPosts());
  const bySlug = new Map();

  basePosts.forEach((post) => {
    if (!hidden.has(post.slug)) {
      bySlug.set(post.slug, post);
    }
  });

  localPosts.forEach((post) => {
    if (!hidden.has(post.slug)) {
      bySlug.set(post.slug, { ...bySlug.get(post.slug), ...post });
    }
  });

  return [...bySlug.values()];
}

function normalizePost(post) {
  const content = post.content || "";
  const categoryLabel = (post.categoryLabel || categoryLabels[post.category] || post.category || "文章").trim();
  const tags = Array.isArray(post.tags) ? post.tags : [];

  return {
    ...post,
    categoryLabel,
    tags,
    minutes: readingMinutes(content),
    searchText: `${post.title} ${post.summary} ${categoryLabel} ${tags.join(" ")} ${stripMarkdown(content)}`.toLowerCase(),
  };
}

function matchesCurrentView(post) {
  const query = searchInput?.value.trim().toLowerCase() ?? "";
  const matchesFilter = activeFilter === "all" || post.categoryLabel === activeFilter;
  const matchesSearch = !query || post.searchText.includes(query);
  return matchesFilter && matchesSearch;
}

function renderFilters() {
  if (!filterList) return;

  const categories = [...new Set(posts.map((post) => post.categoryLabel).filter(Boolean))];
  const filters = [
    { label: "全部", value: "all" },
    ...categories.map((category) => ({ label: category, value: category })),
  ];

  filterList.innerHTML = `
    <span class="segment-indicator" aria-hidden="true"></span>
    ${filters
    .map(
      (filter) => `
        <button
          class="segment${filter.value === activeFilter ? " is-active" : ""}"
          type="button"
          role="tab"
          aria-selected="${filter.value === activeFilter}"
          data-filter="${escapeHtml(filter.value)}"
        >
          ${escapeHtml(filter.label)}
        </button>
      `,
    )
    .join("")}
  `;

  syncSegmentIndicator(false);
}

function syncSegmentIndicator(animate = true) {
  if (!filterList) return;

  const indicator = filterList.querySelector(".segment-indicator");
  const activeSegment = filterList.querySelector(".segment.is-active");
  if (!indicator || !activeSegment) return;

  const listRect = filterList.getBoundingClientRect();
  const activeRect = activeSegment.getBoundingClientRect();
  const x = activeRect.left - listRect.left;
  const y = activeRect.top - listRect.top;

  indicator.style.setProperty("--segment-x", `${x}px`);
  indicator.style.setProperty("--segment-y", `${y}px`);
  indicator.style.setProperty("--segment-width", `${activeRect.width}px`);
  indicator.style.setProperty("--segment-height", `${activeRect.height}px`);
  indicator.classList.toggle("is-ready", animate);
}

function renderMeta(post) {
  return `
    <time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time>
    <span>${escapeHtml(post.categoryLabel)}</span>
    <span>${post.minutes} 分钟</span>
  `;
}

function renderTagList(tags) {
  return tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
}

function postLink(post, className = "") {
  return `
    <a class="${className}" href="#post/${encodeURIComponent(post.slug)}">
      <span>${escapeHtml(formatDate(post.date))}</span>
      <strong>${escapeHtml(post.title)}</strong>
    </a>
  `;
}

function normalizedTagMap() {
  const byTag = new Map();

  posts.forEach((post) => {
    post.tags.forEach((tag) => {
      const key = tag.trim();
      if (!key) return;
      if (!byTag.has(key)) byTag.set(key, []);
      byTag.get(key).push(post);
    });
  });

  return new Map([...byTag.entries()].sort((a, b) => a[0].localeCompare(b[0], "zh-CN")));
}

function renderReaderToc() {
  if (!readerToc || !readerBody) return;

  const headings = [...readerBody.querySelectorAll("h1, h2, h3, h4")]
    .map((heading) => ({
      id: heading.id,
      level: Number(heading.tagName.slice(1)),
      text: heading.textContent.trim(),
    }))
    .filter((heading) => heading.id && heading.text);

  readerToc.hidden = false;
  readerToc.classList.toggle("is-progress-only", !headings.length);
  readerToc.innerHTML = `
    <div class="reader-toc-head">
      <p class="reader-toc-title">目录</p>
    </div>
    <div class="reading-progress-bar" aria-label="阅读进度">
      <span data-reading-progress-bar></span>
    </div>
    <p class="reading-progress-copy">阅读进度 <span data-reading-progress-text>0%</span></p>
    <nav class="toc-list" aria-label="文章标题导航">
      <span class="toc-active-indicator" aria-hidden="true"></span>
      ${
        headings.length
          ? headings
              .map(
                (heading) => `
            <a class="toc-link toc-level-${heading.level}" href="#${escapeHtml(heading.id)}" data-toc-target="${escapeHtml(heading.id)}">
              ${escapeHtml(heading.text)}
            </a>
          `,
              )
              .join("")
          : '<p class="toc-empty">这篇文章暂时没有小标题。</p>'
      }
    </nav>
  `;
}

function syncTocIndicator(activeLink) {
  const indicator = readerToc?.querySelector(".toc-active-indicator");
  const list = readerToc?.querySelector(".toc-list");
  if (!indicator || !list) return;

  if (!activeLink) {
    indicator.classList.remove("is-visible");
    return;
  }

  const linkRect = activeLink.getBoundingClientRect();
  const listRect = list.getBoundingClientRect();
  indicator.style.transform = `translate3d(0, ${linkRect.top - listRect.top}px, 0)`;
  indicator.style.height = `${linkRect.height}px`;
  indicator.classList.add("is-visible");
}

function prepareArticleImages() {
  if (!readerBody) return;

  readerBody.querySelectorAll(".article-image-block img").forEach((image) => {
    const markLoaded = () => {
      image.classList.remove("is-loading");
      image.classList.add("is-loaded");
    };

    if (image.complete && image.naturalWidth > 0) {
      markLoaded();
      return;
    }

    image.addEventListener("load", markLoaded, { once: true });
    image.addEventListener("error", markLoaded, { once: true });
  });
}

function updateActiveTocHeading() {
  if (!readerToc || !readerBody || !reader || reader.hidden) return;

  const links = [...readerToc.querySelectorAll("[data-toc-target]")];
  if (!links.length) {
    syncTocIndicator(null);
    return;
  }

  const headings = [...readerBody.querySelectorAll("h1, h2, h3, h4")].filter((heading) => heading.id);
  if (!headings.length) {
    syncTocIndicator(null);
    return;
  }

  const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height || 0;
  const activationLine = headerHeight + Math.min(150, Math.max(92, window.innerHeight * 0.18));
  let activeHeading = headings[0];

  headings.forEach((heading) => {
    if (heading.getBoundingClientRect().top <= activationLine) {
      activeHeading = heading;
    }
  });

  let activeLink = null;
  links.forEach((link) => {
    const isActive = link.dataset.tocTarget === activeHeading.id;
    link.classList.toggle("is-active", isActive);
    if (isActive) activeLink = link;
  });
  syncTocIndicator(activeLink);
}

function contentWithLegacyImages(content, images) {
  if (!Array.isArray(images) || !images.length) return String(content || "");

  const markdown = String(content || "");
  const legacyImages = images
    .filter((image) => image?.src && !markdown.includes(image.src))
    .map((image) => `![${String(image.alt || "文章图片").replace(/[\[\]\r\n]/g, " ")}](${image.src})`);

  return [markdown, ...legacyImages].filter(Boolean).join("\n\n");
}

function renderFeatured(post) {
  if (!featuredPost) return;

  if (!post) {
    featuredPost.classList.remove("is-list-leaving", "is-list-entering");
    featuredPost.hidden = true;
    return;
  }

  featuredPost.classList.remove("is-list-leaving", "is-list-entering");
  featuredPost.hidden = false;
  const manageLink = authorIsSignedIn()
    ? `<a class="manage-link featured-manage-link" href="./manage.html#post/${encodeURIComponent(post.slug)}">管理</a>`
    : "";
  featuredPost.innerHTML = `
    <a class="featured-post-link" href="#post/${encodeURIComponent(post.slug)}" aria-label="阅读文章：${escapeHtml(post.title)}">
      <div class="post-meta">${renderMeta(post)}</div>
      <h2>${escapeHtml(post.title)}</h2>
      <p>${escapeHtml(post.summary)}</p>
      <div class="tag-list">${renderTagList(post.tags)}</div>
    </a>
    ${manageLink}
  `;
}

function renderPostCard(post, index = 0) {
  const manageLink = authorIsSignedIn()
    ? `<a class="manage-link card-manage-link" href="./manage.html#post/${encodeURIComponent(post.slug)}">管理</a>`
    : "";
  const bentoPattern = ["post-card-wide", "", "post-card-tall", "", "post-card-soft", "", "post-card-wide"];
  const bentoClass = bentoPattern[index % bentoPattern.length];

  return `
    <article class="post-card${bentoClass ? ` ${bentoClass}` : ""}" style="--card-index: ${Math.min(index, 8)};">
      <a class="post-card-link" href="#post/${encodeURIComponent(post.slug)}">
        <div class="post-meta">${renderMeta(post)}</div>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.summary)}</p>
        <div class="tag-list">${renderTagList(post.tags)}</div>
      </a>
      ${manageLink}
    </article>
  `;
}

function renderList() {
  const filtered = posts.filter(matchesCurrentView);
  const featured = filtered.find((post) => post.featured) || filtered[0];
  const cards = filtered.filter((post) => post.slug !== featured?.slug);

  renderFeatured(featured);
  if (postList) {
    postList.innerHTML = cards.map(renderPostCard).join("");
  }

  if (emptyState) {
    emptyState.hidden = filtered.length > 0;
  }
}

function renderListWithMotion() {
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const hasRenderedList = (featuredPost?.innerHTML || postList?.innerHTML);

  window.clearTimeout(listTransitionTimer);

  if (reduceMotion || !hasRenderedList) {
    renderList();
    syncSegmentIndicator(false);
    return;
  }

  const containers = [featuredPost, postList].filter(Boolean);
  containers.forEach((container) => {
    container.classList.remove("is-list-entering");
    container.classList.add("is-list-leaving");
  });

  listTransitionTimer = window.setTimeout(() => {
    renderList();
    syncSegmentIndicator();
    containers.forEach((container) => {
      container.classList.remove("is-list-leaving");
      container.classList.add("is-list-entering");
    });

    listTransitionTimer = window.setTimeout(() => {
      containers.forEach((container) => container.classList.remove("is-list-entering"));
    }, 460);
  }, 150);
}

function renderArchive() {
  if (!archiveList) return;

  const groups = posts.reduce((acc, post) => {
    const date = new Date(post.date);
    const year = Number.isNaN(date.getTime()) ? "未定日期" : String(date.getFullYear());
    const month = Number.isNaN(date.getTime())
      ? "时间未定"
      : `${String(date.getMonth() + 1).padStart(2, "0")} 月`;
    const key = `${year}-${month}`;

    if (!acc.has(key)) {
      acc.set(key, { year, month, posts: [] });
    }
    acc.get(key).posts.push(post);
    return acc;
  }, new Map());

  archiveList.innerHTML = [...groups.values()]
    .map(
      (group) => `
        <section class="archive-group">
          <div class="archive-date">
            <strong>${escapeHtml(group.year)}</strong>
            <span>${escapeHtml(group.month)}</span>
          </div>
          <div class="archive-items">
            ${group.posts.map((post) => postLink(post, "archive-link")).join("")}
          </div>
        </section>
      `,
    )
    .join("");
}

function renderTags(selectedTag = "") {
  if (!tagCloud || !tagResults) return;

  const byTag = normalizedTagMap();
  tagCloud.innerHTML = [...byTag.entries()]
    .map(
      ([tag, taggedPosts]) => `
        <a class="tag-cloud-link${tag === selectedTag ? " is-active" : ""}" href="#tag/${encodeURIComponent(tag)}">
          <span>${escapeHtml(tag)}</span>
          <strong>${taggedPosts.length}</strong>
        </a>
      `,
    )
    .join("");

  if (!selectedTag) {
    tagResults.hidden = true;
    tagResults.innerHTML = "";
    return;
  }

  const taggedPosts = byTag.get(selectedTag) || [];
  tagResults.hidden = false;
  tagResults.innerHTML = `
    <div class="tag-result-header">
      <span>标签</span>
      <strong>${escapeHtml(selectedTag)}</strong>
    </div>
    <div class="tag-result-list">
      ${taggedPosts.map((post) => postLink(post, "tag-result-link")).join("")}
    </div>
  `;
}

function renderPostNeighbors(post) {
  if (!postNeighbors) return;

  const index = posts.findIndex((item) => item.slug === post.slug);
  const previous = index > 0 ? posts[index - 1] : null;
  const next = index >= 0 && index < posts.length - 1 ? posts[index + 1] : null;
  const related = posts
    .filter((item) => item.slug !== post.slug && item.tags.some((tag) => post.tags.includes(tag)))
    .slice(0, 3);
  const neighborCard = (item, label, emptyText, direction) =>
    item
      ? `
        <a class="neighbor-card neighbor-card-${direction}" href="#post/${encodeURIComponent(item.slug)}" aria-label="${escapeHtml(label)}：${escapeHtml(item.title)}">
          <span class="neighbor-kicker">${escapeHtml(label)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(formatDate(item.date))} · ${escapeHtml(item.summary || item.categoryLabel || "")}</small>
        </a>
      `
      : `
        <span class="neighbor-card neighbor-card-${direction} is-empty">
          <span class="neighbor-kicker">${escapeHtml(label)}</span>
          <strong>${escapeHtml(emptyText)}</strong>
          <small>继续从当前这篇慢慢读。</small>
        </span>
      `;

  postNeighbors.innerHTML = `
    <div class="neighbor-grid">
      ${neighborCard(previous, "上一篇", "已经是最新一篇", "prev")}
      ${neighborCard(next, "下一篇", "已经到最早一篇", "next")}
    </div>
    ${
      related.length
        ? `
          <section class="related-posts" aria-label="同标签文章推荐">
            <div class="related-heading">
              <span>同标签阅读</span>
              <a href="#tags">查看标签</a>
            </div>
            <div class="related-list">
              ${related.map((item) => postLink(item, "related-link")).join("")}
            </div>
          </section>
        `
        : ""
    }
  `;
}

function showListView() {
  closeImagePreview();
  stopReadingProgress();
  listViews.forEach((view) => {
    view.hidden = false;
  });
  if (reader) reader.hidden = true;
  if (archiveView) archiveView.hidden = true;
  if (tagsView) tagsView.hidden = true;
  renderList();
  updatePageMeta(siteTitle, siteDescription, "./index.html#articles");
  queueScriptHeroWriting();
}

function hideListView() {
  closeImagePreview();
  stopReadingProgress();
  listViews.forEach((view) => {
    view.hidden = true;
  });
  if (reader) reader.hidden = true;
  if (archiveView) archiveView.hidden = true;
  if (tagsView) tagsView.hidden = true;
  if (emptyState) emptyState.hidden = true;
}

function showArchiveView() {
  hideListView();
  if (archiveView) archiveView.hidden = false;
  renderArchive();
  updatePageMeta(`归档 - ${siteTitle}`, "按时间浏览灰玻璃日记的所有文章。", "./index.html#archive");
  archiveView?.scrollIntoView({ block: "start" });
}

function showTagsView(selectedTag = "") {
  hideListView();
  if (tagsView) tagsView.hidden = false;
  renderTags(selectedTag);
  updatePageMeta(
    selectedTag ? `${selectedTag} - 标签 - ${siteTitle}` : `标签 - ${siteTitle}`,
    selectedTag ? `浏览灰玻璃日记里标记为「${selectedTag}」的文章。` : "按标签浏览灰玻璃日记的文章。",
    selectedTag ? `./index.html#tag/${encodeURIComponent(selectedTag)}` : "./index.html#tags",
  );
  tagsView?.scrollIntoView({ block: "start" });
}

function showPost(slug) {
  const post = posts.find((item) => item.slug === slug);
  if (!post) {
    showListView();
    return;
  }

  hideListView();
  if (reader) {
    reader.hidden = false;
    reader.classList.remove("is-reader-entering");
  }

  if (readerMeta) readerMeta.innerHTML = renderMeta(post);
  if (readerTitle) readerTitle.textContent = post.title;
  if (floatingReaderTitleText) floatingReaderTitleText.textContent = post.title;
  if (readerSummary) readerSummary.textContent = post.summary;
  if (readerTags) readerTags.innerHTML = renderTagList(post.tags);
  if (readerBody) readerBody.innerHTML = markdownToHtml(contentWithLegacyImages(post.content, post.images));
  prepareArticleImages();
  if (articleSignature) articleSignature.hidden = false;
  if (articleSignatureName) articleSignatureName.textContent = profileName?.textContent?.trim() || "StaryTra 32";
  renderPostNeighbors(post);
  renderReaderToc();
  startReadingProgress();
  updatePageMeta(`${post.title} - ${siteTitle}`, post.summary || siteDescription, `./index.html#post/${encodeURIComponent(post.slug)}`);

  const readerActions = reader?.querySelector(".reader-actions");
  if (readerActions) {
    const manageLink = authorIsSignedIn()
      ? `<a class="secondary-button" href="./manage.html#post/${encodeURIComponent(post.slug)}">管理文章</a>`
      : "";
    readerActions.innerHTML = `
      <a class="back-link" href="#articles" data-back-to-list>返回文章</a>
      ${manageLink}
    `;
  }

  const transitionDelay = window.GlassBlogTransition?.isActive?.()
    ? (window.GlassBlogTransition?.timing?.enterDuration ?? 560) + 120
    : 80;
  window.setTimeout(() => {
    requestAnimationFrame(() => {
      reader?.classList.add("is-reader-entering");
    });
  }, transitionDelay);

  reader?.scrollIntoView({ block: "start" });
}

function route() {
  const postMatch = window.location.hash.match(/^#post\/(.+)$/);
  const tagMatch = window.location.hash.match(/^#tag\/(.+)$/);
  if (postMatch) {
    showPost(decodeURIComponent(postMatch[1]));
    return;
  }

  if (window.location.hash === "#archive") {
    showArchiveView();
    return;
  }

  if (window.location.hash === "#tags") {
    showTagsView();
    return;
  }

  if (tagMatch) {
    showTagsView(decodeURIComponent(tagMatch[1]));
    return;
  }

  showListView();
}

function isBlogRouteChange(hash) {
  return hash === "" || hash === "#articles" || hash === "#archive" || hash === "#tags" || /^#post\/.+/.test(hash) || /^#tag\/.+/.test(hash);
}

function routeWithTransition() {
  if (isBlogRouteChange(window.location.hash) && window.GlassBlogTransition?.run) {
    window.GlassBlogTransition.run(route);
    return;
  }

  route();
}

window.GlassBlogApp = {
  route,
  routeWithTransition,
  syncChromeState,
};

function scrollToArticleHeading(target) {
  if (!target) return;
  const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height || 0;
  const offset = headerHeight + 42;
  const top = target.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({
    top: Math.max(0, top),
    behavior: "smooth",
  });
}

function readingProgressValue() {
  if (!reader || reader.hidden || !readerBody) return 0;

  const rect = readerBody.getBoundingClientRect();
  const viewport = window.innerHeight || document.documentElement.clientHeight;
  const total = Math.max(1, rect.height - viewport * 0.72);
  const read = Math.min(total, Math.max(0, -rect.top + viewport * 0.18));

  return Math.min(1, Math.max(0, read / total));
}

function updateReadingProgress() {
  const progress = readingProgressValue();
  const bar = readerToc?.querySelector("[data-reading-progress-bar]");
  const text = readerToc?.querySelector("[data-reading-progress-text]");

  if (bar) {
    bar.style.transform = `scaleX(${progress})`;
  }

  if (text) {
    text.textContent = `${Math.round(progress * 100)}%`;
  }

  if (bottomReadingProgressBar) {
    bottomReadingProgressBar.style.transform = `scaleX(${progress})`;
  }

  if (floatingReadingProgressBar) {
    floatingReadingProgressBar.style.transform = `scaleX(${progress})`;
  }
}

function syncChromeState() {
  document.body.classList.toggle("is-scrolled", window.scrollY > 18);

  const reading = Boolean(reader && !reader.hidden);
  document.body.classList.toggle("is-reading-post", reading);

  if (floatingReaderTitle) {
    const readerTop = reader?.getBoundingClientRect().top ?? 0;
    const showTitle = reading && readerTop < -72;
    floatingReaderTitle.hidden = !showTitle;
  }

  if (backToTopButton) {
    backToTopButton.hidden = !(reading && window.scrollY > 520);
  }
}

function queueReadingProgressUpdate() {
  if (activeProgressFrame) return;
  activeProgressFrame = requestAnimationFrame(() => {
    activeProgressFrame = 0;
    syncChromeState();
    updateReadingProgress();
    updateActiveTocHeading();
  });
}

function startReadingProgress() {
  stopReadingProgress();
  if (bottomReadingProgress) bottomReadingProgress.hidden = false;
  syncChromeState();
  updateReadingProgress();
  updateActiveTocHeading();
  window.addEventListener("scroll", queueReadingProgressUpdate, { passive: true });
  window.addEventListener("resize", queueReadingProgressUpdate);
}

function stopReadingProgress() {
  if (activeProgressFrame) {
    cancelAnimationFrame(activeProgressFrame);
    activeProgressFrame = 0;
  }
  window.removeEventListener("scroll", queueReadingProgressUpdate);
  window.removeEventListener("resize", queueReadingProgressUpdate);
  if (bottomReadingProgress) bottomReadingProgress.hidden = true;
  if (bottomReadingProgressBar) bottomReadingProgressBar.style.transform = "scaleX(0)";
  if (backToTopButton) backToTopButton.hidden = true;
  if (articleSignature) articleSignature.hidden = true;
  if (floatingReaderTitle) floatingReaderTitle.hidden = true;
  if (floatingReadingProgressBar) floatingReadingProgressBar.style.transform = "scaleX(0)";
  readerToc?.querySelectorAll("[data-toc-target]").forEach((link) => link.classList.remove("is-active"));
  syncTocIndicator(null);
  document.body.classList.remove("is-reading-post");
}

function updateStats() {
  if (totalPosts) totalPosts.textContent = String(posts.length);
  if (latestDate) latestDate.textContent = formatDate(posts[0]?.date || "");
}

function startProfileStatusLoop() {
  if (!profileStatus) return;

  const phrases = ["writing slowly", "thinking clearly", "reading softly", "building quietly"];
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let index = 0;
  profileStatus.textContent = phrases[index];

  if (reduceMotion || profileStatusTimer) return;

  profileStatusTimer = window.setInterval(() => {
    index = (index + 1) % phrases.length;
    profileStatus.classList.add("is-changing");
    window.setTimeout(() => {
      profileStatus.textContent = phrases[index];
      profileStatus.classList.remove("is-changing");
    }, 180);
  }, 4800);
}

filterList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button || !filterList.contains(button)) return;

  const nextFilter = button.dataset.filter || "all";
  if (nextFilter === activeFilter && !window.location.hash.startsWith("#post/")) return;

  activeFilter = nextFilter;

  filterList.querySelectorAll("[data-filter]").forEach((item) => {
    const isActive = item === button;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-selected", String(isActive));
  });
  syncSegmentIndicator();

  if (window.location.hash.startsWith("#post/")) {
    window.location.hash = "#articles";
    return;
  }

  renderListWithMotion();
});

searchInput?.addEventListener("input", () => {
  if (window.location.hash.startsWith("#post/")) {
    window.location.hash = "#articles";
    return;
  }
  renderListWithMotion();
});

window.addEventListener("hashchange", routeWithTransition);
window.addEventListener("scroll", syncChromeState, { passive: true });
window.addEventListener("resize", syncChromeState);
window.addEventListener("resize", () => syncSegmentIndicator(false));

document.addEventListener("click", async (event) => {
  const previewClose = event.target.closest("[data-image-preview-close]");
  if (previewClose) {
    closeImagePreview();
    return;
  }

  if (imagePreview && event.target === imagePreview) {
    closeImagePreview();
    return;
  }

  const articleImage = event.target.closest(".article-image-block img");
  if (articleImage) {
    openImagePreview(articleImage);
    return;
  }

  const tocLink = event.target.closest("[data-toc-target]");
  if (tocLink) {
    event.preventDefault();
    const target = document.getElementById(tocLink.dataset.tocTarget);
    scrollToArticleHeading(target);
    readerToc?.querySelectorAll("[data-toc-target]").forEach((link) => {
      link.classList.toggle("is-active", link === tocLink);
    });
    syncTocIndicator(tocLink);
    return;
  }

  const backToTop = event.target.closest("[data-back-to-top]");
  if (backToTop) {
    event.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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
  if (event.key === "Escape" && imagePreview && !imagePreview.hidden) {
    closeImagePreview();
  }
});

function openImagePreview(image) {
  if (!imagePreview || !imagePreviewImg || !image) return;

  imagePreviewImg.src = image.currentSrc || image.src;
  imagePreviewImg.alt = image.alt || "";

  if (imagePreviewCaption) {
    imagePreviewCaption.textContent = image.closest("figure")?.querySelector("figcaption")?.textContent || image.alt || "";
    imagePreviewCaption.hidden = !imagePreviewCaption.textContent.trim();
  }

  imagePreview.hidden = false;
  document.body.classList.add("is-previewing-image");
}

function closeImagePreview() {
  if (!imagePreview) return;
  imagePreview.hidden = true;
  document.body.classList.remove("is-previewing-image");

  if (imagePreviewImg) {
    imagePreviewImg.removeAttribute("src");
    imagePreviewImg.alt = "";
  }
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
  const loadedPosts = await loadPosts();
  const localPosts = loadLocalPublishedPosts();

  posts = mergePosts(loadedPosts, localPosts)
    .map(normalizePost)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  renderFilters();
  updateStats();
  startProfileStatusLoop();
  if (loadingState) loadingState.hidden = true;
  route();
  syncChromeState();
}

if (ambient || ambientBarA || ambientBarB) {
  requestAnimationFrame(animateAmbientBars);
}

init();
