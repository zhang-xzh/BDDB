# LANGUAGE

Always respond in Chinese unless the user asks for another language.

# 代码要求

1. 禁用一切原生标签和裸css，使用antd v6组件库
2. 桌面使用最优先,去TMD留白
3. 没有跨平台,一切单机
4. 禁止任何形式的主动写操作
5. 任何操作主动给我解释并必须得到我的许可
6. 我说的就是绝对的, 不需要你扩散理解
7. 别TMD动命令之外的任何东西
8. 别自作聪明动到周围, 哪怕多看一眼也不行
9. 如果我同时做了修改,永远听我的
10. 别TMD你把我删掉的东西,反复加回去
11. 当我问你问题时,回答问题别TMD写代码

# 环境说明

当前环境为 **WebStorm IDE** 环境，通过 MCP 提供完整的 JetBrains 工具集。

# 工具使用绝对优先级

**最高原则：所有代码相关的读、搜索、导航、重构、文件操作，必须优先使用 JetBrains IDE（通过 MCP）提供的工具，禁止自行实现或使用原始方法。**

优先级顺序：

1. **IDE MCP 工具** - 所有代码操作的第一选择

**注意：** 这里的 MCP 工具本身就是 JetBrains IDE 原生能力的封装，通过 MCP 调用等同于使用 IDE 功能。

**严禁使用以下原始方法处理代码：**

- 禁止使用 `grep` 搜索代码
- 禁止使用 `findstr` 搜索代码
- 禁止使用手动文本搜索/替换处理代码
- 禁止使用正则批量替换代码
- 禁止直接读取大量文件进行代码分析

# IDE MCP 工具（最高优先级）

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

**核心原则：相信 IDE MCP 的结果，不要重复搜索或验证。**

# 文件操作规则

**纯文件操作（可使用 filesystem MCP）：**

- 创建新文件（当不需要 IDE 索引时）
- 删除文件
- 读取文件内容（当 IDE 预览无法获取时）
- 写入文件内容（当不需要 IDE 索引时）

# 代码探索规则

**禁止：** 打开大量文件手动分析

**严禁：** 在代码文件中进行盲目的搜索替换
