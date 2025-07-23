---
title: "NPS 代理实现：通用基础与流量控制"
date: 2025-07-18T15:45:00+08:00
draft: false
tags: ["NPS", "代理", "Go语言", "流量控制", "安全"]
categories: ["技术", "项目分析"]
---

## 引言

在 NPS 服务端核心解析中，我们了解了 `server.go` 如何作为服务端的“大脑”，协调各项任务。本篇文章将深入 NPS 的代理实现细节，从 `nps/server/proxy/base.go` 文件入手，剖析所有代理服务共用的基础结构、接口定义以及流量控制、安全检查等通用逻辑。理解这些通用组件，有助于我们更好地把握 NPS 多样化代理模式的实现原理。

## `base.go`：代理服务的基石

`base.go` 文件定义了 NPS 中所有代理服务的基础抽象和通用功能。它确保了不同代理模式（如 TCP、UDP、SOCKS5、HTTP 等）能够遵循统一的接口规范，并共享一些核心的辅助功能。

### 核心接口定义

`base.go` 中定义了两个重要的接口：

*   **`Service interface`**：
    ```go
    type Service interface {
        Start() error
        Close() error
    }
    ```
    这是所有 NPS 代理服务必须实现的接口。任何代理服务，无论是 TCP 隧道、SOCKS5 代理还是 HTTP 代理，都必须提供 `Start()` 方法来启动服务，以及 `Close()` 方法来优雅地关闭服务。这体现了面向接口编程的思想，使得 NPS 能够以统一的方式管理和操作各种代理服务。

*   **`NetBridge interface`**：
    ```go
    type NetBridge interface {
        SendLinkInfo(clientId int, link *conn.Link, t *file.Tunnel) (target net.Conn, err error)
    }
    ```
    这个接口定义了与 `bridge` 模块（服务端与客户端通信的桥梁）交互的方法。`SendLinkInfo` 方法负责将客户端的连接信息 (`link`) 和隧道信息 (`t`) 发送给 `bridge`，并从 `bridge` 获取到与目标服务建立的连接 (`target net.Conn`)。这表明 `proxy` 模块本身并不直接与客户端通信，而是通过 `bridge` 模块进行抽象和解耦。

NPS 代理服务的核心接口可以用下图表示：

{{< mermaid >}}
classDiagram
    class Service {
        <<interface>>
        +Start() error
        +Close() error
    }
    
    class NetBridge {
        <<interface>>
        +SendLinkInfo(clientId int, link *conn.Link, t *file.Tunnel) (target net.Conn, err error)
    }
    
    class BaseServer {
        -id int
        -bridge NetBridge
        -task *file.Tunnel
        -errorContent []byte
        -sync.Mutex
        +FlowAdd(in, out int64)
        +FlowAddHost(host *file.Host, in, out int64)
        +CheckFlowAndConnNum(client *file.Client)
        +auth(r *http.Request, c *conn.Conn, u, p string)
        +IsGlobalBlackIp(ipPort string)
        +DealClient()
    }
    
    Service <|-- TcpProxy
    Service <|-- UdpProxy
    Service <|-- HttpProxy
    Service <|-- Socks5Proxy
    NetBridge <|.. BridgeModule
    BaseServer ..> NetBridge
{{< /mermaid >}}

### `BaseServer`：通用代理服务结构体

`BaseServer` 是一个嵌入在具体代理服务结构体中的基础结构体，它包含了所有代理服务通用的属性和方法：

```go
type BaseServer struct {
    id           int
    bridge       NetBridge
    task         *file.Tunnel
    errorContent []byte
    sync.Mutex
}
```

*   `id int`：代理服务的唯一标识符。
*   `bridge NetBridge`：实现了 `NetBridge` 接口的实例，用于与客户端通信。
*   `task *file.Tunnel`：当前代理服务所对应的隧道配置信息。
*   `errorContent []byte`：当连接失败时，发送给客户端的错误内容。
*   `sync.Mutex`：用于保护 `BaseServer` 内部状态的并发访问，特别是流量统计相关的操作。

`NewBaseServer()` 函数用于创建并初始化一个 `BaseServer` 实例。

### 流量统计与控制

`BaseServer` 提供了核心的流量统计和控制功能，确保 NPS 能够对每个隧道和客户端的流量进行精确管理：

*   **`FlowAdd(in, out int64)`**：
    *   **功能**：累加当前隧道 (`s.task`) 的流入 (`in`) 和流出 (`out`) 流量。
    *   **实现**：通过 `s.Lock()` 和 `s.Unlock()` 确保并发安全，避免流量统计数据出现竞态条件。
*   **`FlowAddHost(host *file.Host, in, out int64)`**：
    *   **功能**：累加指定主机 (`host`) 的流入 (`in`) 和流出 (`out`) 流量。
    *   **实现**：同样通过互斥锁保证并发安全。
