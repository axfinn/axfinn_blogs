---
title: "Git 学习与详细使用指南"
date: 2025-07-19T11:00:00+08:00
draft: false
slug: "git-learning-and-usage-guide"
tags: ["Git", "版本控制", "教程", "开发工具"]
categories: ["技术", "教程"]
---

# Git 学习与详细使用指南

Git 是目前世界上最流行、最先进的分布式版本控制系统。它能够高效地管理项目代码，记录每一次修改，并允许多人协作开发。无论你是个人开发者还是团队成员，掌握 Git 都是一项必备技能。

本文将从 Git 的基本概念入手，逐步深入到常用命令、分支管理、远程协作，并提供一些高级技巧和参考资源，帮助你全面掌握 Git。

## 1. Git 基础概念

在深入学习 Git 命令之前，理解以下核心概念至关重要：

*   **版本控制系统 (VCS)**: 记录文件内容变化，以便将来查阅特定版本修订情况的系统。
*   **分布式版本控制系统 (DVCS)**: 每个开发者都拥有完整的代码仓库副本，无需依赖中央服务器即可进行大部分操作。
*   **仓库 (Repository)**: 存储项目所有文件和历史记录的��方。分为本地仓库和远程仓库。
*   **工作区 (Working Directory)**: 你在电脑上实际操作的目录，包含项目文件。
*   **暂存区 (Staging Area / Index)**: 一个临时区域，用于存放你即将提交（commit）的更改。你可以选择性地将工作区的修改添加到暂存区。
*   **提交 (Commit)**: 将暂存区的更改永久保存到本地仓库的历史记录中。每次提交都会生成一个唯一的 SHA-1 值作为标识。
*   **分支 (Branch)**: Git 中最强大的功能之一。它允许你在不影响主线开发的情况下，独立地进行新功能开发或 bug 修复。每个分支都是一个独立的开发线。
*   **HEAD**: 指向当前所在分支的指针。

## 2. Git 安装与配置

### 2.1 安装 Git

