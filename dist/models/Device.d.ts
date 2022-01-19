/// <reference types="node" />
import { EventEmitter } from 'events';
export interface State {
    name: string;
    type: number;
    value: any;
}
export interface CommandDefinition {
    commandName: string;
    nparams: number;
}
export interface Definition {
    type: string;
    commands: CommandDefinition[];
}
export default class Device extends EventEmitter {
    oid: string;
    deviceURL: string;
    label: string;
    widget: string;
    uiClass: string;
    controllableName: string;
    states: Array<State>;
    definition: Definition;
    parent: Device | undefined;
    sensors: Device[];
    get uuid(): any;
    get componentId(): number;
    get baseUrl(): string;
    get manufacturer(): any;
    get model(): any;
    get serialNumber(): any;
    get address(): string;
    get protocol(): string;
    get uniqueName(): string;
    get commands(): Array<string>;
    hasCommand(name: string): boolean;
    hasState(name: string): boolean;
    hasSensor(widget: string): boolean;
    isMainDevice(): boolean;
    isSensorOf(device: Device): boolean;
    addSensor(device: Device): void;
    getState(stateName: any): State | null;
    get(stateName: any): any | null;
    getNumber(stateName: any): number;
}
//# sourceMappingURL=Device.d.ts.map