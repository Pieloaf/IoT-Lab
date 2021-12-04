const mqtt = require('async-mqtt');
const { createBluetooth } = require('node-ble');
const mariadb = require('mariadb');
const { exit } = require('process');
const UUID = require('./uuidParse');

const { bluetooth } = createBluetooth();

const ROOM = process.env.ROOM;
const MQTT_PASSWORD = process.env.MQTT_CLIENT_PASSWORD;
const DB_PASSWORD = process.env.DB_PASSWORD;

// db consts
const dbOptions = {
  host: 'localhost',
  user: 'iotgateway',
  password: DB_PASSWORD,
  database: 'iot',
}

// MQTT consts
const mqttOptions = {
  protocol: "mqtts",
  port: 8883,
  username: "raspberry",
  password: MQTT_PASSWORD,
  host: '845abfe393b744d3ac7c3553a089236f.s1.eu.hivemq.cloud',
  connectTimeout: 10 * 1000,
  will: {
    topic: `room/${ROOM}/status`,
    payload: `offline`,
    qos: 0,
  }
};

const subTopic = `room-${ROOM}/command`;
const pubTopic = `room-${ROOM}/response`
const sub = {
  broadcast: 'broadcast',
  // list; scan; connect -> id; disconnect -> id
  config: `${subTopic}/config/#`,
  // managment: /device/{id}/listChars; {char}/readVal, write, notify
  device: `${subTopic}/device/#`
};

const pub = {
  // config: list devices
  list: `${pubTopic}/devices`,
  // actions: device/{id} sends {chars: {uuid: [perms]}} device/{id}/(co2, temp, hum)
  device: `${pubTopic}/device`
};


// BT consts
const ess_uuid = '0000181a-0000-1000-8000-00805f9b34fb';

const expandUUID = (uuid) => {
  uuid = uuid.toLowerCase();
  if (!uuid.length === 4) {
    return uuid;
  }
  return `0000${uuid}-0000-1000-8000-00805f9b34fb`;
}

// Initialise client connections and get bt adapter
async function initConnections() {
  // connecting to mariadb
  console.log("[INFO]: DB - Connecting to database on localhost...");
  const dbConn = await (async () => {
    try {
      let conn = await mariadb.createPool(dbOptions);
      console.log("[SUCCESS]: DB - Connected to database on localhost.");
      return conn;
    } catch (err) {
      //exit there is an error
      console.log(`[ERROR]: DB - ${err}`);
      exit();
    }
  })();

  // connecting to mqtt broker
  console.log("[INFO]: MQTT - Starting MQTT client application...");
  const mqttClient = await (async () => {
    try {
      // create a client
      let client = await mqtt.connectAsync(mqttOptions.host, mqttOptions);
      console.log("[SUCCESS]: MQTT - Connected to cloud MQTT broker");
      await client.publish(`room/${ROOM}/status`, 'online');
      // subscribe to topics
      let topics = Array.from(Object.values(sub))
      let resp = await client.subscribe(topics);
      console.log(`[INFO]: MQTT - Subscribed to ${resp.map(topicObj => topicObj.topic)}`)
      return client;
    } catch (err) {
      // exit if there is an error
      console.log(`[ERROR]: MQTT - ${err}`);
      exit();
    }
  })();

  // get bluetoorh adapter
  console.log("[INFO]: BLE - Getting Bluetooth adapter...");
  const adapter = await (async () => {
    try {
      let adapter = await bluetooth.defaultAdapter();
      console.log("[SUCCESS]: BLE - Got Bluetooth adapter.");
      return adapter;
    } catch (err) {
      //exit there is an error
      console.log(`[ERROR]: BLE - ${err}`);
      exit();
    }
  })();
  return { dbConn, mqttClient, adapter };
}