*   **`CheckFlowAndConnNum(client *file.Client)`**：
    *   **功能**：检查客户端的流量是否超出限制，以及当前连接数是否超出客户端允许的最大连接数。
    *   **流量限制**：如果客户端配置了 `FlowLimit`（流量限制），并且当前已用流量 (`ExportFlow + InletFlow`) 超过限制，则返回错误。
    *   **连接数限制**：通过 `client.GetConn()` 方法检查客户端是否还有可用的连接数。
    *   **重要性**：这是 NPS 实现资源管理和防止滥用的关键机制。

流量统计与控制的流程可以用下图表示：

{{< mermaid >}}
flowchart TD
    A[客户端连接] --> B[检查黑名单]
    B --> C{是否在黑名单中?}
    C -->|是| D[关闭连接]
    C -->|否| E[构建conn.Link]
    E --> F[通过bridge获取目标连接]
    F --> G{是否成功获取?}
    G -->|否| H[返回错误]
    G -->|是| I[开始数据拷贝]
    I --> J[流量统计]
    J --> K[累加隧道流量]
    K --> L[累加主机流量]
    L --> M[检查流量限制]
    M --> N{是否超限?}
    N -->|是| O[断开连接]
    N -->|否| P[继续数据传输]
    
    J --> Q[加锁保护]
    K --> Q
    L --> Q
    M --> Q
    Q --> R[解锁]
    R --> S[完成数据传输]
{{< /mermaid >}}

### 安全与认证

`base.go` 也包含了基本的安全检查和认证逻辑：

*   **`auth(r *http.Request, c *conn.Conn, u, p string)`**：
    *   **功能**：对 HTTP 请求进行基本认证。
    *   **实现**：如果配置了用户名 (`u`) 和密码 (`p`)，则调用 `common.CheckAuth()` 检查请求头中的认证信息。如果认证失败，则发送 401 Unauthorized 响应并关闭连接。
*   **`IsGlobalBlackIp(ipPort string)`**：
    *   **功能**：判断传入的 IP 地址是否在全局黑名单中。
    *   **实现**：从全局配置中获取黑名单列表，并使用 `in()` 辅助函数进行查找。
*   **`common.IsBlackIp(ipPort string, client.VerifyKey, client.BlackIpList)`**：
    *   **功能**：判断传入的 IP 地址是否在客户端特定的黑名单中。
    *   **重要性**：这些黑名单机制可以有效防止恶意扫描和攻击。

### 连接处理核心：`DealClient()`

`DealClient()` 是 `BaseServer` 中处理客户端连接的核心方法。它负责建立客户端与目标服务之间的连接，并进行数据转发：

1.  **黑名单检查**：首先检查客户端的远程 IP 地址是否在全局黑名单或客户端特定的黑名单中。如果在黑名单中，则直接关闭连接。
2.  **构建 `conn.Link`**：根据连接类型 (`tp`)、目标地址 (`addr`)、加密 (`Crypt`)、压缩 (`Compress`)、客户端远程地址 (`c.Conn.RemoteAddr().String()`)、本地代理 (`localProxy`) 和协议版本 (`protoVersion`) 等信息，构建一个 `conn.Link` 结构体。`conn.Link` 封装了连接的元数据和传输特性。
3.  **通过 `bridge` 获取目标连接**：调用 `s.bridge.SendLinkInfo(client.Id, link, s.task)` 将 `link` 信息发送给 `bridge` 模块。`bridge` 模块会负责与客户端建立实际的隧道连接，并返回一个与目标服务建立的 `net.Conn`。
4.  **数据拷贝**：如果成功获取到目标连接，则调用 `conn.CopyWaitGroup(target, c.Conn, ...)` 开始在客户端连接 (`c.Conn`) 和目标连接 (`target`) 之间进行双向数据拷贝。`CopyWaitGroup` 会处理加密、压缩、流量限制等逻辑。

`DealClient()` 的处理流程可以用下图表示：

{{< mermaid >}}
sequenceDiagram
    participant Client
    participant BaseServer
    participant Bridge
    participant Target
    
    Client->>BaseServer: 发起连接请求
    BaseServer->>BaseServer: 黑名单检查
    BaseServer->>BaseServer: 构建conn.Link
    BaseServer->>Bridge: SendLinkInfo
    Bridge->>Client: 建立隧道连接
    Bridge->>Target: 建立目标连接
    Bridge-->>BaseServer: 返回目标连接
    BaseServer->>BaseServer: 数据拷贝准备
    BaseServer->>Client: 开始数据传输
    BaseServer->>Target: 开始数据传输
    BaseServer->>BaseServer: 流量统计
    BaseServer->>BaseServer: 连接数检查
{{< /mermaid >}}

## 总结

`nps/server/proxy/base.go` 为 NPS 的所有代理服务提供了坚实的基础。它通过定义统一的接口、提供通用的 `BaseServer` 结构体，并封装了流量统计、安全检查和连接处理等核心功能，极大地简化了不同代理模式的实现。理解 `base.go` 的设计，有助于我们更好地理解 NPS 模块化和可扩展的架构。

在下一篇文章中，我们将开始深入具体的代理模式实现，首先从最基础的 TCP 代理 (`tcp.go`) 开始。
