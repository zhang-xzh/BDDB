cmake_minimum_required(VERSION 3.16)

# vcpkg toolchain must be set before project()
# 注意：如果 IDE (CLion) 已配置 vcpkg，这段代码不会执行
if (WIN32 AND NOT DEFINED CMAKE_TOOLCHAIN_FILE)
    set(VCPKG_CANDIDATES
            "C:/Users/zhang/.vcpkg-clion/vcpkg/scripts/buildsystems/vcpkg.cmake"
    )
    foreach (VCPKG_CMAKE ${VCPKG_CANDIDATES})
        if (EXISTS ${VCPKG_CMAKE})
            set(CMAKE_TOOLCHAIN_FILE ${VCPKG_CMAKE} CACHE STRING "vcpkg toolchain" FORCE)
            message(STATUS "Found vcpkg toolchain: ${VCPKG_CMAKE}")
            break()
        endif ()
    endforeach ()
endif ()

project(BDDB VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

# 自动检测 Qt6 路径 (Windows) - 优先使用 MSVC 版本
if (WIN32 AND NOT DEFINED CMAKE_PREFIX_PATH)
    set(QT_POSSIBLE_PATHS
            "C:/Qt/6.11.0/msvc2022_64"
    )
    foreach (QT_PATH ${QT_POSSIBLE_PATHS})
        if (EXISTS "${QT_PATH}/lib/cmake/Qt6")
            set(CMAKE_PREFIX_PATH ${QT_PATH})
            message(STATUS "Found Qt6 at: ${QT_PATH}")
            break()
        endif ()
    endforeach ()
endif ()

# Qt 6 - disable optional Vulkan support
set(QT_NO_FIND_VULKAN_SDK TRUE)
find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets Network)

# MongoDB C++ driver (via vcpkg)
find_package(mongocxx CONFIG)
find_package(bsoncxx CONFIG)

# Source files - auto match all .cpp and .h files
file(GLOB_RECURSE BDDB_SOURCES
        CONFIGURE_DEPENDS
        "src/*.cpp"
        "src/*.h"
)

# Exclude MongoDB sources if driver not found
if (NOT mongocxx_FOUND OR NOT bsoncxx_FOUND)
    file(GLOB_RECURSE MONGODB_SOURCES
            "src/db/*.cpp"
            "src/db/*.h"
    )
    if (MONGODB_SOURCES)
        list(REMOVE_ITEM BDDB_SOURCES ${MONGODB_SOURCES})
    endif ()
endif ()

add_executable(BDDB ${BDDB_SOURCES})

# MongoDB support
if (mongocxx_FOUND AND bsoncxx_FOUND)
    target_link_libraries(BDDB PRIVATE mongo::mongocxx_shared mongo::bsoncxx_shared)
    target_compile_definitions(BDDB PRIVATE HAVE_MONGODB=1)
    message(STATUS "MongoDB C++ driver enabled")
else ()
    message(WARNING "MongoDB C++ driver not found, local DB disabled")
endif ()

# Include root for module-style includes
target_include_directories(BDDB PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src)

# Qt resources
target_sources(BDDB PRIVATE
        resources/BDDB.qrc
)

# Windows-specific
if (WIN32)
    set_target_properties(BDDB PROPERTIES
            WIN32_EXECUTABLE YES
            OUTPUT_NAME "BDDB"
    )
endif ()

if (MSVC)
    target_compile_options(BDDB PRIVATE /Zc:__cplusplus)
endif ()

target_link_libraries(BDDB PRIVATE
        Qt6::Core
        Qt6::Gui
        Qt6::Widgets
        Qt6::Network
)
