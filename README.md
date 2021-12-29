# DT021A/4 IoT Module

### The IoT module is broken down into 3 sections:

- Low Level Interfacing (BBC Micro:Bit & ZephyrOS) [3 weeks] ✅
- BTLE & MQTT Node JS [3 weeks] ✅
- Databases (MariaDB & InfluxDB)[2 weeks] ✅

---

### Low Level Interfacing:

The low level interfacing section runs for the first 3 weeks and is focused on low level interfacing using the RTOS [Zephyr OS](https://www.zephyrproject.org/) with a [BBC Micro:Bit V2](https://tech.microbit.org/hardware/) which has a [Nordic nRF52833](https://infocenter.nordicsemi.com/pdf/nRF52833_PS_v1.4.pdf) at its core and a range of sensors and peripherals on board to interface with.

In the final week of the Low Level Interfacing section of the module a [Sensirion SDC30](https://www.sensirion.com/en/environmental-sensors/carbon-dioxide-sensors/carbon-dioxide-sensors-scd30/) CO2, temperature and humidity sensor was added. Which was interfaced using I2C from the BBC Micro:Bit V2 and debugged using a small USB logic analyser.

---

### BLE & MQTT Node JS:

This section of the module focused on interfacing with the BBC Micro:Bit V2 over Bluetooth and sending the data to an MQTT broker using [Node JS](https://nodejs.org/en/) and the [node-ble](https://github.com/chrvadala/node-ble#readme) and [mqtt](https://github.com/mqttjs/MQTT.js#readme) modules and a [HiveMQ](https://www.hivemq.com/) broker.

---

### Databases (MariaDB & InfluxDB):

In the final section of the module, the focus was on database design and paradigms. It looked intially at relational databases and MariaDB and later shifted to noSQL databases and more specifically time series databases using influxDB. This was integrated with the Node JS application written in the previous section using the [mariaDB](https://github.com/mariadb-corporation/mariadb-connector-nodejs#readme) and [node-influx](https://github.com/node-influx/node-influx#readme) modules. The data was later presented in a [Grafana](https://grafana.com/) dashboard.
