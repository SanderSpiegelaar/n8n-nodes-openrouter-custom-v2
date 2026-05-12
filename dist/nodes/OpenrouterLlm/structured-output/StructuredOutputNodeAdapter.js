"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileSchema = compileSchema;
exports.normalizeJsonSchemaResponseFormat = normalizeJsonSchemaResponseFormat;
exports.isOpenAiJsonSchemaWrapper = isOpenAiJsonSchemaWrapper;
exports.buildStructuredOutputError = buildStructuredOutputError;
exports.getStructuredOutputDiagnosticFields = getStructuredOutputDiagnosticFields;
exports.truncateForError = truncateForError;
const n8n_workflow_1 = require("n8n-workflow");
const StructuredOutputParser_1 = require("./StructuredOutputParser");
function compileSchema(executeFunctions, itemIndex) {
    const raw = executeFunctions.getNodeParameter('jsonSchema', itemIndex);
    let parsed = raw;
    if (typeof raw === 'string') {
        try {
            parsed = JSON.parse(raw);
        }
        catch (error) {
            throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `JSON Schema parse failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    const responseFormat = normalizeJsonSchemaResponseFormat(parsed);
    try {
        return {
            validator: (0, StructuredOutputParser_1.compileStructuredOutputSchema)(responseFormat.schema),
            responseFormat,
        };
    }
    catch (error) {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `JSON Schema compile failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function normalizeJsonSchemaResponseFormat(parsed) {
    if (isOpenAiJsonSchemaWrapper(parsed)) {
        return {
            name: typeof parsed.name === 'string' && parsed.name.trim() !== '' ? parsed.name : 'response',
            schema: parsed.schema,
            strict: typeof parsed.strict === 'boolean' ? parsed.strict : true,
        };
    }
    return { name: 'response', schema: parsed, strict: true };
}
function isOpenAiJsonSchemaWrapper(value) {
    return (value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.prototype.hasOwnProperty.call(value, 'schema') &&
        (Object.prototype.hasOwnProperty.call(value, 'name') ||
            Object.prototype.hasOwnProperty.call(value, 'strict')));
}
function buildStructuredOutputError(executeFunctions, itemIndex, attempt, diagnostics) {
    const error = new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `Structured output validation failed after ${attempt} attempts: ${diagnostics.errors.join('; ')}. Raw model text: ${truncateForError(diagnostics.latestRepairText || diagnostics.originalRawText)}`, {
        itemIndex,
        description: JSON.stringify({
            validationErrors: diagnostics.errors,
            validationDetails: diagnostics.details,
            originalOutputText: truncateForError(diagnostics.originalRawText),
            latestRepairText: diagnostics.latestRepairText === ''
                ? undefined
                : truncateForError(diagnostics.latestRepairText),
        }),
    });
    return Object.assign(error, { structuredOutputDiagnostics: diagnostics });
}
function getStructuredOutputDiagnosticFields(error) {
    const diagnostics = error === null || error === void 0 ? void 0 : error.structuredOutputDiagnostics;
    if (diagnostics === undefined) {
        return {};
    }
    return {
        structuredOutputValidationErrors: diagnostics.errors,
        structuredOutputValidationDetails: diagnostics.details,
        structuredOutputOriginalText: diagnostics.originalRawText,
        structuredOutputLatestRepairText: diagnostics.latestRepairText,
    };
}
function truncateForError(text) {
    const limit = 2000;
    return text.length <= limit ? text : `${text.slice(0, limit)}...[truncated]`;
}
//# sourceMappingURL=StructuredOutputNodeAdapter.js.map