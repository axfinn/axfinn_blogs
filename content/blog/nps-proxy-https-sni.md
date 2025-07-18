---
title: "NPS 代理实现：HTTPS 代理与 SNI 证书管理"
date: 2024-07-18T17:15:00+08:00
draft: false
tags: ["NPS", "HTTPS代理", "SNI", "SSL/TLS", "Go语言", "网络安全"]
categories: ["技术", "项目分析"]
---

## 引言

在 NPS 系列文章中，我们已经探讨了 NPS 的整体架构、服务端核心以及多种代理模式。本篇文章将深入 NPS 的 **HTTPS 代理**实现。我们将通过分析 `nps/server/proxy/https.go` 文件，揭示 NPS 如何处理加密的 HTTPS 流量，特别是其对 SNI（Server Name Indication）的支持和多证书管理机制。

## HTTPS 代理的需求与挑战

HTTPS 代理比普通的 HTTP 代理更为复杂，因为它涉及到 SSL/TLS 加密。主要挑战包括：

*   **SSL/TLS 握手**：代理服务器需要参与 SSL/TLS 握手过程，解密客户端请求，然后加密转发给目标服务器，或者直接将加密流量转发给目标服务器。
*   **SNI 支持**：为了在同一个 IP 地址上托管多个 HTTPS 网站，客户端在 SSL/TLS 握手时会通过 SNI 扩展告知服务器其要访问的域名。代理服务器需要根据 SNI 信息选择正确的证书。
*   **证书管理**：代理服务器需要能够管理和加载多个域名的 SSL/TLS 证书。

## `https.go`：HTTPS 代理的实现

`https.go` 文件定义了 `HttpsServer` 结构体，它是 NPS 实现 HTTPS 代理的核心。

### `HttpsServer` 结构体

`HttpsServer` 结构体继承了 `httpServer`（虽然在 `https.go` 中没有直接定义 `httpServer`，但从代码逻辑看，它应该是一个包含 `BaseServer` 和一些 HTTP 相关功能的结构体），并增加了 HTTPS 特有的字段：

```go
type HttpsServer struct {
    httpServer
    listener         net.Listener
    httpsListenerMap sync.Map
    hostIdCertMap    sync.Map
}
```

*   `httpServer`：继承了处理 HTTP 请求的通用逻辑。
*   `listener net.Listener`：用于监听传入 HTTPS 连接的网络监听器。
*   `httpsListenerMap sync.Map`：一个并发安全的 Map，用于存储不同域名的 `HttpsListener` 实例。键通常是域名，值是 `*HttpsListener`。
*   `hostIdCertMap sync.Map`：一个并发安全的 Map，用于存储主机 ID 与其对应的证书文件路径或内容。用于管理和更新证书。

`NewHttpsServer()` 函数用于创建并初始化一个 `HttpsServer` 实例。

### `Start()` 方法：启动 HTTPS 监听与 SNI 处理

`HttpsServer` 的 `Start()` 方法负责启动 HTTPS 监听，并为每个传入连接进行 SNI 解析和证书选择：

```go
func (https *HttpsServer) Start() error {
    conn.Accept(https.listener, func(c net.Conn) {
        serverName, rb := GetServerNameFromClientHello(c) // 从 ClientHello 中获取 SNI
        r := buildHttpsRequest(serverName) // 构建一个模拟的 HTTP 请求
        if host, err := file.GetDb().GetInfoByHost(serverName, r); err != nil {
            c.Close()
            logs.Debug("the url %s can't be parsed!,remote addr %s", serverName, c.RemoteAddr().String())
            return
        } else {
            if host.CertFilePath == "" || host.KeyFilePath == "" {
                logs.Debug("加载客户端本地证书")
                https.handleHttps2(c, serverName, rb, r) // 使用客户端本地证书
            } else {
                logs.Debug("使用上传证书")
                // 判断是路径还是证书内容
                if strings.Contains(host.CertFilePath, "-----BEGIN") || strings.Contains(host.KeyFilePath, "-----BEGIN") {
                    logs.Debug("通过上传文件加载证书")
                    https.cert(host, c, rb, host.CertFilePath, host.KeyFilePath) // 使用上传的证书内容
                } else {
                    logs.Debug("通过路径加载证书")
                    // 检查证书文件是否存在，并读取内容
                    // ...
                    https.cert(host, c, rb, string(cert), string(key)) // 使用上传的证书文件
                }
            }
        }
    })
    return nil
}
```

