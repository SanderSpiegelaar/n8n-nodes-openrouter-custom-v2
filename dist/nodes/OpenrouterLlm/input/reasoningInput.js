"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildReasoning = buildReasoning;
const validation_1 = require("./validation");
function buildReasoning(executeFunctions, reasoning) {
    var _a, _b;
    const mode = (_a = reasoning.mode) !== null && _a !== void 0 ? _a : 'off';
    const exclude = reasoning.exclude === true;
    if (mode === 'off' && !exclude) {
        return undefined;
    }
    const output = {};
    if (mode === 'effort') {
        output.effort = (_b = reasoning.effort) !== null && _b !== void 0 ? _b : 'medium';
    }
    if (mode === 'tokenBudget') {
        output.max_tokens = (0, validation_1.validatePositiveNumber)(executeFunctions, reasoning.maxTokens, 'Reasoning Max Tokens');
    }
    if (exclude) {
        output.exclude = true;
    }
    return output;
}
//# sourceMappingURL=reasoningInput.js.map