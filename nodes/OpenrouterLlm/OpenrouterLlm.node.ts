import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { type StructuredOutputMode } from './structured-output/StructuredOutputParser';
import {
	loadOpenRouterModelCatalogOptions,
	searchOpenRouterModelCatalog,
} from './catalog/OpenRouterModelCatalog';
import {
	executeOpenRouter,
	type ChatCompletionResponse,
	type OpenRouterChatSender,
	type OpenRouterExecutionData,
} from './execution/OpenRouterExecution';
import {
	buildOpenRouterExecutionInput,
	buildWebPlugin,
} from './execution/OpenRouterExecutionInputBuilder';
import { buildProvider, getSelectedModelVariant, validateRouting } from './routing/OpenRouterRouting';
import { nodeParameterSurface } from './properties/OpenRouterNodeProperties';
import {
	buildStructuredOutputError,
	compileSchema,
	getStructuredOutputDiagnosticFields,
} from './structured-output/StructuredOutputNodeAdapter';
import { buildOpenRouterHeaders, mergeOpenRouterAuthenticatedHeaders, normalizeOpenRouterApiKey } from './execution/OpenRouterHeaders';

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
				returnData.push(toN8nOutputItem(this, data, itemIndex));
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
	const apiKeyRaw = credentials.apiKey as string | undefined;

	// #region agent log
	fetch('http://127.0.0.1:7559/ingest/98d5d16e-797c-4efe-89ed-798c24cf5fec', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Debug-Session-Id': 'b0c2f0',
		},
		body: JSON.stringify({
			sessionId: 'b0c2f0',
			runId: 'post-fix',
			hypothesisId: 'B-C-E',
			location: 'OpenrouterLlm.node.ts:executeItem:credentials',
			message: 'executeItem credentials snapshot',
			data: {
				baseUrlLength: baseUrl.length,
				baseUrlEndsWithChat: baseUrl.endsWith('/chat/completions'),
				apiKeyDefined: typeof apiKeyRaw === 'string',
				apiKeyLength: typeof apiKeyRaw === 'string' ? apiKeyRaw.trim().length : 0,
				siteUrlLength: typeof credentials.siteUrl === 'string' ? credentials.siteUrl.trim().length : 0,
				appNameLength: typeof credentials.appName === 'string' ? credentials.appName.trim().length : 0,
			},
			timestamp: Date.now(),
		}),
	}).catch(() => {});
	// #endregion

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
	const headers = buildOpenRouterHeaders(executeFunctions, itemIndex);

	const executionResult = await executeOpenRouter({
		input: buildOpenRouterExecutionInput(
			executeFunctions,
			itemIndex,
			provider,
			outputMode,
			compiledSchema,
			maxRepairAttempts,
		),
		sendChat: createOpenRouterChatSender(executeFunctions, baseUrl, headers, credentials, itemIndex),
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
	credentials: IDataObject,
	itemIndex: number,
): OpenRouterChatSender {
	return async (body) => {
		const normalizedKey = normalizeOpenRouterApiKey(credentials.apiKey);
		if (normalizedKey === '') {
			throw new NodeOperationError(executeFunctions.getNode(), 'OpenRouter API key is missing or empty.', {
				itemIndex,
			});
		}
		const mergedHeaders = mergeOpenRouterAuthenticatedHeaders(credentials, headers);
		// #region agent log
		fetch('http://127.0.0.1:7559/ingest/98d5d16e-797c-4efe-89ed-798c24cf5fec', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Debug-Session-Id': 'b0c2f0',
			},
			body: JSON.stringify({
				sessionId: 'b0c2f0',
				runId: 'post-fix',
				hypothesisId: 'G',
				location: 'OpenrouterLlm.node.ts:createOpenRouterChatSender:before',
				message: 'POST /chat/completions request context',
				data: {
					baseUrlSegmentCount: baseUrl.split('/').length,
					extraHeaderKeys: Object.keys(headers),
					hasBearerAuthorization: mergedHeaders.Authorization === `Bearer ${normalizedKey}`,
					refererIsEmptyString: mergedHeaders['HTTP-Referer'] === '',
					titleHeaderIsEmptyString: mergedHeaders['X-OpenRouter-Title'] === '',
					rawKeyHadBearerWord: /^bearer\s+/i.test(String(credentials.apiKey ?? '').trim()),
					hasBodyModel: typeof (body as { model?: unknown }).model === 'string',
					hasBodyModelsArray: Array.isArray((body as { models?: unknown }).models),
				},
				timestamp: Date.now(),
			}),
		}).catch(() => {});
		// #endregion

		let response: ChatCompletionResponse;

		try {
			response = (await executeFunctions.helpers.httpRequest.call(executeFunctions, {
				method: 'POST',
				baseURL: baseUrl,
				url: '/chat/completions',
				headers: mergedHeaders,
				json: true,
				body,
			})) as ChatCompletionResponse;

			// #region agent log
			fetch('http://127.0.0.1:7559/ingest/98d5d16e-797c-4efe-89ed-798c24cf5fec', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Debug-Session-Id': 'b0c2f0',
				},
				body: JSON.stringify({
					sessionId: 'b0c2f0',
					runId: 'post-fix',
					hypothesisId: 'D',
					location: 'OpenrouterLlm.node.ts:createOpenRouterChatSender:success',
					message: 'chat completions ok',
					data: { choicesLength: Array.isArray(response.choices) ? response.choices.length : 0 },
					timestamp: Date.now(),
				}),
			}).catch(() => {});
			// #endregion
		} catch (unknownError: unknown) {
			const apiErr = unknownError instanceof NodeApiError ? unknownError : null;

			// #region agent log
			fetch('http://127.0.0.1:7559/ingest/98d5d16e-797c-4efe-89ed-798c24cf5fec', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Debug-Session-Id': 'b0c2f0',
				},
				body: JSON.stringify({
					sessionId: 'b0c2f0',
					runId: 'post-fix',
					hypothesisId: 'D',
					location: 'OpenrouterLlm.node.ts:createOpenRouterChatSender:error',
					message: 'chat completions failed',
					data: {
						errorName:
							unknownError instanceof Error ? unknownError.constructor.name : typeof unknownError,
						httpCodeInstance: apiErr?.httpCode ?? null,
						httpCodeDuck:
							unknownError !== null &&
							typeof unknownError === 'object' &&
							'httpCode' in unknownError
								? String((unknownError as { httpCode?: unknown }).httpCode ?? '')
								: null,
						errMessage:
							unknownError instanceof Error ? unknownError.message.substring(0, 200) : String(unknownError),
					},
					timestamp: Date.now(),
				}),
			}).catch(() => {});
			// #endregion

			throw toOpenRouterRequestError(executeFunctions, unknownError, itemIndex);
		}

		return {
			response,
			text: response.choices?.[0]?.message?.content ?? '',
		};
	};
}

