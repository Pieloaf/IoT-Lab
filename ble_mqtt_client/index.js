// import necessary modules
const mqtt = require('async-mqtt');
const { createBluetooth } = require('node-ble');
const mariadb = require('mariadb');
const Influx = require('influx');
const { exit } = require('process');

// import uuid function
const get_uuid = require("./uuidParse");

// getting environment variables
const ROOM = process.env.ROOM; // room number
const MQTT_PASSWORD = process.env.MQTT_CLIENT_PASSWORD; // mqtt client password
const DB_PASSWORD = process.env.DB_PASSWORD; // database password

// database connection options
const dbOptions = {
  host: 'localhost',
  user: 'iotgateway',
  password: DB_PASSWORD,
  database: 'RMicrobit',
}

const influxOpts = {
  host: 'localhost',
  username: 'iotgateway',
  password: DB_PASSWORD,
  database: 'IMicrobit',
  schema: [{
    measurement: 'sensor_data',
    fields: {
      value: Influx.FieldType.INTEGER
    },
    tags: ['room', 'device_ID', 'device_name', 'sensor_ID', 'sensor_name']
  }]
}

// MQTT connection options
const mqttOptions = {
  protocol: "mqtts", // mqtts uses TLS
  port: 8883,
  username: "raspberry", // mqtt client username
  password: MQTT_PASSWORD, // mqtt client password
  host: '845abfe393b744d3ac7c3553a089236f.s1.eu.hivemq.cloud',
  connectTimeout: 10 * 1000,
  will: { // last will options ie. if the client disconnects
    topic: `room/status`, // topic to publish to
    payload: JSON.stringify({ room: ROOM, status: "offline" }), // payload to publish
    qos: 2, // qos 2 ensures all subscribers notified of disconnect
  }
};

// defining base topics for subscription and publish
const subTopic = `room-${ROOM}/command`;
const pubTopic = `room-${ROOM}/response`

// object containing subscription topics
const sub = {
  broadcast: 'broadcast',
  // list; scan; connect -> id; disconnect -> id
  config: `${subTopic}/config/#`,
  // {mac}; {mac}/{char UUID}/readVal; {mac}/{char UUID}/write -> value; 
  // {mac}/{char UUID}/notify
  device: `${subTopic}/device/#`
};

// object containing base publish topics
const pub = {
  // / -> lists devices
  list: `${pubTopic}/devices`,
  // /{mac} -> scanned devices; /{mac}/status -> device status; 
  // /{mac}/{char name} -> char value; /{mac}/{char name}/notify -> notify value
  device: `${pubTopic}/device`
};

// Initialise the Bluetooth class
const { bluetooth } = createBluetooth();

// Bluetooth standard environmenatal sensing uuid
const ess_uuid = '0000181a-0000-1000-8000-00805f9b34fb';

// function to expand a standard 16 bit uuid to a 128 bit uuid
const expandUUID = (uuid) => {
  // convert to lower case
  uuid = uuid.toLowerCase();

  // ensure uuid is 16 bit
  if (uuid.length !== 4) {
    // if not return the current uuid
    return uuid;
  }
  // convert to standard 128 bit uuid
  return `0000${uuid}-0000-1000-8000-00805f9b34fb`;
}

// function to initialise client connections and get bt adapter
async function initConnections() {

  // connecting to mariadb
  console.log("[INFO]: DB - Connecting to database on localhost...");
  const dbConn = await (async () => {
    try {
      // create a connection pool
      let conn = await mariadb.createPool(dbOptions);
      console.log("[SUCCESS]: DB - Connected to database on localhost.");
      return conn; // return connection
    } catch (err) {
      //log and exit if there is an error
      console.log(`[ERROR]: DB - ${err}`);
      exit();
    }
  })();

  //connecting to influxDB
  console.log("[INFO]: DB - Creating InfluxDB client...");
  const influx = new Influx.InfluxDB(influxOpts)

  // connecting to mqtt broker
  console.log("[INFO]: MQTT - Starting MQTT client application...");
  const mqttClient = await (async () => {
    try {
      // create a client by connecting to the broker
      let client = await mqtt.connectAsync(mqttOptions.host, mqttOptions);
      console.log("[SUCCESS]: MQTT - Connected to cloud MQTT broker");
      // publish a status message to the broker
      await client.publish(`room/status`, JSON.stringify({
        room: ROOM,
        status: 'online'
      }));
      let topics = Array.from(Object.values(sub)) //convert object to array of values
      let resp = await client.subscribe(topics); //subscribe to all topics
      console.log(`[INFO]: MQTT - Subscribed to ${resp.map(topicObj => topicObj.topic)}`)
      return client; // return the client
    } catch (err) {
      // log and exit if there is an error
      console.log(`[ERROR]: MQTT - ${err}`);
      exit();
    }
  })();

  // get bluetoorh adapter
  console.log("[INFO]: BLE - Getting Bluetooth adapter...");
  const adapter = await (async () => {
    try {
      // get the adapter
      let adapter = await bluetooth.defaultAdapter();
      console.log("[SUCCESS]: BLE - Got Bluetooth adapter.");
      return adapter; // return the adapter
    } catch (err) {
      //log and exit if there is an error
      console.log(`[ERROR]: BLE - ${err}`);
      exit();
    }
  })();
  // return the connection pool, mqtt client and adapter
  return { dbConn, mqttClient, adapter, influx };
}

