"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileStructuredOutputSchema = compileStructuredOutputSchema;
exports.extractStructuredJson = extractStructuredJson;
exports.validateStructuredOutput = validateStructuredOutput;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const WRAPPER_KEYS = new Set(['json', 'structured', 'output', 'response', 'result', 'data']);
const ajvInstance = (() => {
    const ajv = new ajv_1.default({ allErrors: true, strict: false, useDefaults: false, removeAdditional: false });
    (0, ajv_formats_1.default)(ajv);
    return ajv;
})();
function compileStructuredOutputSchema(schema) {
    return ajvInstance.compile(schema);
}
function extractStructuredJson(rawText) {
    const candidates = collectJsonCandidates(rawText);
    const errors = [];
    for (const candidate of candidates) {
        try {
            return { ok: true, value: JSON.parse(candidate) };
        }
        catch (error) {
            errors.push(error instanceof Error ? error.message : String(error));
        }
    }
    return { ok: false, errors: errors.length > 0 ? errors : ['No JSON value found in response.'] };
}
function validateStructuredOutput(mode, rawText, compiledValidator) {
    var _a;
    const extracted = extractStructuredJson(rawText);
    if (!extracted.ok) {
        return extracted;
    }
    const parsed = unwrapStructuredValue(extracted.value);
    if (mode === 'json_object') {
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { ok: false, errors: ['Response must be a non-null JSON object.'] };
        }
        return { ok: true, value: parsed };
    }
    if (mode === 'json_schema' && compiledValidator !== undefined) {
        if (compiledValidator(parsed)) {
            return { ok: true, value: parsed };
        }
        const errors = ((_a = compiledValidator.errors) !== null && _a !== void 0 ? _a : []).map(formatAjvError);
        return { ok: false, errors };
    }
    return { ok: true, value: parsed };
}
function collectJsonCandidates(rawText) {
    const trimmed = rawText.trim();
    const candidates = [];
    if (trimmed !== '') {
        candidates.push(trimmed);
    }
    for (const fenced of extractFencedJson(trimmed)) {
        if (!candidates.includes(fenced)) {
            candidates.push(fenced);
        }
    }
    for (const embedded of extractBalancedJsonValues(trimmed)) {
        if (!candidates.includes(embedded)) {
            candidates.push(embedded);
        }
    }
    return candidates;
}
function extractFencedJson(text) {
    var _a, _b;
    const blocks = [];
    const fencePattern = /```(?:json|JSON)?\s*([\s\S]*?)\s*```/g;
    let match;
    while ((match = fencePattern.exec(text)) !== null) {
        const block = (_b = (_a = match[1]) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : '';
        if (block !== '') {
            blocks.push(block);
        }
    }
    return blocks;
}
function extractBalancedJsonValues(text) {
    const values = [];
    for (let index = 0; index < text.length; index++) {
        const char = text[index];
        if (char !== '{' && char !== '[' && char !== '"' && !isPrimitiveStart(text, index)) {
            continue;
        }
        const end = findJsonEnd(text, index);
        if (end !== -1) {
            values.push(text.slice(index, end + 1).trim());
        }
    }
    return values;
}
function findJsonEnd(text, start) {
    for (let end = start + 1; end <= text.length; end++) {
        const candidate = text.slice(start, end).trim();
        try {
            JSON.parse(candidate);
            return end - 1;
        }
        catch {
        }
    }
    return -1;
}
function isPrimitiveStart(text, index) {
    var _a;
    return (text.startsWith('true', index) ||
        text.startsWith('false', index) ||
        text.startsWith('null', index) ||
        /[\d-]/.test((_a = text[index]) !== null && _a !== void 0 ? _a : ''));
}
function unwrapStructuredValue(value) {
    let current = value;
    for (let depth = 0; depth < 3; depth++) {
        if (current === null || typeof current !== 'object' || Array.isArray(current)) {
            return current;
        }
        const entries = Object.entries(current);
        if (entries.length !== 1) {
            return current;
        }
        const [key, wrappedValue] = entries[0];
        if (!WRAPPER_KEYS.has(key)) {
            return current;
        }
        current = wrappedValue;
    }
    return current;
}
function formatAjvError(error) {
    var _a, _b, _c;
    const path = (_a = error.instancePath) !== null && _a !== void 0 ? _a : '';
    return path === '' ? ((_b = error.message) !== null && _b !== void 0 ? _b : 'invalid') : `${path} ${(_c = error.message) !== null && _c !== void 0 ? _c : 'invalid'}`;
}
//# sourceMappingURL=StructuredOutputParser.js.map