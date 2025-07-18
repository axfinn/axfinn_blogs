---
title: "NPS 代理实现：P2P 协议与 UDP 打洞"
date: 2024-07-18T16:30:00+08:00
draft: false
tags: ["NPS", "P2P", "UDP打洞", "Go语言", "网络穿透"]
categories: ["技术", "项目分析"]
---

## 引言

在 NPS 系列文章中，我们已经探讨了 NPS 的整体架构、服务端核心以及 TCP 隧道、HTTP 代理和 SOCKS5 代理的实现。本篇文章将深入 NPS 的另一个高级代理模式——**P2P 代理**。我们将通过分析 `nps/server/proxy/p2p.go` 文件，揭示 NPS 如何利用 UDP 打洞技术，实现客户端之间的直接连接，从而在某些场景下提供更高效、更低延迟的内网穿透服务。

## P2P 代理的优势与挑战

传统的内网穿透通常依赖于服务器进行数据中转，这会引入额外的延迟和带宽消耗。P2P（Peer-to-Peer）代理的目标是让内网中的两个客户端能够直接建立连接，绕过服务器中转，从而实现更高效的数据传输。

**优势：**

*   **降低延迟**：数据直接在客户端之间传输，减少了服务器中转带来的延迟。
*   **节省带宽**：服务器不再需要承担所有数据中转的带宽消耗。
*   **提高效率**：在某些场景下，P2P 连接可以提供更高的传输效率。

**挑战：**

*   **NAT 穿越**：大多数客户端都位于 NAT（网络地址转换）设备之后，直接建立连接需要解决复杂的 NAT 穿越问题，其中 UDP 打洞是常用的技术。
*   **防火墙**：防火墙可能会阻止 P2P 连接的建立。

## `p2p.go`：P2P 代理的实现

`p2p.go` 文件定义了 `P2PServer` 结构体，它是 NPS 实现 P2P 代理的核心。

### `P2PServer` 结构体

`P2PServer` 结构体包含了 P2P 代理所需的关键信息：

```go
type P2PServer struct {
    BaseServer
    p2pPort  int
    p2p      map[string]*p2p
    listener *net.UDPConn
}

type p2p struct {
    visitorAddr  *net.UDPAddr
    providerAddr *net.UDPAddr
}
```

*   `BaseServer`：继承了 `base.go` 中定义的通用功能。
*   `p2pPort int`：P2P 服务监听的 UDP 端口。
*   `p2p map[string]*p2p`：一个 Map，用于存储 P2P 连接的会话信息。键是 P2P 连接的密码（`arr[0]`），值是 `p2p` 结构体，其中包含了访问者 (`visitorAddr`) 和提供者 (`providerAddr`) 的 UDP 地址。
*   `listener *net.UDPConn`：P2P 服务监听的 UDP 连接。

`NewP2PServer()` 函数用于创建并初始化一个 `P2PServer` 实例。

### `Start()` 方法：启动 P2P UDP 监听

`P2PServer` 的 `Start()` 方法负责启动 UDP 监听，并为每个接收到的 UDP 数据包调用 `handleP2P()` 方法进行处理：

```go
func (s *P2PServer) Start() error {
    logs.Info("start p2p server port", s.p2pPort)
    var err error
    s.listener, err = net.ListenUDP("udp", &net.UDPAddr{net.ParseIP("0.0.0.0"), s.p2pPort, ""})
    if err != nil {
        return err
    }
    for {
        buf := common.BufPoolUdp.Get().([]byte)
        n, addr, err := s.listener.ReadFromUDP(buf)
        if err != nil {
            if strings.Contains(err.Error(), "use of closed network connection") {
                break
            }
            continue
        }
        go s.handleP2P(addr, string(buf[:n])) // 为每个 UDP 数据包启动一个 goroutine 处理
    }
    return nil
}
```

*   NPS 会在指定的 `p2pPort` 上监听 UDP 连接。
*   每个接收到的 UDP 数据包都会在一个新的 goroutine 中由 `handleP2P()` 函数处理，以实现并发处理。

### `handleP2P()`：P2P 连接的建立与打洞