**核心流程：**

1.  **获取 SNI**：`GetServerNameFromClientHello(c)` 是一个关键函数，它通过读取客户端发送的 SSL/TLS `ClientHello` 消息，从中解析出 SNI 域名 (`serverName`) 和原始的字节流 (`rb`)。
2.  **查找主机配置**：根据 `serverName` 从数据库中查找对应的主机配置 (`file.Host`)。
3.  **证书选择**：
    *   如果主机配置中没有指定证书路径 (`CertFilePath` 和 `KeyFilePath`)，则表示使用客户端本地证书（通常是直接转发加密流量）。
    *   如果主机配置中指定了证书，NPS 会判断证书是直接上传的内容还是文件路径。
    *   **`https.cert()`**：这个函数负责加载或更新证书，并为该证书创建一个 `HttpsListener`。

### `HttpsListener`：动态创建的 HTTPS 监听器

`HttpsListener` 是一个自定义的 `net.Listener` 实现，它允许 NPS 动态地为不同的域名创建和管理 HTTPS 监听器。

```go
type HttpsListener struct {
    acceptConn     chan *conn.Conn
    parentListener net.Listener
}
```

*   `acceptConn chan *conn.Conn`：一个通道，用于接收来自 `HttpsServer` 的连接。
*   `parentListener net.Listener`：底层的 TCP 监听器。

`NewHttpsListener()` 用于创建 `HttpsListener` 实例。

### `cert()`：证书管理与动态 HTTPS 服务

`cert()` 函数是 NPS 实现多证书管理和动态 HTTPS 服务的核心：

1.  **证书缓存与更新**：它会检查 `hostIdCertMap` 中是否已经存在该主机的证书。
    *   如果证书已存在且未更改，则直接复用已有的 `HttpsListener`。
    *   如果证书已更改，则会关闭旧的 `HttpsListener`，创建新的 `HttpsListener`，并更新 Map。
    *   如果是第一次加载证书，则创建新的 `HttpsListener`。
2.  **创建 `HttpsListener`**：通过 `NewHttpsListener()` 创建一个 `HttpsListener` 实例。
3.  **启动 HTTPS 服务**：调用 `https.NewHttps(l, certFileUrl, keyFileUrl)` 在新的 `HttpsListener` 上启动 HTTPS 服务。
4.  **将连接传递给 `HttpsListener`**：将原始的客户端连接 (`c`) 和其原始字节流 (`rb`) 封装为 `conn.Conn`，并通过 `l.acceptConn <- acceptConn` 发送给对应的 `HttpsListener`。`HttpsListener` 会负责后续的 SSL/TLS 握手和数据处理。

### `handleHttps2()` 和 `handleHttps()`：HTTPS 流量转发

这两个函数（`handleHttps2` 和 `handleHttps`，虽然 `handleHttps` 在当前代码中被注释掉了，但其逻辑类似）负责将 HTTPS 流量转发给目标服务：

1.  **流量和连接数检查**：检查客户端的流量和连接数是否超出限制。
2.  **认证检查**：对请求进行认证。
3.  **获取目标地址**：从主机配置中获取目标地址。
4.  **调用 `https.DealClient()`**：最终都通过 `BaseServer` 的 `DealClient()` 方法来建立与目标服务的连接并进行数据转发。

### `GetServerNameFromClientHello()`：SNI 解析

这个辅助函数负责从客户端的 SSL/TLS `ClientHello` 消息中解析出 SNI 域名。它通过解析 TLS 协议的字节流来实现。

### `buildHttpsRequest()`：构建模拟 HTTP 请求

这个辅助函数用于根据 SNI 域名构建一个模拟的 `http.Request`，以便在 `file.GetDb().GetInfoByHost()` 中查找对应的主机配置。

## 总结

`nps/server/proxy/https.go` 文件展示了 NPS 如何实现强大的 HTTPS 代理功能。其核心在于对 SNI 的支持和动态证书管理。通过解析 `ClientHello` 消息获取 SNI 域名，NPS 能够根据不同的域名选择和加载对应的 SSL/TLS 证书，并在 `HttpsListener` 上启动独立的 HTTPS 服务。这使得 NPS 能够在一个端口上代理多个 HTTPS 网站，极大地提升了其在复杂网络环境中的应用能力。

在下一篇文章中，我们将继续探索 NPS 的其他代理模式，例如 HTTP/HTTPS 域名解析。
