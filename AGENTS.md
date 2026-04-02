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
- UI 框架：QML + Qt Quick Controls 2（Fusion 样式）

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

## 二、Qt / QML 使用规范

### UI 层：QML

**所有 UI 必须用 QML 编写，禁止使用 Qt Widgets 构建界面**

```qml
// ✅ 正确：声明式 UI，结构清晰
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

ApplicationWindow {
    title: "主窗口"
    visible: true

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 12

        TextField {
            id: nameInput
            placeholderText: "请输入姓名"
            Layout.fillWidth: true
        }

        Button {
            text: "提交"
            onClicked: viewModel.submit(nameInput.text)
        }
    }
}

// ❌ 禁止：在 QML 中写业务逻辑
Button {
    onClicked: {
        // 不允许在 QML 里直接操作数据库或复杂逻辑
        let result = db.query("SELECT ...")
    }
}
```

**样式统一使用 Fusion，在 main.cpp 中全局设置**

```cpp
// ✅ 正确
#include <QQuickStyle>
QQuickStyle::setStyle("Fusion");
```

**多窗口：每个独立窗口用 `ApplicationWindow`，禁止设置 `transientParent`（保持独立任务栏图标）**

```qml
// ✅ 正确：独立任务栏图标
ApplicationWindow {
    id: secondWindow
    title: "第二窗口"
    // 不设置 transientParent
}

// ❌ 禁止：会失去独立任务栏图标
Window {
    transientParent: mainWindow
}
```

### ViewModel 层：C++ 暴露给 QML

**ViewModel 必须继承 `QObject`，用 `Q_PROPERTY` 暴露属性，用 `Q_INVOKABLE` 暴露方法**

```cpp
// ✅ 正确
class UserViewModel : public QObject {
    Q_OBJECT
    Q_PROPERTY(QString userName READ userName NOTIFY userNameChanged)
    Q_PROPERTY(bool loading READ loading NOTIFY loadingChanged)

public:
    explicit UserViewModel(QObject* parent = nullptr);

    Q_INVOKABLE void submit(const QString& name);
    Q_INVOKABLE void loadUser(const QString& id);

    QString userName() const { return m_userName; }
    bool loading() const { return m_loading; }

signals:
    void userNameChanged();
    void loadingChanged();
    void errorOccurred(const QString& message);

private:
    QString m_userName;
    bool m_loading = false;
};
```

**在 QML 中绑定 ViewModel 属性，禁止在 QML 中存储业务状态**

```qml
// ✅ 正确：单向数据流，QML 只读取和触发
Text {
    text: userViewModel.userName  // 绑定属性
}
Button {
    enabled: !userViewModel.loading
    onClicked: userViewModel.loadUser(idInput.text)  // 调用方法
}
Connections {
    target: userViewModel
    function onErrorOccurred(message) { errorDialog.open() }
}

// ❌ 禁止：QML 自己维护业务状态
property string localUserName: ""
onClicked: { localUserName = input.text; /* 本地处理 */ }
```

### 注册方式

**ViewModel 通过 `qmlRegisterSingletonInstance` 或 `setContextProperty` 注入，禁止在 QML 里 new C++ 对象**

```cpp
// ✅ 正确：单例注入
auto* vm = new UserViewModel(&engine);
engine.rootContext()->setContextProperty("userViewModel", vm);

// 或 Qt 6 推荐方式
qmlRegisterSingletonInstance("com.myapp", 1, 0, "UserViewModel", vm);
```

### 数据模型

**列表数据必须继承 `QAbstractListModel`，通过 `roleNames()` 暴露字段给 QML**

```cpp
// ✅ 正确
class UserModel : public QAbstractListModel {
    Q_OBJECT
public:
    enum Roles { NameRole = Qt::UserRole + 1, AgeRole };

    int rowCount(const QModelIndex& = {}) const override;
    QVariant data(const QModelIndex& index, int role) const override;
    QHash<int, QByteArray> roleNames() const override {
        return { {NameRole, "name"}, {AgeRole, "age"} };
    }

private:
    std::vector<User> m_users;
};
```

```qml
// QML 侧直接用 role 名称访问
ListView {
    model: userModel
    delegate: Text { text: model.name + " / " + model.age }
}
```

**禁止用 `QVariantList` 或 `QStringList` 直接绑定大量数据**

```cpp
// ❌ 禁止：无法虚拟化，大数据量卡顿
Q_PROPERTY(QStringList names READ names NOTIFY namesChanged)
```

### 异步与线程

**耗时操作必须在非 UI 线程执行，结果通过信号回传给 QML**

