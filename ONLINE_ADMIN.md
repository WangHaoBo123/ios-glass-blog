# 线上写作后台配置

这个方案让 `starytra32.top` 的写作页和管理页直接改 GitHub 仓库。

## 1. 创建 GitHub Token

进入 GitHub:

Settings -> Developer settings -> Personal access tokens -> Fine-grained tokens -> Generate new token

建议权限:

- Repository access: 只选择 `WangHaoBo123/ios-glass-blog`
- Contents: Read and write
- Metadata: Read

生成后复制 token。它只会显示一次。

## 2. 部署 Cloudflare Worker

先在本项目目录安装并登录 Wrangler:

```powershell
npm install
npx wrangler login
```

然后设置密钥:

```powershell
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
```

说明:

- `GITHUB_TOKEN`: 第 1 步复制的 GitHub Token
- `ADMIN_PASSWORD`: 以后登录博客后台用的密码
- `SESSION_SECRET`: 随机长字符串，用来签发登录状态

部署:

```powershell
npx wrangler deploy
```

部署成功后，Cloudflare 会给你一个地址，类似:

```text
https://ios-glass-blog-publisher.你的账号.workers.dev
```

## 3. 填入博客配置

打开 `site-config.js`，把 `apiBaseUrl` 改成 Worker 地址:

```js
window.GlassBlogConfig = {
  apiBaseUrl: "https://ios-glass-blog-publisher.你的账号.workers.dev",
};
```

然后提交:

```powershell
git add site-config.js remote-api.js auth.js compose.js manage.js media-editor.js cloudflare-worker.mjs wrangler.toml ONLINE_ADMIN.md
git commit -m "Add online publishing backend"
git pull --rebase origin main
git push
```

## 4. 使用方式

打开:

```text
https://starytra32.top/login.html
```

输入 `ADMIN_PASSWORD`，进入写作或管理页面。

之后:

- 写作页点击“发布文章”会提交到 GitHub
- 管理页点击“保存更改”会更新 GitHub
- 管理页点击“删除文章”会删除 GitHub 里的文章
- 图片拖入编辑器后会上传到 `assets/uploads`

GitHub Pages 通常会在几十秒到几分钟后刷新线上网站。
