"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_REPAIR_PROMPT_TEMPLATE = exports.DEFAULT_REPAIR_REASONING_EFFORT = exports.DEFAULT_REPAIR_TEMPERATURE = exports.DEFAULT_REPAIR_MODEL = void 0;
exports.compileStructuredOutputSchema = compileStructuredOutputSchema;
exports.extractStructuredJson = extractStructuredJson;
exports.evaluateStructuredOutput = evaluateStructuredOutput;
exports.evaluateStructuredOutputWithRepair = evaluateStructuredOutputWithRepair;
exports.buildStructuredOutputRepairRequestBody = buildStructuredOutputRepairRequestBody;
exports.buildStructuredOutputRepairPrompt = buildStructuredOutputRepairPrompt;
exports.validateStructuredOutputRepairPromptTemplate = validateStructuredOutputRepairPromptTemplate;
exports.validateStructuredOutput = validateStructuredOutput;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
exports.DEFAULT_REPAIR_MODEL = 'openai/gpt-oss-120b:nitro';
exports.DEFAULT_REPAIR_TEMPERATURE = 0.1;
exports.DEFAULT_REPAIR_REASONING_EFFORT = 'none';
exports.DEFAULT_REPAIR_PROMPT_TEMPLATE = `You repair assistant output so it satisfies structured output validation.\n\nInstructions:\n{instructions}\n\nInvalid completion:\n{completion}\n\nValidation error:\n{error}\n\nReturn only the corrected JSON value. Do not include markdown fences or commentary.`;
const REQUIRED_REPAIR_PROMPT_PLACEHOLDERS = ['instructions', 'completion', 'error'];
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
    const messages = errors.length > 0 ? errors : ['No JSON value found in response.'];
    return {
        ok: false,
        errors: messages,
        details: messages.map((message) => ({ message, path: '$' })),
    };
}
function evaluateStructuredOutput(config, initialText, initialResponse) {
    return evaluateInitialStructuredOutput(config, initialText, initialResponse);
}
async function evaluateStructuredOutputWithRepair(config, initialText, initialResponse) {
    const initialOutcome = evaluateInitialStructuredOutput(config, initialText, initialResponse);
    if (initialOutcome.ok || config.repair === undefined || config.repair.maxAttempts <= 0) {
        return initialOutcome;
    }
    let validationErrors = initialOutcome.error.validationErrors;
    let validationDetails = initialOutcome.error.validationDetails;
    let latestRepairText = '';
    let latestResponse = initialResponse;
    for (let repairAttempt = 1; repairAttempt <= config.repair.maxAttempts; repairAttempt++) {
        const requestBody = buildStructuredOutputRepairRequestBody(config, repairAttempt + 1, {
            completion: latestRepairText || initialText,
            errors: validationErrors,
        });
        const repairResponse = await config.repair.send(requestBody);
        latestRepairText = repairResponse.text;
        latestResponse = repairResponse.response;
        const validation = validateStructuredOutput(config.mode, latestRepairText, config.compiledValidator);
        if (validation.ok) {
            return {
                ok: true,
                text: stringifyStructuredValue(validation.value),
                structured: validation.value,
                response: latestResponse,
                repair: {
                    repaired: true,
                    repairAttempts: repairAttempt,
                    latestRepairText,
                },
            };
        }
        validationErrors = validation.errors;
        validationDetails = validation.details;
    }
    return {
        ok: false,
        error: {
            message: `Structured output validation failed: ${validationErrors.join('; ')}`,
            validationErrors,
            validationDetails,
            originalRawText: initialText,
            repair: {
                repaired: false,
                repairAttempts: config.repair.maxAttempts,
                latestRepairText,
            },
        },
    };
}
function evaluateInitialStructuredOutput(config, initialText, initialResponse) {
    if (config.mode === 'text') {
        return {
            ok: true,
            text: initialText,
            structured: null,
            response: initialResponse,
            repair: createNoRepairMetadata(),
        };
    }
    const validation = validateStructuredOutput(config.mode, initialText, config.compiledValidator);
    if (validation.ok) {
        return {
            ok: true,
            text: initialText,
            structured: validation.value,
            response: initialResponse,
            repair: createNoRepairMetadata(),
        };
    }
    return {
        ok: false,
        error: {
            message: `Structured output validation failed: ${validation.errors.join('; ')}`,
            validationErrors: validation.errors,
            validationDetails: validation.details,
            originalRawText: initialText,
            repair: createNoRepairMetadata(),
        },
    };
}
function buildStructuredOutputRepairRequestBody(config, attempt, failure) {
    var _a, _b, _c, _d, _e;
    if (config.repair === undefined) {
        throw new Error('Structured Output Repair config is required.');
    }
    const model = (_a = config.repair.model) !== null && _a !== void 0 ? _a : exports.DEFAULT_REPAIR_MODEL;
    const body = {
        model,
        messages: [
            {
                role: 'user',
                content: buildStructuredOutputRepairPrompt(config.mode, config.repair.promptTemplate, failure),
            },
        ],
        temperature: (_b = config.repair.temperature) !== null && _b !== void 0 ? _b : exports.DEFAULT_REPAIR_TEMPERATURE,
        reasoning: { effort: (_c = config.repair.reasoningEffort) !== null && _c !== void 0 ? _c : exports.DEFAULT_REPAIR_REASONING_EFFORT },
        response_format: { type: 'json_object' },
    };
    const metadata = (_e = (_d = config.repair).metadata) === null || _e === void 0 ? void 0 : _e.call(_d, attempt, model);
    if (metadata !== undefined) {
        body.metadata = metadata;
    }
    return body;
}
function buildStructuredOutputRepairPrompt(mode, promptTemplate, failure) {
    const template = (promptTemplate === null || promptTemplate === void 0 ? void 0 : promptTemplate.trim()) ? promptTemplate : exports.DEFAULT_REPAIR_PROMPT_TEMPLATE;
    validateStructuredOutputRepairPromptTemplate(template);
    const instructions = mode === 'json_schema'
        ? 'Repair the completion so it validates against the configured JSON Schema.'
        : 'Repair the completion so it is a non-array JSON object.';
    return template
        .split('{instructions}')
        .join(instructions)
        .split('{completion}')
        .join(failure.completion)
        .split('{error}')
        .join(failure.errors.slice(0, 5).join('\n'));
}
function validateStructuredOutputRepairPromptTemplate(template) {
    for (const placeholder of REQUIRED_REPAIR_PROMPT_PLACEHOLDERS) {
        if (!template.includes(`{${placeholder}}`)) {
            throw new Error(`Repair Prompt Template is missing required placeholder {${placeholder}}.`);
        }
    }
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
            const message = 'Response must be a non-null JSON object.';
            return { ok: false, errors: [message], details: [{ message, path: '$' }] };
        }
        return { ok: true, value: parsed };
    }
    if (mode === 'json_schema' && compiledValidator !== undefined) {
        if (compiledValidator(parsed)) {
            return { ok: true, value: parsed };
        }
        const details = ((_a = compiledValidator.errors) !== null && _a !== void 0 ? _a : []).map(formatAjvError);
        return { ok: false, errors: details.map((detail) => detail.message), details };
    }
    return { ok: true, value: parsed };
}
function createNoRepairMetadata() {
    return {
        repaired: false,
        repairAttempts: 0,
        latestRepairText: '',
    };
}
function stringifyStructuredValue(value) {
    return JSON.stringify(value);
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
    var _a;
    const path = toReadablePath((_a = error.instancePath) !== null && _a !== void 0 ? _a : '');
    const message = formatReadableAjvMessage(error, path);
    return {
        message,
        path,
        keyword: error.keyword,
        schemaPath: error.schemaPath,
        params: error.params,
    };
}
function toReadablePath(instancePath) {
    if (instancePath === '') {
        return '$';
    }
    return `$${instancePath.replace(/\/(\d+|[^/]+)/g, (_match, segment) => {
        const decoded = segment.replace(/~1/g, '/').replace(/~0/g, '~');
        return /^\d+$/.test(decoded) ? `[${decoded}]` : `.${decoded}`;
    })}`;
}
function formatReadableAjvMessage(error, path) {
    var _a;
    const baseMessage = (_a = error.message) !== null && _a !== void 0 ? _a : 'is invalid';
    if (error.keyword === 'required' && 'missingProperty' in error.params) {
        return `${path} is missing required property "${String(error.params.missingProperty)}".`;
    }
    if (error.keyword === 'additionalProperties' && 'additionalProperty' in error.params) {
        return `${path} includes unsupported property "${String(error.params.additionalProperty)}".`;
    }
    return `${path} ${baseMessage}.`;
}
//# sourceMappingURL=StructuredOutputParser.js.map