// main function
(async () => {
  // initialise empty array to store connected devices
  let connectedDevices = [];

  // function to list devices
  const listDevices = async (msg) => {
    try {
      // query database for devices (filter to connected devices if msg == 'connected')
      let devices = await dbConn.query(`SELECT * FROM devices ${msg.status === 'connected' ? 'WHERE connected = 1' : ''}`);

      devices.length > 0 // if devices are found
        ? mqttClient.publish(`${msg.clientID}/devices`, JSON.stringify({
          room: ROOM,
          devices: devices
        })) // publish the list of devices
        : mqttClient.publish(`${msg.clientID}/devices`, JSON.stringify({ error: "No devices found" })); // else publish error message
    } catch (err) { console.log(`[ERROR]: ${err}`); } // log any error to console
  }

  // function to scan for devices for a given time
  const timedScan = async (ms) => {
    await adapter.startDiscovery() // start scanning
    console.log("[INFO]: BLE - Scanning Devices...");

    // forced delay to allow devices to be found
    await new Promise(resolve => setTimeout(resolve, ms));
    await adapter.stopDiscovery() // stop scanning
    console.log("[INFO]: BLE - Stopped discovery")
  }

  // function to scan for devices
  const scan = async (client) => {
    // initialise empty array to store devices
    let scannedDevices = [];

    // scan for devices
    await timedScan(3000);

    // get scanned devices
    device_list = await adapter.devices();

    // for each device
    for (let i in device_list) {
      try {
        // get device object
        let devObj = await adapter.waitDevice(device_list[i]);
        // get device name
        let name = await devObj.getName();
        // if device is not connected already
        if (!connectedDevices.find(dev => dev.mac_address === device_list[i])) {
          // add device to scanned devices array
          scannedDevices.push({ device_name: name, mac_address: device_list[i] });
        }
      } catch (err) { /*pass*/ } // on error do nothing i.e. device is unnamed
    };
    try {
      // publish scanned devices
      await mqttClient.publish(`${client}/scan`, JSON.stringify({
        room: ROOM,
        devices: scannedDevices
      }));
    } catch (err) { console.log(`[ERROR]: MQTT - ${err}`); } // log any error to console
  }

  // function called when the gateway communicates with a device
  const updateDeviceAct = async (mac, action, { data, name } = {}) => {
    data = data ? data : mac
    try {
      // get device from database
      let device = await dbConn.query(`SELECT device_id FROM devices WHERE mac_address = '${mac}'`);
      // if device not in database
      if (!device.length) {
        // add device to database
        dbConn.query(`INSERT INTO devices (device_name, mac_address, dt_added, connected) VALUES ('${name}', '${mac}', NOW(), FALSE)`);
        // get the newly added device from database
        device = await dbConn.query(`SELECT device_id FROM devices WHERE mac_address = '${mac}'`);
      }
      // get device id
      let id = device[0].device_id;

      // if action is a connect or disconnect
      if (action === 'connect' || action === 'disconnect') {
        // updated state in device database
        await dbConn.query(`UPDATE devices SET connected = ${action === 'connect' ? 'TRUE' : 'FALSE'} WHERE device_id = ${id}`);
      }
      // add action to device activity database
      await dbConn.query(`INSERT INTO device_activity (device_id, activity, data, timestamp) VALUES ('${id}', '${action}', '${data}', NOW())`);
    } catch (err) { console.log(`[ERROR] DB - ${err}`) } // log any error to console
  }

  // function to connect to a device
  const connect = async (mac) => {
    try {
      await timedScan(500); // scan for device
      const device = await adapter.waitDevice(mac); // get device from adapter
      let name = await device.getName() // get device name
      await device.connect(); // connect to device
      const gatt = await device.gatt(); // get devices gatt server

      // if the device doesn't have an environemental sensing service
      if (!(await gatt.services()).includes(ess_uuid)) {
        // disconnect from device
        await device.disconnect();
        console.log(`[ERROR]: BLE - Device ${name} does not have ESS service`); // log error
        return; // return
      }
      console.log(`[SUCCESS]: BLE - Connected to ${name}`);

      // get the environmental sensing service
      let service = await gatt.getPrimaryService(ess_uuid);

      // for each characteristic in the service
      let chars = await Promise.all((await service.characteristics()).map(async (char) => {
        // get characteristic object
        let charObj = await service.getCharacteristic(char);
        // add event listener to characteristic for value change i.e. notify events
        charObj.on("valuechanged", async buffer => {
          // convert the received buffer to an int
          let data = Buffer.from(buffer, 'hex').readInt32LE();
          try {
            // get characteristic name
            let uuid = await charObj.getUUID();
            console.log(uuid, data);
            let charName = get_uuid(uuid).name
            // publish the data to the mqtt broker

            let sensor_id = await dbConn.query(`SELECT sensor_id FROM sensors WHERE sensor_UUID = '${expandUUID(uuid)}'`);
            sensor_id = sensor_id.length ? sensor_id[0].sensor_id : null;
            if (uuid === "00000001-0002-0003-0004-000000000001") charName = "CO2";

            influx.writePoints([{
              measurement: 'sensor_data',
              tags: {
                room: ROOM,
                device_ID: mac,
                device_name: name,
                sensor_ID: uuid,
                sensor_name: charName
              },
              fields: {
                value: Number(data)
              }
            }],
              {
                database: 'IMicrobit',
                precision: 'ms'
              })
            await dbConn.query(`INSERT INTO sensor_data (sensor_id, value, timestamp) VALUES ('${sensor_id}', '${Number(data)}', NOW())`);
            await mqttClient.publish(`${pub.device}/notify`, JSON.stringify({
              device: mac,
              char: charName,
              value: data.toString()
            }));
          } catch (err) { console.log(`[ERROR]: MQTT - ${err}`) } // log any error to console
        })
        return charObj; // return characteristic object to mapped array
      }))
      // add device to list of connected devices with object of characteristics
      connectedDevices.push({ device_name: name, mac_address: mac, chars: chars });
      // update device activity to connected
      await updateDeviceAct(mac, 'connect', { name: name });
      // publish to broker that device has been connected
      await mqttClient.publish(`${pub.device}/status`, JSON.stringify({
        device: mac,
        status: "connected"
      }));
    } catch (err) { console.log(`[ERROR]: BLE - ${err}`); } // log any error to console
  }

  // function to disconnect from a device
  const disconnect = async (mac) => {
    try {
      let device = await adapter.waitDevice(mac); // get device from adapter 
      let name = await device.getName() // get device name
      await device.disconnect(); // disconnect from device
      console.log(`[SUCCESS]: BLE - Disconnected from ${name}`);
      // publish to broker that device has been disconnected
      await mqttClient.publish(`${pub.device}/status`, JSON.stringify({
        device: mac,
        status: 'disconnected'
      }));
      // remove device from list of connected devices
      connectedDevices.splice(connectedDevices.findIndex(dev => dev.mac_address === mac), 1);
      // update device activity to disconnected
      updateDeviceAct(mac, 'disconnect');
    } catch (err) { console.log(`[ERROR]: BLE - ${err}`); } // log any error to console
  }

  // initialising database connection, mqtt client and ble adapter
  const { dbConn, mqttClient, adapter, influx } = await initConnections();

  // initialise all devices in database as disconnected
  await dbConn.query(`UPDATE devices SET connected = FALSE`);

  // attempt connect to all devices on startup
  await dbConn.query(`SELECT * FROM devices`).then(async devices => {
    devices.forEach(async device => {
      // attempt to connect to device
      connect(device.mac_address).catch(err => {
        // log any error to console
        console.log(`[ERROR]: BLE - Unable to connect to ${device.device_name}\n${err}`)
      });
    })
  }).catch(err => { console.log(`[ERROR]: DB - ${err}`) }); // log any error to console


  // function to handle incoming messages from the mqtt broker
  mqttClient.on("message", async (topic, msg) => {
    msg = JSON.parse(msg);
    console.log(`[INFO]: MQTT - Received message on topic ${topic}`);
    // if the topic is a broadcast message
    if (topic === sub.broadcast) {
      try {
        // publish to broker that device is online
        await mqttClient.publish(`${msg.clientID}/room-status`, JSON.stringify({
          room: ROOM,
          status: 'online'
        }));
      } catch (err) { console.log(`[ERROR]: MQTT - ${err}`) } // log any error to console
    }
    // if the topic is a config message
    else if (topic.includes(sub.config.replace('#', ''))) {
      // get the config command
      let [, cmd] = topic.split('config/');
      // test the command
      switch (cmd) {
        case 'list': // if the command is list
          listDevices(msg); // list devices
          break;
        case 'scan': // if the command is scan
          scan(msg.clientID); // scan for devices
          break;
        case 'connect': // if the command is connect
          connect(msg.device); // connect to device
          break;
        case 'disconnect': // if the command is disconnect
          disconnect(msg.device); // disconnect from device
          break;
        case 'disconnectAll': // if the command is disconnect all
          // disconnect from all devices
          connectedDevices.forEach(dev => disconnect(dev.mac_address));
          break;
        default: // if none of the above log an error
          console.log(`[ERROR]: MQTT - Unknown command ${cmd}`);
      }
    }
    // if the topic is a device message
    else if (topic.includes(sub.device.replace('/#', ''))) {
      let resp = {
        room: ROOM,
        device: msg.device,
      }; // create response object
      // remove the initial device topic

      // get the device mac address, characteristic uuid and command
      let mac = msg.device;
      let uuid = msg.char;
      let cmd = msg.cmd;
      // get the devices characteristic object
      let chars = connectedDevices.find(dev => dev.mac_address === msg.device)?.chars;
      // if no uuid in the message topic
      if (!uuid) {
        try {
          // create an array of characteristics 
          let charResp = await Promise.all(chars.map(async char => {
            // get the characteristic uuid object
            let charObj = get_uuid(await char.getUUID())
            // get the characteristic permissions
            charObj.flags = await char.getFlags();
            return charObj; // return characteristic object to the mapped array
          }));

          resp.chars = charResp; // set the response characteristics
          // publish the array of characteristic objects to the mqtt broker
          await mqttClient.publish(`${msg.clientID}/chars`, JSON.stringify(resp));
        }
        catch (err) { console.log(`[ERROR]: ${err}`) } // log any error to console
      }
      // if a uuid is in the message topic
      else {
        uuid = expandUUID(uuid); // expand the UUID to 128 bits

        // get the characteristic object by uuid
        let char = await (async () => {
          // find the matching characteristic object
          for (let i in chars) {
            if (await chars[i].getUUID() === uuid) return chars[i];
          }
        })();
        // if the characteristic object is not found

        resp.char = get_uuid(uuid).name; // set the response characteristic
        // if the command issued is read
        if (cmd === 'read') {
          resp.cmd = 'read'; // set the response command
          try {
            // read the characteristic value from the device and convert to an int
            let data = Buffer.from((await char.readValue()), 'hex').readInt32LE();
            // update the device activity database
            await updateDeviceAct(mac, `read`, { data: uuid });
            resp.data = data; // set the response data
            resp.success = true; // set the response success
          }
          catch (err) {
            console.log(`[ERROR]: BLE - ${err}`); // log any error to console
            resp.success = false; // set the response success
            resp.data = `${err}`; // set the response data
          }
          // publish the characteristic value to the mqtt broker
          await mqttClient.publish(`${msg.clientID}/cmd`, JSON.stringify(resp));
        }
        // if the command issued is write
        else if (cmd === 'write') {
          resp.cmd = 'write'; // set the response command
          try {
            // convert the message to a buffer and write to the characteristic
            await char.writeValue(Buffer.from(msg.data.toString()));
            // update the device activity database
            await updateDeviceAct(mac, `write`, { data: uuid });
            resp.success = true; // set the response success
            resp.data = msg.data.toString(); // set the response data
          }
          catch (err) {
            console.log(`[ERROR]: BLE - ${err}`); // log any error to console
            resp.success = false; // set the response success
            resp.data = `${err}`; // set the response data
          }
          //publish error to mqtt broker
          await mqttClient.publish(`${msg.clientID}/cmd`, JSON.stringify(resp));
        }
        // if the command issued is notify
        else if (cmd === 'notify') {
          resp.cmd = 'notify'; // set the response command
          try {
            // if the characteristic is already notifying
            if (await char.isNotifying()) {
              await char.stopNotifications(); // stop notifying
              // update the device activity database
              await updateDeviceAct(mac, `notify off`, { data: uuid });
            }
            // if the characteristic is not already notifying
            else {
              await char.startNotifications(); // start notifying
              // update the device activity database
              await updateDeviceAct(mac, `notify on`, { data: uuid });
            }
            resp.success = true; // set the response success
          }
          catch (err) {
            console.log(`[ERROR]: BLE - ${err}`) // log any error to console
            resp.success = false; // set the response success
            resp.data = `${err}`; // set the response data
          }
          resp.notify = await char.isNotifying(); // set the response notify
          await mqttClient.publish(`${msg.clientID}/cmd`, JSON.stringify(resp));
        } else {
          // if the command issued is none of the above log an error
          console.log(`[ERROR]: MQTT - Unknown command ${cmd}`);
        }
      }
    }
  })
})();
