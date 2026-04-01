cmake_minimum_required(VERSION 3.16)
project(BDDB VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

# 自动检测 Qt6 路径 (Windows)
if (WIN32 AND NOT DEFINED CMAKE_PREFIX_PATH)
    # 尝试常见的 Qt 安装路径
    set(QT_POSSIBLE_PATHS
            "C:/Qt/6.11.0/mingw_64"
            "$ENV{QTDIR}"
    )
    foreach (QT_PATH ${QT_POSSIBLE_PATHS})
        if (EXISTS "${QT_PATH}/lib/cmake/Qt6")
            set(CMAKE_PREFIX_PATH ${QT_PATH})
            message(STATUS "Found Qt6 at: ${QT_PATH}")
            break()
        endif ()
    endforeach ()
endif ()

# Qt 6
find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets)

# MongoDB C++ driver
find_package(mongocxx CONFIG OPTIONAL_COMPONENTS mongoc)
find_package(bsoncxx CONFIG OPTIONAL_COMPONENTS bsoncxx)

# Source files
add_executable(BDDB
        src/main.cpp
        src/mainwindow.cpp
        src/mainwindow.h
        src/torrentmanagerwindow.cpp
        src/torrentmanagerwindow.h
        src/volumemanagerwindow.cpp
        src/volumemanagerwindow.h
        src/volumeeditorwindow.cpp
        src/volumeeditorwindow.h
        src/mediaeditorwindow.cpp
        src/mediaeditorwindow.h
        src/worklinkwindow.cpp
        src/worklinkwindow.h
        src/productsearchwindow.cpp
        src/productsearchwindow.h
        src/worksearchwindow.cpp
        src/worksearchwindow.h
        src/progressdialog.cpp
        src/progressdialog.h
)

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

target_link_libraries(BDDB PRIVATE
        Qt6::Core
        Qt6::Gui
        Qt6::Widgets
)

# MongoDB (if found)
if (mongocxx_FOUND)
    target_link_libraries(BDDB PRIVATE mongocxx::mongocxx bsoncxx::bsoncxx)
    target_compile_definitions(BDDB PRIVATE HAVE_MONGODB=1)
endif ()
