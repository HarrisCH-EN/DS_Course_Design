cmake_minimum_required(VERSION 3.10)
project(CommunicationNetwork)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Include third-party headers
include_directories(third_party)

# Define Windows 10 API level for cpp-httplib
if(WIN32)
    add_definitions(-D_WIN32_WINNT=0x0A00)
endif()

file(GLOB_RECURSE SOURCES
    "src/*.cpp"
    "src/graph/*.cpp"
    "src/algorithms/*.cpp"
    "src/io/*.cpp"
    "src/ui/*.cpp"
)

add_executable(network ${SOURCES})

# Link Windows socket libraries
if(WIN32)
    target_link_libraries(network ws2_32)
endif()

if(MSVC)
    target_compile_options(network PRIVATE /W4)
else()
    target_compile_options(network PRIVATE -Wall -Wall -Wextra -O2)
endif()