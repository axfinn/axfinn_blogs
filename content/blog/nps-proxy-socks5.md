---
title: "NPS 代理实现：SOCKS5 协议深度解析"
date: 2025-07-18T16:15:00+08:00
draft: false
tags: ["NPS", "SOCKS5", "代理协议", "Go语言", "网络安全"]
categories: ["技术", "项目分析"]
---

## 引言

在 NPS 系列文章的前几篇中，我们已经对 NPS 的整体架构、服务端核心以及 TCP 隧道和 HTTP 代理的实现有了初步了解。本篇文章将深入 NPS 的另一个重要代理模式——**SOCKS5 代理**。我们将通过分析 `nps/server/proxy/socks5.go` 文件，详细剖析 SOCKS5 协议在 NPS 中的实现细节，包括认证机制、请求处理以及 UDP 转发。

## SOCKS5 协议简介

SOCKS5 是一种网络代理协议，它允许客户端通过代理服务器间接访问其他服务器。与 HTTP 代理不同，SOCKS5 是一种更底层的协议，它不关心应用层协议（如 HTTP、FTP），而是直接转发 TCP 或 UDP 数据包。这使得 SOCKS5 代理更加通用，可以用于各种网络应用。

SOCKS5 协议主要包括以下几个阶段：

1.  **协商认证方法**：客户端向服务器发送支持的认证方法列表。
2.  **认证**：服务器选择一种认证方法，并与客户端进行认证。
3.  **请求**：客户端向服务器发送连接请求，包括目标地址、端口和连接类型（CONNECT、BIND、UDP ASSOCIATE）。
4.  **响应**：服务器响应请求，表示连接是否成功建立。

## `socks5.go`：SOCKS5 代理的实现

`socks5.go` 文件定义了 `Sock5ModeServer` 结构体，它是 NPS 实现 SOCKS5 代理的核心。

### `Sock5ModeServer` 结构体

`Sock5ModeServer` 结构体继承了 `BaseServer`，并增加了 `listener` 字段：

```go
type Sock5ModeServer struct {
    BaseServer
    listener net.Listener
}
```

*   `BaseServer`：继承了 `base.go` 中定义的通用功能，如流量统计、安全检查等。
*   `listener net.Listener`：用于监听传入 SOCKS5 连接的网络监听器。

`NewSock5ModeServer()` 函数用于创建并初始化一个 `Sock5ModeServer` 实例。

### `Start()` 方法：启动 SOCKS5 监听

`Sock5ModeServer` 的 `Start()` 方法负责启动 TCP 监听，并为每个传入连接调用 `handleConn()` 方法进行 SOCKS5 协议的协商和处理：

```go
func (s *Sock5ModeServer) Start() error {
    return conn.NewTcpListenerAndProcess(s.task.ServerIp+":"+strconv.Itoa(s.task.Port), func(c net.Conn) {
        if err := s.CheckFlowAndConnNum(s.task.Client); err != nil {
            logs.Warn("client id %d, task id %d, error %s, when socks5 connection", s.task.Client.Id, s.task.Id, err.Error())
            c.Close()
            return
        }
        logs.Trace("New socks5 connection,client %d,remote address %s", s.task.Client.Id, c.RemoteAddr())
        s.handleConn(c) // 调用 SOCKS5 协议处理函数
        s.task.Client.AddConn()
    }, &s.listener)
}
```

与 `TunnelModeServer` 类似，这里也进行了流量和连接数检查。核心在于调用 `s.handleConn(c)` 来处理 SOCKS5 协议的握手和请求。

### `handleConn()`：SOCKS5 协议协商与认证

`handleConn()` 方法是 SOCKS5 协议处理的入口点，它负责与客户端进行认证方法的协商和实际的认证过程：

1.  **版本协商**：读取客户端发送的 SOCKS 版本（必须是 5）。
2.  **认证方法协商**：读取客户端支持的认证方法数量和列表。
3.  **认证**：
    *   如果服务端配置了用户名和密码（`s.task.Client.Cnf.U` 和 `s.task.Client.Cnf.P`），或者启用了多用户认证 (`s.task.MultiAccount`)，则服务端会选择 `UserPassAuth` (用户名/密码认证) 方法。
    *   调用 `s.Auth(c)` 方法进行实际的用户名/密码认证。
    *   如果认证成功，则发送认证成功响应；否则发送认证失败响应并关闭连接。
    *   如果未配置认证，则直接选择 `No Authentication Required` (无需认证) 方法。
