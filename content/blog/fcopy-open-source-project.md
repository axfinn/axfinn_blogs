---
title: "fcopy - 一个全平台剪贴板同步工具"
date: 2025-08-12T14:00:00+08:00
draft: false
tags: ["开源项目", "剪贴板", "工具", "Node.js", "Vue"]
categories: ["开源项目"]
series: ["开源项目"]
---

在日常工作中，我们经常需要在不同设备之间复制粘贴文本、图片或文件。虽然有很多商业解决方案，但我还是希望能有一个简单、安全、自托管的解决方案。因此，我开发了 [fcopy](https://github.com/axfinn/fcopy) - 一个全平台剪贴板同步工具。

## 项目介绍

[fcopy](https://github.com/axfinn/fcopy) 是一个基于 Web 的剪贴板同步工具，支持文本和文件的跨设备同步。它采用现代化的技术栈构建，具有响应式设计，可以在桌面端和移动端使用。

项目的主要特性包括：

- 📋 文本和文件剪贴板同步
- 🔐 安全的API密钥认证机制
- 🖼️ 图片预览和文件下载
- 📱 响应式设计，支持移动端使用
- 🌐 Socket.IO实时同步
- 📊 访问统计和监控面板
- 👤 用户管理和数据隔离
- 🐳 Docker容器化部署支持

## 项目背景和动机

在日常工作中，我经常需要在不同的设备之间复制粘贴内容，比如在电脑上复制一段代码，然后在远程服务器上粘贴；或者在手机上看到一段文字，想要快速发送到电脑上处理。虽然系统自带的剪贴板功能可以在单一设备上使用，但在跨设备场景下却显得力不从心。

市面上虽然有一些商业解决方案，如苹果的通用剪贴板、微软的剪贴板云同步等，但它们通常只支持特定的生态系统，而且数据存储在第三方服务器上，存在隐私风险。因此，我决定开发一个自托管的、跨平台的剪贴板同步工具，既能保证数据隐私，又能支持各种设备。

## 技术架构

fcopy 采用前后端分离的架构设计：

### 后端技术栈：
- **Node.js + Express**：提供 RESTful API 和 WebSocket 服务
- **Socket.IO**：实现实时通信功能，确保内容变更能够即时同步到所有连接的设备
- **better-sqlite3**：轻量级数据库存储，用于保存剪贴板历史记录和用户信息
- **Docker**：容器化部署支持，便于快速部署和迁移

### 前端技术栈：
- **Vue 3**：现代化的前端框架，使用 Composition API 构建响应式界面
- **Webpack 5**：模块打包工具，优化资源加载和构建流程

### 项目结构：
```
├── client/           # 前端代码
├── server/           # 后端代码
├── uploads/          # 上传文件存储目录
├── nginx.conf        # Nginx 配置示例
├── docker-compose.yml# Docker Compose 配置
├── Dockerfile        # Docker 镜像构建文件
├── deploy.sh         # 部署脚本
├── package.json      # 项目配置
└── README.md         # 项目说明
```

## 快速开始

使用 Docker 是最简单的部署方式：

```bash
# 拉取最新版本镜像
docker pull axiu/fcopy:latest

# 运行容器
docker run -d \
--name fcopy \
-p 2001:2001 \
-v /path/to/your/data:/app/uploads \
axiu/fcopy:latest
```

或者使用 Docker Compose：

```yaml
version: '3.8'
services:
  fcopy:
    image: axiu/fcopy:1.2.16
    container_name: fcopy
    ports:
      - "2001:2001"
    volumes:
      - ./data:/app/data
    environment:
      - EXPIRE_HOURS=24
```

然后访问 `http://localhost:2001` 即可开始使用。

## 安全机制

fcopy 采用多层安全机制来保护用户数据：

### API 密钥鉴权

为了防止未授权访问和信息泄露，系统采用 API 密钥鉴权机制：

1. 所有 API 请求都需要在 Header 中包含 `X-API-Key` 字段
2. WebSocket 连接也需要在握手时提供有效的 API 密钥
3. 密钥验证失败的请求将被拒绝访问

在生产环境中，应通过环境变量设置密钥：

```bash
CLIPBOARD_API_KEY=your_secret_api_key npm run dev
```

### 数据隔离

系统支持多用户，每个用户的数据完全隔离：

- 所有请求都必须通过鉴权才能访问
- 不同用户/设备使用不同密钥实现数据隔离
- 前端会将密钥存储在 localStorage 中以便下次访问

默认会创建两个用户：
- 普通用户（default）：用于日常剪贴板同步
- 管理员用户（admin）：可以创建新用户和查看系统统计信息

### 请求频率限制

为了防止恶意请求和滥用，系统实现了请求频率限制：

```bash
# 限制在时间窗口内的请求数量（默认10次）
RATE_LIMIT_REQUESTS=10

# 时间窗口（毫秒，默认60000毫秒即1分钟）
RATE_LIMIT_WINDOW_MS=60000

# 封禁时长（毫秒，默认600000毫秒即10分钟）
RATE_LIMIT_BLOCK_DURATION_MS=600000
```

## 核心功能详解

### 1. 多平台支持

fcopy 基于 Web 技术构建，可以在任何支持现代浏览器的设备上使用，包括：
- Windows、macOS、Linux 桌面系统
- iOS、Android 移动设备
- 各种浏览器（Chrome、Firefox、Safari等）

采用响应式设计，界面会根据设备屏幕大小自动调整布局，确保在各种设备上都有良好的使用体验。

### 2. 截图粘贴上传

用户可以在任何地方截图（如QQ截图、微信截图、系统截图工具等），然后直接在 fcopy 界面按 `Ctrl+V` (Windows) 或 `Cmd+V` (Mac) 粘贴上传截图。

这一功能极大地方便了图片内容的传输，无需保存截图文件再上传，直接粘贴即可完成操作。

### 3. 实时同步

通过 Socket.IO 实现实时同步，当在一个设备上添加内容时，其他设备会立即收到更新。这一功能基于 WebSocket 技术，确保了内容变更的即时传播。

### 4. 数据隔离

系统支持多用户，每个用户只能访问自己的数据，确保数据隐私和安全。即使多个用户部署在同一实例上，他们的数据也是完全隔离的。

### 5. 自动清理

系统每天凌晨2点会自动清理指定天数前的内容（默认7天），包括数据库记录和存储的文件。这一机制既节省了存储空间，又保护了用户隐私。

清理天数可通过环境变量 `CLEANUP_DAYS` 配置，默认为7天。

### 6. 缓存控制

项目实现了智能缓存控制策略：
1. HTML文件：不缓存，确保用户始终获取最新版本
2. JS/CSS文件：缓存1年，通过内容哈希实现版本控制
3. 图片文件：缓存1年，通过内容哈希实现版本控制

这种策略既保证了页面的实时更新，又优化了静态资源的加载速度。

## 部署和配置

fcopy 支持多种部署方式，推荐使用 Docker 部署以获得最佳体验。

### Docker 部署（推荐）

#### 使用 Docker Compose（推荐）

1. 确保已安装 Docker 和 Docker Compose
2. 创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'
services:
  fcopy:
    image: axiu/fcopy:1.2.16
    container_name: fcopy
    ports:
      - "2001:2001"
    volumes:
      - ./data:/app/data
    environment:
      - CLIPBOARD_API_KEY=your_secret_api_key
      - ADMIN_API_KEY=your_admin_secret_key
      - CLEANUP_DAYS=7
```

3. 启动服务：
```bash
docker-compose up -d
```

4. 访问应用：http://localhost:2001

#### 环境变量配置

支持多种方式设置 API 密钥：

1. 通过环境变量：
```bash
export CLIPBOARD_API_KEY=your_secret_api_key
docker-compose up -d
```

2. 通过 `.env` 文件（会自动生成）：
```bash
CLIPBOARD_API_KEY=your_secret_api_key
ADMIN_API_KEY=your_admin_secret_key
CLEANUP_DAYS=7
```

系统会优先使用环境变量中的配置，如果没有设置，则从 `.env` 文件中读取。

#### 数据持久化

- 数据库文件 (clipboard.db) 会挂载到本地目录
- 上传的文件会保存在 uploads 目录中

### 部署脚本

项目提供了一个交互式部署脚本 [deploy.sh](https://github.com/axfinn/fcopy/blob/main/deploy.sh)，支持以下功能：

```bash
chmod +x deploy.sh
./deploy.sh                # 交互式部署
./deploy.sh deploy         # 部署应用
./deploy.sh start          # 启动服务
./deploy.sh stop           # 停止服务
./deploy.sh restart        # 重启服务
./deploy.sh status         # 查看服务状态
./deploy.sh logs           # 查看日志
./deploy.sh env            # 设置环境变量
./deploy.sh show-key       # 显示当前API密钥
./deploy.sh start-prod     # 启动生产环境服务
```

### 手动部署

1. 克隆项目代码：
```bash
git clone https://github.com/axfinn/fcopy.git
cd fcopy
```

2. 安装依赖：
```bash
npm install
```

3. 设置 API 密钥并启动开发服务器：
```bash
CLIPBOARD_API_KEY=your_secret_api_key npm run dev
```

或者在 Windows 系统中：
```cmd
set CLIPBOARD_API_KEY=your_secret_api_key && npm run dev
```

4. 访问应用：
打开浏览器访问 http://localhost:3000

### Nginx 配置示例

如果希望通过 Nginx 接入网关，可以参考项目中的 nginx.conf 文件。

示例配置要点：
1. 静态文件服务
2. API 接口代理
3. WebSocket 支持
4. 文件上传目录访问

## API 接口

### 鉴权

所有 API 请求都需要在 Header 中包含 X-API-Key 字段：

```
X-API-Key: your-api-key-here
```

### 接口列表

- `GET /api/clipboard` - 获取剪贴板历史记录（仅当前用户数据）
- `POST /api/clipboard/text` - 添加文本内容
- `POST /api/clipboard/file` - 上传文件
- `DELETE /api/clipboard/:id` - 删除指定内容（仅能删除自己的内容）
- `GET /api/users` - 获取用户列表（仅管理员）
- `POST /api/users` - 创建新用户（仅管理员）
- `GET /api/access-logs` - 获取访问日志（仅管理员）
- `GET /api/rate-limits` - 获取限流状态（仅管理员）

## 使用说明

1. 首次访问：输入 API 密钥进行鉴权
2. 添加文本：在"添加内容"标签页的文本框中输入内容，点击"添加文本并同步"按钮
3. 添加文件/图片：在"添加内容"标签页中拖拽文件到上传区域或点击上传按钮选择文件
4. 查看历史：切换到"内容历史"标签页查看所有同步的内容
5. 复制文本：在历史记录中点击文本条目旁的"复制文本"按钮
6. 下载文件：在历史记录中点击文件条目旁的"下载文件"按钮
7. 删除内容：点击文件条目旁的"删除"按钮删除不需要的内容

## 项目地址

项目已开源在 GitHub 上：[https://github.com/axfinn/fcopy](https://github.com/axfinn/fcopy)

欢迎大家使用、反馈和贡献代码！如果你觉得这个项目对你有帮助，欢迎 Star 项目或者通过文章底部的赞赏支持我继续开发。

## 未来计划

我计划继续完善 fcopy，增加以下功能：

1. 端到端加密：进一步提升数据安全性
2. 更丰富的文件管理功能
3. 移动端原生应用
4. 更详细的使用统计和分析

如果你有任何建议或想法，欢迎在 GitHub 上提交 Issue 或 PR。