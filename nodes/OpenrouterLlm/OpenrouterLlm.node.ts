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
import Ajv, { type ValidateFunction, type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';

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
			{
				displayName: 'Max Validation Attempts',
				name: 'maxValidationAttempts',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 5,
				},
				default: 3,
				displayOptions: {
					show: {
						outputMode: ['json_object', 'json_schema'],
					},
				},
				description: 'Maximum total attempts (initial + repair retries) before failing',
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
				const modelOptions = this.getNodeParameter('modelOptions', itemIndex, {}) as IDataObject;
				const modelVariant = (modelOptions.modelVariant as string | undefined) ?? '';
				const outputMode = this.getNodeParameter('outputMode', itemIndex, 'text') as OutputMode;
				const maxAttempts =
					outputMode === 'text'
						? 1
						: (this.getNodeParameter('maxValidationAttempts', itemIndex, 3) as number);
				const compiledValidator = outputMode === 'json_schema' ? compileSchema(this, itemIndex) : undefined;
				const provider = buildProvider(this, itemIndex, outputMode);
				const webPluginEnabled = buildWebPlugin(this, itemIndex) !== undefined;
				validateRouting(this, modelVariant, provider, webPluginEnabled);
				const headers = buildHeaders(this, itemIndex);

				let attempt = 1;
				let lastErrors: string[] = [];
				let lastRawText = '';
				let lastResponse: ChatCompletionResponse | undefined;
				let structured: unknown = null;
				const correctiveMessages: ChatMessage[] = [];

				while (attempt <= maxAttempts) {
					const body = buildRequestBody(this, itemIndex, attempt, outputMode, compiledValidator);

					if (provider !== undefined) {
						body.provider = provider;
					}

					if (correctiveMessages.length > 0) {
						body.messages = [...(body.messages as ChatMessage[]), ...correctiveMessages];
					}

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
					lastResponse = response;
					lastRawText = response.choices?.[0]?.message?.content ?? '';

					if (outputMode === 'text') {
						structured = null;
						break;
					}

					const validation = validateStructuredResponse(outputMode, lastRawText, compiledValidator);

					if (validation.ok) {
						structured = validation.value;
						break;
					}

					lastErrors = validation.errors;

					if (attempt === maxAttempts) {
						throw new NodeOperationError(
							this.getNode(),
							`Structured output validation failed after ${attempt} attempts: ${lastErrors.join('; ')}. Raw model text: ${truncateForError(lastRawText)}`,
							{
								itemIndex,
								description: outputMode === 'json_schema' ? JSON.stringify(lastErrors) : undefined,
							},
						);
					}

					correctiveMessages.push({
						role: 'system',
						content: buildCorrectiveMessage(lastErrors),
					});
					attempt += 1;
				}

				const reasoningParams = this.getNodeParameter('reasoning', itemIndex, {}) as IDataObject;
				if (reasoningParams.exclude === true && lastResponse?.choices) {
					for (const choice of lastResponse.choices as Array<IDataObject>) {
						const msg = choice.message as IDataObject | undefined;
						if (msg) {
							delete msg.reasoning;
							delete msg.reasoning_content;
						}
					}
				}

				returnData.push({
					json: {
						text: lastRawText,
						structured: structured as IDataObject | null,
						response: lastResponse,
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

function buildRequestBody(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	attempt: number = 1,
	outputMode: OutputMode = 'text',
	compiledValidator?: ValidateFunction,
): IDataObject {
	const modelPayload = buildModelPayload(executeFunctions, itemIndex);
	const resolvedModel = resolveMetadataModel(modelPayload);
	const body: IDataObject = {
		...modelPayload,
		messages: buildMessages(executeFunctions, itemIndex),
	};

	if (outputMode === 'json_object') {
		body.response_format = { type: 'json_object' };
	} else if (outputMode === 'json_schema' && compiledValidator !== undefined) {
		body.response_format = {
			type: 'json_schema',
			json_schema: { name: 'response', schema: compiledValidator.schema, strict: true },
		};
	}
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
	const integrations = executeFunctions.getNodeParameter('integrations', itemIndex, {}) as IDataObject;
	const responseHealing = (integrations.responseHealing as boolean | undefined) ?? false;
	const sessionId = (integrations.sessionId as string | undefined) ?? '';
	body.metadata = buildMetadata(executeFunctions, itemIndex, resolvedModel, attempt);

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

	const plugins: IDataObject[] = [];

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

function buildHeaders(executeFunctions: IExecuteFunctions, itemIndex: number): IDataObject {
	const headers: IDataObject = {};
	const integrations = executeFunctions.getNodeParameter('integrations', itemIndex, {}) as IDataObject;
	const langfuseTrace = (integrations.langfuseTrace as boolean | undefined) ?? true;
	const customHeaders = (integrations.headers as {
		values?: Array<{ name?: string; value?: string }>;
	} | undefined) ?? {};

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
	attempt: number = 1,
): IDataObject {
	const workflow = executeFunctions.getWorkflow();
	const defaultMetadata: IDataObject = {
		execution_id: executeFunctions.getExecutionId(),
		workflow_id: workflow.id,
		workflow_name: workflow.name,
		node_name: executeFunctions.getNode().name,
		item_index: itemIndex,
		model,
		validation_attempt: attempt,
	};
	const metadata = { ...defaultMetadata };
	const integrations = executeFunctions.getNodeParameter('integrations', itemIndex, {}) as IDataObject;
	const extraMetadata = (integrations.metadata as {
		values?: Array<{ key?: string; valueMode?: string; value?: string }>;
	} | undefined) ?? {};

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
	const exclude = reasoning.exclude === true;

	if (mode === 'off' && !exclude) {
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

	if (exclude) {
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
	const modelOptions = executeFunctions.getNodeParameter('modelOptions', itemIndex, {}) as IDataObject;
	const modelVariant = (modelOptions.modelVariant as string | undefined) ?? '';

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
	const modelOptions = executeFunctions.getNodeParameter('modelOptions', itemIndex, {}) as IDataObject;
	const fallbackModels = (modelOptions.fallbackModels as {
		values?: Array<{ model?: string }>;
	} | undefined) ?? {};

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

function collectProviderNamesFromCollection(
	collection: { values?: Array<{ name?: string }> } | undefined,
): string[] {
	return ((collection ?? {}).values ?? [])
		.map((row) => row.name?.trim() ?? '')
		.filter((name) => name !== '');
}

function buildProvider(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	outputMode: OutputMode = 'text',
): IDataObject | undefined {
	const provider: IDataObject = {};
	const routing = executeFunctions.getNodeParameter('providerRouting', itemIndex, {}) as IDataObject;
	const allow = collectProviderNamesFromCollection(
		routing.allow as { values?: Array<{ name?: string }> } | undefined,
	);
	const deny = collectProviderNamesFromCollection(
		routing.deny as { values?: Array<{ name?: string }> } | undefined,
	);
	const sort = (routing.sort as string | undefined) ?? '';
	const allowFallbacks = (routing.allowFallbacks as string | undefined) ?? '';
	const requireParameters = (routing.requireParameters as string | undefined) ?? '';

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
	} else if (outputMode === 'json_object' || outputMode === 'json_schema') {
		provider.require_parameters = true;
	}

	return Object.keys(provider).length === 0 ? undefined : provider;
}

type OutputMode = 'text' | 'json_object' | 'json_schema';

const ajvInstance = (() => {
	const ajv = new Ajv({ allErrors: true, strict: false });
	addFormats(ajv);
	return ajv;
})();

function compileSchema(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): ValidateFunction {
	const raw = executeFunctions.getNodeParameter('jsonSchema', itemIndex) as unknown;
	let parsed: unknown = raw;

	if (typeof raw === 'string') {
		try {
			parsed = JSON.parse(raw);
		} catch (error) {
			throw new NodeOperationError(
				executeFunctions.getNode(),
				`JSON Schema parse failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	try {
		return ajvInstance.compile(parsed as object);
	} catch (error) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			`JSON Schema compile failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

type ValidationResult =
	| { ok: true; value: unknown }
	| { ok: false; errors: string[] };

function validateStructuredResponse(
	mode: OutputMode,
	rawText: string,
	compiledValidator: ValidateFunction | undefined,
): ValidationResult {
	let parsed: unknown;

	try {
		parsed = JSON.parse(rawText);
	} catch (error) {
		return { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
	}

	if (mode === 'json_object') {
		if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return { ok: false, errors: ['Response must be a non-null JSON object.'] };
		}
		return { ok: true, value: parsed };
	}

	if (mode === 'json_schema' && compiledValidator !== undefined) {
		if (compiledValidator(parsed)) {
			return { ok: true, value: parsed };
		}
		const errors = (compiledValidator.errors ?? []).map(formatAjvError);
		return { ok: false, errors };
	}

	return { ok: true, value: parsed };
}

function formatAjvError(error: ErrorObject): string {
	const path = error.instancePath ?? '';
	return path === '' ? error.message ?? 'invalid' : `${path} ${error.message ?? 'invalid'}`;
}

function buildCorrectiveMessage(errors: string[]): string {
	const top = errors.slice(0, 5).map((line) => `- ${line}`).join('\n');
	return `Your previous response failed validation. Errors:\n${top}\nReturn only valid JSON matching the original schema. Do not repeat the schema.`;
}

function buildWebPlugin(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): IDataObject | undefined {
	const integrations = executeFunctions.getNodeParameter('integrations', itemIndex, {}) as IDataObject;

	if (integrations.webEnabled !== true) {
		return undefined;
	}

	const plugin: IDataObject = { id: 'web' };

	if (!isUnset(integrations.webMaxResults)) {
		plugin.max_results = validatePositiveNumber(executeFunctions, integrations.webMaxResults, 'Web Search Max Results');
	}

	if (typeof integrations.webSearchPrompt === 'string' && (integrations.webSearchPrompt as string).trim() !== '') {
		plugin.search_prompt = integrations.webSearchPrompt;
	}

	return plugin;
}

function truncateForError(text: string): string {
	const limit = 2000;
	return text.length <= limit ? text : `${text.slice(0, limit)}...[truncated]`;
}

function validateRouting(
	executeFunctions: IExecuteFunctions,
	modelVariant: string,
	provider: IDataObject | undefined,
	webPluginEnabled: boolean = false,
): void {
	if (webPluginEnabled && modelVariant === ':online') {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Model Variant :online conflicts with the Web Search Plugin. Disable one of the two — both routes inject web search results.',
		);
	}

	if (provider === undefined) {
		return;
	}

	if (provider.sort !== undefined && modelVariant === ':nitro') {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Model Variant :nitro conflicts with Provider Sort. Remove one of the two — :nitro already requests throughput routing.',
		);
	}

	if (provider.sort !== undefined && modelVariant === ':floor') {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Model Variant :floor conflicts with Provider Sort. Remove one of the two — :floor already requests price routing.',
		);
	}

	const allow = Array.isArray(provider.only) ? (provider.only as string[]) : [];
	const deny = Array.isArray(provider.ignore) ? (provider.ignore as string[]) : [];

	if (allow.length > 0 && deny.length > 0) {
		const denyNormalized = new Set(deny.map((name) => name.trim().toLowerCase()));
		const conflict = allow.find((name) => denyNormalized.has(name.trim().toLowerCase()));

		if (conflict !== undefined) {
			throw new NodeOperationError(
				executeFunctions.getNode(),
				`Provider "${conflict}" appears in both Allow Providers and Deny Providers. Remove it from one list.`,
			);
		}
	}
}
