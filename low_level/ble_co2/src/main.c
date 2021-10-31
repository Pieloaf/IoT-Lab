/* main.c - Application main entry point */

/* Based on an example from Zephyr toolkit, modified by frank duignan, modified again by pierce lowe
 * Copyright (c) 2015-2016 Intel Corporation
 *
 * SPDX-License-Identifier: Apache-2.0
 */
/* This example advertises three services:
 * 0x1800 Generic ACCESS (GAP)
 * 0x1801 Generic Attribute (GATT)
 * And a custom service 1-2-3-4-0 
 * This custom service contains a custom characteristic called char_value
 */
#include <zephyr/types.h>
#include <stddef.h>
#include <string.h>
#include <errno.h>
#include <sys/printk.h>
#include <sys/byteorder.h>
#include <kernel.h>
#include <zephyr.h>

#include <settings/settings.h>

#include <bluetooth/bluetooth.h>
#include <bluetooth/hci.h>
#include <bluetooth/conn.h>
#include <bluetooth/uuid.h>
#include <bluetooth/gatt.h>
#include <device.h>
#include <drivers/sensor.h>
#include <stdio.h>
#include <string.h>

#include "sensirion_i2c.h"
#include "buttons.h"
#include "scd30.h"
#include "matrix.h"


// ********************[ Start of First characteristic ]**************************************
#define BT_UUID_CO2_VAL    BT_UUID_128_ENCODE(1, 2, 3, 4, (uint64_t)1)
static struct bt_uuid_128 co2_id=BT_UUID_INIT_128(BT_UUID_CO2_VAL); // the 128 bit UUID for this gatt value
uint32_t co2_value; // the gatt characateristic value that is being shared over BLE	
static ssize_t read_co2(struct bt_conn *conn, const struct bt_gatt_attr *attr, void *buf, uint16_t len, uint16_t offset);
static ssize_t write_co2(struct bt_conn *conn, const struct bt_gatt_attr *attr, const void *buf, uint16_t len, uint16_t offset, uint8_t flags);
int co2_threshold = 700;
// Callback that is activated when the characteristic is read by central
static ssize_t read_co2(struct bt_conn *conn, const struct bt_gatt_attr *attr, void *buf, uint16_t len, uint16_t offset)
{
	printf("Got a read %p\n",attr);
	// Could use 'const char *value =  attr->user_data' also here if there is the char value is being maintained with the BLE STACK
	const char *value = (const char *)&co2_value; // point at the value in memory
	return bt_gatt_attr_read(conn, attr, buf, len, offset, value, sizeof(co2_value)); // pass the value back up through the BLE stack
}

//write function for co2 characteristic
static ssize_t write_co2(struct bt_conn *conn, const struct bt_gatt_attr *attr,
			 const void *buf, uint16_t len, uint16_t offset,
			 uint8_t flags)
{
	//set value = attribute data
	uint8_t *value = attr->user_data;
	//convert ascii number data to int
	int co2_write = atoi((char *)buf);
	printf("Got a write %d\n",co2_write);

	//if conversion to int returns non 0 and is not the same as current val
	if (co2_write && co2_threshold != co2_write) {
		//set new threshold
		co2_threshold = co2_write;
		//if new threshold is less than current value, turn off leds 
		if(co2_write > co2_value) matrix_all_off();
	}
	
	memcpy(value, buf, len); // copy the incoming value in the memory occupied by our characateristic variable
	return len;
}

// Arguments to BT_GATT_CHARACTERISTIC = _uuid, _props, _perm, _read, _write, _value
#define BT_GATT_CHAR1 BT_GATT_CHARACTERISTIC(&co2_id.uuid, BT_GATT_CHRC_READ | BT_GATT_CHRC_NOTIFY | BT_GATT_CHRC_WRITE , BT_GATT_PERM_READ | BT_GATT_PERM_WRITE, read_co2, write_co2, &co2_value)
// ********************[ End of First characteristic ]****************************************

// ********************[ Start of Second characteristic ]**************************************
//#define BT_UUID_TEMP_VAL    BT_UUID_128_ENCODE(1, 2, 3, 4, (uint64_t)2)
#define BT_UUID_TEMP_VAL    BT_UUID_128_ENCODE(1, 2, 3, 4, (uint64_t)0x272F)
static struct bt_uuid_16 temp_id=BT_UUID_INIT_16(BT_UUID_TEMPERATURE_VAL); // the 128 bit UUID for this gatt value
uint32_t temp_value; // the gatt characateristic value that is being shared over BLE	
static ssize_t read_temp(struct bt_conn *conn, const struct bt_gatt_attr *attr, void *buf, uint16_t len, uint16_t offset);

