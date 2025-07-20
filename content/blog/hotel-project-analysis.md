---
title: "从零到一：用 Flask + SQLite 打造一个轻量级酒店管理系统（前后端详解）"
date: 2025-07-19T11:00:00+08:00
draft: false
slug: "flask-sqlite-hotel-system-tutorial"
tags: ["Python", "Flask", "SQLite", "Docker", "项目分析", "系统设计", "前端", "Jinja2", "Bootstrap", "教程"]
categories: ["技术", "教程"]
---

## 前言

对于许多编程初学者来说，理论知识和实际项目之间总有一道鸿沟。今天，我将带领大家跨越这道鸿沟，通过一个真实的项目——`hotel` 轻量级酒店管理系统，来学习如何将技术应用到实践中。

这个项目非常适合初学者，它功能完整、代码清晰，并且覆盖了 Web 开发的方方面面：从后端逻辑、数据库设计，到前端页面渲染和用户交互。最棒的是，它还支持 Docker 一键部署！

**项目地址**: [git@github.com:axfinn/hotel.git](git@github.com:axfinn/hotel.git)

我将从环境搭建开始，详细剖析前后端代码，让你不仅能看懂，更能学会如何构建一个属于自己的 Web 应用。

## 1. 项目初体验：本地运行指南

在分析代码之前，我们先让项目在自己电脑上跑起来。

**第一步：克隆项目**
```bash
git clone git@github.com:axfinn/hotel.git
cd hotel
```

**第二步：创建并激活 Python 虚拟环境**
这是一个好习惯，可以避免不同项目间的依赖冲突。
```bash
# For macOS/Linux
python3 -m venv venv
source venv/bin/activate

# For Windows
python -m venv venv
.\venv\Scripts\activate
```

**第三步：安装依赖**
项目的所有依赖都记录在 `app/requirements.txt` 文件里。
```bash
pip install -r app/requirements.txt
```
你会看到 `Flask` 和 `Pillow` 两个库被安装。

**第四步：运行应用**
进入 `app` 目录并启动 Flask 应用。
```bash
cd app
python app.py
```
看到类似下面的输出，就说明成功了！
```
 * Running on http://0.0.0.0:5000
 * Debug mode: on
```
现在，打开浏览器访问 `http://127.0.0.1:5000`，你就能看到酒店管理系统的首页了。

## 2. 后端深度剖析：Flask 的魔法

项目的核心逻辑全部在 `app/app.py` 文件中。我们来一探究竟。

### 2.1 数据库设计与初始化

项目使用 SQLite 这个轻量级的文件型数据库，非常适合中小型应用。`init_db()` 函数负责在应用首次启动时创建所需的数据表。

**数据表结构**:
1.  `rooms`: 存储房间信息，如楼层、房号、设施、价格、是否被占用等。
2.  `tenants`: 存储租客信息，包括姓名、电话、租期、身份证照片路径等，并与房间关联。
3.  `transactions`: 存储交易记录，主要是押金和租金信息，并与租客关联。

这种“表存在则忽略”的创建方式 (`CREATE TABLE IF NOT EXISTS`) 非常实用，保证了程序的健壮性。

```python
# app/app.py

def init_db():
    conn = sqlite3.connect('hotel.db')
    c = conn.cursor()
    # 创建房间表 (rooms)
    c.execute('''
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY,
            number INTEGER,
            status TEXT NOT NULL DEFAULT 'available',
            room_image TEXT,
            standard_price REAL NOT NULL DEFAULT 0,
            ...
        )
    ''')
    # 创建租客表 (tenants) 和交易表 (transactions)
    # ...
    conn.commit()
    conn.close()

# 在程序末尾调用，确保启动时数据库就绪
init_db()
```

### 2.2 核心路由与业务逻辑

Flask 使用“路由”来将特定的 URL 链接到相应的处理函数。

**首页 (`/`)**:
`index()` 函数负责渲染首页。它从数据库查询所有房间信息，然后传递给前端模板 `index.html` 进行展示。

```python
# app/app.py

@app.route('/')
def index():
    conn = sqlite3.connect('hotel.db')
    c = conn.cursor()
    c.execute('SELECT * FROM rooms ORDER BY floor, number')
    rooms = c.fetchall()
    conn.close()
    # render_template 会在 templates 文件夹中寻找 index.html 并将 rooms 数据传入
    return render_template('index.html', rooms=rooms)
```

**添加房间 (`/add_room`)**:
这个路由同时处理 `GET` 和 `POST` 两种请求。
*   `GET` 请求：直接渲染 `add_room.html`，显示一个空的表单。
*   `POST` 请求：当用户提交表单时，函数会从 `request.form` 获取数据，处理上传的房间图片（使用 `Pillow` 压缩），然后将新房间信息存入数据库，最后重定向到首页。

```python
# app/app.py

@app.route('/add_room', methods=['GET', 'POST'])
def add_room():
    if request.method == 'POST':
        # 1. 从 request.form 和 request.files 获取数据
        floor = request.form['floor']
        room_image = request.files['room_image']
        
        # 2. 处理图片上传和压缩
        if room_image:
            # ... 保存并压缩图片 ...
        
        # 3. 将数据存入数据库
        conn = sqlite3.connect('hotel.db')
        # ... c.execute(INSERT ...) ...
        conn.close()
        
        # 4. 重定向到首页
        return redirect(url_for('index'))
        
    return render_template('add_room.html')
```

