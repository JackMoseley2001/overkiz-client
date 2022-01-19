"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const uuid_1 = require("uuid");
class Device extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.oid = '';
        this.deviceURL = '';
        this.label = '';
        this.widget = '';
        this.uiClass = '';
        this.controllableName = '';
        this.states = [];
        this.definition = { type: '', commands: [] };
        this.sensors = [];
    }
    get uuid() {
        return (0, uuid_1.validate)(this.oid) ? this.oid : (0, uuid_1.v5)(this.oid, '6ba7b812-9dad-11d1-80b4-00c04fd430c8');
    }
    get componentId() {
        const pos = this.deviceURL.indexOf('#');
        if (pos === -1) {
            return 1;
        }
        else {
            return parseInt(this.deviceURL.substring(pos + 1));
        }
    }
    get baseUrl() {
        const pos = this.deviceURL.indexOf('#');
        if (pos === -1) {
            return this.deviceURL;
        }
        else {
            return this.deviceURL.substring(0, pos);
        }
    }
    get manufacturer() {
        const manufacturer = this.get('core:ManufacturerNameState');
        return manufacturer !== null ? manufacturer : 'Somfy';
    }
    get model() {
        const model = this.get('core:ModelState');
        return model !== null ? model : this.uiClass;
    }
    get serialNumber() {
        return this.uuid;
    }
    get address() {
        //const regex = /(([0-9]{4})[-]){2}([0-9]{4})[/]/;
        const regex = /[//](.)*[/]/;
        return this.deviceURL.replace(regex, '');
    }
    get protocol() {
        return this.controllableName.split(':').shift() || '';
    }
    get uniqueName() {
        return this.controllableName.split(':').pop() || '';
    }
    get commands() {
        return this.definition.commands.map((command) => command.commandName);
    }
    hasCommand(name) {
        return this.definition.commands.find((command) => command.commandName === name) !== undefined;
    }
    hasState(name) {
        return this.states.find((state) => state.name === name) !== undefined;
    }
    hasSensor(widget) {
        return this.sensors.find((sensor) => sensor.widget === widget) !== undefined;
    }
    isMainDevice() {
        return this.componentId === 1;
    }
    isSensorOf(device) {
        switch (this.controllableName) {
            case 'io:AtlanticPassAPCOutsideTemperatureSensor':
                return false; //device.isMainDevice();
            case 'io:AtlanticPassAPCZoneTemperatureSensor':
                return device.uiClass === 'HeatingSystem';
            default:
                // TODO: Temporary patch to expose sensor as standalone device in Homebridge
                return this.widget === 'TemperatureSensor' && device.uiClass === 'HeatingSystem'; //this.definition.type === 'SENSOR';
        }
    }
    addSensor(device) {
        device.parent = this;
        this.sensors.push(device);
    }
    getState(stateName) {
        if (this.states !== null) {
            for (const state of this.states) {
                if (state.name === stateName) {
                    return state;
                }
            }
        }
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(stateName) {
        if (this.states !== null) {
            for (const state of this.states) {
                if (state.name === stateName) {
                    return state.value;
                }
            }
        }
        return null;
    }
    getNumber(stateName) {
        const val = this.get(stateName);
        return val ? Number.parseFloat(val) : 0;
    }
}
exports.default = Device;
//# sourceMappingURL=Device.js.map