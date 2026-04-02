# LANGUAGE

Always respond in Chinese unless the user asks for another language.

# 环境说明

1. 没有跨平台,一切单机

# Qt 现代 C++ 编码规范（AI 指令文档）

## 环境约束

- 编译器：MSVC 14.50（Visual Studio 2026）
- C++ 标准：C++23（`/std:c++latest` 或 `/std:c++23preview`）
- Qt 版本：Qt 6
- 构建系统：CMake
- 数据库：MongoDB（mongocxx + bsoncxx）
- 目标平台：Windows

---

## 一、语言标准要求

### 强制使用 C++23 特性

**错误处理：优先使用 `std::expected`，禁止裸异常跨层传播**

```cpp
// ✅ 正确
using DbResult<T> = std::expected<T, std::string>;

DbResult<User> findUser(const std::string& id) {
    try {
        auto doc = col.find_one(make_document(kvp("_id", bsoncxx::oid{id})));
        if (!doc) return std::unexpected("用户不存在");
        return User::fromBson(doc->view());
    } catch (const std::exception& e) {
        return std::unexpected(e.what());
    }
}

// ❌ 禁止：异常直接穿透到 UI 层
User findUser(const std::string& id) {
    return User::fromBson(col.find_one(...)->view()); // 可能抛出
}
```

**范围处理：使用 Ranges + `ranges::to<>`**

```cpp
// ✅ 正确
auto names = col.find(filter)
    | std::views::filter([](auto& d) { return d["age"].get_int32() > 18; })
    | std::views::transform([](auto& d) {
        return std::string(d["name"].get_string().value);
      })
    | std::ranges::to<std::vector>();

// ❌ 禁止：手动 for 循环 push_back
std::vector<std::string> names;
for (auto& doc : col.find(filter)) {
    if (doc["age"].get_int32() > 18)
        names.push_back(std::string(doc["name"].get_string().value));
}
```

**可选值：全面使用 `std::optional`，禁止返回裸指针表示"无值"**

```cpp
// ✅ 正确
std::optional<User> findById(const std::string& id) {
    if (auto doc = col.find_one(filter)) {
        return User::fromBson(doc->view());
    }
    return std::nullopt;
}

// ❌ 禁止
User* findById(const std::string& id); // 调用方必须检查 null，极易遗漏
```

**多态值：使用 `std::variant` + `std::visit`，禁止 void* 或 union**

```cpp
// ✅ 正确
using BsonScalar = std::variant<std::string, int32_t, int64_t, double, bool, std::monostate>;

std::visit(overloaded{
    [](const std::string& s) { /* ... */ },
    [](int32_t i)            { /* ... */ },
    [](std::monostate)       { /* null */ }
}, value);
```

### C++20 特性

**Concepts：所有模板参数必须有约束**

```cpp
// ✅ 正确
template<typename T>
concept BsonSerializable = requires(T t, bsoncxx::builder::basic::document& b) {
    { t.toBson(b) }   -> std::same_as<void>;
    { T::fromBson(std::declval<bsoncxx::document::view>()) } -> std::same_as<T>;
};

template<BsonSerializable T>
class Repository { /* ... */ };

// ❌ 禁止：无约束模板
template<typename T>
class Repository { /* ... */ };
```

**结构化绑定：遍历复合结构时必须使用**

```cpp
// ✅ 正确
for (auto [key, val] : bsonDoc) { /* ... */ }
auto [ok, msg] = validateInput(data);

// ❌ 禁止
for (auto it = bsonDoc.begin(); it != bsonDoc.end(); ++it) {
    auto key = it->key();
}
```

**if-init：带初始化的 if，缩小变量作用域**

```cpp
// ✅ 正确
if (auto result = col.find_one(filter); result) {
    process(result->view());
}

// ❌ 禁止
auto result = col.find_one(filter);
if (result) { process(result->view()); }
// result 泄露到 if 块之外
```

---

## 二、Qt 使用规范

### 信号槽

**强制使用函数指针语法，禁止字符串宏语法**

