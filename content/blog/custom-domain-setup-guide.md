---
title: "为Hugo博客配置自定义域名完整指南"
date: 2025-08-12T14:45:00+08:00
draft: false
tags: ["博客", "自定义域名", "GitHub Pages", "DNS配置"]
categories: ["技术教程"]
series: ["博客优化"]
---

为博客配置自定义域名可以让网站看起来更专业，也有助于品牌建设。本文将详细介绍如何为基于 Hugo 构建并托管在 GitHub Pages 上的博客配置自定义域名 blog.jaxiu.cn。

## 一、准备工作

在开始配置之前，您需要：

1. 拥有一个已注册的域名（如 jaxiu.cn）
2. 拥有该域名的管理权限
3. 确保博客已经部署在 GitHub Pages 上

## 二、配置步骤

### 1. 修改Hugo配置文件

首先，需要修改博客的配置文件 `config.toml`，将 baseURL 更新为您的自定义域名：

```toml
baseURL = 'https://blog.jaxiu.cn/'
```

### 2. 创建CNAME文件

在 Hugo 项目的 `static` 目录下创建一个名为 `CNAME` 的文件（注意没有扩展名），内容为您的自定义域名：

```
blog.jaxiu.cn
```

当 Hugo 构建站点时，这个文件会被自动复制到 `public` 目录下，GitHub Pages 会读取这个文件来知道应该将哪个域名指向您的站点。

### 3. 配置DNS记录

登录到您的域名注册商管理面板（如阿里云、腾讯云等），添加相应的DNS记录。

#### 对于子域名（如 blog.jaxiu.cn）

如果您使用的是子域名（推荐方式），需要添加一条 CNAME 记录：

| 记录类型 | 主机记录 | 解析线路 | 记录值 | TTL |
|---------|---------|---------|-------|-----|
| CNAME | blog | 默认 | axfinn.github.io. | 600 |

注意：
- 主机记录填写 `blog`（因为您的域名是 blog.jaxiu.cn）
- 记录值必须包含末尾的点号 `axfinn.github.io.`
- TTL 可以根据需要设置，通常设置为较短的时间如 600 秒

#### 对于根域名（如 jaxiu.cn）

如果您想直接使用根域名（不推荐），需要添加两条 A 记录：

| 记录类型 | 主机记录 | 解析线路 | 记录值 | TTL |
|---------|---------|---------|-------|-----|
| A | @ | 默认 | 185.199.108.153 | 600 |
| A | @ | 默认 | 185.199.109.153 | 600 |
| A | @ | 默认 | 185.199.110.153 | 600 |
| A | @ | 默认 | 185.199.111.153 | 600 |

### 4. 在GitHub仓库中配置自定义域名

1. 访问您的 GitHub 仓库（axfinn/axfinn.github.io）
2. 点击 "Settings" 标签
3. 在左侧菜单中找到 "Pages" 选项
4. 在 "Custom domain" 输入框中输入您的自定义域名：`blog.jaxiu.cn`
5. 点击 "Save" 保存设置

GitHub 会自动在您的仓库中创建或更新 CNAME 文件。

### 5. 强制HTTPS（推荐）

在 GitHub Pages 的设置页面中，建议勾选 "Enforce HTTPS" 选项，这样可以确保所有访问都通过 HTTPS 协议，提高网站安全性。

## 三、验证配置

### 1. 检查DNS配置

可以使用以下命令检查DNS记录是否生效：

```bash
# 检查CNAME记录
nslookup blog.jaxiu.cn

# 或者使用dig命令
dig blog.jaxiu.cn CNAME
```

### 2. 检查GitHub Pages状态

在 GitHub Pages 设置页面中，您可以看到自定义域名的配置状态。如果配置正确，会显示 "Your site is published at https://blog.jaxiu.cn/"。

### 3. 测试访问

在浏览器中访问 https://blog.jaxiu.cn，确认网站能够正常加载。

## 四、注意事项

### 1. CNAME文件的重要性

CNAME 文件对于 GitHub Pages 的自定义域名配置至关重要。每次部署时，都需要确保该文件存在于 `public` 目录中。在 Hugo 中，将该文件放在 `static` 目录下可以确保它被正确复制。

### 2. HTTPS证书

GitHub Pages 会自动为自定义域名申请和配置 Let's Encrypt 的免费SSL证书。配置完成后，建议启用 "Enforce HTTPS" 选项。

### 3. DNS传播时间

DNS 记录更新后，可能需要几分钟到几小时的时间才能在全球范围内生效，这个过程称为 DNS 传播。

### 4. 配置备份

建议将 DNS 配置信息备份保存，以便在需要时快速恢复。

## 五、常见问题及解决方案

### 1. 网站无法访问

- 检查DNS记录是否正确配置
- 确认CNAME文件内容是否正确
- 等待DNS传播完成（通常需要几分钟到几小时）

### 2. HTTPS证书问题

- 确保在GitHub Pages设置中启用了Enforce HTTPS
- 如果证书没有自动更新，可以尝试删除并重新添加自定义域名

### 3. 自定义域名被重置

- 检查每次部署时是否都包含了CNAME文件
- 确认GitHub仓库中没有其他操作会覆盖CNAME文件

## 六、总结

通过以上步骤，您已经成功为 Hugo 博客配置了自定义域名 blog.jaxiu.cn。自定义域名不仅让网站看起来更专业，也有助于SEO优化和品牌建设。

配置完成后，建议定期检查网站访问情况，确保一切正常运行。如果有任何问题，可以参考本文的常见问题解决方案或者查阅GitHub Pages的官方文档。