---
title: "NPS 代理实现：TCP 隧道与 HTTP 代理"
date: 2025-07-18T16:00:00+08:00
draft: false
tags: ["NPS", "TCP代理", "HTTP代理", "Go语言", "内网穿透"]
categories: ["技术", "项目分析"]
---

## 引言

在上一篇文章中，我们深入探讨了 `nps/server/proxy/base.go` 中定义的通用代理基础和流量控制机制。本篇文章将聚焦于 NPS 最常用也是最基础的两种代理模式：**TCP 隧道**和 **HTTP 代理**。我们将通过分析 `nps/server/proxy/tcp.go` 文件，揭示这两种模式的具体实现细节。

## `tcp.go`：TCP 隧道与 HTTP 代理的实现

`tcp.go` 文件主要定义了 `TunnelModeServer` 结构体，它是实现 TCP 隧道和 HTTP 代理的核心。此外，该文件还包含了 `WebServer` 结构体，用于启动 NPS 的 Web 管理界面。

### `TunnelModeServer`：通用隧道模式服务器

`TunnelModeServer` 结构体继承了 `BaseServer`，并增加了两个特定于隧道模式的字段：

```go
type TunnelModeServer struct {
    BaseServer
    process  process
    listener net.Listener
}
```

*   `BaseServer`：继承了 `base.go` 中定义的通用功能，如流量统计、安全检查等。
*   `process process`：这是一个函数类型 `type process func(c *conn.Conn, s *TunnelModeServer) error`，它定义了如何处理传入的客户端连接。不同的代理模式会传入不同的 `process` 函数。
*   `listener net.Listener`：用于监听传入连接的网络监听器。

`NewTunnelModeServer()` 函数用于创建并初始化一个 `TunnelModeServer` 实例。

#### `Start()` 方法：启动监听

`TunnelModeServer` 的 `Start()` 方法负责启动 TCP 监听，并为每个传入连接调用 `process` 函数进行处理：

```go
func (s *TunnelModeServer) Start() error {
    return conn.NewTcpListenerAndProcess(s.task.ServerIp+":"+strconv.Itoa(s.task.Port), func(c net.Conn) {
        // ... 流量和连接数检查 ...
        logs.Trace("new tcp connection,local port %d,client %d,remote address %s", s.task.Port, s.task.Client.Id, c.RemoteAddr())
        s.process(conn.NewConn(c), s) // 调用具体的处理函数
        s.task.Client.AddConn()
    }, &s.listener)
}
```

*   `conn.NewTcpListenerAndProcess()`：这是一个辅助函数，用于创建一个 TCP 监听器，并在有新连接到来时，在一个新的 goroutine 中调用传入的处理函数。
*   **流量和连接数检查**：在处理新连接之前，会调用 `s.CheckFlowAndConnNum()` 对客户端的流量和连接数进行检查，如果超出限制则直接关闭连接。
*   **调用 `s.process()`**：这是关键一步，它将传入的 `net.Conn` 封装为 `conn.Conn`，然后调用 `TunnelModeServer` 实例中存储的 `process` 函数来处理具体的代理逻辑。

#### `Close()` 方法：关闭监听

`TunnelModeServer` 的 `Close()` 方法非常简单，它仅仅关闭了底层的 `net.Listener`，从而停止接收新的连接：

```go
func (s *TunnelModeServer) Close() error {
    return s.listener.Close()
}
```

### `ProcessTunnel()`：实现 TCP 隧道

`ProcessTunnel()` 函数是 `process` 类型的一个具体实现，它负责处理标准的 TCP 隧道连接。当 `TunnelModeServer` 以 `tcp` 或 `file` 模式启动时，会使用这个函数。

```go
func ProcessTunnel(c *conn.Conn, s *TunnelModeServer) error {
    targetAddr, err := s.task.Target.GetRandomTarget() // 获取目标地址
    if err != nil {
        c.Close()
        logs.Warn("tcp port %d ,client id %d,task id %d connect error %s", s.task.Port, s.task.Client.Id, s.task.Id, err.Error())
        return err
    }

    // 调用 BaseServer 的 DealClient 方法进行数据转发
    return s.DealClient(c, s.task.Client, targetAddr, nil, common.CONN_TCP, nil, s.task.Client.Flow, s.task.Target.LocalProxy, s.task)
}
```

