---
title: "NPS 代理实现：WebSocket 代理与 HTTP 反向代理"
date: 2024-07-18T17:00:00+08:00
draft: false
tags: ["NPS", "WebSocket", "HTTP反向代理", "Go语言", "网络通信"]
categories: ["技术", "项目分析"]
---

## 引言

在 NPS 系列文章的前几篇中，我们已经探讨了 NPS 的整体架构、服务端核心以及多种代理模式（TCP 隧道、HTTP 代理、SOCKS5 代理、P2P 代理和 UDP 代理）。本篇文章将深入 NPS 的 **WebSocket 代理**和 **HTTP 反向代理**实现。我们将通过分析 `nps/server/proxy/websocket.go` 文件，揭示 NPS 如何处理这两种特殊的 HTTP 流量，实现更灵活的网络穿透。

## WebSocket 与 HTTP 反向代理的需求

*   **WebSocket**：提供客户端和服务器之间的全双工通信通道，常用于实时应用，如聊天、在线游戏、股票行情等。传统的 HTTP 代理无法直接处理 WebSocket 协议的升级和持续连接。
*   **HTTP 反向代理**：将客户端的 HTTP 请求转发到后端服务器，并返回后端服务器的响应。它通常用于负载均衡、SSL 卸载、缓存和安全防护等。

## `websocket.go`：WebSocket 与 HTTP 反向代理的实现

`websocket.go` 文件主要定义了 `HttpReverseProxy` 和 `ReverseProxy` 两个结构体，它们共同协作来处理 HTTP 反向代理和 WebSocket 连接。

### `HttpReverseProxy`：HTTP 请求的入口

`HttpReverseProxy` 实现了 `http.Handler` 接口，是所有 HTTP 请求（包括 WebSocket 升级请求）进入 NPS 反向代理的入口点。

```go
type HttpReverseProxy struct {
    proxy                 *ReverseProxy
    responseHeaderTimeout time.Duration
}
```

*   `proxy *ReverseProxy`：指向实际处理请求的 `ReverseProxy` 实例。
*   `responseHeaderTimeout time.Duration`：后端响应头的超时时间。

#### `ServeHTTP()` 方法：请求处理流程

`HttpReverseProxy` 的 `ServeHTTP()` 方法负责处理传入的 HTTP 请求：

1.  **获取主机信息**：通过 `file.GetDb().GetInfoByHost(req.Host, req)` 根据请求的 Host 头获取对应的 `file.Host` 配置信息。如果找不到，则返回 404。
2.  **认证检查**：如果主机配置了用户名和密码，则进行认证检查。认证失败返回 401。
3.  **获取目标地址**：从主机配置中获取一个随机的目标地址 (`targetAddr`)。
4.  **减少连接数**：调用 `host.Client.CutConn()` 减少客户端的可用连接数。
5.  **上下文传递**：将 `host`、`targetAddr` 和原始请求 (`req`) 存储到请求的 `Context` 中，以便后续处理链能够访问这些信息。
6.  **委托给 `rp.proxy.ServeHTTP()`**：将请求的处理委托给内部的 `ReverseProxy` 实例。
7.  **增加连接数**：请求处理完成后，通过 `defer host.Client.AddConn()` 增加客户端的可用连接数。

### `ReverseProxy`：核心反向代理逻辑

`ReverseProxy` 结构体是对 Go 标准库 `net/http/httputil.ReverseProxy` 的封装和扩展，主要用于定制连接建立和错误处理。

```go
type ReverseProxy struct {
    *httputil.ReverseProxy
    WebSocketDialContext func(ctx context.Context, network, addr string) (net.Conn, error)
}
```

*   `*httputil.ReverseProxy`：嵌入了标准库的反向代理，继承了其大部分功能。
*   `WebSocketDialContext func(...)`：一个自定义的函数，用于在 WebSocket 升级时建立与后端服务的连接。

#### `NewHttpReverseProxy()`：初始化 `ReverseProxy`

`NewHttpReverseProxy()` 函数负责创建并配置 `ReverseProxy` 实例：