*   **macOS**: `brew install git`
*   **Linux (Debian/Ubuntu)**: `sudo apt-get install git`
*   **Windows**: 从 [Git 官方网站](https://git-scm.com/download/win) 下载安装包。

安装完成后，在终端输入 `git --version` 验证是否成功。

### 2.2 配置用户信息

首次使用 Git，需要配置你的用户名和邮箱，这些信息会记录在你的每次提交中。

```bash
git config --global user.name "Your Name"
git config --global user.email "your_email@example.com"
```
`--global` 参数表示全局配置，对所有 Git 仓库生效。如果只想对当前仓库生效，移除 `--global` 即可。

### 2.3 配置默认编辑器 (可选)

Git 在需要输入提交信息时会启动一个文本编辑器。你可以配置自己喜欢的编辑器：

```bash
git config --global core.editor "vim" # 例如设置为 Vim
# git config --global core.editor "code --wait" # 例如设置为 VS Code
```

## 3. Git 基本操作

### 3.1 初始化仓库

在一个新项目目录中，将其转换为 Git 仓库：

```bash
cd my-new-project
git init
```
这会在当前目录创建一个 `.git` 隐藏文件夹，用于存储 Git 仓库的所有信息。

### 3.2 添加文件到暂存区

将工作区的修改添加到暂存区，准备提交：

```bash
git add <file> # 添加指定文件
git add .      # 添加当前目录所有修改过的文件（包括新增、修改、删除）
git add -u     # 添加已跟踪文件的修改和删除，不包括新增文件
git add -A     # 添加所有修改（包括新增、修改、删除），等同于 git add .
```

### 3.3 提交更改

将暂存区的更改提交到本地仓库：

```bash
git commit -m "Your commit message" # 提交并附带简短信息
git commit # 提交，会打开配置的编辑器让你输入详细信息
```
提交信息应该清晰、简洁地描述本次提交做了什么。

### 3.4 查看状态

查看工作区和暂存区的状态：

```bash
git status
```
它会告诉你哪些文件已修改、哪些已暂存、哪些是未跟踪文件。

### 3.5 查看提交历史

查看仓库的提交历史记录：

```bash
git log # 查看所有提交历史
git log --oneline # 简洁模式，每条提交一行
git log --graph --oneline --all # 查看所有分支的图形化历史
git log -p <file> # 查看某个文件的修改历史及具体内容差异
```

### 3.6 撤销操作

*   **撤销工作区的修改** (未 `git add`)：
    ```bash
git checkout -- <file> # 丢弃某个文件的所有本地修改
git restore <file> # Git 2.23+ 推荐使用
    ```
*   **撤销暂存区的修改** (已 `git add` 但未 `git commit`)：
    ```bash
git reset HEAD <file> # 将文件从暂存区移回工作区
git restore --staged <file> # Git 2.23+ 推荐使用
    ```
*   **撤销已提交的修改** (已 `git commit`)：
    *   **回退到某个版本** (会创建新的提交，推荐用于已推送的提交)：
        ```bash
git revert <commit-hash> # 撤销指定提交，并生成一个新的提交来抵消之前的更改
        ```
    *   **重置到某个版本** (会修改历史，慎用，尤其是在已推送的公共分支上)：
        ```bash
git reset --hard <commit-hash> # 彻底丢弃指定提交之后的所有更改
git reset --soft <commit-hash> # 移动 HEAD 指针，但保留更改在暂存区
git reset --mixed <commit-hash> # 移动 HEAD 指针，并清空暂存区，保留更改在工作区 (默认)
        ```

## 4. Git 分支管理

分支是 Git 的灵魂，它让并行开发变得简单高效。

### 4.1 查看分支

```bash
git branch # 列出所有本地分支，当前分支会用 * 标记
git branch -a # 列出所有本地和远程分支
```

### 4.2 创建分支

```bash
git branch <new-branch-name> # 创建新分支，但仍停留在当前分支
```

### 4.3 切换分支

```bash
git checkout <branch-name> # 切换到指定分支
git switch <branch-name> # Git 2.23+ 推荐使用
```

### 4.4 创建并切换分支

```bash
git checkout -b <new-branch-name> # 创建并立即切换到新分支
git switch -c <new-branch-name> # Git 2.23+ 推荐使用
```

### 4.5 合并分支

将一个分支的更改合并到当前分支：

```bash
git merge <source-branch> # 将 source-branch 合并到当前分支
```
合并时可能会遇到冲突 (Conflict)，需要手动解决。

### 4.6 删除分支

```bash
git branch -d <branch-name> # 删除已合并的分支
git branch -D <branch-name> # 强制删除未合并的分支 (慎用)
```

### 4.7 解决合并冲突

当两个分支对同一文件的同一部分进行了不同的修改时，会发生冲突。Git 会在文件中标记冲突区域：

```
<<<<<<< HEAD
// 当前分支的修改
=======
// 合并分支的修改
>>>>>>> <branch-name>
```

你需要手动编辑文件，选择保留哪些内容，然后删除冲突标记。解决冲突后，执行：

```bash
git add <conflicted-file> # 将解决后的文件添加到暂存区
git commit -m "Resolve merge conflict" # 提交合并结果
```

## 5. Git 远程协作

Git 的强大之处在于其分布式特性，可以方便地与远程仓库协作。

### 5.1 查看远程仓库

```bash
git remote # 列出所有远程仓库名称 (通常是 origin)
git remote -v # 列出所有远程仓库的详细信息 (URL)
```

### 5.2 添加远程仓库

将本地仓库关联到远程仓库：

```bash
git remote add origin <remote-repository-url>
```
通常，`origin` 是默认的远程仓库名称。

### 5.3 从远程仓库拉取

获取远程仓库的最新更改：

```bash
git fetch origin # 从远程仓库下载最新数据，但不合并到本地分支
git pull origin <branch-name> # 下载最新数据并合并到当前分支 (等同于 fetch + merge)
```
`git pull` 经常用于同步远程 `main` 或 `master` 分支的最新代码。

### 5.4 推送到远程仓库

将本地提交推送到远程仓库：

```bash
git push origin <branch-name> # 将本地分支推送到远程仓库
git push -u origin <branch-name> # 首次推送时，设置本地分支与远程分支的关联
```

### 5.5 克隆远程仓库

从远程仓库完整地复制一份到本地：

```bash
git clone <remote-repository-url> # 克隆整个仓库，包括所有历史记录和分支
```

## 6. Git 高级技巧 (可选)

### 6.1 Rebase (变基)

`rebase` 可以将一系列提交“移动”到另一个基底上，使提交历史更线性、更整洁。但它会改写历史，**切勿对已推送到公共仓库的提交进行 rebase**。

```bash
git rebase <base-branch> # 将当前分支的提交“嫁接”到 base-branch 的最新提交之后
```

### 6.2 Stash (暂存)

当你正在进行一项工作，但需要临时切换到另一个任务时，可以使用 `stash` 暂存当前工作区的修改，稍后再恢复。

```bash
git stash save "message" # 暂存当前工作区和暂存区的修改
git stash list # 查看所有暂存列表
git stash pop # 恢复最近一次暂存的修改并删除该暂存
git stash apply # 恢复最近一次暂存的修改但不删除该暂存
git stash drop # 删除最近一次暂存
```

### 6.3 Tag (标签)

标签用于标记重要的版本发布点，例如 `v1.0.0`。

```bash
git tag <tag-name> # 创建轻量标签
git tag -a <tag-name> -m "message" # 创建附注标签 (推荐)
git push origin <tag-name> # 推送单个标签
git push origin --tags # 推送所有标签
```

### 6.4 Gitignore

`.gitignore` 文件用于指定 Git 应该忽略的文件或目录，例如编译生成的文件、日志文件、依赖包等。

示例 `.gitignore` 内容：

```
# Logs
*.log
npm-debug.log*

# Dependency directories
node_modules/
venv/

# OS generated files
.DS_Store
Thumbs.db

# Compiled output
/dist/
/build/
```

## 7. 常用 Git 工作流

*   **集中式工作流**: 所有开发者都向一个中央仓库推送代码，通常只有一个 `master` 或 `main` 分支。
*   **功能分支工作流 (Feature Branch Workflow)**: 为每个新功能或 bug 修复创建一个独立的分支，完成后合并到 `main` 分支。
*   **Gitflow 工作流**: 一种更复杂、更严格的工作流，包含 `master`、`develop`、`feature`、`release`、`hotfix` 等多个分支，适用于大型项目。
*   **Forking 工作流**: 适用于开源项目，开发者先 Fork 仓库，在自己的 Fork 上开发，然后通过 Pull Request 贡献代码。

## 8. 学习资源与参考链接

*   **Git 官方文档**: [https://git-scm.com/doc](https://git-scm.com/doc)
*   **Pro Git (中文版)**: [https://git-scm.com/book/zh/v2](https://git-scm.com/book/zh/v2) (强烈推荐，Git 圣经)
*   **廖雪峰的 Git 教程**: [https://www.liaoxuefeng.com/wiki/896043488341144](https://www.liaoxuefeng.com/wiki/896043488341144) (入门友好)
*   **GitHub Guides**: [https://guides.github.com/](https://guides.github.com/) (GitHub 官方指南)
*   **Atlassian Git 教程**: [https://www.atlassian.com/git/tutorials](https://www.atlassian.com/git/tutorials) (图文并茂，概念清晰)

希望这份指南能帮助你更好地理解和使用 Git！
