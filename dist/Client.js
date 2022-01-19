"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const _1 = require(".");
const Execution_1 = require("./models/Execution");
const RestClient_1 = __importStar(require("./RestClient"));
const events_1 = require("events");
const EXEC_TIMEOUT = 2 * 60 * 1000;
const endpoints = {
    tahoma: new RestClient_1.ApiEndpoint('https://ha101-1.overkiz.com/enduser-mobile-web/enduserAPI'),
    tahoma_switch: new RestClient_1.ApiEndpoint('https://ha101-1.overkiz.com/enduser-mobile-web/enduserAPI'),
    connexoon: new RestClient_1.ApiEndpoint('https://ha101-1.overkiz.com/enduser-mobile-web/enduserAPI'),
    connexoon_rts: new RestClient_1.ApiEndpoint('https://ha201-1.overkiz.com/enduser-mobile-web/enduserAPI'),
    cozytouch: new RestClient_1.JWTEndpoint('https://ha110-1.overkiz.com/enduser-mobile-web/enduserAPI', 'https://api.groupe-atlantic.com/token', 'https://api.groupe-atlantic.com/gacoma/gacomawcfservice/accounts/jwt', 'czduc0RZZXdWbjVGbVV4UmlYN1pVSUM3ZFI4YTphSDEzOXZmbzA1ZGdqeDJkSFVSQkFTbmhCRW9h'),
    rexel: new RestClient_1.ApiEndpoint('https://ha112-1.overkiz.com/enduser-mobile-web/enduserAPI'),
    debug: new RestClient_1.ApiEndpoint('https://dev.duboc.pro/api/overkiz'),
};
class OverkizClient extends events_1.EventEmitter {
    constructor(log, config) {
        super();
        this.log = log;
        this.config = config;
        this.fetchLock = false;
        this.executionPool = [];
        this.devices = new Array();
        this.eventPollingPeriod = 0;
        this.eventPollingId = null;
        this.refreshPollingId = null;
        this.listenerId = null;
        exports.logger = Object.assign({}, log);
        exports.logger.debug = (...args) => {
            config['debug']
                ? log.info('\x1b[90m', ...args)
                : log.debug(...args);
        };
        // Default values
        this.execPollingPeriod = config['execPollingPeriod'] || 5; // Poll for execution events every 5 seconds by default (in seconds)
        this.pollingPeriod = config['pollingPeriod'] || 60; // Poll for events every 60 seconds by default (in seconds)
        this.refreshPeriod = (config['refreshPeriod'] || 30) * 60; // Refresh device states every 30 minutes by default (in minutes)
        this.service = config['service'] || 'tahoma';
        if (!config['user'] || !config['password']) {
            throw new Error('You must provide credentials (user / password)');
        }
        const apiEndpoint = endpoints[this.service.toLowerCase()];
        if (!apiEndpoint) {
            throw new Error('Invalid service name: ' + this.service);
        }
        this.restClient = new RestClient_1.default(config['user'], config['password'], apiEndpoint);
        this.listenerId = null;
        this.restClient.on('connect', () => {
            this.setRefreshPollingPeriod(this.refreshPeriod);
            this.setEventPollingPeriod(this.pollingPeriod);
        });
        this.restClient.on('disconnect', () => {
            this.listenerId = null;
            this.setRefreshPollingPeriod(0);
            this.setEventPollingPeriod(0);
        });
    }
    hasExecution(execId) {
        if (execId) {
            return execId in this.executionPool;
        }
        else {
            return Object.keys(this.executionPool).length > 0;
        }
    }
    async getDevices() {
        let lastMainDevice = null;
        let lastDevice = null;
        const physicalDevices = new Array();
        const devices = (await this.restClient.get('/setup/devices')).map((device) => Object.assign(new _1.Device(), device));
        devices.forEach((device) => {
            if (this.devices[device.deviceURL]) {
                //Object.assign(this.devices[device.deviceURL], device);
            }
            else {
                this.devices[device.deviceURL] = device;
            }
            if (device.isMainDevice()) {
                lastMainDevice = device;
                lastDevice = device;
                physicalDevices.push(device);
            }
            else {
                if (lastDevice !== null && device.isSensorOf(lastDevice)) {
                    lastDevice.addSensor(device);
                }
                else if (lastMainDevice !== null &&
                    device.isSensorOf(lastMainDevice)) {
                    lastMainDevice.addSensor(device);
                }
                else {
                    lastDevice = device;
                    device.parent = lastMainDevice;
                    physicalDevices.push(device);
                }
            }
        });
        return physicalDevices;
    }
    async getSetupLocation() {
        return (await this.restClient.get('/setup/location'));
    }
    async getActionGroups() {
        return this.restClient
            .get('/actionGroups')
            .then((result) => result.map((data) => data));
    }
    async registerListener() {
        if (this.listenerId === null) {
            //logger.debug('Registering event listener...');
            const data = await this.restClient.post('/events/register');
            this.listenerId = data.id;
        }
    }
    async unregisterListener() {
        if (this.listenerId !== null) {
            //logger.debug('Unregistering event listener...');
            await this.restClient.post('/events/' + this.listenerId + '/unregister');
            this.listenerId = null;
        }
    }
    async refreshAllStates() {
        await this.restClient.post('/setup/devices/states/refresh');
        await this.delay(10 * 1000); // Wait for device radio refresh
        const devices = await this.getDevices();
        devices.forEach((fresh) => {
            const device = this.devices[fresh.deviceURL];
            if (device) {
                device.states = fresh.states;
                device.emit('states', fresh.states);
            }
        });
    }
    async refreshDeviceStates(deviceURL) {
        await this.restClient.post('/setup/devices/' +
            encodeURIComponent(deviceURL) +
            '/states/refresh');
        if (this.eventPollingPeriod > this.execPollingPeriod ||
            this.listenerId === null) {
            await this.delay(2 * 1000); // Wait for device radio refresh
            const states = await this.getStates(deviceURL);
            const device = this.devices[deviceURL];
            if (device) {
                device.states = states;
                device.emit('states', states);
            }
        }
    }
    async getState(deviceURL, state) {
        const data = await this.restClient.get('/setup/devices/' +
            encodeURIComponent(deviceURL) +
            '/states/' +
            encodeURIComponent(state));
        return data.value;
    }
    async getStates(deviceURL) {
        const states = await this.restClient.get('/setup/devices/' + encodeURIComponent(deviceURL) + '/states');
        return states;
    }
    async cancelExecution(execId) {
        return await this.restClient.delete('/exec/current/setup/' + execId);
    }
    /*
        oid: The command OID or 'apply' if immediate execution
        execution: Body parameters
        callback: Callback function executed when command sended
    */
    async execute(oid, execution) {
        //logger.debug(JSON.stringify(execution));
        if (this.executionPool.length >= 10) {
            // Avoid EXEC_QUEUE_FULL (max 10 commands simultaneous)
            // Postpone in 10 sec
            await this.delay(10 * 1000);
            return await this.execute(oid, execution);
        }
        try {
            // Prepare listener
            await this.registerListener().catch((error) => exports.logger.error(error));
            const data = await this.restClient.post('/exec/' + oid, execution);
            this.executionPool[data.execId] = execution;
            // Update event poller for execution monitoring
            this.setEventPollingPeriod(this.execPollingPeriod);
            // Auto remove execution in case of timeout (eg: listener event missed, listener registration fails)
            setTimeout(() => {
                const execution = this.executionPool[data.execId];
                if (execution) {
                    execution.onStateUpdate(_1.ExecutionState.TIMED_OUT, null);
                    delete this.executionPool[data.execId];
                }
            }, EXEC_TIMEOUT);
            return data.execId;
        }
        catch (error) {
            throw new Execution_1.ExecutionError(_1.ExecutionState.FAILED, error);
        }
    }
    async setDeviceName(deviceURL, label) {
        await this.restClient.put(`/setup/devices/${encodeURIComponent(deviceURL)}/${label}`);
    }
    setRefreshPollingPeriod(period) {
        // Clear previous task
        if (this.refreshPollingId) {
            clearInterval(this.refreshPollingId);
            this.refreshPollingId = null;
        }
        if (period > 0) {
            this.refreshPollingId = setInterval(this.refreshTask.bind(this), period * 1000);
        }
    }
    setEventPollingPeriod(period) {
        if (period !== this.eventPollingPeriod) {
            this.eventPollingPeriod = period;
            // Clear previous task
            if (this.eventPollingId) {
                clearInterval(this.eventPollingId);
                this.eventPollingId = null;
            }
            if (period > 0) {
                exports.logger.debug('Change event polling period to ' + period + ' sec');
                this.eventPollingId = setInterval(this.pollingTask.bind(this), period * 1000);
            }
            else {
                exports.logger.debug('Disable event polling');
            }
        }
    }
    async refreshTask() {
        try {
            //logger.debug('Refresh all devices');
            await this.refreshAllStates();
        }
        catch (error) {
            exports.logger.error(error);
        }
    }
    async pollingTask() {
        if (this.eventPollingPeriod !== this.pollingPeriod &&
            !this.hasExecution()) {
            // Restore default polling frequency if no more execution in progress
            this.setEventPollingPeriod(this.pollingPeriod);
        }
        else if (!this.fetchLock) {
            // Execute task if not already running
            this.fetchLock = true;
            await this.fetchEvents();
            this.fetchLock = false;
        }
    }
    async fetchEvents() {
        try {
            await this.registerListener();
            //logger.debug('Polling events...');
            const data = await this.restClient.post('/events/' + this.listenerId + '/fetch');
            for (const event of data) {
                //logger.log(event);
                if (event.name === 'DeviceStateChangedEvent') {
                    const device = this.devices[event.deviceURL];
                    event.deviceStates.forEach((fresh) => {
                        const state = device.getState(fresh.name);
                        if (state) {
                            state.value = fresh.value;
                        }
                    });
                    device.emit('states', event.deviceStates);
                }
                else if (event.name === 'ExecutionStateChangedEvent') {
                    //logger.log(event);
                    const execution = this.executionPool[event.execId];
                    if (execution) {
                        execution.onStateUpdate(event.newState, event);
                        if (event.timeToNextState === -1) {
                            // No more state expected for this execution
                            delete this.executionPool[event.execId];
                        }
                    }
                }
            }
        }
        catch (error) {
            exports.logger.error('Polling error -', error);
            if (this.listenerId === null &&
                (error.includes('NOT_REGISTERED') ||
                    error.includes('UNSPECIFIED_ERROR'))) {
                this.listenerId = null;
            }
            // Will lock the poller for 10 sec in case of error
            await this.delay(10 * 1000);
        }
    }
    async delay(duration) {
        return new Promise((resolve) => setTimeout(resolve, duration));
    }
}
exports.default = OverkizClient;
//# sourceMappingURL=Client.js.map