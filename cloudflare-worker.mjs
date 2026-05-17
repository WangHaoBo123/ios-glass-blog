const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const maxMarkdownBytes = 1_500_000;
const maxImageBase64Bytes = 8_000_000;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  },
};

async function handleRequest(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }

  try {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse(request, env, { ok: true });
    }

    if (request.method === "POST" && url.pathname === "/auth/login") {
      return jsonResponse(request, env, await login(request, env));
    }

    await requireSession(request, env);

    if (request.method === "POST" && url.pathname === "/posts") {
      return jsonResponse(request, env, await publishPost(request, env));
    }

    const postMatch = url.pathname.match(/^\/posts\/([a-z0-9-]+)$/);
    if (request.method === "DELETE" && postMatch) {
      return jsonResponse(request, env, await deletePost(postMatch[1], env));
    }

    if (request.method === "POST" && url.pathname === "/media") {
      return jsonResponse(request, env, await uploadMedia(request, env));
    }

    throw new HttpError(404, "没有找到这个发布接口。");
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = status >= 500 ? "发布接口暂时不可用，请稍后重试。" : error.message;
    return jsonResponse(request, env, { ok: false, message }, status);
  }
}

function corsHeaders(request, env) {
  const requestOrigin = request.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const localPreview = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(requestOrigin);
  const origin = requestOrigin && (allowed.includes(requestOrigin) || localPreview)
    ? requestOrigin
    : allowed[0] || "*";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResponse(request, env, payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(request, env),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "请求内容不是有效的 JSON。");
  }
}

function requiredEnv(env, name) {
  const value = env[name];
  if (!value) throw new HttpError(500, `缺少环境变量：${name}`);
  return value;
}

async function login(request, env) {
  const body = await readJson(request);
  const password = String(body.password || "");
  const expected = requiredEnv(env, "ADMIN_PASSWORD");
  const ok = await timingSafeEqual(await sha256Hex(password), await sha256Hex(expected));

  if (!ok) throw new HttpError(401, "密码不正确。");

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 7 * 24 * 60 * 60;
  const name = env.AUTHOR_NAME || "Author";
  const token = await signToken({ sub: "author", name, iat: now, exp: expiresAt }, env);

  return {
    ok: true,
    name,
    token,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}

async function requireSession(request, env) {
  const header = request.headers.get("Authorization") || "";
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, "请先登录作者账号。");

  const payload = await verifyToken(token, env);
  if (!payload || payload.exp * 1000 <= Date.now()) {
    throw new HttpError(401, "登录已过期，请重新登录。");
  }

  return payload;
}

async function signToken(payload, env) {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = await hmacSha256(body, requiredEnv(env, "SESSION_SECRET"));
  return `${body}.${base64UrlEncode(signature)}`;
}

async function verifyToken(token, env) {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = base64UrlEncode(await hmacSha256(body, requiredEnv(env, "SESSION_SECRET")));
  if (!(await timingSafeEqual(signature, expected))) return null;

  try {
    return JSON.parse(base64UrlDecodeToString(body));
  } catch {
    return null;
  }
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, textEncoder.encode(value)));
}

async function timingSafeEqual(left, right) {
  const a = textEncoder.encode(String(left));
  const b = textEncoder.encode(String(right));
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a[index] ^ b[index];
  }
  return diff === 0;
}

