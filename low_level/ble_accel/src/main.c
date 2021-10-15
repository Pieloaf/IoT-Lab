/* main.c - Application main entry point */

/* Based on an example from Zephyr toolkit, modified by frank duignan
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
#include <math.h>
#include "lsm303_ll.h"


// ********************[ Start of First characteristic ]**************************************
#define BT_UUID_CUSTOM_CHAR_VAL    BT_UUID_128_ENCODE(1, 2, 3, 4, (uint64_t)5)
static struct bt_uuid_128 char_id=BT_UUID_INIT_128(BT_UUID_CUSTOM_CHAR_VAL); // the 128 bit UUID for this gatt value
uint32_t char_value; // the gatt characateristic value that is being shared over BLE	
static ssize_t read_char(struct bt_conn *conn, const struct bt_gatt_attr *attr, void *buf, uint16_t len, uint16_t offset);
static ssize_t write_char(struct bt_conn *conn, const struct bt_gatt_attr *attr, const void *buf, uint16_t len, uint16_t offset, uint8_t flags);
// Callback that is activated when the characteristic is read by central
static ssize_t read_char(struct bt_conn *conn, const struct bt_gatt_attr *attr, void *buf, uint16_t len, uint16_t offset)
{
	printf("Got a read %p\n",attr);
	// Could use 'const char *value =  attr->user_data' also here if there is the char value is being maintained with the BLE STACK
	const char *value = (const char *)&char_value; // point at the value in memory
	return bt_gatt_attr_read(conn, attr, buf, len, offset, value, sizeof(char_value)); // pass the value back up through the BLE stack
}
// Callback that is activated when the characteristic is written by central
static ssize_t write_char(struct bt_conn *conn, const struct bt_gatt_attr *attr,
			 const void *buf, uint16_t len, uint16_t offset,
			 uint8_t flags)
{
	uint8_t *value = attr->user_data;
	char test[len+1];
	memcpy(test, buf, len);
	test[len]=0; //null terminating the buffer string
	printf("Got a write %s\n",test);

	memcpy(value, buf, len); // copy the incoming value in the memory occupied by our characateristic variable
	return len;
}
// Arguments to BT_GATT_CHARACTERISTIC = _uuid, _props, _perm, _read, _write, _value
#define BT_GATT_CHAR1 BT_GATT_CHARACTERISTIC(&char_id.uuid, BT_GATT_CHRC_READ | BT_GATT_CHRC_WRITE |  BT_GATT_CHRC_NOTIFY, BT_GATT_PERM_READ | BT_GATT_PERM_WRITE, read_char, write_char, &char_value)
// ********************[ End of First characteristic ]****************************************


// ********************[ Start of Second characteristic ]**************************************
#define BT_UUID_Y_ACCEL_ID  	   BT_UUID_128_ENCODE(1, 2, 3, 4, (uint64_t)1)
static struct bt_uuid_128 y_accel_id=BT_UUID_INIT_128(BT_UUID_Y_ACCEL_ID); // the 128 bit UUID for this gatt value
uint32_t y_accel;
static ssize_t read_y_accel(struct bt_conn *conn, const struct bt_gatt_attr *attr, void *buf, uint16_t len, uint16_t offset);
static ssize_t read_y_accel(struct bt_conn *conn, const struct bt_gatt_attr *attr, void *buf, uint16_t len, uint16_t offset)
{
	printf("Got a y_accel read %d\n",y_accel);
	const char *value = (const char *)&y_accel;
	return bt_gatt_attr_read(conn, attr, buf, len, offset, value, sizeof(y_accel)); // pass the value back up through the BLE stack
	return 0;
}
// Arguments to BT_GATT_CHARACTERISTIC = _uuid, _props, _perm, _read, _write, _value
#define BT_GATT_CHAR2 BT_GATT_CHARACTERISTIC(&y_accel_id.uuid, BT_GATT_CHRC_READ, BT_GATT_PERM_READ, read_y_accel, NULL, &y_accel)
// ********************[ End of Second characteristic ]**************************************

// ********************[ Start of Second characteristic ]**************************************
#define BT_UUID_X_ACCEL_ID  	   BT_UUID_128_ENCODE(1, 2, 3, 4, (uint64_t)2)
static struct bt_uuid_128 x_accel_id=BT_UUID_INIT_128(BT_UUID_X_ACCEL_ID); // the 128 bit UUID for this gatt value
uint32_t x_accel;
static ssize_t read_x_accel(struct bt_conn *conn, const struct bt_gatt_attr *attr, void *buf, uint16_t len, uint16_t offset);
static ssize_t read_x_accel(struct bt_conn *conn, const struct bt_gatt_attr *attr, void *buf, uint16_t len, uint16_t offset)
{
	printf("Got a x_accel read %d\n",x_accel);
	const char *value = (const char *)&x_accel;
	return bt_gatt_attr_read(conn, attr, buf, len, offset, value, sizeof(x_accel)); // pass the value back up through the BLE stack
	return 0;
}
// Arguments to BT_GATT_CHARACTERISTIC = _uuid, _props, _perm, _read, _write, _value
#define BT_GATT_CHAR3 BT_GATT_CHARACTERISTIC(&x_accel_id.uuid, BT_GATT_CHRC_READ, BT_GATT_PERM_READ, read_x_accel, NULL, &x_accel)
// ********************[ End of Second characteristic ]**************************************

// ********************[ Start of Second characteristic ]**************************************
#define BT_UUID_Z_ACCEL_ID  	   BT_UUID_128_ENCODE(1, 2, 3, 4, (uint64_t)3)
static struct bt_uuid_128 z_accel_id=BT_UUID_INIT_128(BT_UUID_Z_ACCEL_ID); // the 128 bit UUID for this gatt value
uint32_t z_accel;
static ssize_t read_z_accel(struct bt_conn *conn, const struct bt_gatt_attr *attr, void *buf, uint16_t len, uint16_t offset);
static ssize_t read_z_accel(struct bt_conn *conn, const struct bt_gatt_attr *attr, void *buf, uint16_t len, uint16_t offset)
{
	printf("Got a z_accel read %d\n",z_accel);
	const char *value = (const char *)&z_accel;
	return bt_gatt_attr_read(conn, attr, buf, len, offset, value, sizeof(z_accel)); // pass the value back up through the BLE stack
	return 0;
}
// Arguments to BT_GATT_CHARACTERISTIC = _uuid, _props, _perm, _read, _write, _value
#define BT_GATT_CHAR4 BT_GATT_CHARACTERISTIC(&z_accel_id.uuid, BT_GATT_CHRC_READ, BT_GATT_PERM_READ, read_z_accel, NULL, &z_accel)
// ********************[ End of Second characteristic ]**************************************


// ********************[ Service definition ]********************
#define BT_UUID_CUSTOM_SERVICE_VAL BT_UUID_128_ENCODE(1, 2, 3, 4, (uint64_t)0)
static struct bt_uuid_128 my_service_uuid = BT_UUID_INIT_128( BT_UUID_CUSTOM_SERVICE_VAL);
struct bt_conn *active_conn=NULL; // use this to maintain a reference to the connection with the central device (if any)

BT_GATT_SERVICE_DEFINE(my_service_svc,
	BT_GATT_PRIMARY_SERVICE(&my_service_uuid),
		BT_GATT_CHAR1,
		BT_GATT_CHAR2,
		BT_GATT_CHAR3,
		BT_GATT_CHAR4		
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
	BT_DATA_BYTES(BT_DATA_UUID128_ALL, BT_UUID_CUSTOM_SERVICE_VAL         /* A 128 Service UUID for the our custom service */),
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

