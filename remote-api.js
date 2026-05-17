(function () {
  const sessionKey = "glass-blog-remote-session";
  const apiBaseUrlKey = "glass-blog-api-base-url";

  function cleanBaseUrl(value) {
    return String(value || "").trim().replace(/\/+$/g, "");
  }

  function apiBaseUrl() {
    return cleanBaseUrl(localStorage.getItem(apiBaseUrlKey) || window.GlassBlogConfig?.apiBaseUrl || "");
  }

  function isConfigured() {
    return Boolean(apiBaseUrl());
  }

  function readSession() {
    try {
      const session = JSON.parse(localStorage.getItem(sessionKey) || "null");
      if (!session?.token || !session?.expiresAt) return null;
      if (Date.now() > new Date(session.expiresAt).getTime()) {
        localStorage.removeItem(sessionKey);
        return null;
      }
      return session;
    } catch {
      localStorage.removeItem(sessionKey);
      return null;
    }
  }

  function writeSession(session) {
    localStorage.setItem(sessionKey, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(sessionKey);
  }

  function setApiBaseUrl(value) {
    const next = cleanBaseUrl(value);
    if (next) {
      localStorage.setItem(apiBaseUrlKey, next);
    } else {
      localStorage.removeItem(apiBaseUrlKey);
    }
  }

  async function request(path, options = {}) {
    const base = apiBaseUrl();
    if (!base) {
      throw new Error("还没有配置线上发布接口。");
    }

    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (options.auth !== false) {
      const session = readSession();
      if (!session?.token) {
        throw new Error("登录已过期，请重新进入作者入口。");
      }
      headers.Authorization = `Bearer ${session.token}`;
    }

    const response = await fetch(`${base}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      if (response.status === 401) clearSession();
      throw new Error(payload?.message || payload?.error || `发布接口请求失败：${response.status}`);
    }

    return payload;
  }

  async function login(password) {
    const session = await request("/auth/login", {
      method: "POST",
      auth: false,
      body: { password },
    });
    writeSession(session);
    return session;
  }

  async function publishPost(post) {
    return request("/posts", {
      method: "POST",
      body: { post },
    });
  }

  async function deletePost(slug) {
    return request(`/posts/${encodeURIComponent(slug)}`, {
      method: "DELETE",
    });
  }

  async function uploadImage(payload) {
    return request("/media", {
      method: "POST",
      body: payload,
    });
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const value = String(reader.result || "");
        resolve(value.includes(",") ? value.split(",").pop() : value);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function safeFilename(value) {
    return String(value || "image")
      .normalize("NFKD")
      .toLowerCase()
      .replace(/\.[^.]+$/u, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "image";
  }

  async function uploadFile(file, prefix = "post", index = 0) {
    const contentBase64 = await fileToBase64(file);
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "webp";
    const filename = `${safeFilename(prefix)}-${Date.now()}-${index + 1}.${extension}`;
    return uploadImage({
      path: `assets/uploads/${filename}`,
      contentBase64,
    });
  }

  window.GlassBlogRemote = {
    apiBaseUrl,
    clearSession,
    deletePost,
    getSession: readSession,
    hasSession: () => Boolean(readSession()),
    isConfigured,
    login,
    publishPost,
    setApiBaseUrl,
    uploadFile,
    uploadImage,
  };
})();
