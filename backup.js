(function () {
  const publishedPostsKey = "glass-blog-published-posts";
  const hiddenPostsKey = "glass-blog-hidden-posts";
  const draftKey = "glass-blog-compose-draft";
  const draftsKey = "glass-blog-saved-drafts";
  const currentDraftIdKey = "glass-blog-current-draft-id";
  const maxImportBytes = 24 * 1024 * 1024;

  const exportButtons = [...document.querySelectorAll("[data-export-backup]")];
  const importButtons = [...document.querySelectorAll("[data-import-backup]")];
  const backupInput = document.querySelector("[data-backup-input]");
  const statusTarget =
    document.querySelector("[data-backup-status]") ||
    document.querySelector("[data-manager-status]") ||
    document.querySelector("[data-status]");

  function setStatus(message) {
    if (statusTarget) statusTarget.textContent = message;
  }

  function readJsonStorage(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
      if (Array.isArray(fallback)) return Array.isArray(value) ? value : fallback;
      if (fallback === null) return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
      if (typeof fallback === "object") return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJsonStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function cleanString(value, fallback = "", maxLength = 1200000) {
    return String(value ?? fallback).slice(0, maxLength);
  }

  function cleanStringArray(value, maxItems = 40) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => cleanString(item, "", 80).trim())
      .filter(Boolean)
      .slice(0, maxItems);
  }

  function cleanPost(post) {
    if (!post || typeof post !== "object") return null;
    const slug = cleanString(post.slug, "", 120).trim();
    if (!slug) return null;

    return {
      slug,
      title: cleanString(post.title, "未命名文章", 180).trim() || "未命名文章",
      date: cleanString(post.date, new Date().toISOString().slice(0, 10), 24),
      category: cleanString(post.category || post.categoryLabel, "文章", 80).trim() || "文章",
      summary: cleanString(post.summary, "", 500),
      tags: cleanStringArray(post.tags),
      content: cleanString(post.content, ""),
      images: Array.isArray(post.images) ? post.images.slice(0, 80) : [],
      featured: Boolean(post.featured),
      source: "local",
      file: cleanString(post.file || `local:${slug}`, `local:${slug}`, 240),
      publishedAt: cleanString(post.publishedAt || post.updatedAt || new Date().toISOString(), "", 40),
      updatedAt: cleanString(post.updatedAt || post.publishedAt || new Date().toISOString(), "", 40),
    };
  }

  function cleanDraft(draft) {
    if (!draft || typeof draft !== "object") return null;
    const post = cleanPost(draft);
    if (!post) return null;
    const id = cleanString(draft.id || `draft-${post.slug}`, "", 140).trim();

    return {
      ...post,
      id,
      createdAt: cleanString(draft.createdAt || draft.updatedAt || new Date().toISOString(), "", 40),
      updatedAt: cleanString(draft.updatedAt || new Date().toISOString(), "", 40),
    };
  }

  function uniqueBy(items, keyGetter) {
    const map = new Map();
    items.forEach((item) => {
      const key = keyGetter(item);
      if (key) map.set(key, item);
    });
    return [...map.values()];
  }

  function normalizeBackup(payload) {
    if (!payload || typeof payload !== "object") {
      throw new Error("备份文件格式不正确");
    }

    const localPosts = (Array.isArray(payload.localPosts) ? payload.localPosts : payload.posts || [])
      .map(cleanPost)
      .filter(Boolean);
    const drafts = (Array.isArray(payload.drafts) ? payload.drafts : [])
      .map(cleanDraft)
      .filter(Boolean);
    const currentDraft = cleanDraft(payload.currentDraft);
    const hiddenPosts = cleanStringArray(payload.hiddenPosts || payload.hiddenSlugs || [], 500);

    if (!localPosts.length && !drafts.length && !currentDraft && !hiddenPosts.length) {
      throw new Error("备份里没有可恢复的文章或草稿");
    }

    return {
      localPosts: uniqueBy(localPosts, (post) => post.slug),
      drafts: uniqueBy(drafts, (draft) => draft.id || draft.slug),
      currentDraft,
      hiddenPosts,
      currentDraftId: cleanString(payload.currentDraftId || currentDraft?.id || "", "", 140),
    };
  }

  function buildBackup() {
    document.dispatchEvent(new CustomEvent("glass-blog:before-backup-export"));

    return {
      app: "ios-glass-blog",
      version: 1,
      exportedAt: new Date().toISOString(),
      exportedFrom: window.location.href,
      note: "This backup contains local posts, drafts, and hidden-post records. Author password data is intentionally excluded.",
      localPosts: readJsonStorage(publishedPostsKey, []),
      drafts: readJsonStorage(draftsKey, []),
      currentDraft: readJsonStorage(draftKey, null),
      currentDraftId: localStorage.getItem(currentDraftIdKey) || "",
      hiddenPosts: readJsonStorage(hiddenPostsKey, []),
    };
  }

  function downloadBackup() {
    const backup = buildBackup();
    const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `glass-blog-backup-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("已导出本机文章和草稿备份，不包含作者密码。");
  }

  function mergeDrafts(currentDrafts, importedDrafts) {
    const current = Array.isArray(currentDrafts) ? currentDrafts : [];
    const importedKeys = new Set(importedDrafts.map((draft) => draft.id || draft.slug));
    return [...importedDrafts, ...current.filter((draft) => !importedKeys.has(draft.id || draft.slug))];
  }

  async function importBackup(file) {
    if (!file) return;
    if (file.size > maxImportBytes) {
      setStatus("备份文件太大，建议先清理旧版 base64 图片后再导入。");
      return;
    }

    try {
      const payload = normalizeBackup(JSON.parse(await file.text()));
      const confirmed = window.confirm(
        `将恢复 ${payload.localPosts.length} 篇本机文章、${payload.drafts.length} 篇草稿和 ${payload.hiddenPosts.length} 条隐藏记录。\n\n遇到相同 slug 或草稿 id 会覆盖。继续吗？`,
      );
      if (!confirmed) return;

      const currentPosts = readJsonStorage(publishedPostsKey, []);
      const currentPostSlugs = new Set(payload.localPosts.map((post) => post.slug));
      const nextPosts = [...payload.localPosts, ...currentPosts.filter((post) => !currentPostSlugs.has(post.slug))];
      const nextDrafts = mergeDrafts(readJsonStorage(draftsKey, []), payload.drafts);

      writeJsonStorage(publishedPostsKey, nextPosts);
      writeJsonStorage(draftsKey, nextDrafts);
      writeJsonStorage(hiddenPostsKey, payload.hiddenPosts);

      if (payload.currentDraft) {
        writeJsonStorage(draftKey, payload.currentDraft);
      }
      if (payload.currentDraftId) {
        localStorage.setItem(currentDraftIdKey, payload.currentDraftId);
      }

      setStatus("备份已恢复，页面马上刷新。");
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setStatus(error?.message || "备份导入失败，请检查 JSON 文件。");
    }
  }

  exportButtons.forEach((button) => {
    button.addEventListener("click", downloadBackup);
  });

  importButtons.forEach((button) => {
    button.addEventListener("click", () => backupInput?.click());
  });

  backupInput?.addEventListener("change", () => {
    importBackup(backupInput.files?.[0]).finally(() => {
      backupInput.value = "";
    });
  });
})();
