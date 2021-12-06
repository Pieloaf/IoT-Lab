// import the Bluetooth Numbers Database by Nordic Semiconductor
// https://github.com/NordicSemiconductor/bluetooth-numbers-database.git
const bt_uuids = require('./bluetooth-numbers-database');

// funtion to convert a 128 bit UUID to a 16 bit UUID used in the database
const parse_uuid = (uuid128) => {
    // convert the UUID to upper case
    uuid128 = uuid128.toUpperCase();
    // use a regex to extract the 16bit UUID from the 128 bit UUID
    let uuid16 = uuid128.match(/0{4}([0-9A-Z]{4})-0{4}-10{3}-80{3}-00805F9B34FB/);

    if (uuid16) // if the UUID was found
        return uuid16[1]; // return the 16bit UUID
    else
        return uuid128; // return the 128bit UUID
}

// function to get the uuid object from the database by UUID
module.exports = get_uuid = (uuid) => {
    // convert the UUID to a 16 bit UUID where possible
    uuid = parse_uuid(uuid);
    // get the UUID databases
    let uuidDB = Object.keys(bt_uuids.schemas)
    // loop through the UUID databases
    for (let i in uuidDB) {
        // attempt to find the UUID in the database
        let uuidObj = bt_uuids[uuidDB[i]].find(d => d.uuid === uuid)
        // if the UUID was found return the object
        if (uuidObj) return uuidObj;
    };
    // if the UUID was not found return a custom object
    return {
        name: 'Custom UUID',
        identifier: null,
        uuid: uuid,
        source: 'custom'
    };
}