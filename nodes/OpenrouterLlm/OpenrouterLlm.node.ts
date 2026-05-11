import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import {
	compileStructuredOutputSchema,
	type StructuredOutputMode,
	type StructuredValidationIssue,
} from './StructuredOutputParser';
import {
	loadOpenRouterModelCatalogOptions,
	searchOpenRouterModelCatalog,
} from './OpenRouterModelCatalog';
import { executeOpenRouter } from './OpenRouterExecution';
import {
	buildOpenRouterExecutionInput,
	buildWebPlugin,
	type CompiledStructuredSchema,
	type JsonSchemaResponseFormat,
} from './OpenRouterExecutionInputBuilder';
import { buildProvider, getSelectedModelVariant, validateRouting } from './OpenRouterRouting';
import { nodeParameterSurface } from './OpenRouterNodeProperties';

type ChatCompletionResponse = IDataObject & {
	choices?: Array<{
		message?: {
			content?: string;
		};
	}>;
};

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
				const credentials = await this.getCredentials(OPENROUTER_CUSTOM_CREDENTIAL_NAME);
				const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');
				const modelVariant = getSelectedModelVariant(this, itemIndex);
				const outputMode = this.getNodeParameter('outputMode', itemIndex, 'text') as OutputMode;
				const maxRepairAttempts =
					outputMode === 'text'
						? 0
						: (this.getNodeParameter('maxValidationAttempts', itemIndex, 2) as number);
				const compiledSchema =
					outputMode === 'json_schema' ? compileSchema(this, itemIndex) : undefined;
				const provider = buildProvider(this, itemIndex, outputMode);
				const webPluginEnabled = buildWebPlugin(this, itemIndex) !== undefined;
				validateRouting(this, modelVariant, provider, webPluginEnabled);
				const headers = buildHeaders(this, itemIndex);

				{
					const executionResult = await executeOpenRouter({
						input: buildOpenRouterExecutionInput(
							this,
							itemIndex,
							provider,
							outputMode,
							compiledSchema,
							maxRepairAttempts,
						),
						sendChat: async (body) => {
							const response = (await this.helpers.httpRequestWithAuthentication.call(
								this,
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
						},
					});

					if (executionResult.kind !== 'success') {
						throw buildStructuredOutputError(this, itemIndex, 1 + executionResult.error.repairAttempts, {
							errors: executionResult.error.validationErrors,
							details: executionResult.error.validationDetails,
							originalRawText: executionResult.error.originalRawText,
							latestRepairText: executionResult.error.latestRepairText,
						});
					}

					returnData.push({
						json: executionResult.data as IDataObject,
						pairedItem: { item: itemIndex },
					});
					continue;
				}

			} catch (error) {
				if (this.continueOnFail()) {
					const diagnosticFields = getStructuredOutputDiagnosticFields(error);
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : String(error),
							...diagnosticFields,
						},
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				if (error instanceof NodeOperationError) {
					throw new NodeOperationError(this.getNode(), error.message, {
						itemIndex,
						description: error.description ?? undefined,
					});
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

type StructuredOutputFailureDiagnostics = {
	errors: string[];
	details: StructuredValidationIssue[];
	originalRawText: string;
	latestRepairText: string;
};

function buildStructuredOutputError(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	attempt: number,
	diagnostics: StructuredOutputFailureDiagnostics,
): NodeOperationError {
	const error = new NodeOperationError(
		executeFunctions.getNode(),
		`Structured output validation failed after ${attempt} attempts: ${diagnostics.errors.join('; ')}. Raw model text: ${truncateForError(diagnostics.latestRepairText || diagnostics.originalRawText)}`,
		{
			itemIndex,
			description: JSON.stringify({
				validationErrors: diagnostics.errors,
				validationDetails: diagnostics.details,
				originalOutputText: truncateForError(diagnostics.originalRawText),
				latestRepairText:
					diagnostics.latestRepairText === ''
						? undefined
						: truncateForError(diagnostics.latestRepairText),
			}),
		},
	);

	return Object.assign(error, { structuredOutputDiagnostics: diagnostics });
}

function getStructuredOutputDiagnosticFields(error: unknown): IDataObject {
	const diagnostics = (
		error as { structuredOutputDiagnostics?: StructuredOutputFailureDiagnostics }
	)?.structuredOutputDiagnostics;

	if (diagnostics === undefined) {
		return {};
	}

	return {
		structuredOutputValidationErrors: diagnostics.errors,
		structuredOutputValidationDetails: diagnostics.details as unknown as IDataObject[],
		structuredOutputOriginalText: diagnostics.originalRawText,
		structuredOutputLatestRepairText: diagnostics.latestRepairText,
	};
}

function compileSchema(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): CompiledStructuredSchema {
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

	const responseFormat = normalizeJsonSchemaResponseFormat(parsed);

	try {
		return {
			validator: compileStructuredOutputSchema(responseFormat.schema),
			responseFormat,
		};
	} catch (error) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			`JSON Schema compile failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

function normalizeJsonSchemaResponseFormat(parsed: unknown): JsonSchemaResponseFormat {
	if (isOpenAiJsonSchemaWrapper(parsed)) {
		return {
			name: typeof parsed.name === 'string' && parsed.name.trim() !== '' ? parsed.name : 'response',
			schema: parsed.schema,
			strict: typeof parsed.strict === 'boolean' ? parsed.strict : true,
		};
	}

	return { name: 'response', schema: parsed, strict: true };
}

function isOpenAiJsonSchemaWrapper(
	value: unknown,
): value is { name?: unknown; schema: unknown; strict?: unknown } {
	return (
		value !== null &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		Object.prototype.hasOwnProperty.call(value, 'schema') &&
		(Object.prototype.hasOwnProperty.call(value, 'name') ||
			Object.prototype.hasOwnProperty.call(value, 'strict'))
	);
}

function truncateForError(text: string): string {
	const limit = 2000;
	return text.length <= limit ? text : `${text.slice(0, limit)}...[truncated]`;
}
