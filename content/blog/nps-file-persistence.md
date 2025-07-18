---
title: "NPS 核心探秘：配置加载与数据持久化"
date: 2025-07-18T19:10:00+08:00
draft: false
tags: ["NPS", "服务端", "架构", "Go语言", "JSON", "持久化", "配置管理"]
categories: ["技术", "项目分析"]
---

## 引言

一个稳定可靠的服务，离不开健全的配置管理和数据持久化机制。NPS 作为一个需要长期运行的内网穿透服务器，必须能够加载启动配置、在运行时动态修改配置，并在服务重启后恢复所有任务和客户端信息。这一切都由 `nps/file` 目录下的代码实现。本篇文章将深入这一模块，剖析 NPS 是如何通过简单的 JSON 文件，构建出一个轻量级且高效的“数据库”，并实现对客户端、隧道、主机等所有配置的增删改查和持久化存储。

---

## `file.go`：NPS 的数据中枢

`nps/file` 目录的核心是 `file.go` 文件，它定义了 NPS 的数据模型和所有数据操作的接口。NPS 并未采用传统的关系型数据库或 NoSQL 数据库，而是选择使用 JSON 文件作为其数据存储后端，这使得 NPS 非常轻量、易于部署和迁移。

### 核心结构：`JsonDb`

`JsonDb` 结构体是 NPS 在内存中的数据缓存，所有运行时的配置信息都存储在这里。

```go
type JsonDb struct {
	Clients       []*Client
	Hosts         []*Host
	Tasks         []*Tunnel
	Flow          *flow.Flow
	BlackIpList   []string
	Store         *store.Store
	Secret        sync.Map
	sync.RWMutex
}
```

*   `Clients`, `Hosts`, `Tasks`: 分别是存储客户端、域名主机和隧道任务的切片。
*   `Flow`: 全局流量统计。
*   `BlackIpList`: 全局 IP 黑名单。
*   `sync.RWMutex`: 读写互斥锁。由于 Web 管理界面（写操作）和核心代理服务（读操作）会并发地访问这些数据，使用 `RWMutex` 可以保证线程安全，允许多个读操作同时进行，提高了并发性能。

### 数据模型：`Client`, `Host`, `Tunnel`

`file.go` 中同样定义了核心的数据模型：

*   **`Client`**: 代表一个客户端。核心字段包括 `Id`（唯一标识）、`VerifyKey`（验证密钥）、`Cnf`（客户端配置，如加密、压缩）、`Flow`（流量信息）、`MaxConn`（最大连接数）等。
*   **`Host`**: 代表一个域名解析配置。核心字段包括 `Host`（域名）、`Target`（后端目标地址）、`HeaderChange`（HTTP 头修改）、`CertFilePath` 和 `KeyFilePath`（HTTPS 证书路径）等。
*   **`Tunnel`**: 代表一个隧道任务。核心字段包括 `Id`、`Mode`（模式，如 `tcp`, `udp`）、`Port`（服务端监听端口）、`Target`（后端目标地址）、`Client`（所属的客户端）等。

### 初始化与加载：`NewJsonDb()`

NPS 服务启动时，会调用 `NewJsonDb()` 来初始化数据中枢。这个函数负责从磁盘上的 JSON 文件中读取数据，并将其加载到内存的 `JsonDb` 实例中。

```go
func NewJsonDb() *JsonDb {
	db := new(JsonDb)
	// ...
	// 加载客户端、主机、任务等配置
	if err := json.Unmarshal(GetContentFromFile(path.Join(common.GetRunPath(), "conf", "clients.json")), &db.Clients); err != nil {
		// ...
	}
	if err := json.Unmarshal(GetContentFromFile(path.Join(common.GetRunPath(), "conf", "hosts.json")), &db.Hosts); err != nil {
		// ...
	}
	// ...
	return db
}
```

`GetContentFromFile()` 负责读取文件内容，然后 `json.Unmarshal` 将 JSON 字节流反序列化为对应的 Go 结构体切片，完成了数据的加载。

### 数据访问接口

`JsonDb` 提供了一套丰富的 API 方法，供 NPS 的其他模块安全地访问和操作数据。这些方法都通过加锁来保证并发安全。

*   **查询方法**:
    *   `GetInfoByHost(host string, r *http.Request)`: 这是 HTTP/HTTPS 代理的核心查询逻辑。当收到一个 HTTP 请求时，`proxy` 模块会调用此方法，根据请求的 `Host` 头查找匹配的 `Host` 配置。它支持精确匹配和泛域名匹配（如 `*.example.com`），并能根据 URL 路由规则 (`h.UrlRoute`) 找到最终的后端目标。
    *   `GetClientByVkey(vkey string)`: `bridge` 模块用此方法在客户端连接时验证 `vkey`。
    *   `GetTask(id int)`: 根据 ID 获取指定的隧道任务。

*   **增删改方法**:
    *   `NewClient(vkey string, cnf *config.Config, remark string)`: 新增一个客户端。
    *   `DelClient(id int)`: 删除一个客户端。
    *   `UpdateClient(client *Client)`: 更新客户端信息。
    *   `NewHost()`, `DelHost()`, `UpdateHost()`: 对应的主机增删改操作。
    *   `NewTask()`, `DelTask()`, `UpdateTask()`: 对应的隧道任务增删改操作。

这些方法构成了 NPS 内部的数据访问层，将核心逻辑与底层的文件读写解耦。

### 数据持久化：`Save()`

当通过 Web 界面修改配置后，如何将内存中的变更写回磁盘呢？答案是 `Save()` 方法。

```go
func (db *JsonDb) Save() {
	db.Lock()
	defer db.Unlock()
	// ...
	// 将客户端、主机、任务等数据序列化为 JSON
	if clients, err := json.Marshal(db.Clients); err == nil {
		ioutil.WriteFile(path.Join(common.GetRunPath(), "conf", "clients.json"), clients, 0666)
	}
	// ...
}
```

`Save()` 方法的逻辑与 `NewJsonDb()` 相反：

1.  **加锁**: 获取写锁，防止在写入文件时数据被其他 goroutine 修改。
2.  **序列化**: 使用 `json.Marshal` 将内存中的 `db.Clients`, `db.Hosts` 等切片序列化为 JSON 格式的字节流。
3.  **写入文件**: 使用 `ioutil.WriteFile` 将 JSON 字节流写回对应的 `.json` 文件中。

这个 `Save()` 方法会被 `server.go` 中的 `flowSession` goroutine 定期调用，也会在 Web 界面进行修改操作后被调用，从而确保了数据的持久化。

## 总结

`nps/file` 模块是 NPS 项目的基石之一。它通过一套设计简洁、功能明确的接口，为整个应用提供了一个线程安全的数据访问层。选择 JSON 文件作为存储后端，体现了 NPS 轻量化、易于部署的设计哲学。通过将数据操作（增删改查）与数据存储（文件读写）分离，`file` 模块清晰地定义了 NPS 的数据流：**服务启动时从文件加载到内存，运行时在内存中进行操作，并通过 `Save` 方法将变更持久化回文件**。
