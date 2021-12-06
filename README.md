# DT021A/4 IoT Module

### The IoT module is broken down into 3 sections:

- Low Level Interfacing (BBC Micro:Bit using ZephyrOS) [3 weeks] ✅
- BTLE & MQTT Node JS [3 weeks] ✅
- **Server Side JS & Databases [2 weeks]**

---

### Low Level Interfacing:

The low level interfacing section runs for the first 3 weeks and is focused on low level interfacing using the RTOS [Zephyr OS](https://www.zephyrproject.org/) with a [BBC Micro:Bit V2](https://tech.microbit.org/hardware/) which has a [Nordic nRF52833](https://infocenter.nordicsemi.com/pdf/nRF52833_PS_v1.4.pdf) at its core and a range of sensors and peripherals on board to interface with.

In the final week of the Low Level Interfacing section of the module a [Sensiron SDC30](https://www.sensirion.com/en/environmental-sensors/carbon-dioxide-sensors/carbon-dioxide-sensors-scd30/) C02, temperature and humidity sensor was added. Which was interfaced using I2C from the BBC Micro:Bit V2 and debugged using a small USB logic analyser.

---

### BLE & MQTT Node JS:

This section of the module focused on handling the Bluetooth interfacing with the BBC Micro:Bit V2 using [Node JS](https://nodejs.org/en/) and the [node-ble](https://github.com/chrvadala/node-ble) and [mqtt](https://github.com/mqttjs/MQTT.js) modules.

### Note: This is a work on progress and will be updated as the weeks go on
