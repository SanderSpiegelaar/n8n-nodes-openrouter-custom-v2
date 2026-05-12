"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePositiveNumber = validatePositiveNumber;
exports.validateRange = validateRange;
exports.validateNonEmptyText = validateNonEmptyText;
exports.isUnset = isUnset;
const n8n_workflow_1 = require("n8n-workflow");
function validatePositiveNumber(executeFunctions, value, label) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `${label} must be greater than 0.`);
    }
    return numericValue;
}
function validateRange(executeFunctions, value, label) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 1) {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `${label} must be between 0 and 1.`);
    }
    return numericValue;
}
function validateNonEmptyText(executeFunctions, value, label) {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `${label} must not be empty.`);
    }
    return value;
}
function isUnset(value) {
    return value === undefined || value === null || value === '';
}
//# sourceMappingURL=validation.js.map