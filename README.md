# 灰玻璃日记

一个深色 iOS 磨砂玻璃风格的静态 Markdown 博客，不需要服务器，可部署到 GitHub Pages。

## 本地预览

这个博客会读取 `posts/index.json` 和 `posts/*.md`，建议用本地 HTTP 服务预览。

```powershell
cd D:\12767\Documents\ios-glass-blog
python -m http.server 8080
```

打开：

```text
http://localhost:8080
```

## 写文章

打开 `compose.html` 可以写 Markdown、实时预览、导出 `.md` 文件，并生成文章列表条目。
编辑器带本地草稿箱，草稿会保存在当前浏览器里，不需要服务器。
图片可以直接拖进写作区域，会作为正文里的图片块插入；拖动已经插入的图片块可以调整它在文章中的位置。
首次导入图片前，先点击“图片目录”，选择 `ios-glass-blog` 项目根目录。导入时图片会保存到 `assets/uploads`，正文里只保存相对路径，避免本地草稿和文章页因为 base64 原图过大变卡。
点击“发布文章”会把文章发布到当前浏览器的本地首页预览；如果要公开发布到 GitHub Pages，还需要导出 Markdown 并把文章条目提交到仓库。

如果文章要长期发布到 GitHub Pages，最佳做法就是当前这种方式：图片是独立文件，Markdown 里使用相对路径引用。这样比把图片直接塞进 Markdown 更轻，网页加载也更快。
打开 `manage.html` 可以管理文章：删除、编辑内容、调整分类。对静态文件文章的操作会保存为本地覆盖或本地隐藏，不会直接改磁盘文件。

文章结构：

- `posts/index.json`：文章列表、标题、摘要、标签、日期、分类
- `posts/*.md`：文章正文

分类可以直接写成任意文字，例如 `技术`、`生活`、`读书`、`项目`。首页会根据 `posts/index.json` 里的分类自动生成筛选按钮。

## 发布到 GitHub Pages

1. 在 GitHub 新建一个仓库。
2. 把本文件夹内容提交到仓库。
3. 进入仓库 `Settings` -> `Pages`。
4. `Source` 选择 `Deploy from a branch`。
5. `Branch` 选择 `main`，目录选择 `/root`。
6. 保存后等待 GitHub 生成访问地址。

之后每次新增文章，只需要提交新的 Markdown 文件和更新后的 `posts/index.json`。

发布前记得把 `robots.txt` 和 `sitemap.xml` 里的 `https://example.com` 改成你的 GitHub Pages 地址，例如 `https://你的用户名.github.io/仓库名/`。如果之后使用自定义域名，也要同步改成自定义域名。

`sitemap.xml` 现在包含首页、关于页、归档、标签和现有文章入口。因为这个版本用的是 `#post/...` 哈希路由，搜索引擎能看到站点结构，但不如每篇文章都有独立 HTML 页面那么完美。后面如果你想继续增强 SEO，可以再做“每篇文章生成一个独立页面”。

## 备份和迁移

管理页提供“导出备份 / 导入备份”，写作页的“导出”标签里也有同样入口。备份会包含当前浏览器里的本机文章、草稿和隐藏记录，不会导出作者密码。

建议在这些时候导出一次备份：

- 写完长文章以后
- 清理浏览器缓存以前
- 换电脑或换浏览器以前
- 准备把本地文章整理进 GitHub 仓库以前

## 作者入口

公开站点默认只显示阅读入口，写作和管理页需要先登录作者账号。

本地预览时打开：

```text
http://localhost:8080/login.html
```

如果要让线上网站直接发布、修改、删除 GitHub 仓库里的文章，请按 `ONLINE_ADMIN.md` 配置 Cloudflare Worker 发布接口。

第一次进入会注册一个只保存在当前浏览器里的作者账号；之后访问 `compose.html` 和 `manage.html` 都会先检查登录状态。发布到 GitHub Pages 后，公开域名不会开放注册。这个方案用于收起本地编辑入口和避免普通访客误操作；如果要在公网真正多人协作写入仓库，建议后续接 Decap CMS、GitHub OAuth 或带服务端的 CMS。
