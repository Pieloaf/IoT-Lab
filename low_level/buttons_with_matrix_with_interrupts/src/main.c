/*
 * SPDX-License-Identifier: Apache-2.0
*/

#include <zephyr.h>
#include <sys/printk.h>
#include <device.h>
#include <drivers/gpio.h>
#include <stdio.h>
#include "matrix.h"
#include "buttons.h"

#define BTN_A 14
#define BTN_B 23

volatile uint8_t rows = 1;
volatile uint8_t cols = 1;
void button_a_pressed(void)
{
	cols = cols >> 1;
	if (cols < 1)
	{
		cols = 1;
	}
}
void button_b_pressed(void)
{
	cols = cols << 1;
	if (cols > 16)
	{
		cols = 16;
	}
}
void main(void)
{
	int ret;
	ret = matrix_begin();
	if (ret < 0)
	{
		printf("\nError initializing LED matrix.  Error code = %d\n",ret);	
		while(1);
	}
	ret = buttons_begin();	
	if (ret < 0)
	{
		printf("\nError initializing buttons.  Error code = %d\n",ret);	
		while(1);
	}
	attach_callback_to_button(button_b_pressed, BTN_B);	
	attach_callback_to_button(button_a_pressed, BTN_A);

	while(1)
	{       
		matrix_put_pattern(rows, ~cols);
		k_msleep(100);
		
	}
}
