/// <reference types="node" />
import { EventEmitter } from 'events';
import Command from './Command';
export default class Action extends EventEmitter {
    readonly deviceURL: string;
    commands: Command[];
    constructor(deviceURL: string, commands: Array<Command>);
    addCommands(commands: Array<Command>): void;
    toJSON(): {
        deviceURL: string;
        commands: Command[];
    };
}
//# sourceMappingURL=Action.d.ts.map