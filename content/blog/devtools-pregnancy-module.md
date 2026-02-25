---
title: "DevTools 孕期管理模块：全栈实现一个云端孕期工具套件"
date: 2026-02-09T20:00:00+08:00
draft: false
slug: "devtools-pregnancy-module"
tags: ["DevTools", "Vue3", "Go", "SQLite", "全栈开发", "Element Plus"]
categories: ["技术", "项目分析"]
series: ["DevTools"]
---

# DevTools 孕期管理模块：全栈实现一个云端孕期工具套件

在 DevTools 开发者工具平台上新增了一个有温度的功能——孕期管理模块（`/yun`）。这个模块提供完整的孕期管理工具套件，包括待产包清单、宝宝用品清单、产检时间表、体重记录、胎动计数和孕期知识库，所有数据云端存储、密码保护。

## 功能概览

{{< mermaid >}}
graph LR
    A["孕期管理 /yun"] --> B["概览面板"]
    A --> C["待产包"]
    A --> D["宝宝用品"]
    A --> E["产检时间表"]
    A --> F["体重记录"]
    A --> G["胎动计数"]
    A --> H["知识库"]

    B --- B1["孕周 + 倒计时 + 宝宝大小"]
    C --- C1["4类 31项预置 + 自定义"]
    D --- D1["6类 33项预置 + 自定义"]
    E --- E1["14次产检时间轴 + 备注"]
    F --- F1["SVG折线图 + 变化追踪"]
    G --- G1["大按钮计数器 + 计时"]
    H --- H1["20篇孕周 + 7篇专题"]
{{< /mermaid >}}

## 架构设计

{{< mermaid >}}
graph TB
    subgraph 前端["前端 Vue3 + Element Plus"]
        UI["PregnancyTool.vue"] -->|debounce 2s| API_CALL["fetch PUT /api/pregnancy/:id"]
        LS["localStorage"] -.->|creatorKey 免密加载| UI
    end

    subgraph 后端["后端 Go + Gin"]
        ROUTER["/api/pregnancy"] --> HANDLER["PregnancyHandler"]
        HANDLER -->|bcrypt 验证| AUTH["密码/CreatorKey 鉴权"]
        HANDLER -->|IP 限流| RATE["5次/IP/小时"]
        HANDLER --> DB_OP["CRUD 操作"]
    end

    subgraph 数据库["SQLite"]
        TABLE["pregnancy_profiles"]
        TABLE -->|"单行 = 一个用户"| JSON["data JSON blob"]
        JSON --> J1["hospital_bag"]
        JSON --> J2["baby_essentials"]
        JSON --> J3["prenatal_checks"]
        JSON --> J4["weight_records"]
        JSON --> J5["fetal_movements"]
    end

    API_CALL --> ROUTER
    DB_OP --> TABLE
    CLEANUP["定时清理 goroutine"] -->|每小时| TABLE
{{< /mermaid >}}

### 单表 + JSON Blob 模式

最核心的设计决策是采用**单表 + JSON data 列**的方案，而非为每种数据（清单、产检、体重、胎动）创建独立表：

```sql
CREATE TABLE IF NOT EXISTS pregnancy_profiles (
    id TEXT PRIMARY KEY,
    edd TEXT NOT NULL,           -- 预产期
    password TEXT NOT NULL,      -- bcrypt 哈希
    creator_key TEXT NOT NULL,   -- 创建者密钥
    data TEXT NOT NULL DEFAULT '{}',  -- JSON blob
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    creator_ip TEXT
);
```

`data` 列存储一个完整的 JSON 对象：

```json
{
  "hospital_bag": { "mom": [...], "baby": [...], "documents": [...], "other": [...] },
  "baby_essentials": { "feeding": [...], "diaper": [...], ... },
  "prenatal_checks": [...],
  "weight_records": [...],
  "fetal_movements": [...]
}
```

**为什么选择这个方案？**

1. **简单高效**：一个用户就是一行记录，一次读取获得全部数据
2. **灵活扩展**：新增数据类型只需修改 JSON 结构，无需 ALTER TABLE
3. **前端友好**：前端直接操作 JSON 对象，debounce 后整体 PUT 回后端
4. **适合场景**：孕期数据量有限（几百条记录），不需要复杂查询

### 遵循 Excalidraw 模块模式

后端完全遵循已有的 Excalidraw 模块设计模式：

- Handler 结构体持有 db 和配置
- bcrypt 密码哈希（非 SHA256）
- creatorKey 机制实现免密码快速加载
- IP 限流防止滥用
- 过期自动清理

```go
type PregnancyHandler struct {
    db             *models.DB
    defaultExpDays int    // 默认365天
    maxDataSize    int    // 默认1MB
    maxPerIP       int    // 每IP每小时5个
    ipWindow       time.Duration
}
```

## API 设计

5 个端点，简洁清晰：

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/pregnancy` | 创建档案（EDD + 密码） |
| GET | `/api/pregnancy/:id?password=xxx` | 密码访问 |
| GET | `/api/pregnancy/:id/creator?creator_key=xxx` | 创建者免密访问 |
| PUT | `/api/pregnancy/:id` | 更新（update_data / update_edd / extend） |
| DELETE | `/api/pregnancy/:id?creator_key=xxx` | 删除档案 |

PUT 请求通过 `action` 字段分发不同操作：

```json
// 更新数据（前端 debounce 2秒自动保存）
{ "action": "update_data", "creator_key": "xxx", "data": { ... } }

// 修改预产期
{ "action": "update_edd", "creator_key": "xxx", "edd": "2025-08-15" }