void main(void)
{
	int err;
	float x,y;
	x = sine(1.2f);
	err = lsm303_ll_begin();
	if (err < 0)
	{
		 printf("\nError initializing lsm303.  Error code = %d\n",err);  
         while(1);

	}
	err = bt_enable(NULL);
	if (err) {
		printk("Bluetooth init failed (err %d)\n", err);
		return;
	}
	bt_ready(); // This function starts advertising
	bt_conn_cb_register(&conn_callbacks);
	printf("Zephyr Microbit V2 minimal BLE example! %s\n", CONFIG_BOARD);			
	while (1) {
		k_sleep(K_SECONDS(1));
		char_value++;
		y_accel = lsm303_ll_readAccelY();
		x_accel = lsm303_ll_readAccelY();
		z_accel = lsm303_ll_readAccelY();
		// Send a notifiy signal to a central device (if there is one)
		// int bt_gatt_notify(struct bt_conn *conn, const struct bt_gatt_attr *attr, const void *data, u16_t len)
		// conn: Connection object. (NULL for all)
		// attr: Characteristic Value Descriptor attribute.
		// data: Pointer to Attribute data.
		// len: Attribute value length.				
		if (active_conn)
		{
			bt_gatt_notify(active_conn,&my_service_svc.attrs[2], &char_value,sizeof(char_value));			
		}	
	}
}
