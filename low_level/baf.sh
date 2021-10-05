#!/bin/bash

west build -b bbc_microbit_v2 $1 --pristine

if [ "$2" = '--flash' ]
then
 west flash
fi