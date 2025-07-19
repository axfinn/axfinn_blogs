---
title: "从零到一：使用 Hugo 和 GitHub Pages 搭建个人博客"
date: 2025-07-19T00:00:00+08:00
draft: false
tags: ["Hugo", "GitHub Pages", "博客搭建", "教程"]
categories: ["技术"]
---

## 前言

拥有一个个人博客是分享知识、记录学习和展示作品的绝佳方式。本文将详细介绍如何使用强大的静态网站生成器 Hugo 和免费的 GitHub Pages 服务，从零开始搭建一个属于你自己的、功能完善且高度可定制的个人博客。

## 为什么选择 Hugo 和 GitHub Pages？

- **Hugo**: Go 语言编写的静态网站生成器，以其惊人的构建速度和灵活性而闻名。它拥有丰富的主题和强大的功能，让你可以专注于内容创作。
- **GitHub Pages**: GitHub 提供的免费静态网站托管服务。它与 Git 无缝集成，非常适合托管个人博客、项目文档等。

## 准备工作

在开始之前，请确保你的电脑上已经安装了以下软件：

1.  **Git**: 用于版本控制和部署。 [下载地址](https://git-scm.com/)
2.  **Hugo**: 静态网站生成器。 [安装教程](https://gohugo.io/getting-started/installing/)

可以通过以下命令检查是否安装成功：

```bash
git --version
hugo version
```

## 搭建步骤

### 1. 创建 Hugo 网站

首先，使用 Hugo 命令创建一个新的网站。将 `my-blog` 替换为你自己的项目名称。

```bash
hugo new site my-blog
cd my-blog
```

这会生成一个包含基本目录结构的 Hugo 项目：

- `archetypes/`: 内容模板文件。
- `content/`: 博客文章等内容。
- `layouts/`: 网站布局和模板。
- `static/`: 静态资源，如图片、CSS、JS。
- `themes/`: 主题存放目录。
- `config.toml`: 网站主配置文件。

### 2. 初始化 Git 仓库

将你的 Hugo 项目初始化为一个 Git 仓库，这将用于管理博客的源代码。

```bash
git init
```

### 3. 添加主题

Hugo 拥有海量的主题可供选择。你可以从 [Hugo 官方主题站](https://themes.gohugo.io/) 挑选一个你喜欢的主题。这里我们以 `AllinOne` 主题为例，使用 Git Submodule 的方式添加主题。

```bash
git submodule add https://github.com/sy-records/hugo-theme-allinone.git themes/AllinOne
```

然后，在 `config.toml` 文件中启用该主题：

```toml
theme = "AllinOne"
```

### 4. 配置网站

打开 `config.toml` 文件，根据你的需求和所选主题的文档，配置网站的基本信息，例如网站标题、作者、菜单等。

一个基础的配置示例如下：

```toml
baseURL = "https://your-username.github.io/"
languageCode = "zh-cn"
title = "我的个人博客"
theme = "AllinOne"

[params]
  author = "你的名字"
  description = "这是我的个人博客"

[menu]
  [[menu.main]]
    identifier = "about"
    name = "关于"
    url = "/about/"
    weight = 1
  [[menu.main]]
    identifier = "blog"
    name = "博客"
    url = "/blog/"
    weight = 2
```

**重要提示**: `baseURL` 必须设置为你将来要部署的 GitHub Pages 地址。

### 5. 创建第一篇文章

使用 Hugo 命令创建你的第一篇博文：

```bash
hugo new blog/hello-world.md
```

这会在 `content/blog/` 目录下生成一个 `hello-world.md` 文件。打开它，你会看到一些元数据（Front Matter）和正文部分。用 Markdown 语法编写你的文章内容。

```markdown
---
title: "Hello World"
date: 2025-07-19T15:00:00+08:00
draft: false # 设置为 false 才会发布
---

这是我的第一篇博客文章！
```

### 6. 本地预览

在发布到线上之前，可以在本地启动 Hugo 服务器进行预览。

```bash
hugo server -D
```

`-D` 参数会包含标记为草稿（draft）的文章。现在，在浏览器中访问 `http://localhost:1313` 就可以看到你的博客了。

### 7. 创建 GitHub 仓库

你需要创建两个 GitHub 仓库：

1.  `my-blog` (私有仓库推荐): 用于存放 Hugo 网站的源代码。
2.  `your-username.github.io` (必须是公开仓库): 用于存放 Hugo 生成的静态文件，也就是最终发布的网站。

### 8. 编写发布脚本

为了简化部署流程，我们可以编写一个自动化脚本 `publish.sh`。这个脚本会自动构建网站，并将生成的文件推送到 `your-username.github.io` 仓库。

在你的项目根目录（`my-blog`）下创建 `publish.sh` 文件：

```bash
#!/bin/sh

# 如果脚本有任何错误，则退出
set -e

# 接收 commit message
MSG="$1"
if [ -z "$MSG" ]; then
  echo "Commit message is required"
  exit 1
fi

# 构建网站
echo "Building site..."
hugo

# 进入 public 目录
cd public

# 添加到 Git
git add .

# 提交变更
git commit -m "$MSG"

# 推送到 GitHub
echo "Pushing to GitHub Pages..."
git push origin main

# 返回上级目录
cd ..

# 提交源代码的变更
git add .
git commit -m "$MSG"
git push origin main

echo "Done!"
```

**配置 public 目录**: 在执行脚本之前，需要将 `public` 目录设置为 `your-username.github.io` 仓库的 Git 工作目录。

```bash
# 先删除 Hugo 自动生成的空 public 目录
rm -rf public

# 克隆你的 GitHub Pages 仓库到 public 目录
git clone https://github.com/your-username/your-username.github.io.git public
```

### 9. 发布你的博客

现在，一切准备就绪！

1.  首先，将你的 Hugo 源代码推送到 `my-blog` 仓库。

    ```bash
    # 添加远程仓库地址
    git remote add origin https://github.com/your-username/my-blog.git
    git branch -M main
    
    # 提交并推送
    git add .
    git commit -m "Initial commit"
    git push -u origin main
    ```

2.  运行发布脚本，完成第一次发布。

    ```bash
    chmod +x publish.sh  # 赋予脚本执行权限
    ./publish.sh "feat: Initial public"
    ```

几分钟后，访问 `https://your-username.github.io`，你就能看到成功上线的个人博客了！

## 实例分析：axfinn_blogs

本文档所在的博客项目 `axfinn_blogs` 就是一个很好的实例。你可以通过它的[源码仓库](https://github.com/axfinn/axfinn_blogs)来学习和参考。

### 关键配置 (`config.toml`)

`axfinn_blogs` 的 `config.toml` 文件包含了一些有趣的配置：

- **永久链接格式**: 通过 `[permalinks]` 设置，将博客文章的 URL 格式定义为 `/:year-:month/:slug/`，更具可读性。
- **分类系统**: 定义了 `tags`, `series`, `categories` 三种分类方式。
- **自定义菜单**: 配置了“博客”、“动态”、“关于”等导航菜单。
- **JSON 输出**: 通过 `[outputs]` 配置，将首页内容输出为 JSON 格式，这通常用于站内搜索功能。

### 自动化发布脚本 (`publish.sh`)

`axfinn_blogs` 使用了一个更完善的 `publish.sh` 脚本，它有几个特点：

- **目标目录**: 脚本通过 `DEPLOY_DIR="../axfinn.github.io"` 变量，直接指定了发布的目标目录，而不是在 `public` 目录中操作 Git。
- **增量更新**: 脚本先删除目标目录的旧文件，再复制新生成的文件，确保了部署的纯净性。
- **统一的提交信息**: 脚本使用 `chore: Publish site updates at $(date +'%Y-%m-%d %H:%M:%S')` 作为固定的提交信息，方便追踪发布历史。

这个真实的项目案例可以帮助你更好地理解 Hugo 的配置和自动化部署的实践。

## 总结

通过本教程，你已经成功搭建并发布了自己的个人博客。现在，你可以专注于内容创作，并通过 `hugo new` 创建新文章，然后运行 `./publish.sh` 来一键更新你的博客。祝你写作愉快！
