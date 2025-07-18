---
title: "NPS 代理实现：HTTP/HTTPS 域名解析与高级功能"
date: 2025-07-18T17:30:00+08:00
draft: false
tags: ["NPS", "HTTP", "HTTPS", "域名解析", "反向代理", "Go语言", "缓存", "认证"]
categories: ["技术", "项目分析"]
---

## 引言

在 NPS 系列文章中，我们已经深入探讨了 NPS 的多种代理模式。本篇文章将聚焦于 NPS 的 **HTTP/HTTPS 域名解析**功能，这是 NPS 实现 Web 服务穿透的核心。我们将通过分析 `nps/server/proxy/http.go` 文件，揭示 NPS 如何处理 HTTP 和 HTTPS 请求，并实现缓存、认证、动态后端切换等高级功能。

## HTTP/HTTPS 域名解析的需求

在实际应用中，我们经常需要将内网的 Web 服务通过域名暴露到公网。这涉及到：

*   **域名到内网 IP 的映射**：根据请求的域名，将流量转发到内网中对应的 Web 服务器。
*   **HTTP/HTTPS 协议处理**：NPS 需要能够处理标准的 HTTP 请求，以及加密的 HTTPS 请求。
*   **高级功能**：为了提升性能、安全性和灵活性，通常还需要支持缓存、认证、负载均衡、自动 HTTPS 等功能。

## `http.go`：HTTP/HTTPS 域名解析的实现

`http.go` 文件定义了 `httpServer` 结构体，它是 NPS 实现 HTTP/HTTPS 域名解析的核心。

### `httpServer` 结构体

`httpServer` 结构体继承了 `BaseServer`，并包含了 HTTP/HTTPS 代理所需的关键字段：

```go
type httpServer struct {
    BaseServer
    httpPort      int
    httpsPort     int
    httpServer    *http.Server
    httpsServer   *http.Server
    httpsListener net.Listener
    useCache      bool
    addOrigin     bool
    cache         *cache.Cache
    cacheLen      int
}
```

*   `BaseServer`：继承了 `base.go` 中定义的通用功能。
*   `httpPort int` / `httpsPort int`：HTTP 和 HTTPS 监听端口。
*   `httpServer *http.Server` / `httpsServer *http.Server`：Go 标准库的 HTTP 服务器实例。
*   `httpsListener net.Listener`：HTTPS 监听器。
*   `useCache bool` / `cache *cache.Cache` / `cacheLen int`：用于控制和管理 HTTP 缓存。
*   `addOrigin bool`：是否添加 `X-Forwarded-For` 等原始请求头。

`NewHttp()` 函数用于创建并初始化一个 `httpServer` 实例。

### `Start()` 方法：启动 HTTP/HTTPS 服务

`httpServer` 的 `Start()` 方法负责启动 HTTP 和 HTTPS 监听服务：

1.  **加载错误页面**：从文件中加载 404 错误页面内容。
2.  **启动 HTTP 服务**：如果 `httpPort` 大于 0，则创建一个 `http.Server` 实例，并在独立的 goroutine 中启动 HTTP 监听。所有 HTTP 请求都会通过 `s.handleTunneling()` 方法处理。
3.  **启动 HTTPS 服务**：如果 `httpsPort` 大于 0，则创建一个 `http.Server` 实例，并在独立的 goroutine 中启动 HTTPS 监听。这里会调用 `NewHttpsServer()` 来创建并启动一个 `HttpsServer` 实例（我们在上一篇文章中详细分析过 `https.go`），负责处理 HTTPS 流量和 SNI 证书管理。

### `handleTunneling()`：HTTP 请求的入口与分发

`handleTunneling()` 方法是所有 HTTP 请求（包括 WebSocket 升级请求）进入 `httpServer` 的入口点。它负责根据请求类型进行分发：

1.  **获取主机信息**：根据请求的 Host 头获取对应的 `file.Host` 配置信息。
2.  **自动 HTTPS 重定向**：如果主机配置启用了 `AutoHttps` 并且当前请求是 HTTP，则会进行 301 重定向到 HTTPS。
3.  **WebSocket 升级请求**：如果请求是 WebSocket 升级请求（通过检查 `Upgrade` 头），则调用 `NewHttpReverseProxy(s).ServeHTTP(w, r)`，将请求委托给 `websocket.go` 中定义的 `HttpReverseProxy` 进行处理。
4.  **普通 HTTP 请求**：如果不是 WebSocket 升级请求，则通过 `http.Hijacker` 劫持连接，然后调用 `s.handleHttp(conn.NewConn(c), r)` 处理普通 HTTP 请求。

### `handleHttp()`：普通 HTTP 请求的处理

`handleHttp()` 方法是处理普通 HTTP 请求的核心逻辑。它负责将客户端的 HTTP 请求转发给后端服务，并将响应返回给客户端：

1.  **黑名单检查**：检查客户端 IP 是否在黑名单中。
2.  **获取主机信息**：根据请求的 Host 头获取对应的 `file.Host` 配置信息。
3.  **流量和连接数检查**：检查客户端的流量和连接数是否超出限制。
4.  **认证检查**：对请求进行认证。
5.  **获取目标地址**：从主机配置中获取一个随机的目标地址。
6.  **建立隧道连接**：通过 `s.bridge.SendLinkInfo()` 将连接请求发送给 NPS 的 `bridge` 模块，由 `bridge` 负责与客户端建立实际的隧道连接。
7.  **数据转发循环**：
    *   **请求转发**：将客户端的 HTTP 请求写入到隧道连接。
    *   **响应读取与转发**：从隧道连接读取后端响应，并将其写入到客户端连接。
    *   **缓存处理**：如果启用了缓存 (`s.useCache`) 并且请求在缓存中，则直接从缓存返回响应。
    *   **动态后端切换**：在循环中，如果检测到请求的 Host 发生变化，NPS 会动态地切换到新的后端服务。
    *   **流量统计**：在数据转发过程中，会进行流量统计。

### `NewServer()` 和 `NewServerWithTls()`：HTTP/HTTPS 服务器的创建

这两个函数用于创建 Go 标准库的 `http.Server` 实例。

*   `NewServer()`：创建普通的 HTTP 服务器。
*   `NewServerWithTls()`：创建支持 TLS 的 HTTPS 服务器，并加载证书。

### `resetReqMethod()`：修复请求方法

这个辅助函数用于修复某些情况下 HTTP 请求方法可能被截断的问题（例如 "GET" 变成 "ET"）。

## 总结

`nps/server/proxy/http.go` 文件是 NPS 实现 HTTP/HTTPS 域名解析和高级功能的核心。它通过 `httpServer` 结构体，结合 Go 标准库的 HTTP 服务器和 NPS 内部的隧道机制，实现了强大的 Web 服务穿透能力。其对缓存、认证、动态后端切换以及自动 HTTPS 等功能的支持，使得 NPS 成为一个功能全面、灵活高效的 HTTP/HTTPS 代理解决方案。

至此，我们已经详细剖析了 NPS 服务端 `proxy` 目录下所有主要的代理模式实现。在下一篇文章中，我们将转向 NPS 的客户端（Client）模块，探索其如何与服务端协同工作，实现内网穿透。
