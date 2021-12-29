const clientID = "browserClient_" + Math.random().toString(16).substr(2, 8)

let [, uname, pwd] = window.location.href.match(/\?uname=(.*)&pwd=(.*)/);

const client = mqtt.connect(
    "wss://845abfe393b744d3ac7c3553a089236f.s1.eu.hivemq.cloud/mqtt",
    {
        port: 8884,
        clientId: clientID,
        keepalive: 60,
        username: uname,
        password: pwd,
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
const notifications = document.getElementById("notifications");
const co2 = "00000001-0002-0003-0004-000000000001"

let g_room;

function publishCmd(room, endpoint, data) {
    if (typeof data === "object") {
        data.clientID = clientID;
    } else {
        data = {
            clientID: clientID,
            data: data
        }
    }
    console.log(`sending: room-${room}/command/${endpoint}`, data)
    client.publish(`room-${room}/command/${endpoint}`, JSON.stringify(data));
}

function createNotificationElement(char, value, room) {
    const notificationElement = document.createElement("div");
    notificationElement.className = "notification";
    notificationElement.innerHTML = `
            <span class="notification-text notification-name">Room ${room} - ${char}</span>
            <span class="notification-text notification-value">Value: ${value}</span>
            <span class="notification-text notification-time">Time: ${new Date().toLocaleString()}</span>
    `
    notifications.prepend(notificationElement);
}

function createSensorElement(sensor, device) {
    if (sensor.uuid == co2) {
        sensor.name = "CO2"
    }
    const sensorElement = document.createElement("div");
    const commandData = {
        device: device,
        char: sensor.uuid
    }
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
            commandData.cmd = flag;
            if (flag == "write")
                commandData.data = prompt("Enter new threshold value");
            publishCmd(g_room, `device`, commandData);

        })
    })


    sensors.appendChild(sensorElement);
}

function createDeviceElement(device) {
    let statusString = device.connected ? "Connected" : "Disconnected";
    let action = device.connected ? "disconnect" : "connect";
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
    if (action === "connect") {
        deviceElement.querySelector(".sensors").style.display = "none";
        deviceElement.style.border = "solid #d02323";
    }

    deviceElement.querySelector(".connect").addEventListener("click", function (ev) {
        publishCmd(g_room, `config/${ev.target.innerHTML}`, { device: device.mac_address });
    });
    deviceElement.querySelector(".sensors").addEventListener("click", () => {
        g_device = device.mac_address;
        document.querySelector("#sensors.set-wrapper").innerHTML = "";
        publishCmd(g_room, `device`, { device: device.mac_address });
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
        publishCmd(room, "config/list", { status: "" });
    });
    gateways.appendChild(gateway);
}

client.on("connect", () => {
    console.log("connected");
    statusText.innerHTML = "Connected";
    statusText.style.color = "#81db76";

    client.subscribe(`${clientID}/#`);
    client.subscribe("room/#");
    client.publish("broadcast", JSON.stringify({ clientID: clientID }));
});

client.on("disconnect", () => {
    console.log("disconnected");
    statusText.innerHTML = "Disconnected";
    statusText.style.color = "#db6565";
})

client.on("message", function (topic, payload) {
    payload = JSON.parse(payload);
    console.log("received: ", topic, payload);

    //status messages: online, offline
    if (topic.endsWith(`/room-status`) || topic === "room/status") {
        const room = payload.room;
        if (payload.status === "online") {
            client.subscribe(`room-${room}/response/#`);
            if (!document.getElementById(room)) {
                createGatewayElement(room);
            }
        }
        else if (payload.status === "offline") {
            client.unsubscribe(`room-${room}/response/#`);
            document.getElementById(room).remove();
            if (g_room == room) {
                g_room = null;
                document.querySelector("#devices.set-wrapper").innerHTML = "";
                document.querySelector("#sensors.set-wrapper").innerHTML = "";
            }
        }
        if (!topic.startsWith(`${clientID}/`)) {
            VanillaToasts.create({
                title: `Room ${room}: ${payload.status}`,
                text: `status`,
                type: payload.status === "online" ? "success" : "error",
                timeout: 3000
            });
        }
        return;
    }
    //get gateway devices
    else if (topic.startsWith(clientID)) {
        if (topic.endsWith("devices")) {
            if (payload.error) {
                VanillaToasts.create({
                    title: `Error getting devices`,
                    text: payload.error,
                    type: "error",
                    timeout: 3000
                });
            }
            else payload.devices.forEach(device => {
                if (!document.getElementById(device.mac_address)) {
                    createDeviceElement(device);
                }
            });
        } else if (topic.endsWith("chars")) {
            payload.chars.forEach(sensor => {
                if (!document.getElementById(sensor.uuid)) {
                    createSensorElement(sensor, payload.device);
                }
            })
        } else if (topic.endsWith("cmd")) {
            if (payload.char === "Custom UUID") payload.char = "CO2";
            const device = document.getElementById(payload.device)
                .querySelector(".device-name").
                innerHTML.replace("Name: ", "");
            let toast = {
                title: `Room ${payload.room}: ${device}`,
                timeout: 3000,
                type: "info"
            }
            if (payload.success) toast.type = "success";
            else toast.type = "error";

            if (payload.cmd === "read")
                toast.text = `${payload.char} value: ${payload.data}`;
            else if (payload.cmd === "write") {
                toast.text = `${payload.char} threshold: ${payload.data}`;
            } else if (payload.cmd === "notify") {
                toast.text = `${payload.char} notifications ${payload.notify ? "enabled" : "disabled"}`;
            }

            VanillaToasts.create(toast);
        }
        return;
    }
    //get device sensors
    else if (topic.includes("response/device/")) {
        const room = topic.match(/-([0-9]{3})\//)[1];

        if (topic.endsWith("notify")) {
            if (payload.char === "Custom UUID") payload.char = "CO2";

            createNotificationElement(payload.char, payload.value, room);
            if (g_room == room) {
                VanillaToasts.create({
                    title: `Room ${room} - ${payload.char}`,
                    text: payload.value,
                    timeout: 1500,
                    type: "info"
                });
                return;
            }
        }
        else if (topic.endsWith("/status")) {
            const device = document.getElementById(payload.device);
            if (!device) return;
            const name = device.querySelector(".device-name").innerHTML.replace("Name: ", "");
            let action = payload.status === "connected" ? "disconnect" : "connect";
            device.querySelector(".device-status").innerHTML = `Status: ${payload.status}`;
            VanillaToasts.create({
                title: `Room ${room} - ${name}`,
                text: `${payload.status}`,
                timeout: 3000,
                type: "info"
            });
            device.querySelector(".connect").innerHTML = `${action}`;
            if (action === "connect") {
                device.querySelector(".sensors").style.display = "none";
                document.getElementById("sensors").innerHTML = "";
                device.style.border = "solid #d02323";
            } else {
                device.querySelector(".sensors").style.display = "grid";
                device.style.border = "solid #2cd018";
            }
        }
    }
})