4.  **请求处理**：认证成功后，调用 `s.handleRequest(c)` 处理客户端的连接请求。

### `Auth()`：用户名/密码认证

`Auth()` 方法实现了 SOCKS5 的用户名/密码认证子协议：

1.  **读取用户名和密码长度**：从客户端读取用户名和密码的长度。
2.  **读取用户名和密码**：根据长度读取用户名和密码。
3.  **验证**：
    *   如果启用了多用户认证，则从 `s.task.MultiAccount.AccountMap` 中查找用户名和对应的密码进行验证。
    *   否则，使用 `s.task.Client.Cnf.U` 和 `s.task.Client.Cnf.P` 进行验证。
4.  **发送认证结果**：根据验证结果发送认证成功 (`authSuccess`) 或失败 (`authFailure`) 响应。

### `handleRequest()`：SOCKS5 请求处理

`handleRequest()` 方法负责解析客户端的 SOCKS5 请求，并根据请求类型调用不同的处理函数：

1.  **读取请求头**：读取 SOCKS5 请求的 CMD（命令）、RSV（保留字段）和 ATYP（地址类型）等信息。
2.  **根据 CMD 类型分发**：
    *   **`connectMethod` (1)**：调用 `s.handleConnect(c)` 处理 TCP 连接请求。
    *   **`bindMethod` (2)**：调用 `s.handleBind(c)` 处理 BIND 请求（通常用于 FTP 等被动模式）。
    *   **`associateMethod` (3)**：调用 `s.handleUDP(c)` 处理 UDP 关联请求（用于 UDP 转发）。
    *   **其他**：发送 `commandNotSupported` 响应并关闭连接。

### `doConnect()`：处理 CONNECT 请求

`doConnect()` 是 `handleConnect()` 的核心逻辑，它负责解析目标地址和端口，并建立与目标服务的连接：

1.  **解析目标地址类型**：根据 ATYP 字段判断目标地址是 IPv4、IPv6 还是域名。
2.  **解析目标地址和端口**：读取对应的地址和端口信息。
3.  **调用 `s.DealClient()`**：与 TCP 隧道和 HTTP 代理类似，最终都通过 `BaseServer` 的 `DealClient()` 方法来建立与目标服务的连接并进行数据转发。在成功建立连接后，会向客户端发送 `succeeded` 响应。

### `handleUDP()`：处理 UDP 关联请求

`handleUDP()` 方法实现了 SOCKS5 的 UDP 关联功能，允许客户端通过 SOCKS5 代理进行 UDP 流量转发：

1.  **解析目标地址和端口**：与 `doConnect()` 类似，解析客户端请求中的目标地址和端口。
2.  **本地 UDP 监听**：在服务端本地监听一个 UDP 端口，用于接收来自客户端的 UDP 数据。
3.  **发送 UDP 响应**：向客户端发送 SOCKS5 响应，包含本地监听的 UDP 端口信息。
4.  **建立 UDP 隧道**：通过 `s.bridge.SendLinkInfo()` 建立一个 UDP 隧道到客户端。
5.  **双向 UDP 数据转发**：启动两个 goroutine，一个负责将本地 UDP 监听到的数据转发给客户端，另一个负责将客户端发送过来的 UDP 数据转发给目标服务。

### `handleBind()`：处理 BIND 请求

`handleBind()` 方法目前在代码中是空的，这意味着 NPS 尚未实现 SOCKS5 的 BIND 命令。BIND 命令通常用于 FTP 等需要服务器主动连接客户端的场景。

## 总结

`nps/server/proxy/socks5.go` 文件详细展示了 NPS 如何实现 SOCKS5 代理协议。它涵盖了从认证协商到不同请求类型（CONNECT、UDP ASSOCIATE）的处理流程。通过对 SOCKS5 协议的深入理解和实现，NPS 提供了强大的通用代理能力，使得用户可以灵活地访问内网资源。虽然 BIND 命令尚未实现，但 NPS 已经能够满足绝大多数 SOCKS5 代理的使用场景。

在下一篇文章中，我们将继续探索 NPS 的其他代理模式，例如 P2P 代理。
