cmake_minimum_required(VERSION 3.20)

# ═══════════════════════════════════════════════════════════════════════════════
# vcpkg 工具链自动检测
# ═══════════════════════════════════════════════════════════════════════════════
if (WIN32 AND NOT DEFINED CMAKE_TOOLCHAIN_FILE)
    # 候选 vcpkg 安装路径（按优先级排序）
    set(VCPKG_CANDIDATE_PATHS
            "$ENV{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake"
            "$ENV{USERPROFILE}/.vcpkg/vcpkg/scripts/buildsystems/vcpkg.cmake"
            "$ENV{USERPROFILE}/vcpkg/scripts/buildsystems/vcpkg.cmake"
            "C:/vcpkg/scripts/buildsystems/vcpkg.cmake"
            "C:/Users/$ENV{USERNAME}/.vcpkg-clion/vcpkg/scripts/buildsystems/vcpkg.cmake"
            "${CMAKE_CURRENT_SOURCE_DIR}/vcpkg/scripts/buildsystems/vcpkg.cmake"
    )

    foreach (VCPKG_CMAKE ${VCPKG_CANDIDATE_PATHS})
        if (EXISTS ${VCPKG_CMAKE})
            set(CMAKE_TOOLCHAIN_FILE ${VCPKG_CMAKE} CACHE STRING "vcpkg toolchain" FORCE)
            message(STATUS "✓ Found vcpkg toolchain: ${VCPKG_CMAKE}")
            break()
        endif ()
    endforeach ()

    if (NOT DEFINED CMAKE_TOOLCHAIN_FILE)
        message(STATUS "⚠ vcpkg toolchain not found in standard locations")
        message(STATUS "  Consider setting VCPKG_ROOT environment variable or CMAKE_TOOLCHAIN_FILE")
    endif ()
endif ()

# ═══════════════════════════════════════════════════════════════════════════════
# 项目定义
# ═══════════════════════════════════════════════════════════════════════════════
project(BDDB
        VERSION 0.1.0
        LANGUAGES CXX
        DESCRIPTION "BDDB - Modern C++/Qt6 Application"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C++ 标准设置
# ═══════════════════════════════════════════════════════════════════════════════
set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Qt 自动处理
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTOUIC_SEARCH_PATHS ${CMAKE_CURRENT_SOURCE_DIR}/src)

# 导出编译命令（便于 IDE 和工具使用）
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# ═══════════════════════════════════════════════════════════════════════════════
# 编译器选项
# ═══════════════════════════════════════════════════════════════════════════════
if (MSVC)
    add_compile_options(
            /std:c++latest    # 最新 C++ 标准
            /W4               # 高警告级别
            /permissive-      # 严格标准符合
            /utf-8            # UTF-8 源码
            /Zc:__cplusplus   # 正确的 __cplusplus 宏
            /MP               # 多处理器编译
    )
    add_link_options(
            /INCREMENTAL:NO   # 禁用增量链接以获得更干净的构建
    )
    add_compile_definitions(_CRT_SECURE_NO_WARNINGS)
endif ()

