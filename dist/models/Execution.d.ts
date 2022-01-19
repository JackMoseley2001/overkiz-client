/// <reference types="node" />
import Action from './Action';
import { EventEmitter } from 'events';
export declare enum ExecutionState {
    INITIALIZED = "INITIALIZED",
    NOT_TRANSMITTED = "NOT_TRANSMITTED",
    TRANSMITTED = "TRANSMITTED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    TIMED_OUT = "TIMED_OUT"
}
export declare class ExecutionError extends Error {
    readonly state: any;
    constructor(state: any, error: any);
}
export interface ExecutionStateEvent {
    readonly timestamp: number;
    readonly setupOID: any;
    readonly execId: any;
    readonly newState: ExecutionState;
    readonly ownerKey: any;
    readonly type: number;
    readonly subType: number;
    readonly oldState: ExecutionState;
    readonly timeToNextState: number;
    readonly name: any;
}
export default class Execution extends EventEmitter {
    label: string;
    actions: Action[];
    metadata: null;
    constructor(label: string, action?: Action);
    addAction(action: Action): void;
    onStateUpdate(state: ExecutionState, event: Record<string, any> | null): void;
}
//# sourceMappingURL=Execution.d.ts.map