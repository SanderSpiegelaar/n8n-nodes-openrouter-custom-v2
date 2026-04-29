"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenrouterLlm = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const VALID_MESSAGE_ROLES = ['system', 'user', 'assistant'];
const SUPPORTED_MODEL_VARIANTS = [
    ':exacto',
    ':extended',
    ':floor',
    ':free',
    ':nitro',
    ':online',
];
class OpenrouterLlm {
    constructor() {
        this.description = {
            displayName: 'Openrouter LLM',
            name: 'openrouterLlm',
            icon: { light: 'file:openrouter.svg', dark: 'file:openrouter.dark.svg' },
            group: ['transform'],
            version: 1,
            subtitle: '={{$parameter["model"]}}',
            description: 'Send prompts to OpenRouter chat completion models',
            defaults: {
                name: 'Openrouter LLM',
            },
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            usableAsTool: true,
            credentials: [
                {
                    name: 'openRouterApi',
                    required: true,
                },
            ],
            properties: [
                {
                    displayName: 'Model',
                    name: 'model',
                    type: 'resourceLocator',
                    default: { mode: 'list', value: 'openai/gpt-4o-mini' },
                    required: true,
                    modes: [
                        {
                            displayName: 'From List',
                            name: 'list',
                            type: 'list',
                            typeOptions: {
                                searchListMethod: 'getOpenRouterModels',
                                searchable: true,
                            },
                        },
                        {
                            displayName: 'ID',
                            name: 'id',
                            type: 'string',
                        },
                    ],
                    description: 'OpenRouter model ID to use for the chat completion',
                },
                {
                    displayName: 'Model Variant',
                    name: 'modelVariant',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        {
                            name: 'Exacto',
                            value: ':exacto',
                            description: 'Prefer OpenRouter-curated providers for stronger tool-calling quality',
                            action: 'Use Exacto routing',
                        },
                        {
                            name: 'Extended',
                            value: ':extended',
                            description: 'Use extended context model variants where available',
                            action: 'Use extended context',
                        },
                        {
                            name: 'Floor',
                            value: ':floor',
                            description: 'Use the floor routing variant',
                            action: 'Use floor routing',
                        },
                        {
                            name: 'Free',
                            value: ':free',
                            description: 'Use free model variants where available',
                            action: 'Use free variant',
                        },
                        {
                            name: 'Nitro',
                            value: ':nitro',
                            description: 'Prefer high-throughput providers',
                            action: 'Use Nitro routing',
                        },
                        {
                            name: 'None',
                            value: '',
                            description: 'Use the model ID without adding a variant',
                            action: 'Use no model variant',
                        },
                        {
                            name: 'Online',
                            value: ':online',
                            description: 'Use online-enabled model variants where available',
                            action: 'Use online variant',
                        },
                    ],
                    default: '',
                    description: 'Optional OpenRouter model variant to append to the primary model ID',
                },
                {
                    displayName: 'Fallback Models',
                    name: 'fallbackModels',
                    type: 'fixedCollection',
                    placeholder: 'Add Fallback Model',
                    default: {},
                    typeOptions: {
                        multipleValues: true,
                    },
                    options: [
                        {
                            displayName: 'Values',
                            name: 'values',
                            values: [
                                {
                                    displayName: 'Model ID',
                                    name: 'model',
                                    type: 'string',
                                    default: '',
                                    required: true,
                                    description: 'Fallback model or preset ID to pass to OpenRouter exactly as entered',
                                },
                            ],
                        },
                    ],
                    description: 'Fallback models to send in OpenRouter models order after the primary model',
                },
                {
                    displayName: 'Prompt Mode',
                    name: 'promptMode',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        {
                            name: 'Messages JSON',
                            value: 'messagesJson',
                            description: 'Send an array of chat messages from JSON',
                            action: 'Send messages from JSON',
                        },
                        {
                            name: 'Single Prompt',
                            value: 'single',
                            description: 'Send one compact user prompt',
                            action: 'Send a single prompt',
                        },
                        {
                            name: 'System and User',
                            value: 'systemUser',
                            description: 'Send an optional system message and one required user prompt',
                            action: 'Send a system and user prompt',
                        },
                    ],
                    default: 'systemUser',
                    description: 'How to assemble the chat messages sent to OpenRouter',
                },
                {
                    displayName: 'System Message',
                    name: 'systemMessage',
                    type: 'string',
                    typeOptions: {
                        rows: 3,
                    },
                    default: '',
                    displayOptions: {
                        show: {
                            promptMode: ['systemUser'],
                        },
                    },
                    description: 'Optional system message to prepend to the request',
                },
                {
                    displayName: 'User Prompt',
                    name: 'prompt',
                    type: 'string',
                    typeOptions: {
                        rows: 4,
                    },
                    default: '',
                    required: true,
                    displayOptions: {
                        show: {
                            promptMode: ['systemUser'],
                        },
                    },
                    description: 'User message to send to the selected model',
                },
                {
                    displayName: 'Prompt',
                    name: 'singlePrompt',
                    type: 'string',
                    typeOptions: {
                        rows: 4,
                    },
                    default: '',
                    required: true,
                    displayOptions: {
                        show: {
                            promptMode: ['single'],
                        },
                    },
                    description: 'Single user message to send to the selected model',
                },
                {
                    displayName: 'Messages JSON',
                    name: 'messagesJson',
                    type: 'json',
                    default: '[]',
                    required: true,
                    displayOptions: {
                        show: {
                            promptMode: ['messagesJson'],
                        },
                    },
                    description: 'Array of chat messages with role and content. Roles can be system, user, or assistant.',
                },
                {
                    displayName: 'Temperature',
                    name: 'temperature',
                    type: 'number',
                    typeOptions: {
                        minValue: 0,
                        maxValue: 2,
                        numberPrecision: 2,
                    },
                    default: 0.7,
                    description: 'Sampling temperature to send to OpenRouter',
                },
                {
                    displayName: 'Max Tokens',
                    name: 'maxTokens',
                    type: 'number',
                    typeOptions: {
                        minValue: 1,
                    },
                    default: 1024,
                    description: 'Maximum number of tokens to generate',
                },
                {
                    displayName: 'Generation',
                    name: 'generation',
                    type: 'collection',
                    placeholder: 'Add Generation Option',
                    default: {},
                    options: [
                        {
                            displayName: 'Frequency Penalty',
                            name: 'frequencyPenalty',
                            type: 'number',
                            default: '',
                            description: 'Penalty for repeated token frequency',
                        },
                        {
                            displayName: 'Presence Penalty',
                            name: 'presencePenalty',
                            type: 'number',
                            default: '',
                            description: 'Penalty for already-present tokens',
                        },
                        {
                            displayName: 'Prompt Cache Key',
                            name: 'promptCacheKey',
                            type: 'string',
                            default: '',
                            description: 'Stable cache key for OpenRouter prompt caching',
                        },
                        {
                            displayName: 'Seed',
                            name: 'seed',
                            type: 'number',
                            default: '',
                            description: 'Integer seed for deterministic sampling where supported',
                        },
                        {
                            displayName: 'Stop',
                            name: 'stop',
                            type: 'string',
                            default: '',
                            description: 'Stop sequence to send to OpenRouter',
                        },
                        {
                            displayName: 'Top P',
                            name: 'topP',
                            type: 'number',
                            default: '',
                            typeOptions: {
                                minValue: 0,
                                maxValue: 1,
                                numberPrecision: 2,
                            },
                            description: 'Nucleus sampling value',
                        },
                    ],
                },
                {
                    displayName: 'Reasoning',
                    name: 'reasoning',
                    type: 'collection',
                    placeholder: 'Add Reasoning Option',
                    default: {},
                    options: [
                        {
                            displayName: 'Exclude Reasoning',
                            name: 'exclude',
                            type: 'boolean',
                            default: false,
                            description: 'Whether to exclude reasoning tokens from the response',
                        },
                        {
                            displayName: 'Effort',
                            name: 'effort',
                            type: 'options',
                            options: [
                                { name: 'High', value: 'high' },
                                { name: 'Low', value: 'low' },
                                { name: 'Medium', value: 'medium' },
                                { name: 'Minimal', value: 'minimal' },
                                { name: 'Xhigh', value: 'xhigh' },
                            ],
                            default: 'medium',
                            description: 'Reasoning effort to send when reasoning mode is Effort',
                        },
                        {
                            displayName: 'Max Tokens',
                            name: 'maxTokens',
                            type: 'number',
                            default: '',
                            description: 'Reasoning token budget to send when reasoning mode is Token Budget',
                        },
                        {
                            displayName: 'Mode',
                            name: 'mode',
                            type: 'options',
                            options: [
                                { name: 'Default Enabled', value: 'defaultEnabled' },
                                { name: 'Effort', value: 'effort' },
                                { name: 'Off', value: 'off' },
                                { name: 'Token Budget', value: 'tokenBudget' },
                            ],
                            default: 'off',
                            description: 'How to control OpenRouter reasoning',
                        },
                    ],
                },
                {
                    displayName: 'Advanced Sampling',
                    name: 'advancedSampling',
                    type: 'collection',
                    placeholder: 'Add Sampling Option',
                    default: {},
                    options: [
                        {
                            displayName: 'Min P',
                            name: 'minP',
                            type: 'number',
                            default: '',
                            description: 'Minimum probability threshold',
                        },
                        {
                            displayName: 'Repetition Penalty',
                            name: 'repetitionPenalty',
                            type: 'number',
                            default: '',
                            description: 'Penalty for repeated text',
                        },
                        {
                            displayName: 'Top A',
                            name: 'topA',
                            type: 'number',
                            default: '',
                            description: 'Top-a sampling value',
                        },
                        {
                            displayName: 'Top K',
                            name: 'topK',
                            type: 'number',
                            default: '',
                            description: 'Top-k sampling value',
                        },
                        {
                            displayName: 'Transforms',
                            name: 'transforms',
                            type: 'multiOptions',
                            options: [{ name: 'Middle Out', value: 'middle-out' }],
                            default: [],
                            description: 'OpenRouter message transforms to apply',
                        },
                    ],
                },
                {
                    displayName: 'Response Healing',
                    name: 'responseHealing',
                    type: 'boolean',
                    default: false,
                    description: 'Whether to enable the OpenRouter response-healing plugin',
                },
                {
                    displayName: 'Session',
                    name: 'session',
                    type: 'collection',
                    placeholder: 'Add Session Option',
                    default: {},
                    options: [
                        {
                            displayName: 'Session ID',
                            name: 'sessionId',
                            type: 'string',
                            default: '',
                            description: 'OpenRouter session identifier',
                        },
                    ],
                },
            ],
        };
        this.methods = {
            listSearch: {
                async getOpenRouterModels(filter) {
                    var _a, _b;
                    const credentials = await this.getCredentials('openRouterApi');
                    const baseUrl = credentials.baseUrl.replace(/\/+$/, '');
                    const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'openRouterApi', {
                        method: 'GET',
                        baseURL: baseUrl,
                        url: '/models',
                        json: true,
                    }));
                    const normalizedFilter = (_a = filter === null || filter === void 0 ? void 0 : filter.toLowerCase()) !== null && _a !== void 0 ? _a : '';
                    const results = ((_b = response.data) !== null && _b !== void 0 ? _b : [])
                        .filter((model) => isTextModel(model))
                        .filter((model) => model.id !== 'openrouter/auto')
                        .filter((model) => {
                        var _a;
                        if (normalizedFilter === '') {
                            return true;
                        }
                        return (model.id.toLowerCase().includes(normalizedFilter) ||
                            ((_a = model.name) !== null && _a !== void 0 ? _a : '').toLowerCase().includes(normalizedFilter));
                    })
                        .map((model) => {
                        var _a;
                        return ({
                            name: (_a = model.name) !== null && _a !== void 0 ? _a : model.id,
                            value: model.id,
                        });
                    });
                    return { results };
                },
            },
        };
    }
    async execute() {
        var _a, _b, _c, _d;
        const items = this.getInputData();
        const returnData = [];
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const credentials = await this.getCredentials('openRouterApi');
                const baseUrl = credentials.baseUrl.replace(/\/+$/, '');
                const body = buildRequestBody(this, itemIndex);
                const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'openRouterApi', {
                    method: 'POST',
                    baseURL: baseUrl,
                    url: '/chat/completions',
                    json: true,
                    body,
                }));
                returnData.push({
                    json: {
                        text: (_d = (_c = (_b = (_a = response.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) !== null && _d !== void 0 ? _d : '',
                        response,
                    },
                    pairedItem: { item: itemIndex },
                });
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: error instanceof Error ? error.message : String(error),
                        },
                        pairedItem: { item: itemIndex },
                    });
                    continue;
                }
                if (error instanceof n8n_workflow_1.NodeOperationError) {
                    throw error;
                }
                throw new n8n_workflow_1.NodeApiError(this.getNode(), { message: error instanceof Error ? error.message : String(error) }, { itemIndex });
            }
        }
        return [returnData];
    }
}
exports.OpenrouterLlm = OpenrouterLlm;
function buildRequestBody(executeFunctions, itemIndex) {
    const body = {
        ...buildModelPayload(executeFunctions, itemIndex),
        messages: buildMessages(executeFunctions, itemIndex),
    };
    const temperature = executeFunctions.getNodeParameter('temperature', itemIndex);
    const maxTokens = executeFunctions.getNodeParameter('maxTokens', itemIndex);
    const generation = executeFunctions.getNodeParameter('generation', itemIndex, {});
    const advancedSampling = executeFunctions.getNodeParameter('advancedSampling', itemIndex, {});
    const reasoning = buildReasoning(executeFunctions, executeFunctions.getNodeParameter('reasoning', itemIndex, {}));
    const responseHealing = executeFunctions.getNodeParameter('responseHealing', itemIndex, false);
    const session = executeFunctions.getNodeParameter('session', itemIndex, {});
    if (!isUnset(temperature)) {
        body.temperature = temperature;
    }
    if (!isUnset(maxTokens)) {
        body.max_tokens = validatePositiveNumber(executeFunctions, maxTokens, 'Max Tokens');
    }
    addOptionalNumber(body, 'top_p', generation.topP);
    addOptionalNumber(body, 'frequency_penalty', generation.frequencyPenalty);
    addOptionalNumber(body, 'presence_penalty', generation.presencePenalty);
    addOptionalText(executeFunctions, body, 'prompt_cache_key', generation.promptCacheKey, 'Prompt Cache Key');
    addOptionalNumber(body, 'seed', generation.seed);
    if (!isUnset(generation.stop)) {
        body.stop = generation.stop;
    }
    if (reasoning !== undefined) {
        body.reasoning = reasoning;
    }
    if (!isUnset(advancedSampling.topK)) {
        body.top_k = validatePositiveNumber(executeFunctions, advancedSampling.topK, 'Top K');
    }
    if (!isUnset(advancedSampling.repetitionPenalty)) {
        body.repetition_penalty = validatePositiveNumber(executeFunctions, advancedSampling.repetitionPenalty, 'Repetition Penalty');
    }
    if (!isUnset(advancedSampling.minP)) {
        body.min_p = validateRange(executeFunctions, advancedSampling.minP, 'Min P');
    }
    if (!isUnset(advancedSampling.topA)) {
        body.top_a = validateRange(executeFunctions, advancedSampling.topA, 'Top A');
    }
    if (Array.isArray(advancedSampling.transforms) && advancedSampling.transforms.length > 0) {
        body.transforms = advancedSampling.transforms;
    }
    if (responseHealing) {
        body.plugins = [{ id: 'response-healing' }];
    }
    addOptionalText(executeFunctions, body, 'session_id', session.sessionId, 'Session ID');
    return body;
}
function buildModelPayload(executeFunctions, itemIndex) {
    const model = resolvePrimaryModel(executeFunctions, itemIndex);
    const fallbackModels = resolveFallbackModels(executeFunctions, itemIndex);
    if (fallbackModels.length > 0) {
        return {
            models: [model, ...fallbackModels],
        };
    }
    return { model };
}
function buildReasoning(executeFunctions, reasoning) {
    var _a, _b;
    const mode = (_a = reasoning.mode) !== null && _a !== void 0 ? _a : 'off';
    if (mode === 'off') {
        return undefined;
    }
    const output = {};
    if (mode === 'effort') {
        output.effort = (_b = reasoning.effort) !== null && _b !== void 0 ? _b : 'medium';
    }
    if (mode === 'tokenBudget') {
        output.max_tokens = validatePositiveNumber(executeFunctions, reasoning.maxTokens, 'Reasoning Max Tokens');
    }
    if (reasoning.exclude === true) {
        output.exclude = true;
    }
    return output;
}
function addOptionalNumber(body, wireName, value) {
    if (!isUnset(value)) {
        body[wireName] = value;
    }
}
function addOptionalText(executeFunctions, body, wireName, value, label) {
    if (isUnset(value)) {
        return;
    }
    body[wireName] = validateNonEmptyText(executeFunctions, value, label);
}
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
function isUnset(value) {
    return value === undefined || value === null || value === '';
}
function resolvePrimaryModel(executeFunctions, itemIndex) {
    var _a;
    const modelParameter = executeFunctions.getNodeParameter('model', itemIndex);
    const modelId = typeof modelParameter === 'string' ? modelParameter : ((_a = modelParameter.value) !== null && _a !== void 0 ? _a : '').toString();
    const modelVariant = executeFunctions.getNodeParameter('modelVariant', itemIndex, '');
    if (modelId.trim() === '') {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), 'Model ID must not be empty.');
    }
    if (modelVariant === '') {
        return modelId;
    }
    if (!SUPPORTED_MODEL_VARIANTS.includes(modelVariant)) {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), 'Unsupported model variant selected.');
    }
    return `${stripSupportedVariant(modelId)}${modelVariant}`;
}
function resolveFallbackModels(executeFunctions, itemIndex) {
    var _a;
    const fallbackModels = executeFunctions.getNodeParameter('fallbackModels', itemIndex, {});
    return ((_a = fallbackModels.values) !== null && _a !== void 0 ? _a : [])
        .map((fallback) => { var _a, _b; return (_b = (_a = fallback.model) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : ''; })
        .filter((model) => model !== '');
}
function stripSupportedVariant(modelId) {
    const supportedVariant = SUPPORTED_MODEL_VARIANTS.find((variant) => modelId.endsWith(variant));
    if (!supportedVariant) {
        return modelId;
    }
    return modelId.slice(0, -supportedVariant.length);
}
function isTextModel(model) {
    var _a;
    const outputModalities = (_a = model.architecture) === null || _a === void 0 ? void 0 : _a.output_modalities;
    return outputModalities === undefined || outputModalities.includes('text');
}
function buildMessages(executeFunctions, itemIndex) {
    const promptMode = executeFunctions.getNodeParameter('promptMode', itemIndex, 'systemUser');
    if (promptMode === 'single') {
        const singlePrompt = executeFunctions.getNodeParameter('singlePrompt', itemIndex);
        return [
            {
                role: 'user',
                content: validateNonEmptyText(executeFunctions, singlePrompt, 'Prompt'),
            },
        ];
    }
    if (promptMode === 'messagesJson') {
        const messagesJson = executeFunctions.getNodeParameter('messagesJson', itemIndex);
        return validateMessagesJson(executeFunctions, messagesJson);
    }
    const prompt = executeFunctions.getNodeParameter('prompt', itemIndex);
    const systemMessage = executeFunctions.getNodeParameter('systemMessage', itemIndex, '');
    const messages = [];
    if (systemMessage.trim() !== '') {
        messages.push({
            role: 'system',
            content: systemMessage,
        });
    }
    messages.push({
        role: 'user',
        content: validateNonEmptyText(executeFunctions, prompt, 'User Prompt'),
    });
    return messages;
}
function validateMessagesJson(executeFunctions, value) {
    let parsedValue = value;
    if (typeof value === 'string') {
        try {
            parsedValue = JSON.parse(value);
        }
        catch {
            throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), 'Messages JSON must be valid JSON.');
        }
    }
    if (!Array.isArray(parsedValue)) {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), 'Messages JSON must resolve to an array.');
    }
    if (parsedValue.length === 0) {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), 'Messages JSON must contain at least one message.');
    }
    return parsedValue.map((message, index) => validateMessage(executeFunctions, message, index));
}
function validateMessage(executeFunctions, message, index) {
    const messageNumber = index + 1;
    if (message === null || typeof message !== 'object' || Array.isArray(message)) {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `Message ${messageNumber} must be an object.`);
    }
    const candidate = message;
    const role = candidate.role;
    if (typeof role !== 'string' ||
        !VALID_MESSAGE_ROLES.includes(role)) {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `Message ${messageNumber} role must be one of system, user, assistant.`);
    }
    return {
        role: role,
        content: validateNonEmptyText(executeFunctions, candidate.content, `Message ${messageNumber} content`),
    };
}
function validateNonEmptyText(executeFunctions, value, label) {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `${label} must not be empty.`);
    }
    return value;
}
//# sourceMappingURL=OpenrouterLlm.node.js.map