# ═══════════════════════════════════════════════════════════════════════════════
# Qt6 智能查找
# ═══════════════════════════════════════════════════════════════════════════════
function(find_qt6_smart)
    # 如果已经找到，跳过
    if (Qt6_DIR)
        return()
    endif ()

    message(STATUS "🔍 Searching for Qt6...")

    # 1. 检查环境变量
    if (DEFINED ENV{QT_ROOT_DIR} AND EXISTS "$ENV{QT_ROOT_DIR}/lib/cmake/Qt6")
        set(Qt6_DIR "$ENV{QT_ROOT_DIR}/lib/cmake/Qt6" CACHE PATH "Qt6 directory")
        message(STATUS "✓ Found Qt6 via QT_ROOT_DIR: $ENV{QT_ROOT_DIR}")
        return()
    endif ()

    if (DEFINED ENV{Qt6_DIR})
        set(Qt6_DIR "$ENV{Qt6_DIR}" CACHE PATH "Qt6 directory")
        message(STATUS "✓ Found Qt6 via Qt6_DIR environment variable")
        return()
    endif ()

    # 2. 尝试从 Qt 安装器的标准路径查找
    if (WIN32)
        # 使用文件 GLOB 自动发现安装的 Qt 版本
        file(GLOB QT_VERSION_DIRS
                "C:/Qt/6.*/msvc*"
                "C:/Qt/6.*.*/msvc*"
                "$ENV{USERPROFILE}/Qt/6.*/msvc*"
                "$ENV{LOCALAPPDATA}/Qt/6.*/msvc*"
        )

        # 按版本号降序排序（优先使用新版本）
        if (QT_VERSION_DIRS)
            list(SORT QT_VERSION_DIRS COMPARE NATURAL ORDER DESCENDING)
            list(GET QT_VERSION_DIRS 0 QT_NEWEST_PATH)
            if (EXISTS "${QT_NEWEST_PATH}/lib/cmake/Qt6/Qt6Config.cmake")
                set(Qt6_DIR "${QT_NEWEST_PATH}/lib/cmake/Qt6" CACHE PATH "Qt6 directory")
                set(CMAKE_PREFIX_PATH "${QT_NEWEST_PATH}" CACHE PATH "Qt prefix path")
                message(STATUS "✓ Found Qt6 at: ${QT_NEWEST_PATH}")
                return()
            endif ()
        endif ()
    elseif (APPLE)
        file(GLOB QT_VERSION_DIRS
                "~/Qt/6.*/macos"
                "/opt/Qt/6.*/macos"
                "/usr/local/Qt*/6.*/macos"
        )
        if (QT_VERSION_DIRS)
            list(SORT QT_VERSION_DIRS COMPARE NATURAL ORDER DESCENDING)
            list(GET QT_VERSION_DIRS 0 QT_NEWEST_PATH)
            set(Qt6_DIR "${QT_NEWEST_PATH}/lib/cmake/Qt6" CACHE PATH "Qt6 directory")
            message(STATUS "✓ Found Qt6 at: ${QT_NEWEST_PATH}")
            return()
        endif ()
    else ()
        # Linux
        find_package(Qt6 QUIET COMPONENTS Core)
        if (Qt6_FOUND)
            message(STATUS "✓ Found Qt6 via system package manager")
            return()
        endif ()
    endif ()

    message(STATUS "⚠ Qt6 not auto-detected. Install Qt6 or set Qt6_DIR/QT_ROOT_DIR")
endfunction()

find_qt6_smart()

# ═══════════════════════════════════════════════════════════════════════════════
# 查找 Qt6 组件
# ═══════════════════════════════════════════════════════════════════════════════
set(QT_NO_FIND_VULKAN_SDK TRUE)  # 禁用可选的 Vulkan 支持

find_package(Qt6 REQUIRED COMPONENTS
        Core
        Gui
        Widgets
        Network
        Concurrent
)

# 确保 Qt6 资源编译器可用
if (Qt6Core_VERSION VERSION_LESS "6.0.0")
    message(FATAL_ERROR "Qt6 is required, found Qt${Qt6Core_VERSION}")
endif ()

message(STATUS "✓ Using Qt ${Qt6Core_VERSION}")

# ═══════════════════════════════════════════════════════════════════════════════
# MongoDB C++ 驱动查找
# ═══════════════════════════════════════════════════════════════════════════════
message(STATUS "🔍 Searching for MongoDB C++ driver...")

# 首先尝试标准 find_package（通过 CMAKE_PREFIX_PATH 或 vcpkg）
find_package(mongocxx CONFIG)
find_package(bsoncxx CONFIG)

if (mongocxx_FOUND AND bsoncxx_FOUND)
    message(STATUS "✓ Found MongoDB C++ driver via CMake config")