```cpp
// ✅ 正确
void UserViewModel::loadUser(const QString& id) {
    m_loading = true;
    emit loadingChanged();

    auto future = QtConcurrent::run([this, id = id.toStdString()]() -> DbResult<User> {
        return m_repo->findById(id);
    });

    auto* watcher = new QFutureWatcher<DbResult<User>>(this);
    connect(watcher, &QFutureWatcher<DbResult<User>>::finished, this, [watcher, this]() {
        auto result = watcher->result();
        if (result) {
            m_userName = QString::fromStdString(result->name);
            emit userNameChanged();
        } else {
            emit errorOccurred(QString::fromStdString(result.error()));
        }
        m_loading = false;
        emit loadingChanged();
        watcher->deleteLater();
    });
    watcher->setFuture(future);
}

// ❌ 禁止：UI 线程直接查询
Q_INVOKABLE void loadUser(const QString& id) {
    auto user = m_repo->findById(id.toStdString()); // 卡 UI
}
```

### 字符串

**C++ 内部逻辑统一用 `std::string`，仅在 Qt/QML 边界转换**

```cpp
// ✅ 正确：边界转换
QString toQString(const std::string& s) {
    return QString::fromUtf8(s.data(), static_cast<qsizetype>(s.size()));
}
std::string fromQString(const QString& s) {
    return s.toStdString();
}
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
UI 层（QML）
    ↕ Q_PROPERTY 绑定 / Q_INVOKABLE 调用 / 信号
ViewModel 层（QObject + Q_PROPERTY，线程切换，暴露 Qt 友好接口）
    ↕ std::expected
Service 层（业务逻辑，纯 C++，无 Qt 依赖）
    ↕ std::expected
Repository 层（数据访问，返回领域对象）
    ↕ bsoncxx
MongoDB
```

**各层依赖规则：**

- QML 只能调用 ViewModel 的 `Q_INVOKABLE` 方法和读取 `Q_PROPERTY`
- QML 禁止包含业务逻辑、条件判断复杂的 JS 代码
- ViewModel 负责线程切换，将异步结果通过信号通知 QML
- Service / Repository 层禁止包含任何 Qt / QML 头文件
- 领域对象（User、Order 等）不得继承 `QObject`

### 命名规范

```cpp
// C++ 类名：PascalCase
class UserViewModel {};
class UserRepository {};

// 成员变量：m_ 前缀
QString m_userName;

// 私有方法：camelCase
void loadData();

// 信号：动词过去式或名词+Changed
signals:
    void userNameChanged();
    void errorOccurred(const QString& message);

// Q_INVOKABLE 方法：camelCase 动词开头
Q_INVOKABLE void submitForm(const QString& name);

// 常量：k 前缀 + PascalCase
constexpr int kMaxRetries = 3;

// 模板类型参数：T 或语义名称
template<BsonSerializable TEntity>
class Repository {};
```

```qml
// QML 属性：camelCase
property string userName: ""

// QML 信号处理：on + 信号名（首字母大写）
onClicked: { ... }
onUserNameChanged: { ... }

// QML id：camelCase，语义化
id: submitButton
id: userNameInput
```

---

## 五、禁止项清单

| 禁止                                  | 替代方案                                                  |
|-------------------------------------|-------------------------------------------------------|
| Qt Widgets 构建 UI                    | QML + Qt Quick Controls 2                             |
| QML 中写业务逻辑                          | 逻辑下沉到 C++ ViewModel                                   |
| QML 中直接 new C++ 对象                  | `setContextProperty` / `qmlRegisterSingletonInstance` |
| `transientParent` 导致丢失任务栏图标         | 独立 `ApplicationWindow` 不设父窗口                          |
| `QVariantList`/`QStringList` 绑定大量数据 | 继承 `QAbstractListModel`                               |
| UI 线程执行数据库操作                        | `QtConcurrent::run` + `QFutureWatcher`                |
| 裸指针表示所有权（非 QObject）                 | `std::unique_ptr` / `std::shared_ptr`                 |
| `SIGNAL()`/`SLOT()` 字符串宏            | 函数指针语法                                                |
| 无约束模板参数                             | Concepts                                              |
| 跨层传播裸异常                             | `std::expected`                                       |
| `bsoncxx` 类型泄露到业务层                  | Repository + 领域对象转换                                   |
| `to_json` 后直接当普通 JSON 用             | 用 bsoncxx API 直接取值                                    |
| 手动 `for` 循环收集容器                     | Ranges + `ranges::to<>`                               |
| `void*` 或 C union                   | `std::variant`                                        |

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

# Qt Quick / QML 必须启用
find_package(Qt6 REQUIRED COMPONENTS Core Quick QuickControls2 Concurrent)
target_link_libraries(${PROJECT_NAME} PRIVATE
        Qt6::Core Qt6::Quick Qt6::QuickControls2 Qt6::Concurrent
)

# QML 资源文件
qt_add_qml_module(${PROJECT_NAME}
        URI com.myapp
        VERSION 1.0
        QML_FILES
        qml/Main.qml
        qml/SecondWindow.qml
)
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