"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionError = exports.ExecutionState = void 0;
const events_1 = require("events");
var ExecutionState;
(function (ExecutionState) {
    ExecutionState["INITIALIZED"] = "INITIALIZED";
    ExecutionState["NOT_TRANSMITTED"] = "NOT_TRANSMITTED";
    ExecutionState["TRANSMITTED"] = "TRANSMITTED";
    ExecutionState["IN_PROGRESS"] = "IN_PROGRESS";
    ExecutionState["COMPLETED"] = "COMPLETED";
    ExecutionState["FAILED"] = "FAILED";
    ExecutionState["TIMED_OUT"] = "TIMED_OUT";
})(ExecutionState = exports.ExecutionState || (exports.ExecutionState = {}));
class ExecutionError extends Error {
    constructor(state, error) {
        super(error);
        this.state = state;
    }
}
exports.ExecutionError = ExecutionError;
class Execution extends events_1.EventEmitter {
    constructor(label, action) {
        super();
        this.label = label;
        this.actions = [];
        this.metadata = null;
        if (action) {
            this.addAction(action);
        }
    }
    addAction(action) {
        this.actions.push(action);
    }
    onStateUpdate(state, event) {
        this.emit('update', state, event);
        if ((event === null || event === void 0 ? void 0 : event.failureType) && (event === null || event === void 0 ? void 0 : event.failedCommands)) {
            this.actions.forEach((action) => {
                const failure = event.failedCommands.find((c) => c.deviceURL === action.deviceURL);
                if (failure) {
                    action.emit('update', ExecutionState.FAILED, failure);
                }
                else {
                    action.emit('update', ExecutionState.COMPLETED);
                }
            });
        }
        else {
            this.actions.forEach((action) => action.emit('update', state, event));
        }
    }
}
exports.default = Execution;
//# sourceMappingURL=Execution.js.map