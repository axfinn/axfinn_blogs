---
title: "Qwen Code 工具详解"
date: 2025-07-23T15:30:00+08:00
draft: false
slug: "qwen-code-tools-detailed"
tags: ["Qwen Code", "工具集", "AI", "开发工具"]
categories: ["技术", "AI工具"]
---

# Qwen Code 工具详解

## 工具概览

Qwen Code 提供了一套丰富的工具集，允许 AI 模型与本地环境进行交互、执行命令、访问文件和执行各种操作。这些工具通过确认提示和沙箱机制确保安全性。

工具集的分类可以用下图表示：

{{< mermaid >}}
graph TD
    A[Qwen Code 工具集] --> B[文件系统工具]
    A --> C[网络工具]
    A --> D[其他工具]
    
    B --> B1[list_directory]
    B --> B2[read_file]
    B --> B3[write_file]
    B --> B4[glob]
    B --> B5[search_file_content]
    B --> B6[replace]
    
    C --> C1[google_web_search]
    C --> C2[web_fetch]
    
    D --> D1[save_memory]
    D --> D2[run_shell_command]
    D --> D3[MCP 服务器工具]
{{< /mermaid >}}

## 文件系统工具

Qwen Code 提供了完整的文件系统操作工具：

### `list_directory`：列出目录内容

参数：
- `path` (string, required): 要列出的目录的绝对路径
- `ignore` (array, optional): 要忽略的 glob 模式列表
- `respect_git_ignore` (boolean, optional): 是否遵循 .gitignore 模式，默认为 true

功能：显示指定目录下的文件和子目录

示例：
```javascript
// 列出项目根目录的内容
list_directory({path: "/path/to/project"})

// 列出目录内容但忽略 node_modules 和 .git
list_directory({
  path: "/path/to/project",
  ignore: ["node_modules", ".git"]
})
```

### `read_file`：读取文件内容

参数：
- `absolute_path` (string, required): 要读取的文件的绝对路径
- `limit` (number, optional): 要读取的最大行数
- `offset` (number, optional): 开始读取的行偏移量

功能：读取并返回文件内容

示例：
```javascript
// 读取整个文件
read_file({absolute_path: "/path/to/project/README.md"})

// 只读取前100行
read_file({
  absolute_path: "/path/to/project/large_file.txt",
  limit: 100
})

// 从第50行开始读取100行
read_file({
  absolute_path: "/path/to/project/large_file.txt",
  limit: 100,
  offset: 50
})
```

### `write_file`：写入文件

参数：
- `file_path` (string, required): 要写入的文件的绝对路径
- `content` (string, required): 要写入的内容

功能：将内容写入指定文件

示例：
```javascript
// 写入文件
write_file({
  file_path: "/path/to/project/new_file.txt",
  content: "Hello, Qwen Code!"
})
```

### `glob`：查找匹配模式的文件

参数：
- `pattern` (string, required): glob 模式
- `path` (string, optional): 要搜索的目录的绝对路径
- `case_sensitive` (boolean, optional): 是否区分大小写，默认为 false
- `respect_git_ignore` (boolean, optional): 是否遵循 .gitignore 模式，默认为 true

功能：高效查找符合特定模式的文件

示例：
```javascript
// 查找所有 .js 文件
glob({pattern: "**/*.js"})

// 在特定目录中查找 .ts 文件
glob({
  pattern: "**/*.ts",
  path: "/path/to/project/src"
})
```

### `search_file_content`：在文件中搜索内容

参数：
- `pattern` (string, required): 要搜索的正则表达式模式
- `path` (string, optional): 要搜索的目录的绝对路径
- `include` (string, optional): 要搜索的文件的 glob 模式

功能：在文件内容中搜索指定的正则表达式模式

示例：
```javascript
// 在整个项目中搜索 "function myFunction"
search_file_content({
  pattern: "function\\s+myFunction"
})

// 在 .js 文件中搜索 import 语句
search_file_content({
  pattern: "import\\s+\\{.*\\}\\s+from\\s+.*",
  include: "*.js"
})
```