function toOpenRouterRequestError(
	executeFunctions: IExecuteFunctions,
	error: unknown,
	itemIndex: number,
): NodeApiError | NodeOperationError {
	if (error instanceof NodeApiError) {
		return error;
	}

	if (typeof error === 'object' && error !== null && 'isAxiosError' in error) {
		return new NodeApiError(executeFunctions.getNode(), error as JsonObject, { itemIndex });
	}

	return new NodeOperationError(
		executeFunctions.getNode(),
		error instanceof Error ? error.message : String(error),
		{ itemIndex },
	);
}

function toN8nOutputItem(
	executeFunctions: IExecuteFunctions,
	data: OpenRouterExecutionData,
	itemIndex: number,
): INodeExecutionData {
	const outputOptions = executeFunctions.getNodeParameter(
		'outputOptions',
		itemIndex,
		{},
	) as IDataObject;
	const json = {
		output: data.structured ?? data.text,
	} as IDataObject;

	if ((outputOptions.includeResponseDetails as boolean | undefined) === true) {
		json.response = data.response as IDataObject;

		if (data.structuredOutputRepair !== undefined) {
			json.structuredOutputRepair = data.structuredOutputRepair as IDataObject;
		}
	}

	return {
		json,
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

	if (error instanceof NodeApiError) {
		throw error;
	}

	const looksLikeForeignNodeApiError =
		error instanceof Error &&
		error.name === 'NodeApiError' &&
		Object.prototype.hasOwnProperty.call(error, 'httpCode');

	if (looksLikeForeignNodeApiError) {
		throw error;
	}

	if (typeof error === 'object' && error !== null && 'isAxiosError' in error) {
		const axiosish = error as IDataObject & { isAxiosError?: boolean };
		if (axiosish.isAxiosError === true) {
			throw new NodeApiError(executeFunctions.getNode(), axiosish as unknown as JsonObject, {
				itemIndex,
			});
		}
	}

	throw new NodeApiError(
		executeFunctions.getNode(),
		{ message: error instanceof Error ? error.message : String(error) },
		{ itemIndex },
	);
}

type OutputMode = StructuredOutputMode;
