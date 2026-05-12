import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { type StructuredOutputMode } from './StructuredOutputParser';
import {
	loadOpenRouterModelCatalogOptions,
	searchOpenRouterModelCatalog,
} from './OpenRouterModelCatalog';
import {
	executeOpenRouter,
	type ChatCompletionResponse,
	type OpenRouterChatSender,
	type OpenRouterExecutionData,
} from './OpenRouterExecution';
import {
	buildOpenRouterExecutionInput,
	buildWebPlugin,
} from './OpenRouterExecutionInputBuilder';
import { buildProvider, getSelectedModelVariant, validateRouting } from './OpenRouterRouting';
import { nodeParameterSurface } from './OpenRouterNodeProperties';
import {
	buildStructuredOutputError,
	compileSchema,
	getStructuredOutputDiagnosticFields,
} from './StructuredOutputNodeAdapter';

const PROTECTED_HEADERS = ['authorization', 'http-referer', 'x-title'] as const;
const OPENROUTER_CUSTOM_CREDENTIAL_NAME = 'openRouterCustomV2Api';



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
				name: OPENROUTER_CUSTOM_CREDENTIAL_NAME,
				required: true,
			},
		],
		properties: nodeParameterSurface,
	};

	methods = {
		listSearch: {
			getOpenRouterModels: searchOpenRouterModelCatalog,
		},
		loadOptions: {
			getOpenRouterModelOptions: loadOpenRouterModelCatalogOptions,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const data = await executeItem(this, itemIndex);
				returnData.push(toN8nOutputItem(data, itemIndex));
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push(toContinueOnFailOutputItem(error, itemIndex));
					continue;
				}

				rethrowAsN8nError(this, error, itemIndex);
			}
		}

		return [returnData];
	}
}



async function executeItem(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<OpenRouterExecutionData> {
	const credentials = await executeFunctions.getCredentials(OPENROUTER_CUSTOM_CREDENTIAL_NAME);
	const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');
	const modelVariant = getSelectedModelVariant(executeFunctions, itemIndex);
	const outputMode = executeFunctions.getNodeParameter('outputMode', itemIndex, 'text') as OutputMode;
	const maxRepairAttempts =
		outputMode === 'text'
			? 0
			: (executeFunctions.getNodeParameter('maxValidationAttempts', itemIndex, 2) as number);
	const compiledSchema =
		outputMode === 'json_schema' ? compileSchema(executeFunctions, itemIndex) : undefined;
	const provider = buildProvider(executeFunctions, itemIndex, outputMode);
	const webPluginEnabled = buildWebPlugin(executeFunctions, itemIndex) !== undefined;
	validateRouting(executeFunctions, modelVariant, provider, webPluginEnabled);
	const headers = buildHeaders(executeFunctions, itemIndex);

	const executionResult = await executeOpenRouter({
		input: buildOpenRouterExecutionInput(
			executeFunctions,
			itemIndex,
			provider,
			outputMode,
			compiledSchema,
			maxRepairAttempts,
		),
		sendChat: createOpenRouterChatSender(executeFunctions, baseUrl, headers),
	});

	if (executionResult.kind !== 'success') {
		throw buildStructuredOutputError(
			executeFunctions,
			itemIndex,
			1 + executionResult.error.repairAttempts,
			{
				errors: executionResult.error.validationErrors,
				details: executionResult.error.validationDetails,
				originalRawText: executionResult.error.originalRawText,
				latestRepairText: executionResult.error.latestRepairText,
			},
		);
	}

	return executionResult.data;
}

function createOpenRouterChatSender(
	executeFunctions: IExecuteFunctions,
	baseUrl: string,
	headers: IDataObject,
): OpenRouterChatSender {
	return async (body) => {
		const response = (await executeFunctions.helpers.httpRequestWithAuthentication.call(
			executeFunctions,
			OPENROUTER_CUSTOM_CREDENTIAL_NAME,
			{
				method: 'POST',
				baseURL: baseUrl,
				url: '/chat/completions',
				headers,
				json: true,
				body,
			},
		)) as ChatCompletionResponse;

		return {
			response,
			text: response.choices?.[0]?.message?.content ?? '',
		};
	};
}

function toN8nOutputItem(data: OpenRouterExecutionData, itemIndex: number): INodeExecutionData {
	return {
		json: data as IDataObject,
		pairedItem: { item: itemIndex },
	};
}

function toContinueOnFailOutputItem(error: unknown, itemIndex: number): INodeExecutionData {
	const diagnosticFields = getStructuredOutputDiagnosticFields(error);

	return {
		json: {
			error: error instanceof Error ? error.message : String(error),
			...diagnosticFields,
		},
		pairedItem: { item: itemIndex },
	};
}

function rethrowAsN8nError(
	executeFunctions: IExecuteFunctions,
	error: unknown,
	itemIndex: number,
): never {
	if (error instanceof NodeOperationError) {
		throw new NodeOperationError(executeFunctions.getNode(), error.message, {
			itemIndex,
			description: error.description ?? undefined,
		});
	}

	throw new NodeApiError(
		executeFunctions.getNode(),
		{ message: error instanceof Error ? error.message : String(error) },
		{ itemIndex },
	);
}

function buildHeaders(executeFunctions: IExecuteFunctions, itemIndex: number): IDataObject {
	const headers: IDataObject = {};
	const integrations = executeFunctions.getNodeParameter(
		'integrations',
		itemIndex,
		{},
	) as IDataObject;
	const langfuseTrace = (integrations.langfuseTrace as boolean | undefined) ?? true;
	const customHeaders =
		(integrations.headers as
			| {
					values?: Array<{ name?: string; value?: string }>;
			  }
			| undefined) ?? {};

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

type OutputMode = StructuredOutputMode;