```cpp
// ✅ 正确（编译期检查）
connect(btn, &QPushButton::clicked, this, &MyWidget::onClicked);
connect(model, &UserModel::dataChanged, this, [this](auto& user) {
    updateUI(user);
});

// ❌ 禁止（运行期才报错）
connect(btn, SIGNAL(clicked()), this, SLOT(onClicked()));
```

### 内存管理

**Qt 对象树管理的对象直接 new，其余用智能指针**

```cpp
// ✅ 正确：Qt 对象树管理
auto* label = new QLabel("Hello", this); // parent 负责释放

// ✅ 正确：非 Qt 对象用智能指针
auto repo = std::make_unique<UserRepository>(db);
auto config = std::make_shared<AppConfig>();

// ❌ 禁止：非 Qt 对象裸 new
UserRepository* repo = new UserRepository(db); // 需要手动 delete
```

**禁止在构造函数中直接操作 UI 以外的资源，使用 `QTimer::singleShot` 延迟初始化**

```cpp
// ✅ 正确
MyWidget::MyWidget(QWidget* parent) : QWidget(parent) {
    setupUi();
    QTimer::singleShot(0, this, &MyWidget::initialize);
}

void MyWidget::initialize() {
    // 数据库连接、网络请求等
}
```

### 数据模型

**列表数据必须继承 `QAbstractItemModel`，禁止直接用 `QListWidget` 填充大量数据**

```cpp
// ✅ 正确：自定义 Model
class UserModel : public QAbstractListModel {
    Q_OBJECT
public:
    int rowCount(const QModelIndex& = {}) const override;
    QVariant data(const QModelIndex& index, int role) const override;
private:
    std::vector<User> m_users;
};

// ❌ 禁止：大量数据直接塞 Widget
for (auto& user : users)
    listWidget->addItem(QString::fromStdString(user.name)); // 无法虚拟化
```

### 异步与线程

**耗时操作（数据库、网络）必须在非 UI 线程执行，用 `QFuture` 或 `QtConcurrent`**

```cpp
// ✅ 正确
auto future = QtConcurrent::run([this, id]() -> DbResult<User> {
    return m_repo->findById(id);
});

auto* watcher = new QFutureWatcher<DbResult<User>>(this);
connect(watcher, &QFutureWatcher<DbResult<User>>::finished, this, [watcher, this]() {
    auto result = watcher->result();
    if (result) updateUI(*result);
    else showError(QString::fromStdString(result.error()));
    watcher->deleteLater();
});
watcher->setFuture(future);

// ❌ 禁止：UI 线程直接查询
void onBtnClicked() {
    auto user = m_repo->findById(id); // 卡 UI
    updateUI(*user);
}
```

### 字符串

**内部逻辑统一用 `std::string`，仅在 Qt API 边界转换**

```cpp
// ✅ 正确：边界转换
QString toQString(const std::string& s) {
    return QString::fromUtf8(s.data(), static_cast<qsizetype>(s.size()));
}
std::string fromQString(const QString& s) {
    return s.toStdString();
}

// ❌ 禁止：混用两种字符串类型
QString name = QString::fromStdString(doc["name"].get_string().value.data());
// 重复转换，且 get_string().value 是 string_view，直接 .data() 可能截断
```

---

## 三、MongoDB / BSON 操作规范

### 类型映射

**BSON 与领域对象之间必须有明确的转换层，禁止在业务逻辑中直接操作 bsoncxx 类型**

```cpp
// ✅ 正确：领域对象有独立的序列化方法
struct User {
    std::string id;
    std::string name;
    int32_t age;

    static User fromBson(bsoncxx::document::view view) {
        return {
            .id   = view["_id"].get_oid().value.to_string(),
            .name = std::string(view["name"].get_string().value),
            .age  = view["age"].get_int32().value
        };
    }

    void toBson(bsoncxx::builder::basic::document& doc) const {
        using namespace bsoncxx::builder::basic;
        doc.append(kvp("name", name), kvp("age", age));
    }
};

// ❌ 禁止：业务层直接解析 bson
void processUser(bsoncxx::document::view view) {
    auto name = view["name"].get_string().value; // 业务层不应知道存储细节
}
```

**处理 Extended JSON 特殊类型时必须显式处理，不能假设 `to_json` 后直接可用**

