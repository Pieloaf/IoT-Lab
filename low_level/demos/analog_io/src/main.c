/*
 * SPDX-License-Identifier: Apache-2.0
*/

#include <zephyr.h>
#include <sys/printk.h>
#include <device.h>	
#include <stdio.h>
#include "adc.h"
#include "pwm.h"
#include "matrix.h"

void main(void)
{
	int ret;
	uint8_t rows = 0b00000;
	uint8_t cols = 0b10000;
	ret = adc_begin();	
	if (ret < 0)
	{
		printf("\nError initializing adc.  Error code = %d\n",ret);	
		while(1);
	}
	ret = pwm_begin();	
	if (ret < 0)
	{
		printf("\nError initializing PWM.  Error code = %d\n",ret);	
		while(1);
	}
	ret = matrix_begin();
	if (ret < 0)
	{
		printf("\nError initializing LED matrix.  Error code = %d\n",ret);	
		while(1);
	}
	while(1)
	{       
		uint32_t adcvalue = adc_readDigital();
		printf("ADC Digital = %u\n",adcvalue);
		/* The default version of printf does not support floating point numbers so scale up to an integer */
		int adcVal = adc_readVoltage()*1000;
		printf("ADC Voltage (mV) = %d\n",(int)(adcVal));
		pwm_write((adcvalue * PWM_PERIOD_US)/4095);
		if (adcVal <= 600){
			rows = 0b10000;
			matrix_put_pattern(rows, ~cols);
		}
		else if (adcVal <= 1200){
			rows = 0b11000;
			matrix_put_pattern(rows, ~cols);
		}
		else if (adcVal <= 1800)
		{
			rows = 0b11100;
			matrix_put_pattern(rows, ~cols);
		}
		else if (adcVal <= 2400)
		{
			rows = 0b11110;
			matrix_put_pattern(rows, ~cols);
		}
		else if (adcVal == 3000)
		{
			rows = 0b11111;
			matrix_put_pattern(rows, ~cols);
		}
		
		k_msleep(100);
	}
}