// Callback that is activated when the characteristic is read by central
static ssize_t read_temp(struct bt_conn *conn, const struct bt_gatt_attr *attr, void *buf, uint16_t len, uint16_t offset)
{
	printf("Got a read %p\n",attr);
	// Could use 'const char *value =  attr->user_data' also here if there is the char value is being maintained with the BLE STACK
	const char *value = (const char *)&temp_value; // point at the value in memory
	return bt_gatt_attr_read(conn, attr, buf, len, offset, value, sizeof(temp_value)); // pass the value back up through the BLE stack
}

// Arguments to BT_GATT_CHARACTERISTIC = _uuid, _props, _perm, _read, _write, _value
#define BT_GATT_CHAR2 BT_GATT_CHARACTERISTIC(&temp_id.uuid, BT_GATT_CHRC_READ , BT_GATT_PERM_READ , read_temp, NULL, &temp_value)
// ********************[ End of Second characteristic ]****************************************

// ********************[ Start of Third characteristic ]**************************************
#define BT_UUID_HUM_VAL    BT_UUID_128_ENCODE(1, 2, 3, 4, (uint64_t)3)
static struct bt_uuid_16 hum_id=BT_UUID_INIT_16(BT_UUID_HUMIDITY_VAL); // the 128 bit UUID for this gatt value
uint32_t hum_value; // the gatt characateristic value that is being shared over BLE	
static ssize_t read_hum(struct bt_conn *conn, const struct bt_gatt_attr *attr, void *buf, uint16_t len, uint16_t offset);

// Callback that is activated when the characteristic is read by central
static ssize_t read_hum(struct bt_conn *conn, const struct bt_gatt_attr *attr, void *buf, uint16_t len, uint16_t offset)
{
	printf("Got a read %p\n",attr);
	// Could use 'const char *value =  attr->user_data' also here if there is the char value is being maintained with the BLE STACK
	const char *value = (const char *)&hum_value; // point at the value in memory
	return bt_gatt_attr_read(conn, attr, buf, len, offset, value, sizeof(hum_value)); // pass the value back up through the BLE stack
}

// Arguments to BT_GATT_CHARACTERISTIC = _uuid, _props, _perm, _read, _write, _value
#define BT_GATT_CHAR3 BT_GATT_CHARACTERISTIC(&hum_id.uuid, BT_GATT_CHRC_READ , BT_GATT_PERM_READ , read_hum, NULL, &hum_value)
// ********************[ End of Third characteristic ]****************************************



// ********************[ Service definition ]********************
#define BT_UUID_CUSTOM_SERVICE_VAL BT_UUID_128_ENCODE(1, 2, 3, 4, (uint64_t)0)
static struct bt_uuid_16 my_service_uuid = BT_UUID_INIT_16( BT_UUID_ESS_VAL);
struct bt_conn *active_conn=NULL; // use this to maintain a reference to the connection with the central device (if any)

BT_GATT_SERVICE_DEFINE(my_service_svc,
	BT_GATT_PRIMARY_SERVICE(&my_service_uuid),
		BT_GATT_CHAR1,
		BT_GATT_CHAR2,
		BT_GATT_CHAR3
		
);
// ********************[ Advertising configuration ]********************
/* The bt_data structure type:
 * {
 * 	uint8_t type : The kind of data encoded in the following structure
 * 	uint8_t data_len : the length of the data encoded
 * 	const uint8_t *data : a pointer to the data
 * }
 * This is used for encoding advertising data
*/
/* The BT_DATA_BYTES macro
 * #define BT_DATA_BYTES(_type, _bytes...) BT_DATA(_type, ((uint8_t []) { _bytes }), sizeof((uint8_t []) { _bytes }))
 * #define BT_DATA(_type, _data, _data_len) \
 *       { \
 *               .type = (_type), \
 *               .data_len = (_data_len), \
 *               .data = (const uint8_t *)(_data), \
 *       }
 * BT_DATA_UUID16_ALL : value indicates that all UUID's are listed in the advertising packet
*/
// bt_data is an array of data structures used in advertising. Each data structure is formatted as described above
static const struct bt_data ad[] = {
	BT_DATA_BYTES(BT_DATA_FLAGS, (BT_LE_AD_GENERAL | BT_LE_AD_NO_BREDR)), /* specify BLE advertising flags = discoverable, BR/EDR not supported (BLE only) */
	BT_DATA_BYTES(BT_DATA_UUID16_ALL, BT_UUID_ESS_VAL         /* A 16 Service UUID for the a predefined ble service */),
};


