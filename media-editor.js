(function () {
  const imageLinePattern = /^\s*!\[([^\]]*)\]\(([^)]+)\)\s*$/;
  const maxImageEdge = 1800;
  const imageQuality = 0.82;
  const defaultAssetBasePath = "./assets/uploads";

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function createId(prefix = "media") {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function cleanAlt(value) {
    return String(value || "文章图片")
      .replace(/[\[\]\r\n]/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "文章图片";
  }

  function cleanHighlightColor(value) {
    const match = String(value || "").trim().match(/^#?([0-9a-fA-F]{6})$/);
    return match ? `#${match[1].toLowerCase()}` : "#ffd966";
  }

  function findHighlightRange(value, start, end = start) {
    const pattern = /==(?:\{#[0-9a-fA-F]{6}\})?([\s\S]*?)==/g;
    let match;

    while ((match = pattern.exec(value))) {
      const prefix = match[0].match(/^==(?:\{#[0-9a-fA-F]{6}\})?/)[0];
      const fullStart = match.index;
      const fullEnd = fullStart + match[0].length;
      const contentStart = fullStart + prefix.length;
      const contentEnd = fullEnd - 2;

      if (start >= contentStart && end <= contentEnd) {
        return { fullStart, fullEnd, contentStart, contentEnd };
      }
    }

    return null;
  }

  function parseMarkdown(markdown) {
    const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
    const blocks = [];
    let textLines = [];
    let inCode = false;

    const flushText = () => {
      if (!textLines.length) return;
      blocks.push({ type: "text", text: textLines.join("\n") });
      textLines = [];
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("```")) {
        inCode = !inCode;
        textLines.push(line);
        return;
      }

      if (!inCode) {
        const image = trimmed.match(imageLinePattern);
        if (image) {
          flushText();
          blocks.push({
            type: "image",
            id: createId(),
            alt: cleanAlt(image[1]),
            src: image[2],
          });
          return;
        }

        if (!trimmed) {
          flushText();
          return;
        }
      }

      textLines.push(line);
    });

    flushText();
    return blocks.length ? blocks : [{ type: "text", text: "" }];
  }

  function serializeBlocks(blocks) {
    return blocks
      .map((block) => {
        if (block.type === "image") {
          if (!block.src) return "";
          return `![${cleanAlt(block.alt)}](${block.src})`;
        }
        return block.text || "";
      })
      .filter((block) => block.trim().length > 0)
      .join("\n\n");
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  function blobToDataUrl(blob) {
    return fileToDataUrl(blob);
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    });
  }

  function extensionFromFile(file, fallback = "webp") {
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (extension) return extension;

    const byType = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/svg+xml": "svg",
    };

    return byType[file.type] || fallback;
  }

  function safeFilename(value) {
    return String(value || "post")
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "post";
  }

  async function optimizeImageFile(file) {
    if (file.type === "image/svg+xml" || file.type === "image/gif") {
      return { blob: file, extension: extensionFromFile(file) };
    }

    const original = await blobToDataUrl(file);

    if (file.type === "image/svg+xml") {
      return { blob: file, extension: extensionFromFile(file) };
    }

    try {
      const image = await loadImage(original);
      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;
      if (!sourceWidth || !sourceHeight) return original;

      const scale = Math.min(1, maxImageEdge / Math.max(sourceWidth, sourceHeight));
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d", { alpha: true });
      if (!context) return original;

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, width, height);

      const webpBlob = await canvasToBlob(canvas, "image/webp", imageQuality);
      if (webpBlob && webpBlob.size < file.size) {
        return { blob: webpBlob, extension: "webp" };
      }

      if (file.type === "image/jpeg" || file.type === "image/jpg") {
        const jpegBlob = await canvasToBlob(canvas, "image/jpeg", imageQuality);
        if (jpegBlob && jpegBlob.size < file.size) {
          return { blob: jpegBlob, extension: "jpg" };
        }
      }

      return { blob: file, extension: extensionFromFile(file) };
    } catch {
      return { blob: file, extension: extensionFromFile(file) };
    }
  }

  async function verifyPermission(handle) {
    const options = { mode: "readwrite" };
    if ((await handle.queryPermission?.(options)) === "granted") return true;
    if ((await handle.requestPermission?.(options)) === "granted") return true;
    return false;
  }

  function findWrappedRange(value, position, before, after) {
    const beforeStart = value.lastIndexOf(before, position);
    if (beforeStart === -1) return null;

    const contentStart = beforeStart + before.length;
    const afterStart = value.indexOf(after, contentStart);
    if (afterStart === -1 || position > afterStart) return null;

    return {
      beforeStart,
      contentStart,
      afterStart,
      afterEnd: afterStart + after.length,
    };
  }

  class GlassBlogMediaEditor {
    constructor(options) {
      this.source = options.source;
      this.root = options.root;
      this.dropTarget = options.dropTarget || options.root;
      this.onChange = options.onChange || (() => {});
      this.onStatus = options.onStatus || (() => {});
      this.assetFolderButton = options.assetFolderButton || null;
      this.assetBasePath = options.assetBasePath || defaultAssetBasePath;
      this.filenamePrefixProvider = options.filenamePrefixProvider || (() => "post");
      this.blocks = parseMarkdown(this.source?.value || "");
      this.draggingId = "";
      this.activeBlockIndex = 0;
      this.uploadsDirectoryHandle = null;
      this.pendingUploads = new Map();

      this.source?.classList.add("is-source-hidden");
      this.render();
      this.bind();
      this.updateAssetButton();
      this.syncSource(false);
    }

    bind() {
      this.root.addEventListener("input", (event) => {
        const textBlock = event.target.closest("[data-rich-text-block]");
        const altInput = event.target.closest("[data-media-alt]");

        if (textBlock) {
          const index = Number(textBlock.dataset.blockIndex);
          if (this.blocks[index]?.type === "text") {
            this.blocks[index].text = textBlock.value;
            this.activeBlockIndex = index;
            this.autoSize(textBlock, { allowShrink: false });
            this.notifyChange();
          }
          return;
        }

        if (altInput) {
          const figure = altInput.closest("[data-media-id]");
          const block = this.findImageBlock(figure?.dataset.mediaId);
          if (block) {
            block.alt = altInput.value;
            this.notifyChange();
          }
        }
      });

      this.root.addEventListener("focusin", (event) => {
        const textBlock = event.target.closest("[data-rich-text-block]");
        if (textBlock) {
          this.activeBlockIndex = Number(textBlock.dataset.blockIndex);
        }
      });

      this.root.addEventListener("focusout", (event) => {
        const textBlock = event.target.closest("[data-rich-text-block]");
        if (textBlock) {
          this.autoSize(textBlock, { preserveScroll: true });
        }
      });

      this.root.addEventListener("click", (event) => {
        const removeButton = event.target.closest("[data-media-remove]");
        const moveButton = event.target.closest("[data-media-move]");

        if (removeButton) {
          this.removeImage(removeButton.dataset.mediaRemove);
          return;
        }

        if (moveButton) {
          this.moveImageByButton(moveButton.dataset.mediaMove, moveButton.closest("[data-media-id]")?.dataset.mediaId);
        }
      });

      this.root.addEventListener("dragstart", (event) => {
        const figure = event.target.closest("[data-media-id]");
        if (!figure || event.target.closest("button, input")) return;

        this.draggingId = figure.dataset.mediaId || "";
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", this.draggingId);
        figure.classList.add("is-dragging");
      });

      this.root.addEventListener("dragend", () => {
        this.draggingId = "";
        this.root.querySelectorAll(".media-block.is-dragging").forEach((block) => {
          block.classList.remove("is-dragging");
        });
      });

      [this.root, this.dropTarget].forEach((target) => {
        if (!target) return;

        target.addEventListener("dragover", (event) => {
          if (this.hasImageFiles(event.dataTransfer) || this.draggingId) {
            event.preventDefault();
            event.dataTransfer.dropEffect = this.draggingId ? "move" : "copy";
          }
        });

        target.addEventListener("drop", (event) => {
          this.handleDrop(event);
        });
      });

      this.dropTarget?.addEventListener("paste", (event) => {
        const files = [...(event.clipboardData?.files || [])].filter((file) => file.type.startsWith("image/"));
        if (!files.length) return;

        event.preventDefault();
        this.importFiles(files, this.getActiveTextTarget());
      });

      this.assetFolderButton?.addEventListener("click", () => {
        this.connectAssetFolder();
      });
    }

    render(focusIndex = null) {
      this.root.innerHTML = this.blocks
        .map((block, index) => {
          if (block.type === "image") {
            const statusText = block.uploadState === "uploading"
              ? "上传中"
              : block.uploadState === "failed"
                ? "上传失败"
                : block.src
                  ? "已上传"
                  : "待上传";
            const displaySrc = block.previewSrc || block.src;
            return `
              <figure class="media-block${block.uploadState ? ` is-${escapeHtml(block.uploadState)}` : ""}" draggable="true" data-media-id="${escapeHtml(block.id)}" data-block-index="${index}">
                <div class="media-block-frame">
                  ${displaySrc ? `<img src="${escapeHtml(displaySrc)}" alt="${escapeHtml(block.alt || "文章图片")}" draggable="false" />` : ""}
                  <span class="media-block-status">${escapeHtml(statusText)}</span>
                </div>
                <figcaption class="media-block-tools">
                  <input data-media-alt value="${escapeHtml(block.alt || "")}" aria-label="图片替代文字" placeholder="图片描述" />
                  <button type="button" data-media-move="up" aria-label="上移图片">上移</button>
                  <button type="button" data-media-move="down" aria-label="下移图片">下移</button>
                  <button type="button" data-media-remove="${escapeHtml(block.id)}" aria-label="删除图片">删除</button>
                </figcaption>
              </figure>
            `;
          }

          return `
            <textarea
              class="rich-text-block"
              data-rich-text-block
              data-block-index="${index}"
              rows="1"
              aria-label="正文段落"
              placeholder="${index === 0 ? "从这里开始写正文。" : "继续写"}"
            >${escapeHtml(block.text || "")}</textarea>
          `;
        })
        .join("");

      this.root.querySelectorAll("[data-rich-text-block]").forEach((textarea) => {
        this.autoSize(textarea);
      });

      if (focusIndex !== null) {
        const target = this.root.querySelector(`[data-rich-text-block][data-block-index="${focusIndex}"]`);
        target?.focus({ preventScroll: true });
      }
    }

    autoSize(textarea, options = {}) {
      const { allowShrink = true, preserveScroll = false } = options;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      const currentHeight = textarea.offsetHeight;

      if (allowShrink) {
        textarea.style.height = "auto";
      }

      const nextHeight = Math.max(84, textarea.scrollHeight);
      if (allowShrink || nextHeight > currentHeight + 1 || !textarea.style.height) {
        textarea.style.height = `${nextHeight}px`;
      }

      if (preserveScroll) {
        window.scrollTo(scrollX, scrollY);
        requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
      }
    }

    updateAssetButton() {
      if (!this.assetFolderButton) return;

      if (window.GlassBlogRemote?.isConfigured?.()) {
        this.assetFolderButton.classList.add("is-connected");
        this.assetFolderButton.textContent = "云端已连";
        this.assetFolderButton.title = "图片会自动上传到 GitHub，不需要选择本地目录";
        return;
      }

      const connected = Boolean(this.uploadsDirectoryHandle);
      this.assetFolderButton.classList.toggle("is-connected", connected);
      this.assetFolderButton.textContent = connected ? "目录已连" : "图片目录";
    }

    async connectAssetFolder() {
      if (window.GlassBlogRemote?.isConfigured?.()) {
        this.updateAssetButton();
        this.onStatus("线上发布模式会自动把图片上传到 GitHub，不需要选择本地图片目录。");
        return true;
      }

      if (!window.showDirectoryPicker) {
        this.onStatus("当前浏览器不支持自动写入图片文件夹。请用 Chrome 或 Edge 打开本地预览。");
        return false;
      }

      try {
        this.onStatus("请选择博客项目根目录 ios-glass-blog");
        const rootHandle = await window.showDirectoryPicker({ mode: "readwrite" });
        const allowed = await verifyPermission(rootHandle);

        if (!allowed) {
          this.onStatus("没有获得文件夹写入权限，图片不会导入。");
          return false;
        }

        if (rootHandle.name !== "assets") {
          try {
            await rootHandle.getFileHandle("index.html");
          } catch {
            this.onStatus("请选择 ios-glass-blog 项目根目录，或项目里的 assets 文件夹。");
            return false;
          }
        }

        const assetsHandle =
          rootHandle.name === "assets"
            ? rootHandle
            : await rootHandle.getDirectoryHandle("assets", { create: true });

        this.uploadsDirectoryHandle = await assetsHandle.getDirectoryHandle("uploads", { create: true });
        this.updateAssetButton();
        this.onStatus("图片目录已连接，之后拖入图片会保存到 assets/uploads。");
        return true;
      } catch {
        this.onStatus("没有连接图片目录。为了避免卡顿，图片不会保存成 base64。");
        return false;
      }
    }

    async ensureAssetFolder() {
      if (window.GlassBlogRemote?.isConfigured?.()) return true;
      if (this.uploadsDirectoryHandle) return true;
      return this.connectAssetFolder();
    }

    async saveImageFile(file, index) {
      if (window.GlassBlogRemote?.isConfigured?.()) {
        const optimized = await optimizeImageFile(file);
        const uploadFile = new File(
          [optimized.blob],
          `${safeFilename(this.filenamePrefixProvider())}-${Date.now()}-${index + 1}.${optimized.extension}`,
          { type: optimized.blob.type || file.type || "application/octet-stream" },
        );
        const uploaded = await window.GlassBlogRemote.uploadFile(uploadFile, this.filenamePrefixProvider(), index);

        return {
          src: uploaded.src,
          bytesBefore: file.size,
          bytesAfter: optimized.blob.size,
        };
      }

      const ready = await this.ensureAssetFolder();
      if (!ready) return null;

      const optimized = await optimizeImageFile(file);
      const prefix = safeFilename(this.filenamePrefixProvider());
      const filename = `${prefix}-${Date.now()}-${index + 1}.${optimized.extension}`;
      const fileHandle = await this.uploadsDirectoryHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();

      await writable.write(optimized.blob);
      await writable.close();

      return {
        src: `${this.assetBasePath}/${filename}`,
        bytesBefore: file.size,
        bytesAfter: optimized.blob.size,
      };
    }

    notifyChange() {
      if (this.source) {
        this.source.dataset.mediaDirty = "true";
      }
      this.onChange();
    }

    syncSource(emit = true) {
      if (this.source) {
        this.source.value = serializeBlocks(this.blocks);
        delete this.source.dataset.mediaDirty;
      }

      if (emit) {
        this.onChange();
      }
    }

    getValue() {
      this.syncSource(false);
      return this.source?.value || "";
    }

    setValue(markdown, legacyImages = []) {
      this.releasePreviewUrls();
      this.blocks = parseMarkdown(markdown);
      this.appendLegacyImages(legacyImages);
      this.render();
      this.syncSource(false);
    }

    getImages() {
      return this.blocks
        .filter((block) => block.type === "image")
        .map(({ id, alt, src }) => ({ id, alt, src }));
    }

    appendLegacyImages(images) {
      if (!Array.isArray(images) || !images.length) return;

      const existingSources = new Set(this.blocks.filter((block) => block.type === "image").map((block) => block.src));
      const legacyBlocks = images
        .filter((image) => image?.src && !existingSources.has(image.src))
        .map((image) => ({
          type: "image",
          id: image.id || createId(),
          alt: cleanAlt(image.alt),
          src: image.src,
        }));

      if (legacyBlocks.length) {
        this.blocks.push(...legacyBlocks);
      }
    }

    findImageBlock(id) {
      return this.blocks.find((block) => block.type === "image" && block.id === id);
    }

    releasePreviewUrls() {
      this.blocks.forEach((block) => {
        if (block.previewSrc?.startsWith("blob:")) {
          URL.revokeObjectURL(block.previewSrc);
        }
      });
    }

    activeTextArea() {
      let textarea = this.root.querySelector(`[data-rich-text-block][data-block-index="${this.activeBlockIndex}"]`);
      if (!textarea) {
        let lastTextIndex = -1;
        for (let index = this.blocks.length - 1; index >= 0; index -= 1) {
          if (this.blocks[index]?.type === "text") {
            lastTextIndex = index;
            break;
          }
        }
        this.activeBlockIndex = lastTextIndex >= 0 ? lastTextIndex : this.ensureTrailingTextBlock();
        textarea = this.root.querySelector(`[data-rich-text-block][data-block-index="${this.activeBlockIndex}"]`);
      }

      return textarea;
    }

    ensureTrailingTextBlock() {
      this.blocks.push({ type: "text", text: "" });
      this.render();
      return this.blocks.length - 1;
    }

    replaceText(index, text, selectionStart, selectionEnd) {
      const block = this.blocks[index];
      if (!block || block.type !== "text") return;

      block.text = text;
      this.activeBlockIndex = index;
      this.render(index);
      const textarea = this.activeTextArea();
      if (textarea) {
        textarea.setSelectionRange(selectionStart, selectionEnd);
        this.autoSize(textarea);
      }
      this.notifyChange();
    }

    wrapSelection(before, after = before, fallback = "文字") {
      const textarea = this.activeTextArea();
      if (!textarea) return;

      const index = Number(textarea.dataset.blockIndex);
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const selected = value.slice(start, end) || fallback;
      const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
      const cursorStart = start + before.length;
      const cursorEnd = cursorStart + selected.length;

      this.replaceText(index, next, cursorStart, cursorEnd);
    }

    toggleWrap(before, after = before, fallback = "文字") {
      const textarea = this.activeTextArea();
      if (!textarea) return;

      const index = Number(textarea.dataset.blockIndex);
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const selected = value.slice(start, end);

      if (selected.startsWith(before) && selected.endsWith(after) && selected.length > before.length + after.length) {
        const unwrapped = selected.slice(before.length, selected.length - after.length);
        this.replaceText(index, `${value.slice(0, start)}${unwrapped}${value.slice(end)}`, start, start + unwrapped.length);
        return;
      }

      if (value.slice(start - before.length, start) === before && value.slice(end, end + after.length) === after) {
        const nextStart = start - before.length;
        this.replaceText(
          index,
          `${value.slice(0, start - before.length)}${selected}${value.slice(end + after.length)}`,
          nextStart,
          nextStart + selected.length,
        );
        return;
      }

      if (start === end) {
        const wrappedRange = findWrappedRange(value, start, before, after);
        if (wrappedRange) {
          const inner = value.slice(wrappedRange.contentStart, wrappedRange.afterStart);
          const nextPosition = Math.max(
            wrappedRange.beforeStart,
            Math.min(start - before.length, wrappedRange.beforeStart + inner.length),
          );
          this.replaceText(
            index,
            `${value.slice(0, wrappedRange.beforeStart)}${inner}${value.slice(wrappedRange.afterEnd)}`,
            nextPosition,
            nextPosition,
          );
          return;
        }
      }

      this.wrapSelection(before, after, fallback);
    }

    applyHighlight(color = "#ffd966", fallback = "重点文字") {
      const textarea = this.activeTextArea();
      if (!textarea) return;

      const index = Number(textarea.dataset.blockIndex);
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const selected = value.slice(start, end);
      const safeColor = cleanHighlightColor(color);
      const prefix = `=={${safeColor}}`;
      const suffix = "==";
      const selectedMatch = selected.match(/^==(?:\{#[0-9a-fA-F]{6}\})?([\s\S]+?)==$/);

      if (selectedMatch) {
        const inner = selectedMatch[1];
        const next = `${value.slice(0, start)}${prefix}${inner}${suffix}${value.slice(end)}`;
        const cursorStart = start + prefix.length;
        this.replaceText(index, next, cursorStart, cursorStart + inner.length);
        return;
      }

      const existing = findHighlightRange(value, start, end);
      if (existing) {
        const inner = value.slice(existing.contentStart, existing.contentEnd);
        const relativeStart = Math.max(0, start - existing.contentStart);
        const relativeEnd = Math.max(relativeStart, end - existing.contentStart);
        const next = `${value.slice(0, existing.fullStart)}${prefix}${inner}${suffix}${value.slice(existing.fullEnd)}`;
        const cursorStart = existing.fullStart + prefix.length + relativeStart;
        const cursorEnd = existing.fullStart + prefix.length + relativeEnd;
        this.replaceText(index, next, cursorStart, cursorEnd);
        return;
      }

      const text = selected || fallback;
      const next = `${value.slice(0, start)}${prefix}${text}${suffix}${value.slice(end)}`;
      const cursorStart = start + prefix.length;
      this.replaceText(index, next, cursorStart, cursorStart + text.length);
    }

    transformSelectedLines(transformLine, fallback = "新的段落") {
      const textarea = this.activeTextArea();
      if (!textarea) return;

      const index = Number(textarea.dataset.blockIndex);
      const value = textarea.value;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
      const nextBreak = value.indexOf("\n", end);
      const lineEnd = nextBreak === -1 ? value.length : nextBreak;
      const selected = value.slice(lineStart, lineEnd) || fallback;
      const transformed = selected
        .split("\n")
        .map((line) => transformLine(line || fallback))
        .join("\n");

      this.replaceText(index, `${value.slice(0, lineStart)}${transformed}${value.slice(lineEnd)}`, lineStart, lineStart + transformed.length);
    }

    getActiveTextTarget() {
      const textarea = this.activeTextArea();
      if (!textarea) return { type: "index", index: this.blocks.length };

      return {
        type: "text",
        index: Number(textarea.dataset.blockIndex),
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
      };
    }

    getDropTarget(event) {
      const textBlock = event.target.closest?.("[data-rich-text-block]");
      if (textBlock && this.root.contains(textBlock)) {
        return {
          type: "text",
          index: Number(textBlock.dataset.blockIndex),
          start: textBlock.selectionStart,
          end: textBlock.selectionEnd,
        };
      }

      const blockElement = event.target.closest?.("[data-block-index]");
      if (blockElement && this.root.contains(blockElement)) {
        const index = Number(blockElement.dataset.blockIndex);
        const bounds = blockElement.getBoundingClientRect();
        return {
          type: "index",
          index: event.clientY < bounds.top + bounds.height / 2 ? index : index + 1,
        };
      }

      return { type: "index", index: this.blocks.length };
    }

    insertBlocks(newBlocks, target = this.getActiveTextTarget()) {
      if (!newBlocks.length) return;

      let focusIndex = null;

      if (target.type === "text" && this.blocks[target.index]?.type === "text") {
        const block = this.blocks[target.index];
        const start = target.start ?? block.text.length;
        const end = target.end ?? start;
        const before = block.text.slice(0, start);
        const after = block.text.slice(end);
        const replacement = [];

        if (before.trim()) replacement.push({ type: "text", text: before.trimEnd() });
        replacement.push(...newBlocks);
        replacement.push({ type: "text", text: after.trimStart() });
        focusIndex = target.index + replacement.length - 1;
        this.blocks.splice(target.index, 1, ...replacement);
      } else {
        const index = Math.min(Math.max(target.index ?? this.blocks.length, 0), this.blocks.length);
        this.blocks.splice(index, 0, ...newBlocks);
        if (this.blocks[index + newBlocks.length]?.type !== "text") {
          this.blocks.splice(index + newBlocks.length, 0, { type: "text", text: "" });
          focusIndex = index + newBlocks.length;
        }
      }

      this.render(focusIndex);
      this.notifyChange();
    }

    async waitForUploads() {
      if (!this.pendingUploads.size) return;

      this.onStatus(`还有 ${this.pendingUploads.size} 张图片正在上传，保存前先等它们完成...`);
      await Promise.allSettled([...this.pendingUploads.values()]);

      const failed = this.blocks.filter((block) => block.type === "image" && block.uploadState === "failed");
      if (failed.length) {
        throw new Error("有图片上传失败，请删除失败的图片块后重新导入。");
      }

      this.syncSource(false);
    }

    startRemoteUpload(block, file, index) {
      const task = this.saveImageFile(file, index)
        .then((saved) => {
          if (!saved) throw new Error("图片没有上传成功。");
          if (block.previewSrc?.startsWith("blob:")) {
            URL.revokeObjectURL(block.previewSrc);
          }
          block.src = saved.src;
          block.previewSrc = "";
          block.uploadState = "done";
          block.uploadError = "";
          this.onStatus(`图片已上传到 ${saved.src}`);
        })
        .catch((error) => {
          block.uploadState = "failed";
          block.uploadError = error.message || "上传失败";
          this.onStatus(`图片上传失败：${block.uploadError}`);
        })
        .finally(() => {
          this.pendingUploads.delete(block.id);
          this.render();
          this.syncSource(true);
        });

      this.pendingUploads.set(block.id, task);
    }

    async importFiles(files, target = this.getActiveTextTarget()) {
      const imageFiles = [...(files || [])].filter((file) => file.type.startsWith("image/"));
      if (!imageFiles.length) return;

      const ready = await this.ensureAssetFolder();
      if (!ready) return;

      if (window.GlassBlogRemote?.isConfigured?.()) {
        const imageBlocks = imageFiles.map((file) => ({
          type: "image",
          id: createId(),
          src: "",
          previewSrc: URL.createObjectURL(file),
          uploadState: "uploading",
          alt: cleanAlt(file.name.replace(/\.[^.]+$/, "")),
        }));

        this.insertBlocks(imageBlocks, target);
        this.onStatus(`已插入 ${imageBlocks.length} 张图片预览，正在上传到 GitHub...`);
        imageBlocks.forEach((block, index) => {
          this.startRemoteUpload(block, imageFiles[index], index);
        });
        return;
      }

      this.onStatus("正在优化并保存图片...");

      const imageBlocks = await Promise.all(
        imageFiles.map(async (file, index) => {
          const saved = await this.saveImageFile(file, index);
          if (!saved) return null;

          return {
            type: "image",
            id: createId(),
            src: saved.src,
            alt: cleanAlt(file.name.replace(/\.[^.]+$/, "")),
          };
        }),
      );
      const importedBlocks = imageBlocks.filter(Boolean);

      this.insertBlocks(importedBlocks, target);
      this.onStatus(`已导入 ${importedBlocks.length} 张图片，文件已保存到 assets/uploads。`);
    }

    hasImageFiles(dataTransfer) {
      return (
        [...(dataTransfer?.items || [])].some((item) => item.kind === "file" && item.type.startsWith("image/")) ||
        [...(dataTransfer?.files || [])].some((file) => file.type.startsWith("image/"))
      );
    }

    handleDrop(event) {
      if (this.hasImageFiles(event.dataTransfer)) {
        event.preventDefault();
        event.stopPropagation();
        this.importFiles(event.dataTransfer.files, this.getDropTarget(event));
        return;
      }

      if (this.draggingId) {
        event.preventDefault();
        event.stopPropagation();
        this.moveImageTo(this.draggingId, this.getDropTarget(event));
      }
    }

    removeImage(id) {
      const before = this.blocks.length;
      const removed = this.blocks.find((block) => block.type === "image" && block.id === id);
      if (removed?.previewSrc?.startsWith("blob:")) {
        URL.revokeObjectURL(removed.previewSrc);
      }
      this.blocks = this.blocks.filter((block) => block.type !== "image" || block.id !== id);
      if (this.blocks.length === before) return;
      if (!this.blocks.some((block) => block.type === "text")) {
        this.blocks.push({ type: "text", text: "" });
      }
      this.render();
      this.notifyChange();
      this.onStatus("图片已删除");
    }

    moveImageByButton(direction, id) {
      const index = this.blocks.findIndex((block) => block.type === "image" && block.id === id);
      if (index < 0) return;

      const step = direction === "up" ? -1 : 1;
      let targetIndex = index + step;
      while (this.blocks[targetIndex]?.type === "text" && !this.blocks[targetIndex].text.trim()) {
        targetIndex += step;
      }

      if (targetIndex < 0 || targetIndex >= this.blocks.length) return;

      const [image] = this.blocks.splice(index, 1);
      this.blocks.splice(targetIndex, 0, image);
      this.render();
      this.notifyChange();
    }

    moveImageTo(id, target) {
      const from = this.blocks.findIndex((block) => block.type === "image" && block.id === id);
      if (from < 0) return;

      let to = target.type === "index" ? target.index : target.index;
      if (to > from) to -= 1;
      if (to === from) return;

      const [image] = this.blocks.splice(from, 1);
      this.blocks.splice(Math.min(Math.max(to, 0), this.blocks.length), 0, image);
      this.render();
      this.notifyChange();
      this.onStatus("图片位置已调整");
    }
  }

  window.GlassBlogMediaEditor = {
    create(options) {
      return new GlassBlogMediaEditor(options);
    },
  };
})();
