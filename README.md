# 个人博客源码 (axfinn_blogs)

[![Hugo](https://img.shields.io/badge/Hugo-0.148.1-blue.svg)](https://gohugo.io/)
[![Theme](https://img.shields.io/badge/Theme-AllinOne-lightgrey.svg)](https://github.com/sy-records/hugo-theme-allinone)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

欢迎来到我的个人博客源码仓库。此项目使用 [Hugo](https://gohugo.io/)（一个快速的静态网站生成器）构建，并托管在 [GitHub Pages](https://pages.github.com/) 上。

**线上访问地址: [https://axfinn.github.io/](https://axfinn.github.io/)**

## ✨ 项目特色

- **极速构建**: 基于 Go 语言的 Hugo 核心，带来毫秒级的网站生成速度。
- **响应式主题**: 使用 `AllinOne` 主题，在桌面和移动设备上均有良好的阅读体验。
- **Markdown 写作**: 所有文章均使用 Markdown 格式编写，专注于内容本身。
- **自动化部署**: 通过一个简单的 Shell 脚本，实现一键构建和发布。
- **功能丰富**: 支持代码高亮、LaTeX 公式、文章归档、标签分类等功能。

## 🛠️ 技术栈

- **内容**: [Hugo](https://gohugo.io/)
- **主题**: [hugo-theme-allinone](https://github.com/sy-records/hugo-theme-allinone)
- **托管**: [GitHub Pages](https://pages.github.com/)
- **持续集成**: Shell 脚本

## 🚀 如何在本地运行

### 1. 环境准备

请确保你的电脑上已经安装了 [Git](https://git-scm.com/) 和 [Hugo](https://gohugo.io/getting-started/installing/) (建议使用 extended 版本)。

### 2. 克隆仓库

```bash
# 克隆主仓库
git clone https://github.com/axfinn/axfinn_blogs.git
cd axfinn_blogs

# 初始化并拉取主题子模块
git submodule update --init --recursive
```

### 3. 启动本地服务

```bash
# Hugo 会启动一个本地服务器，并实时刷新
hugo server -D
```

现在，你可以在浏览器中打开 `http://localhost:1313` 来预览博客。`-D` 参数会确保草稿（draft）状态的文章也能被渲染。

## ✍️ 内容创作

### 创建新文章

通过以下命令可以快速创建一个新的博文：

```bash
hugo new blog/your-post-title.md
```

Hugo 会根据 `archetypes/default.md` 中的模板，在 `content/blog/` 目录下生成一个新的 Markdown 文件。

### 文章元数据 (Front Matter)

每篇文章的开头都需要包含一些元数据，用于配置文章的标题、日期、标签等信息。

```yaml
---
title: "文章标题"
date: 2025-07-19T12:00:00+08:00
draft: false # 设置为 false 才会正式发布
tags: ["技术", "Hugo"]
categories: ["教程"]
---

这里是你的正文内容...
```

## 📦 部署流程

本项目的部署流程是半自动化的，通过 `publish.sh` 脚本完成。

### 部署原理

`publish.sh` 脚本执行以下操作：

1.  **构建静态文件**: 运行 `hugo -D` 命令，将 `content/` 目录下的 Markdown 文件生成为静态 HTML，并输出到 `public/` 目录。
2.  **切换到发布目录**: `public/` 目录本身是一个独立的 Git 仓库，它关联到 `axfinn.github.io`。脚本会将生成的文件复制到该仓库。
3.  **提交并推送**: 在 `axfinn.github.io` 仓库中，自动提交所有变更，并推送到 GitHub。
4.  **更新源码**: 同时，脚本也会将主项目（`axfinn_blogs`）的变更提交并推送。

### 如何发布

当你完成写作或修改后，只需运行：

```bash
./publish.sh "你的提交信息"
```

脚本会自动完成所有构建和发布步骤。

## 🤝 贡献

欢迎提出 Issue 或 Pull Request。如果你发现了 bug 或者有任何改进建议，请随时提出。

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可。