// Callback that is activated when a connection with a central device is established
static void connected(struct bt_conn *conn, uint8_t err)
{
	if (err) {
		printf("Connection failed (err 0x%02x)\n", err);
	} else {
		printf("Connected\n");
		active_conn = conn;
	}
}
// Callback that is activated when a connection with a central device is taken down
static void disconnected(struct bt_conn *conn, uint8_t reason)
{
	printk("Disconnected (reason 0x%02x)\n", reason);
	active_conn = NULL;
}
// structure used to pass connection callback handlers to the BLE stack
static struct bt_conn_cb conn_callbacks = {
	.connected = connected,
	.disconnected = disconnected,
};
// This is called when the BLE stack has finished initializing
static void bt_ready(void)
{
	int err;
	printf("Bluetooth initialized\n");

// start advertising see https://developer.nordicsemi.com/nRF_Connect_SDK/doc/latest/zephyr/reference/bluetooth/gap.html
/*
 * Excerpt from zephyr/include/bluetooth/bluetooth.h
 * 
 * #define BT_LE_ADV_CONN_NAME BT_LE_ADV_PARAM(BT_LE_ADV_OPT_CONNECTABLE | \
                                            BT_LE_ADV_OPT_USE_NAME, \
                                            BT_GAP_ADV_FAST_INT_MIN_2, \
                                            BT_GAP_ADV_FAST_INT_MAX_2, NULL)

 Also see : zephyr/include/bluetooth/gap.h for BT_GAP_ADV.... These set the advertising interval to between 100 and 150ms
 
 */
// Start BLE advertising using the ad array defined above
	err = bt_le_adv_start(BT_LE_ADV_CONN_NAME, ad, ARRAY_SIZE(ad), NULL, 0);
	if (err) {
		printf("Advertising failed to start (err %d)\n", err);
		return;
	}
	printf("Advertising successfully started\n");
}

//renderer thread consts
#define STACK_SIZE 500
#define BTN_B 23
#define BTN_A 14

//renderer thread variables 
bool display_on = 0;
int cols[3] = {0b01000, 0b00100, 0b00010};
int rows[3];
//renderer thread main function decleration
void renderer_function(void *, void *, void *);

//renderer thread definition
K_THREAD_DEFINE(renderer_thread, STACK_SIZE, renderer_function, NULL, NULL, NULL, 15, 0, 0);

//display timeout callback
void display_timeout(struct k_timer *timer_id){
	display_on = 0;
	return;
}

//defining display timer
K_TIMER_DEFINE(display_timer, display_timeout, NULL);

void set_digit(){
	//set led display digit
	switch (co2_threshold)
	{
		case 700:
			rows[0] = 0b11111;
			rows[1] = 0b00001;
			rows[2] = 0b00001;
			break;
		case 800:
			rows[0] = 0b11111;
			rows[1] = 0b10101;
			rows[2] = 0b11111;
			break;
		case 600:
			rows[0] = 0b11101;
			rows[1] = 0b10101;
			rows[2] = 0b11111;
			break;
		case 900:
			rows[0] = 0b11111;
			rows[1] = 0b10101;
			rows[2] = 0b10111;
			break;
		case 500:
			rows[0] = 0b11101;
			rows[1] = 0b10101;
			rows[2] = 0b10111;	
			break;
		default:
			break;
	}	
	//set display flag to 1 -> prevents all leds from lighting on co2 passing threshold
	display_on = 1;
	//wake up thread from sleep
	k_wakeup(renderer_thread);
	//start display timer, run for 5 secs, start immediately 
	k_timer_start(&display_timer, K_SECONDS(5), K_NO_WAIT);
}

//b button call back
void button_b_pressed()
{
	//if co2 threshold not muliple of 100, round down to nearest 100
	if (co2_threshold%100) co2_threshold = (co2_threshold/100)*100;
	//if co2 threshold over 900 set back to max of 900
	if (co2_threshold > 900) co2_threshold = 900;
	//if co2 threshold < 900, inc by 100
	if (display_on && co2_threshold < 900){
		co2_threshold+=100;
	}
	printf("CO2 threshold: %d\n", co2_threshold);
	set_digit();
	return;
}

