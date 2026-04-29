import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

type ChatCompletionResponse = IDataObject & {
	choices?: Array<{
		message?: {
			content?: string;
		};
	}>;
};

type ChatMessage = {
	role: 'system' | 'user' | 'assistant';
	content: string;
};

const VALID_MESSAGE_ROLES = ['system', 'user', 'assistant'] as const;
const SUPPORTED_MODEL_VARIANTS = [
	':exacto',
	':extended',
	':floor',
	':free',
	':nitro',
	':online',
] as const;

export class OpenrouterLlm implements INodeType {
	description: INodeTypeDescription = {
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
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
				description:
					'Array of chat messages with role and content. Roles can be system, user, or assistant.',
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

	methods = {
		listSearch: {
			async getOpenRouterModels(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const credentials = await this.getCredentials('openRouterApi');
				const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');
				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'openRouterApi',
					{
						method: 'GET',
						baseURL: baseUrl,
						url: '/models',
						json: true,
					},
				)) as { data?: OpenRouterModel[] };
				const normalizedFilter = filter?.toLowerCase() ?? '';

				const results = (response.data ?? [])
					.filter((model) => isTextModel(model))
					.filter((model) => model.id !== 'openrouter/auto')
					.filter((model) => {
						if (normalizedFilter === '') {
							return true;
						}

						return (
							model.id.toLowerCase().includes(normalizedFilter) ||
							(model.name ?? '').toLowerCase().includes(normalizedFilter)
						);
					})
					.map((model) => ({
						name: model.name ?? model.id,
						value: model.id,
					}));

				return { results };
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const credentials = await this.getCredentials('openRouterApi');
				const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');
				const temperature = this.getNodeParameter('temperature', itemIndex) as number;
				const maxTokens = this.getNodeParameter('maxTokens', itemIndex) as number;
				const messages = buildMessages(this, itemIndex);
				const modelPayload = buildModelPayload(this, itemIndex);

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'openRouterApi',
					{
						method: 'POST',
						baseURL: baseUrl,
						url: '/chat/completions',
						json: true,
						body: {
							...modelPayload,
							messages,
							temperature,
							max_tokens: maxTokens,
						},
					},
				)) as ChatCompletionResponse;

				returnData.push({
					json: {
						text: response.choices?.[0]?.message?.content ?? '',
						response,
					},
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : String(error),
						},
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				if (error instanceof NodeOperationError) {
					throw error;
				}

				throw new NodeApiError(
					this.getNode(),
					{ message: error instanceof Error ? error.message : String(error) },
					{ itemIndex },
				);
			}
		}

		return [returnData];
	}
}

type OpenRouterModel = {
	id: string;
	name?: string;
	architecture?: {
		output_modalities?: string[];
	};
};

type ModelLocatorValue =
	| string
	| {
			value?: string;
	  };

function buildModelPayload(executeFunctions: IExecuteFunctions, itemIndex: number): IDataObject {
	const model = resolvePrimaryModel(executeFunctions, itemIndex);
	const fallbackModels = resolveFallbackModels(executeFunctions, itemIndex);

	if (fallbackModels.length > 0) {
		return {
			models: [model, ...fallbackModels],
		};
	}

	return { model };
}

function resolvePrimaryModel(executeFunctions: IExecuteFunctions, itemIndex: number): string {
	const modelParameter = executeFunctions.getNodeParameter('model', itemIndex) as ModelLocatorValue;
	const modelId =
		typeof modelParameter === 'string' ? modelParameter : (modelParameter.value ?? '').toString();
	const modelVariant = executeFunctions.getNodeParameter('modelVariant', itemIndex, '') as string;

	if (modelId.trim() === '') {
		throw new NodeOperationError(executeFunctions.getNode(), 'Model ID must not be empty.');
	}

	if (modelVariant === '') {
		return modelId;
	}

	if (!SUPPORTED_MODEL_VARIANTS.includes(modelVariant as (typeof SUPPORTED_MODEL_VARIANTS)[number])) {
		throw new NodeOperationError(executeFunctions.getNode(), 'Unsupported model variant selected.');
	}

	return `${stripSupportedVariant(modelId)}${modelVariant}`;
}

