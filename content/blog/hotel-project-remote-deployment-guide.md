---
title: "Hotel 项目：远程服务器部署指南"
date: 2025-07-19T11:00:00+08:00
draft: false
slug: "hotel-project-remote-deployment-guide"
tags: ["Docker", "部署", "教程", "运维", "项目分析"]
categories: ["技术", "教程"]
---

# Hotel 项目：远程服务器部署指南

本文档提供了将 `hotel` 酒店管理系统部署到远程服务器的详细步骤，主要通过 Docker 进行。

## 前提条件

在开始之前，请确保您的远程服务器已安装以下工具：

*   **Git**: 用于克隆项目仓库。
*   **Docker**: 用于构建和运行容器化应用程序。
*   **SSH 访问**: 用于连接到您的远程服务器。

## 部署步骤

请按照以下步骤在您的远程服务器上部署 `hotel` 项目：

### 1. 连接到您的远程服务器

使用 SSH 连接到您的远程服务器：

```bash
ssh your_username@your_server_ip
```

### 2. 克隆仓库

导航到您希望部署的目录（例如，`/opt/apps/`），然后克隆 `hotel` 项目仓库：

```bash
cd /opt/apps/ # 或您偏好的目录
git clone git@github.com:axfinn/hotel.git
cd hotel
```

### 3. 构建 Docker 镜像

项目根目录下的 `Dockerfile` 定义了如何构建应用程序的 Docker 镜像。使用以下命令构建镜像：

```bash
docker build -t hotel-app .
```
此命令将从当前目录的 `Dockerfile` 构建一个名为 `hotel-app` 的镜像。

### 4. 运行 Docker 容器

镜像构建完成后，您可以在 Docker 容器中运行应用程序。关键在于将应用程序的端口（5000）映射到您主机上的一个端口（例如 80 或 8000），并挂载一个卷用于数据持久化存储。

```bash
docker run -d \
  --name hotel-instance \
  -p 80:5000 \
  -v /path/on/host/for/data:/app/hotel.db \
  hotel-app
```

**参数说明：**
*   `-d`: 在分离模式（后台）运行容器。
*   `--name hotel-instance`: 为您的容器指定一个名称，便于管理。
*   `-p 80:5000`: 将主机上的 80 端口映射到容器内部的 5000 端口。您可以将 `80` 更改为您的主机上任何可用的端口。
*   `-v /path/on/host/for/data:/app/hotel.db`: **数据持久化的关键。** 这将您主机上的一个目录（`/path/on/host/for/data`）挂载到容器内部 SQLite 数据库文件（`/app/hotel.db`）的位置。**请将 `/path/on/host/for/data` 替换为您服务器上实际的绝对路径，您希望在此处存储数据库文件。** 这确保了即使容器被删除或更新，您的数据也不会丢失。
*   `hotel-app`: 要运行的 Docker 镜像名称。

### 5. 验证部署

运行容器后，您可以验证其状态并访问应用程序：

*   **检查容器状态**：
    ```bash
    docker ps
    ```
    您应该看到 `hotel-instance` 被列出，状态为 `Up`。

*   **访问应用程序**：
    打开您的 Web 浏览器，导航到 `http://your_server_ip`（如果您使用了 80 以外的端口，则为 `http://your_server_ip:your_mapped_port`）。您应该能看到酒店管理系统的主页。

## 生产环境考量（可选）

对于生产环境，请考虑以下事项：

*   **Nginx 反向代理**: 为了更好的性能、安全性（SSL/TLS）和处理多个域名，您可能希望在 Docker 容器前设置 Nginx 作为反向代理。
*   **专用数据卷**: 确保 `/app/hotel.db` 的挂载卷位于可靠、已备份的存储位置。
*   **环境变量**: 使用 Docker 环境变量而不是硬编码敏感信息。

## 故障排除

*   **容器未启动**: 检查 `docker logs hotel-instance` 获取错误信息。
*   **端口冲突**: 确保您选择的主机端口（`-p`）未被占用。
*   **数据库未持久化**: 仔细检查卷挂载路径和权限。