function base64UrlEncode(value) {
  const bytes = typeof value === "string" ? textEncoder.encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeToString(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return textDecoder.decode(bytes);
}

function githubConfig(env) {
  return {
    owner: requiredEnv(env, "GITHUB_OWNER"),
    repo: requiredEnv(env, "GITHUB_REPO"),
    branch: env.GITHUB_BRANCH || "main",
    token: requiredEnv(env, "GITHUB_TOKEN"),
  };
}

async function githubFetch(env, path, options = {}) {
  const { owner, repo, token } = githubConfig(env);
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "ios-glass-blog-publisher",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new HttpError(response.status, `GitHub API 请求失败：${response.status} ${text.slice(0, 220)}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

function decodeGithubContent(content) {
  const binary = atob(String(content || "").replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return textDecoder.decode(bytes);
}

async function readPostsIndex(env) {
  const { branch } = githubConfig(env);
  const file = await githubFetch(env, `/contents/posts/index.json?ref=${encodeURIComponent(branch)}`);
  const index = JSON.parse(decodeGithubContent(file.content));
  return Array.isArray(index.posts) ? index : { posts: [] };
}

async function githubFileExists(env, path) {
  const { branch } = githubConfig(env);
  try {
    await githubFetch(env, `/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`);
    return true;
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return false;
    throw error;
  }
}

function sanitizeSlug(value) {
  const slug = String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  if (!slug) throw new HttpError(400, "文章 slug 不能为空，建议使用英文和数字。");
  return slug;
}

function clipText(value, maxLength, fallback = "") {
  const text = String(value || "").trim() || fallback;
  return text.slice(0, maxLength);
}

function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((tag) => tag.slice(0, 40));
}

function sanitizePost(input) {
  const post = input || {};
  const title = clipText(post.title, 160, "未命名文章");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(post.date || "")) ? post.date : new Date().toISOString().slice(0, 10);
  const slug = sanitizeSlug(post.slug || title);
  const content = String(post.content || "").replace(/\r\n/g, "\n");

  if (!content.trim()) throw new HttpError(400, "正文不能为空。");
  if (new Blob([content]).size > maxMarkdownBytes) {
    throw new HttpError(400, "这篇文章太大了，建议压缩图片或拆成多篇。");
  }

  return {
    slug,
    title,
    date,
    category: clipText(post.category, 80, "文章"),
    summary: clipText(post.summary, 500),
    tags: sanitizeTags(post.tags),
    content,
  };
}

function postEntry(post, existing = null) {
  return {
    slug: post.slug,
    title: post.title,
    date: post.date,
    category: post.category,
    summary: post.summary,
    tags: post.tags,
    ...(existing?.featured ? { featured: true } : {}),
    file: `./posts/${post.slug}.md`,
  };
}

function sortPosts(posts) {
  return [...posts].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

async function publishPost(request, env) {
  const body = await readJson(request);
  const post = sanitizePost(body.post || body);
  const index = await readPostsIndex(env);
  const existing = index.posts.find((item) => item.slug === post.slug);
  const nextPosts = sortPosts([
    postEntry(post, existing),
    ...index.posts.filter((item) => item.slug !== post.slug),
  ]);
  const nextIndex = { posts: nextPosts };
  const sitemap = buildSitemap(nextPosts, env);

  const commit = await commitChanges(
    env,
    [
      { path: `posts/${post.slug}.md`, mode: "100644", type: "blob", content: post.content },
      { path: "posts/index.json", mode: "100644", type: "blob", content: `${JSON.stringify(nextIndex, null, 2)}\n` },
      { path: "sitemap.xml", mode: "100644", type: "blob", content: sitemap },
    ],
    `${existing ? "Update" : "Publish"} post: ${post.title}`,
  );

  return { ok: true, post: postEntry(post, existing), commit: commit.sha };
}

async function deletePost(slugValue, env) {
  const slug = sanitizeSlug(slugValue);
  const index = await readPostsIndex(env);
  const existing = index.posts.find((item) => item.slug === slug);
  if (!existing) throw new HttpError(404, "仓库里没有找到这篇文章。");

  const nextPosts = index.posts.filter((item) => item.slug !== slug);
  const nextIndex = { posts: nextPosts };
  const tree = [
    { path: "posts/index.json", mode: "100644", type: "blob", content: `${JSON.stringify(nextIndex, null, 2)}\n` },
    { path: "sitemap.xml", mode: "100644", type: "blob", content: buildSitemap(nextPosts, env) },
  ];

  if (await githubFileExists(env, `posts/${slug}.md`)) {
    tree.push({ path: `posts/${slug}.md`, mode: "100644", type: "blob", sha: null });
  }

  const commit = await commitChanges(env, tree, `Delete post: ${existing.title || slug}`);
  return { ok: true, slug, commit: commit.sha };
}

function sanitizeUploadPath(value) {
  const rawName = String(value || "").split("/").pop() || "";
  const filename = rawName
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

  if (!/\.(?:webp|png|jpe?g|gif|svg)$/i.test(filename)) {
    throw new HttpError(400, "图片文件名需要带 webp、png、jpg、gif 或 svg 后缀。");
  }

  return `assets/uploads/${filename}`;
}

async function uploadMedia(request, env) {
  const body = await readJson(request);
  const path = sanitizeUploadPath(body.path || body.filename);
  const contentBase64 = String(body.contentBase64 || "").replace(/\s/g, "");

  if (!contentBase64) throw new HttpError(400, "图片内容为空。");
  if (contentBase64.length > maxImageBase64Bytes) {
    throw new HttpError(400, "图片太大了，请先压缩后再上传。");
  }

  const blob = await githubFetch(env, "/git/blobs", {
    method: "POST",
    body: JSON.stringify({ content: contentBase64, encoding: "base64" }),
  });
  const commit = await commitChanges(
    env,
    [{ path, mode: "100644", type: "blob", sha: blob.sha }],
    `Upload image: ${path.split("/").pop()}`,
  );

  return { ok: true, src: `./${path}`, path, commit: commit.sha };
}

async function commitChanges(env, treeEntries, message) {
  const { branch } = githubConfig(env);
  const ref = await githubFetch(env, `/git/ref/heads/${encodeURIComponent(branch)}`);
  const baseCommitSha = ref.object.sha;
  const baseCommit = await githubFetch(env, `/git/commits/${baseCommitSha}`);
  const tree = await githubFetch(env, "/git/trees", {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseCommit.tree.sha,
      tree: treeEntries,
    }),
  });
  const commit = await githubFetch(env, "/git/commits", {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: tree.sha,
      parents: [baseCommitSha],
    }),
  });

  await githubFetch(env, `/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });

  return commit;
}

function siteRoot(env) {
  return String(env.SITE_URL || "https://starytra32.top").replace(/\/+$/g, "");
}

function escapeXml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sitemapUrl(path, env) {
  return `${siteRoot(env)}${path}`;
}

function buildSitemap(posts, env) {
  const today = new Date().toISOString().slice(0, 10);
  const fixedPages = [
    { loc: "/", lastmod: today, changefreq: "weekly", priority: "1.0" },
    { loc: "/about.html", lastmod: today, changefreq: "monthly", priority: "0.6" },
    { loc: "/index.html#archive", lastmod: today, changefreq: "weekly", priority: "0.7" },
    { loc: "/index.html#tags", lastmod: today, changefreq: "weekly", priority: "0.7" },
  ];
  const postPages = posts.map((post) => ({
    loc: `/index.html#post/${encodeURIComponent(post.slug)}`,
    lastmod: post.date || today,
    changefreq: "monthly",
    priority: "0.8",
  }));

  const urls = [...fixedPages, ...postPages]
    .map(
      (item) => `  <url>
    <loc>${escapeXml(sitemapUrl(item.loc, env))}</loc>
    <lastmod>${escapeXml(item.lastmod)}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