```cpp
// ✅ 正确：已知 ObjectId 要单独提取
std::string getId(bsoncxx::document::view view) {
    return view["_id"].get_oid().value.to_string();
}

// ❌ 错误：Extended JSON 中 _id 是 {"$oid": "..."} 不是普通字符串
auto json = QJsonDocument::fromJson(bsoncxx::to_json(view).c_str()).object();
auto id = json["_id"].toString(); // 永远是空字符串！
```

### Repository 模式

**所有数据库操作必须封装在 Repository 类中，返回 `std::expected`**

```cpp
template<BsonSerializable T>
class Repository {
public:
    explicit Repository(mongocxx::collection col) : m_col(std::move(col)) {}

    DbResult<T> findById(const std::string& id) noexcept {
        try {
            bsoncxx::oid oid{id};
            auto doc = m_col.find_one(
                bsoncxx::builder::basic::make_document(
                    bsoncxx::builder::basic::kvp("_id", oid)
                )
            );
            if (!doc) return std::unexpected("未找到记录: " + id);
            return T::fromBson(doc->view());
        } catch (const std::exception& e) {
            return std::unexpected(std::string("查询失败: ") + e.what());
        }
    }

    DbResult<std::vector<T>> findAll(
        bsoncxx::document::view_or_value filter = {}
    ) noexcept {
        try {
            return m_col.find(filter)
                | std::views::transform([](auto& doc) { return T::fromBson(doc); })
                | std::ranges::to<std::vector>();
        } catch (const std::exception& e) {
            return std::unexpected(std::string("查询失败: ") + e.what());
        }
    }

    DbResult<std::string> insert(const T& obj) noexcept {
        try {
            bsoncxx::builder::basic::document builder;
            obj.toBson(builder);
            auto result = m_col.insert_one(builder.view());
            if (!result) return std::unexpected("插入失败");
            return result->inserted_id().get_oid().value.to_string();
        } catch (const std::exception& e) {
            return std::unexpected(std::string("插入失败: ") + e.what());
        }
    }

private:
    mongocxx::collection m_col;
};
```

---

## 四、架构规范

### 分层原则

```
UI 层（QWidget/QML）
    ↕ QFuture / signal-slot
ViewModel 层（Q_OBJECT, 暴露 Qt 友好接口）
    ↕ std::expected
Service 层（业务逻辑，纯 C++，无 Qt 依赖）
    ↕ std::expected
Repository 层（数据访问，返回领域对象）
    ↕ bsoncxx
MongoDB
```

**各层依赖规则：**

- UI 层只能依赖 ViewModel 层
- ViewModel 层可以依赖 Service 层，负责线程切换
- Service / Repository 层禁止包含任何 Qt UI 头文件
- 领域对象（User、Order 等）不得继承 `QObject`

### 命名规范

```cpp
// 类名：PascalCase
class UserRepository {};

// 成员变量：m_ 前缀
QString m_userName;

// 私有方法：camelCase
void loadData();

// Qt 槽函数：on + 发送者 + 信号名
void onLoginBtnClicked();
void onUserModelDataChanged();

// 常量：k 前缀 + PascalCase
constexpr int kMaxRetries = 3;

// 模板类型参数：T 或语义名称
template<BsonSerializable TEntity>
class Repository {};
```

---

## 五、禁止项清单

| 禁止                       | 替代方案                                  |
|--------------------------|---------------------------------------|
| 裸指针表示所有权                 | `std::unique_ptr` / `std::shared_ptr` |
| `new` 非 Qt 对象后不 delete   | 智能指针                                  |
| `SIGNAL()`/`SLOT()` 字符串宏 | 函数指针语法                                |
| UI 线程执行数据库操作             | `QtConcurrent::run`                   |
| 无约束模板参数                  | Concepts                              |
| 跨层传播裸异常                  | `std::expected`                       |
| `bsoncxx` 类型泄露到业务层       | Repository + 领域对象转换                   |
| `to_json` 后直接当普通 JSON 用  | 用 bsoncxx API 直接取值                    |
| `QListWidget` 填充大量数据     | 继承 `QAbstractItemModel`               |
| 手动 `for` 循环收集容器          | Ranges + `ranges::to<>`               |
| `void*` 或 C union        | `std::variant`                        |

