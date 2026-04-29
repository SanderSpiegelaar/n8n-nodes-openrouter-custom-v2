import type {
	IDataObject,
	IExecuteFunctions,
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
				type: 'string',
				default: 'openai/gpt-4o-mini',
				required: true,
				description: 'OpenRouter model ID to use for the chat completion',
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const credentials = await this.getCredentials('openRouterApi');
				const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');
				const model = this.getNodeParameter('model', itemIndex) as string;
				const temperature = this.getNodeParameter('temperature', itemIndex) as number;
				const maxTokens = this.getNodeParameter('maxTokens', itemIndex) as number;
				const messages = buildMessages(this, itemIndex);

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'openRouterApi',
					{
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
