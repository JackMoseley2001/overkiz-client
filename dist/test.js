"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const Client_1 = __importDefault(require("./Client"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function main() {
    const client = new Client_1.default(console, {
        service: process.env.SERVICE,
        user: process.env.USERNAME,
        password: process.env.PASSWORD,
        pollingPeriod: 0,
        refreshPeriod: 30,
    });
    //await client.refreshStates();
    const devices = await client.getDevices();
    console.log(`${devices.length} devices`);
    devices.forEach((device) => {
        console.log(`${device.parent ? ' ' : ''}\x1b[34m${device.label}\x1b[0m (${device.widget})`);
        device.sensors.forEach((sensor) => console.log(`\t - \x1b[34m${sensor.label}\x1b[0m (${sensor.widget})`));
        device.on('states', (states) => {
            console.log(device.label + ' states updated');
            states.forEach((state) => console.log('\t - ' + state.name + '=' + state.value));
        });
    });
    process.openStdin().addListener('data', async (d) => {
        const data = d.toString().trim();
        console.log('Input: ' + data);
        await client.refreshDeviceStates(data);
    });
}
main().catch(console.error);
//# sourceMappingURL=test.js.map