else ()
    # 尝试从 vcpkg 安装目录自动推断
    if (DEFINED VCPKG_INSTALLED_DIR)
        set(VCPKG_BASE "${VCPKG_INSTALLED_DIR}")
    elseif (DEFINED VCPKG_TARGET_TRIPLET AND DEFINED _VCPKG_INSTALLED_DIR)
        set(VCPKG_BASE "${_VCPKG_INSTALLED_DIR}/${VCPKG_TARGET_TRIPLET}")
    else ()
        # 尝试常见的 vcpkg 安装路径
        set(VCPKG_CANDIDATES
                "${CMAKE_CURRENT_SOURCE_DIR}/vcpkg_installed/x64-windows"
                "${CMAKE_CURRENT_SOURCE_DIR}/../vcpkg_installed/x64-windows"
                "$ENV{VCPKG_ROOT}/installed/x64-windows"
                "$ENV{USERPROFILE}/.vcpkg-clion/vcpkg/installed/x64-windows"
                "C:/vcpkg/installed/x64-windows"
        )
        foreach (CANDIDATE ${VCPKG_CANDIDATES})
            if (EXISTS "${CANDIDATE}/share")
                set(VCPKG_BASE "${CANDIDATE}")
                break()
            endif ()
        endforeach ()
    endif ()

    if (VCPKG_BASE)
        message(STATUS "  Checking vcpkg: ${VCPKG_BASE}")

        # 在 share 目录中搜索 mongocxx 和 bsoncxx
        file(GLOB MONGOCXX_CONFIG_PATHS "${VCPKG_BASE}/share/*mongocxx*/*config*.cmake")
        file(GLOB BSONCXX_CONFIG_PATHS "${VCPKG_BASE}/share/*bsoncxx*/*config*.cmake")

        if (MONGOCXX_CONFIG_PATHS AND BSONCXX_CONFIG_PATHS)
            # 提取目录路径
            list(GET MONGOCXX_CONFIG_PATHS 0 MONGOCXX_CONFIG)
            list(GET BSONCXX_CONFIG_PATHS 0 BSONCXX_CONFIG)
            get_filename_component(mongocxx_DIR "${MONGOCXX_CONFIG}" DIRECTORY)
            get_filename_component(bsoncxx_DIR "${BSONCXX_CONFIG}" DIRECTORY)

            set(mongocxx_DIR "${mongocxx_DIR}" CACHE PATH "mongocxx directory" FORCE)
            set(bsoncxx_DIR "${bsoncxx_DIR}" CACHE PATH "bsoncxx directory" FORCE)

            # 重新查找
            find_package(mongocxx CONFIG REQUIRED)
            find_package(bsoncxx CONFIG REQUIRED)

            if (mongocxx_FOUND AND bsoncxx_FOUND)
                message(STATUS "✓ Found MongoDB C++ driver in vcpkg")
            endif ()
        endif ()
    endif ()
endif ()

# ═══════════════════════════════════════════════════════════════════════════════
# 源文件收集
# ═══════════════════════════════════════════════════════════════════════════════
file(GLOB_RECURSE BDDB_SOURCES
        CONFIGURE_DEPENDS
        "${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp"
        "${CMAKE_CURRENT_SOURCE_DIR}/src/*.h"
        "${CMAKE_CURRENT_SOURCE_DIR}/src/*.hpp"
        "${CMAKE_CURRENT_SOURCE_DIR}/src/*.ui"
)

# ═══════════════════════════════════════════════════════════════════════════════
# 可执行文件定义
# ═══════════════════════════════════════════════════════════════════════════════
add_executable(${PROJECT_NAME} ${BDDB_SOURCES})

# Windows DPI 感知设置 - 解决字体锯齿问题
if (WIN32 AND MSVC)
    # 启用每监视器 DPI 感知
    set_target_properties(${PROJECT_NAME} PROPERTIES VS_DPI_AWARE "PerMonitor")
    # 嵌入 DPI 感知清单文件
    target_sources(${PROJECT_NAME} PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}/resources/BDDB.manifest")
endif ()

# ═══════════════════════════════════════════════════════════════════════════════
# 包含目录
# ═══════════════════════════════════════════════════════════════════════════════
target_include_directories(${PROJECT_NAME}
        PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/src
)

# ═══════════════════════════════════════════════════════════════════════════════
# 链接库
# ═══════════════════════════════════════════════════════════════════════════════
target_link_libraries(${PROJECT_NAME} PRIVATE
        Qt6::Core
        Qt6::Gui
        Qt6::Widgets
        Qt6::Network
        Qt6::Concurrent
)

# MongoDB 支持（必需）
if (mongocxx_FOUND AND bsoncxx_FOUND)
    target_link_libraries(${PROJECT_NAME} PRIVATE
            mongo::mongocxx_shared
            mongo::bsoncxx_shared
    )
    message(STATUS "✓ MongoDB C++ driver enabled")

    # 获取 include 目录信息用于诊断
    get_target_property(MONGOCXX_INCLUDE_DIRS mongo::mongocxx_shared INTERFACE_INCLUDE_DIRECTORIES)
    message(STATUS "  mongocxx include: ${MONGOCXX_INCLUDE_DIRS}")
else ()
    message(FATAL_ERROR "MongoDB C++ driver not found. Install via vcpkg: vcpkg install mongocxx")
endif ()

# ═══════════════════════════════════════════════════════════════════════════════
# 资源文件
# ═══════════════════════════════════════════════════════════════════════════════
set(RESOURCE_FILES "${CMAKE_CURRENT_SOURCE_DIR}/resources/BDDB.qrc")
if (EXISTS ${RESOURCE_FILES})
    target_sources(${PROJECT_NAME} PRIVATE ${RESOURCE_FILES})
