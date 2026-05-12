"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.advancedSamplingProperties = exports.reasoningProperties = exports.generationProperties = void 0;
exports.generationProperties = [
    {
        displayName: 'Generation Options',
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
];
exports.reasoningProperties = [
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
];
exports.advancedSamplingProperties = [
    {
        displayName: 'Advanced Sampling Options',
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
];
//# sourceMappingURL=generationProperties.js.map