(async () => {
  let connectedDevices = [];

  // list devices
  const listDevices = async (msg) => {
    try {
      let devices = await dbConn.query(`SELECT * FROM devices ${msg.toString() === 'connected' ? 'WHERE connected = 1' : ''}`);
      devices.length > 0
        ? mqttClient.publish(pub.list, JSON.stringify(devices))
        : mqttClient.publish(pub.list, JSON.stringify({ "Error": "No devices found" }));
    } catch (err) { console.log(`[ERROR]: ${err}`); }
  }

  const timedScan = async (ms) => {
    // start scanning
    await adapter.startDiscovery()
    console.log("[INFO]: BLE - Scanning Devices...");

    //stop scanning after 5 seconds
    await new Promise(resolve => setTimeout(resolve, ms));
    await adapter.stopDiscovery()
    console.log("[INFO]: BLE - Stopped discovery")
  }

  // scan for devices
  const scan = async () => {
    // reset scanned devices
    scannedDevices = [];
    await timedScan(3000);
    // get scanned devices
    device_list = await adapter.devices();
    for (let i in device_list) {
      // get device info
      let devObj = await adapter.waitDevice(device_list[i]);
      try {
        let name = await devObj.getName();
        // if device has name and is not connected add to scanned devices
        if (name && !connectedDevices.find(dev => dev.mac_address === device_list[i])) {
          scannedDevices.push({ device_name: name, mac_address: device_list[i] });
        }
      } catch (err) { /*pass*/ }
    };
    try {
      // publish scanned devices
      await mqttClient.publish(pubTopic, JSON.stringify(scannedDevices));
    } catch (err) { console.log(`[ERROR]: MQTT - ${err}`); }
  }

  // update device activity
  const updateDeviceAct = async (mac, action, { name } = {}) => {
    try {
      // get device id
      let device = await dbConn.query(`SELECT device_id FROM devices WHERE mac_address = '${mac}'`);
      // if device not in db add it
      if (!device.length) {
        dbConn.query(`INSERT INTO devices (device_name, mac_address, dt_added, connected) VALUES ('${name}', '${mac}', NOW(), FALSE)`);
        device = await dbConn.query(`SELECT device_id FROM devices WHERE mac_address = '${mac}'`);
      }
      let id = device[0].device_id;

      // update device activity
      if (action === 'connect' || action === 'disconnect') {
        await dbConn.query(`UPDATE devices SET connected = ${action === 'connect' ? 'TRUE' : 'FALSE'} WHERE device_id = ${id}`);
      }
      await dbConn.query(`INSERT INTO device_activity (device_id, activity, timestamp) VALUES ('${id}', '${action}', NOW())`);
    } catch (err) { console.log(`[ERROR] DB - ${err}`) }
  }

  // connect to device
  const connect = async (mac) => {
    try {
      // get device
      const device = await adapter.waitDevice(mac);
      let name = await device.getName()
      // connect to device
      await device.connect();
      const gatt = await device.gatt();
      if (!(await gatt.services()).includes(ess_uuid)) {
        await device.disconnect();
        console.log(`[ERROR]: BLE - Device ${name} does not have ESS service`);
        return;
      }
      console.log(`[SUCCESS]: BLE - Connected to ${name}`);
      let service = await gatt.getPrimaryService(ess_uuid);
      let chars = await Promise.all((await service.characteristics()).map(async (char) => {
        let charObj = await service.getCharacteristic(char);
        charObj.on("valuechanged", async buffer => {
          let data = Buffer.from(buffer, 'hex').readInt32LE();
          try {
            await mqttClient.publish(`${pubTopic}/device/${mac}`, data.toString());
          } catch (err) { console.log(`[ERROR]: MQTT - ${err}`) }
        }
        )
        return charObj;
      }))
      // add device to list of connected devices
      connectedDevices.push({ device_name: name, mac_address: mac, chars: chars });
      // update device activity
      updateDeviceAct(mac, 'connect', { name: name });
    } catch (err) {
      console.log(`[ERROR]: BLE - ${err}`);
      return;
    }
  }

  // disconnect from device
  const disconnect = async (mac) => {
    try {
      let device = await adapter.waitDevice(mac);
      let name = await device.getName()
      // disconnect from device
      await device.disconnect();
      console.log(`[SUCCESS]: BLE - Disconnected from ${name}`);
      // remove device from list of connected devices
      connectedDevices.splice(connectedDevices.findIndex(dev => dev.mac_address === mac), 1);
      // update device activity
      updateDeviceAct(mac, 'disconnect');
    } catch (err) {
      console.log(`[ERROR]: BLE - ${err}`);
      return;
    }
  }

  const { dbConn, mqttClient, adapter } = await initConnections();

  // init all devices as disconnected
  await dbConn.query(`UPDATE devices SET connected = FALSE`);

  // attempt connect to all devices on startup
  await dbConn.query(`SELECT * FROM devices`).then(async devices => {
    devices.forEach(async device => {
      timedScan(1000);
      connect(device.mac_address).catch(err => {
        console.log(`[ERROR]: BLE - Unable to connect to ${device.device_name}\n${err}`)
      });
    })
  }).catch(err => { console.log(`[ERROR]: DB - ${err}`) });


  mqttClient.on("message", async (topic, msg) => {
    console.log(`[INFO]: MQTT - Received message on topic ${topic}`);
    if (topic === sub.broadcast) {
      try {
        await mqttClient.publish(`room/${ROOM}/status`, 'online');
      } catch (err) { console.log(`[ERROR]: MQTT - ${err}`) }
    }
    else if (topic.includes(sub.config.replace('#', ''))) {
      let [, cmd] = topic.split('config/');
      switch (cmd) {
        case 'list':
          listDevices(msg);
          break;
        case 'scan':
          scan();
          break;
        case 'connect':
          connect(msg.toString());
          break;
        case 'disconnect':
          disconnect(msg.toString());
          break;
        case 'disconnectAll':
          connectedDevices.forEach(dev => disconnect(dev.mac_address));
          break;
        default:
          console.log(`[ERROR]: MQTT - Unknown command ${cmd}`);
      }
    }
    else if (topic.includes(sub.device.replace('#', ''))) {

      let [, set] = topic.split('device/');
      let [mac, uuid, cmd] = set.split('/');
      let chars = connectedDevices.find(dev => dev.mac_address === mac).chars;

      if (!uuid) {
        try {
          let charResp = await Promise.all(chars.map(async char => {
            char = new UUID(await char.getUUID()).get_uuid.characteristic()
            return char;
          }));
          await mqttClient.publish(`${pubTopic}/device/${mac}`, JSON.stringify(charResp));
        }
        catch (err) { console.log(`[ERROR]: ${err}`) }
      }
      else {
        uuid = expandUUID(uuid);
        let char = await (async () => {
          for (let i in chars) {
            if (await chars[i].getUUID() === uuid) return chars[i];
          }
        })();
        if (!char) {
          console.log(`[ERROR]: Unknown characteristic ${uuid}`)
          return;
        }
        if (cmd === 'read') {
          try {
            let data = Buffer.from((await char.readValue()), 'hex').readInt32LE();
            await updateDeviceAct(mac, `read ${cmd}`);
            await mqttClient.publish(`${pubTopic}/device/${mac}`, data.toString());
          }
          catch (err) { console.log(`[ERROR]: ${err}`) }
        }
        else if (cmd === 'write') {
          try {
            await char.writeValue(Buffer.from(msg.toString()));
            await updateDeviceAct(mac, `write ${cmd}`);
          }
          catch (err) { console.log(`[ERROR]: BLE - ${err}`); }
        }
        else if (cmd === 'notify') {
          if (msg.toString() === 'true') {
            try {
              await char.startNotifications();
              await updateDeviceAct(mac, `notify on`);
            }
            catch (err) { console.log(`[ERROR]: BLE - ${err}`) }
          }
          else if (msg.toString() === 'false') {
            try {
              await char.stopNotifications();
              await updateDeviceAct(mac, `notify off`);
            }
            catch (err) { console.log(`[ERROR]: BLE - ${err}`) }
          }
        } else {
          console.log(`[ERROR]: MQTT - Unknown command ${cmd}`);
        }
      }
    }
  })
})();