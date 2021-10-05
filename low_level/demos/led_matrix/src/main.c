/*
 * SPDX-License-Identifier: Apache-2.0
*/

#include <zephyr.h>
#include <sys/printk.h>
#include <device.h>	
#include <stdio.h>
#include "matrix.h"

void main(void)
{
	int ret;
	uint8_t rows = 1;
	uint8_t cols = 1;
	ret = matrix_begin();
	if (ret < 0)
	{
		printf("\nError initializing LED matrix.  Error code = %d\n",ret);	
		while(1);
	}
	while(1)
	{   
		rows = 0b10000;
		cols = 0b10000;
		matrix_put_pattern(rows, ~cols);
		k_msleep(2);
		rows = 0b01000;
		cols = 0b01000;
		matrix_put_pattern(rows, ~cols);
		k_msleep(2);
		rows = 0b00100;
		cols = 0b00100;
		matrix_put_pattern(rows, ~cols);
		k_msleep(2);
		rows = 0b00010;
		cols = 0b00010;
		matrix_put_pattern(rows, ~cols);
		k_msleep(2);
		rows = 0b00001;
		cols = 0b00001;
		matrix_put_pattern(rows, ~cols);
		k_msleep(2);
	}
}
