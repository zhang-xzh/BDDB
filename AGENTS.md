# LANGUAGE

Always respond in Chinese unless the user asks for another language.

# 代码要求

1. 禁用一切原生标签和裸css，使用antd v6组件库
2. 桌面使用最优先,去TMD留白

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
