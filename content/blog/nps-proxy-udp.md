---
title: "NPS 代理实现：UDP 代理与数据转发"
date: 2024-07-18T16:45:00+08:00
draft: false
tags: ["NPS", "UDP代理", "Go语言", "网络协议", "内网穿透"]
categories: ["技术", "项目分析"]
---

## 引言

在 NPS 系列文章中，我们已经探讨了 NPS 的整体架构、服务端核心以及多种 TCP 相关的代理模式（TCP 隧道、HTTP 代理、SOCKS5 代理）和 P2P 代理。本篇文章将聚焦于 NPS 的 **UDP 代理**实现。我们将通过分析 `nps/server/proxy/udp.go` 文件，揭示 NPS 如何处理 UDP 流量，实现内网 UDP 服务的穿透。

## UDP 代理的需求与挑战

UDP（User Datagram Protocol）是一种无连接的传输协议，常用于对实时性要求较高、允许少量丢包的应用，如 DNS 查询、在线游戏、音视频通话等。由于 UDP 的无连接特性，其代理实现与 TCP 代理有所不同，主要挑战在于：

*   **会话管理**：UDP 是无连接的，代理服务器需要维护客户端与目标服务之间的“伪会话”，以确保数据包能够正确地双向转发。
*   **NAT 穿越**：与 P2P 代理类似，UDP 代理也需要处理 NAT 穿越问题，确保数据包能够穿透内网防火墙和 NAT 设备。
*   **数据包丢失**：UDP 本身不保证数据包的可靠传输，代理层需要尽可能地减少数据包丢失。

## `udp.go`：UDP 代理的实现

`udp.go` 文件定义了 `UdpModeServer` 结构体，它是 NPS 实现 UDP 代理的核心。

### `UdpModeServer` 结构体

`UdpModeServer` 结构体包含了 UDP 代理所需的关键信息：

```go
type UdpModeServer struct {
    BaseServer
    addrMap  sync.Map
    listener *net.UDPConn
}
```

*   `BaseServer`：继承了 `base.go` 中定义的通用功能。
*   `addrMap sync.Map`：一个并发安全的 Map，用于存储客户端的 UDP 地址与对应的目标连接。键是客户端的 `addr.String()`，值是 `io.ReadWriteCloser`（通常是 `conn.Conn` 实例）。这个 Map 用于维护客户端与目标服务之间的“伪会话”。
*   `listener *net.UDPConn`：UDP 代理服务监听的 UDP 连接。

`NewUdpModeServer()` 函数用于创建并初始化一个 `UdpModeServer` 实例。

### `Start()` 方法：启动 UDP 监听

`UdpModeServer` 的 `Start()` 方法负责启动 UDP 监听，并为每个接收到的 UDP 数据包调用 `process()` 方法进行处理：

```go
func (s *UdpModeServer) Start() error {
    var err error
    if s.task.ServerIp == "" {
        s.task.ServerIp = "0.0.0.0" // 默认监听所有 IP
    }
    s.listener, err = net.ListenUDP("udp", &net.UDPAddr{net.ParseIP(s.task.ServerIp), s.task.Port, ""})
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

        // 黑名单检查
        if IsGlobalBlackIp(addr.String()) {
            break
        }
        if common.IsBlackIp(addr.String(), s.task.Client.VerifyKey, s.task.Client.BlackIpList) {
            break
        }

        logs.Trace("New udp connection,client %d,remote address %s", s.task.Client.Id, addr)
        go s.process(addr, buf[:n]) // 为每个 UDP 数据包启动一个 goroutine 处理
    }
    return nil
}
```

*   NPS 会在指定的 `ServerIp` 和 `Port` 上监听 UDP 连接。
*   每个接收到的 UDP 数据包都会在一个新的 goroutine 中由 `process()` 函数处理，以实现并发处理。
*   在处理之前，会进行全局和客户端特定的黑名单检查。

### `process()`：UDP 数据包的处理与转发

`process()` 方法是 UDP 数据包处理的核心逻辑。它根据 `addrMap` 中是否存在对应的连接来决定是建立新连接还是复用现有连接：

