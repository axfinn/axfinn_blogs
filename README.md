# AxFinn's Blog - Hugo Source

## 1. 关于本项目

本项目是我的个人博客的源代码仓库，基于优秀的静态网站生成器 [Hugo](https://gohugo.io/) 构建。所有的博文和网站配置都在这里进行管理。

## 2. 技术栈

*   **静态网站生成器**: Hugo
*   **内容格式**: Markdown
*   **主题**: AllinOne / hexo-theme-matery (根据 `config.toml` 配置)
*   **部署**: 通过一个自定义的 `publish.sh` 脚本推送到 `axfinn.github.io`

## 3. 环境准备

在开始之前，请确保你的电脑上已经安装了 Hugo。

**在 macOS 上安装:**
```bash
brew install hugo
```

**在其他系统上安装:**
请参考 [Hugo 官方安装指南](https://gohugo.io/installation/)。

安装完成后，可以通过以下命令验证是否成功：
```bash
hugo version
```

## 4. 本地开发与预览

在撰写新文章或修改网站配置时，你可以在本地启动一个实时预览的 Web 服务器。

1.  **克隆本项目** (如果尚未克隆):
    ```bash
    git clone <your-repo-url>
    cd axfinn_blogs
    ```

2.  **启动 Hugo 服务器**:
    ```bash
    # -D, --buildDrafts  包含标记为草稿的文章
    # -F, --buildFuture 包含发布日期在未来的文章
    hugo server -D -F
    ```

3.  **访问预览网站**:
    打开浏览器，访问 `http://localhost:1313`。你会看到博客的实时预览，当你修改并保存任何文件时，浏览器中的页面都会自动刷新。

## 5. 如何撰写一篇新文章

### 5.1 创建文章文件

使用 Hugo 的 `new` 命令来创建一篇新文章。这能确保文章文件包含正确的元数据（Front Matter）。

```bash
# 示例：创建一篇名为 "my-first-post" 的博文
hugo new content/blog/my-first-post.md
```

### 5.2 理解文章元数据 (Front Matter)

打开新创建的 Markdown 文件，你会看到文件顶部有一段被 `---` 包围的区域，这就是文章的元数据。

```yaml
---
title: "My First Post" # 文章标题
date: 2025-07-20T12:00:00+08:00 # 文章发布日期
draft: true # 是否为草稿。true 表示是草稿，不会被发布
slug: "my-first-post-slug" # 【重要】用于生成干净的 URL，建议使用英文
tags: ["技术", "Python"] # 标签，可以有多个
categories: ["教程"] # 分类
---
```

**关键字段解释**:
*   `title`: 显示在网站上的文章标题。
*   `date`: 文章的发布时间。Hugo 会根据这个时间排序。
*   `draft`: **非常重要**。新建的文章默认为 `true` (草稿)。在本地预览时，只要使用 `hugo server -D` 才能看到。当你准备好发布时，请务必将其修改为 `false`。
*   `slug`: **强烈推荐**。为了避免中文标题导致 URL 出现乱码，请为每篇文章设置一个简短、清晰的英文 `slug`。
*   `tags` / `categories`: 用于文章的分类和归档。

### 5.3 撰写内容

在元数据下方，使用标准的 Markdown 语法撰写你的文章正文即可。

## 6. 发布网站

本项目使用一个名为 `publish.sh` 的脚本来自动化部署流程。

### 6.1 发布流程揭秘

当你运行 `bash publish.sh` 时，脚本会执行以下操作：

1.  **执行 `hugo` 命令**: 在 `axfinn_blogs` 目录下，编译整个网站，将生成的静态文件（HTML, CSS, JS 等）输出到 `public/` 目录。
2.  **进入 `public` 目录**: `public` 目录本身是一个独立的 Git 仓库，它关联到你的 `axfinn.github.io` 仓库。
3.  **提交并推送**: 在 `public` 目录内，脚本会自动执行 `git add .`、`git commit` 和 `git push`，将新生成的网站文件推送到 GitHub Pages，完成发布。

### 6.2 如何发布

1.  确保你已经完成了文章的撰写，并已将文章的 `draft` 状态设置为 `false`。
2.  在 `axfinn_blogs` 的根目录下，运行发布脚本：
    ```bash
    bash publish.sh
    ```
3.  等待脚本执行完毕，几分钟后，你的网站就会更新。

## 7. 目录结构简介

```
.
├── archetypes/    # 文章的元数据模板
├── content/       # 所有的 Markdown 文章内容
├── data/          # 数据文件
├── layouts/       # 网站的布局和模板
├── static/        # 静态资源，如图片、CSS、JS
├── themes/        # Hugo 主题
├── config.toml    # 网站的全局配置文件
└── publish.sh     # 一键发布脚本
```