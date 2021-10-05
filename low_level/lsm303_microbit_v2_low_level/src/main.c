/*
 * SPDX-License-Identifier: Apache-2.0
*/

#include <zephyr.h>
#include <sys/printk.h>
#include <device.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <time.h>
#include <math.h>
#include "lsm303_ll.h"
#include "matrix.h"

void main(void)
{
	int ret;

	ret = lsm303_ll_begin();
	if (ret < 0)
	{
		printf("\nError initializing lsm303.  Error code = %d\n", ret);
		while (1)
			;
	}
	ret = matrix_begin();
	if (ret < 0)
	{
		printf("\nError initializing LED matrix. Error code = %d\n", ret);
		while (1)
			;
	}
	int rows = 0b00100;
	int cols = 0b00100;
	int accel_x;
	int accel_y;
	int sens = 70;
	float upperLim = 600, lowerLim = 100;
	double b = log10(upperLim / lowerLim) / (upperLim - lowerLim);
	double a = upperLim / pow(10, b * upperLim);
	while (1)
	{
		accel_x = lsm303_ll_readAccelX();
		accel_y = lsm303_ll_readAccelY();
		if (accel_y > sens)
		{
			rows = rows >> 1;
			if (rows < 1)
			{
				rows = 1;
			}
		}
		else if (accel_y < -sens)
		{
			rows = rows << 1;
			if (rows > 16)
			{
				rows = 16;
			}
		}
		if (accel_x > sens)
		{
			cols = cols << 1;
			if (cols > 16)
			{
				cols = 16;
			}
		}
		else if (accel_x < -sens)
		{
			cols = cols >> 1;
			if (cols < 1)
			{
				cols = 1;
			}
		}
		matrix_put_pattern(rows, ~cols);
		int delay = abs(accel_x) > abs(accel_y) ? abs(accel_x) : abs(accel_y);
		if (delay < 100)
		{
			delay = 100;
		}
		else if (delay > 500)
		{
			delay = 500;
		}
		int sleepTime = a * exp(b * (600 - delay));
		k_msleep(sleepTime);
	}
}
