const bt_uuids = require('./bluetooth-numbers-database');

const parse_uuid = (uuid128) => {
    uuid128 = uuid128.toUpperCase();
    let uuid16 = uuid128.match(/0{4}([0-9A-Z]{4})-0{4}-10{3}-80{3}-00805F9B34FB/);
    if (uuid16)
        return uuid16[1];
    else
        return uuid128;
}


class UUID {
    constructor(uuid) {
        this.uuid = parse_uuid(uuid);
        if (this.uuid.length !== 4) {
            this.isCustom = true;
        } else this.isCustom = false;
    }
    get_uuid = {
        descriptor: () => {
            if (this.isCustom)
                return {
                    name: 'Custom Descriptor',
                    identifier: null,
                    uuid: this.uuid,
                    source: 'custom'
                };
            else
                return bt_uuids.descriptor.find(d => d.uuid === this.uuid);
        },
        service: () => {
            if (this.isCustom)
                return {
                    name: 'Custom Service',
                    identifier: null,
                    uuid: this.uuid,
                    source: 'custom'
                };
            else
                return bt_uuids.services.find(srv => srv.uuid === this.uuid);
        },
        characteristic: () => {
            if (this.isCustom)
                return {
                    name: 'Custom Characteristic',
                    identifier: null,
                    uuid: this.uuid,
                    source: 'custom'
                };
            else
                return bt_uuids.characteristics.find(ch => ch.uuid === this.uuid);
        },
    }
}

module.exports = UUID;