---

## 六、CMake 配置要求

```cmake
cmake_minimum_required(VERSION 3.20)
project(YourProject)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# MSVC 必须显式开启 C++23
if (MSVC)
    add_compile_options(/std:c++latest /W4 /permissive- /utf-8)
endif ()
```

# 环境说明

当前为 **IDE** 环境，通过 MCP 提供完整的 JetBrains 工具集。

# 工具使用绝对优先级

**最高原则：所有代码相关的读、搜索、导航、重构、文件操作，必须优先使用 JetBrains IDE（通过 MCP）提供的工具，禁止自行实现或使用原始方法。**

优先级顺序：

1. **IDE MCP 工具** (`intellij-util` + `intellij-index`) - 所有代码操作的第一选择

**注意：** 这里的 MCP 工具本身就是 JetBrains IDE 原生能力的封装，通过 MCP 调用等同于使用 IDE 功能。

**严禁使用以下原始方法处理代码：**

- 禁止使用 `grep` 搜索代码
- 禁止使用 `findstr` 搜索代码
- 禁止使用手动文本搜索/替换处理代码
- 禁止使用正则批量替换代码
- 禁止直接读取大量文件进行代码分析

# IDE MCP 工具（最高优先级）

## intellij-util 工具（核心工具）

### 文件操作

| 操作类型   | 使用工具                    |
|--------|-------------------------|
| 创建文件   | `create_new_file`       |
| 打开文件   | `open_file_in_editor`   |
| 读取文件   | `read_file`             |
| 获取文件内容 | `get_file_text_by_path` |
| 替换文本   | `replace_text_in_file`  |
| 格式化文件  | `reformat_file`         |

### 文件搜索

| 操作类型        | 使用工具                         |
|-------------|------------------------------|
| 按 glob 搜索文件 | `find_files_by_glob`         |
| 按名称搜索文件     | `find_files_by_name_keyword` |
| 搜索文件(glob)  | `search_file`                |

### 代码搜索

| 操作类型 | 使用工具                                        |
|------|---------------------------------------------|
| 文本搜索 | `search_in_files_by_text` / `search_text`   |
| 正则搜索 | `search_in_files_by_regex` / `search_regex` |
| 符号搜索 | `search_symbol`                             |

### 符号/代码信息

| 操作类型   | 使用工具              |
|--------|-------------------|
| 获取符号信息 | `get_symbol_info` |

### 重构

| 操作类型  | 使用工具                 |
|-------|----------------------|
| 重命名重构 | `rename_refactoring` |

### 项目/构建

| 操作类型   | 使用工具                       |
|--------|----------------------------|
| 构建项目   | `build_project`            |
| 获取项目依赖 | `get_project_dependencies` |
| 获取项目模块 | `get_project_modules`      |

### 运行配置

| 操作类型   | 使用工具                        |
|--------|-----------------------------|
| 运行配置   | `execute_run_configuration` |
| 获取运行配置 | `get_run_configurations`    |

### 代码检查

| 操作类型                  | 使用工具                               |
|-----------------------|------------------------------------|
| 获取文件问题                | `get_file_problems`                |
| 生成 Inspection KTS API | `generate_inspection_kts_api`      |
| 生成 Inspection KTS 示例  | `generate_inspection_kts_examples` |
| 运行 Inspection KTS     | `run_inspection_kts`               |
| 生成 PSI 树              | `generate_psi_tree`                |

### 目录/文件浏览

| 操作类型        | 使用工具                      |
|-------------|---------------------------|
| 目录树         | `list_directory_tree`     |
| 获取所有打开的文件路径 | `get_all_open_file_paths` |

### 终端

| 操作类型   | 使用工具                       |
|--------|----------------------------|
| 执行终端命令 | `execute_terminal_command` |

### VCS

| 操作类型   | 使用工具               |
|--------|--------------------|
| 获取仓库信息 | `get_repositories` |

### 数据库相关

