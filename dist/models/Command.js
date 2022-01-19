"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Command {
    constructor(name, parameters) {
        this.type = 1;
        this.name = '';
        this.parameters = [];
        this.name = name;
        if (parameters === undefined) {
            parameters = [];
        }
        else if (!Array.isArray(parameters)) {
            parameters = [parameters];
        }
        this.parameters = parameters;
    }
}
exports.default = Command;
//# sourceMappingURL=Command.js.map