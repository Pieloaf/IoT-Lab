# SPDX-License-Identifier: Apache-2.0

cmake_minimum_required(VERSION 3.13.1)

find_package(Zephyr REQUIRED HINTS $ENV{ZEPHYR_BASE})
project(hello_world)
if (HAVE_LIB_M)                                                                                                                          
    set(EXTRA_LIBS ${EXTRA_LIBS} m)                                                                                                      
endif (HAVE_LIB_M)
target_sources(app PRIVATE src/main.c src/lsm303_ll.c)
zephyr_include_directories(${ZEPHYR_BASE}/boards/arm/bbc_microbit_v2)
