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
const PROTECTED_HEADERS = ['authorization', 'http-referer', 'x-title'] as const;

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
				displayName: 'Response Healing',
				name: 'responseHealing',
				type: 'boolean',
				default: false,
				description: 'Whether to enable the OpenRouter response-healing plugin',
			},
			{
				displayName: 'Langfuse Trace',
				name: 'langfuseTrace',
				type: 'boolean',
				default: true,
				description: 'Whether to add the Langfuse trace header using the n8n execution identifier',
			},
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
				displayName: 'Session',
				name: 'session',
				type: 'collection',
				placeholder: 'Add Session Option',
				default: {},
				options: [
					{
						displayName: 'Session ID',
						name: 'sessionId',
						type: 'string',
						default: '',
						description: 'OpenRouter session identifier',
					},
				],
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
				const body = buildRequestBody(this, itemIndex);
				const headers = buildHeaders(this, itemIndex);

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'openRouterApi',
					{
						method: 'POST',
						baseURL: baseUrl,
						url: '/chat/completions',
						headers,
						json: true,
						body,
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

function buildRequestBody(executeFunctions: IExecuteFunctions, itemIndex: number): IDataObject {
	const modelPayload = buildModelPayload(executeFunctions, itemIndex);
	const resolvedModel = resolveMetadataModel(modelPayload);
	const body: IDataObject = {
		...modelPayload,
		messages: buildMessages(executeFunctions, itemIndex),
	};
	const temperature = executeFunctions.getNodeParameter('temperature', itemIndex) as number | string;
	const maxTokens = executeFunctions.getNodeParameter('maxTokens', itemIndex) as number | string;
	const generation = executeFunctions.getNodeParameter('generation', itemIndex, {}) as IDataObject;
	const advancedSampling = executeFunctions.getNodeParameter(
		'advancedSampling',
		itemIndex,
		{},
	) as IDataObject;
	const reasoning = buildReasoning(
		executeFunctions,
		executeFunctions.getNodeParameter('reasoning', itemIndex, {}) as IDataObject,
	);
	const responseHealing = executeFunctions.getNodeParameter(
		'responseHealing',
		itemIndex,
		false,
	) as boolean;
	const session = executeFunctions.getNodeParameter('session', itemIndex, {}) as IDataObject;
	body.metadata = buildMetadata(executeFunctions, itemIndex, resolvedModel);

	if (!isUnset(temperature)) {
		body.temperature = temperature as number;
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
		body.stop = generation.stop as IDataObject['key'];
	}

	if (reasoning !== undefined) {
		body.reasoning = reasoning;
	}

	if (!isUnset(advancedSampling.topK)) {
		body.top_k = validatePositiveNumber(executeFunctions, advancedSampling.topK, 'Top K');
	}

	if (!isUnset(advancedSampling.repetitionPenalty)) {
		body.repetition_penalty = validatePositiveNumber(
			executeFunctions,
			advancedSampling.repetitionPenalty,
			'Repetition Penalty',
		);
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

	if (responseHealing) {
		body.plugins = [{ id: 'response-healing' }];
	}

	addOptionalText(executeFunctions, body, 'session_id', session.sessionId, 'Session ID');

	return body;
}

function buildHeaders(executeFunctions: IExecuteFunctions, itemIndex: number): IDataObject {
	const headers: IDataObject = {};
	const langfuseTrace = executeFunctions.getNodeParameter('langfuseTrace', itemIndex, true) as boolean;
	const customHeaders = executeFunctions.getNodeParameter('headers', itemIndex, {}) as {
		values?: Array<{ name?: string; value?: string }>;
	};

	if (langfuseTrace) {
		headers['langfuse-trace-id'] = executeFunctions.getExecutionId();
	}

	for (const header of customHeaders.values ?? []) {
		const name = header.name ?? '';

		if (name.trim() === '') {
			continue;
		}

		if (PROTECTED_HEADERS.includes(name.toLowerCase() as (typeof PROTECTED_HEADERS)[number])) {
			throw new NodeOperationError(executeFunctions.getNode(), `${name} is a protected header.`);
		}

		headers[name] = header.value ?? '';
	}

	return headers;
}

function buildMetadata(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	model: string,
): IDataObject {
	const workflow = executeFunctions.getWorkflow();
	const defaultMetadata: IDataObject = {
		execution_id: executeFunctions.getExecutionId(),
		workflow_id: workflow.id,
		workflow_name: workflow.name,
		node_name: executeFunctions.getNode().name,
		item_index: itemIndex,
		model,
	};
	const metadata = { ...defaultMetadata };
	const extraMetadata = executeFunctions.getNodeParameter('metadata', itemIndex, {}) as {
		values?: Array<{ key?: string; valueMode?: string; value?: string }>;
	};

	for (const row of extraMetadata.values ?? []) {
		const key = row.key?.trim() ?? '';

		if (key === '') {
			continue;
		}

		if (Object.prototype.hasOwnProperty.call(defaultMetadata, key)) {
			throw new NodeOperationError(
				executeFunctions.getNode(),
				`${key} conflicts with default metadata.`,
			);
		}

		if (row.valueMode === 'json') {
			try {
				metadata[key] = JSON.parse(row.value ?? '');
			} catch {
				throw new NodeOperationError(
					executeFunctions.getNode(),
					`${key} metadata value must be valid JSON.`,
				);
			}
			continue;
		}

		metadata[key] = row.value ?? '';
	}

	return metadata;
}

function resolveMetadataModel(modelPayload: IDataObject): string {
	if (typeof modelPayload.model === 'string') {
		return modelPayload.model;
	}

	if (Array.isArray(modelPayload.models) && typeof modelPayload.models[0] === 'string') {
		return modelPayload.models[0];
	}

	return '';
}

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

function buildReasoning(
	executeFunctions: IExecuteFunctions,
	reasoning: IDataObject,
): IDataObject | undefined {
	const mode = (reasoning.mode as string | undefined) ?? 'off';

	if (mode === 'off') {
		return undefined;
	}

	const output: IDataObject = {};

	if (mode === 'effort') {
		output.effort = (reasoning.effort as string | undefined) ?? 'medium';
	}

	if (mode === 'tokenBudget') {
		output.max_tokens = validatePositiveNumber(
			executeFunctions,
			reasoning.maxTokens,
			'Reasoning Max Tokens',
		);
	}

	if (reasoning.exclude === true) {
		output.exclude = true;
	}

	return output;
}

function addOptionalNumber(body: IDataObject, wireName: string, value: unknown): void {
	if (!isUnset(value)) {
		body[wireName] = value as number;
	}
}

function addOptionalText(
	executeFunctions: IExecuteFunctions,
	body: IDataObject,
	wireName: string,
	value: unknown,
	label: string,
): void {
	if (isUnset(value)) {
		return;
	}

	body[wireName] = validateNonEmptyText(executeFunctions, value, label);
}

function validatePositiveNumber(
	executeFunctions: IExecuteFunctions,
	value: unknown,
	label: string,
): number {
	const numericValue = Number(value);

	if (!Number.isFinite(numericValue) || numericValue <= 0) {
		throw new NodeOperationError(executeFunctions.getNode(), `${label} must be greater than 0.`);
	}

	return numericValue;
}

function validateRange(executeFunctions: IExecuteFunctions, value: unknown, label: string): number {
	const numericValue = Number(value);

	if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 1) {
		throw new NodeOperationError(executeFunctions.getNode(), `${label} must be between 0 and 1.`);
	}

	return numericValue;
}

function isUnset(value: unknown): boolean {
	return value === undefined || value === null || value === '';
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
