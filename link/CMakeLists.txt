cmake_minimum_required(VERSION 3.5)
project(link)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_BUILD_TYPE Debug)

find_package(Boost 1.50 COMPONENTS system REQUIRED)

set(SOURCE_FILES link.cpp cobs.c)
add_executable(link ${SOURCE_FILES})
target_link_libraries(link pthread ${Boost_LIBRARIES})