"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outputProperties = void 0;
exports.outputProperties = [
    {
        displayName: 'Response Options',
        name: 'outputOptions',
        type: 'collection',
        placeholder: 'Add Response Option',
        default: {},
        options: [
            {
                displayName: 'Include Response Details',
                name: 'includeResponseDetails',
                type: 'boolean',
                default: false,
                description: 'Whether to include the raw OpenRouter response and repair diagnostics in successful output',
            },
        ],
    },
];
//# sourceMappingURL=outputProperties.js.map