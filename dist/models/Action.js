"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
class Action extends events_1.EventEmitter {
    constructor(deviceURL, commands) {
        super();
        this.deviceURL = deviceURL;
        this.commands = [];
        this.commands.push(...commands);
    }
    addCommands(commands) {
        this.commands.forEach(command => {
            const existing = this.commands.find((cmd) => cmd.name === command.name);
            if (existing) {
                existing.parameters = command.parameters;
            }
            else {
                this.commands.push(command);
            }
        });
    }
    toJSON() {
        return {
            deviceURL: this.deviceURL,
            commands: this.commands,
        };
    }
}
exports.default = Action;
//# sourceMappingURL=Action.js.map