```go
func (s *UdpModeServer) process(addr *net.UDPAddr, data []byte) {
    if v, ok := s.addrMap.Load(addr.String()); ok { // 如果已存在连接
        clientConn, ok := v.(io.ReadWriteCloser)
        if ok {
            _, err := clientConn.Write(data) // 直接将数据写入现有连接
            if err != nil {
                logs.Warn(err)
                return
            }
            s.task.Client.Flow.Add(int64(len(data)), int64(len(data))) // 流量统计
        }
    } else { // 如果是新的连接
        if err := s.CheckFlowAndConnNum(s.task.Client); err != nil { // 流量和连接数检查
            logs.Warn("client id %d, task id %d,error %s, when udp connection", s.task.Client.Id, s.task.Id, err.Error())
            return
        }
        defer s.task.Client.AddConn() // 增加连接数

        // 构建 conn.Link 并通过 bridge 获取目标连接
        link := conn.NewLink(common.CONN_UDP, s.task.Target.TargetStr, s.task.Client.Cnf.Crypt, s.task.Client.Cnf.Compress, addr.String(), s.task.Target.LocalProxy, "")
        if clientConn, err := s.bridge.SendLinkInfo(s.task.Client.Id, link, s.task); err != nil {
            return
        } else {
            target := conn.GetConn(clientConn, s.task.Client.Cnf.Crypt, s.task.Client.Cnf.Compress, nil, true)
            s.addrMap.Store(addr.String(), target) // 存储新连接到 addrMap
            defer target.Close() // 确保连接关闭

            _, err := target.Write(data) // 将数据写入目标连接
            if err != nil {
                logs.Warn(err)
                return
            }
            s.task.Client.Flow.Add(int64(len(data)), int64(len(data))) // 流量统计

            // 循环读取目标连接的数据并转发给客户端
            buf := common.BufPoolUdp.Get().([]byte)
            defer common.BufPoolUdp.Put(buf)
            for {
                clientConn.SetReadDeadline(time.Now().Add(time.Duration(60) * time.Second)) // 设置读取超时
                if n, err := target.Read(buf); err != nil {
                    s.addrMap.Delete(addr.String()) // 读取失败，从 Map 中删除连接
                    logs.Warn(err)
                    return
                } else {
                    _, err := s.listener.WriteTo(buf[:n], addr) // 将数据写回客户端
                    if err != nil {
                        logs.Warn(err)
                        return
                    }
                    s.task.Client.Flow.Add(int64(n), int64(n))
                }
            }
        }
    }
}
```

**核心逻辑：**

1.  **连接复用**：当收到来自某个客户端 IP 的 UDP 数据包时，`process()` 首先检查 `addrMap` 中是否已经存在该客户端对应的目标连接。
    *   **如果存在**：直接将数据写入已有的目标连接，实现连接复用。
    *   **如果不存在**：
        *   进行流量和连接数检查。
        *   通过 `s.bridge.SendLinkInfo()` 建立一个新的 UDP 隧道到客户端。
        *   将新建立的目标连接存储到 `addrMap` 中，以便后续复用。
        *   将当前数据包写入目标连接。
        *   启动一个循环，持续从目标连接读取数据，并将其写回给原始的客户端 IP。为了防止连接长时间不活动，设置了读取超时。

### `Close()` 方法：关闭 UDP 监听

`UdpModeServer` 的 `Close()` 方法非常简单，它仅仅关闭了底层的 `net.UDPConn`，从而停止接收新的 UDP 数据包：

```go
func (s *UdpModeServer) Close() error {
    return s.listener.Close()
}
```

## 总结

`nps/server/proxy/udp.go` 文件展示了 NPS 如何实现 UDP 代理。通过 `UdpModeServer` 结构体和 `addrMap` 的巧妙运用，NPS 能够有效地管理无连接的 UDP 流量，实现客户端与内网 UDP 服务之间的双向数据转发。这种机制对于需要穿透内网访问 DNS、游戏服务器等 UDP 应用场景至关重要。

在下一篇文章中，我们将继续探索 NPS 的其他代理模式，例如 WebSocket 代理。