`handleP2P()` 方法是 P2P 连接建立的核心逻辑，它通过交换客户端的 UDP 地址信息来实现 UDP 打洞：

```go
func (s *P2PServer) handleP2P(addr *net.UDPAddr, str string) {
    var (
        v  *p2p
        ok bool
    )
    arr := strings.Split(str, common.CONN_DATA_SEQ) // 解析 UDP 数据包内容
    if len(arr) < 2 {
        return
    }
    // arr[0] 是 P2P 连接的密码，arr[1] 是角色 (visitor 或 provider)
    if v, ok = s.p2p[arr[0]]; !ok { // 如果是新的 P2P 会话
        v = new(p2p)
        s.p2p[arr[0]] = v // 存储新的 P2P 会话
    }
    logs.Trace("new p2p connection ,role %s , password %s ,local address %s", arr[1], arr[0], addr.String())

    if arr[1] == common.WORK_P2P_VISITOR { // 如果是访问者 (Visitor)
        v.visitorAddr = addr // 记录访问者的 UDP 地址
        for i := 20; i > 0; i-- { // 尝试 20 次
            if v.providerAddr != nil { // 如果提供者 (Provider) 的地址已经收到
                // 互相发送对方的地址，进行 UDP 打洞
                s.listener.WriteTo([]byte(v.providerAddr.String()), v.visitorAddr)
                s.listener.WriteTo([]byte(v.visitorAddr.String()), v.providerAddr)
                break // 打洞成功，退出循环
            }
            time.Sleep(time.Second) // 等待 1 秒
        }
        delete(s.p2p, arr[0]) // 打洞完成后，从 Map 中删除该会话
    } else { // 如果是提供者 (Provider)
        v.providerAddr = addr // 记录提供者的 UDP 地址
    }
}
```

**UDP 打洞原理：**

1.  **客户端连接 P2P 服务器**：当两个内网客户端（一个作为 `visitor`，一个作为 `provider`）都想建立 P2P 连接时，它们会首先向 NPS 的 P2P 服务器发送 UDP 数据包，并附带一个共享的“密码”和自己的角色。
2.  **服务器记录地址**：P2P 服务器会记录 `visitor` 和 `provider` 的公网 IP 和端口（经过 NAT 转换后的地址）。
3.  **交换地址**：当服务器同时收到 `visitor` 和 `provider` 的地址后，它会将 `provider` 的地址发送给 `visitor`，同时将 `visitor` 的地址发送给 `provider`。
4.  **客户端尝试连接**：`visitor` 和 `provider` 收到对方的地址后，会尝试直接向对方的公网 IP 和端口发送 UDP 数据包。由于 NAT 设备通常会为主动发出的 UDP 连接在外部打开一个临时端口，当双方同时向对方的公网地址发送数据时，就有可能成功穿透 NAT，建立直接的 UDP 连接。
5.  **打洞成功**：一旦 UDP 打洞成功，后续的数据就可以直接在两个客户端之间传输，而无需经过 NPS 服务器中转。

**代码细节：**

*   `common.CONN_DATA_SEQ`：用于分隔 P2P 数据包中的密码和角色信息。
*   `common.WORK_P2P_VISITOR`：表示客户端的角色是访问者。
*   `time.Sleep(time.Second)`：在 `visitor` 端，会等待一段时间，以确保 `provider` 的地址已经到达服务器。
*   `delete(s.p2p, arr[0])`：一旦打洞成功，P2P 会话信息就会从服务器的 Map 中删除，因为服务器的任务已经完成。

## 总结

`nps/server/proxy/p2p.go` 文件展示了 NPS 如何利用 UDP 打洞技术实现 P2P 代理。通过 P2P 服务器作为中介，交换客户端的公网地址信息，NPS 能够帮助内网中的客户端建立直接的 UDP 连接，从而在某些场景下提供更高效、更低延迟的内网穿透服务。这种机制对于需要实时交互的应用（如游戏、音视频通话）具有重要意义。

在下一篇文章中，我们将继续探索 NPS 的其他代理模式，例如 UDP 代理。
