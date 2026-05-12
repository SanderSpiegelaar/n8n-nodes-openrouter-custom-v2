import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OpenRouterApi implements ICredentialType {
	name = 'openRouterCustomV2Api';

	displayName = 'OpenRouter Custom V2 API';

	icon = 'file:../nodes/OpenrouterLlm/openrouter.svg' as const;

	documentationUrl = 'https://openrouter.ai/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'OpenRouter API key used as a Bearer token',
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

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{"Bearer " + $credentials.apiKey}}',
				'HTTP-Referer': '={{$credentials.siteUrl}}',
				'X-OpenRouter-Title': '={{$credentials.appName}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/models',
			method: 'GET',
		},
	};
}
