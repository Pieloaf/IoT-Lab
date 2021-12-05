const client = mqtt.connect(
    "wss://845abfe393b744d3ac7c3553a089236f.s1.eu.hivemq.cloud/mqtt",
    {
        port: 8884,
        clientId: "mqttjs_" + Math.random().toString(16).substr(2, 8),
        keepalive: 60,
        username: "guest",
        password: "guestUser1",
        protocol: "wss",
        path: "/mqtt",
        host: "845abfe393b744d3ac7c3553a089236f.s1.eu.hivemq.cloud",
        clean: true,
    }
);

const statusText = document.getElementById("status");
const gateways = document.getElementById("gateways");
const devices = document.getElementById("devices");
const sensors = document.getElementById("sensors");

let g_room, g_device, g_sensor;

function publishCmd(room, endpoint, data) {
    console.log(`room-${room}/command/${endpoint}`, data)
    client.publish(`room-${room}/command/${endpoint}`, data);
}

function createSensorElement(sensor, device) {
    const sensorElement = document.createElement("div");
    sensorElement.className = "sensor";
    sensorElement.id = sensor.uuid;
    sensorElement.innerHTML = `
            <span class="sensor-text sensor-name">Name: ${sensor.name}</span>
            <div class="sensor-btns"></div>
    `;
    sensor.flags.forEach(flag => {
        const sensorBtn = document.createElement("span");
        sensorBtn.className = "sensor-btn button";
        sensorBtn.id = `${sensor.uuid}-${flag}`;
        sensorBtn.innerHTML = flag;
        sensorElement.querySelector(".sensor-btns").appendChild(sensorBtn);
        sensorBtn.addEventListener("click", () => {
            if (flag === "read") {
                publishCmd(g_room, `device/${device}/${sensor.uuid}/read`, "");
            } else if (flag === "write") {
                let value = prompt("Enter Notify Threshold: ");
                publishCmd(g_room, `device/${device}/${sensor.uuid}/write`, value);
            } else if (flag === "notify") {
                publishCmd(g_room, `device/${device}/${sensor.uuid}/notify`, "");
            }

        })
    })


    sensors.appendChild(sensorElement);
}

function createDeviceElement(device) {
    let statusString = device.connected ? "Connected" : "Disconnected";
    let action = device.connected ? "Disconnect" : "Connect";
    const deviceElement = document.createElement("div");
    deviceElement.className = "device";
    deviceElement.id = device.mac_address;
    deviceElement.innerHTML = `
            <div class="device-head">
                <span class="device-text device-name">Name: ${device.device_name}</span>
                <span class="device-text device-status">Status: ${statusString}</span>
            </div>
            <div class="device-btns">
                <span class="device-btn button connect">${action}</span>
                <span class="device-btn button sensors">Sensors</span>
            </div>
    `;
    if (action === "Connect") {
        deviceElement.querySelector(".sensors").style.display = "none";
        deviceElement.style.border = "solid #d02323";
    }

    deviceElement.querySelector(".connect").addEventListener("click", function (ev) {
        if (ev.target.innerHTML == "Disconnect") {
            publishCmd(g_room, "config/disconnect", device.mac_address);
        } else {
            publishCmd(g_room, "config/connect", device.mac_address);
        }
    });
    deviceElement.querySelector(".sensors").addEventListener("click", () => {
        g_device = device.mac_address;
        document.querySelector("#sensors.set-wrapper").innerHTML = "";
        publishCmd(g_room, `device/${device.mac_address}`, "");
    })

    devices.appendChild(deviceElement);
}

function createGatewayElement(room) {
    const gateway = document.createElement("span");
    gateway.className = "gateway button";
    gateway.id = room;
    gateway.innerHTML = `Room ${room}`;
    gateway.addEventListener("click", () => {
        g_room = room;
        document.querySelector("#devices.set-wrapper").innerHTML = "";
        document.querySelector("#sensors.set-wrapper").innerHTML = "";
        publishCmd(room, "config/list", "");
    });
    gateways.appendChild(gateway);
}

client.on("connect", function () {
    console.log("connected");
    statusText.innerHTML = "Connected";
    statusText.style.color = "#81db76";

    client.subscribe("room/#");
    client.publish("broadcast");
});

client.on("message", function (topic, payload) {
    //status messages: online, offline
    if (topic.match(/room\/([0-9]{3})\/status/)) {

        let room = topic.match(/room\/([0-9]{3})\/status/)[1];
        if (payload.toString() === "online") {
            client.subscribe(`room-${room}/response/#`);
            if (!document.getElementById(room)) {
                createGatewayElement(room);
            }
        }
        else if (payload.toString() === "offline") {
            client.unsubscribe(`room-${room}/response/#`);
            document.getElementById(room).remove();
            if (g_room == room) {
                g_room = null;
                document.querySelector("#devices.set-wrapper").innerHTML = "";
                document.querySelector("#sensors.set-wrapper").innerHTML = "";
            }
        }
    }
    //get gateway devices
    else if (topic.includes("response/devices")) {
        JSON.parse(payload.toString()).forEach(device => {
            if (!document.getElementById(device.mac_address)) {
                createDeviceElement(device, topic.match(/room-([0-9]{3})\//)[1]);
            }
        });
    }
    //get device sensors
    else if (topic.includes("response/device")) {
        const room = topic.match(/room-([0-9]{3})\//)[1];
        if (room !== g_room) {
            return;
        }
        const macAddr = topic.match(/response\/device\/(([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2}))/)[1];
        if (topic.endsWith(macAddr)) {
            JSON.parse(payload).forEach(sensor => {
                createSensorElement(sensor, macAddr);
            })
        }
        else if (topic.endsWith("status")) {
            let action = payload.toString() === "connected" ? "Disconnect" : "Connect";
            let device = document.getElementById(macAddr)
            device.querySelector(".device-status").innerHTML = `Status: ${payload.toString()}`;
            device.querySelector(".connect").innerHTML = `${action}`;
            if (action === "Connect") {
                device.querySelector(".sensors").style.display = "none";
                device.style.border = "solid #d02323";
            } else {
                device.querySelector(".sensors").style.display = "block";
                device.style.border = "solid #2cd018";
            }
        } else if (topic.endsWith("notify")) {
            let char = new RegExp(`response\/device\/${macAddr}\/(.*)\/notify`).exec(topic)[1];
            if (char === "Custom Characteristic") {
                char = "CO2";
            }

            VanillaToasts.create({
                title: `Room ${room} - ${char}`,
                text: payload.toString(),
                timeout: 1500,
                type: "info"
            });
        } else {
            let char = new RegExp(`response\/device\/${macAddr}\/(.*)`).exec(topic)[1];
            if (char === "Custom Characteristic") {
                char = "CO2";
            }

            VanillaToasts.create({
                title: `Room ${room} - ${char}`,
                text: payload.toString(),
                timeout: 1500,
                type: "info"
            });
        }
    }
    else {
        console.log(topic, JSON.parse(payload));
    }
})