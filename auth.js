(function () {
  const accountKey = "glass-blog-author-account";
  const sessionKey = "glass-blog-author-session";
  const sessionDuration = 7 * 24 * 60 * 60 * 1000;
  const passwordIterations = 150000;
  const localHosts = new Set(["", "localhost", "127.0.0.1", "::1"]);

  function isLocalPreview() {
    return location.protocol === "file:" || localHosts.has(location.hostname);
  }

  function bytesToBase64(bytes) {
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  function base64ToBytes(value) {
    return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  }

  function randomSalt() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return bytesToBase64(bytes);
  }

  async function derivePassword(password, salt, iterations = passwordIterations) {
    if (!crypto?.subtle) {
      throw new Error("当前浏览器不支持安全密码校验。请使用新版 Chrome 或 Edge。");
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: base64ToBytes(salt),
        iterations,
        hash: "SHA-256",
      },
      key,
      256,
    );

    return bytesToBase64(new Uint8Array(bits));
  }

  function readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getAccount() {
    const account = readJson(accountKey);
    return account?.passwordHash && account?.salt ? account : null;
  }

  function getSession() {
    if (window.GlassBlogRemote?.isConfigured?.() && window.GlassBlogRemote?.hasSession?.()) {
      const remoteSession = window.GlassBlogRemote.getSession();
      return {
        name: remoteSession.name || "Author",
        signedAt: remoteSession.expiresAt,
        expiresAt: new Date(remoteSession.expiresAt).getTime(),
        remote: true,
      };
    }

    const session = readJson(sessionKey);
    if (!session?.expiresAt || Date.now() > session.expiresAt) {
      localStorage.removeItem(sessionKey);
      return null;
    }
    return session;
  }

  function isSignedIn() {
    if (window.GlassBlogRemote?.isConfigured?.() && window.GlassBlogRemote?.hasSession?.()) return true;

    const account = getAccount();
    const session = getSession();
    return Boolean(account && session && session.name === account.name);
  }

  function setSession(name) {
    writeJson(sessionKey, {
      name,
      signedAt: new Date().toISOString(),
      expiresAt: Date.now() + sessionDuration,
    });
  }

  function signOut() {
    localStorage.removeItem(sessionKey);
    window.GlassBlogRemote?.clearSession?.();
    syncAuthorUi();
  }

  function currentRelativeUrl() {
    return `${location.pathname.split("/").pop() || "index.html"}${location.search}${location.hash}`;
  }

  function safeNextUrl(value) {
    const next = String(value || "compose.html").trim();
    if (!next || next.startsWith("http://") || next.startsWith("https://") || next.startsWith("//")) {
      return "compose.html";
    }
    return next;
  }

  function loginUrl() {
    return `./login.html?next=${encodeURIComponent(currentRelativeUrl())}`;
  }

  function requireAuthor() {
    if (isSignedIn()) {
      document.documentElement.classList.add("is-author");
      syncAuthorUi();
      return true;
    }

    window.__GLASS_BLOG_AUTH_BLOCKED__ = true;
    location.replace(loginUrl());
    return false;
  }

  async function createAccount(name, password) {
    if (!isLocalPreview()) {
      throw new Error("公开站点不开放注册。请在本机 localhost 预览环境初始化作者账号。");
    }

    const cleanName = String(name || "").trim() || "作者";
    const salt = randomSalt();
    const passwordHash = await derivePassword(password, salt);
    const account = {
      version: 1,
      name: cleanName,
      salt,
      passwordHash,
      iterations: passwordIterations,
      createdAt: new Date().toISOString(),
    };

    writeJson(accountKey, account);
    setSession(cleanName);
    return account;
  }

  async function signIn(password) {
    if (window.GlassBlogRemote?.isConfigured?.()) {
      return window.GlassBlogRemote.login(password);
    }

    const account = getAccount();
    if (!account) {
      throw new Error("还没有初始化作者账号。");
    }

    const passwordHash = await derivePassword(password, account.salt, account.iterations || passwordIterations);
    if (passwordHash !== account.passwordHash) {
      throw new Error("密码不正确。");
    }

    setSession(account.name);
    return account;
  }

  function resetLocalAccount() {
    if (!isLocalPreview()) return;
    localStorage.removeItem(accountKey);
    localStorage.removeItem(sessionKey);
    syncAuthorUi();
  }

  function syncAuthorUi() {
    const signedIn = isSignedIn();
    const account = getAccount();
    const remoteSession = window.GlassBlogRemote?.isConfigured?.() ? window.GlassBlogRemote?.getSession?.() : null;

    document.documentElement.classList.toggle("is-author", signedIn);
    document.querySelectorAll("[data-authenticated-only]").forEach((element) => {
      element.hidden = !signedIn;
    });
    document.querySelectorAll("[data-guest-only]").forEach((element) => {
      element.hidden = signedIn;
    });
    document.querySelectorAll("[data-author-name]").forEach((element) => {
      element.textContent = remoteSession?.name || account?.name || "作者";
    });
    document.querySelectorAll("[data-auth-logout]").forEach((button) => {
      if (button.dataset.authBound) return;
      button.dataset.authBound = "true";
      button.addEventListener("click", () => {
        signOut();
        location.href = "./login.html";
      });
    });
  }

  function setAuthStatus(message, tone = "muted") {
    const status = document.querySelector("[data-auth-status]");
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function redirectAfterAuth() {
    const params = new URLSearchParams(location.search);
    location.href = safeNextUrl(params.get("next"));
  }

  function initLoginPage() {
    const page = document.querySelector("[data-auth-page]");
    if (!page) return;

    const setupForm = document.querySelector("[data-auth-setup-form]");
    const loginForm = document.querySelector("[data-auth-login-form]");
    const lockedPanel = document.querySelector("[data-auth-locked]");
    const modeLabel = document.querySelector("[data-auth-mode]");
    const resetButton = document.querySelector("[data-auth-reset]");
    const remoteConfigured = window.GlassBlogRemote?.isConfigured?.() === true;
    const account = getAccount();
    const signedIn = isSignedIn();
    const canSetup = isLocalPreview();
    const bound = page.dataset.authBound === "true";
    page.dataset.authBound = "true";

    if (signedIn) {
      setAuthStatus("已经登录，正在进入作者后台。", "success");
      window.setTimeout(redirectAfterAuth, 450);
    }

    if (modeLabel) {
      modeLabel.textContent = remoteConfigured ? "Cloud login" : account ? "Author login" : canSetup ? "Author setup" : "Read only";
    }

    if (setupForm) setupForm.hidden = remoteConfigured || Boolean(account) || !canSetup;
    if (loginForm) loginForm.hidden = remoteConfigured ? false : !account;
    if (lockedPanel) lockedPanel.hidden = remoteConfigured || Boolean(account) || canSetup;
    if (resetButton) resetButton.hidden = remoteConfigured || !account || !canSetup;

    if (bound) return;

    setupForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(setupForm);
      const name = String(formData.get("name") || "").trim();
      const password = String(formData.get("password") || "");
      const confirm = String(formData.get("confirm") || "");

      if (password.length < 8) {
        setAuthStatus("密码至少需要 8 位。", "danger");
        return;
      }
      if (password !== confirm) {
        setAuthStatus("两次输入的密码不一致。", "danger");
        return;
      }

      try {
        setAuthStatus("正在创建本机作者账号...");
        await createAccount(name, password);
        setAuthStatus("作者账号已创建。", "success");
        redirectAfterAuth();
      } catch (error) {
        setAuthStatus(error.message || "创建失败。", "danger");
      }
    });

    loginForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const password = String(new FormData(loginForm).get("password") || "");

      try {
        setAuthStatus("正在登录...");
        await signIn(password);
        setAuthStatus("登录成功。", "success");
        redirectAfterAuth();
      } catch (error) {
        setAuthStatus(error.message || "登录失败。", "danger");
      }
    });

    resetButton?.addEventListener("click", () => {
      const confirmed = window.confirm("确定重置本机作者账号吗？本机登录密码会被清除，文章草稿和已发布预览不会删除。");
      if (!confirmed) return;
      resetLocalAccount();
      location.reload();
    });
  }

  function animateAmbientBars(time) {
    const ambient = document.querySelector("[data-ambient]");
    const ambientBarA = document.querySelector('[data-ambient-bar="a"]');
    const ambientBarB = document.querySelector('[data-ambient-bar="b"]');
    const t = time / 1000;

    if (ambient) {
      ambient.style.transform = `translate3d(${Math.sin(t * 0.22) * 14}px, ${Math.cos(t * 0.18) * 10}px, 0)`;
    }

    if (ambientBarA) {
      ambientBarA.style.transform = `translate3d(${Math.sin(t * 0.7) * 54}px, ${Math.cos(t * 0.56) * 34}px, 0) rotate(${17 + Math.sin(t * 0.42) * 2.4}deg) skewX(${-8 + Math.cos(t * 0.38) * 1.2}deg)`;
    }

    if (ambientBarB) {
      ambientBarB.style.transform = `translate3d(${Math.cos(t * 0.62) * 62}px, ${Math.sin(t * 0.5) * 38}px, 0) rotate(${-13 + Math.cos(t * 0.4) * 2.2}deg) skewX(${10 + Math.sin(t * 0.44) * 1.1}deg)`;
    }

    requestAnimationFrame(animateAmbientBars);
  }

  window.GlassBlogAuth = {
    createAccount,
    getAccount,
    initLoginPage,
    isLocalPreview,
    isSignedIn,
    requireAuthor,
    resetLocalAccount,
    signIn,
    signOut,
    syncAuthorUi,
  };

  document.addEventListener("DOMContentLoaded", () => {
    syncAuthorUi();
    initLoginPage();
    if (document.querySelector("[data-auth-page]")) {
      requestAnimationFrame(animateAmbientBars);
    }
  });
})();