*   **获取目标地址**：`s.task.Target.GetRandomTarget()` 从隧道配置中获取一个随机的目标地址。NPS 支持配置多个目标地址，实现负载均衡。
*   **调用 `s.DealClient()`**：这是核心的数据转发逻辑。`ProcessTunnel` 将客户端连接 (`c`)、客户端信息 (`s.task.Client`)、目标地址 (`targetAddr`) 以及其他相关参数传递给 `BaseServer` 的 `DealClient()` 方法。`DealClient()` 会负责与目标建立连接，并在客户端和目标之间进行双向数据拷贝，同时处理加密、压缩和流量统计等通用逻辑。

### `ProcessHttp()`：实现 HTTP 代理

`ProcessHttp()` 函数是 `process` 类型的一个具体实现，它负责处理 HTTP 代理连接。当 `TunnelModeServer` 以 `httpProxy` 模式启动时，会使用这个函数。

```go
func ProcessHttp(c *conn.Conn, s *TunnelModeServer) error {

    _, addr, rb, err, r := c.GetHost() // 从 HTTP 请求中解析出目标地址
    if err != nil {
        c.Close()
        logs.Info(err)
        return err
    }

    if r.Method == "CONNECT" { // 处理 HTTPS CONNECT 请求
        c.Write([]byte("HTTP/1.1 200 Connection established\r\n\r\n"))
        rb = nil
    }

    if err := s.auth(r, c, s.task.Client.Cnf.U, s.task.Client.Cnf.P); err != nil { // 认证检查
        return err
    }

    // 调用 BaseServer 的 DealClient 方法进行数据转发
    return s.DealClient(c, s.task.Client, addr, rb, common.CONN_TCP, nil, s.task.Client.Flow, s.task.Target.LocalProxy, nil)
}
```

*   **解析 HTTP 请求**：`c.GetHost()` 用于从传入的 TCP 连接中解析出 HTTP 请求的 Host 头，从而获取目标地址 (`addr`) 和请求的原始字节 (`rb`)。
*   **处理 HTTPS CONNECT 请求**：如果 HTTP 方法是 `CONNECT`（通常用于 HTTPS 代理），NPS 会向客户端发送 `HTTP/1.1 200 Connection established` 响应，表示连接已建立，然后后续的数据将直接在客户端和目标之间转发。
*   **认证检查**：调用 `s.auth()` 对 HTTP 请求进行认证，如果配置了用户名和密码，则会进行验证。
*   **调用 `s.DealClient()`**：与 `ProcessTunnel` 类似，`ProcessHttp` 也将解析出的目标地址和请求数据传递给 `BaseServer` 的 `DealClient()` 方法进行数据转发。

### `WebServer`：Web 管理界面的启动

`tcp.go` 文件中还包含了 `WebServer` 结构体和相关方法，用于启动 NPS 的 Web 管理界面。虽然它与 TCP 隧道和 HTTP 代理的逻辑不同，但由于其在 `server.go` 中通过 `NewMode()` 被 `webServer` 模式调用，所以被放在了同一个文件中。

*   **`WebServer` 结构体**：继承 `BaseServer`，但其 `Start()` 方法主要负责配置 Beego Web 框架的静态文件路径、视图路径，并启动 HTTP 或 HTTPS 服务来提供 Web 管理界面。
*   **`NewWebServer()`**：用于创建 `WebServer` 实例。

## 总结

`nps/server/proxy/tcp.go` 文件是 NPS 实现 TCP 隧道和 HTTP 代理的关键。通过 `TunnelModeServer` 结构体和 `process` 函数的抽象，NPS 能够以统一的方式处理这两种代理模式。`ProcessTunnel()` 和 `ProcessHttp()` 分别实现了各自的代理逻辑，并最终都依赖于 `BaseServer` 的 `DealClient()` 方法进行实际的数据转发和通用功能处理。`WebServer` 的存在则确保了 NPS 拥有一个功能完善的 Web 管理界面。

在下一篇文章中，我们将继续探索 NPS 的其他代理模式，例如 SOCKS5 代理。
