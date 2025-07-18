---
title: "NPS 核心组件：深入剖析 Bridge 模块"
date: 2025-07-18T19:00:00+08:00
draft: false
tags: ["NPS", "服务端", "架构", "Bridge", "Go语言", "网络通信", "多路复用"]
categories: ["技术", "项目分析"]
---

## 引言

在 NPS 的服务端架构中，`proxy` 模块负责监听公网端口并处理各种协议的流量，而 `client` 模块则在内网中连接本地服务。那么，当一个公网请求到达 `proxy` 模块后，它是如何精确地找到对应的内网客户端，并与之建立一条数据通道的呢？答案就是 **`Bridge` 模块**。`Bridge` 是 NPS 服务端的核心枢纽，它负责维护所有客户端的长连接，并在此之上建立控制和数据隧道，是整个 NPS 体系的“交通总指挥”。

## `Bridge` 结构体：通信枢纽的核心

`bridge.go` 文件首先定义了 `Bridge` 结构体，它包含了 `Bridge` 模块运行所需的所有关键信息：

```go
type Bridge struct {
	listener         net.Listener
	tunnel           sync.Map // 存储客户端连接
	taskChan         chan *file.Tunnel
	OpenTask         chan *file.Tunnel
	CloseTask        chan int
	SecretChan       chan *conn.Conn
	CloseClient      chan int
	clientChan       chan *file.Client
	bridgeType       string
	disconnectTime   int
	flowStoreSession int
}
```

*   `listener net.Listener`: `Bridge` 服务监听的端口，用于接收来自客户端的连接。
*   `tunnel sync.Map`: 一个并发安全的 Map，用于存储所有已连接的客户端。键是客户端的 `vkey`，值是 `*Client` 结构体。
*   `OpenTask`, `CloseTask`, `CloseClient`: 这些是 `Bridge` 与 `server.go` 之间通信的 `channel`。当 Web 管理界面或配置文件有更改时，`server.go` 通过这些 `channel` 通知 `Bridge` 启动或停止任务、断开客户端连接。
*   `SecretChan chan *conn.Conn`: 用于处理特殊的“秘密连接”模式。
*   `bridgeType string`: 桥接类型，例如 `tcp`。

## `StartTunnel()`：监听客户端连接

`Bridge` 的 `StartTunnel()` 方法是其主入口。它负责启动监听，并为每个接受到的新连接调用 `process()` 方法。

```go
func (b *Bridge) StartTunnel() {
	// ...
	b.listener, err = net.Listen(b.bridgeType, ":"+strconv.Itoa(b.Port))
	// ...
	for {
		c, err := b.listener.Accept()
		// ...
		go b.process(conn.NewConn(c))
	}
}
```

## `process()`：处理客户端的初次连接

`process()` 方法负责处理客户端的初次连接请求，包括验证、注册和建立多路复用会话。

1.  **读取客户端信息**: 从连接中读取客户端发送的 `vkey` 和其他信息。
2.  **验证客户端**:
    *   检查 `vkey` 是否存在、是否被禁用。
    *   检查客户端 IP 是否在黑名单中。
    *   检查客户端连接数是否已达上限。
3.  **添加客户端**: 如果验证通过，则调用 `b.addClient()` 将客户端添加到 `tunnel` Map 中，并启动多路复用会话。

## `addClient()`：注册客户端与建立多路复用会话

`addClient()` 是客户端管理的核心。

```go
func (b *Bridge) addClient(c *conn.Conn, client *file.Client) {
	// ...
	client.Cnf.CompressDecode, client.Cnf.CompressEncode = common.GetCompressType(client.Cnf.Compress)
	b.tunnel.Store(client.VerifyKey, &Client{
		conn: c,
		mux:  nps_mux.NewMux(c, b.bridgeType, b.disconnectTime), // 关键：建立多路复用会话
		Id:   client.Id,
	})
	// ...
}
```

*   **`nps_mux.NewMux()`**: 这是 `Bridge` 实现高效通信的关键。NPS 使用了 `nps_mux` 库，它可以在一条物理的 TCP 连接上模拟出多条逻辑的子连接（Stream）。这样，服务端和客户端就可以在同一条连接上同时进行心跳、控制信令和多条数据隧道的传输，极大地提高了连接利用率。
*   `b.tunnel.Store()`: 将包含 `mux` 会话的 `Client` 对象存储起来，以便后续使用。

## `SendLinkInfo()`：建立数据隧道的关键

当 `proxy` 模块（如 `tcp.go`）需要将一个公网请求转发给内网客户端时，它会调用 `Bridge` 的 `SendLinkInfo()` 方法。这个方法是打通 `proxy` 和 `client` 之间数据通道的核心。

```go
func (b *Bridge) SendLinkInfo(clientId int, link *conn.Link, t *file.Tunnel) (target net.Conn, err error) {
	var (
		c  *Client
		ok bool
	)
	// ... 遍历 tunnel Map 找到对应的客户端
	if c, ok = v.(*Client); !ok {
		// ...
	}

	var session net.Conn
	if session, err = c.mux.Open(); err != nil { // 1. 在多路复用会话上打开一个新的逻辑流
		return nil, err
	}

	if _, err = conn.NewConn(session).SendInfo(link); err != nil { // 2. 通过新逻辑流将连接信息发送给客户端
		session.Close()
		return nil, err
	}

	return session, nil // 3. 返回这个逻辑流作为数据通道
}
```

**工作流程:**

1.  **查找客户端**: `proxy` 模块传入 `clientId`，`Bridge` 根据 `clientId` 在 `tunnel` Map 中找到对应的 `*Client` 实例，从而获得其 `mux` 多路复用会话。
2.  **打开新逻辑流**: 调用 `c.mux.Open()` 在该客户端的 `mux` 会话上打开一条新的逻辑流 (`session`)。这条逻辑流就像一条全新的虚拟 `net.Conn`。
3.  **发送连接信息**: 通过这条新的逻辑流，调用 `SendInfo()` 将 `conn.Link`（包含了目标地址、加密方式等信息）发送给客户端。
4.  **客户端响应**: 客户端的 `client.go` 在接收到这个 `Link` 信息后，会连接内网的目标服务，并准备好与 `session` 进行数据交换。
5.  **返回数据通道**: `Bridge` 将这条已经与客户端“配对”成功的逻辑流 (`session`) 返回给 `proxy` 模块。
6.  **数据转发**: `proxy` 模块拿到返回的 `session` 后，就可以通过它与公网请求的连接进行双向数据拷贝 (`io.Copy`)，从而完成整个内网穿透的数据转发流程。

## 总结

`Bridge` 模块是 NPS 服务端架构中承上启下的关键一环。它通过 `vkey` 验证和管理所有客户端连接，并利用 `nps_mux` 多路复用技术，在单一物理连接上高效地承载控制信令和多条数据隧道。核心方法 `SendLinkInfo` 清晰地展示了当 `proxy` 模块需要建立穿透连接时，`Bridge` 如何通过打开新的逻辑流、发送连接元数据的方式，动态地创建出一条连接公网请求和内网服务的端到端数据通道。理解了 `Bridge` 的工作原理，我们才能真正掌握 NPS 实现内网穿透的精髓。
