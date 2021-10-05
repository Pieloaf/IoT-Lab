#include <sys/printk.h>
#include <device.h>
#include <drivers/gpio.h>
#include <drivers/spi.h>
#include <drivers/i2c.h>
#include <stdio.h>
#include <stdint.h>
#include "lsm303_ll.h"

int lsm303_ll_readRegister(uint8_t RegNum, uint8_t *Value, uint8_t deviceReg);
int lsm303_ll_writeRegister(uint8_t RegNum, uint8_t Value, uint8_t deviceReg);
void readCalibrationData();
//static const struct spi_config * cfg;
static const struct device *i2c;
int lsm303_ll_begin()
{
	int nack;
	uint8_t device_id;
	// Set up the I2C interface
	i2c = device_get_binding("I2C_1");
	if (i2c==NULL)
	{
		printf("Error acquiring i2c1 interface\n");
		return -1;
	}	
	// Check to make sure the device is present by reading the WHO_AM_I register
	nack = lsm303_ll_readRegister(0x0f,&device_id,LSM303_ACCEL_ADDRESS);
	nack = lsm303_ll_readRegister(0x0f,&device_id,LSM303_MAG_ADDRESS);
	if (nack != 0)
	{
		printf("Error finding LSM303 on the I2C bus\n");
		return -2;
	}
	else	
	{
		printf("Found LSM303.  WHO_AM_I = %x\n",device_id);
	}
	lsm303_ll_writeRegister(0x20,0x77,LSM303_ACCEL_ADDRESS); //wake up LSM303 (max speed, all accel channels)
	lsm303_ll_writeRegister(0x23,0x08,LSM303_ACCEL_ADDRESS); //enable  high resolution mode +/- 2g
	lsm303_ll_writeRegister(0x60,0x80,LSM303_MAG_ADDRESS);
	lsm303_ll_writeRegister(0x62,0x10,LSM303_MAG_ADDRESS);
	return 0;
}

int lsm303_ll_readAccelY() // returns Temperature * 100
{
	int16_t accel;
	uint8_t buf[2];
	buf[0] = 0x80+0x2a;	
	i2c_burst_read(i2c,LSM303_ACCEL_ADDRESS,0xaa, buf,2);
	accel = buf[1];
	accel = accel << 8;
	accel = accel + buf[0];
	accel = accel / 16; // must shift right 4 bits as this is a left justified 12 bit result
	// now scale to m^3/s * 100.
	// +2047 = +2g
	int accel_32bit = accel; // go to be wary of numeric overflow
	accel_32bit = accel_32bit * 2*981 / 2047;
    return accel_32bit;    
}
int lsm303_ll_readAccelZ() // returns Temperature * 100
{
	int16_t accel;
	uint8_t buf[2];
	buf[0] = 0x80+0x2a;	
	i2c_burst_read(i2c,LSM303_ACCEL_ADDRESS,0xac, buf,2);
	accel = buf[1];
	accel = accel << 8;
	accel = accel + buf[0];
	accel = accel / 16; // must shift right 4 bits as this is a left justified 12 bit result
	// now scale to m^3/s * 100.
	// +2047 = +2g
	int accel_32bit = accel; // go to be wary of numeric overflow
	accel_32bit = accel_32bit * 2*981 / 2047;
    return accel_32bit;    
}
int lsm303_ll_readAccelX() // returns Temperature * 100
{
	int16_t accel;
	uint8_t buf[2];
	buf[0] = 0x80+0x2a;	
	i2c_burst_read(i2c,LSM303_ACCEL_ADDRESS,0xa8, buf,2);
	accel = buf[1];
	accel = accel << 8;
	accel = accel + buf[0];
	accel = accel / 16; // must shift right 4 bits as this is a left justified 12 bit result
	// now scale to m^3/s * 100.
	// +2047 = +2g
	int accel_32bit = accel; // go to be wary of numeric overflow
	accel_32bit = accel_32bit * 2*981 / 2047;
    return accel_32bit;    
}
int lsm303_ll_readMagY() // returns Temperature * 100
{
	int16_t accel;
	uint8_t buf[2];
	buf[0] = 0x80+0x2a;	
	i2c_burst_read(i2c,LSM303_MAG_ADDRESS,0xea, buf,2);
	accel = buf[1];
	accel = accel << 8;
	accel = accel + buf[0];
	accel = accel / 16; // must shift right 4 bits as this is a left justified 12 bit result
	// now scale to m^3/s * 100.
	// +2047 = +2g
	int accel_32bit = accel; // go to be wary of numeric overflow
	accel_32bit = accel_32bit * 2*50 / 2047;
    return accel_32bit;    
}
int lsm303_ll_readMagZ() // returns Temperature * 100
{
	int16_t accel;
	uint8_t buf[2];
	buf[0] = 0x80+0x2a;	
	i2c_burst_read(i2c,LSM303_MAG_ADDRESS,0xec, buf,2);
	accel = buf[1];
	accel = accel << 8;
	accel = accel + buf[0];
	accel = accel / 16; // must shift right 4 bits as this is a left justified 12 bit result
	// now scale to m^3/s * 100.
	// +2047 = +2g
	int accel_32bit = accel; // go to be wary of numeric overflow
	accel_32bit = accel_32bit * 2*981 / 2047;
    return accel_32bit;    
}
int lsm303_ll_readMagX() // returns Temperature * 100
{
	int16_t accel;
	uint8_t buf[2];
	buf[0] = 0x80+0x2a;	
	i2c_burst_read(i2c,LSM303_MAG_ADDRESS,0xe8, buf,2);
	accel = buf[1];
	accel = accel << 8;
	accel = accel + buf[0];
	accel = accel / 16; // must shift right 4 bits as this is a left justified 12 bit result
	// now scale to m^3/s * 100.
	// +2047 = +2g
	int accel_32bit = accel; // go to be wary of numeric overflow
	accel_32bit = accel_32bit * 2*981 / 2047;
    return accel_32bit;    
}

int lsm303_ll_readRegister(uint8_t RegNum, uint8_t *Value, uint8_t deviceReg  )
{
	    //reads a byte from a specific register
    int nack;   
	nack=i2c_reg_read_byte(i2c,deviceReg,RegNum,Value);
	return nack;
}
int lsm303_ll_writeRegister(uint8_t RegNum, uint8_t Value, uint8_t deviceReg)
{
	//writes a byte to a specific register
    uint8_t Buffer[2];    
    Buffer[0]= Value;    
    int nack;    
	nack=i2c_reg_write_byte(i2c,deviceReg,RegNum,Value);
    return nack;
}

