# SPDX-License-Identifier: Apache-2.0

cmake_minimum_required(VERSION 3.13.1)

find_package(Zephyr REQUIRED HINTS $ENV{ZEPHYR_BASE})
project(hello_world)

target_sources(app PRIVATE src/main.c src/scd30.c src/sensirion_common.c src/sensirion_hw_i2c_implementation.c src/matrix.c src/buttons.c)
zephyr_include_directories(${ZEPHYR_BASE}/boards/arm/bbc_microbit_v2)
