"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenrouterLlm = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const StructuredOutputParser_1 = require("./StructuredOutputParser");
const OpenRouterModelCatalog_1 = require("./OpenRouterModelCatalog");
const VALID_MESSAGE_ROLES = ['system', 'user', 'assistant'];
const SUPPORTED_MODEL_VARIANTS = [
    ':exacto',
    ':extended',
    ':floor',
    ':free',
    ':nitro',
    ':online',
];
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
        var _a, _b, _c, _d, _e, _f, _g;
        const items = this.getInputData();
        const returnData = [];
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const credentials = await this.getCredentials(OPENROUTER_CUSTOM_CREDENTIAL_NAME);
                const baseUrl = credentials.baseUrl.replace(/\/+$/, '');
                const modelOptions = this.getNodeParameter('modelOptions', itemIndex, {});
                const modelVariant = (_a = modelOptions.modelVariant) !== null && _a !== void 0 ? _a : '';
                const outputMode = this.getNodeParameter('outputMode', itemIndex, 'text');
                const maxRepairAttempts = outputMode === 'text'
                    ? 0
                    : this.getNodeParameter('maxValidationAttempts', itemIndex, 2);
                const compiledSchema = outputMode === 'json_schema' ? compileSchema(this, itemIndex) : undefined;
                const provider = buildProvider(this, itemIndex, outputMode);
                const webPluginEnabled = buildWebPlugin(this, itemIndex) !== undefined;
                validateRouting(this, modelVariant, provider, webPluginEnabled);
                const headers = buildHeaders(this, itemIndex);
                const initialBody = buildRequestBody(this, itemIndex, 1, outputMode, compiledSchema);
                if (provider !== undefined) {
                    initialBody.provider = provider;
                }
                const initialResponse = (await this.helpers.httpRequestWithAuthentication.call(this, OPENROUTER_CUSTOM_CREDENTIAL_NAME, {
                    method: 'POST',
                    baseURL: baseUrl,
                    url: '/chat/completions',
                    headers,
                    json: true,
                    body: initialBody,
                }));
                let lastResponse = initialResponse;
                let lastRawText = (_e = (_d = (_c = (_b = initialResponse.choices) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) !== null && _e !== void 0 ? _e : '';
                let structured = null;
                let repairAttemptsUsed = 0;
                if (outputMode === 'text') {
                    structured = null;
                }
                else {
                    const repair = this.getNodeParameter('repair', itemIndex, {});
                    const repairModel = resolveModelLocator(repair.model, StructuredOutputParser_1.DEFAULT_REPAIR_MODEL);
                    const repairOutcome = await (0, StructuredOutputParser_1.evaluateStructuredOutputWithRepair)({
                        mode: outputMode,
                        compiledValidator: compiledSchema === null || compiledSchema === void 0 ? void 0 : compiledSchema.validator,
                        repair: {
                            maxAttempts: maxRepairAttempts,
                            model: repairModel,
                            temperature: isUnset(repair.temperature)
                                ? StructuredOutputParser_1.DEFAULT_REPAIR_TEMPERATURE
                                : repair.temperature,
                            reasoningEffort: (_f = repair.reasoningEffort) !== null && _f !== void 0 ? _f : StructuredOutputParser_1.DEFAULT_REPAIR_REASONING_EFFORT,
                            promptTemplate: repair.promptTemplate,
                            metadata: (attempt, model) => buildMetadata(this, itemIndex, model, attempt),
                            send: async (body) => {
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
                        },
                    }, lastRawText, initialResponse);
                    if (!repairOutcome.ok) {
                        throw buildStructuredOutputError(this, itemIndex, 1 + repairOutcome.error.repair.repairAttempts, {
                            errors: repairOutcome.error.validationErrors,
                            details: repairOutcome.error.validationDetails,
                            originalRawText: repairOutcome.error.originalRawText,
                            latestRepairText: repairOutcome.error.repair.latestRepairText,
                        });
                    }
                    lastResponse = repairOutcome.response;
                    structured = repairOutcome.structured;
                    repairAttemptsUsed = repairOutcome.repair.repairAttempts;
                    lastRawText = repairAttemptsUsed > 0 ? JSON.stringify(structured) : repairOutcome.text;
                }
                const reasoningParams = this.getNodeParameter('reasoning', itemIndex, {});
                if (reasoningParams.exclude === true && (lastResponse === null || lastResponse === void 0 ? void 0 : lastResponse.choices)) {
                    for (const choice of lastResponse.choices) {
                        const msg = choice.message;
                        if (msg) {
                            delete msg.reasoning;
                            delete msg.reasoning_content;
                        }
                    }
                }
                const outputJson = {
                    text: lastRawText,
                    structured: structured,
                    response: lastResponse,
                };
                if (repairAttemptsUsed > 0) {
                    outputJson.structuredOutputRepair = {
                        repaired: true,
                        repairAttempts: repairAttemptsUsed,
                    };
                }
                returnData.push({
                    json: outputJson,
                    pairedItem: { item: itemIndex },
                });
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
                        description: (_g = error.description) !== null && _g !== void 0 ? _g : undefined,
                    });
                }
                throw new n8n_workflow_1.NodeApiError(this.getNode(), { message: error instanceof Error ? error.message : String(error) }, { itemIndex });
            }
        }
        return [returnData];
    }
}
exports.OpenrouterLlm = OpenrouterLlm;
function buildRequestBody(executeFunctions, itemIndex, attempt = 1, outputMode = 'text', compiledSchema) {
    var _a, _b;
    const modelPayload = buildModelPayload(executeFunctions, itemIndex);
    const resolvedModel = resolveMetadataModel(modelPayload);
    const body = {
        ...modelPayload,
        messages: buildMessages(executeFunctions, itemIndex),
    };
    if (outputMode === 'json_object') {
        body.response_format = { type: 'json_object' };
    }
    else if (outputMode === 'json_schema' && compiledSchema !== undefined) {
        body.response_format = {
            type: 'json_schema',
            json_schema: compiledSchema.responseFormat,
        };
    }
    const generation = executeFunctions.getNodeParameter('generation', itemIndex, {});
    const temperature = generation.temperature;
    const maxTokens = generation.maxTokens;
    const advancedSampling = executeFunctions.getNodeParameter('advancedSampling', itemIndex, {});
    const reasoning = buildReasoning(executeFunctions, executeFunctions.getNodeParameter('reasoning', itemIndex, {}));
    const integrations = executeFunctions.getNodeParameter('integrations', itemIndex, {});
    const responseHealing = (_a = integrations.responseHealing) !== null && _a !== void 0 ? _a : false;
    const sessionId = (_b = integrations.sessionId) !== null && _b !== void 0 ? _b : '';
    body.metadata = buildMetadata(executeFunctions, itemIndex, resolvedModel, attempt);
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
    const plugins = [];
    if (responseHealing) {
        plugins.push({ id: 'response-healing' });
    }
    const webPlugin = buildWebPlugin(executeFunctions, itemIndex);
    if (webPlugin !== undefined) {
        plugins.push(webPlugin);
    }
    if (plugins.length > 0) {
        body.plugins = plugins;
    }
    addOptionalText(executeFunctions, body, 'session_id', sessionId, 'Session ID');
    return body;
}
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
function buildMetadata(executeFunctions, itemIndex, model, attempt = 1) {
    var _a, _b, _c, _d, _e, _f;
    const workflow = executeFunctions.getWorkflow();
    const defaultMetadata = {
        execution_id: executeFunctions.getExecutionId(),
        workflow_id: workflow.id,
        workflow_name: workflow.name,
        node_name: executeFunctions.getNode().name,
        item_index: itemIndex,
        model,
        validation_attempt: attempt,
    };
    const metadata = { ...defaultMetadata };
    const integrations = executeFunctions.getNodeParameter('integrations', itemIndex, {});
    const extraMetadata = (_a = integrations.metadata) !== null && _a !== void 0 ? _a : {};
    for (const row of (_b = extraMetadata.values) !== null && _b !== void 0 ? _b : []) {
        const key = (_d = (_c = row.key) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : '';
        if (key === '') {
            continue;
        }
        if (Object.prototype.hasOwnProperty.call(defaultMetadata, key)) {
            throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `${key} conflicts with default metadata.`);
        }
        if (row.valueMode === 'json') {
            try {
                metadata[key] = JSON.parse((_e = row.value) !== null && _e !== void 0 ? _e : '');
            }
            catch {
                throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `${key} metadata value must be valid JSON.`);
            }
            continue;
        }
        metadata[key] = (_f = row.value) !== null && _f !== void 0 ? _f : '';
    }
    return metadata;
}
function resolveMetadataModel(modelPayload) {
    if (typeof modelPayload.model === 'string') {
        return modelPayload.model;
    }
    if (Array.isArray(modelPayload.models) && typeof modelPayload.models[0] === 'string') {
        return modelPayload.models[0];
    }
    return '';
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
    const exclude = reasoning.exclude === true;
    if (mode === 'off' && !exclude) {
        return undefined;
    }
    const output = {};
    if (mode === 'effort') {
        output.effort = (_b = reasoning.effort) !== null && _b !== void 0 ? _b : 'medium';
    }
    if (mode === 'tokenBudget') {
        output.max_tokens = validatePositiveNumber(executeFunctions, reasoning.maxTokens, 'Reasoning Max Tokens');
    }
    if (exclude) {
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
    const modelId = resolveModelLocator(modelParameter, '');
    const modelOptions = executeFunctions.getNodeParameter('modelOptions', itemIndex, {});
    const modelVariant = (_a = modelOptions.modelVariant) !== null && _a !== void 0 ? _a : '';
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
function resolveModelLocator(modelParameter, defaultModel) {
    var _a;
    if (modelParameter === undefined) {
        return defaultModel;
    }
    return typeof modelParameter === 'string'
        ? modelParameter
        : ((_a = modelParameter.value) !== null && _a !== void 0 ? _a : defaultModel).toString();
}
function resolveFallbackModels(executeFunctions, itemIndex) {
    var _a, _b;
    const modelOptions = executeFunctions.getNodeParameter('modelOptions', itemIndex, {});
    const fallbackModels = (_a = modelOptions.fallbackModels) !== null && _a !== void 0 ? _a : {};
    return ((_b = fallbackModels.values) !== null && _b !== void 0 ? _b : [])
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
function collectProviderNamesFromCollection(collection) {
    var _a;
    return ((_a = (collection !== null && collection !== void 0 ? collection : {}).values) !== null && _a !== void 0 ? _a : [])
        .map((row) => { var _a, _b; return (_b = (_a = row.name) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : ''; })
        .filter((name) => name !== '');
}
function buildProvider(executeFunctions, itemIndex, outputMode = 'text') {
    var _a, _b, _c;
    const provider = {};
    const routing = executeFunctions.getNodeParameter('providerRouting', itemIndex, {});
    const allow = collectProviderNamesFromCollection(routing.allow);
    const deny = collectProviderNamesFromCollection(routing.deny);
    const sort = (_a = routing.sort) !== null && _a !== void 0 ? _a : '';
    const allowFallbacks = (_b = routing.allowFallbacks) !== null && _b !== void 0 ? _b : '';
    const requireParameters = (_c = routing.requireParameters) !== null && _c !== void 0 ? _c : '';
    if (allow.length > 0) {
        provider.only = allow;
    }
    if (deny.length > 0) {
        provider.ignore = deny;
    }
    if (sort !== '') {
        provider.sort = sort;
    }
    if (allowFallbacks === 'true' || allowFallbacks === 'false') {
        provider.allow_fallbacks = allowFallbacks === 'true';
    }
    if (requireParameters === 'true' || requireParameters === 'false') {
        provider.require_parameters = requireParameters === 'true';
    }
    else if (outputMode === 'json_schema') {
        provider.require_parameters = true;
    }
    return Object.keys(provider).length === 0 ? undefined : provider;
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
function buildWebPlugin(executeFunctions, itemIndex) {
    const integrations = executeFunctions.getNodeParameter('integrations', itemIndex, {});
    if (integrations.webEnabled !== true) {
        return undefined;
    }
    const plugin = { id: 'web' };
    if (!isUnset(integrations.webMaxResults)) {
        plugin.max_results = validatePositiveNumber(executeFunctions, integrations.webMaxResults, 'Web Search Max Results');
    }
    if (typeof integrations.webSearchPrompt === 'string' &&
        integrations.webSearchPrompt.trim() !== '') {
        plugin.search_prompt = integrations.webSearchPrompt;
    }
    return plugin;
}
function truncateForError(text) {
    const limit = 2000;
    return text.length <= limit ? text : `${text.slice(0, limit)}...[truncated]`;
}
function validateRouting(executeFunctions, modelVariant, provider, webPluginEnabled = false) {
    if (webPluginEnabled && modelVariant === ':online') {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), 'Model Variant :online conflicts with the Web Search Plugin. Disable one of the two — both routes inject web search results.');
    }
    if (provider === undefined) {
        return;
    }
    if (provider.sort !== undefined && modelVariant === ':nitro') {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), 'Model Variant :nitro conflicts with Provider Sort. Remove one of the two — :nitro already requests throughput routing.');
    }
    if (provider.sort !== undefined && modelVariant === ':floor') {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), 'Model Variant :floor conflicts with Provider Sort. Remove one of the two — :floor already requests price routing.');
    }
    const allow = Array.isArray(provider.only) ? provider.only : [];
    const deny = Array.isArray(provider.ignore) ? provider.ignore : [];
    if (allow.length > 0 && deny.length > 0) {
        const denyNormalized = new Set(deny.map((name) => name.trim().toLowerCase()));
        const conflict = allow.find((name) => denyNormalized.has(name.trim().toLowerCase()));
        if (conflict !== undefined) {
            throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `Provider "${conflict}" appears in both Allow Providers and Deny Providers. Remove it from one list.`);
        }
    }
}
//# sourceMappingURL=OpenrouterLlm.node.js.map