else ()
    message(STATUS "⚠ Resource file not found: ${RESOURCE_FILES}")
endif ()

# ═══════════════════════════════════════════════════════════════════════════════
# 平台特定配置
# ═══════════════════════════════════════════════════════════════════════════════
if (WIN32)
    set_target_properties(${PROJECT_NAME} PROPERTIES
            WIN32_EXECUTABLE YES
            OUTPUT_NAME "BDDB"
    )

    # Windows 下部署依赖 DLL
    if (TARGET Qt6::qmake)
        get_target_property(QT_QMAKE_EXECUTABLE Qt6::qmake IMPORTED_LOCATION)
        get_filename_component(QT_BIN_DIR "${QT_QMAKE_EXECUTABLE}" DIRECTORY)
        find_program(WINDEPLOYQT_EXECUTABLE windeployqt HINTS "${QT_BIN_DIR}")

        if (WINDEPLOYQT_EXECUTABLE)
            message(STATUS "  Found windeployqt: ${WINDEPLOYQT_EXECUTABLE}")

            # 获取目标文件路径
            set(TARGET_EXE "$<TARGET_FILE:${PROJECT_NAME}>")

            # 使用 windeployqt 部署 Qt 依赖（构建后执行）
            add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
                    COMMAND "${WINDEPLOYQT_EXECUTABLE}"
                    "$<TARGET_FILE:${PROJECT_NAME}>"
                    --no-translations
                    --no-compiler-runtime
                    --no-opengl-sw
                    COMMENT "Deploying Qt dependencies..."
            )
        endif ()
    endif ()

    # 复制 MongoDB C++ 驱动 DLL
    if (mongocxx_FOUND AND bsoncxx_FOUND)
        # 从 vcpkg 安装目录获取 DLL 路径
        if (DEFINED VCPKG_INSTALLED_DIR)
            set(VCPKG_BIN_DIR "${VCPKG_INSTALLED_DIR}/x64-windows/bin")
        elseif (DEFINED _VCPKG_INSTALLED_DIR)
            set(VCPKG_BIN_DIR "${_VCPKG_INSTALLED_DIR}/x64-windows/bin")
        else ()
            set(VCPKG_BIN_DIR "C:/Users/zhang/.vcpkg-clion/vcpkg/installed/x64-windows/bin")
        endif ()

        set(MONGODB_DLLS
                "${VCPKG_BIN_DIR}/mongoc2.dll"
                "${VCPKG_BIN_DIR}/mongocxx-v_noabi-rhi-md.dll"
                "${VCPKG_BIN_DIR}/bson2.dll"
                "${VCPKG_BIN_DIR}/bsoncxx-v_noabi-rhi-md.dll"
        )

        foreach (DLL_PATH ${MONGODB_DLLS})
            if (EXISTS ${DLL_PATH})
                add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
                        COMMAND ${CMAKE_COMMAND} -E copy_if_different
                        "${DLL_PATH}"
                        "$<TARGET_FILE_DIR:${PROJECT_NAME}>"
                        COMMENT "Copying ${DLL_PATH}"
                )
            endif ()
        endforeach ()
    endif ()
endif ()

# ═══════════════════════════════════════════════════════════════════════════════
# 安装配置（可选）
# ═══════════════════════════════════════════════════════════════════════════════
include(GNUInstallDirs)

install(TARGETS ${PROJECT_NAME}
        RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
        BUNDLE DESTINATION .
)

# ═══════════════════════════════════════════════════════════════════════════════
# 配置摘要
# ═══════════════════════════════════════════════════════════════════════════════
message(STATUS "")
message(STATUS "╔══════════════════════════════════════════════════════════════╗")
message(STATUS "║               ${PROJECT_NAME} Configuration Summary          ║")
message(STATUS "╠══════════════════════════════════════════════════════════════╣")
message(STATUS "║ C++ Standard:    ${CMAKE_CXX_STANDARD}")
message(STATUS "║ Qt Version:      ${Qt6Core_VERSION}")
message(STATUS "║ Build Type:      ${CMAKE_BUILD_TYPE}")
message(STATUS "║ MongoDB Driver:  ${mongocxx_FOUND} (required)")
message(STATUS "╚══════════════════════════════════════════════════════════════╝")
message(STATUS "")
