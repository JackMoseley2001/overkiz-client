import { EventEmitter } from 'events';
import { Device, ExecutionState } from '.';
import ActionGroup from './models/ActionGroup';
import Execution, { ExecutionError } from './models/Execution';
import RestClient from './RestClient';

export let logger;

enum ApiEndpoint {
	'cozytouch' = 'https://ha110-1.overkiz.com/enduser-mobile-web/enduserAPI',
	'tahoma' = 'https://tahomalink.com/enduser-mobile-web/enduserAPI',
	'connexoon' = 'https://tahomalink.com/enduser-mobile-web/enduserAPI',
	'connexoon_rts' = 'https://ha201-1.overkiz.com/enduser-mobile-web/enduserAPI',
	'rexel' = 'https://ha112-1.overkiz.com/enduser-mobile-web/enduserAPI',
	'debug' = 'https://dev.duboc.pro/api/overkiz'
}

export default class OverkizClient extends EventEmitter {
    debug: boolean;
    apiEndpoint: string;
    execPollingPeriod;
    pollingPeriod;
    refreshPeriod;
    service;
    server;
    listenerId: null|number = null;
    executionPool: Execution[] = [];
    stateChangedEventListener = null;
    
    restClient: RestClient;

    devices: Array<Device> = new Array<Device>();

    refreshPollingId;
    eventPollingId;

    constructor(log, config) {
        super();
        logger = log;

        // Default values
        this.debug = config['debug'] || false;
        this.execPollingPeriod = config['execPollingPeriod'] || 2; // Poll for execution events every 2 seconds by default
        this.pollingPeriod = config['pollingPeriod'] || 60; // Don't continuously poll for events by default (in seconds)
        this.refreshPeriod = (config['refreshPeriod'] || 30) * 60; // Refresh device states every 30 minutes by default (in minutes)
        this.service = config['service'] || 'tahoma';

        if (!config['user'] || !config['password']) {
            throw new Error('You must provide credentials (user / password)');
        }
        this.apiEndpoint = ApiEndpoint[this.service.toLowerCase()];
        if (!this.apiEndpoint) {
            throw new Error('Invalid service name: ' + this.service);
        }
        this.restClient = new RestClient(config['user'], config['password'], this.apiEndpoint);

        
        this.listenerId = null;

        this.restClient.on('connect', () => {
            this.setRefreshPollingPeriod(this.refreshPeriod);
            this.setEventPollingPeriod(this.pollingPeriod);
        });
    }

    public hasExecution() {
        return Object.keys(this.executionPool).length > 0;
    }

    public async getDevices(): Promise<Array<Device>> {
        let lastMainDevice: Device|null = null;
        let lastDevice: Device|null = null;
        const mainDevices = new Array<Device>();
        const devices = (await this.restClient.get('/setup/devices')).map((device) => Object.assign(new Device(), device));
        devices.forEach((device) => {
            if(this.devices[device.deviceURL]) {
                //Object.assign(this.devices[device.deviceURL], device);
            } else {
                this.devices[device.deviceURL] = device;
            }
            if(device.isMainDevice()) {
                lastMainDevice = device;
                lastDevice = device;
                mainDevices.push(device);
            } else if(device.isSubDevice(lastDevice)) {
                device.parent = lastMainDevice;
                lastDevice = device;
                mainDevices.push(device);
            } else if(lastDevice !== null) {
                device.parent = lastDevice;
                lastDevice.addSensor(device);
            }
        });
        return mainDevices;
    }

    public async getActionGroups(): Promise<Array<ActionGroup>> {
        return this.restClient.get('/actionGroups').then((result) => result.map((data) => data as ActionGroup));
    }

    private registerListener() {
        return this.restClient.post('/events/register')
            .then((data) => {
                this.listenerId = data.id;
            });
    }

    private async unregisterListener() {
        return this.restClient.post('/events/' + this.listenerId + '/unregister')
            .then(() => {
                this.listenerId = null;
            });
    }

    refreshStates() {
        return this.restClient.put('/setup/devices/states/refresh');
    }

    requestState(deviceURL, state) {
        return this.restClient.get('/setup/devices/' + encodeURIComponent(deviceURL) + '/states/' + encodeURIComponent(state))
            .then((data) => data.value);
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
        //Log(execution);
        if(this.executionPool.length >= 10) {
            // Avoid EXEC_QUEUE_FULL (max 10 commands simultaneous)
            // Postpone in 10 sec
            await this.delay(10 * 1000);
        }
        try {
            //Log(JSON.stringify(execution));
            this.setEventPollingPeriod(this.execPollingPeriod);
            const data = await this.restClient.post('/exec/'+oid, execution);
            this.executionPool[data.execId] = execution;
            return data.execId;
        } catch(error) {
            throw new ExecutionError(ExecutionState.FAILED, error);
        }
    }

    private setRefreshPollingPeriod(period: number) {
        if(this.refreshPollingId !== null) {
            clearInterval(this.refreshPollingId);
        }
        if(period > 0) {
            this.refreshPollingId = setInterval(this.refreshAll.bind(this), period * 1000);
        }
    }

    private setEventPollingPeriod(period: number) {
        if(this.eventPollingId !== null) {
            clearInterval(this.eventPollingId);
        }
        if(period > 0) {
            if(this.listenerId === null) {
                this.registerListener();
            }
            this.eventPollingId = setInterval(this.fetchEvents.bind(this), period * 1000);
        }
    }

    private async refreshAll() {
        try {
            logger.debug('Refresh all devices');
            await this.refreshStates();
            await this.delay(10 * 1000); // Wait for device radio refresh
            const devices = await this.getDevices();
            devices.forEach((fresh) => {
                const device = this.devices[fresh.deviceURL];
                if(device) {
                    device.states = fresh.states;
                    device.emit('states', fresh.states);
                }
            });
        } catch(error) {
            logger.error(error);
        }
    }

    private async fetchEvents() {
        try {
            if(this.listenerId === null) {
                await this.registerListener();
            }
            
            const data = await this.restClient.post('/events/' + this.listenerId + '/fetch');
            for (const event of data) {
                //logger.log(event);
                if (event.name === 'DeviceStateChangedEvent') {
                    const device = this.devices[event.deviceURL];
                    event.deviceStates.forEach(fresh => {
                        const state = device.getState(fresh.name);
                        if(state) {
                            state.value = fresh.value;
                        }
                    });
                    device.emit('states', event.deviceStates);
                } else if (event.name === 'ExecutionStateChangedEvent') {
                    //logger.log(event);
                    const execution = this.executionPool[event.execId];
                    if (execution) {
                        execution.onStateUpdate(event.newState, event);
                        if(event.timeToNextState === -1) {
                            // No more state expected for this execution
                            delete this.executionPool[event.execId];
                            if(!this.hasExecution()) {
                                // Update polling frequency when no more execution
                                this.setEventPollingPeriod(this.pollingPeriod);
                            }
                        }
                    }
                }
            }
        } catch(error) {
            logger.error('Event Polling - Error with listener ' + this.listenerId);
            logger.error(error);
            this.listenerId = null;
        }
    }

    private async delay(duration) {
        return new Promise(resolve => setTimeout(resolve, duration));
    }
}