### `replace`：替换文件中的文本

参数：
- `file_path` (string, required): 要修改的文件的绝对路径
- `old_string` (string, required): 要替换的文本
- `new_string` (string, required): 替换后的文本
- `expected_replacements` (number, optional): 预期的替换次数，默认为 1

功能：在文件中替换指定的文本内容，具有增强的可靠性特性

示例：
```javascript
// 替换文件中的文本
replace({
  file_path: "/path/to/project/config.js",
  old_string: "old_value",
  new_string: "new_value"
})

// 替换多个匹配项
replace({
  file_path: "/path/to/project/data.json",
  old_string: "development",
  new_string: "production",
  expected_replacements: 3
})
```

文件系统工具的使用流程可以用下图表示：

{{< mermaid >}}
graph LR
    A[AI模型] --> B{需要文件操作?}
    B -->|是| C[选择合适的工具]
    C --> D[list_directory]
    C --> E[read_file]
    C --> F[write_file]
    C --> G[glob]
    C --> H[search_file_content]
    C --> I[replace]
    
    D --> J[获取目录结构]
    E --> K[读取文件内容]
    F --> L[写入文件内容]
    G --> M[查找文件]
    H --> N[搜索文件内容]
    I --> O[替换文件内容]
    
    J --> P[返回结果给AI]
    K --> P
    L --> P
    M --> P
    N --> P
    O --> P
    P --> A
{{< /mermaid >}}

## 网络工具

### `google_web_search`：网络搜索工具

参数：
- `query` (string, required): 搜索查询

功能：通过 Google Search 执行网络搜索，返回包含引用和来源的摘要结果

示例：
```javascript
// 搜索最新的人工智能进展
google_web_search({
  query: "latest advancements in AI-powered code generation"
})
```

### `web_fetch`：网页内容获取工具

参数：
- `prompt` (string, required): 包含 URL 和处理指令的提示

功能：获取并处理网页内容

示例：
```javascript
// 获取网页内容并提取关键点
web_fetch({
  prompt: "Summarize https://example.com/article and extract key points"
})
```

## 其他工具

### 内存管理工具

`save_memory`：保存特定信息到长期记忆

参数：
- `fact` (string, required): 要记住的具体事实或信息

示例：
```javascript
// 保存用户的偏好设置
save_memory({
  fact: "用户偏好深色主题"
})
```

### 命令执行工具

`run_shell_command`：在 shell 中执行命令

参数：
- `command` (string, required): 要执行的 bash 命令
- `description` (string, required): 命令的简要描述
- `directory` (string, optional): 执行命令的目录

示例：
```javascript
// 运行测试
run_shell_command({
  command: "npm test",
  description: "运行项目测试"
})
```

### MCP 服务器工具

与模型上下文协议（Model Context Protocol）服务器交互的工具，允许 Qwen Code 与外部工具和服务集成。

## 工具使用安全机制

Qwen Code 采用多种安全机制保护用户环境：

1. **确认提示**：在执行敏感操作前请求用户确认
2. **沙箱机制**：在隔离环境中执行潜在危险操作
3. **权限控制**：限制对文件系统和网络的访问

安全机制的架构可以用下图表示：

{{< mermaid >}}
graph TD
    A[工具执行请求] --> B[权限检查]
    B --> C{权限是否足够?}
    C -->|否| D[拒绝执行]
    C -->|是| E[确认提示]
    E --> F{用户是否确认?}
    F -->|否| D
    F -->|是| G[沙箱环境检查]
    G --> H{是否需要沙箱?}
    H -->|否| I[直接执行]
    H -->|是| J[创建沙箱环境]
    J --> K[在沙箱中执行]
    K --> L[清理沙箱环境]
    L --> M[返回执行结果]
    I --> M
    M --> N[AI模型]
{{< /mermaid >}}

## 总结

Qwen Code 的工具集为开发者提供了强大的能力，可以与本地环境进行深度交互。通过这些工具，AI 可以帮助开发者完成复杂的编程任务，提高工作效率。在使用这些工具时，安全机制确保了用户环境的安全性。