// 延期
{ "action": "extend", "creator_key": "xxx", "expires_in": 365 }
```

## 前端实现亮点

### 1. 孕周计算

从预产期（EDD）反推末次月经（LMP），再计算当前孕周：

```javascript
const currentWeek = computed(() => {
  const edd = new Date(profileEDD.value)
  const lmp = new Date(edd.getTime() - 280 * 86400000) // 280天 = 40周
  const days = Math.floor((Date.now() - lmp) / 86400000)
  return Math.max(0, Math.floor(days / 7))
})
```

### 2. 宝宝大小比喻

从 4 周的"罂粟籽"到 40 周的"西瓜"，每周一个水果/蔬菜比喻：

```javascript
const babySizeData = [
  { week: 4, size: '罂粟籽' }, { week: 8, size: '覆盆子' },
  { week: 12, size: '青柠' }, { week: 16, size: '牛油果' },
  { week: 20, size: '香蕉' }, { week: 24, size: '玉米' },
  { week: 28, size: '茄子' }, { week: 32, size: '哈密瓜' },
  { week: 36, size: '长生果' }, { week: 40, size: '西瓜' }
  // ... 共37个水果
]
```

### 3. 纯 SVG 体重折线图

没有引入 ECharts 等图表库，而是用计算属性直接生成 SVG：

```javascript
const chartPoints = computed(() => {
  const { sorted, min, max } = chartData.value
  return sorted.map((r, i) => {
    const x = padding.left + (innerW / (sorted.length - 1)) * i
    const y = padding.top + innerH - ((r.value - min) / (max - min)) * innerH
    return `${x},${y}`
  }).join(' ')
})
```

渲染为 `<polyline>` + `<circle>` 点 + 网格线 + Y轴标签，零依赖。

### 4. 自动保存机制

数据变更后 debounce 2 秒自动 PUT 保存，带状态指示：

```javascript
let autoSaveTimer = null
function scheduleAutoSave() {
  saveStatus.value = 'saving'
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => saveData(), 2000)
}
```

UI 上显示 `el-tag` 状态：保存中... / 已保存。

### 5. localStorage 免密快速加载

创建档案时将 `id -> creatorKey` 映射存入 `localStorage`，下次打开页面自动加载：

```javascript
onMounted(() => {
  loadLocalProfiles()
  const ids = Object.keys(localProfiles.value)
  if (ids.length > 0) {
    loadByCreatorKey(ids[0], profiles[ids[0]])
  }
})
```

## 知识库内容

知识库是纯前端静态数据，共 **27 篇**内容。同时我们也将完整内容发布为博客系列文章，方便阅读和分享：

{{< mermaid >}}
graph LR
    subgraph 孕早期["孕早期 1-12周"]
        E1["1-4周 受精着床"]
        E2["5-6周 确认怀孕"]
        E3["7-8周 首次胎心"]
        E4["9-10周 胚胎→胎儿"]
        E5["11-12周 NT检查"]
    end

    subgraph 孕中期["孕中期 13-28周"]
        M1["13-14周 黄金期"]
        M2["15-16周 唐筛"]
        M3["17-18周 初感胎动"]
        M4["19-20周 大排畸"]
        M5["21-28周 快速成长"]
    end

    subgraph 孕晚期["孕晚期 29-40周"]
        L1["29-32周 冲刺准备"]
        L2["33-36周 临近足月"]
        L3["37-40周 等待分娩"]
        L4["41周+ 过预产期"]
    end

    subgraph 专题["专题指南"]
        G1["分娩方式选择"]
        G2["母乳喂养"]
        G3["产后恢复"]
        G4["新生儿护理"]
        G5["饮食指南"]
        G6["心理健康"]
        G7["办事清单"]
    end
{{< /mermaid >}}

### 系列文章索引

**孕早期（1-12周）**：[孕早期完全指南](/blog/2026-02/pregnancy-early-trimester/) — 从受精着床到 NT 检查，5 个关键阶段详解

**孕中期（13-28周）**：[孕中期完全指南](/blog/2026-02/pregnancy-mid-trimester/) — 黄金蜜月期，唐筛、大排畸、糖耐量三大关卡

**孕晚期（29-40周）**：[孕晚期完全指南](/blog/2026-02/pregnancy-late-trimester/) — 冲刺阶段到分娩倒计时

**专题指南**：[分娩与产后指南](/blog/2026-02/pregnancy-delivery-postpartum/) — 分娩方式选择、母乳喂养、产后恢复、新生儿护理

**实用工具**：[孕期饮食与办事清单](/blog/2026-02/pregnancy-diet-checklist/) — 完整饮食禁忌 + 孕期全阶段办事清单

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `backend/models/pregnancy.go` | 新建 | 数据模型 + 8 个 CRUD 方法 |
| `backend/handlers/pregnancy.go` | 新建 | 5 个 API 处理器 + 预置数据初始化 |
| `backend/config/config.go` | 修改 | 添加 PregnancyConfig |
| `backend/main.go` | 修改 | 初始化 + 路由 + 清理 |
| `backend/config.example.yaml` | 修改 | 添加配置段 |
| `frontend/src/views/PregnancyTool.vue` | 新建 | ~1100行 Vue 组件 |
| `frontend/src/router/index.js` | 修改 | 添加 /yun 路由 |

## 总结

这个模块展示了 DevTools 项目"单表 JSON blob"模式在新场景中的应用。相比为每种数据建单独表，这种方式更适合用户维度的个人数据管理——数据量可控、读写模式简单、前端开发效率高。

整体开发遵循了项目已有的设计模式（Excalidraw handler 模式、bcrypt 密码、creatorKey 机制、IP 限流、过期清理），确保代码风格一致性。前端选择纯 SVG 替代图表库、纯静态数据替代后端知识 API，在功能完整的同时保持了零额外依赖。
