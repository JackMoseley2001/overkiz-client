/// <reference types="node" />
import { Device, Location } from '.';
import ActionGroup from './models/ActionGroup';
import { EventEmitter } from 'events';
import { State } from './models/Device';
export declare let logger: any;
export default class OverkizClient extends EventEmitter {
    readonly log: any;
    readonly config: any;
    private restClient;
    private service;
    private fetchLock;
    private executionPool;
    private devices;
    private pollingPeriod;
    private refreshPeriod;
    private execPollingPeriod;
    private eventPollingPeriod;
    private eventPollingId;
    private refreshPollingId;
    private listenerId;
    constructor(log: any, config: any);
    hasExecution(execId?: string): boolean;
    getDevices(): Promise<Array<Device>>;
    getSetupLocation(): Promise<Location>;
    getActionGroups(): Promise<Array<ActionGroup>>;
    private registerListener;
    private unregisterListener;
    refreshAllStates(): Promise<void>;
    refreshDeviceStates(deviceURL: string): Promise<void>;
    getState(deviceURL: any, state: any): Promise<any>;
    getStates(deviceURL: any): Promise<Array<State>>;
    cancelExecution(execId: any): Promise<any>;
    execute(oid: any, execution: any): any;
    setDeviceName(deviceURL: any, label: any): Promise<void>;
    private setRefreshPollingPeriod;
    private setEventPollingPeriod;
    private refreshTask;
    private pollingTask;
    private fetchEvents;
    private delay;
}
//# sourceMappingURL=Client.d.ts.map