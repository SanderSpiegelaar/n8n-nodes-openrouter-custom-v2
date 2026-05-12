"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterApi = void 0;
class OpenRouterApi {
    constructor() {
        this.name = 'openRouterCustomV2Api';
        this.displayName = 'OpenRouter Custom V2 API';
        this.icon = 'file:../nodes/OpenrouterLlm/openrouter.svg';
        this.documentationUrl = 'https://openrouter.ai/docs';
        this.properties = [
            {
                displayName: 'API Key',
                name: 'apiKey',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                default: '',
                required: true,
                description: 'OpenRouter API key as a Bearer token. Paste only the secret key — do not type the literal word Bearer; that prefix is added automatically.',
            },
            {
                displayName: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                default: 'https://openrouter.ai/api/v1',
                required: true,
                description: 'OpenRouter-compatible API base URL',
            },
            {
                displayName: 'Site URL',
                name: 'siteUrl',
                type: 'string',
                default: '',
                placeholder: 'https://example.com',
                description: 'Optional site URL sent as HTTP-Referer for OpenRouter attribution',
            },
            {
                displayName: 'App Name',
                name: 'appName',
                type: 'string',
                default: '',
                placeholder: 'My n8n Workflow',
                description: 'Optional app name sent as X-OpenRouter-Title for OpenRouter attribution',
            },
        ];
        this.authenticate = {
            type: 'generic',
            properties: {
                headers: {
                    Authorization: '={{"Bearer " + $credentials.apiKey}}',
                    'HTTP-Referer': '={{$credentials.siteUrl}}',
                    'X-OpenRouter-Title': '={{$credentials.appName}}',
                },
            },
        };
        this.test = {
            request: {
                baseURL: '={{$credentials.baseUrl}}',
                url: '/models',
                method: 'GET',
            },
        };
    }
}
exports.OpenRouterApi = OpenRouterApi;
//# sourceMappingURL=OpenRouterApi.credentials.js.map