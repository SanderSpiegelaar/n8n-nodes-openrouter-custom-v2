"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelProperties = void 0;
exports.modelProperties = [
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
//# sourceMappingURL=modelProperties.js.map