| 操作类型           | 使用工具                              |
|----------------|-----------------------------------|
| 执行 SQL 查询      | `execute_sql_query`               |
| 取消 SQL 查询      | `cancel_sql_query`                |
| 获取数据库对象描述      | `get_database_object_description` |
| 列出数据库连接        | `list_database_connections`       |
| 列出数据库 schema   | `list_database_schemas`           |
| 列出最近的 SQL 查询   | `list_recent_sql_queries`         |
| 列出 schema 对象类型 | `list_schema_object_kinds`        |
| 列出 schema 对象   | `list_schema_objects`             |
| 预览表数据          | `preview_table_data`              |
| 测试数据库连接        | `test_database_connection`        |

## intellij-index 工具（语义级操作补充）

以下操作具有语义级代码理解能力，优先使用：

| 操作类型   | 使用工具                       | 说明                |
|--------|----------------------------|-------------------|
| 查找定义   | `ide_find_definition`      | 跳转到符号定义位置         |
| 查找引用   | `ide_find_references`      | 查找符号的所有引用         |
| 搜索类    | `ide_find_class`           | 按名称查找类/接口/枚举      |
| 搜索文件   | `ide_find_file`            | 快速文件查找（支持模糊匹配）    |
| 搜索代码文本 | `ide_search_text`          | 基于索引的文本搜索         |
| 查看类型层次 | `ide_type_hierarchy`       | 查看类的继承层次结构        |
| 查看调用层次 | `ide_call_hierarchy`       | 查看方法的调用链          |
| 查找实现   | `ide_find_implementations` | 查找接口/抽象类的实现       |
| 查找父方法  | `ide_find_super_methods`   | 查找重写的方法在父类中的定义    |
| 检查代码问题 | `ide_diagnostics`          | 获取代码错误和警告         |
| 同步文件   | `ide_sync_files`           | 同步外部修改的文件到 IDE 索引 |
| 移动文件   | `ide_move_file`            | 移动文件并自动更新引用       |
| 重命名重构  | `ide_refactor_rename`      | 安全重命名符号（自动更新所有引用） |
| 优化导入   | `ide_optimize_imports`     | 优化导入语句            |
| 格式化代码  | `ide_reformat_code`        | 代码格式化             |
| 构建项目   | `ide_build_project`        | 使用 IDE 构建系统编译项目   |

**核心原则：相信 IDE MCP 的结果，不要重复搜索或验证。**

# 文件操作规则

**纯文件操作（可使用 filesystem MCP）：**

- 创建新文件（当不需要 IDE 索引时）
- 删除文件
- 读取文件内容（当 IDE 预览无法获取时）
- 写入文件内容（当不需要 IDE 索引时）

**涉及代码语义的操作（必须使用 IDE 工具）：**

- 移动文件 → `ide_move_file`（自动更新 import）
- 重命名符号 → `ide_refactor_rename`
- 批量修改 → 使用 IDE 重构功能

# 代码探索规则

探索项目时必须使用：

- `ide_find_class` - 按名称查找类
- `ide_find_definition` - 跳转到定义
- `ide_search_text` / `search_in_files_by_text` - 精确搜索代码
- `ide_find_references` - 查看引用

**禁止：** 打开大量文件手动分析

# 重构规则

修改现有代码时：

- **重命名变量/函数/类** → 必须使用 `ide_refactor_rename`
- **移动文件** → 必须使用 `ide_move_file`
- **其他重构** → 使用 IDE 辅助的重构功能

**严禁：** 在代码文件中进行盲目的搜索替换

# 调试规则

1. 确定最可能的原因
2. 提出最小的修复方案
3. 避免大规模重写

# 缺失信息

如果信息缺失：

- 明确说明缺失什么
- 询问用户

# 安全

除非明确要求，否则避免破坏性操作。

# 响应风格

保持简洁结构化，避免不必要的解释。

# 工程风格

像谨慎的高级软件工程师一样行事：

- 正确性优先
- 最小化代码变更
- 可维护性
- 简洁性

# 多文件规则

如果必须修改多个文件：

1. 先列出它们
2. 解释原因
3. 然后应用修改

# 最小变更规则

编辑文件时：

- 修改最少行数
- 不重写整个文件
- 避免无关重构
- 避免仅格式化的变更