**入住登记 (`/check_in/<int:room_id>`)**:
这个功能同样强大，它巧妙地处理了“新入住”和“续租”两种情况。
*   通过检查房间当前租期的结束时间，判断是新租客还是老租客续费。
*   如果是续租，会自动计算新的到期日。
*   同时，它也会创建新的租客记录和押金交易记录。

```python
# app/app.py

@app.route('/check_in/<int:room_id>', methods=['GET', 'POST'])
def check_in(room_id):
    # ...
    if request.method == 'POST':
        # ... 获取表单数据 ...
        
        # 续租逻辑判断
        if room_is_occupied_and_not_expired:
            lease_type = '续租'
            # 重新计算结束日期
            rent_end_date = calculate_new_end_date(...)
        
        # 更新 rooms 表状态，向 tenants 和 transactions 表插入新记录
        # ...
        return redirect(url_for('index'))
        
    return render_template('check_in.html', room_id=room_id, ...)
```

## 3. 前端交互揭秘：Bootstrap + Jinja2 + jQuery

一个好的系统离不开友好的用户界面。本项目前端主要采用 `Bootstrap` 快速构建美观的响应式布局，并利用 `Jinja2` 模板引擎和 `jQuery` 实现动态数据展示和交互。

### 3.1 模板引擎 Jinja2

Flask 默认集成的 Jinja2 模板引擎是连接前后端的桥梁。它允许我们在 HTML 中嵌入类似 Python 的代码。

*   **变量渲染**: `{{ variable_name }}`，例如在 `check_in.html` 中显示房间号和价格：
    ```html
    <input type="number" value="{{ room_id }}" readonly>
    <input type="number" value="{{ room_price }}" required>
    ```
*   **逻辑控制**: `{% for item in items %}` 和 `{% if condition %}`，例如在 `index.html` 中遍历并显示所有房间卡片：
    ```html
    <!-- 这是伪代码，实际代码在 JS 中动态生成 -->
    {% for room in rooms %}
        <div class="card">
            <img src="{{ room.room_image }}" class="card-img-top">
            <div class="card-body">
                <h5 class="card-title">房间号: {{ room.number }}</h5>
                <p>状态: {{ room.status }}</p>
                {% if room.status == '空闲' %}
                    <a href="/check_in/{{ room.id }}" class="btn btn-success">入住登记</a>
                {% else %}
                    <a href="/check_in/{{ room.id }}" class="btn btn-warning">续住登记</a>
                {% endif %}
            </div>
        </div>
    {% endfor %}
    ```

### 3.2 动态交互 jQuery

虽然现代前端更多使用 Vue/React，但 jQuery 在这个项目中依然高效地完成了任务。首页 `index.html` 的交互就是最好的例子。

*   **异步加载数据**: 页面加载完成后，通过 `$.get('/rooms', ...)` 向后端请求所有房间的 JSON 数据。
*   **动态生成内容**: 拿到数据后，`displayRooms` 函数会遍历数据，用字符串模板创建每个房间的卡片，并插入到页面中。
*   **客户端筛选**: 点击“按楼层筛选”或“筛选空闲房间”按钮时，会再次调用 `fetchRooms` 函数，但这次会带上参数。JS 代码会根据参数在前端直接对数据进行筛选，然后重新渲染，实现了快速响应，减少了不必要的后端请求。

```javascript
// app/templates/index.html

function fetchRooms(params = {}) {
    // 向后端 /rooms API 请求数据
    $.get('/rooms', function(data) {
        // 如果有筛选参数，就在前端进行过滤
        if (params.status) {
            data = data.filter(room => room.status === params.status);
        }
        if (params.floor) {
            data = data.filter(room => room.floor === parseInt(params.floor, 10));
        }
        // 调用 displayRooms 渲染过��后的数据
        displayRooms(data);
    });
};

function displayRooms(rooms) {
    const $rooms = $('#rooms').empty(); // 清空旧内容
    rooms.forEach(room => {
        // 使用模板字符串动态创建 HTML 元素
        const roomCard = $(`
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100">
                    ...
                </div>
            </div>
        `);
        $rooms.append(roomCard); // 添加到页面
    });
}
```

## 4. 一键部署：Docker 的威力

项目提供了 `Dockerfile` 和 `run.sh` 脚本，让部署变得异常简单。

*   **Dockerfile**: 定义了如何构建一个包含 Python 环境和我们应用代码的 Docker 镜像。它会自动安装 `requirements.txt` 中的依赖。
*   **run.sh**: 这是一个强大的自动化脚本，它执行了一系列操作：
    1.  **备份**: 自动备份旧的代码和数据。
    2.  **清理**: 停止并删除旧的 Docker 容器和镜像。
    3.  **构建**: 使用 `Dockerfile` 构建最新的应用镜像。
    4.  **运行**: 启动一个新的容器，并将应用的端口映射到主机的端口，同时通过 `-v ./app:/app` 将本地的 `app` 目录挂载到容器中，这样修改代码后无需重新构建镜像，只需重启容器即可生效。

## 总结

通过对 `hotel` 项目的全面剖析，我们学习了：
*   如何使用 Flask 搭建一个功能完整的 Web 应用。
*   如何设计数据库表结构并使用 SQLite 进行交互。
*   如何使用 Jinja2 和 jQuery/AJAX 构建动态、交互式的前端页面。
*   如何编写 Dockerfile 并通过脚本实现自动化部署。

这个项目是理论与实践结合的绝佳范例。我强烈建议你亲手把项目跑起来，尝试修改代码，比如增加一个新的功能（如“退房结算”），或者优化前端页面。在实践中学习，是成长最快的方式！