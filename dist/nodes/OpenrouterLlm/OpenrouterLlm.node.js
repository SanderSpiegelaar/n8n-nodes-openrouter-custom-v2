"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenrouterLlm = void 0;
const n8n_workflow_1 = require("n8n-workflow");
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
                    type: 'string',
                    default: 'openai/gpt-4o-mini',
                    required: true,
                    description: 'OpenRouter model ID to use for the chat completion',
                },
                {
                    displayName: 'Prompt',
                    name: 'prompt',
                    type: 'string',
                    typeOptions: {
                        rows: 4,
                    },
                    default: '',
                    required: true,
                    description: 'User message to send to the selected model',
                },
                {
                    displayName: 'System Message',
                    name: 'systemMessage',
                    type: 'string',
                    typeOptions: {
                        rows: 3,
                    },
                    default: '',
                    description: 'Optional system message to prepend to the request',
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
            ],
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
                const model = this.getNodeParameter('model', itemIndex);
                const prompt = this.getNodeParameter('prompt', itemIndex);
                const systemMessage = this.getNodeParameter('systemMessage', itemIndex, '');
                const temperature = this.getNodeParameter('temperature', itemIndex);
                const maxTokens = this.getNodeParameter('maxTokens', itemIndex);
                const messages = [];
                if (systemMessage.trim() !== '') {
                    messages.push({
                        role: 'system',
                        content: systemMessage,
                    });
                }
                messages.push({
                    role: 'user',
                    content: prompt,
                });
                const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'openRouterApi', {
                    method: 'POST',
                    baseURL: baseUrl,
                    url: '/chat/completions',
                    json: true,
                    body: {
                        model,
                        messages,
                        temperature,
                        max_tokens: maxTokens,
                    },
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
//# sourceMappingURL=OpenrouterLlm.node.js.map