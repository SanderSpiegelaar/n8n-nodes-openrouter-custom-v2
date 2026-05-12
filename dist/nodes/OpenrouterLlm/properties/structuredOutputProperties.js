"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.structuredOutputProperties = void 0;
exports.structuredOutputProperties = [
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
//# sourceMappingURL=structuredOutputProperties.js.map