function resolveFallbackModels(executeFunctions: IExecuteFunctions, itemIndex: number): string[] {
	const fallbackModels = executeFunctions.getNodeParameter('fallbackModels', itemIndex, {}) as {
		values?: Array<{ model?: string }>;
	};

	return (fallbackModels.values ?? [])
		.map((fallback) => fallback.model?.trim() ?? '')
		.filter((model) => model !== '');
}

function stripSupportedVariant(modelId: string): string {
	const supportedVariant = SUPPORTED_MODEL_VARIANTS.find((variant) => modelId.endsWith(variant));

	if (!supportedVariant) {
		return modelId;
	}

	return modelId.slice(0, -supportedVariant.length);
}

function isTextModel(model: OpenRouterModel): boolean {
	const outputModalities = model.architecture?.output_modalities;

	return outputModalities === undefined || outputModalities.includes('text');
}

function buildMessages(executeFunctions: IExecuteFunctions, itemIndex: number): ChatMessage[] {
	const promptMode = executeFunctions.getNodeParameter('promptMode', itemIndex, 'systemUser') as string;

	if (promptMode === 'single') {
		const singlePrompt = executeFunctions.getNodeParameter('singlePrompt', itemIndex) as string;

		return [
			{
				role: 'user',
				content: validateNonEmptyText(executeFunctions, singlePrompt, 'Prompt'),
			},
		];
	}

	if (promptMode === 'messagesJson') {
		const messagesJson = executeFunctions.getNodeParameter('messagesJson', itemIndex) as unknown;

		return validateMessagesJson(executeFunctions, messagesJson);
	}

	const prompt = executeFunctions.getNodeParameter('prompt', itemIndex) as string;
	const systemMessage = executeFunctions.getNodeParameter('systemMessage', itemIndex, '') as string;
	const messages: ChatMessage[] = [];

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

function validateMessagesJson(executeFunctions: IExecuteFunctions, value: unknown): ChatMessage[] {
	let parsedValue = value;

	if (typeof value === 'string') {
		try {
			parsedValue = JSON.parse(value);
		} catch {
			throw new NodeOperationError(executeFunctions.getNode(), 'Messages JSON must be valid JSON.');
		}
	}

	if (!Array.isArray(parsedValue)) {
		throw new NodeOperationError(executeFunctions.getNode(), 'Messages JSON must resolve to an array.');
	}

	if (parsedValue.length === 0) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Messages JSON must contain at least one message.',
		);
	}

	return parsedValue.map((message, index) => validateMessage(executeFunctions, message, index));
}

function validateMessage(
	executeFunctions: IExecuteFunctions,
	message: unknown,
	index: number,
): ChatMessage {
	const messageNumber = index + 1;

	if (message === null || typeof message !== 'object' || Array.isArray(message)) {
		throw new NodeOperationError(executeFunctions.getNode(), `Message ${messageNumber} must be an object.`);
	}

	const candidate = message as IDataObject;
	const role = candidate.role;

	if (
		typeof role !== 'string' ||
		!VALID_MESSAGE_ROLES.includes(role as (typeof VALID_MESSAGE_ROLES)[number])
	) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			`Message ${messageNumber} role must be one of system, user, assistant.`,
		);
	}

	return {
		role: role as ChatMessage['role'],
		content: validateNonEmptyText(
			executeFunctions,
			candidate.content,
			`Message ${messageNumber} content`,
		),
	};
}

function validateNonEmptyText(
	executeFunctions: IExecuteFunctions,
	value: unknown,
	label: string,
): string {
	if (typeof value !== 'string' || value.trim() === '') {
		throw new NodeOperationError(executeFunctions.getNode(), `${label} must not be empty.`);
	}

	return value;
}
