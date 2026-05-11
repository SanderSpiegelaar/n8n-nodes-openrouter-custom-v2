"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenrouterLlm = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const StructuredOutputParser_1 = require("./StructuredOutputParser");
const OpenRouterModelCatalog_1 = require("./OpenRouterModelCatalog");
const OpenRouterExecution_1 = require("./OpenRouterExecution");
const OpenRouterExecutionInputBuilder_1 = require("./OpenRouterExecutionInputBuilder");
const OpenRouterRouting_1 = require("./OpenRouterRouting");
const PROTECTED_HEADERS = ['authorization', 'http-referer', 'x-title'];
const OPENROUTER_CUSTOM_CREDENTIAL_NAME = 'openRouterCustomV2Api';
const openRouterModelCatalogParameters = [
    {
        displayName: 'Model',
        name: 'model',
        type: 'resourceLocator',
        default: { mode: 'list', value: 'openai/gpt-oss-120b' },
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
        displayName: 'Model Options',
        name: 'modelOptions',
        type: 'collection',
        placeholder: 'Add Model Option',
        default: {},
        options: [
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
                                displayName: 'Model Name or ID',
                                name: 'model',
                                type: 'options',
                                typeOptions: {
                                    loadOptionsMethod: 'getOpenRouterModelOptions',
                                },
                                default: '',
                                required: true,
                                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                            },
                        ],
                    },
                ],
                description: 'Fallback models to send in OpenRouter models order after the primary model',
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
        ],
    },
];
const openRouterExecutionParameters = [
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
                displayName: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                typeOptions: {
                    minValue: 1,
                },
                default: '',
                description: 'Maximum number of tokens to generate. Omitted when empty.',
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
                displayName: 'Temperature',
                name: 'temperature',
                type: 'number',
                typeOptions: {
                    minValue: 0,
                    maxValue: 2,
                    numberPrecision: 2,
                },
                default: '',
                description: 'Sampling temperature to send to OpenRouter. Omitted when empty.',
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
        displayName: 'Integrations',
        name: 'integrations',
        type: 'collection',
        placeholder: 'Add Integration Option',
        default: {},
        options: [
            {
                displayName: 'Headers',
                name: 'headers',
                type: 'fixedCollection',
                placeholder: 'Add Header',
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
                                displayName: 'Name',
                                name: 'name',
                                type: 'string',
                                default: '',
                                description: 'Header name',
                            },
                            {
                                displayName: 'Value',
                                name: 'value',
                                type: 'string',
                                default: '',
                                description: 'Header value',
                            },
                        ],
                    },
                ],
                description: 'Custom request headers. Authorization and OpenRouter identity headers are protected.',
            },
            {
                displayName: 'Langfuse Trace',
                name: 'langfuseTrace',
                type: 'boolean',
                default: true,
                description: 'Whether to add the Langfuse trace header using the n8n execution identifier',
            },
            {
                displayName: 'Metadata',
                name: 'metadata',
                type: 'fixedCollection',
                placeholder: 'Add Metadata',
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
                                displayName: 'Key',
                                name: 'key',
                                type: 'string',
                                default: '',
                                description: 'Metadata key',
                            },
                            {
                                displayName: 'Value Mode',
                                name: 'valueMode',
                                type: 'options',
                                options: [
                                    { name: 'JSON', value: 'json' },
                                    { name: 'String', value: 'string' },
                                ],
                                default: 'string',
                                description: 'How to parse the metadata value',
                            },
                            {
                                displayName: 'Value',
                                name: 'value',
                                type: 'string',
                                default: '',
                                description: 'Metadata value',
                            },
                        ],
                    },
                ],
                description: 'Extra request metadata sent in the body only',
            },
            {
                displayName: 'Response Healing',
                name: 'responseHealing',
                type: 'boolean',
                default: false,
                description: 'Whether to enable the OpenRouter response-healing plugin',
            },
            {
                displayName: 'Session ID',
                name: 'sessionId',
                type: 'string',
                default: '',
                description: 'OpenRouter session identifier',
            },
            {
                displayName: 'Web Search Enabled',
                name: 'webEnabled',
                type: 'boolean',
                default: false,
                description: 'Whether to enable the OpenRouter web search plugin',
            },
            {
                displayName: 'Web Search Max Results',
                name: 'webMaxResults',
                type: 'number',
                typeOptions: {
                    minValue: 1,
                    maxValue: 10,
                },
                default: '',
                displayOptions: {
                    show: {
                        webEnabled: [true],
                    },
                },
                description: 'Maximum number of web results to attach to the request',
            },
            {
                displayName: 'Web Search Prompt',
                name: 'webSearchPrompt',
                type: 'string',
                typeOptions: {
                    rows: 3,
                },
                default: '',
                displayOptions: {
                    show: {
                        webEnabled: [true],
                    },
                },
                description: 'Custom prompt prefix the web plugin should use when summarizing results',
            },
        ],
    },
    {
        displayName: 'Provider Routing',
        name: 'providerRouting',
        type: 'collection',
        placeholder: 'Add Routing Option',
        default: {},
        options: [
            {
                displayName: 'Allow Fallbacks',
                name: 'allowFallbacks',
                type: 'options',
                options: [
                    { name: 'Default', value: '' },
                    { name: 'False', value: 'false' },
                    { name: 'True', value: 'true' },
                ],
                default: '',
                description: 'Override provider.allow_fallbacks. Default leaves the field unset on the wire.',
            },
            {
                displayName: 'Allow Providers',
                name: 'allow',
                type: 'fixedCollection',
                placeholder: 'Add Allowed Provider',
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
                                displayName: 'Name',
                                name: 'name',
                                type: 'string',
                                default: '',
                                description: 'Provider slug to allow. Empty rows are skipped.',
                            },
                        ],
                    },
                ],
                description: 'Restrict routing to these providers (maps to provider.only)',
            },
            {
                displayName: 'Deny Providers',
                name: 'deny',
                type: 'fixedCollection',
                placeholder: 'Add Denied Provider',
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
                                displayName: 'Name',
                                name: 'name',
                                type: 'string',
                                default: '',
                                description: 'Provider slug to ignore. Empty rows are skipped.',
                            },
                        ],
                    },
                ],
                description: 'Exclude these providers from routing (maps to provider.ignore)',
            },
            {
                displayName: 'Require Parameters Override',
                name: 'requireParameters',
                type: 'options',
                options: [
                    { name: 'Default', value: '' },
                    { name: 'False', value: 'false' },
                    { name: 'True', value: 'true' },
                ],
                default: '',
                description: 'Override provider.require_parameters. Default leaves the field unset on the wire.',
            },
            {
                displayName: 'Sort',
                name: 'sort',
                type: 'options',
                options: [
                    { name: 'Default', value: '' },
                    { name: 'Latency', value: 'latency' },
                    { name: 'Price', value: 'price' },
                    { name: 'Throughput', value: 'throughput' },
                ],
                default: '',
                description: 'How OpenRouter should sort eligible providers. Default omits the field.',
            },
        ],
    },
];
const structuredOutputParameters = [
    {
        displayName: 'Output Mode',
        name: 'outputMode',
        type: 'options',
        noDataExpression: true,
        options: [
            {
                name: 'JSON Object',
                value: 'json_object',
                description: 'Validate response parses as a non-array JSON object',
            },
            {
                name: 'JSON Schema',
                value: 'json_schema',
                description: 'Validate response against a user-supplied JSON Schema (draft-07)',
            },
            {
                name: 'Text',
                value: 'text',
                description: 'Return assistant text without parsing',
            },
        ],
        default: 'text',
        description: 'How to validate the assistant response before returning it',
    },
    {
        displayName: 'JSON Schema',
        name: 'jsonSchema',
        type: 'json',
        default: '{}',
        required: true,
        displayOptions: {
            show: {
                outputMode: ['json_schema'],
            },
        },
        description: 'JSON Schema (draft-07) used to validate the assistant response',
    },
];
const structuredOutputRepairParameters = [
    {
        displayName: 'Max Repair Attempts',
        name: 'maxValidationAttempts',
        type: 'number',
        typeOptions: {
            minValue: 0,
            maxValue: 5,
        },
        default: 2,
        displayOptions: {
            show: {
                outputMode: ['json_object', 'json_schema'],
            },
        },
        description: 'Maximum repair calls after the initial response before failing',
    },
    {
        displayName: 'Repair',
        name: 'repair',
        type: 'collection',
        placeholder: 'Add Repair Option',
        default: {},
        displayOptions: {
            show: {
                outputMode: ['json_object', 'json_schema'],
            },
        },
        options: [
            {
                displayName: 'Model',
                name: 'model',
                type: 'resourceLocator',
                default: { mode: 'list', value: StructuredOutputParser_1.DEFAULT_REPAIR_MODEL },
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
                description: 'OpenRouter model to use only for structured-output repair calls',
            },
            {
                displayName: 'Prompt Template',
                name: 'promptTemplate',
                type: 'string',
                typeOptions: { rows: 8 },
                default: '',
                description: 'Custom repair prompt. Must include {instructions}, {completion}, and {error}. Empty uses the default template.',
            },
            {
                displayName: 'Reasoning Effort',
                name: 'reasoningEffort',
                type: 'options',
                options: [
                    { name: 'High', value: 'high' },
                    { name: 'Low', value: 'low' },
                    { name: 'Medium', value: 'medium' },
                    { name: 'Minimal', value: 'minimal' },
                    { name: 'None', value: 'none' },
                ],
                default: StructuredOutputParser_1.DEFAULT_REPAIR_REASONING_EFFORT,
                description: 'Reasoning effort to send on repair requests',
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
                default: StructuredOutputParser_1.DEFAULT_REPAIR_TEMPERATURE,
                description: 'Temperature to send on repair requests',
            },
        ],
    },
];
const nodeParameterSurface = [
    ...openRouterModelCatalogParameters,
    ...openRouterExecutionParameters,
    ...structuredOutputParameters,
    ...structuredOutputRepairParameters,
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
                    name: OPENROUTER_CUSTOM_CREDENTIAL_NAME,
                    required: true,
                },
            ],
            properties: nodeParameterSurface,
        };
        this.methods = {
            listSearch: {
                getOpenRouterModels: OpenRouterModelCatalog_1.searchOpenRouterModelCatalog,
            },
            loadOptions: {
                getOpenRouterModelOptions: OpenRouterModelCatalog_1.loadOpenRouterModelCatalogOptions,
            },
        };
    }
    async execute() {
        var _a;
        const items = this.getInputData();
        const returnData = [];
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const credentials = await this.getCredentials(OPENROUTER_CUSTOM_CREDENTIAL_NAME);
                const baseUrl = credentials.baseUrl.replace(/\/+$/, '');
                const modelVariant = (0, OpenRouterRouting_1.getSelectedModelVariant)(this, itemIndex);
                const outputMode = this.getNodeParameter('outputMode', itemIndex, 'text');
                const maxRepairAttempts = outputMode === 'text'
                    ? 0
                    : this.getNodeParameter('maxValidationAttempts', itemIndex, 2);
                const compiledSchema = outputMode === 'json_schema' ? compileSchema(this, itemIndex) : undefined;
                const provider = (0, OpenRouterRouting_1.buildProvider)(this, itemIndex, outputMode);
                const webPluginEnabled = (0, OpenRouterExecutionInputBuilder_1.buildWebPlugin)(this, itemIndex) !== undefined;
                (0, OpenRouterRouting_1.validateRouting)(this, modelVariant, provider, webPluginEnabled);
                const headers = buildHeaders(this, itemIndex);
                {
                    const executionResult = await (0, OpenRouterExecution_1.executeOpenRouter)({
                        input: (0, OpenRouterExecutionInputBuilder_1.buildOpenRouterExecutionInput)(this, itemIndex, provider, outputMode, compiledSchema, maxRepairAttempts),
                        sendChat: async (body) => {
                            var _a, _b, _c, _d;
                            const response = (await this.helpers.httpRequestWithAuthentication.call(this, OPENROUTER_CUSTOM_CREDENTIAL_NAME, {
                                method: 'POST',
                                baseURL: baseUrl,
                                url: '/chat/completions',
                                headers,
                                json: true,
                                body,
                            }));
                            return {
                                response,
                                text: (_d = (_c = (_b = (_a = response.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) !== null && _d !== void 0 ? _d : '',
                            };
                        },
                    });
                    if (executionResult.kind !== 'success') {
                        throw buildStructuredOutputError(this, itemIndex, 1 + executionResult.error.repairAttempts, {
                            errors: executionResult.error.validationErrors,
                            details: executionResult.error.validationDetails,
                            originalRawText: executionResult.error.originalRawText,
                            latestRepairText: executionResult.error.latestRepairText,
                        });
                    }
                    returnData.push({
                        json: executionResult.data,
                        pairedItem: { item: itemIndex },
                    });
                    continue;
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const diagnosticFields = getStructuredOutputDiagnosticFields(error);
                    returnData.push({
                        json: {
                            error: error instanceof Error ? error.message : String(error),
                            ...diagnosticFields,
                        },
                        pairedItem: { item: itemIndex },
                    });
                    continue;
                }
                if (error instanceof n8n_workflow_1.NodeOperationError) {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), error.message, {
                        itemIndex,
                        description: (_a = error.description) !== null && _a !== void 0 ? _a : undefined,
                    });
                }
                throw new n8n_workflow_1.NodeApiError(this.getNode(), { message: error instanceof Error ? error.message : String(error) }, { itemIndex });
            }
        }
        return [returnData];
    }
}
exports.OpenrouterLlm = OpenrouterLlm;
function buildHeaders(executeFunctions, itemIndex) {
    var _a, _b, _c, _d, _e;
    const headers = {};
    const integrations = executeFunctions.getNodeParameter('integrations', itemIndex, {});
    const langfuseTrace = (_a = integrations.langfuseTrace) !== null && _a !== void 0 ? _a : true;
    const customHeaders = (_b = integrations.headers) !== null && _b !== void 0 ? _b : {};
    if (langfuseTrace) {
        headers['langfuse-trace-id'] = executeFunctions.getExecutionId();
    }
    for (const header of (_c = customHeaders.values) !== null && _c !== void 0 ? _c : []) {
        const name = (_d = header.name) !== null && _d !== void 0 ? _d : '';
        if (name.trim() === '') {
            continue;
        }
        if (PROTECTED_HEADERS.includes(name.toLowerCase())) {
            throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `${name} is a protected header.`);
        }
        headers[name] = (_e = header.value) !== null && _e !== void 0 ? _e : '';
    }
    return headers;
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
function truncateForError(text) {
    const limit = 2000;
    return text.length <= limit ? text : `${text.slice(0, limit)}...[truncated]`;
}
//# sourceMappingURL=OpenrouterLlm.node.js.map