//a button callback
void button_a_pressed()
{
	//if co2 threshold not muliple of 100, round down to nearest 100
	if (co2_threshold%100) co2_threshold = (co2_threshold/100)*100;
	//if co2 threshold under 500 set back to min of 500
	if (co2_threshold < 500) co2_threshold = 500;
	//if co2 threshold > 500, dec by 100
	if (display_on && co2_threshold > 500){
		co2_threshold-=100;
	}
	printf("CO2 threshold: %d\n", co2_threshold);
	set_digit();
	return;
}

//renderer function implementation
void renderer_function(void *p1, void *p2, void *p3){
	//init buttons and matrix
	int err=0;
	err = buttons_begin();	
	if (err < 0)
	{
		printf("\nError initializing buttons. Error code = %d\n",err);	
		while(1);
	}
	err = matrix_begin();
	if (err) {
		printf("Error reading initialising matrix: %i\n", err);
		return;
	}
	//attach button a and b callbacks
	attach_callback_to_button(button_a_pressed, BTN_A);	
	attach_callback_to_button(button_b_pressed, BTN_B);

	//run forever
	while(1)
	{
		//turn of leds and sleep forever
		matrix_all_off();
		k_sleep(K_FOREVER);

		//after waking while display on = 1 
		while(display_on){
			//display digits
			for (int i = 0; i < 3; i++){
				matrix_put_pattern(rows[i], ~cols[i]);
				k_msleep(5);
			}
		}
	}
	return;
}

void main(void)
{
	//defining main func vars
	int err=0;	
    uint16_t interval_in_seconds = 2;
    float co2_ppm, temperature, relative_humidity, prev_co2;
    co2_ppm = 0.0;
    temperature = 0.0; 
    relative_humidity = 0.0;
	sensirion_i2c_select_bus(1);
    sensirion_i2c_init();
    /* Busy loop for initialization, because the main loop does not work without
     * a sensor.
     */
    while (scd30_probe() != NO_ERROR) {
        printf("SCD30 sensor probing failed\n");
        sensirion_sleep_usec(1000000u);
    }
    printf("SCD30 sensor probing successful\n");
	//init sdc30 
    scd30_set_measurement_interval(interval_in_seconds);
    sensirion_sleep_usec(20000u);
    scd30_start_periodic_measurement(0);

	//init bluetooth
	err = bt_enable(NULL);
	if (err) {
		printk("Bluetooth init failed (err %d)\n", err);
		return;
	}
	bt_ready(); // This function starts advertising
	bt_conn_cb_register(&conn_callbacks); //sets connection call backs
	printf("Zephyr Microbit CO2 sensor %s\n", CONFIG_BOARD);		
		
	while (1) {
		
		k_sleep(K_SECONDS(1)); //sleep main thread for 1 sec
        uint16_t data_ready = 0; //init data ready to 0 - FALSE
		err = scd30_get_data_ready(&data_ready);
        if (err) {
			printf("Error reading data_ready flag: %i\n", err);
        }

        if (data_ready)
        {
            prev_co2 = co2_ppm; // store previous co2 value before updating
            err = scd30_read_measurement(&co2_ppm, &temperature, &relative_humidity); //read data
            if (err) {
                printf("error reading measurement\n");

            } else {
				//if no error display data on serial monitor
                printf("CO2(ppm)| temp(degC)\t| humidity(%%RH)\n"
                   "%0.2f\t| %0.2f\t\t| %0.2f\n\n",
                   co2_ppm, temperature, relative_humidity);
            }
			//update glob co2, temp and humidity values 
            co2_value = co2_ppm;
            temp_value = temperature;
            hum_value = relative_humidity;
			//print prev co2 val, current co2 val, threshold
			printf("Measured CO2 (ppm)\nprev\t| current\t| threshold\n"
				"%0.2f\t| %0.2f\t| %d\n"
				"===================================\n", 
				prev_co2, co2_ppm, co2_threshold);
			// if the co2 level reaches the threshold
			if (co2_value >= co2_threshold){
				if (active_conn) bt_gatt_notify(active_conn,&my_service_svc.attrs[2], &co2_value, sizeof(co2_value));
				if (!display_on) matrix_put_pattern(0b11111, 0b00000);
			} 
			// if co2 level returns to normal for after exceeding notify
			else if (co2_ppm < co2_threshold && prev_co2 >= co2_threshold && !display_on){
				// on dropping below threshold disable matrix
				matrix_all_off();
			}
			
        }
	}
}