1.  **创建 `httputil.ReverseProxy`**：初始化一个标准的 `httputil.ReverseProxy`。
2.  **定制 `Director`**：`Director` 函数在请求被转发到后端之前执行，这里主要用于修改请求的 Host 头和 Header。
3.  **定制 `Transport`**：
    *   `DisableKeepAlives: true`：禁用 Keep-Alive，确保每个请求都建立新的连接。
    *   `DialContext`：这是关键的定制点。它定义了如何建立与后端服务的连接。在这个函数中：
        *   从请求的 `Context` 中获取 `host` 和 `targetAddr`。
        *   构建 `conn.Link` 信息。
        *   **通过 `s.bridge.SendLinkInfo()` 将连接请求发送给 NPS 的 `bridge` 模块**，由 `bridge` 负责与客户端建立实际的隧道连接，并返回一个 `net.Conn`。
        *   将返回的 `net.Conn` 封装为 `flowConn`，用于流量统计。
4.  **定制 `ErrorHandler`**：用于处理反向代理过程中发生的错误。
5.  **定制 `WebSocketDialContext`**：这是一个独立的函数，专门用于 WebSocket 升级时建立连接。它的逻辑与 `DialContext` 类似，也是通过 `s.bridge.SendLinkInfo()` 建立连接。

#### `flowConn`：流量统计的连接封装

`flowConn` 结构体封装了 `io.ReadWriteCloser`，并添加了流量统计相关的字段和方法。它使得 NPS 能够在 HTTP 反向代理和 WebSocket 连接中精确地统计流量。

#### `IsWebsocketRequest()`：判断是否为 WebSocket 升级请求

这是一个辅助函数，通过检查 HTTP 请求的 `Connection` 和 `Upgrade` 头来判断是否为 WebSocket 升级请求。

#### `ServeHTTP()` 方法：WebSocket 请求分发

`ReverseProxy` 的 `ServeHTTP()` 方法会首先判断是否为 WebSocket 升级请求：

*   如果是 WebSocket 请求，则调用 `p.serveWebSocket()` 进行处理。
*   如果不是，则由嵌入的 `httputil.ReverseProxy` 处理（即转发普通的 HTTP 请求）。

### `serveWebSocket()`：WebSocket 连接的处理

`serveWebSocket()` 方法是处理 WebSocket 升级请求的核心逻辑：

1.  **建立目标连接**：通过 `p.WebSocketDialContext()` 建立与后端 WebSocket 服务的连接。
2.  **劫持 HTTP 连接**：通过 `http.Hijacker` 接口劫持客户端的 HTTP 连接，将其转换为原始的 TCP 连接。
3.  **转发请求头**：将客户端的原始 WebSocket 升级请求头写入到目标连接。
4.  **双向数据拷贝**：调用 `Join()` 函数，在客户端连接和目标连接之间进行双向数据拷贝，实现 WebSocket 数据的转发。

### `Join()`：WebSocket 数据双向拷贝

`Join()` 函数负责在两个 `io.ReadWriteCloser` 之间进行双向数据拷贝，通常用于 WebSocket 连接：

```go
func Join(c1 io.ReadWriteCloser, c2 io.ReadWriteCloser, host *file.Host) (inCount int64, outCount int64) {
    var wait sync.WaitGroup
    // pipe 函数用于单向数据拷贝
    pipe := func(to io.ReadWriteCloser, from io.ReadWriteCloser, count *int64) {
        defer to.Close()
        defer from.Close()
        defer wait.Done()
        goroutine.CopyBuffer(to, from, host.Client.Flow, nil, "") // 使用 goroutine.CopyBuffer 进行数据拷贝和流量统计
    }

    wait.Add(2) // 两个 goroutine 进行双向拷贝
    go pipe(c1, c2, &inCount)
    go pipe(c2, c1, &outCount)
    wait.Wait() // 等待两个 goroutine 完成
    return
}
```

*   它启动两个 goroutine，分别负责从一个连接读取数据并写入另一个连接，实现双向数据流。
*   `goroutine.CopyBuffer()` 是一个自定义的拷贝函数，它在拷贝数据的同时，还会进行流量统计。

## 总结

`nps/server/proxy/websocket.go` 文件展示了 NPS 如何通过 `HttpReverseProxy` 和 `ReverseProxy` 结构体，结合 `httputil.ReverseProxy` 的强大功能，实现了对 HTTP 反向代理和 WebSocket 连接的灵活处理。通过定制 `DialContext` 和 `WebSocketDialContext`，NPS 能够将这些流量路由到其内部的隧道机制，从而实现复杂的网络穿透场景。`flowConn` 和 `Join()` 函数则确保了流量的精确统计和高效转发。

在下一篇文章中，我们将继续探索 NPS 的其他代理模式，例如 HTTPS 代理。
