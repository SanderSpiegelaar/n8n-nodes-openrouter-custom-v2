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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const credentials = await this.getCredentials('openRouterApi');
				const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');
				const model = this.getNodeParameter('model', itemIndex) as string;
				const prompt = this.getNodeParameter('prompt', itemIndex) as string;
				const systemMessage = this.getNodeParameter('systemMessage', itemIndex, '') as string;
				const temperature = this.getNodeParameter('temperature', itemIndex) as number;
				const maxTokens = this.getNodeParameter('maxTokens', itemIndex) as number;
				const messages: IDataObject[] = [];

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
